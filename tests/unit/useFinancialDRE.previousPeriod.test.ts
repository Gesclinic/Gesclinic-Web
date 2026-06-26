import { describe, it, expect } from 'vitest';
import { calculatePreviousPeriod } from '@/modules/financeiro/dre/hooks/useFinancialDRE';

describe('calculatePreviousPeriod', () => {
  it('gera periodo anterior contiguo com mesma duracao', () => {
    const result = calculatePreviousPeriod({
      start: '2026-05-21',
      end: '2026-06-20',
    });

    expect(result).toEqual({
      start: '2026-04-20',
      end: '2026-05-20',
    });
  });

  it('funciona atravessando virada de ano', () => {
    const result = calculatePreviousPeriod({
      start: '2026-01-01',
      end: '2026-01-31',
    });

    expect(result).toEqual({
      start: '2025-12-01',
      end: '2025-12-31',
    });
  });
});
