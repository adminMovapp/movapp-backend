import { stripe } from "../utils/stripe.js";
import { PaymentsStripeDAO } from "../dao/paymentsStripeDAO.js";
import { OrdersService } from "./ordersService.js";

export const StripeService = {
   async createPaymentIntent({
      userId = null,
      email,
      paisId,
      amount,
      currency = "mxn",
      description = "",
      items = [],
      metadata = {},
   }) {
      try {
         const amountNum = Number(amount);
         if (!Number.isFinite(amountNum) || amountNum <= 0) throw new Error("amount inválido");

         const amount_cents = Math.round(amountNum * 100);

         // 1. Crear orden en la BD
         const order = await OrdersService.createOrder({
            userId,
            email,
            paisId,
            items,
            paymentMethod: "stripe",
            currency: currency.toUpperCase(),
         });

         // Guardar items completos como JSON string (con precio y moneda)
         const itemsWithPrice = items.map((it) => ({
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
         const stripeMetadata = { ...metadata };
         const itemsJSON = JSON.stringify(itemsWithPrice);
         if (itemsJSON.length <= 500) {
            stripeMetadata.items = itemsJSON;
         } else {
            console.warn("⚠️ items JSON muy largo, se truncará en items_summary");
         }

         // Summary para visualización rápida
         const summaryParts = itemsWithPrice.map((it) => `${it.sku} : ${it.nombre} x ${it.cantidad}`).filter(Boolean);

         let itemsSummary = summaryParts.join(", ");
         if (itemsSummary.length > 480) itemsSummary = itemsSummary.slice(0, 480) + "...";
         if (itemsSummary) stripeMetadata.items_summary = itemsSummary;
         stripeMetadata.items_count = String(items.length);

         // 3. Crear PaymentIntent en Stripe
         const intent = await stripe.paymentIntents.create({
            amount: amount_cents,
            currency,
            receipt_email: email,
            description: description || `Orden ${order.order_number}`,
            metadata: stripeMetadata,
         });

         // 4. Guardar pago en pagos_stripe con referencia a order_id
         await PaymentsStripeDAO.insertPayment({
            userId,
            email,
            amount: Number(amountNum.toFixed(2)),
            currency,
            description: description || `Orden ${order.order_number}`,
            intent_id: intent.id,
            gateway_payment_id: intent.id,
            status: intent.status,
            metadata: { order_id: order.id, order_number: order.order_number, items },
         });

         // 5. Actualizar orden con payment_reference (intent_id)
         await OrdersService.updatePaymentReference(order.id, intent.id);

         return {
            clientSecret: intent.client_secret,
            intentId: intent.id,
            orderId: order.id,
            orderNumber: order.order_number,
         };
      } catch (err) {
         console.error("StripeService.createPaymentIntent error", err);
         throw err;
      }
   },

   async handleStripeEvent(event) {
      try {
         if (event.type === "payment_intent.succeeded") {
            const intent = event.data.object;
            const chargeId = intent.charges?.data?.[0]?.id || null;

            // Actualizar estado en pagos_stripe
            await PaymentsStripeDAO.updatePaymentStatusByIntent(intent.id, "succeeded", chargeId);

            // Obtener order_id desde metadata y actualizar estado de orden
            const orderId = intent.metadata?.order_id;
            if (orderId) {
               await OrdersService.updatePaymentStatus(parseInt(orderId, 10), "paid", intent.id);
            }

            return { intent, status: "succeeded" };
         }

         if (event.type === "payment_intent.payment_failed") {
            const intent = event.data.object;
            await PaymentsStripeDAO.updatePaymentStatusByIntent(intent.id, "failed", null);

            const orderId = intent.metadata?.order_id;
            if (orderId) {
               await OrdersService.updatePaymentStatus(parseInt(orderId, 10), "failed", intent.id);
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
