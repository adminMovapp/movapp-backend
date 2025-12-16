import { OrdersService } from "../services/ordersService.js";

export const OrdersController = {
   /**
    * GET /orders/:id - Obtener orden por ID con detalles
    */
   async getById(req, res) {
      try {
         const orderId = parseInt(req.params.id, 10);
         const order = await OrdersService.getOrderWithDetails(orderId);
         if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });
         res.json({ success: true, order });
      } catch (err) {
         console.error("OrdersController.getById error", err);
         res.status(500).json({ success: false, message: "Error consultando orden" });
      }
   },

   /**
    * GET /orders/number/:orderNumber - Obtener orden por número
    */
   async getByNumber(req, res) {
      try {
         const orderNumber = req.params.orderNumber;
         const order = await OrdersService.getOrderByNumber(orderNumber);
         if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });
         res.json({ success: true, order });
      } catch (err) {
         console.error("OrdersController.getByNumber error", err);
         res.status(500).json({ success: false, message: "Error consultando orden" });
      }
   },
};
