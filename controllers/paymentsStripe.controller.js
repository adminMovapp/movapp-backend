import { stripe } from "../utils/stripe.js";
import { StripeService } from "../services/stripeService.js";
import { PaymentsStripeDAO } from "../dao/paymentsStripeDAO.js";
import { sendEmail } from "../utils/mailer.js";

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

         // console.log(
         //    "\x1b[36m",
         //    "createIntent STRIPE  =>",
         //    userId,
         //    email,
         //    amount,
         //    currency,
         //    description,
         //    metadata,
         //    items,
         // );

         if (!email || !amount)
            return res.status(400).json({ success: false, message: "email y amount son requeridos" });

         const stripeMetadata = { ...metadata };
         if (items && items.length) {
            stripeMetadata.items = JSON.stringify(items); // store as string in Stripe metadata
            stripeMetadata.items_count = String(items.length);
         }

         const resp = await StripeService.createPaymentIntent({
            userId,
            email,
            amount,
            currency,
            description,
            metadata: { ...metadata, items }, // store structured items in DB metadata
         });

         res.json({ success: true, clientSecret: resp.clientSecret, intentId: resp.intentId });
      } catch (err) {
         console.error("Stripe createIntent error", err);
         res.status(500).json({ success: false, message: "Error creando PaymentIntent" });
      }
   },

   async webhook(req, res) {
      const sig = req.headers["stripe-signature"];
      // req.rawBody debe ser un Buffer (establecido por express.raw en la ruta o por express.json verify en server.js)
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
            const intent = result.intent;
            const email = intent.receipt_email || intent.metadata?.email;
            if (email) {
               const html = `<html><body>
                  <h3>Pago recibido</h3>
                  <p>Pago por ${(intent.amount / 100).toFixed(
                     2,
                  )} ${intent.currency.toUpperCase()} procesado correctamente.</p>
                  <p>Referencia: <strong>${intent.id}</strong></p>
               </body></html>`;
               await sendEmail({ to: email, subject: "Pago recibido - MovApp", html });
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

            // simple email validation
            const isValidEmail = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            if (isValidEmail) {
               const html = `<html><body>
                  <h3>Pago recibido (test)</h3>
                  <p>Pago por ${(intent.amount / 100).toFixed(
                     2,
                  )} ${intent.currency.toUpperCase()} procesado correctamente.</p>
                  <p>Referencia: <strong>${intent.id}</strong></p>
               </body></html>`;

               try {
                  await sendEmail({ to: email, subject: "Pago recibido - MovApp (test)", html });
               } catch (mailErr) {
                  // log but don't fail the webhook processing
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
