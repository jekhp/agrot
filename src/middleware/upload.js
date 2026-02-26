import multer from 'multer';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Guardamos en memoria (Buffer) para subir a Supabase Storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
};

// Upload único — para productos e imágenes individuales
export const uploadSingle = (fieldName) =>
  multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } }).single(fieldName);

// Upload múltiple por campos — para logo + QR de la tienda en una sola request
export const uploadStoreFields = multer({
  storage, fileFilter, limits: { fileSize: MAX_SIZE },
}).fields([
  { name: 'logo_imagen', maxCount: 1 },
  { name: 'qr_yape',    maxCount: 1 },
]);

// Extensión según mimetype
export function extFromMime(mimetype) {
  return { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[mimetype] ?? '.jpg';
}
