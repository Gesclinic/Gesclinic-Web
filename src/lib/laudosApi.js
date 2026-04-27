import { supabase } from '@/lib/customSupabaseClient';

export async function listLaudos(clinicId) {
  if (!clinicId) return [];
  const { data, error } = await supabase
    .from('laudos')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createLaudo(clinicId, payload) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("UsuÃ¡rio nÃ£o autenticado.");

  const { data, error } = await supabase
    .from('laudos')
    .insert({ ...payload, clinic_id: clinicId, created_by: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLaudo(id, payload) {
  const { data, error } = await supabase
    .from('laudos')
    .update(payload)
    .eq('id', id)
    .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  if (error) throw error;
  return data;
}

export async function deleteLaudo(id) {
  const { error } = await supabase.from('laudos').delete().eq('id', id);
  if (error) throw error;
}
