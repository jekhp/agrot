import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requiere SSL siempre
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => console.error('DB pool error:', err.message));

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

export async function queryOne(text, params) {
  const result = await pool.query(text, params);
  return result.rows[0] ?? null;
}

export async function queryAll(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

export default pool;
