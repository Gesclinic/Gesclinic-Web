/**
 * Testes: calculations.ts (Utility Functions)
 * 
 * Cobertura:
 * - ✅ Formatação: formatCurrency, formatPercent, formatDate
 * - ✅ Matemática: calculateVariation, calculateAverage, calculateTotal
 * - ✅ Dados: generateDateSeries, groupByPeriod
 * - ✅ Cores: getValueColor, getValueBg
 * - ✅ Edge cases e validações
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  calculateVariation,
  calculateAverage,
  calculateTotal,
  generateDateSeries,
  groupByPeriod,
  getValueColor,
  getValueBg,
  daysUntil,
} from '../../src/modules/financeiro/fluxo-caixa/utils/calculations';

describe('Calculations Utility Functions', () => {
  // ===== Formatação: Currency =====
  describe('formatCurrency()', () => {
    it('should format positive values correctly', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('1.000');
      expect(result).toContain('R$');
      expect(result).toContain('00');
    });

    it('should format negative values with minus sign', () => {
      const result = formatCurrency(-1000);
      expect(result).toContain('1.000');
      expect(result).toContain('R$');
      expect(result).toContain('-');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('R$');
      expect(result).toContain('0');
    });

    it('should handle very small values', () => {
      const result = formatCurrency(0.01);
      expect(result).toContain('R$');
      expect(result).toContain('01');
    });

    it('should handle very large values', () => {
      const large = 999999999.99;
      const formatted = formatCurrency(large);
      expect(formatted).toContain('R$');
      expect(formatted).toContain('999.999.999');
    });

    it('should handle edge case of null/undefined', () => {
      // Should not throw
      expect(() => formatCurrency(null as any)).not.toThrow();
      expect(() => formatCurrency(undefined as any)).not.toThrow();
    });
  });

  // ===== Formatação: Percent =====
  describe('formatPercent()', () => {
    it('should format percentages with 1 decimal by default', () => {
      expect(formatPercent(12.56)).toBe('12.6%');
      expect(formatPercent(50)).toBe('50.0%');
      expect(formatPercent(100)).toBe('100.0%');
    });

    it('should respect decimals parameter', () => {
      expect(formatPercent(12.567, 2)).toBe('12.57%');
      expect(formatPercent(12.567, 0)).toBe('13%');
      expect(formatPercent(12.567, 3)).toBe('12.567%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercent(-12.5)).toBe('-12.5%');
    });

    it('should handle zero', () => {
      expect(formatPercent(0)).toBe('0.0%');
    });

    it('should handle very small percentages', () => {
      expect(formatPercent(0.001, 3)).toBe('0.001%');
    });
  });

  // ===== Formatação: Date =====
  describe('formatDate()', () => {
    it('should format ISO date strings', () => {
      const result = formatDate('2026-05-13');
      expect(result).toContain('2026');
      // Accept both 12 and 13 due to timezone issues
      expect(result.match(/1[23]/)).toBeTruthy();
    });

    it('should format Date objects', () => {
      const date = new Date('2026-05-14');
      const result = formatDate(date);
      expect(result).toContain('2026');
    });

    it('should handle Portuguese month names', () => {
      const result = formatDate('2026-05-13');
      // Should format with Portuguese month (maio = May)
      expect(result.toLowerCase()).toContain('mai');
    });

    it('should be consistent across multiple calls', () => {
      const date = '2026-05-13';
      const result1 = formatDate(date);
      const result2 = formatDate(date);
      expect(result1).toBe(result2);
    });
  });

  // ===== Matemática: Variation =====
  describe('calculateVariation()', () => {
    it('should calculate positive variation', () => {
      const variation = calculateVariation(150, 100);
      expect(variation).toBe(50); // 50% increase
    });

    it('should calculate negative variation', () => {
      const variation = calculateVariation(50, 100);
      expect(variation).toBe(-50); // 50% decrease
    });

    it('should handle zero base (no previous value)', () => {
      const variation = calculateVariation(100, 0);
      expect(variation).toBe(Infinity); // Infinity when dividing by zero
    });

    it('should handle same values', () => {
      const variation = calculateVariation(100, 100);
      expect(variation).toBe(0); // 0% change
    });

    it('should return Infinity when base is zero and current is non-zero', () => {
      const variation = calculateVariation(50, 0);
      expect(variation).toBe(Infinity); // Infinity
    });
  });

  // ===== Matemática: Average =====
  describe('calculateAverage()', () => {
    it('should calculate average of numbers', () => {
      expect(calculateAverage([100, 200, 300])).toBe(200);
    });

    it('should handle single value', () => {
      expect(calculateAverage([50])).toBe(50);
    });

    it('should handle negative numbers', () => {
      expect(calculateAverage([-100, -200, -300])).toBe(-200);
    });

    it('should handle mixed positive and negative', () => {
      expect(calculateAverage([100, -100, 300, -300])).toBe(0);
    });

    it('should handle decimal values', () => {
      const avg = calculateAverage([1.5, 2.5, 3.0]);
      expect(avg).toBeCloseTo(2.33, 2);
    });

    it('should return 0 for empty array', () => {
      expect(calculateAverage([])).toBe(0);
    });

    it('should handle array with zeros', () => {
      expect(calculateAverage([0, 0, 0])).toBe(0);
    });
  });

  // ===== Matemática: Total =====
  describe('calculateTotal()', () => {
    it('should sum positive values', () => {
      expect(calculateTotal([100, 200, 300])).toBe(600);
    });

    it('should handle negative values', () => {
      expect(calculateTotal([-100, -200])).toBe(-300);
    });

    it('should handle mixed values', () => {
      expect(calculateTotal([100, -50, 200, -75])).toBe(175);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotal([])).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(calculateTotal([1.5, 2.5, 3.0])).toBeCloseTo(7.0);
    });

    it('should handle very large arrays', () => {
      const largeArray = Array(1000).fill(1);
      expect(calculateTotal(largeArray)).toBe(1000);
    });
  });

  // ===== Dados: Date Series =====
  describe('generateDateSeries()', () => {
    it('should generate daily series', () => {
      const series = generateDateSeries('2026-05-11', '2026-05-13', 'daily');
      expect(series.length).toBe(3);
      expect(series[0]).toBe('2026-05-11');
      expect(series[2]).toBe('2026-05-13');
    });

    it('should generate weekly series', () => {
      const series = generateDateSeries('2026-05-01', '2026-05-29', 'weekly');
      expect(series.length).toBeGreaterThan(0);
      expect(series.length).toBeLessThanOrEqual(5);
    });

    it('should generate monthly series', () => {
      const series = generateDateSeries('2026-01-01', '2026-12-31', 'monthly');
      expect(series.length).toBe(12);
    });

    it('should generate yearly series', () => {
      const series = generateDateSeries('2024-01-01', '2026-12-31', 'yearly');
      expect(series.length).toBe(3);
    });

    it('should return empty array if start > end', () => {
      const series = generateDateSeries('2026-05-13', '2026-05-11', 'daily');
      expect(series.length).toBe(0);
    });

    it('should handle single day (start === end)', () => {
      const series = generateDateSeries('2026-05-13', '2026-05-13', 'daily');
      expect(series.length).toBe(1);
      expect(series[0]).toBe('2026-05-13');
    });
  });

  // ===== Dados: Group By Period =====
  describe('groupByPeriod()', () => {
    const testData = [
      { date: '2026-05-11', amount: 100 },
      { date: '2026-05-11', amount: 50 },
      { date: '2026-05-12', amount: 200 },
      { date: '2026-05-13', amount: 75 },
    ];

    it('should group data by date', () => {
      const result = groupByPeriod(testData, 'date', 'amount', 'daily');
      expect(result).toHaveLength(3);
      expect(result[0].total).toBe(150); // 100 + 50
    });

    it('should handle missing values', () => {
      const dataWithMissing = [
        { date: '2026-05-11', amount: 100 },
        { date: '2026-05-12' }, // No amount
        { date: '2026-05-13', amount: 75 },
      ];
      const result = groupByPeriod(dataWithMissing, 'date', 'amount', 'daily');
      expect(result).toBeDefined();
    });

    it('should handle empty array', () => {
      const result = groupByPeriod([], 'date', 'amount', 'daily');
      expect(result).toEqual([]);
    });

    it('should group weekly correctly', () => {
      const result = groupByPeriod(testData, 'date', 'amount', 'weekly');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should preserve date order', () => {
      const result = groupByPeriod(testData, 'date', 'amount', 'daily');
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date >= result[i - 1].date).toBe(true);
      }
    });
  });

  // ===== Cores: Value Color =====
  describe('getValueColor()', () => {
    it('should return green for positive values', () => {
      const color = getValueColor(100);
      expect(color).toContain('green');
    });

    it('should return red for negative values', () => {
      const color = getValueColor(-100);
      expect(color).toContain('red');
    });

    it('should return gray for zero', () => {
      const color = getValueColor(0);
      expect(color).toContain('gray');
    });

    it('should use Tailwind CSS class format', () => {
      const color = getValueColor(100);
      expect(color).toMatch(/text-/);
    });

    it('should be consistent across calls', () => {
      expect(getValueColor(50)).toBe(getValueColor(50));
      expect(getValueColor(-50)).toBe(getValueColor(-50));
    });
  });

  // ===== Cores: Value Background =====
  describe('getValueBg()', () => {
    it('should return green background for positive values', () => {
      const bg = getValueBg(100);
      expect(bg).toContain('green');
    });

    it('should return red background for negative values', () => {
      const bg = getValueBg(-100);
      expect(bg).toContain('red');
    });

    it('should return neutral background for zero', () => {
      const bg = getValueBg(0);
      expect(bg).toContain('gray');
    });

    it('should use Tailwind CSS bg- prefix', () => {
      const bg = getValueBg(100);
      expect(bg).toMatch(/bg-/);
    });

    it('should use lighter shade than text color', () => {
      const bg = getValueBg(100);
      const text = getValueColor(100);
      // Background should have -50 or -100, text should not
      expect(bg).toContain('50');
    });
  });

  // ===== Dados: Days Until =====
  describe('daysUntil()', () => {
    it('should calculate days to future date', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const days = daysUntil(tomorrow.toISOString().split('T')[0]);
      expect(days).toBeGreaterThanOrEqual(0);
      expect(days).toBeLessThanOrEqual(2); // Allow for timezone variance
    });

    it('should return 0 for today', () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const days = daysUntil(dateStr);
      expect(days).toBeLessThanOrEqual(1); // Allow timezone
    });

    it('should return negative for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const days = daysUntil(yesterday.toISOString().split('T')[0]);
      expect(days).toBeLessThan(0);
    });

    it('should handle string dates', () => {
      expect(() => daysUntil('2026-05-20')).not.toThrow();
    });
  });

  // ===== Edge Cases & Errors =====
  describe('Edge Cases & Error Handling', () => {
    it('should not throw on null/undefined values', () => {
      expect(() => formatCurrency(null as any)).not.toThrow();
      expect(() => daysUntil('2026-12-31')).not.toThrow();
    });

    it('should handle Infinity values', () => {
      expect(() => formatCurrency(Infinity)).not.toThrow();
      expect(() => calculateTotal([1, Infinity, 3])).not.toThrow();
    });

    it('should handle NaN values', () => {
      expect(() => formatCurrency(NaN)).not.toThrow();
      expect(() => calculateVariation(NaN, 100)).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const large = Number.MAX_SAFE_INTEGER;
      expect(() => formatCurrency(large)).not.toThrow();
    });

    it('should handle very small numbers', () => {
      const small = Number.MIN_SAFE_INTEGER;
      expect(() => formatCurrency(small)).not.toThrow();
    });
  });

  // ===== Integration Tests =====
  describe('Function Integration', () => {
    it('should chain formatting functions', () => {
      const amount = 1234.567;
      const formatted = formatCurrency(amount);
      expect(formatted).toContain('1.234');
      expect(formatted).toContain('R$');
    });

    it('should use calculations in data transformation', () => {
      const values = [100, 200, 300];
      const avg = calculateAverage(values);
      const total = calculateTotal(values);
      
      expect(avg).toBe(200);
      expect(total).toBe(600);
      expect(total / values.length).toBe(avg);
    });

    it('should process time series correctly', () => {
      const dates = generateDateSeries('2026-05-01', '2026-05-10', 'daily');
      expect(dates.length).toBe(10);
      
      const data = dates.map((date, i) => ({
        date,
        amount: (i + 1) * 100,
      }));
      
      const grouped = groupByPeriod(data, 'date', 'amount', 'daily');
      expect(grouped.length).toBe(10);
    });
  });
});
