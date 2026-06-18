import { supabase } from '@/lib/customSupabaseClient.js';

const BUCKET = 'logos';

function getStoragePath(clinicId, filename) {
  const ext = filename?.split('.').pop()?.toLowerCase() ?? 'png';
  return `${clinicId}/${Date.now()}.${ext}`;
}

export async function replaceClinicLogo({ clinicId, newFile, previousPathOrUrl }) {
  if (!newFile || !clinicId) {
    throw new Error('clinicId e newFile são obrigatórios.');
  }

  const prevPath = previousPathOrUrl?.includes(BUCKET)
    ? previousPathOrUrl.split(`${BUCKET}/`)[1]
    : null;

  if (prevPath) {
    const { error: delError } = await supabase.storage.from(BUCKET).remove([prevPath]);
    if (delError) {
      console.warn('Falha ao remover logo antigo:', delError.message);
    }
  }

  const newPath = getStoragePath(clinicId, newFile.name);
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, newFile);
  if (uploadError) {
    throw new Error(uploadError.message ?? 'Falha no upload do logo.');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
  return { path: newPath, publicUrl: data.publicUrl };
}

export function getClinicLogoPublicURL(pathOrUrl) {
  if (!pathOrUrl) {
    return null;
  }
  if (pathOrUrl.startsWith('http')) {
    return pathOrUrl;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pathOrUrl);
  return data?.publicUrl ?? null;
}

export function withCacheBust(url) {
  if (!url) {
    return null;
  }
  try {
    const u = new URL(url);
    u.searchParams.set('t', Date.now());
    return u.toString();
  } catch {
    return url;
  }
}
