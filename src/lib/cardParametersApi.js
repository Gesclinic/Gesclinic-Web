import { supabase } from './customSupabaseClient';

export const DEFAULT_CARD_BRANDS = [
  { code: 'VISA', name: 'Visa', is_active: true },
  { code: 'MASTERCARD', name: 'Mastercard', is_active: true },
  { code: 'ELO', name: 'Elo', is_active: true },
  { code: 'AMEX', name: 'American Express', is_active: true },
  { code: 'HIPERCARD', name: 'Hipercard', is_active: true },
];

export const DEFAULT_CARD_SETTLEMENT_TYPES = [
  { code: 'D+0', name: 'D+0 (Imediato)', days_offset: 0, is_active: true },
  { code: 'D+1', name: 'D+1 (Proximo dia)', days_offset: 1, is_active: true },
  { code: 'D+30', name: 'D+30 (30 dias)', days_offset: 30, is_active: true },
  { code: 'Payment Day', name: 'Payment Day (Dia configurado)', days_offset: null, is_active: true },
];

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeBrandPayload(payload = {}) {
  const name = String(payload.name || payload.label || payload.code || '').trim();
  return {
    code: normalizeCode(payload.code || name),
    name,
    is_active: payload.is_active !== false,
  };
}

function normalizeSettlementPayload(payload = {}) {
  const code = String(payload.code || '').trim();
  const name = String(payload.name || payload.label || code).trim();
  return {
    code,
    name,
    days_offset: payload.days_offset === '' || payload.days_offset === undefined ? null : payload.days_offset,
    is_active: payload.is_active !== false,
  };
}

async function tableExistsError(error) {
  return ['42P01', 'PGRST116', 'PGRST205'].includes(error?.code) || String(error?.message || '').toLowerCase().includes('does not exist');
}

async function seedDefaultCardBrands(clinicId) {
  const rows = DEFAULT_CARD_BRANDS.map((brand) => ({ clinic_id: clinicId, ...brand }));
  const { data, error } = await supabase
    .from('card_brands')
    .upsert(rows, { onConflict: 'clinic_id,code' })
    .select('id,clinic_id,code,name,is_active,created_at')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || DEFAULT_CARD_BRANDS;
}

async function seedDefaultCardSettlementTypes(clinicId) {
  const rows = DEFAULT_CARD_SETTLEMENT_TYPES.map((type) => ({ clinic_id: clinicId, ...type }));
  const { data, error } = await supabase
    .from('card_settlement_types')
    .upsert(rows, { onConflict: 'clinic_id,code' })
    .select('id,clinic_id,code,name,days_offset,is_active,created_at')
    .eq('is_active', true)
    .order('days_offset', { ascending: true, nullsFirst: false })
    .order('name');

  if (error) throw error;
  return data || DEFAULT_CARD_SETTLEMENT_TYPES;
}

export async function listCardBrands(clinicId) {
  if (!clinicId) return DEFAULT_CARD_BRANDS;

  const { data, error } = await supabase
    .from('card_brands')
    .select('id,clinic_id,code,name,is_active,created_at')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    if (await tableExistsError(error)) return DEFAULT_CARD_BRANDS;
    throw error;
  }

  return data?.length ? data : seedDefaultCardBrands(clinicId);
}

export async function createCardBrand(clinicId, payload) {
  const normalized = normalizeBrandPayload(payload);
  if (!clinicId) throw new Error('Clinica nao informada');
  if (!normalized.name) throw new Error('Informe o nome da bandeira');

  const { data, error } = await supabase
    .from('card_brands')
    .insert({ clinic_id: clinicId, ...normalized })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCardBrand(id, payload) {
  const normalized = normalizeBrandPayload(payload);
  const { data, error } = await supabase
    .from('card_brands')
    .update({ ...normalized, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCardBrand(id) {
  const { error } = await supabase
    .from('card_brands')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function listCardSettlementTypes(clinicId) {
  if (!clinicId) return DEFAULT_CARD_SETTLEMENT_TYPES;

  const { data, error } = await supabase
    .from('card_settlement_types')
    .select('id,clinic_id,code,name,days_offset,is_active,created_at')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('days_offset', { ascending: true, nullsFirst: false })
    .order('name');

  if (error) {
    if (await tableExistsError(error)) return DEFAULT_CARD_SETTLEMENT_TYPES;
    throw error;
  }

  return data?.length ? data : seedDefaultCardSettlementTypes(clinicId);
}

export async function createCardSettlementType(clinicId, payload) {
  const normalized = normalizeSettlementPayload(payload);
  if (!clinicId) throw new Error('Clinica nao informada');
  if (!normalized.code || !normalized.name) throw new Error('Informe codigo e nome da forma de recebimento');

  const { data, error } = await supabase
    .from('card_settlement_types')
    .insert({ clinic_id: clinicId, ...normalized })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCardSettlementType(id, payload) {
  const normalized = normalizeSettlementPayload(payload);
  const { data, error } = await supabase
    .from('card_settlement_types')
    .update({ ...normalized, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCardSettlementType(id) {
  const { error } = await supabase
    .from('card_settlement_types')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  return true;
}
