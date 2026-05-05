import { customSupabaseClient } from './customSupabaseClient';

/**
 * Professional Payer API
 * Manages relationships between professionals and payers/health insurances
 */

/**
 * Get all professional-payer relationships for a clinic
 */
export async function getProfessionalPayers(clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from('professional_payers')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching professional payers:', error);
    throw error;
  }
}

/**
 * Create a new professional-payer relationship
 */
export async function createProfessionalPayer(clinicId, data) {
  try {
    const { data: result, error } = await customSupabaseClient
      .from('professional_payers')
      .insert([
        {
          clinic_id: clinicId,
          professional_id: data.professional_id,
          payer_id: data.payer_id,
        },
      ])
      .select();

    if (error) {
      throw error;
    }
    return result?.[0];
  } catch (error) {
    console.error('Error creating professional payer:', error);
    throw error;
  }
}

/**
 * Update a professional-payer relationship
 */
export async function updateProfessionalPayer(id, data) {
  try {
    const { data: result, error } = await customSupabaseClient
      .from('professional_payers')
      .update({
        payer_id: data.payer_id,
      })
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }
    return result?.[0];
  } catch (error) {
    console.error('Error updating professional payer:', error);
    throw error;
  }
}

/**
 * Delete a professional-payer relationship
 */
export async function deleteProfessionalPayer(id) {
  try {
    const { error } = await customSupabaseClient.from('professional_payers').delete().eq('id', id);

    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Error deleting professional payer:', error);
    throw error;
  }
}
