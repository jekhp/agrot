import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.admin = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const superAdminOnly = (req, res, next) => {
  if (!req.admin?.es_superadmin) return res.status(403).json({ error: 'Sin permisos de superadmin' });
  next();
};
