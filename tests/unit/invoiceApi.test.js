import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryForTable = vi.fn();
const supabaseMock = {
  from: vi.fn((table) => queryForTable(table)),
};

vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/lib/receivablesApi', () => ({
  createReceivable: vi.fn(),
}));

const receivablesApi = await import('@/lib/receivablesApi');
const invoiceApi = await import('../../src/lib/invoiceApi.js');

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
  description: 'Consulta',
  gross_amount: 300,
  net_amount: 270,
  due_date: '2026-06-20',
  emission_date: '2026-06-12',
  professional_id: 'professional-001',
  service_id: 'service-001',
};

function resolvedChain(result) {
  const promise = Promise.resolve(result);
  const chain = {
    select: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    filter: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    single: vi.fn(() => promise),
    then: (resolve, reject) => promise.then(resolve, reject),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
});

describe('invoiceApi consolidado em ar_invoices', () => {
  it('emite NF criando recebivel com createReceivable canonico', async () => {
    const updateInvoiceQuery = resolvedChain({ data: { id: invoiceId, status: 'issued' }, error: null });
    const fetchInvoiceQuery = resolvedChain({ data: invoice, error: null });
    const repasseConfigQuery = resolvedChain({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    let invoiceCalls = 0;

    queryForTable.mockImplementation((table) => {
      if (table === 'invoices') {
        invoiceCalls += 1;
        return invoiceCalls === 1 ? updateInvoiceQuery : fetchInvoiceQuery;
      }
      if (table === 'medical_repasse_config') return repasseConfigQuery;
      throw new Error(`Unexpected table: ${table}`);
    });
    receivablesApi.createReceivable.mockResolvedValue({ id: 'ar-invoice-001', amount: 270 });

    const result = await invoiceApi.emitInvoiceAndCreateAR(invoiceId, { payment_method: 'boleto' });

    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(receivablesApi.createReceivable).toHaveBeenCalledWith(clinicId, expect.objectContaining({
      patient_id: 'patient-001',
      description: 'NF 2026-000001: Consulta',
      amount: 270,
      net_value: 270,
      gross_amount: 300,
      payer_id: 'payer-001',
      payer_type: 'insurance',
      appointment_id: 'appointment-001',
      due_date: '2026-06-20',
      invoice_date: '2026-06-12',
      origem: 'nf',
      professional_id: 'professional-001',
      procedure_id: 'service-001',
      payment_method: 'boleto',
      metadata: expect.objectContaining({
        source: 'invoice_api',
        invoice_id: invoiceId,
        invoice_number: '2026-000001',
      }),
    }));
    expect(result).toMatchObject({
      invoice,
      receivable: { id: 'ar-invoice-001' },
    });
  });

  it('cancela NF atualizando recebivel em ar_invoices por metadata.invoice_id', async () => {
    const updateInvoiceQuery = resolvedChain({
      data: { ...invoice, status: 'canceled', cancellation_reason: 'Erro operacional' },
      error: null,
    });
    const arInvoiceUpdateQuery = resolvedChain({ data: [{ id: 'ar-invoice-001' }], error: null });
    let invoiceCalls = 0;

    queryForTable.mockImplementation((table) => {
      if (table === 'invoices') {
        invoiceCalls += 1;
        return updateInvoiceQuery;
      }
      if (table === 'ar_invoices') return arInvoiceUpdateQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await invoiceApi.cancelInvoice(invoiceId, 'Erro operacional');

    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(supabaseMock.from).toHaveBeenCalledWith('ar_invoices');
    expect(arInvoiceUpdateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'canceled',
      enterprise_status: 'CANCELADO',
    }));
    expect(arInvoiceUpdateQuery.eq).toHaveBeenCalledWith('clinic_id', clinicId);
    expect(arInvoiceUpdateQuery.filter).toHaveBeenCalledWith('metadata->>invoice_id', 'eq', invoiceId);
    expect(result).toMatchObject({ id: invoiceId, status: 'canceled' });
  });
});
