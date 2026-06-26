import { describe, it, expect } from 'vitest';
import { buildProjectionDays } from '@/modules/financeiro/fluxo-caixa/services/projectionEngine';

describe('projectionEngine backlog handling', () => {
  it('aloca recebiveis/pagaveis vencidos no primeiro dia da janela de projecao', () => {
    const raw: any = {
      openReceivables: [
        { id: 'ar-1', due_date: '2026-06-10', net_value: 1000 },
      ],
      openPayables: [
        { id: 'ap-1', due_date: '2026-06-11', amount: 400, paid_amount: 0 },
      ],
      repasses: [],
      billingGuides: [],
      startBalance: 500,
    };

    const dates = ['2026-06-20', '2026-06-21', '2026-06-22'];
    const days = buildProjectionDays(raw, dates, 1, 1, '2026-06-20', '2026-06-22');

    expect(days[0].inflows).toBe(1000);
    expect(days[0].outflows).toBe(400);
    expect(days[0].net).toBe(600);
    expect(days[0].cumulativeBalance).toBe(1100);

    expect(days[1].inflows).toBe(0);
    expect(days[1].outflows).toBe(0);
    expect(days[2].inflows).toBe(0);
    expect(days[2].outflows).toBe(0);
  });

  it('aloca guias sem data no primeiro dia da janela', () => {
    const raw: any = {
      openReceivables: [],
      openPayables: [],
      repasses: [],
      billingGuides: [
        { id: 'bg-1', value: 2500 },
      ],
      startBalance: 0,
    };

    const dates = ['2026-06-20', '2026-06-21'];
    const days = buildProjectionDays(raw, dates, 1, 1, '2026-06-20', '2026-06-21');

    expect(days[0].billingPending).toBe(2500);
    expect(days[0].inflows).toBe(2500);
    expect(days[0].cumulativeBalance).toBe(2500);
    expect(days[1].inflows).toBe(0);
  });
});
