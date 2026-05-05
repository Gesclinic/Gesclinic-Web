/**
 * retentionCalculatorApi.js
 *
 * Calcula retenções de impostos baseado em:
 * - Tipo de pagador (particular, convênio, empresa)
 * - Valor bruto do atendimento
 * - Código do serviço
 *
 * Padrão: Tabela de retenções de serviços (Lei 116/2003 - NFSe)
 *
 * ESTRUTURA DE RETENÇÕES:
 * ├─ ISS (Imposto sobre Serviços) - SEMPRE
 * ├─ PIS (Programa de Integração Social) - Se convênio/empresa
 * ├─ COFINS (Contribuição para Financiamento da Seguridade Social) - Se convênio/empresa
 * ├─ CSLL (Contribuição Social sobre o Lucro Líquido) - Se empresa
 * ├─ IRRF (Imposto de Renda Retido na Fonte) - Se empresa (opcional)
 * ├─ CBS (Contribuição sobre Bens e Serviços) - Futuro (2026+)
 * └─ IBS (Imposto sobre Bens e Serviços) - Futuro (2026+)
 */

// ALÍQUOTAS PADRÃO POR TIPO DE PAGADOR
const RETENTION_RATES = {
  // Tipo: particular (paciente direto)
  patient: {
    iss: 0.05, // 5% (varia por município, 3-5% comum)
    pis: 0,
    cofins: 0,
    csll: 0,
    irrf: 0,
    cbs: 0,
    ibs: 0,
  },

  // Tipo: convênio/seguro de saúde
  insurance: {
    iss: 0.05, // 5% (retenção na fonte)
    pis: 0.0165, // 1.65%
    cofins: 0.076, // 7.6%
    csll: 0, // Não incide em convênios
    irrf: 0, // Não incide em convênios
    cbs: 0, // Futuro
    ibs: 0, // Futuro
  },

  // Tipo: empresa (pagador jurídico - ex: corporate)
  company: {
    iss: 0.05, // 5%
    pis: 0.0165, // 1.65%
    cofins: 0.076, // 7.6%
    csll: 0.09, // 9% (Contribuição Social)
    irrf: 0, // Pode variar, geralmente 0 para empresas
    cbs: 0, // Futuro
    ibs: 0, // Futuro
  },
};

// ALÍQUOTAS FUTURAS (2026+) - Reforma Tributária
const FUTURE_RATES = {
  cbs: 0, // CBS será gradualmente implementada
  ibs: 0, // IBS será gradualmente implementada
};

/**
 * Calcula retenções de impostos para um atendimento
 *
 * @param {number} grossValue - Valor bruto do atendimento
 * @param {string} payerType - Tipo de pagador ('patient', 'insurance', 'company')
 * @param {object} options - Opções adicionais
 * @param {boolean} options.includeIRRF - Incluir IRRF mesmo para empresa (default: false)
 * @param {number} options.customISS - Alíquota ISS customizada (0-1)
 *
 * @returns {object} Objeto com retenções calculadas
 */
export const calcularRetencoes = (grossValue = 0, payerType = 'patient', options = {}) => {
  const value = parseFloat(grossValue) || 0;

  // Validar tipo de pagador
  const normalizedPayerType = payerType?.toLowerCase() || 'patient';
  const rates = RETENTION_RATES[normalizedPayerType] || RETENTION_RATES.patient;

  // Permitir ISS customizado (por município)
  const issRate = options.customISS !== undefined ? parseFloat(options.customISS) : rates.iss;

  // Calcular cada retenção
  const retencoes = {
    // Sempre incluir ISS
    iss: {
      rate: issRate,
      value: parseFloat((value * issRate).toFixed(2)),
      description: 'Imposto sobre Serviços',
      mandatory: true,
    },

    // PIS - Se convênio ou empresa
    pis: {
      rate: rates.pis,
      value: parseFloat((value * rates.pis).toFixed(2)),
      description: 'Programa de Integração Social',
      mandatory: false,
      showOnly: rates.pis > 0,
    },

    // COFINS - Se convênio ou empresa
    cofins: {
      rate: rates.cofins,
      value: parseFloat((value * rates.cofins).toFixed(2)),
      description: 'COFINS',
      mandatory: false,
      showOnly: rates.cofins > 0,
    },

    // CSLL - Se empresa
    csll: {
      rate: rates.csll,
      value: parseFloat((value * rates.csll).toFixed(2)),
      description: 'Contribuição Social Lucro Líquido',
      mandatory: false,
      showOnly: rates.csll > 0,
    },

    // IRRF - Se empresa e habilitado
    irrf: {
      rate: options.includeIRRF ? rates.irrf : 0,
      value: options.includeIRRF ? parseFloat((value * rates.irrf).toFixed(2)) : 0,
      description: 'Imposto de Renda Retido na Fonte',
      mandatory: false,
      showOnly: options.includeIRRF && rates.irrf > 0,
    },

    // CBS - Futuro (2026+)
    cbs: {
      rate: FUTURE_RATES.cbs,
      value: 0,
      description: 'Contribuição sobre Bens e Serviços (Futuro)',
      mandatory: false,
      showOnly: false,
      isFuture: true,
    },

    // IBS - Futuro (2026+)
    ibs: {
      rate: FUTURE_RATES.ibs,
      value: 0,
      description: 'Imposto sobre Bens e Serviços (Futuro)',
      mandatory: false,
      showOnly: false,
      isFuture: true,
    },
  };

  // Calcular totais
  const totalRate = Object.values(retencoes).reduce((sum, r) => sum + r.rate, 0);
  const totalValue = Object.values(retencoes).reduce((sum, r) => sum + r.value, 0);

  return {
    // Dados de entrada
    grossValue: value,
    payerType: normalizedPayerType,

    // Retenções individuais
    retencoes,

    // Totais
    totalRate: parseFloat(totalRate.toFixed(4)),
    totalValue: parseFloat(totalValue.toFixed(2)),

    // Valor líquido (após retenções)
    netValue: parseFloat((value - totalValue).toFixed(2)),

    // Meta-informações
    hasRetencoes: totalValue > 0,
    requiresRetention: normalizedPayerType !== 'patient',
  };
};

/**
 * Retorna retenções para exibição na UI (filtradas)
 * Mostra apenas retenções com valor > 0
 *
 * @param {object} retencoes - Objeto de retenções do calcularRetencoes
 * @returns {array} Array com retenções a exibir
 */
export const getRetencoesPorExibir = (retencoes = {}) => {
  return Object.entries(retencoes.retencoes || {})
    .filter(([_, retenção]) => {
      // Mostrar se:
      // 1. Tem valor > 0 OU
      // 2. É obrigatório (ISS sempre aparece)
      return retenção.value > 0 || retenção.mandatory;
    })
    .map(([key, retenção]) => ({
      key,
      ...retenção,
    }))
    .sort((a, b) => {
      // Ordenar: ISS primeiro, depois por valor (descendente)
      if (a.key === 'iss') {
        return -1;
      }
      if (b.key === 'iss') {
        return 1;
      }
      return b.value - a.value;
    });
};

/**
 * Formata retenção para exibição em moeda
 *
 * @param {object} retenção - Objeto de retenção
 * @returns {string} String formatada "10% - R$ 150,00"
 */
export const formatarRetencao = (retenção = {}) => {
  const percent = (retenção.rate * 100).toFixed(2);
  const value = retenção.value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  return `${percent}% = ${value}`;
};

/**
 * Valida se retenções estão configuradas corretamente
 *
 * @param {string} payerType - Tipo de pagador
 * @returns {object} Validação com status e mensagens
 */
export const validarRetencoes = (payerType = 'patient') => {
  const normalizedPayerType = payerType?.toLowerCase() || 'patient';
  const rates = RETENTION_RATES[normalizedPayerType];

  if (!rates) {
    return {
      isValid: false,
      error: `Tipo de pagador inválido: ${payerType}`,
      validTypes: Object.keys(RETENTION_RATES),
    };
  }

  return {
    isValid: true,
    payerType: normalizedPayerType,
    aliquotas: rates,
  };
};

/**
 * Resumo de retenções em texto legível
 *
 * @param {object} retencoes - Objeto completo de retenções
 * @returns {string} Resumo em formato texto
 */
export const resumoRetencoes = (retencoes = {}) => {
  if (!retencoes.hasRetencoes) {
    return `Sem retenções (Tipo: ${retencoes.payerType})`;
  }

  const exibir = getRetencoesPorExibir(retencoes);
  const linhas = [
    `Retenções para ${retencoes.payerType}:`,
    ...exibir.map((r) => `  • ${r.description}: ${formatarRetencao(r)}`),
    `Total retido: ${retencoes.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
  ];

  return linhas.join('\n');
};

export default {
  calcularRetencoes,
  getRetencoesPorExibir,
  formatarRetencao,
  validarRetencoes,
  resumoRetencoes,
};
