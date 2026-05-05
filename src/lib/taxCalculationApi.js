// ============================================================
// TAX CALCULATION API - ITEM-BY-ITEM WITH HOSPITAL EQUIVALENCE
//
// Equiparação hospitalar é definida NO SERVIÇO, não na clínica
// Cada invoice_item herda a regra tributária do seu serviço
//
// FLUXO:
// 1. Serviço é marcado como is_hospital_service = true/false
// 2. Ao criar invoice_item, sincroniza is_hospital_service
// 3. Cálculo tributário é feito item-by-item
// 4. NF consolida soma de todos os itens
// ============================================================

import { supabase } from './customSupabaseClient';

// ===== CONSTANTES DE ALÍQUOTAS =====

const TAX_RATES = {
  SIMPLES_NACIONAL: {
    DEFAULT: 9.0, // Alíquota média
    DESCRIPTION: 'Simples Nacional (9% médio)',
    ICON: 'TrendingUp',
  },
  LUCRO_PRESUMIDO: {
    IRPJ_RATE: 15.0, // % sobre base
    CSLL_RATE: 9.0, // % sobre base
    PIS_RATE: 0.65, // ✅ CORRIGIDO: era 1.65% (ERRADO)
    COFINS_RATE: 3.0, // ✅ CORRIGIDO: era 7.5% (ERRADO)
    IRPJ_BASE_NORMAL: 32.0,
    IRPJ_BASE_HOSPITAL: 8.0, // Equiparação: redução 75%
    CSLL_BASE_NORMAL: 32.0,
    CSLL_BASE_HOSPITAL: 12.0, // Equiparação: redução 62.5% (base reduzida de 32% para 12%)
    DESCRIPTION: 'Lucro Presumido',
    ICON: 'BarChart3',
  },
  LUCRO_REAL: {
    IRPJ_RATE: 15.0,
    CSLL_RATE: 9.0,
    PIS_RATE: 0.65, // ✅ CORRIGIDO: era 1.65% (ERRADO)
    COFINS_RATE: 3.0, // ✅ CORRIGIDO: era 7.5% (ERRADO)
    PROFIT_BASE_NORMAL: 20.0, // 20% de lucro estimado
    PROFIT_BASE_HOSPITAL: 5.0, // ~25% redução com equiparação
    DESCRIPTION: 'Lucro Real',
    ICON: 'PieChart',
  },
  MUNICIPAL_ISS: 3.0, // Default, pode variar
};

// ===== FUNÇÃO CENTRAL: CALCULAR TRIBUTOS DE UM ITEM =====

/**
 * Calcula tributos de um item individual com suporte a equiparação hospitalar
 *
 * @param {Object} params
 * @param {number} params.amount - Valor bruto do serviço
 * @param {boolean} params.isHospitalService - Se serviço tem equiparação
 * @param {string} params.taxRegime - Regime: 'simples_nacional', 'lucro_presumido', 'lucro_real'
 * @param {number} params.issRate - ⚠️ Alíquota municipal ISS (VARIÁVEL POR MUNICÍPIO - default: 3%)
 *   Exemplos: RJ=3%, SP=2%, MG=4%, etc. OBRIGATÓRIO consultar prefeitura local
 * @param {number} params.pisRate - Alíquota PIS federal (fixed: 0.65%)
 * @param {number} params.cofinsRate - Alíquota COFINS federal (fixed: 3.0%)
 *
 * @returns {Object} Objeto com breakdown de tributos
 */
export function calculateItemTaxes({
  amount,
  isHospitalService = false,
  taxRegime = 'lucro_presumido',
  issRate = TAX_RATES.MUNICIPAL_ISS, // ⚠️ ISS É MUNICIPAL - Varia por localidade
  pisRate = TAX_RATES.LUCRO_PRESUMIDO.PIS_RATE, // PIS Federal - Fixo
  cofinsRate = TAX_RATES.LUCRO_PRESUMIDO.COFINS_RATE, // COFINS Federal - Fixo
}) {
  if (!amount || amount <= 0) {
    return {
      amount: 0,
      taxBase: 0,
      irpj: { value: 0, rate: 0 },
      csll: { value: 0, rate: 0 },
      pis: { value: 0, rate: pisRate },
      cofins: { value: 0, rate: cofinsRate },
      iss: { value: 0, rate: issRate },
      totalTaxes: 0,
      netAmount: 0,
      effectiveRate: 0,
      taxRegime,
      isHospitalService,
      breakdown: {},
    };
  }

  const result = {
    amount,
    taxRegime,
    isHospitalService,
    breakdown: {},
  };

  // ===== SIMPLES NACIONAL =====
  if (taxRegime === 'simples_nacional') {
    const irpjValue = roundMoney(amount * (TAX_RATES.SIMPLES_NACIONAL.DEFAULT / 100));
    const issValue = roundMoney(amount * (issRate / 100));

    result.taxBase = amount;
    result.irpj = { value: irpjValue, rate: TAX_RATES.SIMPLES_NACIONAL.DEFAULT };
    result.csll = { value: 0, rate: 0 };
    result.pis = { value: 0, rate: 0 };
    result.cofins = { value: 0, rate: 0 };
    result.iss = { value: issValue, rate: issRate };
    result.breakdown = {
      simpleNacionalBase: amount,
      simpleNacionalRate: TAX_RATES.SIMPLES_NACIONAL.DEFAULT,
    };
  }

  // ===== LUCRO PRESUMIDO =====
  else if (taxRegime === 'lucro_presumido') {
    const irpjBase = isHospitalService
      ? amount * (TAX_RATES.LUCRO_PRESUMIDO.IRPJ_BASE_HOSPITAL / 100)
      : amount * (TAX_RATES.LUCRO_PRESUMIDO.IRPJ_BASE_NORMAL / 100);

    const csllBase = isHospitalService
      ? amount * (TAX_RATES.LUCRO_PRESUMIDO.CSLL_BASE_HOSPITAL / 100)
      : amount * (TAX_RATES.LUCRO_PRESUMIDO.CSLL_BASE_NORMAL / 100);

    const irpjValue = roundMoney(irpjBase * (TAX_RATES.LUCRO_PRESUMIDO.IRPJ_RATE / 100));
    const csllValue = roundMoney(csllBase * (TAX_RATES.LUCRO_PRESUMIDO.CSLL_RATE / 100));
    const pisValue = roundMoney(amount * (pisRate / 100));
    const cofinsValue = roundMoney(amount * (cofinsRate / 100));
    const issValue = roundMoney(amount * (issRate / 100));

    const effectiveIrpjRate = (irpjValue / amount) * 100;
    const effectiveCsllRate = (csllValue / amount) * 100;

    result.taxBase = amount;
    result.irpj = { value: irpjValue, rate: effectiveIrpjRate };
    result.csll = { value: csllValue, rate: effectiveCsllRate };
    result.pis = { value: pisValue, rate: pisRate };
    result.cofins = { value: cofinsValue, rate: cofinsRate };
    result.iss = { value: issValue, rate: issRate };
    result.breakdown = {
      irpjBase: irpjBase,
      irpjBasePercentage: isHospitalService
        ? TAX_RATES.LUCRO_PRESUMIDO.IRPJ_BASE_HOSPITAL
        : TAX_RATES.LUCRO_PRESUMIDO.IRPJ_BASE_NORMAL,
      csllBase: csllBase,
      csllBasePercentage: isHospitalService
        ? TAX_RATES.LUCRO_PRESUMIDO.CSLL_BASE_HOSPITAL
        : TAX_RATES.LUCRO_PRESUMIDO.CSLL_BASE_NORMAL,
      isHospitalEquivalenceApplied: isHospitalService,
    };
  }

  // ===== LUCRO REAL =====
  else if (taxRegime === 'lucro_real') {
    const profitBase = isHospitalService
      ? amount * (TAX_RATES.LUCRO_REAL.PROFIT_BASE_HOSPITAL / 100)
      : amount * (TAX_RATES.LUCRO_REAL.PROFIT_BASE_NORMAL / 100);

    const irpjValue = roundMoney(profitBase * (TAX_RATES.LUCRO_REAL.IRPJ_RATE / 100));
    const csllValue = roundMoney(profitBase * (TAX_RATES.LUCRO_REAL.CSLL_RATE / 100));
    const pisValue = roundMoney(amount * (pisRate / 100));
    const cofinsValue = roundMoney(amount * (cofinsRate / 100));
    const issValue = roundMoney(amount * (issRate / 100));

    const effectiveIrpjRate = (irpjValue / amount) * 100;
    const effectiveCsllRate = (csllValue / amount) * 100;

    result.taxBase = profitBase;
    result.irpj = { value: irpjValue, rate: effectiveIrpjRate };
    result.csll = { value: csllValue, rate: effectiveCsllRate };
    result.pis = { value: pisValue, rate: pisRate };
    result.cofins = { value: cofinsValue, rate: cofinsRate };
    result.iss = { value: issValue, rate: issRate };
    result.breakdown = {
      profitBase: profitBase,
      profitBasePercentage: isHospitalService
        ? TAX_RATES.LUCRO_REAL.PROFIT_BASE_HOSPITAL
        : TAX_RATES.LUCRO_REAL.PROFIT_BASE_NORMAL,
      isHospitalEquivalenceApplied: isHospitalService,
    };
  }

  // Calcular totais
  const totalTaxes =
    result.irpj.value +
    result.csll.value +
    result.pis.value +
    result.cofins.value +
    result.iss.value;
  const netAmount = amount - totalTaxes;
  const effectiveRate = (totalTaxes / amount) * 100;

  return {
    ...result,
    totalTaxes: roundMoney(totalTaxes),
    netAmount: roundMoney(netAmount),
    effectiveRate: roundDecimals(effectiveRate, 2),
  };
}

// ===== FUNÇÃO: CALCULAR TRIBUTOS DE UMA NF INTEIRA (MÚLTIPLOS ITENS) =====

/**
 * Calcula tributos consolidados de uma NF baseado em seus itens
 * Suporta serviços mistos (com e sem equiparação)
 *
 * @param {string} invoiceId - ID da NF
 * @param {string} clinicId - ID da clínica (para pegar regime tributário)
 * @param {Array} items - Array de itens com { serviceId, amount, isHospitalService }
 *
 * @returns {Object} Tributos consolidados da NF
 */
export async function calculateInvoiceTaxes(invoiceId, clinicId, items = []) {
  try {
    // Buscar dados da clínica
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('tax_regime, iss_rate, estimated_profit_margin')
      .eq('id', clinicId)
      .single();

    if (clinicError) {
      throw new Error(`Clinic not found: ${clinicError.message}`);
    }

    const taxRegime = clinic.tax_regime || 'lucro_presumido';
    const issRate = clinic.iss_rate || TAX_RATES.MUNICIPAL_ISS;

    // Calcular tributos de cada item
    const consolidatedTaxes = {
      invoiceId,
      clinicId,
      taxRegime,
      grossAmount: 0,
      itemCount: 0,
      hospitalServiceCount: 0,
      normalServiceCount: 0,
      itemsTaxes: [],
      summary: {
        irpj: 0,
        csll: 0,
        pis: 0,
        cofins: 0,
        iss: 0,
        total: 0,
      },
      breakdown: {
        itemsWithEquivalence: 0,
        itemsWithoutEquivalence: 0,
      },
    };

    if (!items || items.length === 0) {
      return consolidatedTaxes;
    }

    // Processar cada item
    for (const item of items) {
      const itemTaxes = calculateItemTaxes({
        amount: item.amount,
        isHospitalService: item.isHospitalService || false,
        taxRegime,
        issRate,
      });

      consolidatedTaxes.itemsTaxes.push({
        serviceId: item.serviceId,
        ...itemTaxes,
      });

      consolidatedTaxes.grossAmount += item.amount;
      consolidatedTaxes.itemCount++;

      if (item.isHospitalService) {
        consolidatedTaxes.hospitalServiceCount++;
        consolidatedTaxes.breakdown.itemsWithEquivalence++;
      } else {
        consolidatedTaxes.normalServiceCount++;
        consolidatedTaxes.breakdown.itemsWithoutEquivalence++;
      }

      consolidatedTaxes.summary.irpj += itemTaxes.irpj.value;
      consolidatedTaxes.summary.csll += itemTaxes.csll.value;
      consolidatedTaxes.summary.pis += itemTaxes.pis.value;
      consolidatedTaxes.summary.cofins += itemTaxes.cofins.value;
      consolidatedTaxes.summary.iss += itemTaxes.iss.value;
    }

    consolidatedTaxes.summary.total = roundMoney(
      consolidatedTaxes.summary.irpj +
        consolidatedTaxes.summary.csll +
        consolidatedTaxes.summary.pis +
        consolidatedTaxes.summary.cofins +
        consolidatedTaxes.summary.iss,
    );

    consolidatedTaxes.netAmount = roundMoney(
      consolidatedTaxes.grossAmount - consolidatedTaxes.summary.total,
    );

    consolidatedTaxes.effectiveRate = roundDecimals(
      (consolidatedTaxes.summary.total / consolidatedTaxes.grossAmount) * 100,
      2,
    );

    return consolidatedTaxes;
  } catch (error) {
    console.error('Error calculating invoice taxes:', error);
    throw error;
  }
}

// ===== FUNÇÃO: RECALCULAR TRIBUTOS DE UMA NF (DATABASE) =====

/**
 * Chama stored procedure do PostgreSQL para recalcular tributação de uma NF
 * Esta função atualiza os campos tax_* de todos os invoice_items
 *
 * @param {string} invoiceId - ID da NF
 * @returns {boolean} true se sucesso
 */
export async function recalculateInvoiceTaxesInDatabase(invoiceId) {
  try {
    const { data, error } = await supabase.rpc('sp_recalculate_invoice_taxes', {
      p_invoice_id: invoiceId,
    });

    if (error) {
      throw error;
    }

    console.log(`Taxes recalculated for invoice ${invoiceId}`);
    return true;
  } catch (error) {
    console.error('Error recalculating invoice taxes:', error);
    throw error;
  }
}

// ===== FUNÇÃO: COMPARAR REGIMES TRIBUTÁRIOS =====

/**
 * Compara carga tributária entre os 3 regimes para um item/NF
 *
 * @param {number} amount - Valor do serviço
 * @param {boolean} isHospitalService - Se tem equiparação
 * @param {number} issRate - Alíquota municipal
 *
 * @returns {Array} Array com 3 regimes e recomendação
 */
export function compareTaxRegimes(
  amount,
  isHospitalService = false,
  issRate = TAX_RATES.MUNICIPAL_ISS,
) {
  const results = [
    {
      regime: 'simples_nacional',
      label: 'Simples Nacional',
      icon: 'TrendingUp',
      color: 'from-blue-50 to-blue-100',
      ...calculateItemTaxes({
        amount,
        isHospitalService,
        taxRegime: 'simples_nacional',
        issRate,
      }),
    },
    {
      regime: 'lucro_presumido',
      label: 'Lucro Presumido',
      icon: 'BarChart3',
      color: 'from-emerald-50 to-emerald-100',
      ...calculateItemTaxes({
        amount,
        isHospitalService,
        taxRegime: 'lucro_presumido',
        issRate,
      }),
    },
    {
      regime: 'lucro_real',
      label: 'Lucro Real',
      icon: 'PieChart',
      color: 'from-purple-50 to-purple-100',
      ...calculateItemTaxes({
        amount,
        isHospitalService,
        taxRegime: 'lucro_real',
        issRate,
      }),
    },
  ];

  // Ordenar por menor carga tributária
  results.sort((a, b) => a.totalTaxes - b.totalTaxes);

  // Marcar recomendado
  results[0].recommended = true;
  results[0].recommendation = 'Menor carga tributária';

  return results;
}

// ===== FUNÇÃO: MARCAR SERVIÇO COMO HOSPITALAR =====

/**
 * Marca/desmarca um serviço como elegível para equiparação hospitalar
 *
 * @param {string} serviceId - ID do serviço
 * @param {boolean} isHospital - true/false
 * @returns {Object} Serviço atualizado
 */
export async function setServiceAsHospital(serviceId, isHospital = true) {
  try {
    const { data, error } = await supabase
      .from('services')
      .update({
        is_hospital_service: isHospital,
        tax_profile: isHospital ? 'equiparado' : 'nao_equiparado',
      })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`Service ${serviceId} updated: is_hospital_service = ${isHospital}`);
    return data;
  } catch (error) {
    console.error('Error updating service hospital status:', error);
    throw error;
  }
}

// ===== FUNÇÃO: LISTAR SERVIÇOS HOSPITALARES =====

/**
 * Lista todos os serviços de uma clínica que têm equiparação hospitalar
 *
 * @param {string} clinicId - ID da clínica
 * @returns {Array} Serviços com equiparação
 */
export async function listHospitalServices(clinicId) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, is_hospital_service, tax_profile')
      .eq('clinic_id', clinicId)
      .eq('is_hospital_service', true)
      .order('name');

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error listing hospital services:', error);
    throw error;
  }
}

// ===== FUNÇÃO: OBTER RESUMO DE TRIBUTOS DE UMA NF =====

/**
 * Busca resumo consolidado de tributos de uma NF usando view
 *
 * @param {string} invoiceId - ID da NF
 * @returns {Object} Resumo com totais
 */
export async function getInvoiceTaxSummary(invoiceId) {
  try {
    const { data, error } = await supabase
      .from('vw_invoice_tax_summary')
      .select('*')
      .eq('invoice_id', invoiceId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching invoice tax summary:', error);
    throw error;
  }
}

// ===== FUNÇÕES UTILITÁRIAS =====

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function roundDecimals(value, decimals = 2) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export { TAX_RATES };
