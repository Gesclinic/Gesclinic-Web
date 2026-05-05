import { supabase } from '@/lib/customSupabaseClient.js';

export async function listPayers(clinicId) {
  console.log('💰 [listPayers] Iniciando com clinicId:', clinicId);

  if (!clinicId) {
    console.log('💰 [listPayers] Sem clinicId, retornando vazio');
    return [];
  }

  const { data, error } = await supabase
    .from('payers')
    .select('id, name, active')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('name');

  console.log('💰 [listPayers] Resultado:', {
    count: data?.length || 0,
    error: error?.message || 'nenhum',
  });

  if (error) {
    console.error('Erro ao buscar convênios:', error);
  }
  return data || [];
}

export async function createPayer(clinicId, payload) {
  if (!clinicId || !payload?.name) {
    throw new Error('Nome do convênio é obrigatório.');
  }
  const { data, error } = await supabase
    .from('payers')
    .insert({
      clinic_id: clinicId,
      name: payload.name,
      ans_code: payload.ans_code || null,
      is_default: payload.is_default || false,
    })
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function updatePayer(id, payload) {
  if (!id || !payload?.name) {
    throw new Error('Nome do convênio é obrigatório.');
  }
  const { data, error } = await supabase
    .from('payers')
    .update({
      name: payload.name,
      ans_code: payload.ans_code || null,
      is_default: payload.is_default || false,
    })
    .eq('id', id)
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw error;
  }
  return data;
}

export async function deletePayer(id) {
  if (!id) {
    return;
  }
  const { error } = await supabase.from('payers').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function listPlans(payerId, clinicId) {
  console.log('📋 [listPlans] Iniciando com payerId:', payerId, 'clinicId:', clinicId);

  if (!payerId) {
    console.log('📋 [listPlans] Sem payerId, retornando vazio');
    return [];
  }

  try {
    // Buscar por payer_id apenas - os planos têm clinic_id = NULL
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, code')
      .eq('payer_id', payerId)
      .order('name');

    console.log('📋 [listPlans] Resultado:', {
      count: data?.length || 0,
      data,
      error: error?.message || 'nenhum',
    });

    if (error) {
      console.error('Erro ao buscar planos:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('❌ [listPlans] Erro:', err.message);
    throw err;
  }
}

export async function createPlan(clinicId, payerId, payload) {
  if (!payerId || !payload?.name) {
    throw new Error('Nome do plano é obrigatório.');
  }
  const { data, error } = await supabase
    .from('plans')
    .insert({
      clinic_id: clinicId,
      payer_id: payerId,
      name: payload.name,
      code: payload.code || null,
    })
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw error;
  }
  return data;
}

export async function updatePlan(id, payload) {
  if (!id || !payload?.name) {
    throw new Error('Nome do plano é obrigatório.');
  }
  const { data, error } = await supabase
    .from('plans')
    .update({
      name: payload.name,
      code: payload.code || null,
    })
    .eq('id', id)
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw error;
  }
  return data;
}

export async function deletePlan(id) {
  if (!id) {
    return;
  }
  const { error } = await supabase.from('plans').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
