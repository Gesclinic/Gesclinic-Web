import { supabase } from '@/lib/customSupabaseClient.js';

const isStackDepthErr = (err) =>
  err?.code === '54001' || err?.message?.toLowerCase?.().includes('stack depth');

/** Lista membros via RPC (sem tocar na tabela) */
export async function listClinicMembers(clinicId, { enrichWithEmail = false } = {}) {
  if (!clinicId) {
    console.warn('[listClinicMembers] clinicId ausente — retornando []');
    return [];
  }

  let rows = [];
  try {
    const { data, error } = await supabase.rpc('list_clinic_members', {
      p_clinic_id: clinicId,
    });
    if (error) {
      throw error;
    }
    rows = Array.isArray(data) ? data : [];
  } catch (err) {
    if (isStackDepthErr(err)) {
      err.message =
        'Falha ao listar membros por recursão de RLS (stack depth). ' +
        'Garanta que TODAS as leituras usem a RPC list_clinic_members.';
    }
    throw err;
  }

  if (!enrichWithEmail || rows.length === 0) {
    return rows;
  }

  const results = await Promise.allSettled(
    rows.map((r) => supabase.rpc('get_user_email', { p_user_id: r.user_id })),
  );

  return rows.map((r, i) => {
    const res = results[i];
    if (res.status === 'fulfilled') {
      return { ...r, email: res.value?.data ?? null };
    }
    console.warn('[listClinicMembers] email RPC error:', res.reason);
    return { ...r, email: null };
  });
}

/** Vínculo/atualização por e-mail via RPC */
export async function upsertMemberByEmail({ email, clinicId, role }) {
  if (!clinicId) {
    throw new Error('clinicId é obrigatório');
  }
  const safeEmail = typeof email === 'string' ? email.trim().toLowerCase() : null;
  if (!safeEmail) {
    throw new Error('email é obrigatório');
  }

  const { data, error } = await supabase.rpc('upsert_user_clinic_by_email', {
    p_email: safeEmail,
    p_clinic_id: clinicId,
    p_role: role,
  });
  if (error) {
    throw new Error(error.message ?? 'Falha ao vincular usuário');
  }
  return data;
}

/** Atualiza papel do membro via RPC */
export async function updateMemberRole({ userId, clinicId, role }) {
  if (!userId) {
    throw new Error('userId é obrigatório');
  }
  if (!clinicId) {
    throw new Error('clinicId é obrigatório');
  }

  const { data, error } = await supabase.rpc('admin_update_member_role', {
    p_user_id: userId,
    p_clinic_id: clinicId,
    p_role: role,
  });

  if (error) {
    throw new Error(error.message ?? 'Falha ao atualizar papel');
  }
  return data;
}

/** Remove vínculo via RPC */
export async function removeMember({ userId, clinicId }) {
  if (!userId) {
    throw new Error('userId é obrigatório');
  }
  if (!clinicId) {
    throw new Error('clinicId é obrigatório');
  }

  const { error } = await supabase.rpc('admin_remove_member', {
    p_user_id: userId,
    p_clinic_id: clinicId,
  });

  if (error) {
    throw new Error(error.message ?? 'Falha ao remover vínculo');
  }
  return true;
}
