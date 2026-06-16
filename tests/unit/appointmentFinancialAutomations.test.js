import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryForTable = vi.fn();
const supabaseMock = {
  from: vi.fn((table) => queryForTable(table)),
};

vi.mock('@/lib/customSupabaseClient', () => ({
  customSupabaseClient: supabaseMock,
}));

const automations = await import('../../src/lib/appointmentFinancialAutomations.js');

const clinicId = 'clinic-001';
const appointmentId = 'appointment-001';

function resolvedChain(result) {
  const chain = {
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
});

describe('appointmentFinancialAutomations consolidado em ar_invoices', () => {
  it('rollback cancela recebiveis canonicos em ar_invoices', async () => {
    const arInvoicesQuery = resolvedChain({ error: null });
    const tissGuidesQuery = resolvedChain({ error: null });
    const commissionsQuery = resolvedChain({ error: null });
    const auditQuery = resolvedChain({ error: null });

    queryForTable.mockImplementation((table) => {
      if (table === 'ar_invoices') return arInvoicesQuery;
      if (table === 'tiss_guides') return tissGuidesQuery;
      if (table === 'medical_commissions') return commissionsQuery;
      if (table === 'appointment_financial_audit_logs') return auditQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await automations.rollbackAppointmentFinancials(
      appointmentId,
      clinicId,
      'Falha no fluxo financeiro',
    );

    expect(supabaseMock.from).toHaveBeenCalledWith('ar_invoices');
    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_receivables');
    expect(arInvoicesQuery.update).toHaveBeenCalledWith({ status: 'canceled' });
    expect(arInvoicesQuery.eq).toHaveBeenCalledWith('appointment_id', appointmentId);
    expect(arInvoicesQuery.eq).toHaveBeenCalledWith('clinic_id', clinicId);
    expect(auditQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      appointment_id: appointmentId,
      clinic_id: clinicId,
      financial_event_type: 'AUTOMATION_ROLLED_BACK',
      status: 'completed',
    }));
    expect(result).toEqual({ success: true });
  });
});
