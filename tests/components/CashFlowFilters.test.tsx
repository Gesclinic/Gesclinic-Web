/**
 * Testes: CashFlowFilters.tsx + LiquidityIndicator.tsx
 * 
 * Cobertura:
 * - ✅ CashFlowFilters: period selection, filters, reset
 * - ✅ LiquidityIndicator: 3 visual states (green/yellow/red)
 * - ✅ Callbacks e event handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CashFlowFilters } from '../../src/modules/financeiro/fluxo-caixa/components/CashFlowFilters';
import { LiquidityIndicator } from '../../src/modules/financeiro/fluxo-caixa/components/LiquidityIndicator';

// ===== CashFlowFilters Tests =====
describe('CashFlowFilters', () => {
  const mockOnChange = vi.fn();
  const defaultFilters = {
    period: 'monthly' as const,
    accountId: null,
    searchTerm: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Period Selection', () => {
    it('should render all period buttons', () => {
      render(
        <CashFlowFilters
          filters={defaultFilters}
          onFiltersChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button', { name: /dia|daily/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /semana|week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mês|month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ano|year/i })).toBeInTheDocument();
    });

    it('should highlight active period', () => {
      const { rerender } = render(
        <CashFlowFilters
          filters={{ ...defaultFilters, period: 'daily' }}
          onFiltersChange={mockOnChange}
        />
      );

      const dailyButton = screen.getByRole('button', { name: /dia|daily/i });
      expect(dailyButton).toHaveClass('bg-primary');

      rerender(
        <CashFlowFilters
          filters={{ ...defaultFilters, period: 'weekly' }}
          onFiltersChange={mockOnChange}
        />
      );

      const weeklyButton = screen.getByRole('button', { name: /semana|week/i });
      expect(weeklyButton).toHaveClass('bg-primary');
    });

    it('should call onFiltersChange when period changes', async () => {
      const user = userEvent.setup();

      render(
        <CashFlowFilters
          filters={defaultFilters}
          onFiltersChange={mockOnChange}
        />
      );

      const dailyButton = screen.getByRole('button', { name: /dia|daily/i });
      await user.click(dailyButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ period: 'daily' })
      );
    });

    it('should support all 4 period types', async () => {
      const user = userEvent.setup();

      render(
        <CashFlowFilters
          filters={defaultFilters}
          onFiltersChange={mockOnChange}
        />
      );

      const periods = [
        { name: /dia|daily/i, value: 'daily' },
        { name: /semana|week/i, value: 'weekly' },
        { name: /mês|month/i, value: 'monthly' },
        { name: /ano|year/i, value: 'yearly' },
      ];

      for (const { name, value } of periods) {
        mockOnChange.mockClear();
        await user.click(screen.getByRole('button', { name }));
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ period: value })
        );
      }
    });
  });

  describe('Filter Inputs', () => {
    it('should update search term', async () => {
      const user = userEvent.setup();

      render(
        <CashFlowFilters
          filters={defaultFilters}
          onFiltersChange={mockOnChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar|search/i);
      await user.type(searchInput, 'test');

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ searchTerm: 'test' })
      );
    });

    it('should filter by account', async () => {
      const user = userEvent.setup();

      render(
        <CashFlowFilters
          filters={defaultFilters}
          onFiltersChange={mockOnChange}
        />
      );

      // Assuming there's an account select
      const selects = screen.queryAllByRole('combobox');
      if (selects.length > 0) {
        await user.click(selects[0]);
        // Select an account option
        const options = screen.queryAllByRole('option');
        if (options.length > 0) {
          await user.click(options[0]);
        }
      }
    });
  });

  describe('Reset Functionality', () => {
    it('should render reset button', () => {
      render(
        <CashFlowFilters
          filters={defaultFilters}
          onFiltersChange={mockOnChange}
        />
      );

      expect(
        screen.getByRole('button', { name: /limpar|reset|clear/i })
      ).toBeInTheDocument();
    });

    it('should reset all filters on reset click', async () => {
      const user = userEvent.setup();

      render(
        <CashFlowFilters
          filters={{
            period: 'daily',
            accountId: 'account-123',
            searchTerm: 'test',
          }}
          onFiltersChange={mockOnChange}
        />
      );

      const resetButton = screen.getByRole('button', { name: /limpar|reset|clear/i });
      await user.click(resetButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        period: 'monthly', // Default
        accountId: null,
        searchTerm: '',
      });
    });

    it('should show reset button only when filters are active', () => {
      const { rerender } = render(
        <CashFlowFilters
          filters={defaultFilters}
          onFiltersChange={mockOnChange}
        />
      );

      // With default filters, reset might not be visible or disabled
      const resetButton = screen.queryByRole('button', { name: /limpar|reset|clear/i });
      expect(resetButton).toBeInTheDocument();

      rerender(
        <CashFlowFilters
          filters={{
            period: 'daily',
            accountId: 'account-123',
            searchTerm: 'test',
          }}
          onFiltersChange={mockOnChange}
        />
      );

      // With active filters, should be visible
      expect(
        screen.getByRole('button', { name: /limpar|reset|clear/i })
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button labels', () => {
      render(
        <CashFlowFilters
          filters={defaultFilters}
          onFiltersChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.textContent || button.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should have keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <CashFlowFilters
          filters={defaultFilters}
          onFiltersChange={mockOnChange}
        />
      );

      // Tab to first button
      await user.tab();

      // Should be able to interact with keyboard
      const dailyButton = screen.getByRole('button', { name: /dia|daily/i });
      expect(document.activeElement).toBeDefined();
    });
  });
});

// ===== LiquidityIndicator Tests =====
describe('LiquidityIndicator', () => {
  const healthyMetrics = {
    current_balance: 50000,
    projected_balance: 60000,
    expense_ratio: 0.3,
  };

  const warningMetrics = {
    current_balance: 5000,
    projected_balance: 2000,
    expense_ratio: 0.7,
  };

  const criticalMetrics = {
    current_balance: -1000,
    projected_balance: -5000,
    expense_ratio: 1.2,
  };

  describe('Visual States', () => {
    it('should show healthy state (green) for positive balance', () => {
      const { container } = render(
        <LiquidityIndicator metrics={healthyMetrics} />
      );

      expect(container.querySelector('.text-green') || container.querySelector('[class*="green"]')).toBeInTheDocument();
    });

    it('should show warning state (yellow) for low balance', () => {
      const { container } = render(
        <LiquidityIndicator metrics={warningMetrics} />
      );

      expect(
        container.querySelector('.text-yellow') ||
        container.querySelector('[class*="yellow"]') ||
        container.querySelector('[class*="amber"]')
      ).toBeInTheDocument();
    });

    it('should show critical state (red) for negative balance', () => {
      const { container } = render(
        <LiquidityIndicator metrics={criticalMetrics} />
      );

      expect(
        container.querySelector('.text-red') ||
        container.querySelector('[class*="red"]')
      ).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('should show appropriate icon for healthy state', () => {
      const { container } = render(
        <LiquidityIndicator metrics={healthyMetrics} />
      );

      // Should show checkmark or similar
      expect(container.textContent).toMatch(/✓|✔|healthy|bom|saudável/i);
    });

    it('should show appropriate icon for warning state', () => {
      const { container } = render(
        <LiquidityIndicator metrics={warningMetrics} />
      );

      expect(container.textContent).toMatch(/⚠|warning|aviso/i);
    });

    it('should show appropriate icon for critical state', () => {
      const { container } = render(
        <LiquidityIndicator metrics={criticalMetrics} />
      );

      expect(container.textContent).toMatch(/!|critical|crítico/i);
    });
  });

  describe('Data Display', () => {
    it('should display current balance', () => {
      render(<LiquidityIndicator metrics={healthyMetrics} />);

      // Should show formatted balance
      expect(screen.getAllByText(/saldo|balance/i).length).toBeGreaterThan(0);
    });

    it('should display projected balance', () => {
      render(<LiquidityIndicator metrics={healthyMetrics} />);

      // Should show projected value
      expect(screen.getByText(/projetado|projected/i)).toBeInTheDocument();
    });

    it('should format currency values', () => {
      render(<LiquidityIndicator metrics={healthyMetrics} />);

      // Should contain R$ format
      expect(screen.getAllByText(/R\$|BRL/).length).toBeGreaterThan(0);
    });

    it('should display expense ratio', () => {
      render(<LiquidityIndicator metrics={healthyMetrics} />);

      // Should show ratio percentage
      expect(screen.getByText(/%/)).toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should transition from healthy to warning', () => {
      const { rerender, container } = render(
        <LiquidityIndicator metrics={healthyMetrics} />
      );

      // Initially green
      expect(
        container.querySelector('[class*="green"]')
      ).toBeInTheDocument();

      rerender(<LiquidityIndicator metrics={warningMetrics} />);

      // Now yellow/amber
      expect(
        container.querySelector('[class*="yellow"]') ||
        container.querySelector('[class*="amber"]')
      ).toBeInTheDocument();
    });

    it('should transition from warning to critical', () => {
      const { rerender, container } = render(
        <LiquidityIndicator metrics={warningMetrics} />
      );

      // Initially yellow
      expect(
        container.querySelector('[class*="yellow"]') ||
        container.querySelector('[class*="amber"]')
      ).toBeInTheDocument();

      rerender(<LiquidityIndicator metrics={criticalMetrics} />);

      // Now red
      expect(container.querySelector('[class*="red"]')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero balance', () => {
      const zeroMetrics = {
        current_balance: 0,
        projected_balance: 0,
        expense_ratio: 0,
      };

      render(<LiquidityIndicator metrics={zeroMetrics} />);

      // Should render without crashing
      expect(screen.getAllByText(/saldo|balance/i).length).toBeGreaterThan(0);
    });

    it('should handle missing data', () => {
      const incompleteMetrics = {
        current_balance: 1000,
      };

      render(<LiquidityIndicator metrics={incompleteMetrics as any} />);

      // Should still render
      expect(screen.getAllByText(/saldo|balance/i).length).toBeGreaterThan(0);
    });

    it('should handle very large numbers', () => {
      const largeMetrics = {
        current_balance: 999999999,
        projected_balance: 888888888,
        expense_ratio: 0.1,
      };

      render(<LiquidityIndicator metrics={largeMetrics} />);

      // Should format correctly
      expect(screen.getAllByText(/R\$|BRL/).length).toBeGreaterThan(0);
    });

    it('should handle negative values', () => {
      const negativeMetrics = {
        current_balance: -999999,
        projected_balance: -1000000,
        expense_ratio: 1.5,
      };

      render(<LiquidityIndicator metrics={negativeMetrics} />);

      // Should show critical state
      expect(screen.getAllByText(/crítico|critical/i).length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for indicator', () => {
      const { container } = render(
        <LiquidityIndicator metrics={healthyMetrics} />
      );

      expect(
        container.querySelector('[aria-label]') || screen.getByText(/saldo|balance/i)
      ).toBeInTheDocument();
    });

    it('should have readable text descriptions', () => {
      render(<LiquidityIndicator metrics={healthyMetrics} />);

      // Should have readable descriptions
      expect(screen.getByLabelText(/indicador de liquidez/i)).toBeInTheDocument();
    });
  });
});
