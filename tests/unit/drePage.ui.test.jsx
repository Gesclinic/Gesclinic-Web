import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DREPage from '@/pages/clinica/financeiro/DRE';

const setVariantMock = vi.fn();

vi.mock('@/hooks/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(() => []),
}));

vi.mock('@/contexts/useClinicContext', () => ({
  useClinicContext: vi.fn(() => ({
    clinic: { id: 'clinic-001', name: 'Clinica Teste' },
  })),
}));

vi.mock('@/components/ui/PageLayout', () => ({
  default: ({ children, title, subtitle }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }) => <div>{children}</div>,
  SelectTrigger: ({ children }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }) => <span>{placeholder}</span>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/lib/dreApi', () => ({
  getDREData: vi.fn(async () => ({ receitas: { total: 0, quantidade: 0 }, custos: { total: 0 }, despesas: { total: 0 }, lucro: { liquido: 0 } })),
  getMarginAnalysis: vi.fn(async () => ({})),
  getRevenueByService: vi.fn(async () => []),
  getExpenseByCategory: vi.fn(async () => []),
  comparePeriods: vi.fn(async () => ({})),
}));

vi.mock('@/modules/financeiro/dre/hooks/useFinancialDRE', () => ({
  default: vi.fn(() => ({
    variant: 'gerencial',
    setVariant: setVariantMock,
    filters: {},
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
    period: { start: '2026-06-01', end: '2026-06-30' },
    setPeriod: vi.fn(),
    refresh: vi.fn(),
    loading: false,
    loadingComparison: false,
    loadingBenchmark: false,
    dre: { lines: [], summary: null, metadata: {} },
    comparison: null,
    benchmarks: [],
    drillDown: vi.fn(),
  })),
}));

vi.mock('@/modules/financeiro/dre/components/DREKpis', () => ({
  default: () => <div data-testid="enterprise-kpis">enterprise-kpis</div>,
}));

vi.mock('@/modules/financeiro/dre/components/DRETable', () => ({
  default: () => <div>enterprise-table</div>,
}));

vi.mock('@/modules/financeiro/dre/components/DREComparison', () => ({
  default: () => <div>enterprise-comparison</div>,
}));

vi.mock('@/modules/financeiro/dre/components/DREBenchmark', () => ({
  default: () => <div>enterprise-benchmark</div>,
}));

vi.mock('@/modules/financeiro/dre/components/DREAlerts', () => ({
  default: () => <div>enterprise-alerts</div>,
}));

vi.mock('@/modules/financeiro/fluxo-caixa/components/ScenarioPanel', () => ({
  default: () => <div>scenario-panel</div>,
}));

vi.mock('@/modules/financeiro/fluxo-caixa/components/ForecastPanel', () => ({
  default: () => <div>forecast-panel</div>,
}));

vi.mock('@/components/financeiro/RelatoriosToolbar', () => ({
  default: () => null,
}));

vi.mock('@/lib/professionalsApi', () => ({
  listProfessionals: vi.fn(async () => []),
}));

vi.mock('@/lib/payersApi', () => ({
  listPayers: vi.fn(async () => []),
}));

vi.mock('@/lib/healthInsurancesApi', () => ({
  listHealthInsurances: vi.fn(async () => []),
}));

vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('recharts', () => {
  const Mock = ({ children }) => <div>{children}</div>;
  return {
    LineChart: Mock,
    Line: Mock,
    BarChart: Mock,
    Bar: Mock,
    PieChart: Mock,
    Pie: Mock,
    Cell: Mock,
    XAxis: Mock,
    YAxis: Mock,
    CartesianGrid: Mock,
    Tooltip: Mock,
    Legend: Mock,
    ResponsiveContainer: Mock,
  };
});

describe('DREPage UI interactions', () => {
  beforeEach(() => {
    setVariantMock.mockReset();
  });

  it('aciona a troca para Projetada ao clicar na variante Projetada', async () => {
    const user = userEvent.setup();
    render(<DREPage />);

    await user.click(screen.getByRole('button', { name: 'Projetada' }));

    expect(setVariantMock).toHaveBeenCalledWith('projetada');
  });

  it('Exibir legado substitui a visao nova e permite retornar', async () => {
    const user = userEvent.setup();
    render(<DREPage />);

    expect(screen.getByTestId('enterprise-kpis')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Exibir legado' }));

    expect(screen.queryByTestId('enterprise-kpis')).not.toBeInTheDocument();
    expect(screen.getByText(/Modo legado ativo:/i)).toBeInTheDocument();
    expect(screen.getByText(/Período:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exibir motor novo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Exibir motor novo' }));

    expect(screen.getByTestId('enterprise-kpis')).toBeInTheDocument();
  });
});
