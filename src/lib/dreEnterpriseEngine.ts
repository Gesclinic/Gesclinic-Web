/**
 * DRE Enterprise Hospitalar 360 - Engine Central de Cálculos
 * 
 * Responsabilidades:
 * 1. Calcular DRE em 7 variantes (Gerencial, Contábil, Centro, Médico, Convênio, Unidade, Projetada)
 * 2. Drill-down por critério (convênio → guia → paciente)
 * 3. Comparar períodos e gerar deltas
 * 4. Integrar com projectionEngine para projeções
 * 5. Cache de cálculos para performance
 * 
 * Data: 2026-06-20
 */

import { supabase } from '@/lib/customSupabaseClient';
import { listReceivables } from '@/lib/receivablesApi';
import { listAPQuery } from '@/lib/financeApi';
import { getFinancialConsolidation } from '@/lib/financialConsolidationApi';
import { computeAllScenarios, type ScenarioResult, type ScenarioType } from '@/modules/financeiro/fluxo-caixa/services/projectionEngine';

const money = (value: any): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safePercent = (value: number, base: number): number => {
  if (!base) return 0;
  return (value / base) * 100;
};

const isPaidStatus = (status: any): boolean => {
  const normalized = String(status || '').toLowerCase();
  return ['paid', 'pago', 'partial', 'partially_paid'].includes(normalized);
};

const isActiveAccrualStatus = (status: any): boolean => {
  const normalized = String(status || '').trim().toLowerCase();
  return !['canceled', 'cancelled', 'cancelado', 'cancelada', 'void', 'estornado', 'estornada'].includes(normalized);
};

const getReceivableValue = (row: any): number =>
  money(
    row?.valor_liquido
    ?? row?.net_value
    ?? row?.net_amount
    ?? row?.valor_bruto
    ?? row?.gross_value
    ?? row?.gross_amount
    ?? row?.amount
    ?? row?.value
    ?? row?.total_amount
    ?? row?.valor
    ?? row?.valor_recebido
    ?? row?.paid_amount
  );

const getPayableValue = (row: any): number => money(
  row?.valor_liquido
  ?? row?.net_value
  ?? row?.net_amount
  ?? row?.valor_bruto
  ?? row?.gross_value
  ?? row?.gross_amount
  ?? row?.amount
  ?? row?.value
  ?? row?.total_amount
  ?? row?.valor
  ?? row?.paid_amount
);

const normalizeText = (value: any): string => String(value || '').trim().toLowerCase();

const flattenChartAccounts = (nodes: any[] = []): any[] =>
  (nodes || []).flatMap((node) => {
    const { children = [], ...rest } = node || {};
    return [rest, ...flattenChartAccounts(children)];
  });

const buildAccountIndex = (accounts: any[] = []): Map<string, any> => {
  const index = new Map<string, any>();
  (accounts || []).forEach((account) => {
    if (account?.id) index.set(String(account.id), account);
  });
  return index;
};

const getLinkedAccount = (row: any, accountIndex: Map<string, any> | null): any | null => {
  if (!accountIndex) return null;
  const key =
    row?.chart_account_id
    ?? row?.category_id
    ?? row?.plano_contas_id
    ?? row?.account_id
    ?? null;
  if (!key) return null;
  return accountIndex.get(String(key)) || null;
};

const getRowCostCenterId = (row: any): string | null => {
  const value = row?.cost_center_id ?? row?.centro_custo_id ?? row?.costCenterId ?? null;
  return value ? String(value) : null;
};

const getCostCenterName = (row: any): string => {
  return String(
    row?.name
    ?? row?.unit_name
    ?? row?.cost_center_name
    ?? row?.center_name
    ?? row?.description
    ?? row?.code
    ?? 'Centro sem nome',
  );
};

const buildCostCenterIndex = (centers: any[] = []): Map<string, any> => {
  const index = new Map<string, any>();
  (centers || []).forEach((center) => {
    if (center?.id) index.set(String(center.id), center);
  });
  return index;
};

const getLinkedCostCenter = (row: any, centerIndex: Map<string, any> | null): any | null => {
  const centerId = getRowCostCenterId(row);
  if (!centerId || !centerIndex) return null;
  return centerIndex.get(centerId) || null;
};

const getRowProfessionalId = (row: any): string | null => {
  const value = row?.professional_id ?? row?.professionalId ?? row?.doctor_id ?? row?.medico_id ?? null;
  return value ? String(value) : null;
};

const getRowProfessionalName = (row: any): string =>
  String(row?.professional_name ?? row?.doctor_name ?? row?.medico_name ?? '');

const getRowUnitId = (row: any): string | null => {
  const value = row?.unit_id ?? row?.unitId ?? row?.clinica_unidade_id ?? row?.branch_id ?? null;
  return value ? String(value) : null;
};

const getRowUnitName = (row: any): string =>
  String(row?.unit_name ?? row?.unitName ?? row?.clinic_unit_name ?? row?.branch_name ?? '');

const getRowPayerId = (row: any): string | null => {
  const value = row?.payer_id ?? row?.convenio_id ?? row?.health_insurance_id ?? null;
  return value ? String(value) : null;
};

const getRowPayerName = (row: any): string =>
  String(row?.payer_name ?? row?.convenio_name ?? row?.insurance_name ?? '');

const matchesEnterpriseScope = (row: any, filters?: DREFilters): boolean => {
  if (!filters) return true;

  if (filters.centroId && String(getRowCostCenterId(row) || '') !== String(filters.centroId)) return false;

  const professionalId = filters.professionalId || filters.medicoId;
  if (professionalId && String(getRowProfessionalId(row) || '') !== String(professionalId)) return false;

  const professionalName = normalizeText(filters.professionalName);
  if (professionalName && !normalizeText(getRowProfessionalName(row)).includes(professionalName)) return false;

  const payerId = filters.payerId || filters.convenioId;
  if (payerId && String(getRowPayerId(row) || '') !== String(payerId)) return false;

  const payerName = normalizeText(filters.payerName);
  if (payerName && !normalizeText(getRowPayerName(row)).includes(payerName)) return false;

  const unitId = filters.unitId || filters.unidadeId;
  if (unitId && String(getRowUnitId(row) || '') !== String(unitId)) return false;

  const unitName = normalizeText(filters.unitName);
  if (unitName && !normalizeText(getRowUnitName(row)).includes(unitName)) return false;

  return true;
};

const getAccountCode = (account: any): string => String(account?.code || '').trim();
const getAccountType = (account: any): string => normalizeText(account?.type || account?.account_type || '');

const isReceitaConta = (account: any): boolean => {
  const code = getAccountCode(account);
  const type = getAccountType(account);
  return code.startsWith('1.') || code.startsWith('3.') || type === 'receita';
};

const isDeducaoConta = (account: any): boolean => {
  const code = getAccountCode(account);
  const type = getAccountType(account);
  return code.startsWith('2.') || type === 'deducao';
};

const isCustoVariavelConta = (account: any): boolean => {
  const code = getAccountCode(account);
  const type = getAccountType(account);
  return code.startsWith('3.') || code.startsWith('4.') || type === 'custo' || type === 'honorario';
};

const isCustoFixoConta = (account: any): boolean => {
  const code = getAccountCode(account);
  return code.startsWith('5.');
};

const isDespesaOperacionalConta = (account: any): boolean => {
  const code = getAccountCode(account);
  const type = getAccountType(account);
  return code.startsWith('6.') || (type === 'despesa' && !code.startsWith('7.'));
};

const isDespesaFinanceiraConta = (account: any): boolean => {
  const code = getAccountCode(account);
  return code.startsWith('7.');
};

// ============================================================================
// TIPOS
// ============================================================================

export type DREVariantType = 'gerencial' | 'contabil' | 'centro' | 'medico' | 'convenio' | 'unidade' | 'especialidade' | 'projetada';

export interface DREPeriod {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface DREFilters {
  centroId?: string;
  medicoId?: string;
  professionalId?: string;
  professionalName?: string;
  convenioId?: string;
  payerId?: string;
  payerName?: string;
  unidadeId?: string;
  unitId?: string;
  unitName?: string;
  especialidadeId?: string;
  projectedScenario?: ScenarioType;
}

export interface DRELineItem {
  id: string;
  name: string;
  level: 1 | 2 | 3 | 4 | 5; // Profundidade para drill-down
  value: number;
  percentOfRevenue?: number;
  percentOfPreviousPeriod?: number; // Delta %
  absoluteDelta?: number; // Delta R$
  trend?: 'up' | 'down' | 'stable';
  children?: DRELineItem[];
  drillAvailable?: boolean; // Pode expandir?
  metadata?: Record<string, any>; // Dados adicionais para filtros
}

export interface DREResult {
  variant: DREVariantType;
  period: DREPeriod;
  filters?: DREFilters;
  clinicId: string;
  timestamp: Date;
  lines: DRELineItem[];
  summary: DRESummary;
  metadata?: Record<string, any>;
}

export interface DRESummary {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosVariaveis: number;
  custosFixos: number;
  margemBruta: number;
  margemBrutaPercent: number;
  despesasOperacionais: number;
  ebitda: number;
  ebitdaPercent: number;
  depreciacao: number;
  ebit: number;
  ebitPercent: number;
  despesasFinanceiras: number;
  receitasFinanceiras: number;
  impostos: number;
  lucroLiquido: number;
  lucroLiquidoPercent: number;
  roiPercent?: number;
  capitalDeGiro?: number;
  burnRate?: number;
  runwayDays?: number;
  projectedStartBalance?: number;
  projectedEndBalance?: number;
  projectedNet?: number;
}

export interface BenchmarkMetrics {
  metric: string;
  clinic: number;
  industryAvg: number;
  percentile: number;
  trend: 'above' | 'at' | 'below';
}

export interface DREComparison {
  current: DREResult;
  previous: DREResult;
  delta: Partial<DRESummary>;
  deltaPercent: Partial<DRESummary>;
  highlights: string[];
}

// ============================================================================
// ENGINE CORE
// ============================================================================

/**
 * Calcula DRE para qualquer variante
 */
export async function calculateDREVariant(
  clinicId: string,
  variant: DREVariantType,
  period: DREPeriod,
  filters?: DREFilters
): Promise<DREResult> {
  try {
    // 1. Buscar dados consolidados
    const consolidated = await getFinancialConsolidation(clinicId, period.start, period.end);

    // 2. Buscar AR/AP detalhados
    const [receivables, payables] = await Promise.all([
      listReceivables({ clinicId, dueStart: period.start, dueEnd: period.end, limit: 5000 }),
      listAPQuery({ clinicId, start: period.start, end: period.end, limit: 5000 }),
    ]);

    // 3. Buscar informações complementares baseado no variant
    let complementaryData: Record<string, any> = {};
    
    if (variant === 'contabil') {
      complementaryData = await fetchChartOfAccountsData(clinicId);
    } else if (variant === 'centro') {
      complementaryData = await fetchCostCenterData(clinicId, filters?.centroId);
    } else if (variant === 'medico') {
      complementaryData = await fetchMedicoData(clinicId, filters?.professionalId || filters?.medicoId);
    } else if (variant === 'convenio') {
      complementaryData = await fetchConvenioData(clinicId, filters?.payerId || filters?.convenioId);
    } else if (variant === 'unidade') {
      complementaryData = await fetchUnidadeData(clinicId, filters?.unitId || filters?.unidadeId);
    } else if (variant === 'especialidade') {
      complementaryData = await fetchEspecialidadeData(clinicId, filters?.especialidadeId);
    } else if (variant === 'projetada') {
      complementaryData = await fetchProjectedData(clinicId, period, filters);
    }

    // 4. Calcular DRE base
    const lines = calculateDRELines(
      consolidated,
      receivables,
      payables,
      complementaryData,
      variant,
      filters
    );

    // 5. Calcular resumo
    const summary = calculateDRESummary(lines);

    if (variant === 'projetada' && complementaryData?.forecastScenarios?.realista) {
      const selectedScenario = filters?.projectedScenario || 'realista';
      const scenarioData = (complementaryData.forecastScenarios[selectedScenario] || complementaryData.forecastScenarios.realista) as ScenarioResult;
      summary.burnRate = scenarioData.burnRate;
      summary.runwayDays = scenarioData.runwayDays;
      summary.projectedStartBalance = scenarioData.totals.startBalance;
      summary.projectedEndBalance = scenarioData.totals.endBalance;
      summary.projectedNet = scenarioData.totals.net;
      summary.capitalDeGiro = scenarioData.totals.endBalance;
    }

    return {
      variant,
      period,
      filters,
      clinicId,
      timestamp: new Date(),
      lines,
      summary,
      metadata: variant === 'projetada'
        ? {
            forecastScenarios: complementaryData?.forecastScenarios || null,
            projectionWindow: complementaryData?.projectionWindow || null,
          }
        : undefined,
    };
  } catch (error) {
    console.error(`❌ Erro ao calcular DRE ${variant}:`, error);
    throw error;
  }
}

/**
 * Calcula linhas da DRE estruturadas
 */
function calculateDRELines(
  consolidated: any,
  receivables: any[],
  payables: any[],
  complementaryData: Record<string, any>,
  variant: DREVariantType,
  filters?: DREFilters
): DRELineItem[] {
  const lines: DRELineItem[] = [];
  const scopedReceivables = receivables.filter((row) => matchesEnterpriseScope(row, filters));
  const scopedPayables = payables.filter((row) => matchesEnterpriseScope(row, filters));
  const accountIndex = variant === 'contabil'
    ? buildAccountIndex(Array.isArray(complementaryData?.chartAccounts) ? complementaryData.chartAccounts : [])
    : null;
  const costCenterIndex = variant === 'centro'
    ? buildCostCenterIndex(Array.isArray(complementaryData?.costCenters) ? complementaryData.costCenters : [])
    : null;

  if (variant === 'projetada' && complementaryData?.forecastScenarios) {
    return buildProjectedDreLines(scopedReceivables, scopedPayables, consolidated, complementaryData.forecastScenarios, filters);
  }

  if (variant === 'centro') {
    const centroLines = buildCentroDreLines(scopedReceivables, scopedPayables, consolidated, costCenterIndex, filters);
    if (centroLines.length > 0) {
      return centroLines;
    }
  }

  // ===== RECEITAS =====
  const receitaBruta = calculateReceitaBruta(scopedReceivables, filters);
  lines.push({
    id: 'receita_bruta',
    name: 'Receita Bruta',
    level: 1,
    value: receitaBruta,
    percentOfRevenue: 100,
    drillAvailable: true,
  });

  // Sub-items de receita (por convênio/particular)
  const receitaItems = calculateReceitaByType(scopedReceivables, filters, accountIndex, variant);
  receitaItems.forEach((item, idx) => {
    lines.push({
      id: `receita_${idx}`,
      name: item.name,
      level: 2,
      value: item.value,
      percentOfRevenue: safePercent(item.value, receitaBruta),
      drillAvailable: true,
      metadata: item.metadata,
    });
  });

  // ===== DEDUÇÕES =====
  const deducoes = calculateDeducoes(scopedReceivables, filters);
  lines.push({
    id: 'deducoes',
    name: '(-) Deduções de Receita',
    level: 1,
    value: deducoes,
    percentOfRevenue: safePercent(deducoes, receitaBruta),
    drillAvailable: true,
  });

  const deducaoItems = calculateDeducaoByType(scopedReceivables, filters, accountIndex, variant);
  deducaoItems.forEach((item, idx) => {
    lines.push({
      id: `deducao_${idx}`,
      name: item.name,
      level: 2,
      value: item.value,
      percentOfRevenue: safePercent(item.value, receitaBruta),
      metadata: item.metadata,
    });
  });

  // ===== RECEITA LÍQUIDA =====
  const receitaLiquida = receitaBruta - deducoes;
  lines.push({
    id: 'receita_liquida',
    name: '= Receita Líquida',
    level: 1,
    value: receitaLiquida,
    percentOfRevenue: 100,
  });

  // ===== CUSTOS VARIÁVEIS =====
  const custosVariaveis = calculateCustosVariaveis(scopedPayables, consolidated, filters, accountIndex, variant);
  lines.push({
    id: 'custos_variaveis',
    name: '(-) Custos Variáveis (Assistenciais)',
    level: 1,
    value: custosVariaveis,
    percentOfRevenue: safePercent(custosVariaveis, receitaBruta),
    drillAvailable: true,
  });

  const custoVariavelItems = calculateCustoVariavelByType(scopedPayables, consolidated, filters, accountIndex, variant);
  custoVariavelItems.forEach((item, idx) => {
    lines.push({
      id: `custo_variavel_${idx}`,
      name: item.name,
      level: 2,
      value: item.value,
      percentOfRevenue: safePercent(item.value, receitaBruta),
      metadata: item.metadata,
    });
  });

  // ===== CUSTOS FIXOS =====
  const custosFixos = calculateCustosFixos(scopedPayables, consolidated, filters, accountIndex, variant);
  lines.push({
    id: 'custos_fixos',
    name: '(-) Custos Fixos',
    level: 1,
    value: custosFixos,
    percentOfRevenue: safePercent(custosFixos, receitaBruta),
    drillAvailable: true,
  });

  const custoFixoItems = calculateCustoFixoByType(scopedPayables, consolidated, filters, accountIndex, variant);
  custoFixoItems.forEach((item, idx) => {
    lines.push({
      id: `custo_fixo_${idx}`,
      name: item.name,
      level: 2,
      value: item.value,
      percentOfRevenue: safePercent(item.value, receitaBruta),
      metadata: item.metadata,
    });
  });

  // ===== MARGEM BRUTA =====
  const margemBruta = receitaLiquida - custosVariaveis - custosFixos;
  const margemBrutaPercent = safePercent(margemBruta, receitaBruta);
  lines.push({
    id: 'margem_bruta',
    name: '= Margem Bruta',
    level: 1,
    value: margemBruta,
    percentOfRevenue: margemBrutaPercent,
  });

  // ===== DESPESAS OPERACIONAIS =====
  const despesasOperacionais = calculateDespesasOperacionais(scopedPayables, consolidated, filters, accountIndex, variant);
  lines.push({
    id: 'despesas_operacionais',
    name: '(-) Despesas Operacionais',
    level: 1,
    value: despesasOperacionais,
    percentOfRevenue: safePercent(despesasOperacionais, receitaBruta),
    drillAvailable: true,
  });

  const despesaItems = calculateDespesaByType(scopedPayables, consolidated, filters, accountIndex, variant);
  despesaItems.forEach((item, idx) => {
    lines.push({
      id: `despesa_${idx}`,
      name: item.name,
      level: 2,
      value: item.value,
      percentOfRevenue: safePercent(item.value, receitaBruta),
      metadata: item.metadata,
    });
  });

  // ===== EBITDA =====
  const ebitda = margemBruta - despesasOperacionais;
  const ebitdaPercent = safePercent(ebitda, receitaBruta);
  lines.push({
    id: 'ebitda',
    name: '= EBITDA',
    level: 1,
    value: ebitda,
    percentOfRevenue: ebitdaPercent,
  });

  // ===== DEPRECIAÇÃO =====
  const depreciacao = calculateDepreciacao(consolidated, filters);
  lines.push({
    id: 'depreciacao',
    name: '(-) Depreciação/Amortização',
    level: 1,
    value: depreciacao,
    percentOfRevenue: safePercent(depreciacao, receitaBruta),
  });

  // ===== EBIT =====
  const ebit = ebitda - depreciacao;
  const ebitPercent = safePercent(ebit, receitaBruta);
  lines.push({
    id: 'ebit',
    name: '= EBIT (Resultado Operacional)',
    level: 1,
    value: ebit,
    percentOfRevenue: ebitPercent,
  });

  // ===== RESULTADO FINANCEIRO =====
  const despesasFinanceiras = calculateDespesasFinanceiras(consolidated, filters, scopedPayables, accountIndex, variant);
  const receitasFinanceiras = calculateReceitasFinanceiras(consolidated, filters);
  const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;

  lines.push({
    id: 'despesas_financeiras',
    name: '(-) Despesas Financeiras',
    level: 1,
    value: despesasFinanceiras,
    percentOfRevenue: safePercent(despesasFinanceiras, receitaBruta),
  });

  lines.push({
    id: 'receitas_financeiras',
    name: '(+) Receitas Financeiras',
    level: 1,
    value: receitasFinanceiras,
    percentOfRevenue: safePercent(receitasFinanceiras, receitaBruta),
  });

  // ===== IMPOSTOS =====
  const impostos = calculateImpostos(receitaBruta, ebit, complementaryData);
  lines.push({
    id: 'impostos',
    name: '(-) Impostos e Taxas',
    level: 1,
    value: impostos,
    percentOfRevenue: safePercent(impostos, receitaBruta),
  });

  // ===== LUCRO LÍQUIDO =====
  const lucroLiquido = ebit + resultadoFinanceiro - impostos;
  const lucroLiquidoPercent = safePercent(lucroLiquido, receitaBruta);
  lines.push({
    id: 'lucro_liquido',
    name: '= Lucro Líquido',
    level: 1,
    value: lucroLiquido,
    percentOfRevenue: lucroLiquidoPercent,
  });

  return lines;
}

/**
 * Calcula resumo de KPIs
 */
function calculateDRESummary(lines: DRELineItem[]): DRESummary {
  const centroLines = lines.filter((line) => line.id.startsWith('centro_') && line.metadata);
  if (centroLines.length > 0) {
    const receitaBruta = centroLines.reduce((sum, line) => sum + money(line.metadata?.receitas), 0);
    const deducoes = centroLines.reduce((sum, line) => sum + money(line.metadata?.deducoes), 0);
    const receitaLiquida = receitaBruta - deducoes;
    const custosVariaveis = centroLines.reduce((sum, line) => sum + money(line.metadata?.custosVariaveis), 0);
    const custosFixos = centroLines.reduce((sum, line) => sum + money(line.metadata?.custosFixos), 0);
    const margemBruta = receitaLiquida - custosVariaveis - custosFixos;
    const despesasOperacionais = centroLines.reduce((sum, line) => sum + money(line.metadata?.despesasOperacionais), 0);
    const ebitda = margemBruta - despesasOperacionais;
    const depreciacao = 0;
    const ebit = ebitda - depreciacao;
    const despesasFinanceiras = centroLines.reduce((sum, line) => sum + money(line.metadata?.despesasFinanceiras), 0);
    const receitasFinanceiras = centroLines.reduce((sum, line) => sum + money(line.metadata?.receitasFinanceiras), 0);
    const impostos = centroLines.reduce((sum, line) => sum + money(line.metadata?.impostos), 0);
    const lucroLiquido = ebit + receitasFinanceiras - despesasFinanceiras - impostos;

    return {
      receitaBruta,
      deducoes,
      receitaLiquida,
      custosVariaveis,
      custosFixos,
      margemBruta,
      margemBrutaPercent: receitaBruta > 0 ? (margemBruta / receitaBruta) * 100 : 0,
      despesasOperacionais,
      ebitda,
      ebitdaPercent: receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0,
      depreciacao,
      ebit,
      ebitPercent: receitaBruta > 0 ? (ebit / receitaBruta) * 100 : 0,
      despesasFinanceiras,
      receitasFinanceiras,
      impostos,
      lucroLiquido,
      lucroLiquidoPercent: receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0,
    };
  }

  const findValue = (id: string) => lines.find(l => l.id === id)?.value || 0;

  const receitaBruta = findValue('receita_bruta');
  const deducoes = findValue('deducoes');
  const receitaLiquida = findValue('receita_liquida');
  const custosVariaveis = findValue('custos_variaveis');
  const custosFixos = findValue('custos_fixos');
  const margemBruta = findValue('margem_bruta');
  const despesasOperacionais = findValue('despesas_operacionais');
  const ebitda = findValue('ebitda');
  const depreciacao = findValue('depreciacao');
  const ebit = findValue('ebit');
  const despesasFinanceiras = findValue('despesas_financeiras');
  const receitasFinanceiras = findValue('receitas_financeiras');
  const impostos = findValue('impostos');
  const lucroLiquido = findValue('lucro_liquido');

  return {
    receitaBruta,
    deducoes,
    receitaLiquida,
    custosVariaveis,
    custosFixos,
    margemBruta,
    margemBrutaPercent: receitaBruta > 0 ? (margemBruta / receitaBruta) * 100 : 0,
    despesasOperacionais,
    ebitda,
    ebitdaPercent: receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0,
    depreciacao,
    ebit,
    ebitPercent: receitaBruta > 0 ? (ebit / receitaBruta) * 100 : 0,
    despesasFinanceiras,
    receitasFinanceiras,
    impostos,
    lucroLiquido,
    lucroLiquidoPercent: receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0,
  };
}

// ============================================================================
// HELPERS: RECEITAS
// ============================================================================

function calculateReceitaBruta(receivables: any[], filters?: DREFilters): number {
  return receivables
    .filter((r) => !filters?.convenioId || String(r.convenio_id || r.payer_id || '') === String(filters.convenioId))
    .filter((r) => !filters?.centroId || String(getRowCostCenterId(r) || '') === String(filters.centroId))
    .filter((r) => isActiveAccrualStatus(r.status))
    .reduce((sum, r) => sum + getReceivableValue(r), 0);
}

function calculateReceitaByType(
  receivables: any[],
  filters?: DREFilters,
  accountIndex: Map<string, any> | null = null,
  variant: DREVariantType = 'gerencial'
): Array<{ name: string; value: number; metadata?: any }> {
  const byType: Record<string, number> = {};
  
  receivables
    .filter((r) => !filters?.convenioId || String(r.convenio_id || r.payer_id || '') === String(filters.convenioId))
    .filter((r) => !filters?.centroId || String(getRowCostCenterId(r) || '') === String(filters.centroId))
    .filter((r) => isActiveAccrualStatus(r.status))
    .forEach(r => {
      let type = r.convenio_name || r.payer_name || 'Particular';
      if (variant === 'contabil' && accountIndex) {
        const account = getLinkedAccount(r, accountIndex);
        if (account && isReceitaConta(account)) {
          type = `${getAccountCode(account)} - ${account.name || 'Receita'}`;
        }
      }
      byType[type] = (byType[type] || 0) + getReceivableValue(r);
    });

  return Object.entries(byType).map(([name, value]) => ({
    name,
    value,
    metadata: { type: 'receita' },
  }));
}

function calculateDeducoes(receivables: any[], filters?: DREFilters): number {
  // Glosas + descontos
  return receivables
    .filter((r) => !filters?.convenioId || String(r.convenio_id || r.payer_id || '') === String(filters.convenioId))
    .filter((r) => !filters?.centroId || String(getRowCostCenterId(r) || '') === String(filters.centroId))
    .reduce((sum, r) => sum + money(r.glosa_amount ?? r.chargeback_amount) + money(r.desconto ?? r.discount_value), 0);
}

function calculateDeducaoByType(
  receivables: any[],
  filters?: DREFilters,
  accountIndex: Map<string, any> | null = null,
  variant: DREVariantType = 'gerencial'
): Array<{ name: string; value: number; metadata?: any }> {
  if (variant === 'contabil' && accountIndex) {
    const byType: Record<string, number> = {};
    receivables
      .filter((r) => !filters?.convenioId || String(r.convenio_id || r.payer_id || '') === String(filters.convenioId))
      .forEach((r) => {
        const account = getLinkedAccount(r, accountIndex);
        const deductionValue = money(r.glosa_amount ?? r.chargeback_amount) + money(r.desconto ?? r.discount_value);
        if (!deductionValue) return;
        if (account && isDeducaoConta(account)) {
          const key = `${getAccountCode(account)} - ${account.name || 'Deducoes'}`;
          byType[key] = (byType[key] || 0) + deductionValue;
        }
      });

    const contabilItems = Object.entries(byType).map(([name, value]) => ({
      name,
      value,
      metadata: { type: 'deducao_contabil' },
    }));

    if (contabilItems.length > 0) return contabilItems;
  }

  const glosaTotal = receivables
    .filter((r) => !filters?.convenioId || String(r.convenio_id || r.payer_id || '') === String(filters.convenioId))
    .reduce((sum, r) => sum + money(r.glosa_amount ?? r.chargeback_amount), 0);

  const descontoTotal = receivables
    .filter((r) => !filters?.convenioId || String(r.convenio_id || r.payer_id || '') === String(filters.convenioId))
    .reduce((sum, r) => sum + money(r.desconto ?? r.discount_value), 0);

  return [
    { name: 'Glosas', value: glosaTotal, metadata: { type: 'glosa' } },
    { name: 'Descontos Operacionais', value: descontoTotal, metadata: { type: 'desconto' } },
  ].filter(item => item.value > 0);
}

// ============================================================================
// HELPERS: CUSTOS VARIÁVEIS
// ============================================================================

function calculateCustosVariaveis(
  payables: any[],
  consolidated: any,
  filters?: DREFilters,
  accountIndex: Map<string, any> | null = null,
  variant: DREVariantType = 'gerencial'
): number {
  if (variant === 'contabil' && accountIndex) {
    return payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .filter((p) => {
        const account = getLinkedAccount(p, accountIndex);
        return !!account && isCustoVariavelConta(account);
      })
      .reduce((sum, p) => sum + getPayableValue(p), 0);
  }

  if (variant === 'centro') {
    return payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .filter((p) => !filters?.centroId || String(getRowCostCenterId(p) || '') === String(filters.centroId))
      .filter((p) => {
        const categoria = normalizeText(p.categoria || p.category || p.category_name);
        return ['medicamentos', 'insumos', 'materiais', 'repasse', 'honorario'].some(c => categoria.includes(c));
      })
      .reduce((sum, p) => sum + getPayableValue(p), 0);
  }

  // Medicamentos, insumos, materiais, repassos médicos
  return payables
    .filter(p => {
      const categoria = normalizeText(p.categoria || p.category || p.category_name);
      return ['medicamentos', 'insumos', 'materiais', 'repasse', 'honorario'].some(c => categoria.includes(c));
    })
    .filter((p) => isActiveAccrualStatus(p.status))
    .reduce((sum, p) => sum + getPayableValue(p), 0);
}

function calculateCustoVariavelByType(
  payables: any[],
  consolidated: any,
  filters?: DREFilters,
  accountIndex: Map<string, any> | null = null,
  variant: DREVariantType = 'gerencial'
): Array<{ name: string; value: number; metadata?: any }> {
  const types: Record<string, number> = {};

  if (variant === 'contabil' && accountIndex) {
    payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .forEach((p) => {
        const account = getLinkedAccount(p, accountIndex);
        if (!account || !isCustoVariavelConta(account)) return;
        const key = `${getAccountCode(account)} - ${account.name || 'Custo'}`;
        types[key] = (types[key] || 0) + getPayableValue(p);
      });

    const items = Object.entries(types).map(([name, value]) => ({
      name,
      value,
      metadata: { type: 'custo_variavel_contabil' },
    }));
    if (items.length > 0) return items;
  }

  payables
    .filter(p => {
      const categoria = normalizeText(p.categoria || p.category || p.category_name);
      return ['medicamentos', 'insumos', 'materiais', 'repasse', 'honorario'].some(c => categoria.includes(c));
    })
    .filter((p) => isActiveAccrualStatus(p.status))
    .forEach(p => {
      const type = p.categoria || p.category_name || p.category || 'Outro';
      types[type] = (types[type] || 0) + getPayableValue(p);
    });

  return Object.entries(types).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    metadata: { type: 'custo_variavel' },
  }));
}

// ============================================================================
// HELPERS: CUSTOS FIXOS
// ============================================================================

function calculateCustosFixos(
  payables: any[],
  consolidated: any,
  filters?: DREFilters,
  accountIndex: Map<string, any> | null = null,
  variant: DREVariantType = 'gerencial'
): number {
  if (variant === 'contabil' && accountIndex) {
    return payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .filter((p) => {
        const account = getLinkedAccount(p, accountIndex);
        return !!account && isCustoFixoConta(account);
      })
      .reduce((sum, p) => sum + getPayableValue(p), 0);
  }

  if (variant === 'centro') {
    return payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .filter((p) => !filters?.centroId || String(getRowCostCenterId(p) || '') === String(filters.centroId))
      .filter((p) => {
        const categoria = normalizeText(p.categoria || p.category || p.category_name);
        return ['folha', 'infraestrutura', 'servicos', 'aluguel', 'energia', 'salario'].some(c => categoria.includes(c));
      })
      .reduce((sum, p) => sum + getPayableValue(p), 0);
  }

  // Folha, infraestrutura, serviços
  return payables
    .filter(p => {
      const categoria = normalizeText(p.categoria || p.category || p.category_name);
      return ['folha', 'infraestrutura', 'servicos', 'aluguel', 'energia', 'salario'].some(c => categoria.includes(c));
    })
    .filter((p) => isActiveAccrualStatus(p.status))
    .reduce((sum, p) => sum + getPayableValue(p), 0);
}

function calculateCustoFixoByType(
  payables: any[],
  consolidated: any,
  filters?: DREFilters,
  accountIndex: Map<string, any> | null = null,
  variant: DREVariantType = 'gerencial'
): Array<{ name: string; value: number; metadata?: any }> {
  const types: Record<string, number> = {};

  if (variant === 'contabil' && accountIndex) {
    payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .forEach((p) => {
        const account = getLinkedAccount(p, accountIndex);
        if (!account || !isCustoFixoConta(account)) return;
        const key = `${getAccountCode(account)} - ${account.name || 'Custo Fixo'}`;
        types[key] = (types[key] || 0) + getPayableValue(p);
      });

    const items = Object.entries(types).map(([name, value]) => ({
      name,
      value,
      metadata: { type: 'custo_fixo_contabil' },
    }));
    if (items.length > 0) return items;
  }

  payables
    .filter(p => {
      const categoria = normalizeText(p.categoria || p.category || p.category_name);
      return ['folha', 'infraestrutura', 'servicos', 'aluguel', 'energia', 'salario'].some(c => categoria.includes(c));
    })
    .filter((p) => isActiveAccrualStatus(p.status))
    .forEach(p => {
      const type = p.categoria || p.category_name || p.category || 'Outro';
      types[type] = (types[type] || 0) + getPayableValue(p);
    });

  return Object.entries(types).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    metadata: { type: 'custo_fixo' },
  }));
}

// ============================================================================
// HELPERS: DESPESAS OPERACIONAIS
// ============================================================================

function calculateDespesasOperacionais(
  payables: any[],
  consolidated: any,
  filters?: DREFilters,
  accountIndex: Map<string, any> | null = null,
  variant: DREVariantType = 'gerencial'
): number {
  if (variant === 'contabil' && accountIndex) {
    return payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .filter((p) => {
        const account = getLinkedAccount(p, accountIndex);
        return !!account && isDespesaOperacionalConta(account);
      })
      .reduce((sum, p) => sum + getPayableValue(p), 0);
  }

  if (variant === 'centro') {
    return payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .filter((p) => !filters?.centroId || String(getRowCostCenterId(p) || '') === String(filters.centroId))
      .filter((p) => {
        const categoria = normalizeText(p.categoria || p.category || p.category_name);
        const excluded = ['medicamentos', 'insumos', 'materiais', 'repasse', 'honorario', 'folha', 'infraestrutura', 'servicos', 'salario'];
        return !excluded.some(c => categoria.includes(c));
      })
      .reduce((sum, p) => sum + getPayableValue(p), 0);
  }

  // Marketing, TI, gestão, etc (excluindo custos)
  return payables
    .filter(p => {
      const categoria = normalizeText(p.categoria || p.category || p.category_name);
      const excluded = ['medicamentos', 'insumos', 'materiais', 'repasse', 'honorario', 'folha', 'infraestrutura', 'servicos', 'salario'];
      return !excluded.some(c => categoria.includes(c));
    })
    .filter((p) => isActiveAccrualStatus(p.status))
    .reduce((sum, p) => sum + getPayableValue(p), 0);
}

function calculateDespesaByType(
  payables: any[],
  consolidated: any,
  filters?: DREFilters,
  accountIndex: Map<string, any> | null = null,
  variant: DREVariantType = 'gerencial'
): Array<{ name: string; value: number; metadata?: any }> {
  const types: Record<string, number> = {};

  if (variant === 'contabil' && accountIndex) {
    payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .forEach((p) => {
        const account = getLinkedAccount(p, accountIndex);
        if (!account || !isDespesaOperacionalConta(account)) return;
        const key = `${getAccountCode(account)} - ${account.name || 'Despesa'}`;
        types[key] = (types[key] || 0) + getPayableValue(p);
      });

    const items = Object.entries(types).map(([name, value]) => ({
      name,
      value,
      metadata: { type: 'despesa_contabil' },
    }));
    if (items.length > 0) return items;
  }

  payables
    .filter(p => {
      const categoria = normalizeText(p.categoria || p.category || p.category_name);
      const excluded = ['medicamentos', 'insumos', 'materiais', 'repasse', 'honorario', 'folha', 'infraestrutura', 'servicos', 'salario'];
      return !excluded.some(c => categoria.includes(c));
    })
    .filter((p) => isActiveAccrualStatus(p.status))
    .forEach(p => {
      const type = p.categoria || p.category_name || p.category || 'Outro';
      types[type] = (types[type] || 0) + getPayableValue(p);
    });

  return Object.entries(types).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    metadata: { type: 'despesa' },
  }));
}

// ============================================================================
// HELPERS: OUTROS COMPONENTES
// ============================================================================

function calculateDepreciacao(consolidated: any, filters?: DREFilters): number {
  // Simplificado: ~5% de custos fixos / 60 meses
  return 0; // TODO: Integrar com tabela de ativos fixos
}

function calculateDespesasFinanceiras(
  consolidated: any,
  filters?: DREFilters,
  payables: any[] = [],
  accountIndex: Map<string, any> | null = null,
  variant: DREVariantType = 'gerencial'
): number {
  if (variant === 'contabil' && accountIndex) {
    const fromAccounts = payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .filter((p) => {
        const account = getLinkedAccount(p, accountIndex);
        return !!account && isDespesaFinanceiraConta(account);
      })
      .reduce((sum, p) => sum + getPayableValue(p), 0);

    if (fromAccounts > 0) return fromAccounts;
  }

  if (variant === 'centro') {
    return payables
      .filter((p) => isActiveAccrualStatus(p.status))
      .filter((p) => !filters?.centroId || String(getRowCostCenterId(p) || '') === String(filters.centroId))
      .filter((p) => /tarifa|taxa|cartao|juros|multa|banco|financeir|iof|ted|pix/i.test(normalizeText(p.category || p.category_name || p.description || p.vendor_name || p.notes || p.payment_method)))
      .reduce((sum, p) => sum + getPayableValue(p), 0);
  }

  // Juros, taxas bancárias
  return money(consolidated?.expenses?.financial);
}

function calculateReceitasFinanceiras(consolidated: any, filters?: DREFilters): number {
  // Juros, aplicações
  return money(consolidated?.revenue?.financialIncome);
}

function calculateImpostos(receitaBruta: number, ebit: number, complementaryData: Record<string, any>): number {
  // TODO: Integrar com dreApi.js para cálculo de impostos por regime tributário
  return receitaBruta * 0.15; // Simplificado: 15%
}

// ============================================================================
// FETCH COMPLEMENTARY DATA
// ============================================================================

async function fetchChartOfAccountsData(clinicId: string): Promise<Record<string, any>> {
  try {
    const rpc = await supabase.rpc('get_chart_of_accounts_tree', {
      p_clinic_id: clinicId,
    });

    if (!rpc.error) {
      return { chartAccounts: flattenChartAccounts(Array.isArray(rpc.data) ? rpc.data : []) };
    }

    const tableTry = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('clinic_id', clinicId);

    if (!tableTry.error) {
      return { chartAccounts: tableTry.data || [] };
    }

    const legacyTry = await supabase
      .from('chart_accounts')
      .select('*')
      .eq('clinic_id', clinicId);

    if (legacyTry.error) throw legacyTry.error;
    return { chartAccounts: legacyTry.data || [] };
  } catch (err) {
    console.warn('⚠️ Erro ao buscar chart of accounts:', err);
    return {};
  }
}

async function fetchCostCenterData(clinicId: string, centroId?: string): Promise<Record<string, any>> {
  try {
    const query = supabase
      .from('cost_centers')
      .select('*')
      .eq('clinic_id', clinicId);

    if (centroId) query.eq('id', centroId);

    const { data, error } = await query;

    if (!error) {
      return { costCenters: data || [] };
    }

    const fallbackQuery = supabase
      .from('financial_cost_centers')
      .select('*')
      .eq('clinic_id', clinicId);

    if (centroId) fallbackQuery.eq('id', centroId);

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;
    return { costCenters: fallbackData || [] };
  } catch (err) {
    console.warn('⚠️ Erro ao buscar cost centers:', err);
    return {};
  }
}

function buildCentroDreLines(
  receivables: any[],
  payables: any[],
  consolidated: any,
  centerIndex: Map<string, any> | null,
  filters?: DREFilters
): DRELineItem[] {
  const centerMap = new Map<string, {
    name: string;
    receitas: number;
    custosVariaveis: number;
    custosFixos: number;
    despesasOperacionais: number;
    despesasFinanceiras: number;
    receitasFinanceiras: number;
    impostos: number;
  }>();

  const ensure = (centerId: string | null, fallbackName: string) => {
    const id = centerId || 'sem_centro';
    if (!centerMap.has(id)) {
      const center = centerId && centerIndex ? centerIndex.get(centerId) : null;
      centerMap.set(id, {
        name: center ? getCostCenterName(center) : fallbackName,
        receitas: 0,
        custosVariaveis: 0,
        custosFixos: 0,
        despesasOperacionais: 0,
        despesasFinanceiras: 0,
        receitasFinanceiras: 0,
        impostos: 0,
      });
    }
    return centerMap.get(id)!;
  };

  receivables
    .filter((row) => isActiveAccrualStatus(row.status))
    .filter((row) => matchesEnterpriseScope(row, filters))
    .forEach((row) => {
      const center = ensure(getRowCostCenterId(row), 'Sem centro');
      center.receitas += getReceivableValue(row);
      center.impostos += money(row.glosa_amount ?? row.chargeback_amount);
    });

  payables
    .filter((row) => isActiveAccrualStatus(row.status))
    .filter((row) => matchesEnterpriseScope(row, filters))
    .forEach((row) => {
      const center = ensure(getRowCostCenterId(row), 'Sem centro');
      const categoria = normalizeText(row.categoria || row.category || row.category_name);
      const amount = getPayableValue(row);

      if (['medicamentos', 'insumos', 'materiais', 'repasse', 'honorario'].some((c) => categoria.includes(c))) {
        center.custosVariaveis += amount;
      } else if (['folha', 'infraestrutura', 'servicos', 'aluguel', 'energia', 'salario'].some((c) => categoria.includes(c))) {
        center.custosFixos += amount;
      } else if (/tarifa|taxa|cartao|juros|multa|banco|financeir|iof|ted|pix/i.test(categoria)) {
        center.despesasFinanceiras += amount;
      } else {
        center.despesasOperacionais += amount;
      }
    });

  const lines = Array.from(centerMap.entries()).map(([id, data]) => {
    const receitaLiquida = Math.max(0, data.receitas - data.impostos);
    const margemBruta = receitaLiquida - data.custosVariaveis - data.custosFixos;
    const ebitda = margemBruta - data.despesasOperacionais;
    const ebit = ebitda;
    const lucroLiquido = ebit + data.receitasFinanceiras - data.despesasFinanceiras;

    return {
      id: `centro_${id}`,
      name: data.name,
      level: 2,
      value: lucroLiquido,
      percentOfRevenue: safePercent(lucroLiquido, data.receitas || 0),
      drillAvailable: false,
      metadata: {
        centerId: id,
        receitas: data.receitas,
        deducoes: data.impostos,
        custosVariaveis: data.custosVariaveis,
        custosFixos: data.custosFixos,
        despesasOperacionais: data.despesasOperacionais,
        despesasFinanceiras: data.despesasFinanceiras,
        receitasFinanceiras: data.receitasFinanceiras,
        impostos: data.impostos,
      },
    } as DRELineItem;
  });

  const totalReceita = lines.reduce((sum, line) => sum + money(line.metadata?.receitas), 0);
  const totalLucro = lines.reduce((sum, line) => sum + money(line.value), 0);

  return [
    {
      id: 'centros_custo_header',
      name: 'DRE por Centro de Custo',
      level: 1,
      value: totalLucro,
      percentOfRevenue: safePercent(totalLucro, totalReceita),
      drillAvailable: false,
    },
    ...lines.sort((a, b) => money(b.value) - money(a.value)),
  ];
}

function buildProjectedDreLines(
  receivables: any[],
  payables: any[],
  consolidated: any,
  forecastScenarios: Record<ScenarioType, ScenarioResult>,
  filters?: DREFilters
): DRELineItem[] {
  const scenarioKey = filters?.projectedScenario || 'realista';
  const selectedScenario = forecastScenarios?.[scenarioKey] || forecastScenarios?.realista;
  if (!selectedScenario) return [];

  const receitaHistorica = calculateReceitaBruta(receivables, filters);
  const deducoesHistoricas = calculateDeducoes(receivables, filters);
  const custosVariaveisHistoricos = calculateCustosVariaveis(payables, consolidated, filters, null, 'gerencial');
  const custosFixosHistoricos = calculateCustosFixos(payables, consolidated, filters, null, 'gerencial');
  const despesasOperacionaisHistoricas = calculateDespesasOperacionais(payables, consolidated, filters, null, 'gerencial');
  const despesasFinanceirasHistoricas = calculateDespesasFinanceiras(consolidated, filters, payables, null, 'gerencial');
  const receitasFinanceirasHistoricas = calculateReceitasFinanceiras(consolidated, filters);
  const depreciacaoHistorica = calculateDepreciacao(consolidated, filters);
  const margemHistorica = receitaHistorica - deducoesHistoricas;
  const impostosHistoricos = calculateImpostos(receitaHistorica, margemHistorica, {});

  const historicalExpenseBase = [
    custosVariaveisHistoricos,
    custosFixosHistoricos,
    despesasOperacionaisHistoricas,
    despesasFinanceirasHistoricas,
  ].reduce((sum, value) => sum + money(value), 0);

  const mix = historicalExpenseBase > 0
    ? {
        variaveis: custosVariaveisHistoricos / historicalExpenseBase,
        fixos: custosFixosHistoricos / historicalExpenseBase,
        operacionais: despesasOperacionaisHistoricas / historicalExpenseBase,
        financeiras: despesasFinanceirasHistoricas / historicalExpenseBase,
      }
    : {
        variaveis: 0.36,
        fixos: 0.28,
        operacionais: 0.26,
        financeiras: 0.1,
      };

  const deducoesRatio = receitaHistorica > 0 ? deducoesHistoricas / receitaHistorica : 0.04;
  const depreciacaoRatio = receitaHistorica > 0 ? depreciacaoHistorica / receitaHistorica : 0.02;
  const receitasFinanceirasRatio = receitaHistorica > 0 ? receitasFinanceirasHistoricas / receitaHistorica : 0;
  const impostosRatio = receitaHistorica > 0 ? impostosHistoricos / receitaHistorica : 0.06;

  const receitaBruta = money(selectedScenario.totals.inflows);
  const deducoes = receitaBruta * deducoesRatio;
  const receitaLiquida = receitaBruta - deducoes;
  const projectedOutflow = money(selectedScenario.totals.outflows);
  const custosVariaveis = projectedOutflow * mix.variaveis;
  const custosFixos = projectedOutflow * mix.fixos;
  const margemBruta = receitaLiquida - custosVariaveis - custosFixos;
  const despesasOperacionais = projectedOutflow * mix.operacionais;
  const ebitda = margemBruta - despesasOperacionais;
  const depreciacao = receitaBruta * depreciacaoRatio;
  const ebit = ebitda - depreciacao;
  const despesasFinanceiras = projectedOutflow * mix.financeiras;
  const receitasFinanceiras = receitaBruta * receitasFinanceirasRatio;
  const impostos = receitaBruta * impostosRatio;
  const lucroLiquido = ebit + receitasFinanceiras - despesasFinanceiras - impostos;

  const lines: DRELineItem[] = [
    {
      id: 'receita_bruta',
      name: `Receita Bruta Projetada (${scenarioKey})`,
      level: 1,
      value: receitaBruta,
      percentOfRevenue: 100,
      drillAvailable: false,
    },
    {
      id: 'deducoes',
      name: '(-) Deduções Projetadas',
      level: 1,
      value: deducoes,
      percentOfRevenue: safePercent(deducoes, receitaBruta),
    },
    {
      id: 'receita_liquida',
      name: '= Receita Líquida Projetada',
      level: 1,
      value: receitaLiquida,
      percentOfRevenue: 100,
    },
    {
      id: 'custos_variaveis',
      name: '(-) Custos Variáveis Projetados',
      level: 1,
      value: custosVariaveis,
      percentOfRevenue: safePercent(custosVariaveis, receitaBruta),
    },
    {
      id: 'custos_fixos',
      name: '(-) Custos Fixos Projetados',
      level: 1,
      value: custosFixos,
      percentOfRevenue: safePercent(custosFixos, receitaBruta),
    },
    {
      id: 'margem_bruta',
      name: '= Margem Bruta Projetada',
      level: 1,
      value: margemBruta,
      percentOfRevenue: safePercent(margemBruta, receitaBruta),
    },
    {
      id: 'despesas_operacionais',
      name: '(-) Despesas Operacionais Projetadas',
      level: 1,
      value: despesasOperacionais,
      percentOfRevenue: safePercent(despesasOperacionais, receitaBruta),
    },
    {
      id: 'ebitda',
      name: '= EBITDA Projetado',
      level: 1,
      value: ebitda,
      percentOfRevenue: safePercent(ebitda, receitaBruta),
    },
    {
      id: 'depreciacao',
      name: '(-) Depreciação/Amortização Projetada',
      level: 1,
      value: depreciacao,
      percentOfRevenue: safePercent(depreciacao, receitaBruta),
    },
    {
      id: 'ebit',
      name: '= EBIT Projetado',
      level: 1,
      value: ebit,
      percentOfRevenue: safePercent(ebit, receitaBruta),
    },
    {
      id: 'despesas_financeiras',
      name: '(-) Despesas Financeiras Projetadas',
      level: 1,
      value: despesasFinanceiras,
      percentOfRevenue: safePercent(despesasFinanceiras, receitaBruta),
    },
    {
      id: 'receitas_financeiras',
      name: '(+) Receitas Financeiras Projetadas',
      level: 1,
      value: receitasFinanceiras,
      percentOfRevenue: safePercent(receitasFinanceiras, receitaBruta),
    },
    {
      id: 'impostos',
      name: '(-) Impostos Projetados',
      level: 1,
      value: impostos,
      percentOfRevenue: safePercent(impostos, receitaBruta),
    },
    {
      id: 'lucro_liquido',
      name: `= Lucro Líquido Projetado (${scenarioKey})`,
      level: 1,
      value: lucroLiquido,
      percentOfRevenue: safePercent(lucroLiquido, receitaBruta),
    },
  ];

  (Object.entries(forecastScenarios) as Array<[ScenarioType, ScenarioResult]>).forEach(([scenario, data]) => {
    lines.push({
      id: `forecast_${scenario}`,
      name: `Cenário ${scenario.charAt(0).toUpperCase() + scenario.slice(1)} - saldo final de caixa`,
      level: 2,
      value: money(data.totals.endBalance),
      percentOfRevenue: safePercent(data.totals.endBalance, receitaBruta),
      drillAvailable: false,
      metadata: {
        scenario,
        inflows: data.totals.inflows,
        outflows: data.totals.outflows,
        net: data.totals.net,
        burnRate: data.burnRate,
        runwayDays: data.runwayDays,
      },
    });
  });

  return lines;
}

function getProjectionWindow(period: DREPeriod): DREPeriod {
  const today = new Date();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const inputStart = new Date(period.start);
  const inputEnd = new Date(period.end);
  const totalDays = Math.max(1, Math.floor((inputEnd.getTime() - inputStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);

  const start = inputStart < currentDay ? currentDay : inputStart;
  const end = new Date(start);
  end.setDate(end.getDate() + totalDays - 1);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

async function fetchProjectedData(clinicId: string, period: DREPeriod, filters?: DREFilters): Promise<Record<string, any>> {
  try {
    const window = getProjectionWindow(period);
    const forecastScenarios = await computeAllScenarios(clinicId, window.start, window.end, {
      centroId: filters?.centroId,
      professionalId: filters?.professionalId || filters?.medicoId,
      convenioId: filters?.payerId || filters?.convenioId,
      unitId: filters?.unitId || filters?.unidadeId,
      unitName: filters?.unitName,
    });
    return { forecastScenarios, projectionWindow: window };
  } catch (err) {
    console.warn('⚠️ Erro ao buscar projeções:', err);
    return {};
  }
}

async function fetchMedicoData(clinicId: string, medicoId?: string): Promise<Record<string, any>> {
  try {
    let query = supabase
      .from('professionals')
      .select('*')
      .eq('clinic_id', clinicId);

    if (medicoId) query = query.eq('id', medicoId);

    const { data, error } = await query;

    if (error) throw error;
    return { medicos: data || [] };
  } catch (err) {
    console.warn('⚠️ Erro ao buscar médicos:', err);
    return {};
  }
}

async function fetchConvenioData(clinicId: string, convenioId?: string): Promise<Record<string, any>> {
  try {
    let query = supabase
      .from('health_insurances')
      .select('*')
      .eq('clinic_id', clinicId);

    if (convenioId) query = query.eq('id', convenioId);

    const { data, error } = await query;

    if (error) throw error;
    return { convenios: data || [] };
  } catch (err) {
    console.warn('⚠️ Erro ao buscar convênios:', err);
    return {};
  }
}

async function fetchUnidadeData(clinicId: string, unidadeId?: string): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('financial_cost_centers')
      .select('id, name, unit_name, center_type, is_active')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (error) throw error;

    const unitMap = new Map<string, any>();

    (data || []).forEach((row: any) => {
      const name = row.unit_name || row.name;
      if (!name) return;
      const key = `name:${normalizeText(name)}`;
      if (!unitMap.has(key)) {
        unitMap.set(key, {
          id: row.id,
          name,
          source: 'cost_center',
        });
      }
    });

    const unidades = Array.from(unitMap.values()).filter((row) => {
      if (!unidadeId) return true;
      return String(row.id || '') === String(unidadeId);
    });

    return { unidades };
  } catch (err) {
    console.warn('⚠️ Erro ao buscar unidades:', err);
    return {};
  }
}

/**
 * Busca especialidades para agregação de DRE por especialidade (ETAPA 2)
 */
async function fetchEspecialidadeData(clinicId: string, especialidadeId?: string): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .select('DISTINCT specialty_id, specialty_name')
      .eq('clinic_id', clinicId)
      .limit(5000);

    if (error) throw error;

    const especialidades = Array.from(
      new Map(
        (data || []).map(row => [
          row.specialty_id,
          {
            id: row.specialty_id,
            name: row.specialty_name || 'Sem especialidade',
          },
        ])
      ).values()
    ).filter((row) => {
      if (!especialidadeId) return true;
      return String(row.id || '') === String(especialidadeId);
    });

    return { especialidades };
  } catch (err) {
    console.warn('⚠️ Erro ao buscar especialidades:', err);
    return {};
  }
}

// ============================================================================
// COMPARAÇÕES
// ============================================================================

/**
 * Compara DRE de 2 períodos
 */
export async function compareDREPeriods(
  clinicId: string,
  variant: DREVariantType,
  currentPeriod: DREPeriod,
  previousPeriod: DREPeriod,
  filters?: DREFilters
): Promise<DREComparison> {
  const [current, previous] = await Promise.all([
    calculateDREVariant(clinicId, variant, currentPeriod, filters),
    calculateDREVariant(clinicId, variant, previousPeriod, filters),
  ]);

  const delta: Partial<DRESummary> = {};
  const deltaPercent: Partial<DRESummary> = {};

  (Object.keys(current.summary) as Array<keyof DRESummary>).forEach(key => {
    const currValue = current.summary[key] || 0;
    const prevValue = previous.summary[key] || 0;

    delta[key] = currValue - prevValue;
    deltaPercent[key] = prevValue !== 0 ? ((currValue - prevValue) / Math.abs(prevValue)) * 100 : 0;
  });

  const highlights: string[] = [];

  if (Math.abs(deltaPercent.receitaBruta || 0) > 10) {
    highlights.push(`Receita bruta variou ${(deltaPercent.receitaBruta || 0).toFixed(1)}%`);
  }

  if (Math.abs(deltaPercent.margemBrutaPercent || 0) > 5) {
    highlights.push(`Margem bruta variou ${(deltaPercent.margemBrutaPercent || 0).toFixed(1)}pp`);
  }

  if (Math.abs(deltaPercent.lucroLiquidoPercent || 0) > 10) {
    highlights.push(`Lucro líquido variou ${(deltaPercent.lucroLiquidoPercent || 0).toFixed(1)}%`);
  }

  return {
    current,
    previous,
    delta,
    deltaPercent,
    highlights,
  };
}

// ============================================================================
// DRILL-DOWN
// ============================================================================

export type DrillDownCriteria = 'convenio' | 'guia' | 'paciente' | 'atendimento' | 'centro' | 'medico';

/**
 * Expande uma linha de receita por critério
 */
export async function drillDownReceita(
  clinicId: string,
  drillBy: DrillDownCriteria,
  context?: Record<string, any>
): Promise<DRELineItem[]> {
  try {
    if (drillBy === 'convenio') {
      return await drillDownByConvenio(clinicId);
    } else if (drillBy === 'guia') {
      return await drillDownByGuia(clinicId, context?.convenioId);
    } else if (drillBy === 'paciente') {
      return await drillDownByPaciente(clinicId, context?.guiaId);
    } else if (drillBy === 'atendimento') {
      return await drillDownByAtendimento(clinicId, context?.pacienteId);
    }

    return [];
  } catch (error) {
    console.error(`❌ Erro ao drill-down ${drillBy}:`, error);
    return [];
  }
}

async function drillDownByConvenio(clinicId: string): Promise<DRELineItem[]> {
  try {
    const { data, error } = await supabase
      .from('ar_invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(5000);

    if (error) throw error;

    const grouped = new Map<string, { name: string; total: number }>();
    (data || [])
      .filter((row: any) => isActiveAccrualStatus(row.status))
      .forEach((row: any) => {
        const id = String(row.convenio_id || row.payer_id || 'particular');
        const name = row.convenio_name || row.payer_name || 'Particular';
        const current = grouped.get(id) || { name, total: 0 };
        current.total += getReceivableValue(row);
        grouped.set(id, current);
      });

    return Array.from(grouped.entries()).map(([id, row]) => ({
      id: `convenio_${id}`,
      name: row.name,
      level: 2,
      value: money(row.total),
      drillAvailable: true,
      metadata: { convenioId: id },
    }));
  } catch (err) {
    console.error('❌ Erro drill-down convenio:', err);
    return [];
  }
}

async function drillDownByGuia(clinicId: string, convenioId?: string): Promise<DRELineItem[]> {
  try {
    let query = supabase
      .from('billing_guides')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(5000);

    if (convenioId) query = query.eq('health_insurance_id', convenioId);

    const { data, error } = await query;

    if (error) throw error;

    const grouped = new Map<string, { name: string; total: number }>();
    (data || []).forEach((row: any) => {
      const id = String(row.id || row.guide_number || row.guide_id || 'sem_guia');
      const name = row.guide_number ? `Guia ${row.guide_number}` : `Guia ${id}`;
      const current = grouped.get(id) || { name, total: 0 };
      current.total += money(row.amount ?? row.valor ?? row.value ?? row.total_amount);
      grouped.set(id, current);
    });

    return Array.from(grouped.entries()).map(([id, row]) => ({
      id: `guia_${id}`,
      name: row.name,
      level: 3,
      value: money(row.total),
      drillAvailable: true,
      metadata: { guiaId: id },
    }));
  } catch (err) {
    console.error('❌ Erro drill-down guia:', err);
    return [];
  }
}

async function drillDownByPaciente(clinicId: string, guiaId?: string): Promise<DRELineItem[]> {
  try {
    let query = supabase
      .from('ar_invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(5000);

    if (guiaId) query = query.eq('billing_guide_id', guiaId);

    const { data, error } = await query;

    if (error) throw error;

    const grouped = new Map<string, { name: string; total: number }>();
    (data || []).forEach((row: any) => {
      const id = String(row.patient_id || 'sem_paciente');
      const name = row.patient_name || 'Desconhecido';
      const current = grouped.get(id) || { name, total: 0 };
      current.total += getReceivableValue(row);
      grouped.set(id, current);
    });

    return Array.from(grouped.entries()).map(([id, row]) => ({
      id: `paciente_${id}`,
      name: row.name,
      level: 4,
      value: money(row.total),
      drillAvailable: true,
      metadata: { pacienteId: id },
    }));
  } catch (err) {
    console.error('❌ Erro drill-down paciente:', err);
    return [];
  }
}

async function drillDownByAtendimento(clinicId: string, pacienteId?: string): Promise<DRELineItem[]> {
  try {
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(5000);

    if (pacienteId) query = query.eq('patient_id', pacienteId);

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: `atendimento_${row.id}`,
      name: String(row.appointment_date || row.date || row.created_at || row.id),
      level: 5,
      value: money(row.amount ?? row.valor ?? row.price ?? row.total),
      drillAvailable: false,
      metadata: { atendimentoId: row.id },
    }));
  } catch (err) {
    console.error('❌ Erro drill-down atendimento:', err);
    return [];
  }
}

// ============================================================================
// BENCHMARK
// ============================================================================

/**
 * Compara métricas com benchmark hospitalar
 */
export async function getBenchmarkMetrics(
  variant: DREVariantType,
  clinicMetrics: Partial<DRESummary>
): Promise<BenchmarkMetrics[]> {
  const benchmarkByVariant: Record<DREVariantType, Record<string, number>> = {
    gerencial: {
      margemBrutaPercent: 45,
      ebitdaPercent: 25,
      lucroLiquidoPercent: 12,
      roiPercent: 15,
    },
    contabil: {
      margemBrutaPercent: 42,
      ebitdaPercent: 23,
      lucroLiquidoPercent: 11,
      roiPercent: 14,
    },
    centro: {
      margemBrutaPercent: 40,
      ebitdaPercent: 20,
      lucroLiquidoPercent: 10,
      roiPercent: 13,
    },
    medico: {
      margemBrutaPercent: 35,
      ebitdaPercent: 18,
      lucroLiquidoPercent: 9,
      roiPercent: 12,
    },
    convenio: {
      margemBrutaPercent: 30,
      ebitdaPercent: 15,
      lucroLiquidoPercent: 7,
      roiPercent: 10,
    },
    unidade: {
      margemBrutaPercent: 38,
      ebitdaPercent: 19,
      lucroLiquidoPercent: 9,
      roiPercent: 12,
    },
    especialidade: {
      margemBrutaPercent: 38,
      ebitdaPercent: 21,
      lucroLiquidoPercent: 10,
      roiPercent: 13,
    },
    projetada: {
      margemBrutaPercent: 43,
      ebitdaPercent: 24,
      lucroLiquidoPercent: 11,
      roiPercent: 14,
    },
  };

  const benchmarks = benchmarkByVariant[variant] || benchmarkByVariant.gerencial;

  return Object.entries(benchmarks).map(([metric, industryAvg]) => {
    const clinicValue = clinicMetrics[metric as keyof DRESummary] || 0;
    const diff = clinicValue - industryAvg;
    const percentile = diff > 0 ? 'above' : diff < 0 ? 'below' : 'at';

    return {
      metric,
      clinic: clinicValue,
      industryAvg,
      percentile: Math.abs(diff),
      trend: percentile,
    };
  });
}
