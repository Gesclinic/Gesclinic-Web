import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryForTable = vi.fn();
const supabaseMock = {
  from: vi.fn((table) => queryForTable(table)),
  rpc: vi.fn(),
};

vi.mock('../../src/lib/customSupabaseClient', () => ({
  customSupabaseClient: supabaseMock,
}));

vi.mock('../../src/lib/receivablesApi.js', () => ({
  listReceivables: vi.fn(),
}));

const receivablesApi = await import('../../src/lib/receivablesApi.js');
const bankMotor = await import('../../src/lib/bankReconciliationMotorApi.js');

const clinicId = 'clinic-001';

function resolvedChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function setupAutoReconcileSupabase() {
  const importSelectQuery = resolvedChain({
    data: [{
      id: 'bank-import-001',
      transaction_date: '2026-06-12',
      description: 'PIX MARIA SILVA',
      amount: 120,
      payment_method: 'pix',
    }],
    error: null,
  });
  const paymentSelectQuery = resolvedChain({
    data: [{
      id: 'payment-001',
      ar_invoice_id: 'inv-001',
      amount_paid: 120,
      payment_method: 'pix',
      payment_method_text: 'pix',
      payment_date: '2026-06-12T00:00:00',
      status: 'completed',
    }],
    error: null,
  });
  const reconciliationInsertQuery = resolvedChain({ data: null, error: null });
  const importUpdateQuery = resolvedChain({ data: null, error: null });
  let bankImportCalls = 0;

  queryForTable.mockImplementation((table) => {
    if (table === 'bank_import_transactions') {
      bankImportCalls += 1;
      return bankImportCalls === 1 ? importSelectQuery : importUpdateQuery;
    }
    if (table === 'receivable_payments') return paymentSelectQuery;
    if (table === 'bank_reconciliations') return reconciliationInsertQuery;
    throw new Error(`Unexpected table: ${table}`);
  });

  return { reconciliationInsertQuery, importUpdateQuery };
}

function setupConfirmSupabase() {
  const reconciliationUpdateQuery = resolvedChain({ data: null, error: null });
  const reconciliationSelectQuery = resolvedChain({
    data: { payment_id: 'payment-001', receivable_id: 'inv-001' },
    error: null,
  });
  const paymentQuery = resolvedChain({
    data: { amount_paid: 120, ar_invoice_id: 'inv-001' },
    error: null,
  });
  let reconciliationCalls = 0;

  queryForTable.mockImplementation((table) => {
    if (table === 'bank_reconciliations') {
      reconciliationCalls += 1;
      return reconciliationCalls === 1 ? reconciliationUpdateQuery : reconciliationSelectQuery;
    }
    if (table === 'receivable_payments') return paymentQuery;
    throw new Error(`Unexpected table: ${table}`);
  });

  supabaseMock.rpc.mockResolvedValue({ data: { id: 'settlement-001' }, error: null });

  return { reconciliationUpdateQuery, paymentQuery };
}

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
  supabaseMock.rpc.mockReset();
});

describe('bankReconciliationMotorApi consolidado em ar_invoices', () => {
  it('auto-concilia usando receivable_payments e listReceivables canonico', async () => {
    const { reconciliationInsertQuery, importUpdateQuery } = setupAutoReconcileSupabase();
    receivablesApi.listReceivables.mockResolvedValue([{ id: 'inv-001', patient_name: 'Maria Silva' }]);

    const result = await bankMotor.autoReconcileTransactions({
      clinicId,
      bankAccountId: 'bank-001',
      minConfidenceScore: 0.70,
    });

    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_payments');
    expect(receivablesApi.listReceivables).toHaveBeenCalledWith({
      clinicId,
      statusList: ['received', 'partial', 'open', 'pending'],
      limit: 5000,
    });
    expect(reconciliationInsertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: clinicId,
      bank_import_id: 'bank-import-001',
      payment_id: 'payment-001',
      receivable_id: 'inv-001',
      confidence_score: expect.any(Number),
      match_type: expect.any(String),
      status: 'matched',
    }));
    expect(importUpdateQuery.update).toHaveBeenCalledWith({ status: 'reconciled' });
    expect(result).toEqual({ success: true, matched: 1, partial: 0, unmatched: 0 });
  });

  it('confirma conciliacao lendo pagamento em receivable_payments', async () => {
    const { reconciliationUpdateQuery, paymentQuery } = setupConfirmSupabase();

    const result = await bankMotor.confirmReconciliation({
      clinicId,
      reconciliationId: 'reconciliation-001',
      notes: 'Confirmado pelo financeiro',
    });

    expect(reconciliationUpdateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'reconciled',
      reconciliation_notes: 'Confirmado pelo financeiro',
    }));
    expect(paymentQuery.select).toHaveBeenCalledWith('amount_paid, ar_invoice_id');
    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_payments');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('fn_process_settlement_atomically', {
      p_clinic_id: clinicId,
      p_receivable_id: 'inv-001',
      p_payment_id: 'payment-001',
      p_amount: 120,
    });
    expect(result).toEqual({ success: true });
  });
});
