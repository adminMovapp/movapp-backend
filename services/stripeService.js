import { stripe } from "../utils/stripe.js";
import { PaymentsStripeDAO } from "../dao/paymentsStripeDAO.js";

export const StripeService = {
   async createPaymentIntent({ userId = null, email, amount, currency = "mxn", description = "", metadata = {} }) {
      try {
         const amount_cents_stripe = Math.round(parseFloat(amount) * 100);
         const amount_cents = Math.round(parseFloat(amount));

         // Preparar metadata para Stripe (límite 500 caracteres por campo)
         const stripeMetadata = {};

         // Agregar order_id y order_number si existen
         if (metadata.order_id) stripeMetadata.order_id = String(metadata.order_id);
         if (metadata.order_number) stripeMetadata.order_number = String(metadata.order_number);

         // Crear resumen corto de items (sin JSON completo)
         if (metadata.items) {
            let itemsArray = metadata.items;
            if (typeof itemsArray === "string") {
               try {
                  itemsArray = JSON.parse(metadata.items);
               } catch (e) {
                  itemsArray = [];
               }
            }
            if (Array.isArray(itemsArray)) {
               stripeMetadata.items_count = String(itemsArray.length);
               // Crear resumen corto: "SKU x cantidad"
               const summary = itemsArray
                  .map((it) => `${it.sku || it.nombre || "Item"} x${it.quantity || it.cantidad || 1}`)
                  .join(", ");
               // Truncar si es muy largo
               stripeMetadata.items_summary = summary.length > 450 ? summary.slice(0, 450) + "..." : summary;
            }
         }

         const intent = await stripe.paymentIntents.create({
            amount: amount_cents_stripe,
            currency,
            receipt_email: email,
            description,
            metadata: stripeMetadata,
         });

         // Persist full metadata (DB supports JSONB) including the full items array
         await PaymentsStripeDAO.insertPayment({
            userId,
            email,
            amount_cents,
            currency,
            description,
            intent_id: intent.id,
            status: intent.status,
            metadata, // full structured metadata stored in DB
         });

         return { clientSecret: intent.client_secret, intentId: intent.id };
      } catch (err) {
         console.error("StripeService.createPaymentIntent error", err);
         throw err;
      }
   },

   async handleStripeEvent(event) {
      try {
         const intent = event.data.object;
         const orderId = intent.metadata?.order_id ? parseInt(intent.metadata.order_id, 10) : null;

         if (event.type === "payment_intent.succeeded") {
            const chargeId = intent.charges?.data?.[0]?.id || null;
            await PaymentsStripeDAO.updatePaymentStatusByIntent(intent.id, "succeeded", chargeId);
            // Actualizar estado de la orden en Orders
            if (orderId) {
               const OrdersService = await import("./ordersService.js");
               await OrdersService.OrdersService.updatePaymentStatus(orderId, "paid", intent.id);
            }
            return { intent, status: "succeeded" };
         }

         if (event.type === "payment_intent.payment_failed") {
            const failure_message = intent.last_payment_error?.decline_code || null;
            await PaymentsStripeDAO.updatePaymentStatusByIntent(intent.id, "failed", failure_message);
            // Actualizar estado de la orden en Orders
            if (orderId) {
               const OrdersService = await import("./ordersService.js");
               await OrdersService.OrdersService.updatePaymentStatus(orderId, "failed", intent.id);
            }
            return { intent, status: "failed" };
         }

         return { ignored: true };
      } catch (err) {
         console.error("StripeService.handleStripeEvent error", err);
         throw err;
      }
   },
};
