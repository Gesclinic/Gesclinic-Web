import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryForTable = vi.fn();
const supabaseMock = {
  from: vi.fn((table) => queryForTable(table)),
};

vi.mock('@/lib/customSupabaseClient', () => ({
  customSupabaseClient: supabaseMock,
}));

vi.mock('@/lib/receivablesApi.js', () => ({
  getReceivableById: vi.fn(),
  listReceivables: vi.fn(),
  updateReceivable: vi.fn(),
}));

const receivablesApi = await import('@/lib/receivablesApi.js');
const settlementMotor = await import('../../src/lib/paymentSettlementMotorApi.js');

const clinicId = 'clinic-001';

function resolvedChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function setupLiquiditySupabase() {
  const financialAccountsQuery = resolvedChain({
    data: [
      { current_balance: 800 },
      { current_balance: 200 },
    ],
    error: null,
  });
  const indicatorsQuery = resolvedChain({ data: null, error: null });

  queryForTable.mockImplementation((table) => {
    if (table === 'financial_accounts') return financialAccountsQuery;
    if (table === 'financial_indicators') return indicatorsQuery;
    throw new Error(`Unexpected table: ${table}`);
  });

  return { indicatorsQuery };
}

function setupReversalSupabase() {
  const settlementQuery = resolvedChain({
    data: {
      id: 'settlement-001',
      amount: 120,
      bank_account_id: 'bank-001',
    },
    error: null,
  });
  const reversalQuery = resolvedChain({
    data: { id: 'reversal-001' },
    error: null,
  });
  const accountFetchQuery = resolvedChain({
    data: { current_balance: 500 },
    error: null,
  });
  const accountUpdateQuery = resolvedChain({ data: null, error: null });
  const transactionQuery = resolvedChain({ data: { id: 'transaction-001' }, error: null });
  const auditQuery = resolvedChain({ data: null, error: null });
  let financialAccountsCalls = 0;

  queryForTable.mockImplementation((table) => {
    if (table === 'payment_settlements') return settlementQuery;
    if (table === 'payment_reversals') return reversalQuery;
    if (table === 'financial_accounts') {
      financialAccountsCalls += 1;
      return financialAccountsCalls === 1 ? accountFetchQuery : accountUpdateQuery;
    }
    if (table === 'financial_transactions') return transactionQuery;
    if (table === 'appointment_financial_audit_logs') return auditQuery;
    throw new Error(`Unexpected table: ${table}`);
  });

  return { reversalQuery };
}

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
});

describe('paymentSettlementMotorApi consolidado em ar_invoices', () => {
  it('calcula indicadores de liquidez usando listReceivables canonico', async () => {
    const { indicatorsQuery } = setupLiquiditySupabase();
    receivablesApi.listReceivables.mockResolvedValue([
      { id: 'inv-1', balance_amount: 300 },
      { id: 'inv-2', remaining_amount: 200 },
    ]);

    const result = await settlementMotor.updateLiquidityIndicators(clinicId);

    expect(receivablesApi.listReceivables).toHaveBeenCalledWith({
      clinicId,
      statusList: ['open', 'pending', 'partial'],
      limit: 5000,
    });
    expect(indicatorsQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      current_balance: 1000,
      liquidity_ratio: 2,
      financial_health: 'healthy',
    }));
    expect(result).toEqual({ success: true });
  });

  it('reverte pagamento atualizando recebivel via updateReceivable canonico', async () => {
    const { reversalQuery } = setupReversalSupabase();
    receivablesApi.getReceivableById.mockResolvedValue({
      id: 'inv-1',
      amount: 300,
      net_value: 300,
      received_value: 200,
      paid_total: 200,
      glosa_value: 0,
      metadata: { origin: 'test' },
    });
    receivablesApi.updateReceivable.mockResolvedValue({ id: 'inv-1', status: 'partial' });

    const result = await settlementMotor.registerPaymentReversal({
      clinicId,
      settlementId: 'settlement-001',
      receivableId: 'inv-1',
      reversalReason: 'Estorno operacional',
      reversalDate: '2026-06-12',
    });

    expect(reversalQuery.insert).toHaveBeenCalledWith([expect.objectContaining({
      clinic_id: clinicId,
      settlement_id: 'settlement-001',
      receivable_id: 'inv-1',
      reversal_amount: 120,
      status: 'completed',
    })]);
    expect(receivablesApi.getReceivableById).toHaveBeenCalledWith('inv-1', clinicId);
    expect(receivablesApi.updateReceivable).toHaveBeenCalledWith('inv-1', expect.objectContaining({
      status: 'partial',
      enterprise_status: 'PARCIAL',
      received_value: 80,
      paid_total: 80,
      balance_amount: 220,
      metadata: expect.objectContaining({
        origin: 'test',
        last_reversal: expect.objectContaining({
          settlement_id: 'settlement-001',
          reversal_id: 'reversal-001',
          amount: 120,
          reason: 'Estorno operacional',
        }),
      }),
    }), clinicId);
    expect(result).toEqual({ success: true, reversalId: 'reversal-001' });
  });
});
