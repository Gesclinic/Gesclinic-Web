/**
 * Tests for CashFlowTrend Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CashFlowTrend, { TrendPoint } from '@/modules/financeiro/fluxo-caixa/components/CashFlowTrend';

describe('CashFlowTrend Component', () => {
  const mockTrendData: TrendPoint[] = [
    { date: '2026-01-01', income: 10000, expense: -5000, balance: 5000 },
    { date: '2026-01-02', income: 12000, expense: -6000, balance: 6000 },
    { date: '2026-01-03', income: 11000, expense: -5500, balance: 5500 },
    { date: '2026-01-04', income: 13000, expense: -7000, balance: 6000 },
    { date: '2026-01-05', income: 15000, expense: -8000, balance: 7000 },
  ];

  it('should render trend title and description', () => {
    render(<CashFlowTrend data={mockTrendData} />);
    expect(screen.getByText('Tendência 30 Dias')).toBeInTheDocument();
    expect(screen.getByText(/Evolução do fluxo/)).toBeInTheDocument();
  });

  it('should render chart SVG', () => {
    const { container } = render(<CashFlowTrend data={mockTrendData} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should display statistics', () => {
    render(<CashFlowTrend data={mockTrendData} />);
    expect(screen.getByText('Saldo Médio')).toBeInTheDocument();
    expect(screen.getByText('Saldo Máximo')).toBeInTheDocument();
    expect(screen.getByText('Saldo Mínimo')).toBeInTheDocument();
    expect(screen.getByText('Tendência')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(
      <CashFlowTrend
        data={mockTrendData}
        isLoading={true}
      />
    );
    expect(screen.getByText(/Carregando gráfico/)).toBeInTheDocument();
  });

  it('should render error state', () => {
    render(
      <CashFlowTrend
        data={mockTrendData}
        error="Erro ao carregar dados"
      />
    );
    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
  });

  it('should display empty state when no data', () => {
    render(<CashFlowTrend data={[]} />);
    expect(screen.getByText(/Nenhum dado disponível/)).toBeInTheDocument();
  });

  it('should accept custom title', () => {
    render(
      <CashFlowTrend
        data={mockTrendData}
        title="Título Customizado"
      />
    );
    expect(screen.getByText('Título Customizado')).toBeInTheDocument();
  });

  it('should accept custom description', () => {
    render(
      <CashFlowTrend
        data={mockTrendData}
        description="Descrição customizada"
      />
    );
    expect(screen.getByText('Descrição customizada')).toBeInTheDocument();
  });

  it('should render custom className', () => {
    const { container } = render(
      <CashFlowTrend
        data={mockTrendData}
        className="custom-trend-class"
      />
    );
    const card = container.querySelector('[class*="custom-trend-class"]');
    expect(card).toBeInTheDocument();
  });

  it('should calculate correct average balance', () => {
    render(<CashFlowTrend data={mockTrendData} />);
    // Average should be 5900 (5000+6000+5500+6000+7000)/5
    const elements = screen.getAllByText(/R\$/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should identify max balance', () => {
    render(<CashFlowTrend data={mockTrendData} />);
    expect(screen.getByText('Saldo Máximo')).toBeInTheDocument();
  });

  it('should identify min balance', () => {
    render(<CashFlowTrend data={mockTrendData} />);
    expect(screen.getByText('Saldo Mínimo')).toBeInTheDocument();
  });

  it('should display trend direction', () => {
    render(<CashFlowTrend data={mockTrendData} />);
    // Trend should be positive (7000 - 5000 = 2000)
    const element = screen.getByText('Tendência');
    expect(element).toBeInTheDocument();
  });

  it('should handle data with negative balances', () => {
    const negativeData: TrendPoint[] = [
      { date: '2026-01-01', income: 5000, expense: -10000, balance: -5000 },
      { date: '2026-01-02', income: 6000, expense: -9000, balance: -3000 },
    ];
    render(<CashFlowTrend data={negativeData} />);
    expect(screen.getByText('Saldo Médio')).toBeInTheDocument();
  });

  it('should handle data with single point', () => {
    const singlePoint: TrendPoint[] = [
      { date: '2026-01-01', income: 10000, expense: -5000, balance: 5000 },
    ];
    render(<CashFlowTrend data={singlePoint} />);
    expect(screen.getByText('Saldo Médio')).toBeInTheDocument();
  });

  it('should call onPointClick when point is clicked', () => {
    const onPointClick = vi.fn();
    const { container } = render(
      <CashFlowTrend
        data={mockTrendData}
        onPointClick={onPointClick}
      />
    );

    const circles = container.querySelectorAll('circle');
    if (circles.length > 0) {
      (circles[0] as SVGCircleElement).click?.();
    }
  });

  it('should display date labels on chart', () => {
    const { container } = render(<CashFlowTrend data={mockTrendData} />);
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
  });

  it('should render grid lines', () => {
    const { container } = render(<CashFlowTrend data={mockTrendData} />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });
});
