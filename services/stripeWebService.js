import { stripe } from "../utils/stripe.js";
import { PaymentsStripeWebDAO } from "../dao/paymentsStripeWebDAO.js";

/**
 * Servicio Stripe independiente para el SITIO WEB.
 * Replica el patron de stripeService.js pero persiste en las tablas *_web
 * y actualiza ordenes_web (sin tocar el flujo de la app movil).
 */
export const StripeWebService = {
   async createPaymentIntent({ orderId = null, email, amount, currency = "mxn", description = "", metadata = {} }) {
      try {
         const amount_cents_stripe = Math.round(parseFloat(amount) * 100);
         const amount_stored = Math.round(parseFloat(amount));

         // Metadata para Stripe (limite 500 caracteres por campo)
         const stripeMetadata = {};
         if (metadata.order_id) stripeMetadata.order_id = String(metadata.order_id);
         if (metadata.order_number) stripeMetadata.order_number = String(metadata.order_number);
         if (email) stripeMetadata.email = String(email);

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
               const summary = itemsArray
                  .map((it) => `${it.sku || it.nombre || "Item"} x${it.quantity || it.cantidad || 1}`)
                  .join(", ");
               stripeMetadata.items_summary = summary.length > 450 ? summary.slice(0, 450) + "..." : summary;
            }
         }

         const intent = await stripe.paymentIntents.create({
            amount: amount_cents_stripe,
            currency,
            receipt_email: email,
            description,
            metadata: stripeMetadata,
            automatic_payment_methods: { enabled: true },
         });

         await PaymentsStripeWebDAO.insertPayment({
            orderId,
            email,
            amount: amount_stored,
            currency,
            description,
            intent_id: intent.id,
            status: intent.status,
            metadata,
         });

         return { clientSecret: intent.client_secret, intentId: intent.id };
      } catch (err) {
         console.error("StripeWebService.createPaymentIntent error", err);
         throw err;
      }
   },

   async handleStripeEvent(event) {
      try {
         const intent = event.data.object;
         const orderId = intent.metadata?.order_id ? parseInt(intent.metadata.order_id, 10) : null;

         if (event.type === "payment_intent.succeeded") {
            const chargeId = intent.charges?.data?.[0]?.id || null;
            await PaymentsStripeWebDAO.updatePaymentStatusByIntent(intent.id, "succeeded", chargeId);
            if (orderId) {
               await PaymentsStripeWebDAO.updateOrderPaymentStatus(orderId, "paid", intent.id);
            }
            return { intent, status: "succeeded" };
         }

         if (event.type === "payment_intent.payment_failed") {
            const failure_message = intent.last_payment_error?.decline_code || null;
            await PaymentsStripeWebDAO.updatePaymentStatusByIntent(intent.id, "failed", failure_message);
            if (orderId) {
               await PaymentsStripeWebDAO.updateOrderPaymentStatus(orderId, "failed", intent.id);
            }
            return { intent, status: "failed" };
         }

         return { ignored: true };
      } catch (err) {
         console.error("StripeWebService.handleStripeEvent error", err);
         throw err;
      }
   },
};
