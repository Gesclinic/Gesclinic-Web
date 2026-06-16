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
    eq: vi.fn(() => chain),
    then: (resolve, reject) => promise.then(resolve, reject),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
});

describe('appointmentsApi consolidado em ar_invoices', () => {
  it('deleteAppointment limpa recebiveis canonicos sem tocar ar_receivables', async () => {
    const arInvoicesQuery = resolvedChain({ error: null });
    const billingGuidesQuery = resolvedChain({ error: null });
    const appointmentQuery = resolvedChain({ error: null });

    queryForTable.mockImplementation((table) => {
      if (table === 'ar_invoices') return arInvoicesQuery;
      if (table === 'billing_guides') return billingGuidesQuery;
      if (table === 'appointments') return appointmentQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await appointmentsApi.deleteAppointment(appointmentId);

    expect(supabaseMock.from).toHaveBeenCalledWith('ar_invoices');
    expect(supabaseMock.from).toHaveBeenCalledWith('billing_guides');
    expect(supabaseMock.from).toHaveBeenCalledWith('appointments');
    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(arInvoicesQuery.delete).toHaveBeenCalledTimes(1);
    expect(arInvoicesQuery.eq).toHaveBeenCalledWith('appointment_id', appointmentId);
    expect(billingGuidesQuery.eq).toHaveBeenCalledWith('appointment_id', appointmentId);
    expect(appointmentQuery.eq).toHaveBeenCalledWith('id', appointmentId);
    expect(result).toBe(true);
  });
});
