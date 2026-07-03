import { query, pool } from "../db/index.js";

/**
 * Crea SOLO las tablas independientes del flujo de pago del SITIO WEB:
 *   - ordenes_web
 *   - ordenes_web_detalle
 *   - pagos_stripe_web
 *
 * No toca ninguna otra tabla existente (a diferencia de initTables() en tables.js,
 * que hace DROP de todas las tablas). Es seguro ejecutar este script sin regenerar
 * el resto de la base de datos.
 *
 * Uso:  node models/tablesWeb.js
 */
export async function initWebTables() {
   console.log("\x1b[32m", "Creando tablas del sitio web (Stripe web)...");

   // La funcion global update_updated_at_column() ya existe (creada por initTables).
   // Se recrea con CREATE OR REPLACE por si el script se corre en una BD donde no exista.
   await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

   // Ordenes generadas desde el sitio web (sin login: datos de contacto en la orden)
   await query(`
    CREATE TABLE IF NOT EXISTS ordenes_web (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(120),
        apellidos VARCHAR(120),
        email TEXT,
        telefono VARCHAR(30),
        codigo_postal VARCHAR(20),
        pais VARCHAR(10),
        subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
        total NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'MXN',
        payment_method VARCHAR(50) DEFAULT 'stripe',
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_reference VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ordenes_web_order_number ON ordenes_web(order_number);
    CREATE INDEX IF NOT EXISTS idx_ordenes_web_created_at ON ordenes_web(created_at);
  `);

   await query(`
    DROP TRIGGER IF EXISTS update_ordenes_web_updated_at ON ordenes_web;
    CREATE TRIGGER update_ordenes_web_updated_at
      BEFORE UPDATE ON ordenes_web
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

   // Funcion + trigger para generar order_number del sitio web (prefijo WEB-)
   await query(`
    CREATE OR REPLACE FUNCTION set_order_number_web()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.order_number := 'WEB-' || LPAD(NEW.id::TEXT, 6, '0');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

   await query(`
    DROP TRIGGER IF EXISTS trigger_set_order_number_web ON ordenes_web;
    CREATE TRIGGER trigger_set_order_number_web
      BEFORE INSERT ON ordenes_web
      FOR EACH ROW
      EXECUTE FUNCTION set_order_number_web();
  `);

   // Detalle de ordenes web
   await query(`
    CREATE TABLE IF NOT EXISTS ordenes_web_detalle (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES ordenes_web(id) ON DELETE CASCADE,
        producto_id INTEGER,
        sku VARCHAR(50),
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        precio_unitario NUMERIC(12,2) NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1,
        subtotal NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ordenes_web_detalle_order_id ON ordenes_web_detalle(order_id);
  `);

   // Pagos Stripe generados desde el sitio web
   await query(`
    CREATE TABLE IF NOT EXISTS pagos_stripe_web (
      id              SERIAL PRIMARY KEY,
      order_id        INTEGER REFERENCES ordenes_web(id) ON DELETE SET NULL,
      email           TEXT,
      amount          NUMERIC(12,2) NOT NULL,
      currency        VARCHAR(10) NOT NULL,
      description     TEXT,
      intent_id       VARCHAR(255) UNIQUE NOT NULL,
      gateway         VARCHAR(50) NOT NULL DEFAULT 'stripe',
      status          VARCHAR(100),
      observations    VARCHAR(100),
      metadata        JSONB,
      created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pagos_stripe_web_intent_id ON pagos_stripe_web(intent_id);
  `);

   console.log("\x1b[32m", "Tablas del sitio web creadas correctamente: ordenes_web, ordenes_web_detalle, pagos_stripe_web.");
}

// Ejecutar directamente: node models/tablesWeb.js
const isMain = process.argv[1] && process.argv[1].endsWith("tablesWeb.js");
if (isMain) {
   initWebTables()
      .then(async () => {
         await pool.end();
         process.exit(0);
      })
      .catch(async (err) => {
         console.error("\x1b[31m", "Error creando tablas del sitio web:", err.message);
         await pool.end();
         process.exit(1);
      });
}
