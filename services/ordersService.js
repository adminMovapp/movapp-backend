import { OrdersDAO } from "../dao/ordersDAO.js";

export const OrdersService = {
   async createOrder({ userId = null, email, paisId, items = [], paymentMethod = null, currency = "MXN" }) {
      try {
         let subtotal = 0;
         const processedItems = items.map((item) => {
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

         const total = subtotal;

         const order = await OrdersDAO.createOrder({
            userId,
            email,
            paisId,
            subtotal,
            total,
            currency,
            paymentMethod,
            paymentStatus: "pending",
            paymentReference: null,
            items: processedItems,
         });

         return order;
      } catch (err) {
         console.error("OrdersService.createOrder error", err);
         throw err;
      }
   },

   async updatePaymentStatus(orderId, paymentStatus, paymentReference = null) {
      return await OrdersDAO.updatePaymentStatus(orderId, paymentStatus, paymentReference);
   },

   async updatePaymentReference(orderId, paymentReference) {
      return await OrdersDAO.updatePaymentReference(orderId, paymentReference);
   },

   async getOrderWithDetails(orderId) {
      return await OrdersDAO.getOrderWithDetails(orderId);
   },

   async getOrderByNumber(orderNumber) {
      const order = await OrdersDAO.findOrderByNumber(orderNumber);
      if (!order) return null;
      const details = await OrdersDAO.getOrderDetails(order.id);
      return { ...order, items: details };
   },
};
