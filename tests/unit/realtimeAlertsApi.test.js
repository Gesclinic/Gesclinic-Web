import { beforeEach, describe, expect, it, vi } from 'vitest';

const subscribeMock = vi.fn(() => ({ unsubscribe: vi.fn() }));
const onMock = vi.fn(() => ({ subscribe: subscribeMock }));
const channelMock = vi.fn(() => ({ on: onMock }));
const supabaseMock = {
  channel: channelMock,
  removeChannel: vi.fn(),
};

vi.mock('../../src/lib/customSupabaseClient', () => ({
  supabase: supabaseMock,
}));

const realtimeAlertsApi = await import('../../src/lib/realtimeAlertsApi.js');

const clinicId = 'clinic-001';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('realtimeAlertsApi consolidado em receivable_payments', () => {
  it('subscribeToPayments observa baixas canonicas sem tocar ar_payments', () => {
    const onAlert = vi.fn();

    realtimeAlertsApi.subscribeToPayments(clinicId, onAlert);

    expect(channelMock).toHaveBeenCalledWith(`payments:${clinicId}`);
    expect(onMock).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'receivable_payments',
        filter: `clinic_id=eq.${clinicId}`,
      }),
      expect.any(Function),
    );
    expect(onMock.mock.calls[0][1].table).not.toBe('ar_payments');
    expect(subscribeMock).toHaveBeenCalledTimes(1);
  });

  it('emite alerta de pagamento recebido a partir do payload canonico', () => {
    const onAlert = vi.fn();

    realtimeAlertsApi.subscribeToPayments(clinicId, onAlert);
    const handler = onMock.mock.calls[0][2];

    handler({
      new: {
        status: 'completed',
        amount_paid: 120,
        payment_method_text: 'pix',
      },
    });

    expect(onAlert).toHaveBeenCalledWith(expect.objectContaining({
      type: realtimeAlertsApi.ALERT_TYPES.PAYMENT_RECEIVED,
      title: 'Payment Received',
      message: 'R$ 120.00 received via pix',
      severity: 'success',
      timestamp: expect.any(Date),
    }));
  });
});
