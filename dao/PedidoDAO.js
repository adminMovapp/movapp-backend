// dao/PedidoDAO.js
import { query } from "../db/index.js";

export const crearPedido = async (pedido) => {
   const { nombre, apellidos, correo, telefono, codigopostal, producto, cantidad, precio_unitario, total, pais } =
      pedido;

   const result = await query(
      ` INSERT INTO pedidos (nombre, apellidos, correo, telefono,codigopostal, producto, cantidad,precio_unitario, total, pais) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
      [nombre, apellidos, correo, telefono, codigopostal, producto, cantidad, precio_unitario, total, pais],
   );

   return result.rows[0];
};

export const actualizarEstadoPedido = async (pedidoId, nuevoEstado) => {
   await query(`UPDATE pedidos SET estatus_pago = $1 WHERE id = $2`, [nuevoEstado, pedidoId]);
};

export const obtenerPedidos = async () => {
   const result = await query("SELECT * FROM pedidos");
   return result.rows;
};
