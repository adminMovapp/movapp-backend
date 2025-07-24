import { query } from "../db/index.js";

export async function initTables() {
   await query(`
      CREATE TABLE IF NOT EXISTS pedidos (
         id SERIAL PRIMARY KEY,
         nombre TEXT,
         apellidos TEXT,
         correo TEXT,
         telefono TEXT,
         codigopostal TEXT,
         producto TEXT,
         cantidad NUMERIC DEFAULT 1,
         precio_unitario NUMERIC,
         total NUMERIC,
         pais TEXT,
         estatus_pago TEXT DEFAULT 'pending',
         fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
   `);

   await query(`
       CREATE TABLE IF NOT EXISTS pagos (
          id SERIAL PRIMARY KEY,
          pedido_id INTEGER REFERENCES pedidos(id),
          id_pago_mp TEXT,             -- ID del pago en Mercado Pago
          estado TEXT,                 -- Estado del pago (e.g. approved, rejected)
          detalle_estado TEXT,         -- Detalle del estado (e.g. accredited, cc_rejected_other_reason)
          monto NUMERIC,               -- Monto pagado
          metodo_pago TEXT,            -- Método de pago (e.g. visa, mastercard)
          tipo_pago TEXT,              -- Tipo (e.g. credit_card, debit_card)
          moneda TEXT,                 -- Código de moneda (e.g. MXN)
          fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
   `);

   console.log("✅ Tablas 'pedidos' y 'pagos' creadas o ya existen.");
}
