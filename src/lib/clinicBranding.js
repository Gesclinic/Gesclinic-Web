import { supabase } from '@/lib/customSupabaseClient.js';

const BUCKET = 'clinic-logos';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/* ---------------- utils ---------------- */

/** Verifica se é uma URL http/https absoluta */
function isAbsoluteUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}

/** Adiciona um parâmetro de cache-busting */
export function withCacheBust(url) {
  if (!url) {
    return url;
  }
  try {
    const u = new URL(url);
    u.searchParams.set('_', String(Date.now()));
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Extrai o path interno do bucket a partir de uma URL pública/assinada ou retorna o próprio path.
 * Suporta formatos:
 *  - /storage/v1/object/public/clinic-logos/<path>
 *  - /storage/v1/object/sign/clinic-logos/<path>?token=...
 *  - /storage/v1/object/clinic-logos/<path> (alguns proxies/CDNs)
 */
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

    const candidates = [
      `/storage/v1/object/public/${BUCKET}/`,
      `/storage/v1/object/sign/${BUCKET}/`,
      `/storage/v1/object/${BUCKET}/`,
    ];

    for (const marker of candidates) {
      const i = p.indexOf(marker);
      if (i !== -1) {
        return p.slice(i + marker.length);
      }
    }

    // não parece ser do nosso bucket — devolve a própria URL
    return urlOrPath;
  } catch {
    return urlOrPath;
  }
}

/** Resolve URL pública a partir de um path (se já for URL, retorna como está). */
export function getClinicLogoPublicURL(logoPathOrUrl) {
  if (!logoPathOrUrl) {
    return null;
  }
  if (isAbsoluteUrl(logoPathOrUrl)) {
    return logoPathOrUrl;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(logoPathOrUrl);
  return data?.publicUrl ?? null;
}

/** Valida arquivo/Blob de imagem. Lança erro amigável. */
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

/** Normaliza extensão e content-type baseado no arquivo/nome. */
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

/** Constrói uma chave de arquivo única (ajuda a bustar cache/CDN) */
function buildLogoKey(clinicId, ext) {
  return `${clinicId}/logo-${Date.now()}.${ext}`;
}

/* ---------------- operações ---------------- */

/** Upload do logo para o bucket clinic-logos. Retorna { path, publicUrl } */
export async function uploadClinicLogo(clinicId, file, opts = {}) {
  if (!clinicId) {
    throw new Error('clinicId é obrigatório');
  }
  if (!file) {
    throw new Error('Arquivo obrigatório');
  }

  const filename = opts.filename; // necessário se vier Blob sem nome
  assertValidImageFile(file, filename);

  const { ext, contentType } = normalizeExtAndMime(file, filename);
  const key = buildLogoKey(clinicId, ext);

  const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
    upsert: true,
    cacheControl: String(opts.cacheControl ?? 3600),
    contentType,
  });
  if (error) {
    throw new Error(error.message || 'Falha no upload do logo.');
  }

  const publicUrl = getClinicLogoPublicURL(key);
  return { path: key, publicUrl };
}

/** Remove um arquivo anterior do bucket (se pertencer ao bucket). */
export async function deleteClinicLogo(pathOrUrl) {
  const path = getPathFromPublicUrl(pathOrUrl);
  if (!path) {
    return { error: null };
  }

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(error.message || 'Falha ao remover logo anterior.');
  }
  return { error: null };
}

/**
 * Substitui o logo: remove o anterior (se informado) e faz upload do novo.
 * Retorna { path, publicUrl } do novo arquivo.
 */
export async function replaceClinicLogo({
  clinicId,
  newFile,
  previousPathOrUrl,
  filename,
  cacheControl,
}) {
  if (!clinicId) {
    throw new Error('clinicId é obrigatório');
  }
  if (!newFile) {
    throw new Error('Arquivo obrigatório');
  }

  if (previousPathOrUrl) {
    try {
      await deleteClinicLogo(previousPathOrUrl);
    } catch {
      // ignoramos falha ao remover o antigo
    }
  }
  return uploadClinicLogo(clinicId, newFile, { filename, cacheControl });
}
