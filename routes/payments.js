import { Router } from "express";
import { crearPreferencia, obtenerDetallePago } from "../services/mercadopago.js";
import { crearPedido, actualizarEstadoPedido } from "../dao/PedidoDAO.js";
import { registrarPago } from "../dao/PagoDAO.js";

const router = Router();

// Crear preferencia de pago
router.post("/create-preference", async (req, res) => {
   try {
      const pedido = await crearPedido(req.body);
      const preference = await crearPreferencia(pedido);

      res.json({ id: preference.id, init_point: preference.init_point });
   } catch (error) {
      console.error("❌ Error al crear preferencia:", error);
      res.status(500).json({ error: error.toString() });
   }
});

// Webhook de Mercado Pago
router.post("/webhook", async (req, res) => {
   // console.log("📩 Webhook recibido:", req.body);
   try {
      const { type, data } = req.body;

      if (type === "payment" && data?.id) {
         const pago = await obtenerDetallePago(data.id);

         const pedidoId = pago.metadata?.pedido_id;
         if (!pedidoId) {
            console.warn("❗ No se encontró metadata.pedido_id");
            return res.status(400).send("Metadata incompleta");
         }

         await registrarPago({
            pedido_id: pedidoId,
            id_pago_mp: pago.id,
            estado: pago.status,
            detalle_estado: pago.status_detail,
            monto: pago.transaction_amount,
            metodo_pago: pago.payment_method_id,
            tipo_pago: pago.payment_type_id,
            moneda: pago.currency_id,
         });

         await actualizarEstadoPedido(pedidoId, pago.status);
      }

      res.status(200).send("OK");
   } catch (error) {
      console.error("❌ Error en webhook:", error);
      res.status(500).send("Error en webhook");
   }
});

export default router;
