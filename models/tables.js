import { query } from "../db/index.js";

export async function initTables() {
   console.log("\x1b[32m", "Iniciando creación de tablas...");
   // ============================================
   // FUNCIONES Y TRIGGERS GLOBALES
   // ============================================
   await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

   // ============================================
   // TABLA PAISES
   // ============================================
   await query(`
    DROP TABLE IF EXISTS Paises CASCADE;
    CREATE TABLE Paises (
        id SERIAL PRIMARY KEY,
        codigo_pais VARCHAR(2) NOT NULL UNIQUE,
        pais VARCHAR(100) NOT NULL,
        moneda VARCHAR(3) NOT NULL,
        simbolo VARCHAR(5) NOT NULL,
        codigo_telefono VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT TRUE

    );
    CREATE INDEX idx_paises_codigo ON Paises(codigo_pais);
  `);

   await query(`
    INSERT INTO Paises (codigo_pais, pais, moneda, simbolo, codigo_telefono) VALUES
        ('MX', 'México', 'MXN', '$', '+52'),
        ('PE', 'Perú', 'PEN', 'S/', '+51'),
        ('CO', 'Colombia', 'COP', '$', '+57'),
        ('EC', 'Ecuador', 'USD', '$', '+593'),
        ('BO', 'Bolivia', 'BOB', 'Bs', '+591'),
        ('AR', 'Argentina', 'ARS', '$', '+54'),
        ('CL', 'Chile', 'CLP', '$', '+56');
  `);

   await query(`
    DROP TRIGGER IF EXISTS update_paises_updated_at ON Paises;
    CREATE TRIGGER update_paises_updated_at
      BEFORE UPDATE ON Paises
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

   // ============================================
   // TABLA PRODUCTOS
   // ============================================
   await query(`
    DROP TABLE IF EXISTS Productos CASCADE;
    CREATE TABLE Productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        sku VARCHAR(50) UNIQUE,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_productos_sku ON Productos(sku);
    CREATE INDEX idx_productos_activo ON Productos(activo);
  `);

   await query(`
    INSERT INTO Productos (nombre, descripcion, sku, activo)
    VALUES ('El Hack', 'El Hack', 'PROD-001', TRUE);
  `);

   await query(`
    DROP TRIGGER IF EXISTS update_productos_updated_at ON Productos;
    CREATE TRIGGER update_productos_updated_at
      BEFORE UPDATE ON Productos
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

   // ============================================
   // TABLA PRECIOS
   // ============================================
   await query(`
    DROP TABLE IF EXISTS Precios CASCADE;
    CREATE TABLE Precios (
        id SERIAL PRIMARY KEY,
        producto_id INTEGER NOT NULL REFERENCES Productos(id) ON DELETE CASCADE,
        pais_id INTEGER NOT NULL REFERENCES Paises(id) ON DELETE CASCADE,
        precio NUMERIC(12, 2) NOT NULL,
        precio_mx NUMERIC(12, 2) NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(producto_id, pais_id)
    );
    CREATE INDEX idx_precios_producto ON Precios(producto_id);
    CREATE INDEX idx_precios_pais ON Precios(pais_id);
    CREATE INDEX idx_precios_activo ON Precios(activo);
  `);

   await query(`
    INSERT INTO Precios (producto_id, pais_id, precio, precio_mx, activo) VALUES
      (1, 1, 500.00, 500.00, TRUE),
      (1, 2, 105.00, 558.12, TRUE),
      (1, 3, 115000.00, 540.55, TRUE),
      (1, 4, 22.00, 412.19, TRUE),
      (1, 5, 200.00, 546.24, TRUE),
      (1, 6, 36500.00, 502.10, TRUE),
      (1, 7, 28500.00, 549.40, TRUE);
  `);

   await query(`
    DROP TRIGGER IF EXISTS update_precios_updated_at ON Precios;
    CREATE TRIGGER update_precios_updated_at
      BEFORE UPDATE ON Precios
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

   // ============================================
   // TABLA USUARIOS
   // ============================================
   await query(`
    DROP TABLE IF EXISTS Usuarios CASCADE;
    CREATE TABLE Usuarios (
        id SERIAL PRIMARY KEY,
        user_uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        nombre VARCHAR(150),
        email VARCHAR(255) UNIQUE NOT NULL,
        telefono VARCHAR(50),
        pais_id INTEGER NOT NULL REFERENCES Paises(id) ON DELETE CASCADE,
        cp VARCHAR(20),
        password VARCHAR(300) NOT NULL,       
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT TRUE
    );
    CREATE INDEX idx_Usuarios_pais ON Usuarios(pais_id);
    CREATE INDEX idx_Usuarios_email ON Usuarios(email);

  `);

   await query(`
    DROP TRIGGER IF EXISTS update_Usuarios_updated_at ON Usuarios;
    CREATE TRIGGER update_Usuarios_updated_at
      BEFORE UPDATE ON Usuarios
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

   // ============================================
   // TABLA DISPOSITIVOS
   // ============================================
   await query(`
    DROP TABLE IF EXISTS Dispositivos CASCADE;
    CREATE TABLE Dispositivos (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES Usuarios(id) ON DELETE CASCADE,
        refresh_hash VARCHAR(256) NOT NULL,
        device VARCHAR(200),
        platform VARCHAR(50),
        model VARCHAR(200),
        app_version VARCHAR(50),
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_Dispositivos_user_id ON Dispositivos(user_id);
    CREATE INDEX idx_Dispositivos_device_id ON Dispositivos(device_id);
    CREATE INDEX idx_Dispositivos_refresh_hash ON Dispositivos(refresh_hash);
    CREATE INDEX idx_Dispositivos_revoked ON Dispositivos(revoked);
  `);

   await query(`
    DROP TRIGGER IF EXISTS update_Dispositivos_updated_at ON Dispositivos;
    CREATE TRIGGER update_Dispositivos_updated_at
      BEFORE UPDATE ON Dispositivos
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

   // ============================================
   // TABLA REFRESH_TOKENS
   // ============================================

   await query(`
    DROP TABLE IF EXISTS Refresh_Tokens CASCADE;
    CREATE TABLE Refresh_Tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES Usuarios(id) ON DELETE CASCADE,
      device_id INTEGER REFERENCES Dispositivos(id) ON DELETE CASCADE,
      token_hash VARCHAR(256) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_refresh_user_id ON Refresh_Tokens(user_id);
    CREATE INDEX idx_refresh_device_id ON Refresh_Tokens(device_id);
    CREATE INDEX idx_refresh_token_hash ON Refresh_Tokens(token_hash);
    CREATE INDEX idx_refresh_expires ON Refresh_Tokens(expires_at);
  `);

   // ============================================
   // TABLA PASSWORD_RESET_TOKENS
   // ============================================
   await query(`
    DROP TABLE IF EXISTS Password_Reset_Tokens CASCADE;
    CREATE TABLE Password_Reset_Tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Usuarios(id) ON DELETE CASCADE,
        token_hash VARCHAR(256) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_password_reset_user_id ON Password_Reset_Tokens(user_id);
    CREATE INDEX idx_password_reset_token_hash ON Password_Reset_Tokens(token_hash);
    CREATE INDEX idx_password_reset_expires ON Password_Reset_Tokens(expires_at);
    CREATE INDEX idx_password_reset_used ON Password_Reset_Tokens(used);
  `);

   await query(`
    DROP TRIGGER IF EXISTS update_password_reset_updated_at ON Password_Reset_Tokens;
    CREATE TRIGGER update_password_reset_updated_at
      BEFORE UPDATE ON Password_Reset_Tokens
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

   // ============================================
   // TABLA AUDIT_LOGS
   // ============================================
   await query(`
    DROP TABLE IF EXISTS Audit_Logs CASCADE;
    CREATE TABLE Audit_Logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES Usuarios(id) ON DELETE SET NULL,
        device_id VARCHAR(255),
        action VARCHAR(500) NOT NULL,
        success BOOLEAN NOT NULL,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_audit_user_id ON Audit_Logs(user_id);
    CREATE INDEX idx_audit_device_id ON Audit_Logs(device_id);
    CREATE INDEX idx_audit_action ON Audit_Logs(action);
    CREATE INDEX idx_audit_success ON Audit_Logs(success);
    CREATE INDEX idx_audit_created_at ON Audit_Logs(created_at);
  `);

   // ============================================
   // TABLAS PEDIDOS_ML y PAGOS_ML (de MercadoLibre o pasarela)
   // ============================================
   await query(`
    DROP TABLE IF EXISTS Pedidos_ML CASCADE;
    CREATE TABLE Pedidos_ML (
        id SERIAL PRIMARY KEY,
        id_producto INTEGER REFERENCES Productos(id),
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
    CREATE INDEX idx_pedidos_ml_id_producto ON Pedidos_ML(id_producto);
  `);

   await query(`
    DROP TABLE IF EXISTS Pagos_ML CASCADE;
    CREATE TABLE Pagos_ML (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER REFERENCES Pedidos_ML(id),
        id_pago_mp TEXT,
        estado TEXT,
        detalle_estado TEXT,
        monto NUMERIC,
        metodo_pago TEXT,
        tipo_pago TEXT,
        moneda TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_pagos_ml_pedido_id ON Pagos_ML(pedido_id);
  `);

   // ============================================
   // TABLAS pagos_stripe (stripe)
   // ============================================
   await query(`
    DROP TABLE IF EXISTS pagos_stripe CASCADE;
      CREATE TABLE IF NOT EXISTS pagos_stripe (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER,
      email           TEXT,
      amount_cents    INTEGER NOT NULL,
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

    CREATE INDEX idx_pagos_stripe_intent_id ON pagos_stripe(intent_id);
  `);

   console.log("\x1b[32m", "Todas las tablas, índices y triggers fueron creados correctamente.");
}
