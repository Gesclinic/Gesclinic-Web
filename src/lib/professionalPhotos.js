import { supabase } from '@/lib/customSupabaseClient.js';

const BUCKET = 'professional-photos';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function isAbsoluteUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}

export function getPathFromPublicUrl(urlOrPath) {
  if (!urlOrPath) {
    return null;
  }
  if (!isAbsoluteUrl(urlOrPath)) {
    return urlOrPath;
  }

  try {
    const u = new URL(urlOrPath);
    const p = decodeURIComponent(u.pathname);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const i = p.indexOf(marker);
    return i !== -1 ? p.slice(i + marker.length) : urlOrPath;
  } catch {
    return urlOrPath;
  }
}

export function getPublicURL(pathOrUrl) {
  if (!pathOrUrl) {
    return null;
  }
  if (isAbsoluteUrl(pathOrUrl)) {
    return pathOrUrl;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pathOrUrl);
  return data?.publicUrl ?? null;
}

function assertValidImageFile(file, filename) {
  const isFileLike = (typeof File !== 'undefined' && file instanceof File) || file instanceof Blob;
  if (!isFileLike || !file.size) {
    throw new Error('Arquivo inválido.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máx: 5MB.');
  }

  const mime = (file.type || '').toLowerCase();
  const name = filename || (typeof File !== 'undefined' && file instanceof File ? file.name : '');
  const ext = (name.split('.').pop() || '').toLowerCase();
  const allowedExt = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
  const isMimeOk = mime.startsWith('image/');
  const isExtOk = !name || allowedExt.includes(ext);

  if (!isMimeOk && !isExtOk) {
    throw new Error('Envie uma imagem (png, jpg, jpeg, webp ou svg).');
  }
}

function normalizeExtAndMime(file, explicitName) {
  const allowed = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
  const rawExt = (
    explicitName?.split('.').pop() ||
    (typeof File !== 'undefined' && file instanceof File ? file.name.split('.').pop() : '') ||
    'png'
  ).toLowerCase();
  const ext = allowed.includes(rawExt) ? rawExt : 'png';
  let contentType = file.type || `image/${ext}`;
  if (ext === 'svg' && !/svg/i.test(contentType)) {
    contentType = 'image/svg+xml';
  }
  return { ext, contentType };
}

function buildKey(clinicId, professionalId, ext) {
  return `${clinicId}/${professionalId}/photo-${Date.now()}.${ext}`;
}

export async function uploadPhoto({ clinicId, professionalId, file, filename, cacheControl }) {
  if (!clinicId || !professionalId) {
    throw new Error('clinicId e professionalId são obrigatórios');
  }
  if (!file) {
    throw new Error('Arquivo obrigatório');
  }

  assertValidImageFile(file, filename);
  const { ext, contentType } = normalizeExtAndMime(file, filename);
  const key = buildKey(clinicId, professionalId, ext);

  const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
    upsert: true,
    cacheControl: String(cacheControl ?? 3600),
    contentType,
  });
  if (error) {
    throw new Error(error.message || 'Falha no upload da foto.');
  }

  const publicUrl = getPublicURL(key);
  return { path: key, publicUrl };
}

export async function deletePhoto(pathOrUrl) {
  const path = getPathFromPublicUrl(pathOrUrl);
  if (!path) {
    return { error: null };
  }

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(error.message || 'Falha ao remover foto anterior.');
  }
  return { error: null };
}

export async function replacePhoto({
  clinicId,
  professionalId,
  newFile,
  previousPathOrUrl,
  filename,
  cacheControl,
}) {
  if (!clinicId || !professionalId) {
    throw new Error('clinicId e professionalId são obrigatórios');
  }
  if (!newFile) {
    throw new Error('Arquivo obrigatório');
  }

  if (previousPathOrUrl) {
    try {
      await deletePhoto(previousPathOrUrl);
    } catch {
      // ignoramos falha ao remover o antigo
    }
  }
  return uploadPhoto({ clinicId, professionalId, file: newFile, filename, cacheControl });
}
