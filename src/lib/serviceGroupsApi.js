import { supabase } from '@/lib/customSupabaseClient.js';

/**
 * Tenta buscar com um conjunto de colunas e, se der 42703 (coluna inexistente),
 * refaz a consulta com um subconjunto seguro.
 */
async function safeSelectServiceGroups(clinicId) {
  // 1ª tentativa: com todas as colunas “desejáveis”
  let q = supabase
    .from('service_groups')
    .select('id, name, status, created_at')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true });

  let { data, error } = await q;

  // Se a coluna não existir, refaz com um subconjunto mínimo
  if (error && String(error.code) === '42703') {
    const retry = await supabase
      .from('service_groups')
      .select('id, name') // mínimo seguro
      .eq('clinic_id', clinicId)
      .order('name', { ascending: true });

    data = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listServiceGroups(clinicId) {
  if (!clinicId) throw new Error('clinicId é obrigatório.');
  return safeSelectServiceGroups(clinicId);
}

export async function createServiceGroup(clinicId, name) {
  if (!clinicId) throw new Error('clinicId é obrigatório.');
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Informe um nome.');

  const { data, error } = await supabase
    .from('service_groups')
    .insert({ clinic_id: clinicId, name: clean })
    .select('id, name, status')
    .single();

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique')) {
      throw new Error('Já existe um grupo com esse nome nesta clínica.');
    }
    if (String(error.code) === '42501') {
      throw new Error('Permissão negada para criar grupos (RLS/Policies).');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function updateServiceGroup(id, patch) {
  if (!id) throw new Error('id é obrigatório.');
  // sanitize patch: só permitir campos esperados
  const safePatch = {};
  if (typeof patch?.name === 'string') safePatch.name = patch.name.trim();
  if (patch?.status != null) safePatch.status = patch.status;

  const { data, error } = await supabase
    .from('service_groups')
    .update(safePatch)
    .eq('id', id)
    .select('id, name, status')
    .single();

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique')) {
      throw new Error('Já existe um grupo com esse nome nesta clínica.');
    }
    if (String(error.code) === '42501') {
      throw new Error('Permissão negada para atualizar grupos (RLS/Policies).');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function deleteServiceGroup(id) {
  if (!id) throw new Error('id é obrigatório.');
  const { error } = await supabase
    .from('service_groups')
    .delete()
    .eq('id', id);

  if (error) {
    if (String(error.code) === '42501') {
      throw new Error('Permissão negada para excluir grupos (RLS/Policies).');
    }
    if ((error.message || '').toLowerCase().includes('foreign key')) {
      throw new Error('Não é possível excluir: há serviços vinculados a este grupo.');
    }
    throw new Error(error.message);
  }

  return true;
}