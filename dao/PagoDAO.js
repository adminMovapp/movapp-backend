// dao/PagoDAO.js
import { query } from "../db/index.js";

export const registrarPago = async (pago) => {
   const { pedido_id, id_pago_mp, estado, detalle_estado, monto, metodo_pago, tipo_pago, moneda } = pago;

   await query(
      `INSERT INTO pagos (pedido_id, id_pago_mp, estado, detalle_estado, monto, metodo_pago, tipo_pago, moneda )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [pedido_id, id_pago_mp, estado, detalle_estado, monto, metodo_pago, tipo_pago, moneda],
   );
};
