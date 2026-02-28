import { query } from "../db/index.js";

export const OrdersDAO = {
   /**
    * Crea una orden y sus detalles en una transacción
    */
   async createOrder({
      userId = null,
      paisId,
      subtotal,
      total,
      currency,
      paymentMethod,
      paymentStatus = "pending",
      paymentReference = null,
      items = [],
   }) {
      try {
         // Insertar orden (order_number se genera automáticamente por trigger)
         const orderResult = await query(
            `INSERT INTO Ordenes (user_id, pais_id, subtotal, total, currency, payment_method, payment_status, payment_reference)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [userId, paisId, subtotal, total, currency, paymentMethod, paymentStatus, paymentReference],
         );

         const order = orderResult.rows[0];

         // Insertar detalles
         if (items && items.length > 0) {
            for (const item of items) {
               await query(
                  `INSERT INTO Ordenes_Detalle (order_id, producto_id, sku, nombre, descripcion, precio_unitario, cantidad, subtotal)
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

         return order;
      } catch (err) {
         console.error("OrdersDAO.createOrder error", err);
         throw err;
      }
   },

   /**
    * Actualiza el estado de pago de una orden
    */
   async updatePaymentStatus(orderId, paymentStatus, paymentReference = null) {
      const result = await query(
         `UPDATE Ordenes SET payment_status = $1, payment_reference = $2, updated_at = NOW()
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
         `UPDATE Ordenes SET payment_reference = $1, updated_at = NOW()
          WHERE id = $2 RETURNING *`,
         [paymentReference, orderId],
      );
      return result.rows[0];
   },

   /**
    * Busca orden por ID
    */
   async findOrderById(orderId) {
      const result = await query(`SELECT * FROM Ordenes WHERE id = $1`, [orderId]);
      return result.rows[0];
   },

   /**
    * Busca orden por order_number
    */
   async findOrderByNumber(orderNumber) {
      const result = await query(`SELECT * FROM Ordenes WHERE order_number = $1`, [orderNumber]);
      return result.rows[0];
   },

   /**
    * Obtiene detalles de una orden
    */
   async getOrderDetails(orderId) {
      const result = await query(`SELECT * FROM Ordenes_Detalle WHERE order_id = $1 ORDER BY id`, [orderId]);
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

   /**
    * Obtiene todas las órdenes pagadas de un usuario por user_uuid
    */
   async getPaidOrdersByUserUuid(userUuid) {
      try {
         const result = await query(
            `SELECT od.*,o.currency,p.simbolo
            FROM Ordenes o
            INNER JOIN ordenes_detalle od ON o.id = od.order_id
            INNER JOIN Usuarios u ON o.user_id = u.id
            INNER JOIN Paises p ON o.pais_id = p.id
             WHERE u.user_uuid = $1 AND o.payment_status = 'paid'
             ORDER BY o.created_at DESC`,
            [userUuid],
         );

         // Para cada orden, obtener sus detalles
         const ordersWithDetails = await Promise.all(
            result.rows.map(async (order) => {
               const details = await this.getOrderDetails(order.id);
               return { ...order, items: details };
            }),
         );

         return result.rows;
      } catch (err) {
         console.error("OrdersDAO.getPaidOrdersByUserUuid error", err);
         throw err;
      }
   },
};
