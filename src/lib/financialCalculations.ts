/**
 * 💰 Financial Calculations Utilities
 * 
 * Funções reutilizáveis para cálculos financeiros
 * Sem dependências externas para garantir portabilidade
 */

export interface DailyMovement {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface CashFlowSummary {
  total_inflows: number;
  total_outflows: number;
  net_balance: number;
  liquidity_ratio: number;
  coverage_days: number;
  period?: { start: string; end: string; days: number };
}

export interface Receivable {
  id: string;
  amount: number;
  net_value?: number;
  balance_amount?: number;
  due_date: string;
  status: string;
  patient_name?: string;
}

export interface Payable {
  id: string;
  amount: number;
  net_amount?: number;
  balance_amount?: number;
  open_amount?: number;
  remaining_amount?: number;
  paid_amount?: number;
  paid_value?: number;
  due_date: string;
  status: string;
  vendor_name?: string;
}

export interface PeriodWindow {
  today: number;
  next7d: number;
  next30d: number;
  overdue: number;
}

function getReceivableCashAmount(receivable: Receivable): number {
  return Number(receivable.net_value ?? receivable.balance_amount ?? receivable.amount ?? 0);
}

function getPayableOpenAmount(payable: Payable): number {
  const explicitBalance = payable.balance_amount ?? payable.open_amount ?? payable.remaining_amount;
  if (explicitBalance !== null && explicitBalance !== undefined) {
    return Math.max(0, Number(explicitBalance || 0));
  }
  const amount = Number(payable.net_amount ?? payable.amount ?? 0);
  const paid = Number(payable.paid_amount ?? payable.paid_value ?? 0);
  return Math.max(0, amount - paid);
}

// ============================================
// CÁLCULOS DE SALDO
// ============================================

/**
 * Calcula saldo projetado em 30 dias
 * Fórmula: Atual + A Receber (30d) - A Pagar (30d)
 */
export function calculateProjectedBalance(
  currentBalance: number,
  receivable30d: number,
  payable30d: number
): number {
  return currentBalance + receivable30d - payable30d;
}

/**
 * Calcula dias de cobertura
 * Fórmula: Saldo / (Despesas Diárias Médias)
 */
export function calculateCoverageDays(
  currentBalance: number,
  averageDailyExpense: number
): number {
  if (averageDailyExpense === 0) return 999; // Sem despesas
  return Math.round(currentBalance / averageDailyExpense);
}

/**
 * Calcula variação percentual entre dois períodos
 */
export function calculateVariation(current: number, previous: number): number {
  if (!current || !previous || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calcula liquidez = Ativo Disponível / Passivo Exigível
 */
export function calculateLiquidity(assets: number, liabilities: number): number {
  if (liabilities === 0) return assets > 0 ? 999 : 0;
  return assets / liabilities;
}

// ============================================
// AGRUPAMENTO E FILTRO DE DADOS
// ============================================

/**
 * Agrupa movimentos por dia
 */
export function groupMovementsByDay(
  movements: DailyMovement[]
): Record<string, DailyMovement> {
  const grouped: Record<string, DailyMovement> = {};
  movements.forEach((m) => {
    grouped[m.date] = m;
  });
  return grouped;
}

/**
 * Calcula total de receitas em um período
 */
export function calculateReceivableByPeriod(
  receivables: Receivable[],
  startDate: string,
  endDate: string
): number {
  if (!Array.isArray(receivables)) return 0;

  return receivables.reduce((sum, r) => {
    if (!r.due_date) return sum;
    if (r.due_date >= startDate && r.due_date <= endDate && 
        r.status === 'open' || r.status === 'pending') {
      return sum + (r.amount || 0);
    }
    return sum;
  }, 0);
}

/**
 * Calcula total de despesas em um período
 */
export function calculatePayableByPeriod(
  payables: Payable[],
  startDate: string,
  endDate: string
): number {
  if (!Array.isArray(payables)) return 0;

  return payables.reduce((sum, p) => {
    if (!p.due_date) return sum;
    const status = String(p.status || '').toUpperCase();
    if (p.due_date >= startDate && p.due_date <= endDate &&
        ['OPEN', 'PARTIAL', 'APPROVED', 'OVERDUE'].includes(status)) {
      return sum + getPayableOpenAmount(p);
    }
    return sum;
  }, 0);
}

/**
 * Calcula contas vencidas
 */
export function calculateOverdueReceivables(
  receivables: Receivable[]
): { count: number; total: number } {
  if (!Array.isArray(receivables)) return { count: 0, total: 0 };

  const today = new Date().toISOString().split('T')[0];
  let count = 0;
  let total = 0;

  receivables.forEach((r) => {
    if (r.due_date && r.due_date < today && 
        (r.status === 'open' || r.status === 'pending')) {
      count++;
      total += getReceivableCashAmount(r);
    }
  });

  return { count, total };
}

/**
 * Calcula contas a receber por janelas de tempo
 */
export function calculateReceivablesByDueWindow(
  receivables: Receivable[]
): PeriodWindow {
  if (!Array.isArray(receivables)) {
    return { today: 0, next7d: 0, next30d: 0, overdue: 0 };
  }

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    .toISOString()
    .split('T')[0];
  const day7 = new Date(new Date().setDate(new Date().getDate() + 7))
    .toISOString()
    .split('T')[0];
  const day30 = new Date(new Date().setDate(new Date().getDate() + 30))
    .toISOString()
    .split('T')[0];

  let result: PeriodWindow = { today: 0, next7d: 0, next30d: 0, overdue: 0 };

  receivables.forEach((r) => {
    if (!r.due_date || r.status !== 'open') return;

    const amount = getReceivableCashAmount(r);

    if (r.due_date === today) {
      result.today += amount;
    } else if (r.due_date < today) {
      result.overdue += amount;
    } else if (r.due_date <= day7) {
      result.next7d += amount;
    } else if (r.due_date <= day30) {
      result.next30d += amount;
    }
  });

  return result;
}

/**
 * Calcula contas a pagar por janelas de tempo
 */
export function calculatePayablesByDueWindow(
  payables: Payable[]
): PeriodWindow {
  if (!Array.isArray(payables)) {
    return { today: 0, next7d: 0, next30d: 0, overdue: 0 };
  }

  const today = new Date().toISOString().split('T')[0];
  const day7 = new Date(new Date().setDate(new Date().getDate() + 7))
    .toISOString()
    .split('T')[0];
  const day30 = new Date(new Date().setDate(new Date().getDate() + 30))
    .toISOString()
    .split('T')[0];

  let result: PeriodWindow = { today: 0, next7d: 0, next30d: 0, overdue: 0 };

  payables.forEach((p) => {
    const status = String(p.status || '').toUpperCase();
    if (!p.due_date || !['OPEN', 'PARTIAL', 'APPROVED', 'OVERDUE'].includes(status)) return;

    const amount = getPayableOpenAmount(p);
    if (amount <= 0) return;

    if (p.due_date === today) {
      result.today += amount;
    } else if (p.due_date < today) {
      result.overdue += amount;
    } else if (p.due_date <= day7) {
      result.next7d += amount;
    } else if (p.due_date <= day30) {
      result.next30d += amount;
    }
  });

  return result;
}

/**
 * Calcula média diária de despesas em um período
 */
export function calculateAverageDailyExpense(
  totalExpense: number,
  days: number
): number {
  if (days === 0) return 0;
  return totalExpense / days;
}

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata percentual
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(1)}%`;
}
