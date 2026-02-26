import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool, { queryOne, query } from './database.js';

console.log('🌱 Seeding Supabase PostgreSQL — Señor de Qollority...\n');

try {
  await query('DELETE FROM pedido_items');
  await query('DELETE FROM pedidos');
  await query('DELETE FROM productos');
  await query('DELETE FROM admins');
  await query('DELETE FROM stores');
  await query('ALTER SEQUENCE stores_id_seq RESTART WITH 1');
  await query('ALTER SEQUENCE admins_id_seq RESTART WITH 1');
  await query('ALTER SEQUENCE productos_id_seq RESTART WITH 1');
  await query('ALTER SEQUENCE pedidos_id_seq RESTART WITH 1');

  const store = await queryOne(`
    INSERT INTO stores (nombre, slug, telefono, ciudad, descripcion, activo)
    VALUES ($1,$2,$3,$4,$5,1) RETURNING *
  `, ['Señor de Qollority', 'qollority', '51999000000', 'Cusco',
      'Productos agroveterinarios de calidad para tu campo.']);

  await queryOne(`
    INSERT INTO admins (store_id, nombre, email, password, es_superadmin)
    VALUES ($1,$2,$3,$4,0)
  `, [store.id, 'Admin Qollority', 'admin@qollority.com',
      bcrypt.hashSync('qollority2024', 10)]);

  const productos = [
    ['Fertilizante NPK 20-20-20', 'Fertilizante completo para todo tipo de cultivos', 45, 120, 'fertilizantes'],
    ['Insecticida Cipermetrina',  'Control efectivo de plagas en cultivos',            28, 80,  'pesticidas'],
    ['Fungicida Mancozeb 80%',    'Protección contra hongos en papa y maíz',           35, 60,  'fungicidas'],
    ['Semilla Papa Canchan',      'Semilla certificada de alta productividad',          90, 200, 'semillas'],
    ['Abono Orgánico Humus',      'Mejora la estructura y fertilidad del suelo',        30, 150, 'fertilizantes'],
    ['Vitamina Bovina Complex',   'Suplemento vitamínico para ganado bovino',           55, 40,  'veterinaria'],
    ['Vacuna Newcastle Ave',      'Protección contra Newcastle en aves de corral',      12, 200, 'veterinaria'],
    ['Herbicida Glifosato 48%',   'Control de malezas de amplio espectro',              22, 90,  'herbicidas'],
  ];

  for (const [nombre, desc, precio, stock, cat] of productos) {
    await query(
      `INSERT INTO productos (store_id,nombre,descripcion,precio,stock,categoria,activo)
       VALUES ($1,$2,$3,$4,$5,$6,1)`,
      [store.id, nombre, desc, precio, stock, cat]
    );
  }

  console.log('✅ Seed completado!');
  console.log('   Email:      admin@qollority.com');
  console.log('   Contraseña: qollority2024');
  console.log('   Tienda:     /tienda/qollority');
  console.log('\n⚠️  Recuerda crear el bucket "qollority-images" en Supabase Storage → Public\n');
} catch (e) {
  console.error('❌ Error en seed:', e.message);
  process.exit(1);
}

await pool.end();
process.exit(0);
