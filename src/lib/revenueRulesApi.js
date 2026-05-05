// src/lib/revenueRulesApi.js
// ============================================================
// API - Regras de Repasse
// ============================================================

import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

/**
 * Lista todas as regras de repasse de uma clínica
 * @param {string} clinicId
 * @param {Object} options - { professional_id, service_id }
 * @returns {Promise<Array>}
 */
export async function listRevenueRules(clinicId, options = {}) {
  const { professional_id, service_id } = options;

  let query = supabase
    .from('revenue_rules')
    .select(
      `
      id,
      rule_name,
      professional_id,
      service_id,
      repasse_type,
      percentage,
      fixed_amount,
      min_value,
      max_value,
      active
    `,
    )
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (professional_id) {
    query = query.eq('professional_id', professional_id);
  }

  if (service_id) {
    query = query.eq('service_id', service_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Falha ao listar regras: ${error.message}`);
  }

  // Mapear os dados e adicionar compatibilidade de nomes de campos
  return (data || []).map((rule) => ({
    ...rule,
    rule_type: rule.repasse_type, // Compatibilidade: repasse_type → rule_type
    fixed_value: rule.fixed_amount, // Compatibilidade: fixed_amount → fixed_value
    minimum_value: rule.min_value, // Compatibilidade: min_value → minimum_value
  }));
}

/**
 * Obtém regra de repasse específica
 * @param {string} ruleId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function getRevenueRule(ruleId, clinicId) {
  const { data, error } = await supabase
    .from('revenue_rules')
    .select(
      `
      id,
      professional_id,
      service_id,
      repasse_type,
      percentage,
      fixed_amount,
      min_value,
      max_value,
      repasse_to,
      applies_to_status,
      active,
      created_at,
      updated_at
    `,
    )
    .eq('id', ruleId)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao obter regra: ${error.message}`);
  }
  return data;
}

/**
 * Cria nova regra de repasse
 * @param {string} clinicId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createRevenueRule(clinicId, data) {
  const {
    rule_name,
    professional_id,
    service_id,
    rule_type = 'percentage',
    percentage = null,
    fixed_value = null,
    minimum_value = null,
  } = data;

  // Validações
  if (!professional_id && !service_id) {
    throw new Error('Deve especificar profissional OU serviço');
  }

  if (rule_type === 'percentage' && (!percentage || percentage < 0 || percentage > 100)) {
    throw new Error('Percentual deve estar entre 0 e 100');
  }

  if ((rule_type === 'fixed' || rule_type === 'fixed_value') && !fixed_value) {
    throw new Error('Valor fixo é obrigatório para este tipo');
  }

  const { data: rule, error } = await supabase
    .from('revenue_rules')
    .insert([
      {
        clinic_id: clinicId,
        rule_name: rule_name || null,
        professional_id: professional_id || null,
        service_id: service_id || null,
        repasse_type: rule_type,
        percentage: percentage || null,
        fixed_amount: fixed_value || null,
        min_value: minimum_value || null,
        active: true,
      },
    ])
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao criar regra: ${error.message}`);
  }

  // Normalizar resposta
  return rule
    ? {
        ...rule,
        rule_type: rule.repasse_type,
        fixed_value: rule.fixed_amount,
        minimum_value: rule.min_value,
      }
    : null;
}

/**
 * Atualiza regra de repasse
 * @param {string} ruleId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateRevenueRule(ruleId, updates) {
  try {
    // Construir objeto com apenas campos que queremos atualizar
    const updateData = {};

    if ('rule_name' in updates) {
      updateData.rule_name = updates.rule_name;
    }
    if ('professional_id' in updates) {
      updateData.professional_id = updates.professional_id;
    }
    if ('service_id' in updates) {
      updateData.service_id = updates.service_id;
    }
    if ('rule_type' in updates) {
      updateData.repasse_type = updates.rule_type;
    }
    if ('percentage' in updates) {
      if (updates.percentage !== null && (updates.percentage < 0 || updates.percentage > 100)) {
        throw new Error('Percentual deve estar entre 0 e 100');
      }
      updateData.percentage = updates.percentage;
    }
    if ('fixed_value' in updates) {
      updateData.fixed_amount = updates.fixed_value;
    }
    if ('active' in updates) {
      updateData.active = updates.active;
    }

    console.log('Atualizando regra com dados:', updateData);

    const { data: rule, error } = await supabase
      .from('revenue_rules')
      .update(updateData)
      .eq('id', ruleId)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!rule || rule.length === 0) {
      throw new Error('Regra não encontrada após atualização');
    }

    const updatedRule = rule[0];

    // Normalizar resposta
    return {
      ...updatedRule,
      rule_type: updatedRule.repasse_type,
      fixed_value: updatedRule.fixed_amount,
      minimum_value: updatedRule.min_value,
    };
  } catch (err) {
    console.error('updateRevenueRule error:', err);
    throw err;
  }
}

/**
 * Desativa regra (não deleta)
 * @param {string} ruleId
 * @returns {Promise<Object>}
 */
export async function deactivateRevenueRule(ruleId) {
  const { data: rule, error } = await supabase
    .from('revenue_rules')
    .update({ active: false, updated_at: new Date() })
    .eq('id', ruleId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao desativar regra: ${error.message}`);
  }

  // Normalizar resposta
  return rule
    ? {
        ...rule,
        rule_type: rule.repasse_type,
        fixed_value: rule.fixed_amount,
        minimum_value: rule.min_value,
      }
    : null;
}

/**
 * Alias para deactivateRevenueRule
 */
export const deleteRevenueRule = deactivateRevenueRule;

/**
 * Calcula repasse para um profissional em um serviço
 * @param {string} professionalId
 * @param {string} serviceId
 * @param {string} clinicId
 * @param {number} baseAmount - Valor base de cobrança
 * @param {string} appointmentStatus - Status do agendamento
 * @returns {Promise<{ruleId, amount, percentage, type}>}
 */
export async function calculateRepasse(
  professionalId,
  serviceId,
  clinicId,
  baseAmount,
  appointmentStatus = 'completed',
) {
  const rules = await listRevenueRules(clinicId, {
    professional_id: professionalId,
    service_id: serviceId,
  });

  if (rules.length === 0) {
    return {
      ruleId: null,
      amount: 0,
      percentage: 0,
      type: 'none',
      message: 'Nenhuma regra de repasse definida',
    };
  }

  // Usar primeira regra que se aplica
  const rule =
    rules.find(
      (r) => r.applies_to_status === 'all' || r.applies_to_status?.includes(appointmentStatus),
    ) || rules[0];

  let amount = 0;

  // Suportar ambos os nomes (normalizados e do banco)
  const ruleType = rule.rule_type || rule.repasse_type;
  const fixedAmount = rule.fixed_value !== undefined ? rule.fixed_value : rule.fixed_amount;
  const minValue = rule.minimum_value !== undefined ? rule.minimum_value : rule.min_value;
  const maxValue = rule.max_value;
  const percentage = rule.percentage;

  if (ruleType === 'percentage') {
    amount = (baseAmount * (percentage || 0)) / 100;
  } else if (ruleType === 'fixed_value' || ruleType === 'fixed') {
    amount = fixedAmount || 0;
  } else if (ruleType === 'commission') {
    // Custom logic para comissão
    amount = (baseAmount * (percentage || 0)) / 100;
  }
  // "none" = 0

  // Aplicar min/max
  if (minValue && amount < minValue) {
    amount = minValue;
  }
  if (maxValue && amount > maxValue) {
    amount = maxValue;
  }

  return {
    ruleId: rule.id,
    amount: parseFloat(amount.toFixed(2)),
    percentage: rule.percentage || 0,
    type: ruleType,
  };
}

/**
 * Obtém todas as regras para um profissional
 * @param {string} professionalId
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function getProfessionalRevenueRules(professionalId, clinicId) {
  const { data, error } = await supabase
    .from('revenue_rules')
    .select(
      `
      id,
      rule_name,
      professional_id,
      service_id,
      repasse_type,
      percentage,
      fixed_amount,
      min_value,
      max_value,
      services(code, name)
    `,
    )
    .eq('professional_id', professionalId)
    .eq('clinic_id', clinicId)
    .eq('active', true);

  if (error) {
    throw error;
  }

  // Normalizar dados retornados
  return (data ?? []).map((rule) => ({
    ...rule,
    rule_type: rule.repasse_type,
    fixed_value: rule.fixed_amount,
    minimum_value: rule.min_value,
  }));
}

/**
 * Obtém todas as regras para um serviço
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function getServiceRevenueRules(serviceId, clinicId) {
  const { data, error } = await supabase
    .from('revenue_rules')
    .select(
      `
      id,
      rule_name,
      professional_id,
      service_id,
      repasse_type,
      percentage,
      fixed_amount,
      min_value,
      max_value,
      professionals(name, specialization)
    `,
    )
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .eq('active', true);

  if (error) {
    throw error;
  }

  // Normalizar dados retornados
  return (data ?? []).map((rule) => ({
    ...rule,
    rule_type: rule.repasse_type,
    fixed_value: rule.fixed_amount,
    minimum_value: rule.min_value,
  }));
}

/**
 * Conta quantas regras estão configuradas
 * @param {string} clinicId
 * @returns {Promise<number>}
 */
export async function countRevenueRules(clinicId) {
  const { count, error } = await supabase
    .from('revenue_rules')
    .select('id', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .eq('active', true);

  if (error) {
    throw error;
  }
  return count || 0;
}

/**
 * Simula cálculo de repasse com diferentes percentuais
 * @param {number} baseAmount
 * @param {Object} options - { percentage, min_value, max_value }
 * @returns {number}
 */
export function simulateRepasse(baseAmount, options = {}) {
  const { percentage = 0, min_value = 0, max_value = null } = options;

  let amount = (baseAmount * percentage) / 100;

  if (amount < min_value) {
    amount = min_value;
  }
  if (max_value && amount > max_value) {
    amount = max_value;
  }

  return parseFloat(amount.toFixed(2));
}

/**
 * Busca regras pelo tipo
 * @param {string} clinicId
 * @param {string} type - 'percentage', 'fixed_value', 'commission', 'none'
 * @returns {Promise<Array>}
 */
export async function getRulesByType(clinicId, type) {
  const { data, error } = await supabase
    .from('revenue_rules')
    .select(
      `
      id,
      professional_id,
      service_id,
      repasse_type,
      percentage,
      fixed_amount,
      professionals(name),
      services(name)
    `,
    )
    .eq('clinic_id', clinicId)
    .eq('repasse_type', type)
    .eq('active', true);

  if (error) {
    throw error;
  }
  return data ?? [];
}

// Alias para compatibilidade com páginas que chamam getRevenueRules
export const getRevenueRules = listRevenueRules;
