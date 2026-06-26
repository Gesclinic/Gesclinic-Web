import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/auditFinancialIntegration.js', () => ({
  logReceivableCreated: vi.fn(() => Promise.resolve()),
  logPaymentReceived: vi.fn(() => Promise.resolve()),
}));

const { supabase } = await import('@/lib/customSupabaseClient');
const {
  deleteReceivable,
  listReceivables,
  updateReceivable,
} = await import('@/lib/receivablesApi.js');

function createQuery(result = { data: [], error: null }) {
  const calls = {
    eq: [],
    ilike: [],
    range: [],
    in: [],
    gte: [],
    lte: [],
    gt: [],
    or: [],
    order: [],
  };

  const query = {
    calls,
    select: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    insert: vi.fn(() => query),
    eq: vi.fn((column, value) => {
      calls.eq.push([column, value]);
      return query;
    }),
    ilike: vi.fn((column, value) => {
      calls.ilike.push([column, value]);
      return query;
    }),
    range: vi.fn((from, to) => {
      calls.range.push([from, to]);
      return query;
    }),
    in: vi.fn((column, value) => {
      calls.in.push([column, value]);
      return query;
    }),
    gte: vi.fn((column, value) => {
      calls.gte.push([column, value]);
      return query;
    }),
    lte: vi.fn((column, value) => {
      calls.lte.push([column, value]);
      return query;
    }),
    gt: vi.fn((column, value) => {
      calls.gt.push([column, value]);
      return query;
    }),
    or: vi.fn((value) => {
      calls.or.push(value);
      return query;
    }),
    order: vi.fn((column, options) => {
      calls.order.push([column, options]);
      return query;
    }),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

describe('receivablesApi enterprise contract', () => {
  const clinicId = 'clinic-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists receivables with tenant scope, enterprise filters and pagination', async () => {
    const query = createQuery({ data: [{ id: 'ar-1', clinic_id: clinicId }], error: null });
    supabase.from.mockReturnValue(query);

    const result = await listReceivables({
      clinicId,
      payerType: 'convenio',
      payerId: 'payer-1',
      professionalId: 'professional-1',
      unitName: 'Unidade Centro',
      specialtyName: 'Cardiologia',
      insuranceBillingStatus: 'enviada',
      tissXmlStatus: 'NAO_GERADO',
      insuranceReturnStatus: 'pendente',
      hasGlosa: 'true',
      minValue: 100,
      maxValue: 500,
      search: 'maria',
      limit: 100,
      offset: 200,
    });

    expect(result[0]).toEqual(expect.objectContaining({ id: 'ar-1', clinic_id: clinicId }));
    expect(supabase.from).toHaveBeenCalledWith('ar_invoices');
    expect(query.calls.eq).toContainEqual(['clinic_id', clinicId]);
    expect(query.calls.eq).toContainEqual(['payer_id', 'payer-1']);
    expect(query.calls.eq).toContainEqual(['professional_id', 'professional-1']);
    expect(query.calls.eq).toContainEqual(['insurance_billing_status', 'enviada']);
    expect(query.calls.eq).toContainEqual(['tiss_xml_status', 'NAO_GERADO']);
    expect(query.calls.eq).toContainEqual(['insurance_return_status', 'pendente']);
    expect(query.calls.ilike).toContainEqual(['payer_type', 'CONVENIO']);
    expect(query.calls.ilike).toContainEqual(['unit_name', '%Unidade Centro%']);
    expect(query.calls.ilike).toContainEqual(['specialty_name', '%Cardiologia%']);
    expect(query.calls.gt).toContainEqual(['glosa_value', 0]);
    expect(query.calls.gte).toContainEqual(['net_value', 100]);
    expect(query.calls.lte).toContainEqual(['net_value', 500]);
    expect(query.calls.or).toContain('description.ilike.%maria%,patient_name.ilike.%maria%');
    expect(query.calls.range).toContainEqual([200, 299]);
  });

  it('updates receivable scoped by clinic when clinicId is provided', async () => {
    const query = createQuery({ data: [{ id: 'ar-1', clinic_id: clinicId, status: 'canceled' }], error: null });
    supabase.from.mockReturnValue(query);

    const result = await updateReceivable('ar-1', { status: 'canceled' }, clinicId);

    expect(result.status).toBe('canceled');
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'canceled',
      enterprise_status: 'CANCELADO',
    }));
    expect(query.calls.eq).toContainEqual(['id', 'ar-1']);
    expect(query.calls.eq).toContainEqual(['clinic_id', clinicId]);
  });

  it('keeps updateReceivable backward compatible without clinic scope', async () => {
    const query = createQuery({ data: [{ id: 'ar-1', status: 'open' }], error: null });
    supabase.from.mockReturnValue(query);

    await updateReceivable('ar-1', { status: 'open' });

    expect(query.calls.eq).toContainEqual(['id', 'ar-1']);
    expect(query.calls.eq).not.toContainEqual(['clinic_id', clinicId]);
  });

  it('deletes receivable scoped by clinic and requires a removed row', async () => {
    const query = createQuery({ data: [{ id: 'ar-1' }], error: null });
    supabase.from.mockReturnValue(query);

    await expect(deleteReceivable('ar-1', clinicId)).resolves.toBeUndefined();

    expect(query.delete).toHaveBeenCalled();
    expect(query.calls.eq).toContainEqual(['id', 'ar-1']);
    expect(query.calls.eq).toContainEqual(['clinic_id', clinicId]);
    expect(query.select).toHaveBeenCalledWith('id, clinic_id');
  });

  it('throws when delete does not remove a row in the current clinic', async () => {
    const query = createQuery({ data: [], error: null });
    supabase.from.mockReturnValue(query);

    await expect(deleteReceivable('ar-1', clinicId)).rejects.toThrow('Record not found or outside current clinic');
  });
});
