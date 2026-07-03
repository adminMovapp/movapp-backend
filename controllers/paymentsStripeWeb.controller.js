import { stripe } from "../utils/stripe.js";
import { StripeWebService } from "../services/stripeWebService.js";
import { PaymentsStripeWebDAO } from "../dao/paymentsStripeWebDAO.js";
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from "../utils/mailer.js";

/**
 * Controlador Stripe independiente para el SITIO WEB.
 * Endpoints montados en /payments/web/stripe.
 */
export const PaymentsStripeWebController = {
   async createIntent(req, res) {
      try {
         const {
            email,
            nombre = null,
            apellidos = null,
            telefono = null,
            codigoPostal = null,
            pais = null,
            amount,
            currency = "mxn",
            description = "Compra desde el sitio web",
            items = [],
         } = req.body;

         if (!email || !amount)
            return res.status(400).json({ success: false, message: "email y amount son requeridos" });

         // 1. Calcular subtotal desde los items
         let subtotal = 0;
         const processedItems = (items || []).map((item) => {
            const precioUnitario = Number(item.precio_unitario || item.precio || 0);
            const cantidad = Number(item.cantidad || item.quantity || 1);
            const itemSubtotal = precioUnitario * cantidad;
            subtotal += itemSubtotal;
            return {
               producto_id: item.producto_id || null,
               sku: item.sku || null,
               nombre: item.nombre || item.name || "Sin nombre",
               descripcion: item.descripcion || item.description || null,
               precio_unitario: precioUnitario,
               cantidad,
               subtotal: itemSubtotal,
            };
         });

         const total = processedItems.length ? subtotal : Number(amount);

         // 2. Crear la orden web y sus detalles
         const order = await PaymentsStripeWebDAO.createOrder({
            nombre,
            apellidos,
            email,
            telefono,
            codigoPostal,
            pais,
            subtotal: total,
            total,
            currency: currency.toUpperCase(),
            paymentMethod: "stripe",
            items: processedItems,
         });

         // 3. Crear PaymentIntent en Stripe (vinculado a la orden web)
         // Se cobra el total calculado desde los items (autoritativo), no el amount del cliente,
         // para garantizar que el cobro coincida con la orden y sus cantidades.
         const resp = await StripeWebService.createPaymentIntent({
            orderId: order.id,
            email,
            amount: total,
            currency,
            description: description || `Orden ${order.order_number}`,
            metadata: {
               order_id: order.id,
               order_number: order.order_number,
               items: processedItems,
            },
         });

         res.json({
            success: true,
            clientSecret: resp.clientSecret,
            intentId: resp.intentId,
            orderId: order.id,
            orderNumber: order.order_number,
         });
      } catch (err) {
         console.error("StripeWeb createIntent error", err);
         res.status(500).json({ success: false, message: "Error creando PaymentIntent" });
      }
   },

   async webhook(req, res) {
      const sig = req.headers["stripe-signature"];
      const raw = req.body;

      if (!raw) {
         console.error("Webhook web: raw body missing");
         return res.status(400).send("Raw body required for Stripe signature verification.");
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_WEB || process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      try {
         event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
      } catch (err) {
         console.error("Webhook web signature/parse error", err?.message || err);
         return res.status(400).send(`Webhook Error: ${err?.message || err}`);
      }

      try {
         const result = await StripeWebService.handleStripeEvent(event);

         if (result.status === "succeeded") {
            const intent = result.intent;
            const email = intent.receipt_email || intent.metadata?.email;
            const orderNumber = intent.metadata?.order_number || null;
            const orderId = intent.metadata?.order_id ? parseInt(intent.metadata.order_id, 10) : null;

            let items = [];
            if (orderId) {
               try {
                  const order = await PaymentsStripeWebDAO.getOrderWithDetails(orderId);
                  if (order && order.items) {
                     items = order.items.map((item) => ({
                        sku: item.sku || "",
                        nombre: item.nombre || "",
                        cantidad: item.cantidad || 1,
                        precio_unitario: item.precio_unitario || 0,
                        moneda: intent.currency || "MXN",
                     }));
                  }
               } catch (err) {
                  console.error("⚠️ Error obteniendo items de la orden web:", err.message);
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
         console.error("Webhook web processing error", err);
         return res.status(500).send();
      }
   },

   async getByIntent(req, res) {
      try {
         const intentId = req.params.id;
         const payment = await PaymentsStripeWebDAO.findPaymentByIntent(intentId);
         if (!payment) return res.status(404).json({ success: false, message: "No encontrado" });
         res.json({ success: true, payment });
      } catch (err) {
         console.error("StripeWeb getByIntent error", err);
         res.status(500).json({ success: false });
      }
   },
};
