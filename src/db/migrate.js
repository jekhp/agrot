import 'dotenv/config';
import pool from './database.js';

console.log('🔨 Creando tablas en Supabase PostgreSQL...\n');

try {
  await pool.query(`
    -- Tiendas
    CREATE TABLE IF NOT EXISTS stores (
      id              SERIAL PRIMARY KEY,
      nombre          TEXT        NOT NULL,
      slug            TEXT        UNIQUE NOT NULL,
      telefono        TEXT        NOT NULL,
      ciudad          TEXT        NOT NULL,
      descripcion     TEXT        DEFAULT '',
      logo_url        TEXT,                    -- URL pública de Supabase Storage
      logo_path       TEXT,                    -- path interno para borrar: "logos/logo_123.jpg"
      qr_url          TEXT,
      qr_path         TEXT,
      activo          INTEGER     DEFAULT 1,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    -- Admins
    CREATE TABLE IF NOT EXISTS admins (
      id              SERIAL PRIMARY KEY,
      store_id        INTEGER,
      nombre          TEXT        NOT NULL,
      email           TEXT        UNIQUE NOT NULL,
      password        TEXT        NOT NULL,
      es_superadmin   INTEGER     DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    -- Productos
    CREATE TABLE IF NOT EXISTS productos (
      id              SERIAL PRIMARY KEY,
      store_id        INTEGER     NOT NULL,
      nombre          TEXT        NOT NULL,
      descripcion     TEXT        DEFAULT '',
      precio          NUMERIC     NOT NULL,
      stock           INTEGER     DEFAULT 0,
      imagen_url      TEXT,
      imagen_path     TEXT,
      categoria       TEXT        DEFAULT 'general',
      activo          INTEGER     DEFAULT 1,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    -- Pedidos
    CREATE TABLE IF NOT EXISTS pedidos (
      id              SERIAL PRIMARY KEY,
      store_id        INTEGER     NOT NULL,
      cliente_nombre  TEXT        NOT NULL,
      telefono        TEXT        NOT NULL,
      comunidad       TEXT        NOT NULL,
      notas           TEXT        DEFAULT '',
      estado          TEXT        DEFAULT 'pendiente',
      total           NUMERIC     DEFAULT 0,
      pago            TEXT        DEFAULT 'sin_pago',
      nombre_yape     TEXT,
      verificado_pago TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    -- Items del pedido
    CREATE TABLE IF NOT EXISTS pedido_items (
      id              SERIAL PRIMARY KEY,
      pedido_id       INTEGER     NOT NULL,
      producto_id     INTEGER     NOT NULL,
      nombre          TEXT        NOT NULL,
      precio          NUMERIC     NOT NULL,
      cantidad        INTEGER     NOT NULL
    );
  `);

  console.log('✅ Tablas creadas exitosamente');
  console.log('\n⚠️  IMPORTANTE — Crea el bucket en Supabase Storage:');
  console.log('   Dashboard → Storage → New bucket');
  console.log('   Nombre: "qollority-images"');
  console.log('   Public bucket: ✅ activado\n');
} catch (e) {
  console.error('❌ Error al crear tablas:', e.message);
  process.exit(1);
}

await pool.end();
process.exit(0);
