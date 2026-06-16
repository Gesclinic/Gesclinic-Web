import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryForTable = vi.fn();
const supabaseMock = {
  from: vi.fn((table: string) => queryForTable(table)),
};

vi.mock('../../src/lib/customSupabaseClient', () => ({
  customSupabaseClient: supabaseMock,
}));

vi.mock('../../src/lib/faturamento360Api', () => ({
  createFaturamento360FromAppointment: vi.fn(),
}));

const integrationApi = await import('../../src/lib/appointmentFinancialIntegrationApi');

const clinicId = 'clinic-001';

function resolvedChain(result: any) {
  const promise = Promise.resolve(result);
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    in: vi.fn(() => chain),
    single: vi.fn(() => promise),
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
});

describe('appointmentFinancialIntegrationApi status canonico', () => {
  it('lista status financeiro com ar_invoices sem tocar ar_receivables', async () => {
    const appointmentsQuery = resolvedChain({
      data: [
        {
          id: 'appointment-001',
          clinic_id: clinicId,
          status: 'attended',
          payer_id: 'payer-001',
          patient_name: 'Maria Silva',
        },
        {
          id: 'appointment-002',
          clinic_id: clinicId,
          status: 'attended',
          patient_name: 'Joao Souza',
        },
      ],
      error: null,
    });
    const invoicesQuery = resolvedChain({
      data: [
        { id: 'invoice-001', appointment_id: 'appointment-001', clinic_id: clinicId },
        { id: 'invoice-002', appointment_id: 'appointment-002', clinic_id: clinicId },
      ],
      error: null,
    });
    const guidesQuery = resolvedChain({
      data: [
        { id: 'guide-001', appointment_id: 'appointment-001', clinic_id: clinicId },
      ],
      error: null,
    });

    queryForTable.mockImplementation((table: string) => {
      if (table === 'appointments') return appointmentsQuery;
      if (table === 'ar_invoices') return invoicesQuery;
      if (table === 'billing_guides') return guidesQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await integrationApi.listAppointmentsWithFinancialStatus(
      clinicId,
      '2026-06-12',
      '2026-06-13',
    );

    expect(supabaseMock.from).toHaveBeenCalledWith('appointments');
    expect(supabaseMock.from).toHaveBeenCalledWith('ar_invoices');
    expect(supabaseMock.from).toHaveBeenCalledWith('billing_guides');
    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(invoicesQuery.in).toHaveBeenCalledWith('appointment_id', ['appointment-001', 'appointment-002']);
    expect(result).toEqual([
      expect.objectContaining({
        id: 'appointment-001',
        ar_invoices: [expect.objectContaining({ id: 'invoice-001' })],
        billing_guides: [expect.objectContaining({ id: 'guide-001' })],
        financial_status: 'complete_with_guide',
      }),
      expect.objectContaining({
        id: 'appointment-002',
        ar_invoices: [expect.objectContaining({ id: 'invoice-002' })],
        billing_guides: [],
        financial_status: 'complete_particular',
      }),
    ]);
  });
});
