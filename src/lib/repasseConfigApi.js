// API de configuração de regras de repasse - src/lib/repasseConfigApi.js
import { supabase } from './customSupabaseClient';

export async function listarRegrasRepasse({ clinicId, profissionalId }) {
  let query = supabase.from('repasse_config').select('*').eq('clinic_id', clinicId);
  if (profissionalId) {
    query = query.eq('professional_id', profissionalId);
  }
  const { data, error } = await query.order('prioridade', { ascending: true });
  if (error) {
    throw error;
  }
  return data;
}

export async function criarOuAtualizarRegra(regra) {
  const { data, error } = await supabase
    .from('repasse_config')
    .upsert([regra], { onConflict: ['id'] });
  if (error) {
    throw error;
  }
  return data;
}

export async function deletarRegra(regraId) {
  const { error } = await supabase.from('repasse_config').delete().eq('id', regraId);
  if (error) {
    throw error;
  }
  return true;
}
