import { Router } from "express";
import { crearPreferencia, obtenerDetallePago } from "../services/mercadopago.js";
import {
   crearPedido,
   actualizarEstadoPedido,
   obtenerPedidos,
   obtenerPedidosPagos,
   obtenerPedidosPorFechas,
} from "../dao/PedidoDAO.js";
import { registrarPago, obtenerPagos } from "../dao/PagoDAO.js";
import { encryptData, decryptData } from "../utils/crypto.js";

const router = Router();

// Crear preferencia de pago
router.post("/create-preference", async (req, res) => {
   console.log("🔍 Body completo:", JSON.stringify(req.body, null, 2));

   try {
      let payload;

      // Verificar si los datos vienen cifrados
      if (req.body.data) {
         console.log("📥 Recibiendo datos cifrados...");
         payload = decryptData(req.body.data);
         console.log("🔓 Datos descifrados:", payload);
      } else {
         // Para compatibilidad con requests no cifrados
         payload = req.body;
         console.log("📥 Recibiendo datos sin cifrar:", payload);
      }

      const pedido = await crearPedido(payload);
      const preference = await crearPreferencia(pedido);

      res.json({ id: preference.id, init_point: preference.init_point });
   } catch (error) {
      console.error("❌ Error al crear preferencia:", error);
      res.status(500).json({ error: error.toString() });
   }
});

// Webhook de Mercado Pago
router.post("/webhook", async (req, res) => {
   console.log("📩 Webhook recibido:", req.body);
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

router.get("/pagos", async (req, res) => {
   try {
      const pagos = await obtenerPagos();
      res.json(pagos);
   } catch (error) {
      res.status(500).json({ error: "Error al obtener pagos" });
   }
});

router.get("/pedidos", async (req, res) => {
   try {
      const pedidos = await obtenerPedidos();
      res.json(pedidos);
   } catch (error) {
      res.status(500).json({ error: "Error al obtener pagos" });
   }
});

router.get("/pedidos-pagos", async (req, res) => {
   try {
      const pedidosPagos = await obtenerPedidosPagos();
      res.json(pedidosPagos);
   } catch (error) {
      res.status(500).json({ error: "Error al obtener pagos" });
   }
});

router.get("/pedidos-fechas", async (req, res) => {
   const { fechaInicio, fechaFin } = req.query;
   if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: "Se requieren fechaInicio y fechaFin" });
   }
   try {
      const pedidosPagos = await obtenerPedidosPorFechas(fechaInicio, fechaFin);
      console.log(pedidosPagos);
      res.json(pedidosPagos);
   } catch (error) {
      res.status(500).json({ error: "Error al obtener pedidos y pagos por fechas" });
   }
});

export default router;
