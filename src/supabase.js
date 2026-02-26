import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
  process.exit(1);
}

// Cliente con service_role — puede subir/borrar archivos y bypasea RLS
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Nombre del bucket donde se guardan todas las imágenes
export const BUCKET = 'qollority-images';

// ── Subir imagen a Supabase Storage ──────────────────────────────────────────
// file: Buffer | Uint8Array
// path: ej. "logos/logo_1234.jpg"
// mimetype: ej. "image/jpeg"
export async function uploadImage(fileBuffer, filePath, mimetype) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimetype,
      upsert: true,           // sobreescribe si ya existe mismo path
    });

  if (error) throw new Error(`Storage upload error: ${error.message}`);

  // Devuelve la URL pública permanente
  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl, path: filePath };
}

// ── Eliminar imagen de Supabase Storage ──────────────────────────────────────
// storagePath: el path guardado en DB, ej. "logos/logo_1234.jpg"
export async function deleteImage(storagePath) {
  if (!storagePath) return;
  try {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([storagePath]);
    if (error) console.warn('No se pudo borrar imagen:', error.message);
    else console.log('🗑️  Imagen eliminada:', storagePath);
  } catch (e) {
    console.warn('Error borrando imagen:', e.message);
  }
}
