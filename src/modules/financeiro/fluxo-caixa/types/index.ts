/**
 * 💰 Tipos e Interfaces - Fluxo de Caixa Enterprise
 */

// ═══════════════════════════════════════════════════════════════════════════
// Snapshots de Fluxo de Caixa
// ═══════════════════════════════════════════════════════════════════════════

export interface CashFlowSnapshot {
  id: string;
  clinic_id: string;
  snapshot_date: string;
  financial_account_id: string | null;
  
  // Realizado
  opening_balance: number;
  total_income: number;
  total_expense: number;
  closing_balance: number;
  
  // Previsto
  projected_income: number;
  projected_expense: number;
  projected_balance: number;
  
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Previsões de Fluxo de Caixa
// ═══════════════════════════════════════════════════════════════════════════

export type PredictionType = 'income' | 'expense';
export type PredictionStatus = 'scheduled' | 'confirmed' | 'completed' | 'canceled';

export interface CashFlowPrediction {
  id: string;
  clinic_id: string;
  financial_account_id: string;
  
  prediction_date: string;
  prediction_type: PredictionType;
  amount: number;
  description?: string;
  category_id?: string;
  
  status: PredictionStatus;
  
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Análise Diária
// ═══════════════════════════════════════════════════════════════════════════

export interface DailyAnalysis {
  analysis_date: string;
  financial_account_id: string | null;
  account_name?: string;
  
  // Realizado
  realized_opening: number;
  realized_income: number;
  realized_expense: number;
  realized_closing: number;
  realized_net: number;
  
  // Previsto
  projected_income: number;
  projected_expense: number;
  projected_balance: number;
  projected_net: number;
  
  // Variações
  income_variance: number;
  expense_variance: number;
  balance_variance: number;
  
  clinic_id: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Resumo de Período
// ═══════════════════════════════════════════════════════════════════════════

export interface PeriodSummary {
  clinic_id: string;
  period_start: string;
  period_end: string;
  financial_account_id?: string;
  account_name?: string;
  
  // Realizado
  period_opening_balance: number;
  period_total_income: number;
  period_total_expense: number;
  period_closing_balance: number;
  period_net_realized: number;
  
  // Previsto
  period_projected_income: number;
  period_projected_expense: number;
  period_projected_balance: number;
  period_net_projected: number;
  
  days_in_period: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Financeiro
// ═══════════════════════════════════════════════════════════════════════════

export interface DashboardMetrics {
  current_date: string;
  
  // Saldos Atuais
  current_balance: number;
  previous_balance: number;
  
  // Hoje
  today_income: number;
  today_expense: number;
  today_net: number;
  
  // Previsto (7 dias)
  projected_7days_income: number;
  projected_7days_expense: number;
  projected_7days_balance: number;
  
  // Previsto (30 dias)
  projected_30days_income: number;
  projected_30days_expense: number;
  projected_30days_balance: number;
  
  // Consolidado
  consolidated_income: number;
  consolidated_expense: number;
  consolidated_balance: number;
  
  // Indicadores
  cash_health: 'healthy' | 'warning' | 'critical';
  runway_days?: number;
  accounts_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Filtros
// ═══════════════════════════════════════════════════════════════════════════

export interface CashFlowFilters {
  // Período
  start_date?: string;
  end_date?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  // Contas
  financial_account_ids?: string[];
  
  // Categorias
  category_ids?: string[];
  
  // Centros de custo
  cost_center_ids?: string[];
  
  // Tipo
  type?: 'income' | 'expense' | 'all';
  
  // Status
  status?: PredictionStatus | PredictionStatus[];
  
  // Conciliado
  reconciled?: boolean;
  
  // Consolidado
  consolidated?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Alertas
// ═══════════════════════════════════════════════════════════════════════════

export type AlertType = 
  | 'negative_balance'
  | 'excess_expenses'
  | 'low_liquidity'
  | 'accounts_payable'
  | 'reconciliation_variance'
  | 'projection_deviation';

export interface CashFlowAlert {
  id: string;
  clinic_id: string;
  alert_type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details?: Record<string, any>;
  created_at: string;
  acknowledged?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Projeção
// ═══════════════════════════════════════════════════════════════════════════

export interface ProjectionPoint {
  date: string;
  realized_balance: number | null;
  projected_balance: number;
  income: number;
  expense: number;
}

export interface CashFlowProjection {
  clinic_id: string;
  start_date: string;
  end_date: string;
  financial_account_id?: string;
  
  points: ProjectionPoint[];
  
  // Estatísticas
  min_projected_balance: number;
  max_projected_balance: number;
  avg_daily_change: number;
  
  // Alertas
  has_negative_periods: boolean;
  critical_dates?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Consolidação Bancária
// ═══════════════════════════════════════════════════════════════════════════

export interface BankConsolidation {
  clinic_id: string;
  consolidation_date: string;
  
  accounts: {
    account_id: string;
    account_name: string;
    account_type: string;
    
    // Dados
    realized_balance: number;
    projected_balance: number;
    total_transactions: number;
    pending_transactions: number;
  }[];
  
  // Totais
  total_realized_balance: number;
  total_projected_balance: number;
  total_transactions: number;
  total_pending: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Comparação
// ═══════════════════════════════════════════════════════════════════════════

export interface ComparisonPeriod {
  period: string;
  realized_income: number;
  realized_expense: number;
  realized_net: number;
  projected_income: number;
  projected_expense: number;
  projected_net: number;
}

export interface CashFlowComparison {
  clinic_id: string;
  periods: ComparisonPeriod[];
  
  // Variações
  income_growth: number;
  expense_growth: number;
  net_growth: number;
  
  // Tendências
  trend: 'improving' | 'stable' | 'declining';
}

// ═══════════════════════════════════════════════════════════════════════════
// Estado do Componente
// ═══════════════════════════════════════════════════════════════════════════

export interface CashFlowState {
  loading: boolean;
  error?: string;
  
  metrics?: DashboardMetrics;
  snapshots: CashFlowSnapshot[];
  predictions: CashFlowPrediction[];
  alerts: CashFlowAlert[];
  
  filters: CashFlowFilters;
  selectedPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  selectedAccount?: string;
  
  lastRefresh: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RPC Response Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CalculateCashFlowResponse {
  snapshot_id: string;
  clinic_id: string;
  snapshot_date: string;
  account_id: string | null;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  closing_balance: number;
  projected_income: number;
  projected_expense: number;
  projected_balance: number;
}

export interface RefreshCashFlowPeriodResponse {
  processed_dates: number;
  processed_accounts: number;
  total_snapshots_created: number;
}
