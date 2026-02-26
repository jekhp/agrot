import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/database.js';
import { authMiddleware, superAdminOnly } from '../middleware/auth.js';

const router = Router();

// ── Login admin ───────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });
  try {
    const admin = await queryOne('SELECT * FROM admins WHERE email = $1', [email]);
    if (!admin || !bcrypt.compareSync(password, admin.password))
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    const store = admin.store_id
      ? await queryOne('SELECT * FROM stores WHERE id = $1', [admin.store_id])
      : null;
    const payload = {
      id: admin.id, email: admin.email, nombre: admin.nombre,
      store_id: admin.store_id, es_superadmin: admin.es_superadmin === 1,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, admin: payload, store });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Login JEKH ────────────────────────────────────────────────────────────────
router.post('/jekh-login', (req, res) => {
  if (req.body.password !== (process.env.JEKH_SECRET || 'jekh2024'))
    return res.status(401).json({ error: 'Clave incorrecta' });
  const payload = { id: 0, email: 'jekh@sistema', nombre: 'JEKH', store_id: null, es_superadmin: true };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// ── /me ───────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const store = req.admin.store_id
    ? await queryOne('SELECT * FROM stores WHERE id = $1', [req.admin.store_id])
    : null;
  res.json({ admin: req.admin, store });
});

// ── Actualizar mi perfil ──────────────────────────────────────────────────────
router.put('/me', authMiddleware, async (req, res) => {
  if (!req.admin.id) return res.status(403).json({ error: 'No permitido para JEKH' });
  const { nombre, email, password_actual, password_nueva } = req.body;
  const admin = await queryOne('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
  if (!admin) return res.status(404).json({ error: 'Admin no encontrado' });

  const sets = []; const vals = [];
  if (nombre) { sets.push(`nombre = $${sets.length + 1}`); vals.push(nombre); }
  if (email)  { sets.push(`email  = $${sets.length + 1}`); vals.push(email);  }

  if (password_nueva) {
    if (!password_actual) return res.status(400).json({ error: 'Ingresa tu contraseña actual' });
    if (!bcrypt.compareSync(password_actual, admin.password))
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    if (password_nueva.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
    sets.push(`password = $${sets.length + 1}`);
    vals.push(bcrypt.hashSync(password_nueva, 10));
  }

  if (!sets.length) return res.status(400).json({ error: 'Sin cambios' });
  vals.push(req.admin.id);
  try {
    await queryOne(`UPDATE admins SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id`, vals);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email ya en uso' });
    res.status(500).json({ error: e.message });
  }
});

// ── Crear admin (solo JEKH) ───────────────────────────────────────────────────
router.post('/admins', authMiddleware, superAdminOnly, async (req, res) => {
  const { nombre, email, password, store_id } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos' });
  try {
    await queryOne(
      'INSERT INTO admins (nombre,email,password,store_id,es_superadmin) VALUES ($1,$2,$3,$4,0) RETURNING id',
      [nombre, email, bcrypt.hashSync(password, 10), store_id || null]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: e.message });
  }
});

export default router;
