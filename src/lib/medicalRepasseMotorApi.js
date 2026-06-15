/**
 * ETAPA 4: Medical Repasse Motor API
 * 
 * Gerencia modelos de comissão médica com 4 tipos:
 * 1. Fixed Percent - porcentagem fixa por atendimento
 * 2. Rate Table - tabela por procedimento/seguro
 * 3. Specific Insurance - tabela por seguro
 * 4. Specific Procedure - tabela por procedimento
 * 
 * Auto-cria AP (Accounts Payable) bills quando appointment is attended
 */

import { customSupabaseClient } from './customSupabaseClient';

const COMMISSION_TYPES = {
  FIXED_PERCENT: 'fixed_percent',
  RATE_TABLE: 'rate_table',
  SPECIFIC_INSURANCE: 'specific_insurance',
  SPECIFIC_PROCEDURE: 'specific_procedure',
};

const TAX_TYPES = {
  ISS: 'iss',              // Imposto sobre Serviço (5-15%)
  INSS: 'inss',            // INSS (11% ou 20% autônomo)
  IR: 'ir',                // Imposto de Renda (até 27.5%)
  NONE: 'none',
};

/**
 * Criar novo modelo de comissão
 * @param {Object} params
 * @returns {Promise<{success: boolean, modelId: string}>}
 */
export async function createCommissionModel({
  clinicId,
  professionalId,
  modelName,
  type,           // 'fixed_percent', 'rate_table', 'specific_insurance', 'specific_procedure'
  description,
  isActive = true,
  baseTaxType = TAX_TYPES.ISS,
  baseTaxPercentage = 0.05,
  minCommissionAmount = 0,
  maxCommissionAmount = null,
  applyWithholding = true,
} = {}) {
  try {
    console.log(`Creating commission model for professional ${professionalId}...`);

    const { data, error } = await customSupabaseClient
      .from('medical_commission_models')
      .insert({
        clinic_id: clinicId,
        professional_id: professionalId,
        model_name: modelName,
        type,
        description,
        is_active: isActive,
        base_tax_type: baseTaxType,
        base_tax_percentage: baseTaxPercentage,
        min_commission_amount: minCommissionAmount,
        max_commission_amount: maxCommissionAmount,
        apply_withholding: applyWithholding,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Commission model created: ${data.id}`);
    return {
      success: true,
      modelId: data.id,
      model: data,
    };
  } catch (err) {
    console.error('Error creating commission model:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Criar percentual fixo para modelo
 * @param {Object} params
 * @returns {Promise<{success: boolean, configId: string}>}
 */
export async function createFixedPercentConfig({
  clinicId,
  modelId,
  percentage,
} = {}) {
  try {
    console.log(`Creating fixed percent config: ${percentage}%`);

    const { data, error } = await customSupabaseClient
      .from('commission_fixed_percent')
      .insert({
        clinic_id: clinicId,
        model_id: modelId,
        percentage,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      configId: data.id,
    };
  } catch (err) {
    console.error('Error creating fixed percent config:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Criar entrada de tabela de taxas por procedimento
 * @param {Object} params
 * @returns {Promise<{success: boolean, entryId: string}>}
 */
export async function createRateTableEntry({
  clinicId,
  modelId,
  procedureCode,
  procedureName,
  commissionPercentage,
  minAmount = 0,
  maxAmount = null,
  insuranceCode = null,  // Optional: se específico de seguro
} = {}) {
  try {
    console.log(`Creating rate table entry for ${procedureName}...`);

    const { data, error } = await customSupabaseClient
      .from('commission_rate_tables')
      .insert({
        clinic_id: clinicId,
        model_id: modelId,
        procedure_code: procedureCode,
        procedure_name: procedureName,
        commission_percentage: commissionPercentage,
        min_amount: minAmount,
        max_amount: maxAmount,
        insurance_code: insuranceCode,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      entryId: data.id,
    };
  } catch (err) {
    console.error('Error creating rate table entry:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Calcular comissão para um atendimento
 * @param {Object} params
 * @returns {Promise<{success: boolean, commission: number, gross: number, taxes: Object, net: number}>}
 */
export async function calculateCommission({
  clinicId,
  professionalId,
  appointmentValue,
  procedureCode = null,
  insuranceCode = null,
  appointmentDate = new Date(),
} = {}) {
  try {
    console.log(`Calculating commission for professional ${professionalId}...`);

    // 1. Buscar modelo ativo do profissional
    const { data: model, error: modelError } = await customSupabaseClient
      .from('medical_commission_models')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (modelError) throw new Error('No active commission model found');

    let commissionPercentage = 0;
    let applicableTaxType = model.base_tax_type;
    let applicableTaxPercentage = model.base_tax_percentage;

    // 2. Calcular percentual baseado no tipo de modelo
    if (model.type === COMMISSION_TYPES.FIXED_PERCENT) {
      const { data: config } = await customSupabaseClient
        .from('commission_fixed_percent')
        .select('percentage')
        .eq('model_id', model.id)
        .single();

      commissionPercentage = config?.percentage || 0;
    } else if (
      model.type === COMMISSION_TYPES.RATE_TABLE ||
      model.type === COMMISSION_TYPES.SPECIFIC_PROCEDURE ||
      model.type === COMMISSION_TYPES.SPECIFIC_INSURANCE
    ) {
      // Buscar na tabela de taxas
      let query = customSupabaseClient
        .from('commission_rate_tables')
        .select('*')
        .eq('model_id', model.id);

      if (model.type === COMMISSION_TYPES.SPECIFIC_PROCEDURE && procedureCode) {
        query = query.eq('procedure_code', procedureCode);
      }

      if (model.type === COMMISSION_TYPES.SPECIFIC_INSURANCE && insuranceCode) {
        query = query.eq('insurance_code', insuranceCode);
      }

      const { data: entry } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      commissionPercentage = entry?.commission_percentage || 0;

      // Aplicar limites de valor se existirem
      if (entry?.min_amount && appointmentValue < entry.min_amount) {
        commissionPercentage = 0; // Sem comissão abaixo do mínimo
      }
      if (entry?.max_amount && appointmentValue > entry.max_amount) {
        // Capa em valor máximo
        commissionPercentage = (entry.max_amount / appointmentValue) * 100;
      }
    }

    // 3. Calcular valores
    const grossCommission = appointmentValue * (commissionPercentage / 100);
    
    // Aplicar limites do modelo
    let finalCommission = grossCommission;
    if (model.min_commission_amount && grossCommission < model.min_commission_amount) {
      finalCommission = model.min_commission_amount;
    }
    if (model.max_commission_amount && grossCommission > model.max_commission_amount) {
      finalCommission = model.max_commission_amount;
    }

    // 4. Calcular impostos
    const taxes = calculateTaxes({
      grossAmount: finalCommission,
      taxType: applicableTaxType,
      taxPercentage: applicableTaxPercentage,
    });

    const netCommission = finalCommission - taxes.totalTaxes;

    console.log(`✅ Commission calculated: R$ ${finalCommission.toFixed(2)} → R$ ${netCommission.toFixed(2)}`);

    return {
      success: true,
      commission: finalCommission,
      gross: finalCommission,
      taxes,
      net: netCommission,
      percentage: commissionPercentage,
      modelId: model.id,
      modelType: model.type,
    };
  } catch (err) {
    console.error('Error calculating commission:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Calcular impostos retidos
 * @param {Object} params
 * @returns {Object}
 */
function calculateTaxes({ grossAmount = 0, taxType = TAX_TYPES.ISS, taxPercentage = 0.05 } = {}) {
  const taxes = {
    taxType,
    taxPercentage,
    issTax: 0,
    innssTax: 0,
    irTax: 0,
    totalTaxes: 0,
  };

  if (taxType === TAX_TYPES.ISS) {
    taxes.issTax = grossAmount * taxPercentage;
    taxes.totalTaxes = taxes.issTax;
  } else if (taxType === TAX_TYPES.INSS) {
    taxes.innssTax = grossAmount * taxPercentage;
    taxes.totalTaxes = taxes.innssTax;
  } else if (taxType === TAX_TYPES.IR) {
    taxes.irTax = grossAmount * taxPercentage;
    taxes.totalTaxes = taxes.irTax;
  }

  return taxes;
}

/**
 * Auto-criar AP Bill quando appointment é attended
 * Chamado por trigger ou pelo appointmentFinancialAutomations
 * @param {Object} params
 * @returns {Promise<{success: boolean, apBillId: string, commission: number, net: number}>}
 */
export async function autoCreateAPBillForRepasse({
  clinicId,
  appointmentId,
  professionalId,
  appointmentValue,
  procedureCode = null,
  insuranceCode = null,
  appointmentDate = new Date(),
  description = 'Comissão de Atendimento',
} = {}) {
  try {
    console.log(`Auto-creating AP bill for repasse (appointment: ${appointmentId})...`);

    // 1. Calcular comissão
    const commissionResult = await calculateCommission({
      clinicId,
      professionalId,
      appointmentValue,
      procedureCode,
      insuranceCode,
      appointmentDate,
    });

    if (!commissionResult.success) {
      throw new Error(commissionResult.error);
    }

    // 2. Buscar dados do profissional (fornecedor)
    const { data: professional } = await customSupabaseClient
      .from('professionals')
      .select('name, document_number, email, phone')
      .eq('clinic_id', clinicId)
      .eq('id', professionalId)
      .single();

    if (!professional) {
      throw new Error('Professional not found');
    }

    // 3. Criar AP Bill
    const { data: apBill, error: apError } = await customSupabaseClient
      .from('ap_bills')
      .insert({
        clinic_id: clinicId,
        vendor_id: professionalId,
        vendor_name: professional.name,
        vendor_document: professional.document_number,
        vendor_email: professional.email,
        vendor_phone: professional.phone,
        appointment_id: appointmentId,
        commission_model_id: commissionResult.modelId,
        description: description,
        bill_date: new Date(),
        due_date: new Date(new Date().setDate(new Date().getDate() + 10)), // 10 dias
        gross_amount: commissionResult.gross,
        tax_amount: commissionResult.taxes.totalTaxes,
        tax_type: commissionResult.taxes.taxType,
        net_amount: commissionResult.net,
        status: 'pending',
        payment_method: null,
        created_at: new Date(),
      })
      .select()
      .single();

    if (apError) throw apError;

    // 4. Criar items (linhas) da AP Bill
    const { data: items, error: itemError } = await customSupabaseClient
      .from('ap_items')
      .insert({
        clinic_id: clinicId,
        bill_id: apBill.id,
        description: `Repasse - ${description}`,
        quantity: 1,
        unit_price: commissionResult.gross,
        total_amount: commissionResult.gross,
        tax_amount: commissionResult.taxes.totalTaxes,
        net_amount: commissionResult.net,
        created_at: new Date(),
      })
      .select()
      .single();

    if (itemError) throw itemError;

    console.log(`✅ AP Bill created: ${apBill.id}`);

    return {
      success: true,
      apBillId: apBill.id,
      commission: commissionResult.gross,
      taxes: commissionResult.taxes,
      net: commissionResult.net,
      dueDate: apBill.due_date,
    };
  } catch (err) {
    console.error('Error auto-creating AP bill:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Listar modelos de comissão para uma clínica
 * @param {Object} params
 * @returns {Promise<Array>}
 */
export async function listCommissionModels({
  clinicId,
  professionalId = null,
  isActive = true,
} = {}) {
  try {
    let query = customSupabaseClient
      .from('medical_commission_models')
      .select('*')
      .eq('clinic_id', clinicId);

    if (professionalId) {
      query = query.eq('professional_id', professionalId);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error('Error listing commission models:', err);
    return [];
  }
}

/**
 * Atualizar modelo de comissão
 * @param {Object} params
 * @returns {Promise<{success: boolean}>}
 */
export async function updateCommissionModel({
  clinicId,
  modelId,
  updates = {},
} = {}) {
  try {
    console.log(`Updating commission model ${modelId}...`);

    const { error } = await customSupabaseClient
      .from('medical_commission_models')
      .update(updates)
      .eq('id', modelId)
      .eq('clinic_id', clinicId);

    if (error) throw error;

    console.log(`✅ Commission model updated`);
    return { success: true };
  } catch (err) {
    console.error('Error updating commission model:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Deletar modelo de comissão
 * @param {Object} params
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteCommissionModel({
  clinicId,
  modelId,
} = {}) {
  try {
    console.log(`Deleting commission model ${modelId}...`);

    const { error } = await customSupabaseClient
      .from('medical_commission_models')
      .delete()
      .eq('id', modelId)
      .eq('clinic_id', clinicId);

    if (error) throw error;

    console.log(`✅ Commission model deleted`);
    return { success: true };
  } catch (err) {
    console.error('Error deleting commission model:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Obter resumo de comissões mensais por profissional
 * @param {Object} params
 * @returns {Promise<{success: boolean, summary: Array}>}
 */
export async function getMonthlyReppasseSummary({
  clinicId,
  month = new Date().toISOString().substring(0, 7), // 'YYYY-MM'
  professionalId = null,
} = {}) {
  try {
    console.log(`Getting repasse summary for ${month}...`);

    let query = `
      SELECT 
        p.id,
        p.name as professional_name,
        COUNT(ab.id) as commission_count,
        SUM(ab.gross_amount) as total_gross,
        SUM(ab.tax_amount) as total_taxes,
        SUM(ab.net_amount) as total_net
      FROM ap_bills ab
      JOIN professionals p ON ab.vendor_id = p.id
      WHERE ab.clinic_id = $1
        AND TO_CHAR(ab.bill_date, 'YYYY-MM') = $2
        AND ab.status != 'cancelled'
      ${professionalId ? 'AND ab.vendor_id = $3' : ''}
      GROUP BY p.id, p.name
      ORDER BY total_gross DESC
    `;

    const { data, error } = await customSupabaseClient.rpc('fn_query_repasse_summary', {
      clinic_id: clinicId,
      month_year: month,
      professional_id: professionalId,
    });

    if (error) throw error;

    return {
      success: true,
      summary: data || [],
    };
  } catch (err) {
    console.error('Error getting repasse summary:', err);
    return {
      success: false,
      error: err.message,
      summary: [],
    };
  }
}

export default {
  COMMISSION_TYPES,
  TAX_TYPES,
  createCommissionModel,
  createFixedPercentConfig,
  createRateTableEntry,
  calculateCommission,
  autoCreateAPBillForRepasse,
  listCommissionModels,
  updateCommissionModel,
  deleteCommissionModel,
  getMonthlyReppasseSummary,
};
