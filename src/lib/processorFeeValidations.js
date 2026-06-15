/**
 * Advanced validations and audit trail for processor fees
 */

import { supabase } from './customSupabaseClient';

/**
 * Validate processor fee data before saving
 * Comprehensive validation rules
 */
export function validateProcessorFee({
  processorId,
  cardBrand,
  settlementType,
  feePercent,
}) {
  const errors = [];

  // Required fields
  if (!processorId) errors.push('Operadora é obrigatória');
  if (!cardBrand) errors.push('Bandeira é obrigatória');
  if (!settlementType) errors.push('Forma de recebimento é obrigatória');
  if (feePercent === '' || feePercent === null) {
    errors.push('Taxa (%) é obrigatória');
  }

  // Type validation
  if (typeof processorId !== 'string' || processorId.length !== 36) {
    errors.push('ID da operadora inválido');
  }

  if (typeof cardBrand !== 'string' || cardBrand.length === 0) {
    errors.push('Bandeira inválida');
  }

  if (typeof settlementType !== 'string' || settlementType.length === 0) {
    errors.push('Forma de recebimento inválida');
  }

  // Numeric validation
  const feeNum = parseFloat(feePercent);
  if (isNaN(feeNum)) errors.push('Taxa deve ser um número');
  if (feeNum < 0) errors.push('Taxa não pode ser negativa');
  if (feeNum > 100) errors.push('Taxa não pode ser maior que 100%');
  if (feeNum === 0 && feePercent !== '0' && feePercent !== 0) {
    errors.push('Taxa deve ser um valor válido (por exemplo: 2.5)');
  }

  // Precision validation (max 2 decimals)
  if (feeNum.toString().split('.')[1]?.length > 2) {
    errors.push('Taxa deve ter no máximo 2 casas decimais');
  }

  // List of valid brands
  const validBrands = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Discover'];
  if (!validBrands.includes(cardBrand)) {
    errors.push(
      `Bandeira inválida. Opções válidas: ${validBrands.join(', ')}`
    );
  }

  // List of valid settlement types
  const validSettlementTypes = ['D+0', 'D+1', 'D+30', 'Payment Day'];
  if (!validSettlementTypes.includes(settlementType)) {
    errors.push(
      `Forma de recebimento inválida. Opções válidas: ${validSettlementTypes.join(
        ', '
      )}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if fee already exists (prevent duplicates)
 */
export async function checkDuplicateFee(
  clinicId,
  processorId,
  cardBrand,
  settlementType,
  excludeFeeId = null
) {
  const { data, error } = await supabase
    .from('card_processor_fees')
    .select('id, fee_percent')
    .eq('clinic_id', clinicId)
    .eq('card_processor_id', processorId)
    .eq('card_brand', cardBrand.toUpperCase())
    .eq('settlement_type', settlementType)
    .eq('is_active', true);

  if (error) {
    console.error('❌ [checkDuplicateFee] Error:', error);
    return null;
  }

  // If we're editing, exclude the current fee
  if (excludeFeeId && data?.length === 1 && data[0].id === excludeFeeId) {
    return null;
  }

  return data?.[0] || null;
}

/**
 * Validate fee percentage is within valid range (0-100%)
 * Returns { isValid: boolean, error: string | null }
 */
export function validateFeePercentRange(feePercent) {
  if (feePercent === null || feePercent === undefined || feePercent === '') {
    return {
      isValid: false,
      error: '❌ Taxa não pode estar vazia',
    };
  }

  const feeNum = parseFloat(feePercent);
  
  if (isNaN(feeNum)) {
    return {
      isValid: false,
      error: '❌ Taxa deve ser um número válido',
    };
  }

  if (feeNum < 0) {
    return {
      isValid: false,
      error: '❌ Taxa não pode ser negativa',
    };
  }

  if (feeNum > 100) {
    return {
      isValid: false,
      error: '❌ Taxa não pode ser maior que 100%',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * ETAPA D.2: Record fee change in audit trail
 * Insere registro de alteração na tabela fee_audit_log
 */
export async function recordFeeChange({
  clinicId,
  userId,
  feeId,
  action, // 'create', 'update', 'delete'
  oldValues,
  newValues,
  changeReason = null,
}) {
  // ✅ Validar ação
  if (!['create', 'update', 'delete'].includes(action)) {
    console.error('❌ [recordFeeChange] Ação inválida:', action);
    return null;
  }

  // ✅ Construir entrada de auditoria
  const auditEntry = {
    clinic_id: clinicId,
    fee_id: feeId,
    action,
    changed_by: userId,
    changed_at: new Date().toISOString(),
    old_values: oldValues ? JSON.stringify(oldValues) : null,
    new_values: JSON.stringify(newValues),
    change_reason: changeReason,
    ip_address: null, // Poderia capturar do contexto HTTP
  };

  // ✅ Inserir na tabela fee_audit_log
  try {
    const { data, error } = await supabase
      .from('fee_audit_log')
      .insert([auditEntry])
      .select();

    if (error) {
      console.error('❌ [recordFeeChange] Erro ao registrar:', error);
      throw new Error('Falha ao registrar alteração: ' + error.message);
    }

    console.log('✅ [recordFeeChange] Alteração registrada:', data?.[0]?.id);
    return data?.[0];
  } catch (err) {
    console.error('❌ [recordFeeChange] Exceção:', err.message);
    throw err;
  }
}

/**
 * ETAPA D.2: Get change history for a fee
 * Obtém histórico completo de alterações para uma taxa
 */
export async function getFeeAuditHistory(feeId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('fee_audit_log')
      .select('*')
      .eq('fee_id', feeId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ [getFeeAuditHistory] Erro:', error);
      return [];
    }

    console.log(`✅ [getFeeAuditHistory] ${data?.length || 0} registros encontrados`);
    return data || [];
  } catch (err) {
    console.error('❌ [getFeeAuditHistory] Exceção:', err.message);
    return [];
  }
}

/**
 * ETAPA D.2: Get changes by clinic
 * Obtém mudanças de uma clínica em um período
 */
export async function getFeeChangesByClinic(clinicId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('fee_audit_log')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('changed_at', startDate.toISOString())
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('❌ [getFeeChangesByClinic] Erro:', error);
      return [];
    }

    console.log(`✅ [getFeeChangesByClinic] ${data?.length || 0} alterações nos últimos ${days} dias`);
    return data || [];
  } catch (err) {
    console.error('❌ [getFeeChangesByClinic] Exceção:', err.message);
    return [];
  }
}

/**
 * ETAPA D.2: Revert to previous version
 * Reverte uma taxa para uma versão anterior
 */
export async function revertFeeToVersion(feeId, auditLogId, clinicId, userId) {
  try {
    // 1️⃣ Buscar registro de auditoria anterior
    const { data: auditRecord, error: auditError } = await supabase
      .from('fee_audit_log')
      .select('*')
      .eq('id', auditLogId)
      .eq('fee_id', feeId)
      .single();

    if (auditError || !auditRecord?.old_values) {
      throw new Error('Versão anterior não encontrada para este registro');
    }

    console.log('📋 [revertFeeToVersion] Versão anterior encontrada:', auditRecord.id);

    const previousValues = JSON.parse(auditRecord.old_values);

    // 2️⃣ Primeiro, buscar valores ATUAIS (antes de reverter)
    const { data: currentFee, error: fetchError } = await supabase
      .from('card_processor_fees')
      .select('*')
      .eq('id', feeId)
      .eq('clinic_id', clinicId)
      .single();

    if (fetchError) {
      throw new Error('Taxa não encontrada: ' + fetchError.message);
    }

    const currentValues = {
      fee_percent: currentFee.fee_percent,
      card_brand: currentFee.card_brand,
      settlement_type: currentFee.settlement_type,
      is_active: currentFee.is_active,
    };

    // 3️⃣ Atualizar taxa com valores anteriores
    const { data: updated, error: updateError } = await supabase
      .from('card_processor_fees')
      .update(previousValues)
      .eq('id', feeId)
      .eq('clinic_id', clinicId)
      .select();

    if (updateError) {
      throw new Error('Falha ao reverter: ' + updateError.message);
    }

    console.log('✅ [revertFeeToVersion] Taxa revertida para:', previousValues);

    // 4️⃣ Registrar a reversão na auditoria
    await recordFeeChange({
      clinicId,
      userId,
      feeId,
      action: 'update',
      oldValues: currentValues,
      newValues: previousValues,
      changeReason: `Revert para versão anterior (audit log: ${auditLogId})`,
    });

    return updated?.[0];
  } catch (err) {
    console.error('❌ [revertFeeToVersion] Erro:', err.message);
    throw err;
  }
}

/**
 * Compare two fee objects and return differences
 */
export function compareFeeVersions(oldFee, newFee) {
  const changes = {};

  Object.keys(newFee).forEach((key) => {
    if (oldFee[key] !== newFee[key]) {
      changes[key] = {
        old: oldFee[key],
        new: newFee[key],
      };
    }
  });

  return changes;
}

/**
 * Validate processor fee rate is reasonable
 * Warnings for unusual rates
 */
export function validateFeeRateReasonableness(feePercent) {
  const warnings = [];

  if (feePercent > 5) {
    warnings.push('⚠️ Taxa acima de 5% é incomum. Verifique a configuração.');
  }

  if (feePercent > 10) {
    warnings.push(
      '⚠️ Taxa acima de 10% é muito alta. Confirme antes de salvar.'
    );
  }

  if (feePercent < 0.5) {
    warnings.push(
      '⚠️ Taxa abaixo de 0.5% é incomum. Verifique a configuração.'
    );
  }

  return warnings;
}

/**
 * ETAPA D.2: SQL da tabela fee_audit_log
 * A tabela foi criada via migração: 2026-06-08_create_fee_audit_log.sql
 * 
 * Colunas:
 * - id: UUID (chave primária)
 * - clinic_id: UUID (isolamento por clínica)
 * - fee_id: UUID (FK para card_processor_fees)
 * - action: VARCHAR (create, update, delete)
 * - changed_by: UUID (usuário que fez a alteração)
 * - changed_at: TIMESTAMP (quando foi alterado)
 * - old_values: JSONB (valores anteriores)
 * - new_values: JSONB (valores novos)
 * - change_reason: VARCHAR (motivo opcional)
 * - ip_address: VARCHAR (para auditoria de segurança)
 */

// Não mais usar referência a SQL aqui - migração está em supabase/migrations/

/**
 * Validation helper for bulk operations
 */
export async function validateBulkFeeImport(fees) {
  const results = fees.map((fee, index) => ({
    index,
    fee,
    validation: validateProcessorFee({
      processorId: fee.processor_id,
      cardBrand: fee.card_brand,
      settlementType: fee.settlement_type,
      feePercent: fee.fee_percent,
    }),
  }));

  const validFees = results.filter((r) => r.validation.isValid);
  const invalidFees = results.filter((r) => !r.validation.isValid);

  return {
    total: fees.length,
    valid: validFees.length,
    invalid: invalidFees.length,
    results,
    errors: invalidFees.map((r) => ({
      row: r.index + 1,
      errors: r.validation.errors,
    })),
  };
}
