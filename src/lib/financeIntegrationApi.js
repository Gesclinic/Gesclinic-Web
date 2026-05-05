// src/lib/financeIntegrationApi.js
// ============================================================
// FINANCE INTEGRATION - Helpers para integrar repasses financeiros
// ============================================================
// Funções auxiliares para cálculos financeiros integrados

import * as revenueRulesApi from '@/lib/revenueRulesApi';
import * as servicepricesApi from '@/lib/servicepricesApi';
import * as healthInsurancesApi from '@/lib/healthInsurancesApi';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Calcula repasse automático baseado em regras
 * @param {Object} params
 * @returns {Promise<{repasse: number, rule: Object, breakdown: Object, warnings: Array}>}
 */
export async function calculateAutomaticRepasse(params) {
  const {
    clinicId,
    professionalId,
    serviceId,
    baseAmount,
    appointmentStatus = 'completed',
    healthInsuranceId,
  } = params;

  const warnings = [];

  try {
    // 1. Buscar preço do serviço
    let effectiveAmount = baseAmount;

    if (!baseAmount && serviceId) {
      const price = await servicepricesApi.getServicePrice(serviceId, clinicId, healthInsuranceId);
      effectiveAmount = price?.price || 0;
    }

    // 2. Calcular repasse pela regra
    const repasseData = await revenueRulesApi.calculateRepasse(
      professionalId,
      serviceId,
      clinicId,
      effectiveAmount,
      appointmentStatus,
    );

    // 3. Validar se há regra configurada
    if (!repasseData.ruleId) {
      warnings.push('Nenhuma regra de repasse configurada para este profissional');
    }

    // 4. Checar limites
    if (repasseData.amount < (repasseData.rule?.minimum_amount || 0)) {
      warnings.push(`Repasse abaixo do mínimo: R$ ${repasseData.rule?.minimum_amount || 0}`);
    }

    if (repasseData.rule?.maximum_amount && repasseData.amount > repasseData.rule.maximum_amount) {
      warnings.push(`Repasse acima do máximo: R$ ${repasseData.rule.maximum_amount}`);
    }

    return {
      repasse: repasseData.amount,
      rule: repasseData,
      breakdown: {
        baseAmount: effectiveAmount,
        percentage: repasseData.percentage,
        type: repasseData.type,
        calculatedAmount: repasseData.amount,
      },
      warnings,
      valid: warnings.length === 0,
    };
  } catch (error) {
    console.error('Erro ao calcular repasse:', error);
    return {
      repasse: baseAmount || 0,
      rule: null,
      breakdown: null,
      warnings: ['Erro ao calcular repasse automático'],
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Simula repasse sem salvar (para preview)
 * @param {number} baseAmount
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function simulateRepasse(baseAmount, options = {}) {
  try {
    const simulation = await revenueRulesApi.simulateRepasse(baseAmount, options);

    return {
      baseAmount,
      simulatedRepasse: simulation.amount,
      percentage: simulation.percentage,
      type: simulation.type,
      breakdown: {
        baseAmount,
        percentage: simulation.percentage,
        deduction: baseAmount - simulation.amount,
        finalAmount: simulation.amount,
      },
    };
  } catch (error) {
    console.error('Erro ao simular repasse:', error);
    return {
      baseAmount,
      simulatedRepasse: baseAmount,
      error: error.message,
    };
  }
}

/**
 * Busca todas as regras de repasse de um profissional
 * @param {string} clinicId
 * @param {string} professionalId
 * @returns {Promise<Array>}
 */
export async function getProfessionalRepasseRules(clinicId, professionalId) {
  try {
    const rules = await revenueRulesApi.getProfessionalRevenueRules(professionalId, clinicId);

    return rules.map((rule) => ({
      id: rule.id,
      type: rule.rule_type, // percentage, fixed_value, commission, none
      value: rule.rule_value,
      minimumAmount: rule.minimum_amount,
      maximumAmount: rule.maximum_amount,
      description: formatRuleDescription(rule),
      active: rule.active,
    }));
  } catch (error) {
    console.error('Erro ao buscar regras de repasse:', error);
    return [];
  }
}

/**
 * Busca preços de um serviço por convênio
 * @param {string} clinicId
 * @param {string} serviceId
 * @returns {Promise<Array>}
 */
export async function getServicePricesByInsurance(clinicId, serviceId) {
  try {
    const prices = await servicepricesApi.listServicePrices(serviceId, clinicId);

    return Promise.all(
      prices.map(async (price) => {
        let insuranceName = 'Particular';

        if (price.health_insurance_id) {
          const insurance = await healthInsurancesApi.getHealthInsurance(
            price.health_insurance_id,
            clinicId,
          );
          insuranceName = insurance?.name || 'Convênio';
        }

        return {
          id: price.id,
          insuranceId: price.health_insurance_id,
          insuranceName,
          price: price.price,
          currency: price.currency || 'BRL',
        };
      }),
    );
  } catch (error) {
    console.error('Erro ao buscar preços:', error);
    return [];
  }
}

/**
 * Busca convênios ativos para cálculos
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function getActiveHealthInsurances(clinicId) {
  try {
    const insurances = await healthInsurancesApi.listHealthInsurances(clinicId, {
      includeInactive: false,
    });

    return insurances.map((i) => ({
      id: i.id,
      name: i.name,
      code: i.code,
      requiresAuthorization: i.requires_authorization,
    }));
  } catch (error) {
    console.error('Erro ao buscar convênios:', error);
    return [];
  }
}

/**
 * Formata descrição legível de uma regra
 * @param {Object} rule
 * @returns {string}
 */
export function formatRuleDescription(rule) {
  const type = rule.rule_type || rule.type;

  switch (type) {
  case 'percentage':
    return `${rule.rule_value || rule.value}% de repasse`;
  case 'fixed_value':
    return `R$ ${(rule.rule_value || rule.value).toFixed(2)} fixo`;
  case 'commission':
    return `Comissão de ${rule.rule_value || rule.value}%`;
  case 'none':
    return 'Sem repasse';
  default:
    return 'Repasse personalizado';
  }
}

/**
 * Valida se profissional pode receber repasse
 * @param {string} clinicId
 * @param {string} professionalId
 * @returns {Promise<{valid: boolean, message: string, rules: Array}>}
 */
export async function validateProfessionalRepasseEligibility(clinicId, professionalId) {
  try {
    // Verificar se profissional existe e está ativo
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, active, name')
      .eq('id', professionalId)
      .eq('clinic_id', clinicId)
      .single();

    if (!professional || !professional.active) {
      return {
        valid: false,
        message: 'Profissional não encontrado ou inativo',
        rules: [],
      };
    }

    // Buscar regras
    const rules = await getProfessionalRepasseRules(clinicId, professionalId);

    if (rules.length === 0) {
      return {
        valid: true,
        message: 'Profissional elegível, mas sem regras configuradas',
        rules: [],
        warnings: ['Configure regras de repasse para este profissional'],
      };
    }

    return {
      valid: true,
      message: `${professional.name} possui ${rules.length} regra(s) de repasse`,
      rules,
    };
  } catch (error) {
    console.error('Erro ao validar elegibilidade:', error);
    return {
      valid: false,
      message: 'Erro ao validar elegibilidade',
      rules: [],
      error: error.message,
    };
  }
}

/**
 * Gera relatório de repasses estimados
 * @param {string} clinicId
 * @param {string} professionalId
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function generateRepasseReport(clinicId, professionalId, params = {}) {
  try {
    const { startDate, endDate, includeProcessed = true, includePending = true } = params;

    // Buscar appointments do profissional no período
    let query = supabase
      .from('appointments')
      .select('id, service_id, price, appointment_status, date')
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId)
      .eq('active', true);

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: appointments } = await query;

    if (!appointments || appointments.length === 0) {
      return {
        period: { startDate, endDate },
        totalAppointments: 0,
        totalAmount: 0,
        totalRepasse: 0,
        breakdown: [],
      };
    }

    // Calcular repasse para cada appointment
    const breakdown = await Promise.all(
      appointments.map(async (apt) => {
        const repasse = await calculateAutomaticRepasse({
          clinicId,
          professionalId,
          serviceId: apt.service_id,
          baseAmount: apt.price,
          appointmentStatus: apt.appointment_status,
        });

        return {
          appointmentId: apt.id,
          date: apt.date,
          baseAmount: apt.price,
          repasse: repasse.repasse,
          percentage: repasse.breakdown?.percentage,
        };
      }),
    );

    const totalAmount = breakdown.reduce((sum, item) => sum + item.baseAmount, 0);
    const totalRepasse = breakdown.reduce((sum, item) => sum + item.repasse, 0);

    return {
      period: { startDate, endDate },
      totalAppointments: appointments.length,
      totalAmount,
      totalRepasse,
      averageRepasse: totalRepasse / appointments.length,
      breakdown,
    };
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return {
      error: error.message,
      period: params,
      totalAppointments: 0,
      totalAmount: 0,
      totalRepasse: 0,
      breakdown: [],
    };
  }
}

/**
 * Formata valor monetário
 * @param {number} value
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(value, currency = 'BRL') {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  });
  return formatter.format(value);
}
