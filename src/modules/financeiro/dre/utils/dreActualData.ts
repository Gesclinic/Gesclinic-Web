import { getFinancialConsolidation } from '@/lib/financialConsolidationApi';

export type DrePeriod = { start: string; end: string };

export type DreActualData = Awaited<ReturnType<typeof getFinancialConsolidation>>;

export type SegmentKey = 'convenios' | 'medicos' | 'procedimentos' | 'especialidades' | 'centros' | 'unidades';

export type SegmentMetric = {
  id: string;
  name: string;
  receita: number;
  custos: number;
  glosa: number;
  count: number;
  ebitda: number;
  margem: number;
  ticketMedio: number;
};

export type MonthlyMetric = {
  month: string;
  receita: number;
  custos: number;
  ebitda: number;
  lucro: number;
};

export const money = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getReceivableValue = (row: any): number => money(
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
  ?? row?.service_value
);

export const getPayableValue = (row: any): number => money(
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
  ?? row?.balance_amount
);

export const getDeductionValue = (row: any): number => money(
  row?.glosa_value
  ?? row?.glosa_amount
  ?? row?.chargeback_amount
  ?? row?.desconto
  ?? row?.discount_value
  ?? row?.descontos
);

export const getReceivedValue = (row: any): number => money(
  row?.received_amount
  ?? row?.received_value
  ?? row?.valor_recebido
  ?? row?.paid_amount
  ?? row?.paid_total
);

export const getDateOnly = (value: unknown): string | null => {
  if (!value) return null;
  return String(value).split('T')[0] || null;
};

export const getReceivableDate = (row: any): string | null => getDateOnly(
  row?.competency_date
  ?? row?.invoice_date
  ?? row?.due_date
  ?? row?.received_date
  ?? row?.created_at
);

export const getPayableDate = (row: any): string | null => getDateOnly(
  row?.competency_date
  ?? row?.issue_date
  ?? row?.due_date
  ?? row?.paid_at
  ?? row?.created_at
);

const normalize = (value: unknown) => String(value || '').trim();

const getSegmentInfo = (row: any, segment: SegmentKey): { id: string; name: string } => {
  if (segment === 'convenios') {
    const name = normalize(row?.payer_name || row?.convenio_name || row?.insurance_name || 'Particular') || 'Particular';
    return { id: String(row?.payer_id || row?.convenio_id || row?.health_insurance_id || name), name };
  }

  if (segment === 'medicos') {
    const name = normalize(row?.professional_name || row?.doctor_name || row?.medico_name || 'Sem profissional') || 'Sem profissional';
    return { id: String(row?.professional_id || row?.doctor_id || row?.medico_id || name), name };
  }

  if (segment === 'procedimentos') {
    const name = normalize(row?.service_name || row?.service_description || row?.procedure_name || row?.description || 'Sem procedimento') || 'Sem procedimento';
    return { id: String(row?.service_id || row?.procedure_id || name), name };
  }

  if (segment === 'especialidades') {
    const name = normalize(row?.specialty_name || row?.especialidade_name || row?.specialty || 'Sem especialidade') || 'Sem especialidade';
    return { id: String(row?.specialty_id || row?.especialidade_id || name), name };
  }

  if (segment === 'unidades') {
    const name = normalize(row?.unit_name || row?.branch_name || 'Sem unidade') || 'Sem unidade';
    return { id: String(row?.unit_id || row?.branch_id || name), name };
  }

  const name = normalize(row?.cost_center_name || row?.center_name || row?.category_name || row?.unit_name || 'Sem centro') || 'Sem centro';
  return { id: String(row?.cost_center_id || row?.centro_custo_id || row?.category_id || name), name };
};

export async function loadDreActualData(clinicId: string, period: DrePeriod): Promise<DreActualData> {
  return getFinancialConsolidation(clinicId, period.start, period.end);
}

export function buildSegmentMetrics(consolidation: DreActualData | null, segment: SegmentKey): SegmentMetric[] {
  if (!consolidation) return [];

  const grouped = new Map<string, SegmentMetric>();
  const ensure = (id: string, name: string) => {
    if (!grouped.has(id)) {
      grouped.set(id, { id, name, receita: 0, custos: 0, glosa: 0, count: 0, ebitda: 0, margem: 0, ticketMedio: 0 });
    }
    return grouped.get(id)!;
  };

  (consolidation.receivables || []).forEach((row: any) => {
    const info = getSegmentInfo(row, segment);
    const item = ensure(info.id, info.name);
    item.receita += getReceivableValue(row);
    item.glosa += getDeductionValue(row);
    item.count += 1;
  });

  const directCostSegments: SegmentKey[] = ['centros', 'unidades', 'medicos'];
  if (directCostSegments.includes(segment)) {
    (consolidation.payables || []).forEach((row: any) => {
      const info = getSegmentInfo(row, segment);
      const item = ensure(info.id, info.name);
      item.custos += getPayableValue(row);
    });
  }

  const items = Array.from(grouped.values()).filter((item) => item.receita > 0 || item.custos > 0);
  const totalReceita = items.reduce((sum, item) => sum + item.receita, 0);
  const currentCost = items.reduce((sum, item) => sum + item.custos, 0);
  const totalCost = money(consolidation.expenses?.totalWithCardFees ?? consolidation.expenses?.totalOperating);

  if (totalReceita > 0 && currentCost === 0 && totalCost > 0) {
    items.forEach((item) => {
      item.custos = (item.receita / totalReceita) * totalCost;
    });
  }

  return items.map((item) => {
    const receitaLiquida = Math.max(0, item.receita - item.glosa);
    const ebitda = receitaLiquida - item.custos;
    return {
      ...item,
      ebitda,
      margem: item.receita > 0 ? (ebitda / item.receita) * 100 : 0,
      ticketMedio: item.count > 0 ? item.receita / item.count : 0,
    };
  });
}

export function buildMonthlyMetrics(consolidation: DreActualData | null): MonthlyMetric[] {
  if (!consolidation) return [];

  const byMonth = new Map<string, MonthlyMetric>();
  const ensure = (date: string | null) => {
    const key = date ? date.slice(0, 7) : 'Sem data';
    const label = key === 'Sem data'
      ? key
      : new Date(`${key}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    if (!byMonth.has(key)) {
      byMonth.set(key, { month: label, receita: 0, custos: 0, ebitda: 0, lucro: 0 });
    }
    return byMonth.get(key)!;
  };

  (consolidation.receivables || []).forEach((row: any) => {
    ensure(getReceivableDate(row)).receita += getReceivableValue(row);
  });

  (consolidation.payables || []).forEach((row: any) => {
    ensure(getPayableDate(row)).custos += getPayableValue(row);
  });

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, item]) => {
      const ebitda = item.receita - item.custos;
      return { ...item, ebitda, lucro: ebitda };
    });
}
