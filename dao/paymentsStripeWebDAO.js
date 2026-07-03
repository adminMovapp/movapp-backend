import { query } from "../db/index.js";

/**
 * DAO independiente para el flujo de pago Stripe del SITIO WEB.
 * Opera sobre las tablas ordenes_web, ordenes_web_detalle y pagos_stripe_web.
 * No comparte tablas con el flujo de la app movil.
 */
export const PaymentsStripeWebDAO = {
   // ============================================
   // ORDENES WEB
   // ============================================

   /**
    * Crea una orden web con sus detalles.
    * order_number se genera automaticamente por trigger (prefijo WEB-).
    */
   async createOrder({
      nombre = null,
      apellidos = null,
      email = null,
      telefono = null,
      codigoPostal = null,
      pais = null,
      subtotal,
      total,
      currency,
      paymentMethod = "stripe",
      paymentStatus = "pending",
      paymentReference = null,
      items = [],
   }) {
      const orderResult = await query(
         `INSERT INTO ordenes_web
            (nombre, apellidos, email, telefono, codigo_postal, pais, subtotal, total, currency, payment_method, payment_status, payment_reference)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          RETURNING *`,
         [
            nombre,
            apellidos,
            email,
            telefono,
            codigoPostal,
            pais,
            subtotal,
            total,
            currency,
            paymentMethod,
            paymentStatus,
            paymentReference,
         ],
      );

      const order = orderResult.rows[0];

      if (items && items.length > 0) {
         for (const item of items) {
            await query(
               `INSERT INTO ordenes_web_detalle
                  (order_id, producto_id, sku, nombre, descripcion, precio_unitario, cantidad, subtotal)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
               [
                  order.id,
                  item.producto_id || null,
                  item.sku || null,
                  item.nombre,
                  item.descripcion || null,
                  item.precio_unitario,
                  item.cantidad || 1,
                  item.subtotal,
               ],
            );
         }
      }

      return order;
   },

   async updateOrderPaymentStatus(orderId, paymentStatus, paymentReference = null) {
      const result = await query(
         `UPDATE ordenes_web
          SET payment_status = $1, payment_reference = $2, updated_at = NOW()
          WHERE id = $3 RETURNING *`,
         [paymentStatus, paymentReference, orderId],
      );
      return result.rows[0];
   },

   async findOrderById(orderId) {
      const result = await query(`SELECT * FROM ordenes_web WHERE id = $1`, [orderId]);
      return result.rows[0];
   },

   async findOrderByNumber(orderNumber) {
      const result = await query(`SELECT * FROM ordenes_web WHERE order_number = $1`, [orderNumber]);
      return result.rows[0];
   },

   async getOrderDetails(orderId) {
      const result = await query(`SELECT * FROM ordenes_web_detalle WHERE order_id = $1 ORDER BY id`, [orderId]);
      return result.rows;
   },

   async getOrderWithDetails(orderId) {
      const order = await this.findOrderById(orderId);
      if (!order) return null;
      const details = await this.getOrderDetails(orderId);
      return { ...order, items: details };
   },

   // ============================================
   // PAGOS STRIPE WEB
   // ============================================

   insertPayment: async ({
      orderId = null,
      email = null,
      amount,
      currency,
      description,
      intent_id,
      status,
      metadata = {},
   }) => {
      const r = await query(
         `INSERT INTO pagos_stripe_web
            (order_id, email, amount, currency, description, intent_id, gateway, status, metadata, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,
         [orderId, email, amount, currency, description, intent_id, "stripe", status, JSON.stringify(metadata)],
      );
      return r.rows[0];
   },

   updatePaymentStatusByIntent: async (intentId, status, observations) => {
      await query(
         `UPDATE pagos_stripe_web
          SET status = $1, observations = $2, updated_at = NOW()
          WHERE intent_id = $3`,
         [status, observations, intentId],
      );
   },

   findPaymentByIntent: async (intentId) => {
      const r = await query(`SELECT * FROM pagos_stripe_web WHERE intent_id = $1 LIMIT 1`, [intentId]);
      return r.rows[0];
   },
};
