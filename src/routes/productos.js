import { Router } from 'express';
import { uploadSingle, extFromMime } from '../middleware/upload.js';
import { uploadImage, deleteImage } from '../supabase.js';
import { queryOne, queryAll } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const upload = (req, res, next) => uploadSingle('imagen')(req, res, next);

router.get('/', authMiddleware, async (req, res) => {
  const rows = await queryAll(
    'SELECT * FROM productos WHERE store_id=$1 AND activo=1 ORDER BY categoria, nombre',
    [req.admin.store_id]
  );
  res.json(rows);
});

router.post('/', authMiddleware, upload, async (req, res) => {
  const { nombre, descripcion, precio, stock, categoria } = req.body;
  if (!nombre || !precio) {
    if (req.file) await deleteImage(`productos/prod_${Date.now()}.jpg`);
    return res.status(400).json({ error: 'Faltan campos' });
  }

  let imagen_url = null, imagen_path = null;
  if (req.file) {
    imagen_path = `productos/prod_${Date.now()}${extFromMime(req.file.mimetype)}`;
    const r = await uploadImage(req.file.buffer, imagen_path, req.file.mimetype);
    imagen_url = r.url;
  }

  try {
    const p = await queryOne(
      `INSERT INTO productos (store_id,nombre,descripcion,precio,stock,imagen_url,imagen_path,categoria,activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1) RETURNING *`,
      [req.admin.store_id, nombre, descripcion||'',
       parseFloat(precio), parseInt(stock)||0,
       imagen_url, imagen_path, categoria||'general']
    );
    res.status(201).json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authMiddleware, upload, async (req, res) => {
  const p = await queryOne('SELECT * FROM productos WHERE id=$1', [req.params.id]);
  if (!p)                               return res.status(404).json({ error: 'No encontrado' });
  if (p.store_id !== req.admin.store_id) return res.status(403).json({ error: 'Sin permisos' });

  let imagen_url = p.imagen_url, imagen_path = p.imagen_path;
  if (req.file) {
    await deleteImage(p.imagen_path);
    imagen_path = `productos/prod_${Date.now()}${extFromMime(req.file.mimetype)}`;
    const r = await uploadImage(req.file.buffer, imagen_path, req.file.mimetype);
    imagen_url = r.url;
  }

  const { nombre, descripcion, precio, stock, categoria } = req.body;
  await queryOne(
    `UPDATE productos SET nombre=$1,descripcion=$2,precio=$3,stock=$4,
     imagen_url=$5,imagen_path=$6,categoria=$7 WHERE id=$8 RETURNING id`,
    [nombre, descripcion||'', parseFloat(precio), parseInt(stock)||0,
     imagen_url, imagen_path, categoria||'general', req.params.id]
  );
  res.json({ ok: true });
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const p = await queryOne('SELECT * FROM productos WHERE id=$1', [req.params.id]);
  if (!p || p.store_id !== req.admin.store_id) return res.status(403).json({ error: 'Sin permisos' });
  await queryOne('UPDATE productos SET activo=0 WHERE id=$1 RETURNING id', [req.params.id]);
  res.json({ ok: true });
});

export default router;
