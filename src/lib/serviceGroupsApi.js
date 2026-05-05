import { supabase } from '@/lib/customSupabaseClient.js';

/**
 * Tenta buscar com um conjunto de colunas e, se der 42703 (coluna inexistente),
 * refaz a consulta com um subconjunto seguro.
 */
async function safeSelectServiceGroups(clinicId) {
  // 1Âª tentativa: com todas as colunas â€œdesejÃ¡veisâ€
  const q = supabase
    .from('service_groups')
    .select('id, name, status, created_at')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true });

  let { data, error } = await q;

  // Se a coluna nÃ£o existir, refaz com um subconjunto mÃ­nimo
  if (error && String(error.code) === '42703') {
    const retry = await supabase
      .from('service_groups')
      .select('id, name') // mÃ­nimo seguro
      .eq('clinic_id', clinicId)
      .order('name', { ascending: true });

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listServiceGroups(clinicId) {
  if (!clinicId) {
    throw new Error('clinicId Ã© obrigatÃ³rio.');
  }
  return safeSelectServiceGroups(clinicId);
}

export async function createServiceGroup(clinicId, name) {
  if (!clinicId) {
    throw new Error('clinicId Ã© obrigatÃ³rio.');
  }
  const clean = String(name || '').trim();
  if (!clean) {
    throw new Error('Informe um nome.');
  }

  const { data, error } = await supabase
    .from('service_groups')
    .insert({ clinic_id: clinicId, name: clean })
    .select('id, name, status')
    .single();

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique')) {
      throw new Error('JÃ¡ existe um grupo com esse nome nesta clÃ­nica.');
    }
    if (String(error.code) === '42501') {
      throw new Error('PermissÃ£o negada para criar grupos (RLS/Policies).');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function updateServiceGroup(id, patch) {
  if (!id) {
    throw new Error('id Ã© obrigatÃ³rio.');
  }
  // sanitize patch: sÃ³ permitir campos esperados
  const safePatch = {};
  if (typeof patch?.name === 'string') {
    safePatch.name = patch.name.trim();
  }
  if (patch?.status != null) {
    safePatch.status = patch.status;
  }

  const { data, error } = await supabase
    .from('service_groups')
    .update(safePatch)
    .eq('id', id)
    .select('id, name, status');

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique')) {
      throw new Error('JÃ¡ existe um grupo com esse nome nesta clÃ­nica.');
    }
    if (String(error.code) === '42501') {
      throw new Error('PermissÃ£o negada para atualizar grupos (RLS/Policies).');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function deleteServiceGroup(id) {
  if (!id) {
    throw new Error('id Ã© obrigatÃ³rio.');
  }
  const { error } = await supabase.from('service_groups').delete().eq('id', id);

  if (error) {
    if (String(error.code) === '42501') {
      throw new Error('PermissÃ£o negada para excluir grupos (RLS/Policies).');
    }
    if ((error.message || '').toLowerCase().includes('foreign key')) {
      throw new Error('NÃ£o Ã© possÃ­vel excluir: hÃ¡ serviÃ§os vinculados a este grupo.');
    }
    throw new Error(error.message);
  }

  return true;
}
