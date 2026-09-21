import { describe, expect, it } from 'vitest';
import {
  getOpenPayableBalance,
  getPayablesDueWithinDaysBalance,
} from '@/services/dashboardDataService';

describe('dashboardDataService', () => {
  it('calcula o saldo aberto considerando pagamentos parciais', () => {
    expect(getOpenPayableBalance({ status: 'partial', amount: 500, paid_value: 125 })).toBe(375);
    expect(getOpenPayableBalance({ status: 'paid', amount: 500 })).toBe(0);
  });

  it('soma somente contas abertas com vencimento nos proximos 30 dias', () => {
    const referenceDate = new Date(2026, 8, 20);
    const payables = [
      { status: 'open', amount: 100, due_date: '2026-09-20' },
      { status: 'partial', amount: 300, paid_value: 50, due_date: '2026-10-20' },
      { status: 'open', amount: 400, due_date: '2026-10-21' },
      { status: 'overdue', amount: 500, due_date: '2026-09-19' },
      { status: 'paid', amount: 600, due_date: '2026-09-25' },
    ];

    expect(getPayablesDueWithinDaysBalance(payables, referenceDate, 30)).toBe(350);
  });
});