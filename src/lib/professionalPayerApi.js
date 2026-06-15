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
 * Get payers for a specific professional
 * @param {string} professionalId - ID do profissional
 * @param {string} clinicId - ID da clínica
 * @returns {Promise<Array>} Lista de payers que o profissional atende
 */
export async function getPayersForProfessional(professionalId, clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from('professional_payers')
      .select(`
        id,
        payer_id,
        payers(
          id,
          name,
          type
        )
      `)
      .eq('professional_id', professionalId)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Map to payer format
    return (data || [])
      .map((pp) => ({
        id: pp.payers.id,
        name: pp.payers.name,
        type: pp.payers.type,
        professional_payer_id: pp.id,
      }))
      .filter((p) => p.id); // Remove null payers
  } catch (error) {
    console.error('Error fetching payers for professional:', error);
    return [];
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
