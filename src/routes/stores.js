import { Router } from 'express';
import { uploadStoreFields, uploadSingle, extFromMime } from '../middleware/upload.js';
import { uploadImage, deleteImage } from '../supabase.js';
import { queryOne, queryAll } from '../db/database.js';
import { authMiddleware, superAdminOnly } from '../middleware/auth.js';

const router = Router();

// ── GET público por slug ──────────────────────────────────────────────────────
router.get('/:slug', async (req, res) => {
  if (/^\d+$/.test(req.params.slug)) return res.status(404).json({ error: 'No encontrado' });
  try {
    const store = await queryOne(
      'SELECT * FROM stores WHERE slug = $1 AND activo = 1', [req.params.slug]
    );
    if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });
    const productos = await queryAll(
      'SELECT * FROM productos WHERE store_id = $1 AND activo = 1 ORDER BY categoria, nombre',
      [store.id]
    );
    res.json({ store, productos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET todas las tiendas (JEKH) ──────────────────────────────────────────────
router.get('/', authMiddleware, superAdminOnly, async (req, res) => {
  const stores = await queryAll('SELECT * FROM stores ORDER BY created_at DESC');
  res.json(stores);
});

// ── POST crear tienda (JEKH) ──────────────────────────────────────────────────
router.post('/', authMiddleware, superAdminOnly, (req, res, next) => {
  uploadSingle('logo_imagen')(req, res, next);
}, async (req, res) => {
  const { nombre, slug, telefono, ciudad, descripcion } = req.body;
  if (!nombre || !slug || !telefono || !ciudad)
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  if (!/^[a-z0-9-]+$/.test(slug))
    return res.status(400).json({ error: 'Slug inválido — solo minúsculas, números y guiones' });

  let logo_url = null, logo_path = null;
  if (req.file) {
    const ext  = extFromMime(req.file.mimetype);
    logo_path  = `logos/logo_${Date.now()}${ext}`;
    const result = await uploadImage(req.file.buffer, logo_path, req.file.mimetype);
    logo_url = result.url;
  }

  try {
    const store = await queryOne(
      `INSERT INTO stores (nombre,slug,telefono,ciudad,descripcion,logo_url,logo_path,activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,1) RETURNING *`,
      [nombre, slug, telefono, ciudad, descripcion || '', logo_url, logo_path]
    );
    res.status(201).json(store);
  } catch (e) {
    if (logo_path) await deleteImage(logo_path);
    if (e.code === '23505') return res.status(409).json({ error: 'Ese slug ya está en uso' });
    res.status(500).json({ error: e.message });
  }
});

// ── PUT actualizar tienda ─────────────────────────────────────────────────────
router.put('/:id', authMiddleware, (req, res, next) => {
  uploadStoreFields(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  const storeId = parseInt(req.params.id);
  if (req.admin.store_id !== storeId && !req.admin.es_superadmin)
    return res.status(403).json({ error: 'Sin permisos' });

  const store = await queryOne('SELECT * FROM stores WHERE id = $1', [storeId]);
  if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

  const { nombre, telefono, ciudad, descripcion, activo } = req.body;

  // Logo
  let logo_url = store.logo_url, logo_path = store.logo_path;
  if (req.files?.logo_imagen?.[0]) {
    await deleteImage(store.logo_path);
    const f   = req.files.logo_imagen[0];
    logo_path = `logos/logo_${Date.now()}${extFromMime(f.mimetype)}`;
    const r   = await uploadImage(f.buffer, logo_path, f.mimetype);
    logo_url  = r.url;
  }

  // QR Yape
  let qr_url = store.qr_url, qr_path = store.qr_path;
  if (req.files?.qr_yape?.[0]) {
    await deleteImage(store.qr_path);
    const f  = req.files.qr_yape[0];
    qr_path  = `qr/qr_${Date.now()}${extFromMime(f.mimetype)}`;
    const r  = await uploadImage(f.buffer, qr_path, f.mimetype);
    qr_url   = r.url;
  }

  const activoVal = activo !== undefined
    ? (['1', 1, true, 'true'].includes(activo) ? 1 : 0)
    : store.activo;

  const updated = await queryOne(
    `UPDATE stores SET
       nombre=$1, telefono=$2, ciudad=$3, descripcion=$4,
       logo_url=$5, logo_path=$6, qr_url=$7, qr_path=$8, activo=$9
     WHERE id=$10 RETURNING *`,
    [nombre || store.nombre, telefono || store.telefono,
     ciudad || store.ciudad, descripcion ?? store.descripcion,
     logo_url, logo_path, qr_url, qr_path, activoVal, storeId]
  );
  res.json({ ok: true, store: updated });
});

export default router;
