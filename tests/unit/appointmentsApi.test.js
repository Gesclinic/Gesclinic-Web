import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryForTable = vi.fn();
const supabaseMock = {
  from: vi.fn((table) => queryForTable(table)),
};

vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/lib/auditApi', () => ({
  AUDIT_ACTION_TYPES: {},
  logAppointmentAudit: vi.fn(),
  logStatusChange: vi.fn(),
}));

vi.mock('@/lib/appointmentStatusConstants', () => ({
  migrateStatus: vi.fn((status) => status),
}));

vi.mock('@/lib/appointmentFinancialIntegrationApi', () => ({
  finalizeAppointmentWithFinancials: vi.fn(),
}));

const appointmentsApi = await import('../../src/lib/appointmentsApi.js');

const appointmentId = 'appointment-001';

function resolvedChain(result) {
  const promise = Promise.resolve(result);
  const chain = {
    delete: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve, reject) => promise.then(resolve, reject),
  };
  return chain;
}

function appointmentsListChain(result) {
  const promise = Promise.resolve(result);
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: (resolve, reject) => promise.then(resolve, reject),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
});

describe('appointmentsApi consolidado em ar_invoices', () => {
  it('filtra a agenda diária sem avançar a data por timezone', async () => {
    const appointmentsQuery = appointmentsListChain({ data: [], error: null });
    queryForTable.mockReturnValue(appointmentsQuery);

    await appointmentsApi.listAppointments({
      clinicId: 'clinic-001',
      start: '2026-09-20',
      end: '2026-09-20',
    });

    expect(appointmentsQuery.gte).toHaveBeenCalledWith('scheduled_date', '2026-09-20');
    expect(appointmentsQuery.lte).toHaveBeenCalledWith('scheduled_date', '2026-09-20');
  });

  it('deleteAppointment limpa recebiveis canonicos sem tocar ar_receivables', async () => {
    const arInvoicesQuery = resolvedChain({ error: null });
    const billingGuidesQuery = resolvedChain({ error: null });
    const appointmentServicesQuery = resolvedChain({ error: null });
    const appointmentItemsQuery = resolvedChain({ error: null });
    const relatedRecordsQuery = resolvedChain({ error: null });
    const appointmentQuery = resolvedChain({ error: null });

    queryForTable.mockImplementation((table) => {
      if (table === 'ar_invoices') return arInvoicesQuery;
      if (table === 'billing_guides') return billingGuidesQuery;
      if (table === 'appointment_services') return appointmentServicesQuery;
      if (table === 'appointment_items') return appointmentItemsQuery;
      if (table === 'appointments') return appointmentQuery;
      return relatedRecordsQuery;
    });

    const result = await appointmentsApi.deleteAppointment(appointmentId);

    expect(supabaseMock.from).toHaveBeenCalledWith('ar_invoices');
    expect(supabaseMock.from).toHaveBeenCalledWith('billing_guides');
    expect(supabaseMock.from).toHaveBeenCalledWith('appointments');
    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(arInvoicesQuery.delete).toHaveBeenCalledTimes(1);
    expect(arInvoicesQuery.eq).toHaveBeenCalledWith('appointment_id', appointmentId);
    expect(billingGuidesQuery.eq).toHaveBeenCalledWith('appointment_id', appointmentId);
    expect(appointmentServicesQuery.eq).toHaveBeenCalledWith('appointment_id', appointmentId);
    expect(appointmentItemsQuery.eq).toHaveBeenCalledWith('appointment_id', appointmentId);
    expect(appointmentQuery.eq).toHaveBeenCalledWith('id', appointmentId);
    expect(result).toBe(true);
  });
});
