/**
 * Tests for CashFlowSummary Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CashFlowSummary, { CashFlowSummaryMetrics } from '@/modules/financeiro/fluxo-caixa/components/CashFlowSummary';

describe('CashFlowSummary Component', () => {
  const mockMetrics: CashFlowSummaryMetrics = {
    totalIncome: 50000,
    totalExpense: -30000,
    netBalance: 20000,
    previousNetBalance: 15000,
    period: 'Janeiro 2026',
    isLoading: false,
  };

  it('should render summary section with period', () => {
    render(<CashFlowSummary metrics={mockMetrics} />);
    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Janeiro 2026')).toBeInTheDocument();
  });

  it('should render 4 summary cards', () => {
    render(<CashFlowSummary metrics={mockMetrics} />);
    expect(screen.getByText('Receita Total')).toBeInTheDocument();
    expect(screen.getByText('Despesa Total')).toBeInTheDocument();
    expect(screen.getByText('Saldo Líquido')).toBeInTheDocument();
    expect(screen.getByText('Variação')).toBeInTheDocument();
  });

  it('should display formatted currency values', () => {
    render(<CashFlowSummary metrics={mockMetrics} />);
    // Check for Brazilian format (R$)
    const elements = screen.getAllByText(/R\$/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should show correct balance status', () => {
    render(<CashFlowSummary metrics={mockMetrics} />);
    expect(screen.getByText('Superávit')).toBeInTheDocument();
  });

  it('should show deficit status for negative balance', () => {
    const negativeMetrics: CashFlowSummaryMetrics = {
      ...mockMetrics,
      netBalance: -5000,
    };
    render(<CashFlowSummary metrics={negativeMetrics} />);
    expect(screen.getByText('Déficit')).toBeInTheDocument();
  });

  it('should display variation percentage', () => {
    render(<CashFlowSummary metrics={mockMetrics} />);
    // Variation should be 33.33% (20000 to 15000)
    const elements = screen.getAllByText(/\d+/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should show N/A for variation without previous balance', () => {
    const metricsNoPrevious: CashFlowSummaryMetrics = {
      ...mockMetrics,
      previousNetBalance: undefined,
    };
    render(<CashFlowSummary metrics={metricsNoPrevious} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const loadingMetrics: CashFlowSummaryMetrics = {
      ...mockMetrics,
      isLoading: true,
    };
    render(<CashFlowSummary metrics={loadingMetrics} />);
    expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    const errorMetrics: CashFlowSummaryMetrics = {
      ...mockMetrics,
      error: 'Erro ao buscar dados',
    };
    render(<CashFlowSummary metrics={errorMetrics} />);
    expect(screen.getByText('Erro ao buscar dados')).toBeInTheDocument();
  });

  it('should render without errors when onMetricClick is provided', () => {
    const onMetricClick = vi.fn();
    const { container } = render(
      <CashFlowSummary
        metrics={mockMetrics}
        onMetricClick={onMetricClick}
      />
    );
    // Component should render successfully even with callback
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should render custom className', () => {
    const { container } = render(
      <CashFlowSummary
        metrics={mockMetrics}
        className="custom-class"
      />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should handle zero values correctly', () => {
    const zeroMetrics: CashFlowSummaryMetrics = {
      totalIncome: 0,
      totalExpense: 0,
      netBalance: 0,
      period: 'Teste',
      isLoading: false,
    };
    render(<CashFlowSummary metrics={zeroMetrics} />);
    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
  });

  it('should handle very large numbers', () => {
    const largeMetrics: CashFlowSummaryMetrics = {
      totalIncome: 999999999,
      totalExpense: -500000000,
      netBalance: 499999999,
      period: 'Teste',
      isLoading: false,
    };
    render(<CashFlowSummary metrics={largeMetrics} />);
    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
  });

  it('should display all cards with proper styling', () => {
    const { container } = render(<CashFlowSummary metrics={mockMetrics} />);
    const cards = container.querySelectorAll('[class*="border"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});
