/**
 * src/lib/taxCalculationEngine.ts
 * Motor de cálculo de impostos para ETAPA 1 v2.0
 * Suporta: PIS, COFINS, CSLL, IR, ISSQN
 */

import { customSupabaseClient } from './customSupabaseClient';

export interface TaxCalculationInput {
  grossValue: number; // Valor bruto do atendimento
  clinicId: string;
  payerType: 'CONVENIO' | 'PARTICULAR';
  payerId?: string; // health_plan_id ou client_id
  discountPercent?: number; // Sobrescreve regra
}

export interface TaxCalculationOutput {
  grossValue: number;
  discountValue: number;
  discountPercent: number;

  // Impostos individualizados
  pisPercent: number;
  pisValue: number;

  cofinsPercent: number;
  cofinsValue: number;

  csllPercent: number;
  csllValue: number;

  irPercent: number;
  irValue: number;

  issqnPercent: number;
  issqnValue: number;

  // Totais
  totalImpostos: number;
  netValue: number;

  // Metadados
  taxRegime: string;
  payerRuleId: number | null;
  retentions: {
    retainsIST: boolean;
    retainsIR: boolean;
    retainsPIS: boolean;
    retainsCOFINS: boolean;
  };
}

/**
 * Busca as configurações de imposto da clínica
 */
async function fetchTaxConfiguration(clinicId: string) {
  const { data, error } = await customSupabaseClient
    .from('tax_configurations')
    .select('*')
    .eq('clinic_id', clinicId)
    .single();

  if (error) {
    console.warn('No tax configuration found, using defaults:', error);
    return getDefaultTaxConfiguration();
  }

  return data;
}

/**
 * Busca a regra de faturamento para o pagador
 */
async function fetchPayerRule(
  clinicId: string,
  payerType: 'CONVENIO' | 'PARTICULAR',
  payerId?: string
) {
  try {
    let query = customSupabaseClient
      .from('appointment_payer_rules')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('payer_type', payerType);

    if (payerType === 'CONVENIO' && payerId) {
      query = query.eq('health_plan_id', payerId);
    } else if (payerType === 'PARTICULAR' && payerId) {
      query = query.eq('client_id', payerId);
    } else if (payerType === 'PARTICULAR') {
      // Busca regra padrão para particulares
      query = query.is('client_id', null);
    }

    const { data, error } = await query.single();

    if (error) {
      console.warn('No payer rule found:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching payer rule:', error);
    return null;
  }
}

/**
 * Retorna configuração padrão de impostos
 */
function getDefaultTaxConfiguration() {
  return {
    tax_regime: 'simples_nacional',
    default_pis_percent: 1.65,
    default_cofins_percent: 7.60,
    default_csll_percent: 9.00,
    default_ir_percent: 15.00,
    issqn_percent: 5.00,
    presumed_profit_margin: 32.00,
  };
}

/**
 * Calcula CSLL (Contribuição Social sobre Lucro Líquido)
 * Varia conforme o regime tributário
 */
function calculateCSLL(
  grossValue: number,
  baseDiscount: number,
  csllPercent: number,
  taxRegime: string,
  presumedMargin: number
): number {
  const baseForCSLL = grossValue - baseDiscount;

  if (taxRegime === 'lucro_presumido') {
    // Lucro Presumido: CSLL sobre margem presumida
    const presumedProfit = baseForCSLL * (presumedMargin / 100);
    return presumedProfit * (csllPercent / 100);
  }

  // Lucro Real e Simples Nacional: percentual sobre a base
  return baseForCSLL * (csllPercent / 100);
}

/**
 * Calcula IR (Imposto de Renda)
 * Varia conforme o regime tributário
 */
function calculateIR(
  grossValue: number,
  baseDiscount: number,
  irPercent: number,
  taxRegime: string,
  presumedMargin: number
): number {
  const baseForIR = grossValue - baseDiscount;

  if (taxRegime === 'lucro_presumido') {
    // Lucro Presumido: IR sobre margem presumida
    const presumedProfit = baseForIR * (presumedMargin / 100);
    return presumedProfit * (irPercent / 100);
  }

  // Lucro Real e Simples Nacional: percentual sobre a base
  return baseForIR * (irPercent / 100);
}

/**
 * Função Principal: Calcula todos os impostos
 */
export async function calculateTaxes(
  input: TaxCalculationInput
): Promise<TaxCalculationOutput> {
  // 1. Buscar configurações
  const taxConfig = await fetchTaxConfiguration(input.clinicId);
  const payerRule = await fetchPayerRule(
    input.clinicId,
    input.payerType,
    input.payerId
  );

  // 2. Determinar percentuais (regra sobrescreve config)
  const pisPercent = payerRule?.pis_percent ?? taxConfig.default_pis_percent;
  const cofinsPercent = payerRule?.cofins_percent ?? taxConfig.default_cofins_percent;
  const csllPercent = payerRule?.csll_percent ?? taxConfig.default_csll_percent;
  const irPercent = payerRule?.ir_percent ?? taxConfig.default_ir_percent;
  const issqnPercent = payerRule?.issqn_percent ?? taxConfig.issqn_percent;

  // 3. Calcular desconto
  const discountPercent = input.discountPercent ?? payerRule?.discount_percent ?? 0;
  const discountValue =
    input.grossValue *
    (discountPercent / 100);

  const baseAfterDiscount = input.grossValue - discountValue;

  // 4. Calcular cada imposto
  const pisValue = baseAfterDiscount * (pisPercent / 100);
  const cofinsValue = baseAfterDiscount * (cofinsPercent / 100);
  const issqnValue = baseAfterDiscount * (issqnPercent / 100);

  // CSLL e IR variam por regime tributário
  const csllValue = calculateCSLL(
    input.grossValue,
    discountValue,
    csllPercent,
    taxConfig.tax_regime,
    taxConfig.presumed_profit_margin
  );

  const irValue = calculateIR(
    input.grossValue,
    discountValue,
    irPercent,
    taxConfig.tax_regime,
    taxConfig.presumed_profit_margin
  );

  // 5. Aplicar retenções se necessário
  const retentions = {
    retainsIST: payerRule?.retains_ist ?? taxConfig.retains_ist_on_particulars,
    retainsIR: payerRule?.retains_ir ?? taxConfig.retains_ir_on_health_plans,
    retainsPIS: payerRule?.retains_pis ?? taxConfig.retains_pis_on_particulars,
    retainsCOFINS: payerRule?.retains_cofins ?? false,
  };

  // Descontar retenções se aplicável
  let totalImpostos = pisValue + cofinsValue + csllValue + irValue + issqnValue;
  if (retentions.retainsIR) totalImpostos += irValue; // Adiciona retenção
  if (retentions.retainsPIS) totalImpostos += pisValue;

  // 6. Calcular valor líquido
  const netValue = input.grossValue - discountValue - totalImpostos;

  return {
    grossValue: input.grossValue,
    discountValue: Number(discountValue.toFixed(2)),
    discountPercent: discountPercent,

    pisPercent: Number(pisPercent.toFixed(2)),
    pisValue: Number(pisValue.toFixed(2)),

    cofinsPercent: Number(cofinsPercent.toFixed(2)),
    cofinsValue: Number(cofinsValue.toFixed(2)),

    csllPercent: Number(csllPercent.toFixed(2)),
    csllValue: Number(csllValue.toFixed(2)),

    irPercent: Number(irPercent.toFixed(2)),
    irValue: Number(irValue.toFixed(2)),

    issqnPercent: Number(issqnPercent.toFixed(2)),
    issqnValue: Number(issqnValue.toFixed(2)),

    totalImpostos: Number(totalImpostos.toFixed(2)),
    netValue: Number(netValue.toFixed(2)),

    taxRegime: taxConfig.tax_regime,
    payerRuleId: payerRule?.id ?? null,
    retentions,
  };
}

/**
 * Exemplo de uso:
 *
 * const result = await calculateTaxes({
 *   grossValue: 1000,
 *   clinicId: 'xxxx',
 *   payerType: 'PARTICULAR',
 * });
 *
 * console.log(`
 *   Bruto: R$ ${result.grossValue}
 *   Desconto: R$ ${result.discountValue}
 *   PIS: R$ ${result.pisValue}
 *   COFINS: R$ ${result.cofinsValue}
 *   CSLL: R$ ${result.csllValue}
 *   IR: R$ ${result.irValue}
 *   ISSQN: R$ ${result.issqnValue}
 *   ─────────────
 *   Líquido: R$ ${result.netValue}
 * `);
 */
