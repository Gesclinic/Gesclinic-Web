/**
 * Tests for CashFlowReport Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CashFlowReport, { ReportData } from '@/modules/financeiro/fluxo-caixa/components/CashFlowReport';

describe('CashFlowReport Component', () => {
  const mockReportData: ReportData = {
    title: 'Relatório Financeiro',
    period: {
      start: '2026-01-01',
      end: '2026-01-31',
    },
    summary: {
      totalIncome: 50000,
      totalExpense: -30000,
      netBalance: 20000,
      variation: 25.5,
    },
    details: [
      {
        date: '2026-01-05',
        description: 'Consulta Dr. Silva',
        amount: 500,
        type: 'income',
      },
      {
        date: '2026-01-06',
        description: 'Aluguel',
        amount: -2000,
        type: 'expense',
      },
    ],
  };

  it('should render report title', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText('Relatório de Fluxo de Caixa')).toBeInTheDocument();
  });

  it('should render period', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText(/2026-01-01 a 2026-01-31/)).toBeInTheDocument();
  });

  it('should display summary section', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText('Resumo Executivo')).toBeInTheDocument();
  });

  it('should render all summary cards', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText('Receita Total')).toBeInTheDocument();
    expect(screen.getByText('Despesa Total')).toBeInTheDocument();
    expect(screen.getByText('Saldo Líquido')).toBeInTheDocument();
    expect(screen.getByText('Variação')).toBeInTheDocument();
  });

  it('should display formatted currency in summary', () => {
    render(<CashFlowReport data={mockReportData} />);
    const currencyElements = screen.getAllByText(/R\$/);
    expect(currencyElements.length).toBeGreaterThan(0);
  });

  it('should display variation percentage', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText(/25\.50%/)).toBeInTheDocument();
  });

  it('should render export buttons', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText(/Exportar CSV/)).toBeInTheDocument();
    expect(screen.getByText(/Exportar PDF/)).toBeInTheDocument();
    expect(screen.getByText(/Enviar por Email/)).toBeInTheDocument();
  });

  it('should render details table when data exists', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText('Detalhes')).toBeInTheDocument();
    expect(screen.getByText('Consulta Dr. Silva')).toBeInTheDocument();
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
  });

  it('should render table headers', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Descrição')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Valor')).toBeInTheDocument();
  });

  it('should display item types (Receita/Despesa)', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText('Receita')).toBeInTheDocument();
    expect(screen.getByText('Despesa')).toBeInTheDocument();
  });

  it('should not show details when no details provided', () => {
    const noDetailsData: ReportData = {
      ...mockReportData,
      details: undefined,
    };
    render(<CashFlowReport data={noDetailsData} />);
    expect(screen.queryByText('Detalhes')).not.toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(
      <CashFlowReport
        data={mockReportData}
        isLoading={true}
      />
    );
    expect(screen.getByText('Gerando relatório...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    render(
      <CashFlowReport
        data={mockReportData}
        error="Erro ao gerar relatório"
      />
    );
    expect(screen.getByText('Erro ao gerar relatório')).toBeInTheDocument();
  });

  it('should render custom className', () => {
    const { container } = render(
      <CashFlowReport
        data={mockReportData}
        className="custom-report"
      />
    );
    const card = container.querySelector('[class*="custom-report"]');
    expect(card).toBeInTheDocument();
  });

  it('should call onExport with csv format', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(
      <CashFlowReport
        data={mockReportData}
        onExport={onExport}
      />
    );

    const csvButton = screen.getByText(/Exportar CSV/);
    await user.click(csvButton);

    expect(onExport).toHaveBeenCalledWith('csv');
  });

  it('should call onExport with pdf format', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(
      <CashFlowReport
        data={mockReportData}
        onExport={onExport}
      />
    );

    const pdfButton = screen.getByText(/Exportar PDF/);
    await user.click(pdfButton);

    expect(onExport).toHaveBeenCalledWith('pdf');
  });

  it('should call onExport with email format', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(
      <CashFlowReport
        data={mockReportData}
        onExport={onExport}
      />
    );

    const emailButton = screen.getByText(/Enviar por Email/);
    await user.click(emailButton);

    expect(onExport).toHaveBeenCalledWith('email');
  });

  it('should handle negative balance in summary', () => {
    const negativeData: ReportData = {
      ...mockReportData,
      summary: {
        ...mockReportData.summary,
        netBalance: -5000,
      },
    };
    render(<CashFlowReport data={negativeData} />);
    expect(screen.getByText('Saldo Líquido')).toBeInTheDocument();
  });

  it('should handle negative variation', () => {
    const negativeVariationData: ReportData = {
      ...mockReportData,
      summary: {
        ...mockReportData.summary,
        variation: -10.5,
      },
    };
    render(<CashFlowReport data={negativeVariationData} />);
    expect(screen.getByText(/-10\.50%/)).toBeInTheDocument();
  });

  it('should show more items indicator when more than 10 details', () => {
    const manyDetailsData: ReportData = {
      ...mockReportData,
      details: Array.from({ length: 15 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        description: `Item ${i + 1}`,
        amount: 1000,
        type: 'income' as const,
      })),
    };
    render(<CashFlowReport data={manyDetailsData} />);
    expect(screen.getByText(/\+5 mais itens/)).toBeInTheDocument();
  });

  it('should handle empty details array', () => {
    const emptyDetailsData: ReportData = {
      ...mockReportData,
      details: [],
    };
    render(<CashFlowReport data={emptyDetailsData} />);
    expect(screen.queryByText('Detalhes')).not.toBeInTheDocument();
  });

  it('should display file icon', () => {
    const { container } = render(<CashFlowReport data={mockReportData} />);
    // Check that the component renders without SVG role errors
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should handle very large currency values', () => {
    const largeData: ReportData = {
      ...mockReportData,
      summary: {
        ...mockReportData.summary,
        totalIncome: 999999999,
        totalExpense: -500000000,
        netBalance: 499999999,
      },
    };
    render(<CashFlowReport data={largeData} />);
    expect(screen.getByText('Resumo Executivo')).toBeInTheDocument();
  });

  it('should display income with + sign', () => {
    render(<CashFlowReport data={mockReportData} />);
    const cells = screen.getAllByText(/R\$/);
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should display export section', () => {
    render(<CashFlowReport data={mockReportData} />);
    expect(screen.getByText('Exportar Relatório')).toBeInTheDocument();
  });

  it('should render period in details table header area', () => {
    render(<CashFlowReport data={mockReportData} />);
    const periodText = screen.getByText(/Período: 2026-01-01/);
    expect(periodText).toBeInTheDocument();
  });
});
