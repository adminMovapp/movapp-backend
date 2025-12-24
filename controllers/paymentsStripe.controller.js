import { stripe } from "../utils/stripe.js";
import { StripeService } from "../services/stripeService.js";
import { PaymentsStripeDAO } from "../dao/paymentsStripeDAO.js";
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from "../utils/mailer.js";

export const PaymentsStripeController = {
   async createIntent(req, res) {
      try {
         const {
            userId = null,
            email,
            amount,
            currency = "mxn",
            description = " Compra aplicacion MovApp",
            metadata = {},
            items = [],
         } = req.body;

         if (!email || !amount)
            return res.status(400).json({ success: false, message: "email y amount son requeridos" });

         const stripeMetadata = { ...metadata };

         if (items && items.length) {
            stripeMetadata.items = JSON.stringify(items);
            stripeMetadata.items_count = String(items.length);
         }

         const resp = await StripeService.createPaymentIntent({
            userId,
            email,
            amount,
            currency,
            description,
            metadata: stripeMetadata,
         });

         res.json({ success: true, clientSecret: resp.clientSecret, intentId: resp.intentId });
      } catch (err) {
         console.error("Stripe createIntent error", err);
         res.status(500).json({ success: false, message: "Error creando PaymentIntent" });
      }
   },

   async webhook(req, res) {
      const sig = req.headers["stripe-signature"];
      const raw = req.rawBody;
      if (!raw) {
         console.error("Webhook signature/parse error: raw body missing");
         return res
            .status(400)
            .send(
               "Raw body required for Stripe signature verification. Configure express.raw or express.json verify to preserve raw body.",
            );
      }

      let event;
      try {
         event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
         console.error("Webhook signature/parse error", err?.message || err);
         return res.status(400).send(`Webhook Error: ${err?.message || err}`);
      }

      try {
         const result = await StripeService.handleStripeEvent(event);

         if (result.status === "succeeded") {
            console.log("\x1b[33m", "result webhooks =>", result);
            const intent = result.intent;
            const email = intent.receipt_email || intent.metadata?.email;
            const orderNumber = intent.metadata?.order_number || null;

            // Parsear items desde metadata
            let items = [];
            try {
               if (intent.metadata?.items) {
                  items = JSON.parse(intent.metadata.items);
                  // console.log("\x1b[36m", "✅ Items parseados desde metadata.items =>", items);
               }
            } catch (parseErr) {
               console.error("⚠️ Error parseando items desde metadata.items:", parseErr.message);

               // Fallback: construir items desde items_summary si existe
               if (intent.metadata?.items_summary) {
                  const itemsSummary = intent.metadata.items_summary;
                  const itemsParts = itemsSummary.split(", ");
                  items = itemsParts.map((part) => {
                     const match = part.match(/^(.+?)\s*:\s*(.+?)\s*x\s*(\d+)$/);
                     if (match) {
                        return {
                           sku: match[1].trim(),
                           nombre: match[2].trim(),
                           cantidad: parseInt(match[3], 10),
                        };
                     }
                     return { nombre: part };
                  });
               }
            }

            if (email) {
               try {
                  await sendPaymentSuccessEmail({
                     to: email,
                     amount: intent.amount / 100,
                     currency: intent.currency,
                     paymentReference: intent.id,
                     orderNumber,
                     items,
                  });
               } catch (mailErr) {
                  console.error("❌ Error al enviar email (no fatal):", mailErr.message || mailErr);
               }
            }
         }

         if (result.status === "failed") {
            const intent = result.intent;
            const email = intent.receipt_email || intent.metadata?.email;

            if (email) {
               try {
                  await sendPaymentFailedEmail({
                     to: email,
                     amount: intent.amount / 100,
                     currency: intent.currency,
                     paymentReference: intent.id,
                     reason: intent.last_payment_error?.message || "No especificada",
                  });
               } catch (mailErr) {
                  console.error("❌ Error al enviar email (no fatal):", mailErr.message || mailErr);
               }
            }
         }

         return res.json({ received: true });
      } catch (err) {
         console.error("Webhook processing error", err);
         return res.status(500).send();
      }
   },

   async webhookTest(req, res) {
      const event = req.body;
      try {
         const result = await StripeService.handleStripeEvent(event);

         if (result.status === "succeeded") {
            const intent = result.intent;
            const email = intent.receipt_email || intent.metadata?.email;
            const orderNumber = intent.metadata?.order_number || null;

            // Parsear items desde metadata
            let items = [];
            try {
               if (intent.metadata?.items) {
                  items = JSON.parse(intent.metadata.items);
               }
            } catch (parseErr) {
               console.error("⚠️ Error parseando items:", parseErr.message);
            }

            const isValidEmail = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            if (isValidEmail) {
               try {
                  await sendPaymentSuccessEmail({
                     to: email,
                     amount: intent.amount / 100,
                     currency: intent.currency,
                     paymentReference: intent.id,
                     orderNumber,
                     items,
                  });
               } catch (mailErr) {
                  console.error("❌ Error al enviar correo (no fatal):", mailErr.message || mailErr);
               }
            } else {
               console.warn("⚠️ Email inválido o ausente, se omite notificación:", email);
            }
         }

         res.json({ received: true, test: true });
      } catch (err) {
         console.error("Webhook test processing error", err);
         res.status(500).send();
      }
   },

   async getByIntent(req, res) {
      try {
         const intentId = req.params.id;
         const payment = await PaymentsStripeDAO.findPaymentByIntent(intentId);
         if (!payment) return res.status(404).json({ success: false, message: "No encontrado" });
         res.json({ success: true, payment });
      } catch (err) {
         console.error("getByIntent error", err);
         res.status(500).json({ success: false });
      }
   },
};
