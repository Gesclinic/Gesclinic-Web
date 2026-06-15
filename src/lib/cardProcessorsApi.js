import { supabase } from './customSupabaseClient';

/**
 * Fetch all card processors for a clinic
 */
export async function listCardProcessors(clinicId) {
  const { data, error } = await supabase
    .from('card_processors')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    return [];
  }

  return data || [];
}

/**
 * Get a single card processor
 */
export async function getCardProcessor(processorId) {
  const { data, error } = await supabase
    .from('card_processors')
    .select('*')
    .eq('id', processorId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Create a new card processor
 */
export async function createCardProcessor(clinicId, { name, settlement_day, notes }) {
  const { data, error } = await supabase
    .from('card_processors')
    .insert([
      {
        clinic_id: clinicId,
        name: name.toUpperCase(),
        settlement_day: Math.min(31, Math.max(1, settlement_day)),
        notes: notes || null,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update a card processor
 */
export async function updateCardProcessor(processorId, { name, settlement_day, notes }) {
  const { data, error } = await supabase
    .from('card_processors')
    .update({
      name: name ? name.toUpperCase() : undefined,
      settlement_day: settlement_day ? Math.min(31, Math.max(1, settlement_day)) : undefined,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', processorId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Soft delete a card processor
 */
export async function deleteCardProcessor(processorId) {
  const { data, error } = await supabase
    .from('card_processors')
    .update({ is_active: false })
    .eq('id', processorId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
