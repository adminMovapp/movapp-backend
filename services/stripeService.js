import { stripe } from "../utils/stripe.js";
import { PaymentsStripeDAO } from "../dao/paymentsStripeDAO.js";

export const StripeService = {
   async createPaymentIntent({ userId = null, email, amount, currency = "mxn", description = "", metadata = {} }) {
      try {
         const amount_cents_stripe = Math.round(parseFloat(amount) * 100);
         const amount_cents = Math.round(parseFloat(amount));

         // Build stripeMetadata: only short string values and a truncated summary
         const stripeMetadata = {};
         if (metadata.order_id) stripeMetadata.order_id = String(metadata.order_id);

         if (metadata.items) {
            let itemsArray = metadata.items;
            if (typeof itemsArray === "string") {
               try {
                  itemsArray = JSON.parse(metadata.items);
               } catch (e) {
                  itemsArray = [];
               }
            }
            if (!Array.isArray(itemsArray)) itemsArray = [];

            // Guardar items completos como JSON string (con precio y moneda)
            const itemsWithPrice = itemsArray.map((it) => ({
               sku: it.sku || "-",
               nombre: String(it.nombre || it.name || "")
                  .replace(/\s+/g, " ")
                  .trim(),
               cantidad: Number.isFinite(Number(it.cantidad || it.quantity || it.qty))
                  ? Number(it.cantidad || it.quantity || it.qty)
                  : 1,
               precio_unitario: Number.isFinite(Number(it.precio || it.price)) ? Number(it.precio || it.price) : 0,
               moneda: it.moneda || it.currency || currency,
            }));

            // Guardar JSON completo de items (Stripe permite hasta ~500 chars por campo metadata)
            const itemsJSON = JSON.stringify(itemsWithPrice);
            if (itemsJSON.length <= 500) {
               stripeMetadata.items = itemsJSON;
            } else {
               console.warn("⚠️ items JSON muy largo, se truncará en items_summary");
            }

            // Summary para visualización rápida
            const summaryParts = itemsWithPrice
               .map((it) => `${it.sku} : ${it.nombre} x ${it.cantidad}`)
               .filter(Boolean);

            let itemsSummary = summaryParts.join(", ");
            // ensure <= ~480 chars to be safe
            if (itemsSummary.length > 480) itemsSummary = itemsSummary.slice(0, 480) + "...";
            if (itemsSummary) stripeMetadata.items_summary = itemsSummary;
            stripeMetadata.items_count = String(itemsArray.length);
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
         // console.log("\x1b[36m", "handleStripeEvent STRIPE  =>", intent);

         if (event.type === "payment_intent.succeeded") {
            const chargeId = intent.charges?.data?.[0]?.id || null;
            await PaymentsStripeDAO.updatePaymentStatusByIntent(intent.id, "succeeded", chargeId);
            return { intent, status: "succeeded" };
         }

         if (event.type === "payment_intent.payment_failed") {
            const failure_message = intent.last_payment_error?.decline_code || null;
            await PaymentsStripeDAO.updatePaymentStatusByIntent(intent.id, "failed", failure_message);
            return { intent, status: "failed" };
         }

         return { ignored: true };
      } catch (err) {
         console.error("StripeService.handleStripeEvent error", err);
         throw err;
      }
   },
};
