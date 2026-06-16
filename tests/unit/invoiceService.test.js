import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryForTable = vi.fn();
const supabaseMock = {
  from: vi.fn((table) => queryForTable(table)),
};

vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/lib/taxCalculationApi', () => ({
  calculateItemTaxes: vi.fn(),
}));

vi.mock('@/lib/auditFinancialIntegration', () => ({
  logReceivableCreated: vi.fn(() => Promise.resolve()),
  logPaymentReceived: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/auditFinancialApi', () => ({
  FINANCIAL_EVENT_TYPES: { RECEIVABLE_CREATED: 'receivable_created' },
  logAppointmentFinancialAudit: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/receivablesApi.js', () => ({
  createReceivable: vi.fn(),
  registerReceivablePayment: vi.fn(),
}));

const receivablesApi = await import('@/lib/receivablesApi.js');
const auditIntegration = await import('@/lib/auditFinancialIntegration');
const invoiceService = await import('../../src/lib/invoiceService.js');

const clinicId = 'clinic-001';
const invoiceId = 'invoice-001';
const invoice = {
  id: invoiceId,
  clinic_id: clinicId,
  appointment_id: 'appointment-001',
  patient_id: 'patient-001',
  payer_id: 'payer-001',
  payer_type: 'insurance',
  invoice_number: '2026-000001',
  gross_amount: 300,
  total_taxes: 30,
  net_amount: 270,
  issue_date: '2026-06-12T10:00:00',
  due_date: '2026-06-20',
};

function resolvedChain(result) {
  const promise = Promise.resolve(result);
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    filter: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => promise),
    then: (resolve, reject) => promise.then(resolve, reject),
    catch: (reject) => promise.catch(reject),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
});

describe('invoiceService consolidado em ar_invoices', () => {
  it('emite invoice e cria recebivel via createReceivable canonico', async () => {
    const fetchInvoiceQuery = resolvedChain({ data: invoice, error: null });
    const issueInvoiceQuery = resolvedChain({ data: { ...invoice, status: 'issued' }, error: null });
    let invoiceCalls = 0;

    queryForTable.mockImplementation((table) => {
      if (table === 'invoices') {
        invoiceCalls += 1;
        return invoiceCalls === 1 ? fetchInvoiceQuery : issueInvoiceQuery;
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    receivablesApi.createReceivable.mockResolvedValue({ id: 'ar-invoice-001', amount: 270, status: 'open' });

    const result = await invoiceService.issueInvoiceAndCreateReceivable(invoiceId, { payment_method: 'boleto' });

    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(receivablesApi.createReceivable).toHaveBeenCalledWith(clinicId, expect.objectContaining({
      appointment_id: 'appointment-001',
      patient_id: 'patient-001',
      payer_id: 'payer-001',
      payer_type: 'insurance',
      amount: 270,
      net_value: 270,
      gross_amount: 300,
      taxes_value: 30,
      description: 'Invoice 2026-000001',
      due_date: '2026-06-20',
      status: 'open',
      origem: 'Invoice',
      payment_method: 'boleto',
      metadata: expect.objectContaining({
        source: 'invoice_service',
        invoice_id: invoiceId,
        invoice_number: '2026-000001',
      }),
    }));
    expect(auditIntegration.logReceivableCreated).toHaveBeenCalledWith(
      'appointment-001',
      'ar-invoice-001',
      270,
      expect.objectContaining({ invoice_number: '2026-000001' }),
    );
    expect(result).toMatchObject({
      invoice: { status: 'issued' },
      receivable: { id: 'ar-invoice-001' },
    });
  });

  it('registra pagamento usando receivable canonico por metadata.invoice_id', async () => {
    const invoiceFetchQuery = resolvedChain({ data: invoice, error: null });
    const arInvoiceQuery = resolvedChain({
      data: [{ id: 'ar-invoice-001', clinic_id: clinicId, net_value: 270 }],
      error: null,
    });
    const cashMovementQuery = resolvedChain({ data: { id: 'cash-001' }, error: null });
    const invoiceUpdateQuery = resolvedChain({ data: null, error: null });
    let invoicesCalls = 0;

    queryForTable.mockImplementation((table) => {
      if (table === 'invoices') {
        invoicesCalls += 1;
        return invoicesCalls === 1 ? invoiceFetchQuery : invoiceUpdateQuery;
      }
      if (table === 'ar_invoices') return arInvoiceQuery;
      if (table === 'cash_movements') return cashMovementQuery;
      throw new Error(`Unexpected table: ${table}`);
    });
    receivablesApi.registerReceivablePayment.mockResolvedValue({
      id: 'ar-invoice-001',
      status: 'received',
      received_value: 270,
    });

    const paymentDate = new Date('2026-06-12T12:00:00');
    const result = await invoiceService.recordInvoicePayment(invoiceId, 270, 'pix', paymentDate);

    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(arInvoiceQuery.filter).toHaveBeenCalledWith('metadata->>invoice_id', 'eq', invoiceId);
    expect(receivablesApi.registerReceivablePayment).toHaveBeenCalledWith({
      clinicId,
      receivableId: 'ar-invoice-001',
      amount: 270,
      payments: [{ method: 'pix', amount: 270 }],
      paymentDate: '2026-06-12',
      notes: 'Pagamento de 2026-000001',
      createdBy: 'invoice_service',
    });
    expect(auditIntegration.logPaymentReceived).toHaveBeenCalledWith(
      'appointment-001',
      'ar-invoice-001',
      270,
      270,
      'received',
      expect.objectContaining({ payment_method: 'pix' }),
    );
    expect(result).toMatchObject({
      invoice: { id: invoiceId },
      receivable: { id: 'ar-invoice-001', status: 'received' },
      cashMovement: { id: 'cash-001' },
    });
  });
});
