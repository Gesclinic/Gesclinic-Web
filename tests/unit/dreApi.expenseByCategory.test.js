import { describe, expect, it, vi } from 'vitest';

const from = vi.fn();
const rpc = vi.fn();
vi.mock('../../src/lib/customSupabaseClient.js', () => ({
  customSupabaseClient: { from, rpc },
}));

const { getDREDrillDown } = await import('../../src/lib/dynamicDREApi.ts');

function query(result) {
  const calls = [];
  const builder = {
    calls,
    select: () => builder,
    eq: (...args) => { calls.push(['eq', ...args]); return builder; },
    neq: (...args) => { calls.push(['neq', ...args]); return builder; },
    gte: (...args) => { calls.push(['gte', ...args]); return builder; },
    lte: (...args) => { calls.push(['lte', ...args]); return builder; },
    in: (...args) => { calls.push(['in', ...args]); return builder; },
    order: async () => result,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

describe('DRE ativa: despesas por linha', () => {
  it('consulta somente a clínica e categorias da linha pedida', async () => {
    rpc.mockResolvedValueOnce({ data: {
      revenue: {}, costs_and_profit: {}, expenses: { admin_expense: 1200 }, result: {},
    }, error: null });
    const accounts = query({ data: [{ id: 'account-1', clinic_id: 'clinic-a',
      account_code: '3.1', account_name: 'Pessoal', account_type: 'despesa',
      dre_line_item: 'admin_expense', is_active: true }], error: null });
    const entries = query({ data: [{ amount: 1200 }], error: null });
    from.mockImplementation((table) => table === 'financial_chart_of_accounts' ? accounts : entries);

    const result = await getDREDrillDown('clinic-a', '2026-06-01', '2026-06-30', 'admin_expense');
    expect(result).toEqual([expect.objectContaining({ account_name: 'Pessoal', value: 1200 })]);
    expect(accounts.calls).toContainEqual(['eq', 'clinic_id', 'clinic-a']);
    expect(entries.calls).toContainEqual(['eq', 'clinic_id', 'clinic-a']);
    expect(entries.calls).toContainEqual(['eq', 'type', 'expense']);
    expect(entries.calls).toContainEqual(['in', 'category', ['payroll', 'other']]);
    expect(entries.calls).toContainEqual(['neq', 'status', 'canceled']);
  });
});
