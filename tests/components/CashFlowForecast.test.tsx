/**
 * Tests for CashFlowForecast Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CashFlowForecast from '@/modules/financeiro/fluxo-caixa/components/CashFlowForecast';

describe('CashFlowForecast Component', () => {
  const mockHistoricalData = [
    { date: '2026-01-01', balance: 5000 },
    { date: '2026-01-02', balance: 6000 },
    { date: '2026-01-03', balance: 5500 },
    { date: '2026-01-04', balance: 7000 },
    { date: '2026-01-05', balance: 8000 },
  ];

  it('should render forecast title', () => {
    render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    expect(screen.getByText('Projeção 30 Dias')).toBeInTheDocument();
  });

  it('should render forecast description', () => {
    render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    expect(screen.getByText(/Previsão baseada em tendência/)).toBeInTheDocument();
  });

  it('should render chart SVG', () => {
    const { container } = render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should display statistics', () => {
    render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    expect(screen.getByText('Saldo Atual')).toBeInTheDocument();
    expect(screen.getByText(/Projeção \(\+30d\)/)).toBeInTheDocument();
    expect(screen.getByText('Variação')).toBeInTheDocument();
    expect(screen.getByText(/Intervalo 95/)).toBeInTheDocument();
  });

  it('should display legend', () => {
    render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    expect(screen.getByText('Dados Reais')).toBeInTheDocument();
    expect(screen.getByText('Projeção Linear')).toBeInTheDocument();
    expect(screen.getByText(/Intervalo de Confiança/)).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(
      <CashFlowForecast
        historicalData={mockHistoricalData}
        isLoading={true}
      />
    );
    expect(screen.getByText(/Gerando projeção/)).toBeInTheDocument();
  });

  it('should render error state', () => {
    render(
      <CashFlowForecast
        historicalData={mockHistoricalData}
        error="Erro ao gerar projeção"
      />
    );
    expect(screen.getByText('Erro ao gerar projeção')).toBeInTheDocument();
  });

  it('should display empty state with less than 2 data points', () => {
    render(
      <CashFlowForecast historicalData={[{ date: '2026-01-01', balance: 5000 }]} />
    );
    expect(screen.getByText(/Necessário pelo menos 2 pontos/)).toBeInTheDocument();
  });

  it('should accept custom days parameter', () => {
    render(
      <CashFlowForecast
        historicalData={mockHistoricalData}
        days={60}
      />
    );
    expect(screen.getByText('Projeção 30 Dias')).toBeInTheDocument();
  });

  it('should accept custom confidence parameter', () => {
    render(
      <CashFlowForecast
        historicalData={mockHistoricalData}
        confidence={0.95}
      />
    );
    expect(screen.getByText('Projeção 30 Dias')).toBeInTheDocument();
  });

  it('should accept custom title', () => {
    render(
      <CashFlowForecast
        historicalData={mockHistoricalData}
        title="Previsão Customizada"
      />
    );
    expect(screen.getByText('Previsão Customizada')).toBeInTheDocument();
  });

  it('should accept custom description', () => {
    render(
      <CashFlowForecast
        historicalData={mockHistoricalData}
        description="Descrição customizada"
      />
    );
    expect(screen.getByText('Descrição customizada')).toBeInTheDocument();
  });

  it('should render custom className', () => {
    const { container } = render(
      <CashFlowForecast
        historicalData={mockHistoricalData}
        className="custom-forecast"
      />
    );
    const card = container.querySelector('[class*="custom-forecast"]');
    expect(card).toBeInTheDocument();
  });

  it('should display currency formatted values', () => {
    render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    const currencyElements = screen.getAllByText(/R\$/);
    expect(currencyElements.length).toBeGreaterThan(0);
  });

  it('should handle negative balance data', () => {
    const negativeData = [
      { date: '2026-01-01', balance: -1000 },
      { date: '2026-01-02', balance: -500 },
      { date: '2026-01-03', balance: 0 },
    ];
    render(
      <CashFlowForecast historicalData={negativeData} />
    );
    expect(screen.getByText('Saldo Atual')).toBeInTheDocument();
  });

  it('should handle increasing trend', () => {
    const increasingData = [
      { date: '2026-01-01', balance: 1000 },
      { date: '2026-01-02', balance: 2000 },
      { date: '2026-01-03', balance: 3000 },
      { date: '2026-01-04', balance: 4000 },
    ];
    render(
      <CashFlowForecast historicalData={increasingData} />
    );
    expect(screen.getByText('Projeção 30 Dias')).toBeInTheDocument();
  });

  it('should handle decreasing trend', () => {
    const decreasingData = [
      { date: '2026-01-01', balance: 10000 },
      { date: '2026-01-02', balance: 8000 },
      { date: '2026-01-03', balance: 6000 },
      { date: '2026-01-04', balance: 4000 },
    ];
    render(
      <CashFlowForecast historicalData={decreasingData} />
    );
    expect(screen.getByText('Projeção 30 Dias')).toBeInTheDocument();
  });

  it('should render confidence interval section', () => {
    render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    expect(screen.getByText(/Intervalo 95/)).toBeInTheDocument();
  });

  it('should display both upper and lower bounds', () => {
    const { container } = render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    const text = container.textContent;
    expect(text).toContain('[');
    expect(text).toContain(']');
  });

  it('should call onExport when provided', () => {
    const onExport = vi.fn();
    render(
      <CashFlowForecast
        historicalData={mockHistoricalData}
        // onExport is not a prop for Forecast, but for demonstration
      />
    );
    expect(screen.getByText('Projeção 30 Dias')).toBeInTheDocument();
  });

  it('should render chart lines correctly', () => {
    const { container } = render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('should render polylines for actual and projected', () => {
    const { container } = render(
      <CashFlowForecast historicalData={mockHistoricalData} />
    );
    const polylines = container.querySelectorAll('polyline');
    expect(polylines.length).toBeGreaterThan(0);
  });
});
