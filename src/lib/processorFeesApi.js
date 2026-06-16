import { supabase } from './customSupabaseClient';
import { recordFeeChange } from './processorFeeValidations';

/**
 * List all processor fees for a clinic
 * @param {string} clinicId - Clinic ID
 * @param {string} processorId - Optional: Filter by processor ID
 * @returns {Promise<Array>} Array of processor fees
 */
export async function listProcessorFees(clinicId, processorId = null) {
  try {
    let query = supabase
      .from('card_processor_fees')
      .select(`
        id,
        card_processor_id,
        card_processor:card_processors(name, settlement_day),
        card_brand,
        settlement_type,
        fee_percent,
        is_active,
        created_at
      `)
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('card_processor_id', { ascending: true })
      .order('card_brand', { ascending: true })
      .order('settlement_type', { ascending: true });

    if (processorId) {
      query = query.eq('card_processor_id', processorId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Get a specific processor fee
 * @param {string} feeId - Fee ID
 * @returns {Promise<Object>} Processor fee object
 */
export async function getProcessorFee(feeId) {
  try {
    const { data, error } = await supabase
      .from('card_processor_fees')
      .select(`
        *,
        card_processor:card_processors(name, settlement_day)
      `)
      .eq('id', feeId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new processor fee
 * @param {string} clinicId - Clinic ID
 * @param {Object} data - Fee data: { processorId, cardBrand, settlementType, feePercent, notes, userId }
 * @returns {Promise<Object>} Created fee
 */
export async function createProcessorFee(clinicId, data) {
  try {
    const {
      processorId,
      cardBrand,
      settlementType,
      feePercent,
      userId = null, // ETAPA D.2: Para auditoria
    } = data;

    // Validation
    if (!processorId) throw new Error('Operadora é obrigatória');
    if (!cardBrand) throw new Error('Bandeira é obrigatória');
    if (!settlementType) throw new Error('Forma de recebimento é obrigatória');
    if (feePercent === null || feePercent === undefined || feePercent < 0 || feePercent > 100) {
      throw new Error('Taxa deve estar entre 0 e 100%');
    }

    const { data: createdFee, error } = await supabase
      .from('card_processor_fees')
      .insert([
        {
          clinic_id: clinicId,
          card_processor_id: processorId,
          card_brand: cardBrand.toUpperCase(),
          settlement_type: settlementType,
          fee_percent: parseFloat(feePercent),
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // ✅ ETAPA D.2: Registrar criação na auditoria
    if (userId && createdFee?.id) {
      try {
        await recordFeeChange({
          clinicId,
          userId,
          feeId: createdFee.id,
          action: 'create',
          oldValues: null,
          newValues: {
            card_processor_id: processorId,
            card_brand: cardBrand.toUpperCase(),
            settlement_type: settlementType,
            fee_percent: parseFloat(feePercent),
            is_active: true,
          },
          changeReason: 'Taxa criada',
        });
      } catch (auditErr) {
        // Log but don't fail the main operation
        console.warn('⚠️ [createProcessorFee] Erro ao registrar auditoria:', auditErr.message);
      }
    }

    return createdFee;
  } catch (error) {
    throw error;
  }
}

/**
 * Update a processor fee
 * @param {string} feeId - Fee ID
 * @param {Object} data - Updated data: { cardBrand, settlementType, feePercent, clinicId, userId }
 * @returns {Promise<Object>} Updated fee
 */
export async function updateProcessorFee(feeId, data) {
  try {
    const { clinicId = null, userId = null, ...updateData } = data;

    // 1️⃣ Buscar valores antigos ANTES de atualizar (para auditoria)
    let oldValues = null;
    if (userId && clinicId) {
      try {
        const existingFee = await getProcessorFee(feeId);
        if (existingFee) {
          oldValues = {
            card_brand: existingFee.card_brand,
            settlement_type: existingFee.settlement_type,
            fee_percent: existingFee.fee_percent,
            is_active: existingFee.is_active,
          };
        }
      } catch (err) {
        console.warn('⚠️ [updateProcessorFee] Não foi possível obter valores antigos:', err.message);
      }
    }

    // 2️⃣ Preparar dados para atualização
    const updates = {};
    
    if (updateData.cardBrand) updates.card_brand = updateData.cardBrand.toUpperCase();
    if (updateData.settlementType) updates.settlement_type = updateData.settlementType;
    if (updateData.feePercent !== null && updateData.feePercent !== undefined) {
      updates.fee_percent = parseFloat(updateData.feePercent);
    }
    updates.updated_at = new Date().toISOString();

    // 3️⃣ Executar atualização
    const { data: updated, error } = await supabase
      .from('card_processor_fees')
      .update(updates)
      .eq('id', feeId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // ✅ ETAPA D.2: Registrar atualização na auditoria
    if (userId && clinicId && updated?.id && oldValues) {
      try {
        await recordFeeChange({
          clinicId,
          userId,
          feeId: updated.id,
          action: 'update',
          oldValues,
          newValues: {
            card_brand: updates.card_brand || oldValues.card_brand,
            settlement_type: updates.settlement_type || oldValues.settlement_type,
            fee_percent: updates.fee_percent || oldValues.fee_percent,
            is_active: oldValues.is_active,
          },
          changeReason: 'Taxa atualizada',
        });
      } catch (auditErr) {
        // Log but don't fail the main operation
        console.warn('⚠️ [updateProcessorFee] Erro ao registrar auditoria:', auditErr.message);
      }
    }

    return updated;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a processor fee (soft delete)
 * @param {string} feeId - Fee ID
 * @param {Object} options - Optional: { clinicId, userId } for audit logging
 * @returns {Promise<void>}
 */
export async function deleteProcessorFee(feeId, options = {}) {
  try {
    const { clinicId = null, userId = null } = options;

    // 1️⃣ Buscar fee antes de deletar (para auditoria)
    let oldValues = null;
    if (userId && clinicId) {
      try {
        const existingFee = await getProcessorFee(feeId);
        if (existingFee) {
          oldValues = {
            card_processor_id: existingFee.card_processor_id,
            card_brand: existingFee.card_brand,
            settlement_type: existingFee.settlement_type,
            fee_percent: existingFee.fee_percent,
            is_active: existingFee.is_active,
          };
        }
      } catch (err) {
        console.warn('⚠️ [deleteProcessorFee] Não foi possível obter valores antigos:', err.message);
      }
    }

    // 2️⃣ Executar soft delete
    const { error } = await supabase
      .from('card_processor_fees')
      .update({ is_active: false })
      .eq('id', feeId);

    if (error) {
      throw error;
    }

    // ✅ ETAPA D.2: Registrar deleção na auditoria
    if (userId && clinicId && oldValues) {
      try {
        await recordFeeChange({
          clinicId,
          userId,
          feeId,
          action: 'delete',
          oldValues,
          newValues: { is_active: false },
          changeReason: 'Taxa desativada',
        });
      } catch (auditErr) {
        // Log but don't fail the main operation
        console.warn('⚠️ [deleteProcessorFee] Erro ao registrar auditoria:', auditErr.message);
      }
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Delete many processor fees at once (soft delete).
 * Keeps individual deleteProcessorFee available for audited single-record actions.
 * @param {string[]} feeIds - Fee IDs to deactivate
 * @returns {Promise<Array>} Deactivated fee rows
 */
export async function deleteProcessorFeesBulk(feeIds = []) {
  try {
    const ids = [...new Set((feeIds || []).filter(Boolean))];
    if (!ids.length) return [];

    const { data, error } = await supabase
      .from('card_processor_fees')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
      .select('id');

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Get fee for a specific combination
 * @param {string} clinicId - Clinic ID
 * @param {string} processorId - Processor ID
 * @param {string} cardBrand - Card brand
 * @param {string} settlementType - Settlement type
 * @returns {Promise<Object|null>} Fee object or null
 */
export async function getProcessorFeeByCombo(clinicId, processorId, cardBrand, settlementType) {
  try {
    const { data, error } = await supabase
      .from('card_processor_fees')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('card_processor_id', processorId)
      .eq('card_brand', cardBrand.toUpperCase())
      .eq('settlement_type', settlementType)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // 'PGRST116' = no rows found
      throw error;
    }

    return data || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all fees for a processor
 * @param {string} processorId - Processor ID
 * @returns {Promise<Array>} Array of fees
 */
export async function getProcessorAllFees(processorId) {
  try {
    const { data, error } = await supabase
      .from('card_processor_fees')
      .select('*')
      .eq('card_processor_id', processorId)
      .eq('is_active', true)
      .order('card_brand', { ascending: true })
      .order('settlement_type', { ascending: true });

    if (error) {
      console.error('❌ [getProcessorAllFees] Error:', error.message);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ [getProcessorAllFees] Exception:', error.message);
    throw error;
  }
}
