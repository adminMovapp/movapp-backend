// routes/payments.js
import { Router } from "express";
import { query } from "../db/index.js";
import { crearPreferencia, obtenerDetallePago } from "../services/mercadopago.js";

const router = Router();

// Crear preferencia de pago
router.post("/create-preference", async (req, res) => {
   const { nombre, apellidos, correo, telefono, codigopostal, producto, cantidad, precio_unitario, total, pais } =
      req.body;

   try {
      const insert = await query(
         `INSERT INTO pedidos (nombre, apellidos, correo, telefono, codigopostal, producto, cantidad, precio_unitario,total, pais)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
         [nombre, apellidos, correo, telefono, codigopostal, producto, cantidad, precio_unitario, total, pais],
      );

      const pedido = insert.rows[0];
      const preference = await crearPreferencia(pedido);
      res.json({ id: preference.id, init_point: preference.init_point });
   } catch (error) {
      console.error("ERROR:", error);
      res.status(500).json({ error: error.toString() });
   }
});

// Webhook de Mercado Pago
router.post("/webhook", async (req, res) => {
   console.log("📩 Webhook recibido:", req.body);

   try {
      const { type, data } = req.body;

      if (type === "payment" && data?.id) {
         const paymentId = data.id;

         // Obtener detalles del pago
         let pago;
         try {
            pago = await obtenerDetallePago(paymentId);
         } catch (err) {
            console.error("❌ No se pudo obtener detalles del pago:", err);
            return res.status(500).send("Error al obtener detalles de pago");
         }
         const pedidoId = pago.metadata?.pedido_id;

         if (!pedidoId) {
            console.warn("❗ No se encontró metadata.pedidoId en el pago.");
            return res.status(400).send("Metadata incompleta");
         }

         // Guardar en tabla 'pagos'
         await query(
            `INSERT INTO pagos (
               pedido_id, id_pago_mp, estado, detalle_estado, monto,metodo_pago, tipo_pago, moneda
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
               pedidoId,
               pago.id.toString(),
               pago.status,
               pago.status_detail,
               pago.transaction_amount,
               pago.payment_method_id,
               pago.payment_type_id,
               pago.currency_id,
            ],
         );

         console.log(`⚠️ ESTATUS : ${pago.status}`);

         // Actualizar estado del pedido si fue aprobado
         await query(`UPDATE pedidos SET estatus = '${pago.status}' WHERE id = $1`, [pedidoId]);

         if (pago.status === "approved") {
            console.log(`✅ Pedido ${pedidoId} actualizado a pagado`);
         } else {
            console.log(`⚠️ Pedido ${pedidoId} con estado de pago: ${pago.status}`);
         }
      }

      res.status(200).send("OK");
   } catch (error) {
      console.error("❌ Error en webhook:", error);
      res.status(500).send("Error en webhook");
   }
});

export default router;
