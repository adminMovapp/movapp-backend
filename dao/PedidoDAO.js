// dao/PedidoDAO.js
import { query } from "../db/index.js";

export const crearPedido = async (pedido) => {
   const {
      id_producto,
      nombre,
      apellidos,
      correo,
      telefono,
      codigopostal,
      producto,
      cantidad,
      precio_unitario,
      total,
      pais,
   } = pedido;

   const result = await query(
      `INSERT INTO pedidos_ml (id_producto, nombre, apellidos, correo, telefono, codigopostal, producto, cantidad, precio_unitario, total, pais)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
         id_producto,
         nombre,
         apellidos,
         correo,
         telefono,
         codigopostal,
         producto,
         cantidad,
         precio_unitario,
         total,
         pais,
      ],
   );

   return result.rows[0];
};

export const actualizarEstadoPedido = async (pedidoId, nuevoEstado) => {
   await query(`UPDATE pedidos_ml SET estatus_pago = $1 WHERE id = $2`, [nuevoEstado, pedidoId]);
};

export const obtenerPedidos = async () => {
   const result = await query("SELECT * FROM pedidos_ml");
   return result.rows;
};

export const obtenerPedidosPagos = async () => {
   const result = await query(` SELECT PED.id idPedido,*
                                 FROM pedidos_ml PED LEFT JOIN pagos_ml PA ON (PED.id = PA.pedido_id)
                                 ORDER BY PED.id `);
   return result.rows;
};
