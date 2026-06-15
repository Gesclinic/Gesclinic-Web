import { supabase } from '@/lib/customSupabaseClient.js';
import { stockSuppliersApi } from '@/lib/stockApi.js';

const normalizeDocument = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
};

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value || {}).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ''),
  );

function normalizePayer(row) {
  return row ? { ...row, tax_id: row.cnpj || '' } : null;
}

export async function listPayers(clinicId) {
  console.log('💰 [listPayers] Iniciando com clinicId:', clinicId);

  if (!clinicId) {
    console.log('💰 [listPayers] Sem clinicId, retornando vazio');
    return [];
  }

  const { data, error } = await supabase
    .from('payers')
    .select('id, name, cnpj, active')
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
  return (data || []).map(normalizePayer);
}

export async function findPayerByDocument(clinicId, document) {
  const cnpj = normalizeDocument(document);
  if (!clinicId || !cnpj) {
    return null;
  }

  const { data, error } = await supabase
    .from('payers')
    .select('id, name, cnpj, active')
    .eq('clinic_id', clinicId)
    .or(`cnpj.eq.${cnpj},cnpj.eq.${document}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return normalizePayer(data);
}

export async function findPayerByName(clinicId, name) {
  const normalizedTarget = normalizeName(name);
  if (!clinicId || !normalizedTarget) {
    return null;
  }

  const { data, error } = await supabase
    .from('payers')
    .select('id, name, cnpj, active')
    .eq('clinic_id', clinicId)
    .limit(200);

  if (error) {
    throw error;
  }
  return normalizePayer((data || []).find((payer) => normalizeName(payer.name) === normalizedTarget));
}

export async function ensurePayerFromDocument(clinicId, payload = {}) {
  const document = normalizeDocument(payload.cnpj || payload.tax_id || payload.document || payload.payer_document);
  if (!clinicId || (!document && !payload.name)) {
    return null;
  }

  const existingByDocument = document ? await findPayerByDocument(clinicId, document) : null;
  if (existingByDocument) {
    return existingByDocument;
  }

  const publicRegistration = document?.length === 14
    ? await stockSuppliersApi.lookupPublicRegistration(document).catch(() => null)
    : null;
  const name = payload.name || payload.payer_name || publicRegistration?.name;
  if (!name) {
    return null;
  }

  const existingByName = await findPayerByName(clinicId, name);
  if (existingByName) {
    if (document && !existingByName.cnpj) {
      const { data, error } = await supabase
        .from('payers')
        .update({ cnpj: document })
        .eq('id', existingByName.id)
        .select('id, name, cnpj, active')
        .single();
      if (error) throw error;
      return normalizePayer(data);
    }
    return existingByName;
  }

  return createPayer(clinicId, compactObject({
    name,
    cnpj: document || publicRegistration?.cnpj,
    contact_person: payload.contact_person || publicRegistration?.contact_person,
    contact_email: payload.contact_email || publicRegistration?.contact_email,
    contact_phone: payload.contact_phone || publicRegistration?.contact_phone,
  }));
}

export async function createPayer(clinicId, payload) {
  if (!clinicId || !payload?.name) {
    throw new Error('Nome do convênio é obrigatório.');
  }
  const cnpj = normalizeDocument(payload.cnpj || payload.tax_id || payload.document);
  const existing = cnpj ? await findPayerByDocument(clinicId, cnpj) : await findPayerByName(clinicId, payload.name);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('payers')
    .insert({
      clinic_id: clinicId,
      name: payload.name,
      cnpj,
      contact_person: payload.contact_person || null,
      contact_email: payload.contact_email || null,
      contact_phone: payload.contact_phone || null,
      ans_code: payload.ans_code || null,
      is_default: payload.is_default || false,
    })
    .select()
    .single();
  if (error) {
    throw error;
  }
  return normalizePayer(data);
}

export async function updatePayer(id, payload) {
  if (!id || !payload?.name) {
    throw new Error('Nome do convênio é obrigatório.');
  }
  const hasDocumentField = ['cnpj', 'tax_id', 'document'].some((field) => Object.prototype.hasOwnProperty.call(payload, field));
  const cnpj = normalizeDocument(payload.cnpj || payload.tax_id || payload.document);
  if (cnpj) {
    const { data: current, error: currentError } = await supabase
      .from('payers')
      .select('id, clinic_id')
      .eq('id', id)
      .single();
    if (currentError) throw currentError;
    const existing = await findPayerByDocument(current.clinic_id, cnpj);
    if (existing && existing.id !== id) {
      throw new Error('Já existe pagador cadastrado com este CNPJ/CPF.');
    }
  }
  const updates = {
    name: payload.name,
    ans_code: payload.ans_code || null,
    is_default: payload.is_default || false,
  };
  if (hasDocumentField) {
    updates.cnpj = cnpj;
  }

  const { data, error } = await supabase
    .from('payers')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return normalizePayer(data[0]);
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
