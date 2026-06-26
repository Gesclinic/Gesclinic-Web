import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();
const listAPQueryMock = vi.fn();

vi.mock('../../src/lib/customSupabaseClient.js', () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

vi.mock('../../src/lib/financeApi.js', async () => {
  const actual = await vi.importActual('../../src/lib/financeApi.js');
  return {
    ...actual,
    listAPQuery: (...args) => listAPQueryMock(...args),
  };
});

const { getExpenseByCategory } = await import('../../src/lib/dreApi.js');

function createThenableQuery(result) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    neq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe('dreApi.getExpenseByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('considera apenas transacoes realizadas e ignora previstas', async () => {
    const query = createThenableQuery({
      data: [
        { category: 'Operacional', type: 'expense', amount: 4000, status: 'scheduled', movement_type: 'PREDICTED' },
        { category: 'Operacional', type: 'expense', amount: 1200, status: 'paid', movement_type: 'REALIZED' },
      ],
      error: null,
    });

    fromMock.mockReturnValue(query);

    const result = await getExpenseByCategory('clinic-1', '2026-06-01', '2026-06-30');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      category: 'Operacional',
      type: 'Despesa',
      total: 1200,
      percentual: 100,
    });
    expect(listAPQueryMock).not.toHaveBeenCalled();
  });

  it('faz fallback para AP pago quando nao ha transacao realizada', async () => {
    const query = createThenableQuery({
      data: [
        { category: 'Operacional', type: 'expense', amount: 4000, status: 'scheduled', movement_type: 'PREDICTED' },
      ],
      error: null,
    });

    fromMock.mockReturnValue(query);
    listAPQueryMock.mockResolvedValue([
      { category_name: 'Financeiro', category_type: 'financial', amount: 500 },
      { category_name: 'Financeiro', category_type: 'financial', amount: 1500 },
    ]);

    const result = await getExpenseByCategory('clinic-1', '2026-06-01', '2026-06-30');

    expect(listAPQueryMock).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      category: 'Financeiro',
      total: 2000,
      percentual: 100,
    });
  });
});
