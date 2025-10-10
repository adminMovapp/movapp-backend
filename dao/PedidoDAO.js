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
      `INSERT INTO pedidos (id_producto, nombre, apellidos, correo, telefono, codigopostal, producto, cantidad, precio_unitario, total, pais)
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
   await query(`UPDATE pedidos SET estatus_pago = $1 WHERE id = $2`, [nuevoEstado, pedidoId]);
};

export const obtenerPedidos = async () => {
   const result = await query("SELECT * FROM pedidos");
   return result.rows;
};

export const obtenerPedidosPagos = async () => {
   const result = await query(` SELECT PED.id idPedido,*
                                 FROM pedidos PED LEFT JOIN pagos PA ON (PED.id = PA.pedido_id)
                                 ORDER BY PED.id `);
   return result.rows;
};

export const obtenerPedidosPorFechas = async (fechaInicio, fechaFin) => {
   const fechaInicioConHora = fechaInicio + " 00:00:00";
   const fechaFinConHora = fechaFin + " 23:59:59";

   const result = await query(
      `SELECT PED.id AS idPedido,
               (PED.nombre || ' ' || PED.apellidos) AS Nombre, 
               PED.correo, 
               PED.telefono,
               PED.cantidad,
               PED.precio_unitario,
               PED.total,
               PED.pais,
               PED.estatus_pago,
               PED.fecha_registro,
               PAG.id_pago_mp,
               PAG.estado,
               PAG.monto,
               PAG.metodo_pago,
               PAG.tipo_pago,
               PAG.moneda,
               PAG.fecha_registro AS fecha_pago
         FROM pedidos PED
         INNER JOIN pagos PAG ON (PED.id = PAG.pedido_id)
         WHERE PED.fecha_registro BETWEEN $1 AND $2
         ORDER BY PED.id;`,
      [fechaInicioConHora, fechaFinConHora],
   );
   return result.rows ?? [];
};
