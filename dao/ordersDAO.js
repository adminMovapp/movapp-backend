import { query } from "../db/index.js";

export const OrdersDAO = {
   /**
    * Crea una orden y sus detalles en una transacción
    */
   async createOrder({
      userId = null,
      email,
      paisId,
      subtotal,
      total,
      currency,
      paymentMethod,
      paymentStatus = "pending",
      paymentReference = null,
      items = [],
   }) {
      const client = await query.getClient();
      try {
         await client.query("BEGIN");

         // Insertar orden (order_number se genera automáticamente por trigger)
         const orderResult = await client.query(
            `INSERT INTO Orders (user_id, email, pais_id, subtotal, total, currency, payment_method, payment_status, payment_reference)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [userId, email, paisId, subtotal, total, currency, paymentMethod, paymentStatus, paymentReference],
         );

         const order = orderResult.rows[0];

         // Insertar detalles
         if (items && items.length > 0) {
            for (const item of items) {
               await client.query(
                  `INSERT INTO Order_Details (order_id, producto_id, sku, nombre, descripcion, precio_unitario, cantidad, subtotal)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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

         await client.query("COMMIT");
         return order;
      } catch (err) {
         await client.query("ROLLBACK");
         console.error("OrdersDAO.createOrder error", err);
         throw err;
      } finally {
         client.release();
      }
   },

   /**
    * Actualiza el estado de pago de una orden
    */
   async updatePaymentStatus(orderId, paymentStatus, paymentReference = null) {
      const result = await query(
         `UPDATE Orders SET payment_status = $1, payment_reference = $2, updated_at = NOW()
          WHERE id = $3 RETURNING *`,
         [paymentStatus, paymentReference, orderId],
      );
      return result.rows[0];
   },

   /**
    * Actualiza la referencia de pago de una orden
    */
   async updatePaymentReference(orderId, paymentReference) {
      const result = await query(
         `UPDATE Orders SET payment_reference = $1, updated_at = NOW()
          WHERE id = $2 RETURNING *`,
         [paymentReference, orderId],
      );
      return result.rows[0];
   },

   /**
    * Busca orden por ID
    */
   async findOrderById(orderId) {
      const result = await query(`SELECT * FROM Orders WHERE id = $1`, [orderId]);
      return result.rows[0];
   },

   /**
    * Busca orden por order_number
    */
   async findOrderByNumber(orderNumber) {
      const result = await query(`SELECT * FROM Orders WHERE order_number = $1`, [orderNumber]);
      return result.rows[0];
   },

   /**
    * Obtiene detalles de una orden
    */
   async getOrderDetails(orderId) {
      const result = await query(`SELECT * FROM Order_Details WHERE order_id = $1 ORDER BY id`, [orderId]);
      return result.rows;
   },

   /**
    * Obtiene orden completa con detalles
    */
   async getOrderWithDetails(orderId) {
      const order = await this.findOrderById(orderId);
      if (!order) return null;
      const details = await this.getOrderDetails(orderId);
      return { ...order, items: details };
   },
};
