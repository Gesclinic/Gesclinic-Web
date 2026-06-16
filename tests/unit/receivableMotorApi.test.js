import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/receivablesApi', () => ({
  createReceivable: vi.fn(),
  getReceivableById: vi.fn(),
  listReceivables: vi.fn(),
  registerReceivablePayment: vi.fn(),
  updateReceivable: vi.fn(),
}));

const receivablesApi = await import('../../src/lib/receivablesApi');
const motor = await import('../../src/lib/receivableMotorApi.js');

const clinicId = 'clinic-001';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('receivableMotorApi consolidado em ar_invoices', () => {
  it('cria recebivel parcelado usando createReceivable canonico', async () => {
    receivablesApi.createReceivable.mockResolvedValue([
      { id: 'inv-1', clinic_id: clinicId, amount: 150, net_value: 150, due_date: '2026-06-10', status: 'open' },
      { id: 'inv-2', clinic_id: clinicId, amount: 150, net_value: 150, due_date: '2026-07-10', status: 'open' },
    ]);

    const result = await motor.createReceivableWithInstallments({
      clinicId,
      appointmentId: 'apt-001',
      pacientName: 'Paciente Teste',
      payerType: 'PARTICULAR',
      payerId: 'payer-001',
      amount: 300,
      installments: 2,
      dueDate: '2026-06-10',
      description: 'Atendimento',
    });

    expect(receivablesApi.createReceivable).toHaveBeenCalledWith(
      clinicId,
      expect.objectContaining({
        appointment_id: 'apt-001',
        patient_name: 'Paciente Teste',
        amount: 300,
        total_parcelas: 2,
        status: 'open',
        metadata: expect.objectContaining({ source_table: 'ar_invoices' }),
      }),
    );
    expect(result).toMatchObject({
      success: true,
      receivableId: 'inv-1',
      installmentCount: 2,
      source: 'ar_invoices',
    });
    expect(result.installments).toHaveLength(2);
  });

  it('registra pagamento parcial via registerReceivablePayment canonico', async () => {
    receivablesApi.registerReceivablePayment.mockResolvedValue({
      id: 'inv-1',
      status: 'partial',
      net_value: 300,
      received_value: 120,
      balance_amount: 180,
      metadata: { last_payment: { registered_at: '2026-06-12T00:00:00.000Z' } },
    });

    const result = await motor.registerPartialPayment({
      clinicId,
      receivableId: 'inv-1',
      paymentAmount: 120,
      paymentMethod: 'pix',
      paymentDate: '2026-06-12',
      notes: 'Pagamento inicial',
    });

    expect(receivablesApi.registerReceivablePayment).toHaveBeenCalledWith(expect.objectContaining({
      clinicId,
      receivableId: 'inv-1',
      amount: 120,
      payments: [{ method: 'pix', amount: 120 }],
      paymentDate: '2026-06-12',
      createdBy: 'receivable_motor',
    }));
    expect(result).toMatchObject({
      success: true,
      receivableId: 'inv-1',
      newStatus: 'partial',
      paidAmount: 120,
      remainingAmount: 180,
      source: 'ar_invoices',
    });
  });

  it('registra split payment em uma unica chamada canonica', async () => {
    receivablesApi.registerReceivablePayment.mockResolvedValue({
      id: 'inv-1',
      status: 'received',
      payment_split: [
        { method: 'pix', amount: 100 },
        { method: 'cartao_credito', amount: 200 },
      ],
    });

    const result = await motor.registerSplitPayment({
      clinicId,
      receivableId: 'inv-1',
      totalAmount: 300,
      splits: [
        { method: 'pix', amount: 100, date: '2026-06-12' },
        { method: 'cartao_credito', amount: 200, date: '2026-06-12' },
      ],
    });

    expect(receivablesApi.registerReceivablePayment).toHaveBeenCalledTimes(1);
    expect(receivablesApi.registerReceivablePayment).toHaveBeenCalledWith(expect.objectContaining({
      payments: [
        { method: 'pix', amount: 100, reference: undefined },
        { method: 'cartao_credito', amount: 200, reference: undefined },
      ],
      paymentDate: '2026-06-12',
    }));
    expect(result).toMatchObject({ success: true, source: 'ar_invoices' });
    expect(result.payments).toHaveLength(2);
  });

  it('lista recebiveis via listReceivables canonico', async () => {
    receivablesApi.listReceivables.mockResolvedValue([{ id: 'inv-1' }]);

    const result = await motor.listReceivablesWithFilters({
      clinicId,
      status: 'pending',
      payerType: 'PARTICULAR',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      search: 'Paciente',
      limit: 25,
      offset: 10,
    });

    expect(receivablesApi.listReceivables).toHaveBeenCalledWith({
      clinicId,
      status: 'open',
      payerType: 'PARTICULAR',
      dueStart: '2026-06-01',
      dueEnd: '2026-06-30',
      search: 'Paciente',
      limit: 25,
      offset: 10,
    });
    expect(result).toEqual([{ id: 'inv-1' }]);
  });

  it('marca vencidos em ar_invoices usando updateReceivable', async () => {
    receivablesApi.listReceivables.mockResolvedValue([
      { id: 'inv-overdue', due_date: '2026-06-01', status: 'open', amount: 100 },
      { id: 'inv-today', due_date: new Date().toISOString().split('T')[0], status: 'open', amount: 100 },
    ]);
    receivablesApi.updateReceivable.mockResolvedValue({ id: 'inv-overdue', status: 'overdue' });

    const result = await motor.markOverdueReceivables(clinicId);

    expect(receivablesApi.listReceivables).toHaveBeenCalledWith(expect.objectContaining({
      clinicId,
      statusList: ['open', 'pending', 'partial'],
    }));
    expect(receivablesApi.updateReceivable).toHaveBeenCalledTimes(1);
    expect(receivablesApi.updateReceivable).toHaveBeenCalledWith('inv-overdue', { status: 'overdue' });
    expect(result).toMatchObject({ success: true, updated: 1, source: 'ar_invoices' });
  });
});
