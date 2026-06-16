import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryForTable = vi.fn();
const supabaseMock = {
  from: vi.fn((table) => queryForTable(table)),
};

vi.mock('../../src/lib/customSupabaseClient', () => ({
  supabase: supabaseMock,
}));

vi.mock('../../src/lib/auditFinancialApi', () => ({
  FINANCIAL_EVENT_TYPES: {
    RECEIVABLE_CREATED: 'receivable_created',
    BILLING_GUIDE_CREATED: 'billing_guide_created',
  },
  RELATED_ENTITY_TYPES: {
    AR_INVOICE: 'ar_invoices',
    BILLING_GUIDE: 'billing_guide',
  },
  logAppointmentFinancialAudit: vi.fn(),
}));

vi.mock('../../src/lib/receivablesApi.js', () => ({
  createReceivable: vi.fn(),
  listReceivables: vi.fn(),
}));

const receivablesApi = await import('../../src/lib/receivablesApi.js');
const auditApi = await import('../../src/lib/auditFinancialApi');
const checkInApi = await import('../../src/lib/financialCheckInApi.js');

const clinicId = 'clinic-001';
const appointmentId = 'appointment-001';

function resolvedChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function setupParticularCheckInSupabase() {
  const appointmentQuery = resolvedChain({
    data: {
      id: appointmentId,
      patient_id: 'patient-001',
      professional_id: 'professional-001',
      clinic_id: clinicId,
      appointment_date: '2026-06-12T10:00:00',
      service_id: 'service-001',
      status: 'scheduled',
    },
    error: null,
  });
  const appointmentUpdateQuery = resolvedChain({ data: null, error: null });
  const patientUpdateQuery = resolvedChain({ data: null, error: null });
  let appointmentCalls = 0;

  queryForTable.mockImplementation((table) => {
    if (table === 'appointments') {
      appointmentCalls += 1;
      return appointmentCalls === 1 ? appointmentQuery : appointmentUpdateQuery;
    }
    if (table === 'patients') return patientUpdateQuery;
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
});

describe('financialCheckInApi consolidado em ar_invoices', () => {
  it('cria recebivel particular via createReceivable canonico', async () => {
    setupParticularCheckInSupabase();
    receivablesApi.createReceivable.mockResolvedValue({ id: 'inv-001', amount: 200, net_value: 180 });

    const result = await checkInApi.saveCheckInFinancialData(appointmentId, {
      payer_type: 'PARTICULAR',
      patient_name: 'Maria Silva',
      patient_email: 'maria@example.com',
      value: 200,
      discount: 20,
      copayment: 0,
      payment_method: 'pix',
    });

    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(receivablesApi.createReceivable).toHaveBeenCalledWith(clinicId, expect.objectContaining({
      appointment_id: appointmentId,
      patient_id: 'patient-001',
      patient_name: 'Maria Silva',
      payer_name: 'Maria Silva',
      amount: 200,
      discount_value: 20,
      net_value: 180,
      status: 'open',
      payment_method: 'pix',
      origem: 'Agenda',
      professional_id: 'professional-001',
      procedure_id: 'service-001',
      payer_type: 'PARTICULAR',
      metadata: expect.objectContaining({ source: 'financial_check_in' }),
    }));
    expect(auditApi.logAppointmentFinancialAudit).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId,
      relatedEntity: 'ar_invoices',
      relatedEntityId: 'inv-001',
      amount: 180,
      status: 'open',
    }));
    expect(result).toMatchObject({
      error: false,
      type: 'receivable',
      data: { receivable_id: 'inv-001', amount: 180 },
    });
  });

  it('lista pendentes via listReceivables canonico ordenado por vencimento', async () => {
    receivablesApi.listReceivables.mockResolvedValue([
      { id: 'inv-2', due_date: '2026-06-20' },
      { id: 'inv-1', due_date: '2026-06-10' },
    ]);

    const result = await checkInApi.listPendingReceivables(clinicId);

    expect(receivablesApi.listReceivables).toHaveBeenCalledWith({
      clinicId,
      statusList: ['open', 'pending'],
      origin: 'Agenda',
      limit: 5000,
    });
    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(result.map((row) => row.id)).toEqual(['inv-1', 'inv-2']);
  });
});
