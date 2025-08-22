import { query } from "../db/index.js";

export async function initTables() {
   // 1. Crear tabla de lista de precios
   await query(`
      CREATE TABLE IF NOT EXISTS lista_precios (
         id SERIAL PRIMARY KEY,
         producto TEXT NOT NULL,
         descripcion TEXT,
         precio NUMERIC NOT NULL,
         precio_mx NUMERIC NOT NULL,
         pais TEXT DEFAULT 'MX',
         fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         activo BOOLEAN DEFAULT true
      );
   `);

   // 2. Crear tabla de pedidos
   await query(`
      CREATE TABLE IF NOT EXISTS pedidos (
         id SERIAL PRIMARY KEY,
         id_producto INTEGER REFERENCES lista_precios(id),
         nombre TEXT,
         apellidos TEXT,
         correo TEXT,
         telefono TEXT,
         codigopostal TEXT,
         producto TEXT, -- Mantenido para compatibilidad
         cantidad NUMERIC DEFAULT 1,
         precio_unitario NUMERIC,
         total NUMERIC,
         pais TEXT,
         estatus_pago TEXT DEFAULT 'pending',
         fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
   `);

   // Crear tabla de pagos
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

   // 3. Crear tabla de usuarios para el dashboard
   await query(`
       CREATE TABLE IF NOT EXISTS usuarios (
          idusuario SERIAL PRIMARY KEY,
          nombre TEXT NOT NULL,
          usuario TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          estatus BOOLEAN DEFAULT true,
          fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );
   `);

   // Crear índices para mejorar el rendimiento
   await query(`
       CREATE INDEX IF NOT EXISTS idx_pedidos_id_producto ON pedidos(id_producto);
   `);

   await query(`
       CREATE INDEX IF NOT EXISTS idx_pagos_pedido_id ON pagos(pedido_id);
   `);

   await query(`
       CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
   `);

   console.log("✅ Tablas 'lista_precios', 'pedidos', 'pagos' y 'usuarios' creadas o ya existen.");
   console.log("✅ Índices creados para optimizar consultas.");
}
