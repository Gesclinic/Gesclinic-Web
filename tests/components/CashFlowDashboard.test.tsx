import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CashFlowDashboard } from '../../src/modules/financeiro/fluxo-caixa/components/CashFlowDashboard';
import { useCashFlow } from '../../src/modules/financeiro/fluxo-caixa/hooks/useCashFlow';

const hookMock = vi.hoisted(() => ({
  useCashFlow: vi.fn(),
  useCashFlowMetrics: vi.fn(),
  useCashFlowAlerts: vi.fn(),
  useCashFlowProjection: vi.fn(),
}));

vi.mock('../../src/modules/financeiro/fluxo-caixa/hooks/useCashFlow', () => hookMock);

vi.mock('../../src/modules/financeiro/fluxo-caixa/components/CashFlowChart', () => ({
  default: ({ data, type }: any) => <div data-testid="cash-flow-chart">Chart {type} {data.length}</div>,
}));

vi.mock('../../src/modules/financeiro/fluxo-caixa/components/CashFlowFilters', () => ({
  default: ({ filters, onFiltersChange }: any) => (
    <button type="button" onClick={() => onFiltersChange({ ...filters, period: 'daily' })}>
      Filters
    </button>
  ),
}));

vi.mock('../../src/modules/financeiro/fluxo-caixa/components/LiquidityIndicator', () => ({
  default: ({ metrics }: any) => <div data-testid="liquidity-indicator">Indicator {metrics?.cashHealth}</div>,
}));

const baseSnapshot = {
  id: 'snapshot-1',
  financial_account_id: 'account-1',
  closing_balance: 1500,
  total_income: 1000,
  total_expense: 500,
  projected_balance: 1800,
};

const baseMetrics = {
  cashHealth: 'healthy',
  isCritical: false,
  currentBalance: 1500,
  balanceChange: 500,
  todayIncome: 1000,
  todayExpense: 500,
  projectedBalance30d: 1800,
};

const setupHook = (overrides: Record<string, unknown> = {}) => {
  const updateFilters = vi.fn();

  hookMock.useCashFlow.mockReturnValue({
    loading: false,
    snapshots: [baseSnapshot],
    predictions: [],
    alerts: [],
    metrics: { current_balance: 1500 },
    filters: { period: 'monthly' },
    updateFilters,
    error: undefined,
    ...overrides,
  });
  hookMock.useCashFlowMetrics.mockReturnValue(baseMetrics);
  hookMock.useCashFlowAlerts.mockReturnValue([]);
  hookMock.useCashFlowProjection.mockReturnValue([
    { date: '2026-05-13', balance: 1500, isNegative: false },
  ]);

  return { updateFilters };
};

describe('CashFlowDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHook();
  });

  it('renders filters, metrics, chart, indicator, and account details', () => {
    render(<CashFlowDashboard />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Saldo Atual')).toBeInTheDocument();
    expect(screen.getByText('Entradas Hoje')).toBeInTheDocument();
    expect(screen.getByText('Saúde do Caixa')).toBeInTheDocument();
    expect(screen.getByTestId('cash-flow-chart')).toBeInTheDocument();
    expect(screen.getByTestId('liquidity-indicator')).toBeInTheDocument();
    expect(screen.getByText('account-1')).toBeInTheDocument();
  });

  it('applies custom className prop', () => {
    const { container } = render(<CashFlowDashboard className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders loading placeholders instead of chart and indicator content', () => {
    setupHook({ loading: true });

    render(<CashFlowDashboard />);

    expect(screen.queryByTestId('cash-flow-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('liquidity-indicator')).not.toBeInTheDocument();
  });

  it('renders error state', () => {
    setupHook({ error: 'Dados indisponiveis' });

    render(<CashFlowDashboard />);

    expect(screen.getByText('Dados indisponiveis')).toBeInTheDocument();
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('renders alerts derived from metrics', () => {
    hookMock.useCashFlowAlerts.mockReturnValue([
      { id: 'alert-1', severity: 'warning', message: 'Saldo baixo' },
    ]);

    render(<CashFlowDashboard />);

    expect(screen.getByText('Saldo baixo')).toBeInTheDocument();
  });

  it('passes filter changes to the hook', () => {
    const { updateFilters } = setupHook();

    render(<CashFlowDashboard />);
    screen.getByText('Filters').click();

    expect(updateFilters).toHaveBeenCalledWith({ period: 'daily' });
  });

  it('handles empty snapshots gracefully', () => {
    setupHook({ snapshots: [] });

    render(<CashFlowDashboard />);

    expect(screen.getByText('Nenhum dado disponível')).toBeInTheDocument();
  });
});
