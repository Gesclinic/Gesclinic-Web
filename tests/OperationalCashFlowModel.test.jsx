import { describe, expect, it } from 'vitest';
import { buildOperationalModel } from '../src/components/financeiro/OperationalCashFlowModel.jsx';

const accounts = [
  { id: 'rev-consultas', code: '1.1.01', name: 'Consultas', type: 'REVENUE', level: 2, parentName: 'Receitas Operacionais' },
  { id: 'exp-servicos', code: '2.2.01', name: 'Servicos de Terceiros', type: 'EXPENSE', level: 2, parentName: 'Despesas Administrativas' },
];

function buildModel(consolidation, options = {}) {
  return buildOperationalModel(consolidation, accounts, '', 'realized', {
    periodicity: 'monthly',
    scenario: 'consolidated',
    displayMode: 'income_expense',
    ...options,
  });
}

function row(model, key) {
  const found = model.rows.find((item) => item.key === key || item.label === key);
  expect(found, `row ${key}`).toBeTruthy();
  return found;
}

const basePeriod = { startDate: '2026-07-01', endDate: '2026-08-31' };

describe('buildOperationalModel cash-flow management table', () => {
  it('separates realized and forecast amounts for partially received receivables', () => {
    const model = buildModel({
      period: basePeriod,
      receivables: [{
        id: 'ar-partial', clinic_id: 'clinic-1', status: 'partial', amount: 1000, received_value: 400, balance_amount: 600,
        received_date: '2026-07-08', due_date: '2026-08-15', chart_account_id: 'rev-consultas', patient_name: 'Ana Silva',
      }],
      payables: [],
      transactions: [],
    }, { displayMode: 'result' });

    expect(row(model, 'Resultado Realizado').values['2026-07']).toBe(400);
    expect(row(model, 'Resultado Previsto').values['2026-08']).toBe(600);
    expect(row(model, 'Resultado Consolidado').values.total).toBe(1000);
  });

  it('separates paid and forecast amounts for partially paid payables', () => {
    const model = buildModel({
      period: basePeriod,
      receivables: [],
      payables: [{
        id: 'ap-partial', clinic_id: 'clinic-1', status: 'partial', amount: 1000, paid_amount: 300, balance_amount: 700,
        paid_at: '2026-07-10', due_date: '2026-08-10', chart_account_id: 'exp-servicos', vendor_name: 'Contabilidade',
      }],
      transactions: [],
    }, { displayMode: 'result' });

    expect(row(model, 'Resultado Realizado').values['2026-07']).toBe(-300);
    expect(row(model, 'Resultado Previsto').values['2026-08']).toBe(-700);
    expect(row(model, 'Resultado Consolidado').values.total).toBe(-1000);
  });

  it('does not include transfers in income, expense or result', () => {
    const model = buildModel({
      period: basePeriod,
      opening_balance: 1000,
      receivables: [],
      payables: [],
      transactions: [{
        id: 'transfer-1', clinic_id: 'clinic-1', status: 'paid', type: 'transfer', category: 'transferencia', amount: 500,
        transaction_date: '2026-07-05', description: 'Transferencia Caixa Diario para Banco',
      }],
    }, { displayMode: 'result' });

    expect(row(model, 'Resultado Realizado').values.total).toBe(0);
    expect(model.totals.inflows).toBe(0);
    expect(model.totals.outflows).toBe(0);
  });

  it('ignores canceled and reversed titles', () => {
    const model = buildModel({
      period: basePeriod,
      receivables: [
        { id: 'ar-canceled', clinic_id: 'clinic-1', status: 'canceled', amount: 800, due_date: '2026-07-20', chart_account_id: 'rev-consultas' },
        { id: 'ar-reversed', clinic_id: 'clinic-1', status: 'reversed', amount: 900, received_value: 900, received_date: '2026-07-20', chart_account_id: 'rev-consultas' },
      ],
      payables: [{ id: 'ap-canceled', clinic_id: 'clinic-1', status: 'cancelado', amount: 700, due_date: '2026-07-20', chart_account_id: 'exp-servicos' }],
      transactions: [],
    }, { displayMode: 'result' });

    expect(row(model, 'Resultado Realizado').values.total).toBe(0);
    expect(row(model, 'Resultado Previsto').values.total).toBe(0);
  });

  it('calculates projected balance cumulatively and does not sum balance totals', () => {
    const model = buildModel({
      period: basePeriod,
      opening_balance: 10000,
      receivables: [{ id: 'ar-open', clinic_id: 'clinic-1', status: 'open', amount: 5000, due_date: '2026-07-15', chart_account_id: 'rev-consultas' }],
      payables: [{ id: 'ap-open', clinic_id: 'clinic-1', status: 'open', amount: 3000, due_date: '2026-08-15', chart_account_id: 'exp-servicos' }],
      transactions: [],
    }, { displayMode: 'balances' });

    const projected = row(model, 'Saldo projetado');
    expect(projected.values['2026-07']).toBe(15000);
    expect(projected.values['2026-08']).toBe(12000);
    expect(projected.values.total).toBe(12000);
  });

  it('creates daily, weekly, monthly and yearly period columns', () => {
    const consolidation = {
      period: { startDate: '2025-12-29', endDate: '2026-01-10' },
      receivables: [{ id: 'ar-1', clinic_id: 'clinic-1', status: 'paid', amount: 100, received_value: 100, received_date: '2026-01-02', chart_account_id: 'rev-consultas' }],
      payables: [],
      transactions: [],
    };

    expect(buildModel(consolidation, { periodicity: 'daily' }).months).toHaveLength(13);
    expect(buildModel(consolidation, { periodicity: 'weekly' }).months).toEqual(['2025-12-29:2026-01-04', '2026-01-05:2026-01-10']);
    expect(buildModel(consolidation, { periodicity: 'monthly' }).months).toEqual(['2025-12', '2026-01']);
    expect(buildModel(consolidation, { periodicity: 'yearly' }).months).toEqual(['2025', '2026']);
  });

  it('keeps positive and negative result totals correct', () => {
    const positive = buildModel({
      period: basePeriod,
      receivables: [{ id: 'ar-paid', clinic_id: 'clinic-1', status: 'paid', amount: 1200, received_value: 1200, received_date: '2026-07-03', chart_account_id: 'rev-consultas' }],
      payables: [{ id: 'ap-paid', clinic_id: 'clinic-1', status: 'paid', amount: 200, paid_amount: 200, paid_at: '2026-07-04', chart_account_id: 'exp-servicos' }],
      transactions: [],
    }, { displayMode: 'result' });
    const negative = buildModel({
      period: basePeriod,
      receivables: [{ id: 'ar-paid-2', clinic_id: 'clinic-1', status: 'paid', amount: 100, received_value: 100, received_date: '2026-07-03', chart_account_id: 'rev-consultas' }],
      payables: [{ id: 'ap-paid-2', clinic_id: 'clinic-1', status: 'paid', amount: 500, paid_amount: 500, paid_at: '2026-07-04', chart_account_id: 'exp-servicos' }],
      transactions: [],
    }, { displayMode: 'result' });

    expect(row(positive, 'Resultado Realizado').values.total).toBe(1000);
    expect(row(negative, 'Resultado Realizado').values.total).toBe(-400);
  });

  it('does not render unclassified chart-account fallback as a financial account', () => {
    const model = buildModel({
      period: basePeriod,
      receivables: [{
        id: 'ar-with-plan', clinic_id: 'clinic-1', status: 'paid', amount: 2200, received_value: 2200,
        received_date: '2026-07-08', due_date: '2026-07-08', chart_account_id: 'rev-consultas',
        professional_name: 'Profissional teste', service_name: 'Consulta', patient_name: 'Paciente teste',
      }],
      payables: [],
      transactions: [],
    }, { displayMode: 'income_expense' });

    expect(model.rows.some((item) => item.label === 'Nao classificado no plano de contas' && item.meta === 'Conta financeira')).toBe(false);
    expect(model.rows.some((item) => item.label === '1.1.01 - Consultas')).toBe(true);
  });

  it('adds clinical service group between professional and service when available or inferable', () => {
    const model = buildModel({
      period: basePeriod,
      receivables: [{
        id: 'ar-service-group', clinic_id: 'clinic-1', status: 'paid', amount: 2200, received_value: 2200,
        received_date: '2026-07-08', due_date: '2026-07-08', chart_account_id: 'rev-consultas',
        professional_name: 'Profissional teste', service_name: 'Consulta em horario normal', patient_name: 'Paciente teste',
      }],
      payables: [],
      transactions: [],
    }, { displayMode: 'income_expense' });

    const professionalIndex = model.rows.findIndex((item) => item.label === 'Profissional teste' && item.meta === 'Profissional');
    const groupIndex = model.rows.findIndex((item) => item.label === 'Consultas' && item.meta === 'Grupo do servico');
    const serviceIndex = model.rows.findIndex((item) => item.label === 'Consulta em horario normal' && item.meta === 'Servico');

    expect(professionalIndex).toBeGreaterThan(-1);
    expect(groupIndex).toBeGreaterThan(professionalIndex);
    expect(serviceIndex).toBeGreaterThan(groupIndex);
  });

  it('places the day immediately under income in monthly and weekly views', () => {
    const consolidation = {
      period: basePeriod,
      receivables: [{
        id: 'ar-period-day', clinic_id: 'clinic-1', status: 'paid', amount: 2200, received_value: 2200,
        received_date: '2026-07-08T09:15:00', due_date: '2026-07-08', chart_account_id: 'rev-consultas',
        professional_name: 'Profissional teste', service_name: 'Consulta em horario normal', patient_name: 'Paciente teste',
      }],
      payables: [],
      transactions: [],
    };
    const monthly = buildModel(consolidation, { periodicity: 'monthly' });
    const weekly = buildModel(consolidation, { periodicity: 'weekly' });

    expect(row(monthly, '08/07/2026').parentKey).toBe('section:income');
    expect(row(weekly, '08/07/2026').parentKey).toBe('section:income');
  });

  it('uses day under income in daily view and month under income in annual view', () => {
    const consolidation = {
      period: basePeriod,
      receivables: [{
        id: 'ar-period-time', clinic_id: 'clinic-1', status: 'paid', amount: 2200, received_value: 2200,
        received_date: '2026-07-08T09:15:00', due_date: '2026-07-08', chart_account_id: 'rev-consultas',
        professional_name: 'Profissional teste', service_name: 'Consulta em horario normal', patient_name: 'Paciente teste',
      }],
      payables: [],
      transactions: [],
    };
    const daily = buildModel(consolidation, { periodicity: 'daily' });
    const annual = buildModel(consolidation, { periodicity: 'yearly' });

    expect(row(daily, '08/07/2026').parentKey).toBe('section:income');
    expect(row(annual, 'Julho/2026').parentKey).toBe('section:income');
  });

  it('treats operator cash-drawer paid expenses as realized, not overdue forecast', () => {
    const model = buildModel({
      period: basePeriod,
      receivables: [],
      payables: [{
        id: 'ap-cash-drawer-paid', clinic_id: 'clinic-1', status: 'OVERDUE', amount: 30, net_amount: 30, balance_amount: 30, paid_value: 0,
        due_date: '2026-07-11', description: 'Despesa manual do caixa - pagamento teste/boy',
        notes: 'Despesa manual do Caixa Diario. Movimento do caixa: 3df6327b-423e-42fa-bfbb-44dac213fb71.',
        payment_method: 'DINHEIRO', vendor_name: 'Eli', document_number: 'Recibo 202645',
      }],
      transactions: [],
    }, { displayMode: 'result' });

    expect(row(model, 'Resultado Realizado').values['2026-07']).toBe(-30);
    expect(row(model, 'Resultado Previsto').values['2026-07']).toBe(0);
    expect(model.rows.some((item) => item.warning === 'Vencido')).toBe(false);
  });
});
