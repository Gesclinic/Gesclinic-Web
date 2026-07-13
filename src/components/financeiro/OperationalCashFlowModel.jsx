import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Table2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { listAccountPlans } from '@/lib/financeApi';
import { listChartOfAccounts } from '@/modules/financeiro/plano-contas/services/chartOfAccountsApi';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const fullMonthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percentFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const GROUPS = {
  revenue: { order: 1, code: '1', label: 'Receitas Operacionais', tone: 'positive' },
  deductions: { order: 2, code: '2', label: 'Deducoes da Receita e Taxas', tone: 'warning' },
  operational: { order: 3, code: '3', label: 'Custos e Despesas Operacionais', tone: 'negative' },
  people: { order: 4, code: '4', label: 'Pessoal, Honorarios e Repasses', tone: 'negative' },
  financial: { order: 5, code: '5', label: 'Despesas Financeiras e Bancarias', tone: 'negative' },
  investments: { order: 6, code: '6', label: 'Investimentos e Patrimonio', tone: 'capital' },
  distribution: { order: 7, code: '7', label: 'Distribuicao de Resultados', tone: 'capital' },
  unclassified: { order: 8, code: '8', label: 'Sem Classificacao Contabil', tone: 'attention' },
};

const PERIODICITY_OPTIONS = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

const SCENARIO_OPTIONS = [
  { value: 'realized', label: 'Realizado' },
  { value: 'forecast', label: 'Previsto' },
  { value: 'projected', label: 'Projetado' },
  { value: 'consolidated', label: 'Consolidado' },
];

const DISPLAY_OPTIONS = [
  { value: 'income_expense', label: 'Receitas/Despesas' },
  { value: 'result', label: 'Resultado' },
  { value: 'balances', label: 'Saldos' },
];

const PERIODICITY_VALUES = PERIODICITY_OPTIONS.map((option) => option.value);
const SCENARIO_VALUES = SCENARIO_OPTIONS.map((option) => option.value);
const DISPLAY_VALUES = DISPLAY_OPTIONS.map((option) => option.value);

const MAIN_SECTIONS = {
  income: { key: 'income', code: '1', label: 'Receitas', tone: 'positive' },
  expense: { key: 'expense', code: '2', label: 'Despesas', tone: 'negative' },
  result: { key: 'result', code: '3', label: 'Resultado', tone: 'result' },
  balance: { key: 'balance', code: '4', label: 'Saldos', tone: 'balance' },
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value) {
  return String(value || '').split('T')[0];
}

function parseLocalDate(value) {
  const date = dateOnly(value);
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function maxDate(a, b) {
  return a > b ? a : b;
}

function minDate(a, b) {
  return a < b ? a : b;
}

function getRowDate(row = {}, accountingMode = 'realized') {
  if (accountingMode === 'accrual') {
    return dateOnly(row.competency_date || row.due_date || row.transaction_date || row.created_at);
  }
  return dateOnly(row.transaction_date || row.paid_at || row.received_at || row.payment_date || row.created_at);
}

function isRealizedRow(row = {}) {
  return ['paid', 'received', 'processed', 'pago', 'recebido', 'quitado'].includes(String(row.status || '').toLowerCase())
    || row.is_reconciled === true;
}

function isCanceledRow(row = {}) {
  return ['canceled', 'cancelado', 'cancelada', 'deleted', 'excluido', 'excluida'].includes(String(row.status || '').toLowerCase());
}

function isReversedRow(row = {}) {
  return ['reversed', 'estornado', 'estornada', 'voided'].includes(String(row.status || '').toLowerCase())
    || normalizeText(row.movement_type).includes('estorno')
    || normalizeText(row.type).includes('estorno');
}

function isPartialRow(row = {}) {
  return ['partial', 'parcial', 'partially_paid', 'parcialmente_pago', 'partially_received'].includes(String(row.status || '').toLowerCase());
}

function isForecastRow(row = {}) {
  return ['open', 'opened', 'scheduled', 'pending', 'pendente', 'aberto', 'em_aberto', 'overdue', 'vencido'].includes(String(row.status || '').toLowerCase())
    || isPartialRow(row);
}

function isTransferRow(row = {}) {
  const text = normalizeText([
    row.type,
    row.transaction_type,
    row.movement_type,
    row.category,
    row.category_name,
    row.description,
    row.origin_module,
  ].filter(Boolean).join(' '));
  return /transfer|transferencia/.test(text);
}

function isCashDrawerSettledPayable(row = {}) {
  return Boolean(
    row?.metadata?.drawer_movement_id
      || row?.metadata?.origem === 'Caixa Diario'
      || String(row?.notes || '').includes('Movimento do caixa:')
      || String(row?.description || '').toLowerCase().includes('despesa manual do caixa'),
  );
}

function getMonthKey(date) {
  if (!date) return '';
  return date.slice(0, 7);
}

function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!year || !month) return monthKey;
  const label = monthFormatter.format(new Date(year, month - 1, 1)).replace('.', '');
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;
}

function formatDayMonth(date) {
  const parsed = parseLocalDate(date);
  if (!parsed) return date;
  return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function formatFullDate(date) {
  const parsed = parseLocalDate(date);
  if (!parsed) return date;
  return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
}

function formatShortMonth(date) {
  const parsed = parseLocalDate(date);
  if (!parsed) return '';
  const label = monthFormatter.format(parsed).replace('.', '');
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;
}

function formatFullMonthYear(date) {
  const parsed = parseLocalDate(date);
  if (!parsed) return date;
  const label = fullMonthFormatter.format(parsed);
  const month = label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;
  return `${month}/${parsed.getFullYear()}`;
}

function getInternalPeriodNode(movement = {}, periodicity = 'monthly') {
  const date = movement.periodDate;
  if (periodicity === 'daily') {
    return {
      label: formatFullDate(date),
      meta: WEEKDAY_LABELS[parseLocalDate(date)?.getDay() || 0],
      sortKey: date,
    };
  }
  if (periodicity === 'yearly') {
    const monthKey = date ? date.slice(0, 7) : '';
    return {
      label: formatFullMonthYear(date),
      meta: 'Mes',
      sortKey: monthKey,
    };
  }
  return {
    label: formatFullDate(date),
    meta: WEEKDAY_LABELS[parseLocalDate(date)?.getDay() || 0],
    sortKey: date,
  };
}

function formatPeriodLabel(period, periodicity, hasMultipleYears = false) {
  if (!period) return '';
  if (periodicity === 'daily') return formatDayMonth(period.start);
  if (periodicity === 'weekly') {
    const start = parseLocalDate(period.start);
    const end = parseLocalDate(period.end);
    if (!start || !end) return period.key;
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const startDay = String(start.getDate()).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');
    const endLabel = `${endDay} ${formatShortMonth(period.end)}`;
    return sameMonth ? `${startDay} a ${endLabel}` : `${startDay} ${formatShortMonth(period.start)} a ${endLabel}`;
  }
  if (periodicity === 'monthly') {
    const label = formatMonthLabel(period.key);
    return hasMultipleYears ? `${label}/${period.key.slice(0, 4)}` : label;
  }
  return period.key;
}

function formatCurrency(value) {
  return currencyFormatter.format(money(value));
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanBrokenText(value) {
  if (typeof value !== 'string' || !value.includes('�')) return value;
  return value
    .replace(/FUNDA�+O/gi, 'FUNDACAO')
    .replace(/PRODU�+O/gi, 'PRODUCAO')
    .replace(/OP�+O/gi, 'OPCAO')
    .replace(/SERVI�+OS?/gi, 'SERVICOS')
    .replace(/M�DICOS?/gi, 'MEDICOS')
    .replace(/PEDI�TRICO/gi, 'PEDIATRICO')
    .replace(/S�O/gi, 'SAO')
    .replace(/N�/gi, 'Nº')
    .replace(/�+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value, fallback = 'Sem descricao') {
  const text = String(cleanBrokenText(value || fallback)).replace(/\s+/g, ' ').trim();
  return text.length > 92 ? `${text.slice(0, 89)}...` : text;
}

function isMeaningfulText(value) {
  const normalized = normalizeText(value);
  return Boolean(normalized)
    && normalized !== 'nao informado'
    && normalized !== 'sem descricao'
    && normalized !== 'contraparte nao informada'
    && normalized !== 'pagador nao informado'
    && normalized !== 'destinatario nao informado'
    && normalized !== 'fornecedor nao informado'
    && normalized !== 'profissional nao informado'
    && normalized !== 'paciente nao informado'
    && normalized !== 'convenio nao informado';
}

function firstMeaningful(...values) {
  return values.find((value) => isMeaningfulText(value)) || '';
}

function formatCategoryLabel(value) {
  const normalized = normalizeText(value);
  const labels = {
    cash_drawer: 'Caixa diario',
    'cash drawer': 'Caixa diario',
    cashdrawer: 'Caixa diario',
    drawer: 'Caixa diario',
    caixa_diario: 'Caixa diario',
    'caixa diario': 'Caixa diario',
    financial: 'Despesas financeiras e bancarias',
    operational: 'Despesas operacionais',
    administrative: 'Despesas administrativas',
    medical_service: 'Receitas de servicos medicos',
    revenue_deduction: 'Deducoes da receita',
    card_fee: 'Taxas de cartao',
    general: 'Lancamentos gerais',
  };

  if (labels[normalized]) return labels[normalized];
  return String(cleanBrokenText(value || 'Nao classificado no plano de contas'))
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatSourceLabel(value) {
  const normalized = normalizeText(value).replace(/[\s-]+/g, '_');
  const labels = {
    cash_drawer: 'Caixa diario',
    cash_drawers: 'Caixa diario',
    drawer_movement: 'Movimento do caixa diario',
    drawer_movements: 'Movimento do caixa diario',
    accounts_receivable: 'Contas a receber',
    contas_receber: 'Contas a receber',
    ar_invoices: 'Contas a receber',
    accounts_payable: 'Contas a pagar',
    contas_pagar: 'Contas a pagar',
    ap_bills: 'Contas a pagar',
    financial_transactions: 'Lancamentos financeiros',
  };

  if (labels[normalized]) return labels[normalized];
  return formatCategoryLabel(value);
}

function isMissingCounterpartyName(value) {
  const normalized = normalizeText(value);
  return !normalized
    || normalized === 'contraparte nao informada'
    || normalized === 'pagador nao informado'
    || normalized === 'destinatario nao informado'
    || normalized === 'nao informado'
    || normalized === 'sem contraparte';
}

function getTransactionType(row = {}) {
  const type = String(row.type || '').toLowerCase();
  const transactionType = String(row.transaction_type || '').toUpperCase();
  if (type === 'revenue' || type === 'income' || transactionType === 'INCOME') return 'revenue';
  if (type === 'deduction' || transactionType === 'ADJUSTMENT') return 'deduction';
  if (['expense', 'cost', 'fee'].includes(type) || transactionType === 'EXPENSE' || transactionType === 'FEE') return 'expense';
  return type || 'other';
}

function getSignedAmount(row = {}) {
  const amount = money(row.amount);
  return getTransactionType(row) === 'revenue' ? amount : -amount;
}

function makeEmptyValues(months) {
  return months.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, { total: 0 });
}

function addValue(row, month, value) {
  if (!month || !Object.prototype.hasOwnProperty.call(row.values, month)) return;
  row.values[month] += value;
  row.values.total += value;
}

function getOpeningBalance(consolidation = {}) {
  return money(
    consolidation.opening_balance
      ?? consolidation.initial_balance
      ?? consolidation.saldo_inicial
      ?? consolidation.beginning_balance
      ?? 0,
  );
}

function getReceivableTotal(row = {}) {
  const gross = money(row.net_value ?? row.gross_amount ?? row.amount ?? row.service_value ?? row.total ?? row.value ?? row.valor);
  const discount = money(row.discount_value ?? row.descontos);
  return Math.max(0, gross - discount);
}

function getReceivablePaid(row = {}) {
  return money(row.received_value ?? row.paid_total ?? row.paid_amount ?? (isRealizedRow(row) ? getReceivableTotal(row) : 0));
}

function getReceivablePending(row = {}, total = getReceivableTotal(row), paid = getReceivablePaid(row)) {
  if (isCanceledRow(row) || isReversedRow(row)) return 0;
  if (row.balance_amount !== undefined && row.balance_amount !== null) return Math.max(0, money(row.balance_amount));
  return Math.max(0, total - paid);
}

function getPayableTotal(row = {}) {
  return money(row.net_amount ?? row.amount ?? row.value ?? row.valor ?? row.total ?? row.balance_amount);
}

function getPayablePaid(row = {}) {
  const explicitPaid = money(row.paid_amount ?? row.paid_value ?? row.payment_amount);
  if (explicitPaid > 0) return explicitPaid;
  return (isRealizedRow(row) || isCashDrawerSettledPayable(row)) ? getPayableTotal(row) : 0;
}

function getPayablePending(row = {}, total = getPayableTotal(row), paid = getPayablePaid(row)) {
  if (isCanceledRow(row) || isReversedRow(row)) return 0;
  if (isCashDrawerSettledPayable(row)) return 0;
  if (row.balance_amount !== undefined && row.balance_amount !== null) return Math.max(0, money(row.balance_amount));
  return Math.max(0, total - paid);
}

function getReceivableEffectiveDate(row = {}) {
  return dateOnly(row.received_date || row.received_at || row.payment_date || row.paid_at || row.transaction_date || row.created_at);
}

function getReceivableDueDate(row = {}) {
  return dateOnly(row.due_date || row.vencimento || row.data_vencimento || row.invoice_date || row.created_at);
}

function getPayableEffectiveDate(row = {}) {
  return dateOnly(row.paid_date || row.paid_at || row.payment_date || row.transaction_date || (isCashDrawerSettledPayable(row) ? row.due_date : null) || row.created_at);
}

function getPayableDueDate(row = {}) {
  return dateOnly(row.due_date || row.vencimento || row.data_vencimento || row.issue_date || row.created_at);
}

function getTransactionEffectiveDate(row = {}) {
  return dateOnly(row.transaction_date || row.paid_at || row.received_at || row.payment_date || row.created_at);
}

function getTransactionForecastDate(row = {}) {
  return dateOnly(row.due_date || row.scheduled_date || row.competency_date || row.transaction_date || row.created_at);
}

function getFinancialAccountName(row = {}) {
  const directName = firstMeaningful(
    row.financial_account_name,
    row.account_name,
    row.bank_account_name,
    row.cash_drawer_name,
    row.drawer_name,
  );

  if (directName) return directName;

  const text = normalizeText([
    row.origin_module,
    row.source,
    row.source_table,
    row.category,
    row.category_name,
  ].filter(Boolean).join(' '));

  if (/cash drawer|cash_drawer|cashdrawer|caixa diario|drawer/.test(text)) {
    return 'Caixa diario';
  }

  return '';
}

function getClinicName(row = {}) {
  return firstMeaningful(row.clinic_name, row.filial_name, row.branch_name, row.company_name, row.empresa_name);
}

function getRelatedEntity(row = {}, type = 'income') {
  if (type === 'income') {
    return firstMeaningful(row.professional_name, row.profissional_name, row.doctor_name, row.patient_name, row.payer_name, row.counterparty_name);
  }
  return firstMeaningful(row.vendor_name, row.supplier_name, row.fornecedor_name, row.recipient_name, row.counterparty_name, row.payee_name);
}

function getMovementStatusLabel(movement = {}) {
  if (movement.reversed) return 'Estornado';
  if (movement.canceled) return 'Cancelado';
  if (movement.partial) return 'Parcial';
  if (movement.overdue) return 'Vencido';
  if (movement.scenario === 'realized') return movement.reconciled ? 'Realizado conciliado' : 'Realizado';
  return 'Previsto';
}

function getServiceGroupName(row = {}, serviceName = '') {
  const appointment = Array.isArray(row.appointments) ? row.appointments[0] : row.appointments;
  const explicitGroup = firstMeaningful(
    row.service_group_name,
    row.service_category_name,
    row.procedure_group_name,
    row.procedure_category_name,
    row.category_group_name,
    row.metadata?.service_group_name,
    row.metadata?.service_category_name,
    row.services?.group_name,
    row.services?.category_name,
    appointment?.services?.group_name,
    appointment?.services?.category_name,
  );
  if (explicitGroup) return explicitGroup;

  const text = normalizeText([serviceName, row.service_name, row.procedure_name, row.service_description, row.description].filter(Boolean).join(' '));
  if (/cirurg/.test(text)) return 'Cirurgias';
  if (/exame|laborator|imagem|ultrassom|ultra som|raio|tomografia|ressonancia|eletro|ecg/.test(text)) return 'Exames';
  if (/proced|sessao|terapia|aplicacao|infiltracao|curativo/.test(text)) return 'Procedimentos';
  if (/consulta|retorno|atendimento/.test(text)) return 'Consultas';
  return '';
}

function buildMovementDescription(row = {}, fallback = 'Lancamento financeiro') {
  return compactText(firstMeaningful(row.description, row.flow_detail_name, row.service_name, row.category_name, row.document_number, fallback), fallback);
}

function createCashFlowMovement(base) {
  return {
    id: base.id,
    sourceId: base.sourceId || base.id,
    sourceType: base.sourceType || 'financial_transactions',
    type: base.type,
    scenario: base.scenario,
    amount: Math.abs(money(base.amount)),
    signedAmount: money(base.signedAmount ?? base.amount),
    effectiveDate: dateOnly(base.effectiveDate),
    dueDate: dateOnly(base.dueDate),
    periodDate: dateOnly(base.periodDate || (base.scenario === 'realized' ? base.effectiveDate : base.dueDate)),
    status: base.status || '',
    canceled: Boolean(base.canceled),
    reversed: Boolean(base.reversed),
    partial: Boolean(base.partial),
    overdue: Boolean(base.overdue),
    reconciled: Boolean(base.reconciled),
    chartAccountId: base.chartAccountId || null,
    chartAccountName: base.chartAccountName || '',
    categoryId: base.categoryId || null,
    categoryName: base.categoryName || '',
    financialAccountId: base.financialAccountId || null,
    financialAccountName: base.financialAccountName || '',
    clinicId: base.clinicId || null,
    clinicName: base.clinicName || '',
    counterpartyName: base.counterpartyName || '',
    professionalName: base.professionalName || '',
    serviceGroupName: base.serviceGroupName || '',
    serviceName: base.serviceName || '',
    patientName: base.patientName || '',
    payerName: base.payerName || '',
    supplierName: base.supplierName || '',
    description: base.description || '',
    documentNumber: base.documentNumber || '',
    paymentMethod: base.paymentMethod || '',
    originModule: base.originModule || base.sourceType || '',
    originId: base.originId || base.sourceId || '',
    raw: base.raw || {},
  };
}

function normalizeReceivableMovements(row = {}) {
  if (isCanceledRow(row) || isReversedRow(row)) return [];
  const total = getReceivableTotal(row);
  const realized = Math.min(total, getReceivablePaid(row));
  const pending = getReceivablePending(row, total, realized);
  const effectiveDate = getReceivableEffectiveDate(row);
  const dueDate = getReceivableDueDate(row);
  const common = {
    sourceId: row.id,
    sourceType: 'accounts_receivable',
    type: 'income',
    status: row.status,
    chartAccountId: row.chart_account_id || row.plano_contas_id || row.category_id || null,
    chartAccountName: row.chart_account_name || row.plano_contas_name || row.category_name || '',
    categoryId: row.category_id || row.chart_account_id || row.plano_contas_id || null,
    categoryName: row.category_name || row.chart_account_name || row.plano_contas_name || row.service_name || 'Receitas',
    financialAccountId: row.financial_account_id || row.account_id || row.cash_drawer_id || row.drawer_id || null,
    financialAccountName: getFinancialAccountName(row),
    clinicId: row.clinic_id,
    clinicName: getClinicName(row),
    counterpartyName: firstMeaningful(row.payer_name, row.patient_name, row.customer_name, row.client_name),
    professionalName: firstMeaningful(row.professional_name, row.profissional_name, row.doctor_name),
    serviceGroupName: getServiceGroupName(row, firstMeaningful(row.service_name, row.procedure_name, row.service_description, row.procedimento_name)),
    serviceName: firstMeaningful(row.service_name, row.procedure_name, row.service_description, row.procedimento_name),
    patientName: firstMeaningful(row.patient_name, row.paciente_name, row.customer_name, row.client_name),
    payerName: firstMeaningful(row.payer_name, row.convenio_name, row.company_name, row.patient_name),
    description: buildMovementDescription(row, 'Conta a receber'),
    documentNumber: row.document_number || row.invoice_number || row.numero_documento || row.guide_number || '',
    paymentMethod: row.payment_method || row.received_payment_method || row.forma_pagamento || '',
    originModule: 'accounts_receivable',
    originId: row.id,
    partial: isPartialRow(row) || (realized > 0 && pending > 0),
    reconciled: isRealizedRow(row),
    raw: row,
  };
  const movements = [];
  if (realized > 0 && effectiveDate) {
    movements.push(createCashFlowMovement({
      ...common,
      id: `ar-${row.id}-realized`,
      scenario: 'realized',
      amount: realized,
      effectiveDate,
      dueDate,
      periodDate: effectiveDate,
    }));
  }
  if (pending > 0 && dueDate) {
    movements.push(createCashFlowMovement({
      ...common,
      id: `ar-${row.id}-forecast`,
      scenario: 'forecast',
      amount: pending,
      effectiveDate,
      dueDate,
      periodDate: dueDate,
      overdue: dueDate < dateOnly(new Date().toISOString()) && !isRealizedRow(row),
    }));
  }
  return movements;
}

function normalizePayableMovements(row = {}) {
  if (isCanceledRow(row) || isReversedRow(row)) return [];
  const cashDrawerSettled = isCashDrawerSettledPayable(row);
  const total = getPayableTotal(row);
  const realized = Math.min(total, getPayablePaid(row));
  const pending = getPayablePending(row, total, realized);
  const effectiveDate = getPayableEffectiveDate(row);
  const dueDate = getPayableDueDate(row);
  const common = {
    sourceId: row.id,
    sourceType: 'accounts_payable',
    type: 'expense',
    status: row.status,
    chartAccountId: row.chart_account_id || row.plano_contas_id || row.category_id || null,
    chartAccountName: row.chart_account_name || row.plano_contas_name || row.category_name || '',
    categoryId: row.category_id || row.chart_account_id || row.plano_contas_id || null,
    categoryName: row.category_name || row.chart_account_name || row.plano_contas_name || row.description || 'Despesas',
    financialAccountId: row.financial_account_id || row.account_id || row.bank_account_id || null,
    financialAccountName: getFinancialAccountName(row),
    clinicId: row.clinic_id,
    clinicName: getClinicName(row),
    counterpartyName: firstMeaningful(row.vendor_name, row.supplier_name, row.fornecedor_name, row.recipient_name, row.payee_name),
    supplierName: firstMeaningful(row.vendor_name, row.supplier_name, row.fornecedor_name, row.recipient_name, row.payee_name),
    description: buildMovementDescription(row, 'Conta a pagar'),
    documentNumber: row.document_number || row.invoice_number || row.nf_number || row.numero_documento || '',
    paymentMethod: row.payment_method || row.forma_pagamento || '',
    originModule: 'accounts_payable',
    originId: row.id,
    partial: isPartialRow(row) || (realized > 0 && pending > 0),
    reconciled: isRealizedRow(row) || cashDrawerSettled,
    raw: row,
  };
  const movements = [];
  if (realized > 0 && effectiveDate) {
    movements.push(createCashFlowMovement({
      ...common,
      id: `ap-${row.id}-realized`,
      scenario: 'realized',
      amount: realized,
      effectiveDate,
      dueDate,
      periodDate: effectiveDate,
    }));
  }
  if (pending > 0 && dueDate) {
    movements.push(createCashFlowMovement({
      ...common,
      id: `ap-${row.id}-forecast`,
      scenario: 'forecast',
      amount: pending,
      effectiveDate,
      dueDate,
      periodDate: dueDate,
      overdue: dueDate < dateOnly(new Date().toISOString()) && !isRealizedRow(row) && !cashDrawerSettled,
    }));
  }
  return movements;
}

function normalizeTransactionMovement(row = {}) {
  if (isCanceledRow(row)) return [];
  const origin = normalizeText(row.origin_module);
  if (/accounts_receivable|accounts_payable|contas_receber|contas_pagar|ar_invoices|ap_bills/.test(origin)) return [];
  const amount = Math.abs(money(row.amount));
  if (amount === 0) return [];
  const transactionType = getTransactionType(row);
  const type = isTransferRow(row) ? 'transfer' : transactionType === 'revenue' ? 'income' : transactionType === 'expense' ? 'expense' : 'expense';
  const realized = isRealizedRow(row) || normalizeText(row.movement_type) === 'realized';
  const effectiveDate = getTransactionEffectiveDate(row);
  const dueDate = getTransactionForecastDate(row);
  const isOutflowTransfer = type === 'transfer' && (transactionType === 'expense' || money(row.amount) < 0 || /saida|origem|debit/.test(normalizeText(row.movement_type)));
  const signedAmount = type === 'transfer'
    ? (isOutflowTransfer ? -amount : amount)
    : type === 'expense' ? -amount : amount;
  return [createCashFlowMovement({
    id: `ft-${row.id}`,
    sourceId: row.origin_id || row.id,
    sourceType: row.origin_module || 'financial_transactions',
    type,
    scenario: realized ? 'realized' : 'forecast',
    amount,
    signedAmount,
    effectiveDate,
    dueDate,
    periodDate: realized ? effectiveDate : dueDate,
    status: row.status,
    reversed: isReversedRow(row),
    chartAccountId: row.chart_account_id || row.plano_contas_id || row.category_id || null,
    chartAccountName: row.chart_account_name || row.plano_contas_name || row.category_name || '',
    categoryId: row.category_id || row.chart_account_id || row.plano_contas_id || null,
    categoryName: row.category_name || row.chart_account_name || row.plano_contas_name || row.category || '',
    financialAccountId: row.financial_account_id || row.account_id || row.cash_drawer_id || row.drawer_id || null,
    financialAccountName: getFinancialAccountName(row),
    clinicId: row.clinic_id,
    clinicName: getClinicName(row),
    counterpartyName: firstMeaningful(row.counterparty_name, row.payer_name, row.vendor_name, row.recipient_name, row.patient_name),
    professionalName: firstMeaningful(row.professional_name, row.profissional_name, row.doctor_name),
    serviceGroupName: getServiceGroupName(row, firstMeaningful(row.service_name, row.procedure_name, row.service_description)),
    serviceName: firstMeaningful(row.service_name, row.procedure_name, row.service_description),
    patientName: firstMeaningful(row.patient_name, row.paciente_name),
    payerName: firstMeaningful(row.payer_name, row.counterparty_name),
    supplierName: firstMeaningful(row.vendor_name, row.supplier_name, row.recipient_name),
    description: buildMovementDescription(row, 'Lancamento financeiro'),
    documentNumber: row.document_number || row.reference_document || '',
    paymentMethod: row.payment_method || row.forma_pagamento || '',
    originModule: row.origin_module || 'financial_transactions',
    originId: row.origin_id || row.id,
    reconciled: row.is_reconciled === true,
    raw: row,
  })];
}

function normalizeCashFlowMovements(consolidation = {}) {
  const movements = [
    ...(consolidation.receivables || []).flatMap(normalizeReceivableMovements),
    ...(consolidation.payables || []).flatMap(normalizePayableMovements),
    ...(consolidation.transactions || []).flatMap(normalizeTransactionMovement),
  ].filter((movement) => movement.periodDate && movement.amount > 0 && !movement.canceled);

  const seen = new Set();
  return movements.filter((movement) => {
    const key = `${movement.sourceType}:${movement.sourceId}:${movement.type}:${movement.scenario}:${movement.amount}:${movement.periodDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createPeriodColumns(consolidation = {}, movements = [], periodicity = 'monthly') {
  const dates = movements.map((movement) => movement.periodDate).filter(Boolean).sort();
  const startText = consolidation?.period?.startDate || dates[0];
  const endText = consolidation?.period?.endDate || dates[dates.length - 1] || startText;
  const start = parseLocalDate(startText);
  const end = parseLocalDate(endText);
  if (!start || !end) return [];

  if (periodicity === 'daily') {
    const periods = [];
    for (let current = new Date(start); current <= end; current = addDays(current, 1)) {
      const key = toIsoDate(current);
      periods.push({ key, start: key, end: key });
    }
    return periods;
  }

  if (periodicity === 'weekly') {
    const periods = [];
    let weekStart = startOfWeekMonday(start);
    while (weekStart <= end) {
      const rangeStart = maxDate(weekStart, start);
      const rangeEnd = minDate(addDays(weekStart, 6), end);
      periods.push({ key: `${toIsoDate(rangeStart)}:${toIsoDate(rangeEnd)}`, start: toIsoDate(rangeStart), end: toIsoDate(rangeEnd) });
      weekStart = addDays(weekStart, 7);
    }
    return periods;
  }

  if (periodicity === 'yearly') {
    const periods = [];
    for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
      periods.push({ key: String(year), start: `${year}-01-01`, end: `${year}-12-31` });
    }
    return periods;
  }

  const periods = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= last) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    periods.push({ key, start: `${key}-01`, end: toIsoDate(new Date(year, current.getMonth() + 1, 0)) });
    current = new Date(year, current.getMonth() + 1, 1);
  }
  return periods;
}

function findPeriodKey(date, periods = []) {
  const value = dateOnly(date);
  const period = periods.find((item) => value >= item.start && value <= item.end);
  return period?.key || '';
}

function createReportRow(key, label, level, months, options = {}) {
  return {
    key,
    label,
    level,
    parentKey: options.parentKey || null,
    groupKey: options.groupKey || null,
    nodeKind: options.nodeKind || 'detail',
    hasChildren: options.hasChildren || false,
    values: makeEmptyValues(months),
    openingBalance: money(options.openingBalance),
    tone: options.tone || 'default',
    meta: options.meta || '',
    actionPath: options.actionPath || '',
    isGroup: options.isGroup || false,
    isSubtotal: options.isSubtotal || false,
    isBalanceStock: options.isBalanceStock || false,
    statusLabel: options.statusLabel || '',
    warning: options.warning || '',
    source: options.source || null,
    sortKey: options.sortKey || '',
  };
}

function getSourceEditPath(row = {}, returnTo = '') {
  const origin = normalizeText(row.origin_module);
  const id = row.origin_id || row.id;
  if (!id) return '';
  const params = new URLSearchParams({ from: 'fluxo-caixa' });
  if (returnTo) params.set('returnTo', returnTo);

  if (origin.includes('accounts_payable') || origin.includes('contas_pagar') || origin.includes('ap_bills')) {
    return `/clinica/financeiro/contas-pagar/${id}/editar?${params.toString()}`;
  }

  if (origin.includes('accounts_receivable') || origin.includes('contas_receber') || origin.includes('ar_invoices')) {
    return `/clinica/financeiro/receber/${id}/editar?${params.toString()}`;
  }

  return '';
}

function buildMonths(consolidation, fallbackRows = [], accountingMode = 'realized') {
  const periodStart = consolidation?.period?.startDate;
  const periodEnd = consolidation?.period?.endDate;
  if (periodStart && periodEnd) {
    const months = [];
    const current = new Date(`${periodStart.slice(0, 7)}-01T00:00:00`);
    const end = new Date(`${periodEnd.slice(0, 7)}-01T00:00:00`);
    while (current <= end) {
      months.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }

  return Array.from(new Set(fallbackRows.map((row) => getMonthKey(getRowDate(row, accountingMode))).filter(Boolean))).sort();
}

function buildAccountIndex(accounts = []) {
  return new Map(accounts.map((account) => [String(account.id), account]));
}

function normalizeAccount(account = {}) {
  const rawType = String(account.type || account.account_type || '').toUpperCase();
  const typeMap = {
    REVENUE: 'RECEITA',
    INCOME: 'RECEITA',
    ENTRADA: 'RECEITA',
    EXPENSE: 'DESPESA',
    DESPESA: 'DESPESA',
    COST: 'CUSTO',
    CUSTO: 'CUSTO',
    DEDUCTION: 'DEDUCAO',
    DEDUCAO: 'DEDUCAO',
    INVESTMENT: 'INVESTIMENTO',
    INVESTIMENTO: 'INVESTIMENTO',
  };

  return {
    ...account,
    code: account.code || account.account_code || account.codigo || '',
    name: account.name || account.account_name || account.nome || 'Conta sem nome',
    type: typeMap[rawType] || rawType,
    level: account.level || account.nivel || 1,
    parentName: account.parentName || account.parent_name || '',
  };
}

function getPlanId(row = {}) {
  return row.chart_account_id || row.plano_contas_id || row.category_id || null;
}

function getPlanAccount(row = {}, accountIndex) {
  const id = getPlanId(row);
  const account = id ? accountIndex.get(String(id)) : null;

  if (account) {
    const normalized = normalizeAccount(account);
    return {
      id: normalized.id,
      code: normalized.code,
      name: normalized.name,
      type: normalized.type,
      level: normalized.level,
      parentName: normalized.parentName,
      classified: true,
    };
  }

  const name = row.chart_account_name || row.plano_contas_name || row.category_name || row.category;
  return {
    id: id || 'unclassified',
    code: '',
    name: name ? formatCategoryLabel(name) : 'Nao classificado no plano de contas',
    type: '',
    level: 1,
    parentName: '',
    classified: Boolean(id && name),
  };
}

function getCounterparty(row = {}) {
  const type = getTransactionType(row);
  const isReceivable = String(row.origin_module || '').toLowerCase().includes('receivable') || type === 'revenue';
  const role = row.counterparty_role || (isReceivable ? 'Pagador' : 'Destinatario');
  const sourceLabel = formatSourceLabel(row.origin_module || row.source || row.source_table || row.category || row.category_name);
  const candidates = [
    row.counterparty_name,
    row.payer_name,
    row.recipient_name,
    row.vendor_name,
    row.supplier_name,
    row.provider_name,
    row.patient_name,
    row.customer_name,
    row.client_name,
    row.professional_name,
    row.description,
    row.notes,
    sourceLabel,
  ];
  const name = candidates.find((candidate) => !isMissingCounterpartyName(candidate))
    || (isReceivable ? 'Pagador nao informado' : 'Destinatario nao informado');

  return { role, name: compactText(name, role) };
}

function getMovementLabel(row = {}) {
  const parts = [
    formatSourceLabel(row.flow_detail_name || row.category_name || row.category || row.origin_module || row.source || 'Movimento'),
    row.document_number ? `Doc. ${cleanBrokenText(row.document_number)}` : '',
    row.patient_name ? `Paciente: ${cleanBrokenText(row.patient_name)}` : '',
    row.service_name ? `Servico: ${cleanBrokenText(row.service_name)}` : '',
  ].filter(Boolean);

  return compactText(parts.join(' | '), cleanBrokenText(row.description || 'Movimento financeiro'));
}

function getPayerTypeLabel(row = {}) {
  const type = normalizeText(row.payer_type || row.tipo_pagador || row.payment_context || row.convenio_name || row.payer_name);
  if (/convenio|plano|insurance/.test(type)) {
    return compactText(row.convenio_name || row.payer_name || 'Convenio nao informado', 'Convenio');
  }
  if (/empresa|company/.test(type)) {
    return compactText(row.company_name || row.empresa_name || row.payer_name || 'Empresa nao informada', 'Empresa');
  }
  return 'Particular';
}

function getProfessionalLabel(row = {}) {
  return compactText(
    row.professional_name
      || row.profissional_name
      || row.doctor_name
      || row.medico_name
      || row.metadata?.professional_name
      || 'Profissional nao informado',
    'Profissional nao informado',
  );
}

function getServiceLabel(row = {}) {
  const description = String(row.description || '').replace(/^Recebimento\s+(do\s+)?atendimento\s*[-:]?\s*/i, '').trim();
  return compactText(
    row.service_name
      || row.procedure_name
      || row.service_description
      || row.procedimento_name
      || row.metadata?.service_name
      || description
      || 'Servico nao informado',
    'Servico nao informado',
  );
}

function getPatientLabel(row = {}) {
  return compactText(
    row.patient_name
      || row.paciente_name
      || row.customer_name
      || row.client_name
      || row.payer_name
      || row.counterparty_name
      || 'Paciente nao informado',
    'Paciente nao informado',
  );
}

function isCashDrawerRevenue(row = {}, account = {}) {
  const text = normalizeText([
    row.category,
    row.category_name,
    row.flow_detail_name,
    row.origin_module,
    row.source,
    row.source_table,
    account?.name,
  ].filter(Boolean).join(' '));

  return getTransactionType(row) === 'revenue' && /cash drawer|cash_drawer|cashdrawer|caixa diario|drawer/.test(text);
}

function getOperationalHierarchy(row = {}, account = {}, counterparty, detailLabel, sourceEditPath = '') {
  if (isCashDrawerRevenue(row, account)) {
    return [
      { keyPart: 'particular', label: getPayerTypeLabel(row), meta: 'Tipo de pagador', tone: 'counterparty' },
      { keyPart: `professional:${normalizeText(getProfessionalLabel(row))}`, label: getProfessionalLabel(row), meta: 'Profissional', tone: 'counterparty' },
      { keyPart: `service:${normalizeText(getServiceLabel(row))}`, label: getServiceLabel(row), meta: 'Servico', tone: 'counterparty' },
      { keyPart: `patient:${normalizeText(getPatientLabel(row))}`, label: getPatientLabel(row), meta: 'Paciente', tone: 'detail', actionPath: sourceEditPath },
    ];
  }

  return [
    { keyPart: `party:${normalizeText(counterparty.name).slice(0, 80) || 'sem-contraparte'}`, label: counterparty.name, meta: counterparty.role, tone: 'counterparty' },
    { keyPart: `detail:${normalizeText(detailLabel).slice(0, 90) || 'sem-descricao'}`, label: detailLabel, meta: row.origin_module || '', tone: 'detail', actionPath: sourceEditPath },
  ];
}

function getOrCreateChildNode(children, key, label, level, months, options = {}) {
  if (!children.has(key)) {
    children.set(key, {
      row: createReportRow(key, label, level, months, {
        tone: options.tone || 'counterparty',
        meta: options.meta || '',
        parentKey: options.parentKey,
        groupKey: options.groupKey,
        accountKey: options.accountKey,
        hasChildren: options.hasChildren !== false,
        nodeKind: options.nodeKind || 'node',
        actionPath: options.actionPath || '',
      }),
      children: new Map(),
    });
  }

  return children.get(key);
}

function flattenChildren(children) {
  return Array.from(children.values())
    .sort((a, b) => Math.abs(b.row.values.total) - Math.abs(a.row.values.total))
    .flatMap((entry) => [entry.row, ...flattenChildren(entry.children)]);
}

function collectExpandableKeys(children) {
  return Array.from(children.values()).flatMap((entry) => [
    ...(entry.children.size ? [entry.row.key] : []),
    ...collectExpandableKeys(entry.children),
  ]);
}

function chooseGroup(row, account) {
  const type = getTransactionType(row);
  const accountType = String(account?.type || '').toUpperCase();
  const text = normalizeText(cleanBrokenText(`${row.category || ''} ${row.category_name || ''} ${row.description || ''} ${row.notes || ''} ${account?.name || ''}`));

  if (accountType === 'RECEITA' || type === 'revenue') return GROUPS.revenue;
  if (accountType === 'DEDUCAO' || type === 'deduction' || /desconto|deducao|taxa de cartao|card_fee/.test(text)) return GROUPS.deductions;
  if (accountType === 'INVESTIMENTO' || accountType === 'ATIVO' || /invest|equipamento|imobilizado|obra|reforma|aplicacao/.test(text)) return GROUPS.investments;
  if (accountType === 'PATRIMONIO' || /distribuicao|lucro|dividendo|socios|resultado/.test(text)) return GROUPS.distribution;
  if (accountType === 'HONORARIO' || /salario|folha|pro labore|honorario|medico|repasse|pessoal|funcionario/.test(text)) return GROUPS.people;
  if (/tarifa|juros|multa|banco|financeir|iof|ted|pix|cartao/.test(text)) return GROUPS.financial;
  if (!account?.classified && !row.category && !row.category_name) return GROUPS.unclassified;
  return GROUPS.operational;
}

export function buildOperationalModel(consolidation, accounts = [], returnTo = '', accountingMode = 'realized', options = {}) {
  const periodicity = options.periodicity || 'monthly';
  const scenario = options.scenario || 'consolidated';
  const displayMode = options.displayMode || 'income_expense';
  const normalizedMovements = normalizeCashFlowMovements(consolidation || {});
  const periods = createPeriodColumns(consolidation, normalizedMovements, periodicity);
  const periodKeys = periods.map((period) => period.key);
  const years = new Set(periods.flatMap((period) => [period.start?.slice(0, 4), period.end?.slice(0, 4)]).filter(Boolean));
  const accountIndex = buildAccountIndex(accounts);
  const openingBalance = getOpeningBalance(consolidation);
  const includeRealized = scenario === 'realized' || scenario === 'consolidated';
  const includeForecast = scenario === 'forecast' || scenario === 'projected' || scenario === 'consolidated';
  const showIncomeExpense = displayMode === 'income_expense';
  const showResult = displayMode === 'result';
  const showBalances = displayMode === 'balances';

  const emptyPeriodValues = () => makeEmptyValues(periodKeys);
  const periodTotals = periodKeys.reduce((acc, key) => {
    acc.realizedIncome[key] = 0;
    acc.realizedExpense[key] = 0;
    acc.forecastIncome[key] = 0;
    acc.forecastExpense[key] = 0;
    acc.transferNet[key] = 0;
    return acc;
  }, {
    realizedIncome: {},
    realizedExpense: {},
    forecastIncome: {},
    forecastExpense: {},
    transferNet: {},
  });

  const sections = new Map();
  const rowByKey = new Map();
  const expandableKeys = new Set();

  function registerRow(row) {
    rowByKey.set(row.key, row);
    if (row.hasChildren) expandableKeys.add(row.key);
    return row;
  }

  function getSection(sectionDefinition) {
    const key = `section:${sectionDefinition.key}`;
    if (!sections.has(key)) {
      sections.set(key, {
        definition: sectionDefinition,
        row: registerRow(createReportRow(key, `${sectionDefinition.code}. ${sectionDefinition.label}`, 0, periodKeys, {
          tone: sectionDefinition.tone,
          isGroup: true,
          hasChildren: true,
          nodeKind: 'group',
          openingBalance: sectionDefinition.key === 'balance' ? openingBalance : 0,
        })),
        children: new Map(),
      });
    }
    return sections.get(key);
  }

  function getTreeNode(children, key, label, level, parentRow, config = {}) {
    if (!children.has(key)) {
      const row = registerRow(createReportRow(key, label, level, periodKeys, {
        tone: config.tone || 'account',
        meta: config.meta || '',
        parentKey: parentRow?.key || null,
        groupKey: config.groupKey || parentRow?.groupKey || parentRow?.key || null,
        accountKey: config.accountKey || null,
        hasChildren: config.hasChildren !== false,
        nodeKind: config.nodeKind || (level <= 2 ? 'account' : 'detail'),
        actionPath: config.actionPath || '',
        statusLabel: config.statusLabel || '',
        warning: config.warning || '',
        source: config.source || null,
        sortKey: config.sortKey || '',
      }));
      children.set(key, { row, children: new Map() });
    }
    return children.get(key);
  }

  function shouldIncludeMovement(movement) {
    if (movement.type === 'transfer') return true;
    if (movement.scenario === 'realized') return includeRealized;
    if (movement.scenario === 'forecast') return includeForecast;
    return false;
  }

  function getMovementDisplayValue(movement) {
    if (movement.type === 'expense') return movement.amount;
    if (movement.type === 'income') return movement.amount;
    return movement.signedAmount;
  }

  function addMovementToTree(movement) {
    if (!shouldIncludeMovement(movement)) return;
    const periodKey = findPeriodKey(movement.periodDate, periods);
    if (!periodKey) return;

    if (movement.type === 'income') {
      if (movement.scenario === 'realized') periodTotals.realizedIncome[periodKey] += movement.amount;
      else periodTotals.forecastIncome[periodKey] += movement.amount;
    } else if (movement.type === 'expense') {
      if (movement.scenario === 'realized') periodTotals.realizedExpense[periodKey] += movement.amount;
      else periodTotals.forecastExpense[periodKey] += movement.amount;
    } else if (movement.type === 'transfer' && movement.scenario === 'realized') {
      periodTotals.transferNet[periodKey] += movement.signedAmount;
      return;
    } else {
      return;
    }

    if (!showIncomeExpense) return;

    const sectionDefinition = movement.type === 'income' ? MAIN_SECTIONS.income : MAIN_SECTIONS.expense;
    const section = getSection(sectionDefinition);
    const account = getPlanAccount({
      chart_account_id: movement.chartAccountId,
      plano_contas_id: movement.chartAccountId,
      category_id: movement.categoryId,
      chart_account_name: movement.chartAccountName,
      plano_contas_name: movement.chartAccountName,
      category_name: movement.categoryName,
      category: movement.categoryName,
    }, accountIndex);
    const accountLabel = account.code ? `${account.code} - ${account.name}` : account.name;
    const internalPeriodNode = getInternalPeriodNode(movement, periodicity);
    const incomeDetailLevels = movement.type === 'income'
      ? [
        { label: movement.professionalName, meta: 'Profissional' },
        { label: movement.serviceGroupName, meta: 'Grupo do servico' },
        { label: movement.serviceName, meta: 'Servico' },
        { label: movement.patientName || movement.payerName || movement.counterpartyName, meta: 'Paciente' },
      ]
      : [
        { label: getRelatedEntity(movement.raw, movement.type), meta: 'Fornecedor/destinatario' },
      ];
    const subAccountLabel = firstMeaningful(movement.chartAccountName, movement.categoryName);
    const shouldShowSubAccount = isMeaningfulText(subAccountLabel)
      && !(movement.type === 'income' && normalizeText(subAccountLabel) === normalizeText(movement.serviceName));
    const path = [
      { label: internalPeriodNode.label, meta: internalPeriodNode.meta, sortKey: internalPeriodNode.sortKey },
      { label: firstMeaningful(account.parentName, sectionDefinition.label), meta: 'Grupo do plano de contas' },
      { label: accountLabel, meta: account.classified ? 'Conta do plano de contas' : 'Classificacao' },
      ...(shouldShowSubAccount ? [{ label: subAccountLabel, meta: 'Subconta/classificacao' }] : []),
      { label: movement.financialAccountName, meta: 'Conta financeira' },
      { label: movement.clinicName, meta: 'Clinica/filial' },
      ...incomeDetailLevels,
      {
        label: `${movement.description} - ${getMovementStatusLabel(movement)} - ${formatCurrency(movement.amount)}`,
        meta: [
          movement.effectiveDate ? `Efetiva: ${formatDayMonth(movement.effectiveDate)}` : '',
          movement.dueDate ? `Venc.: ${formatDayMonth(movement.dueDate)}` : '',
          movement.paymentMethod ? `Forma: ${movement.paymentMethod}` : '',
          movement.documentNumber ? `Doc.: ${movement.documentNumber}` : '',
          formatSourceLabel(movement.originModule),
        ].filter(Boolean).join(' | '),
        leaf: true,
        actionPath: getSourceEditPath({ origin_module: movement.originModule, origin_id: movement.originId, id: movement.originId }, returnTo),
      },
    ].filter((item, index, arr) => {
      if (!isMeaningfulText(item.label)) return false;
      const normalized = normalizeText(item.label);
      return arr.findIndex((candidate) => normalizeText(candidate.label) === normalized) === index;
    });

    let currentChildren = section.children;
    let parentRow = section.row;
    const createdRows = [section.row];
    path.forEach((item, index) => {
      const level = index + 1;
      const isLeaf = item.leaf || index === path.length - 1;
      const key = `${parentRow.key}:${normalizeText(item.label).slice(0, 90) || level}:${movement.id && isLeaf ? movement.id : ''}`;
      const node = getTreeNode(currentChildren, key, compactText(item.label, 'Movimento'), level, parentRow, {
        tone: isLeaf ? (movement.scenario === 'forecast' ? 'forecast' : 'detail') : 'account',
        meta: item.meta,
        groupKey: section.row.key,
        accountKey: account.id || accountLabel,
        hasChildren: !isLeaf,
        nodeKind: isLeaf ? 'detail' : 'account',
        actionPath: isLeaf ? item.actionPath : '',
        statusLabel: isLeaf ? getMovementStatusLabel(movement) : '',
        warning: movement.overdue ? 'Vencido' : '',
        source: isLeaf ? movement : null,
        sortKey: item.sortKey || (isLeaf ? `${movement.periodDate}|${movement.description}|${movement.id}` : ''),
      });
      createdRows.push(node.row);
      currentChildren = node.children;
      parentRow = node.row;
    });

    const displayValue = getMovementDisplayValue(movement);
    createdRows.forEach((row) => addValue(row, periodKey, displayValue));
  }

  normalizedMovements.forEach(addMovementToTree);

  const resultRows = [];
  const balanceRows = [];
  const finalRows = [];

  function fillValues(row, getter, totalGetter = null) {
    periodKeys.forEach((key, index) => {
      row.values[key] = getter(key, index);
    });
    row.values.total = totalGetter ? totalGetter(row) : periodKeys.reduce((sum, key) => sum + row.values[key], 0);
    return row;
  }

  const resultSection = registerRow(createReportRow('section:result', '3. Resultado', 0, periodKeys, {
    tone: 'result',
    isGroup: true,
    hasChildren: true,
    nodeKind: 'group',
  }));
  const balanceSection = registerRow(createReportRow('section:balance', '4. Saldos', 0, periodKeys, {
    tone: 'balance',
    isGroup: true,
    hasChildren: true,
    nodeKind: 'group',
    openingBalance,
  }));
  expandableKeys.add(resultSection.key);
  expandableKeys.add(balanceSection.key);

  const realizedResultRow = fillValues(createReportRow('result:realized', 'Resultado Realizado', 1, periodKeys, {
    tone: 'result', parentKey: resultSection.key, groupKey: resultSection.key, nodeKind: 'account', meta: 'Receitas realizadas - despesas realizadas',
  }), (key) => periodTotals.realizedIncome[key] - periodTotals.realizedExpense[key]);
  const forecastResultRow = fillValues(createReportRow('result:forecast', 'Resultado Previsto', 1, periodKeys, {
    tone: 'forecast', parentKey: resultSection.key, groupKey: resultSection.key, nodeKind: 'account', meta: 'Receitas previstas - despesas previstas',
  }), (key) => periodTotals.forecastIncome[key] - periodTotals.forecastExpense[key]);
  const consolidatedResultRow = fillValues(createReportRow('result:consolidated', 'Resultado Consolidado', 1, periodKeys, {
    tone: 'result', parentKey: resultSection.key, groupKey: resultSection.key, nodeKind: 'account', meta: 'Resultado realizado + resultado previsto',
  }), (key) => realizedResultRow.values[key] + forecastResultRow.values[key]);
  const variationRow = fillValues(createReportRow('result:variation', 'Variacao Realizado x Previsto', 1, periodKeys, {
    tone: 'attention', parentKey: resultSection.key, groupKey: resultSection.key, nodeKind: 'account', meta: 'Resultado realizado - previsto do periodo',
  }), (key) => realizedResultRow.values[key] - forecastResultRow.values[key]);

  [realizedResultRow, forecastResultRow, consolidatedResultRow, variationRow].forEach((row) => {
    resultRows.push(registerRow(row));
    addValue(resultSection, '', 0);
    periodKeys.forEach((key) => {
      if (row.key !== 'result:variation') resultSection.values[key] += row.key === 'result:consolidated' ? 0 : 0;
    });
  });

  const openingRow = createReportRow('balance:opening', 'Saldo inicial', 1, periodKeys, {
    tone: 'balance', parentKey: balanceSection.key, groupKey: balanceSection.key, nodeKind: 'account', openingBalance, isBalanceStock: true,
  });
  const inflowRow = fillValues(createReportRow('balance:inflows', 'Entradas do periodo', 1, periodKeys, {
    tone: 'positive', parentKey: balanceSection.key, groupKey: balanceSection.key, nodeKind: 'account',
  }), (key) => (includeRealized ? periodTotals.realizedIncome[key] : 0) + (includeForecast ? periodTotals.forecastIncome[key] : 0));
  const outflowRow = fillValues(createReportRow('balance:outflows', 'Saidas do periodo', 1, periodKeys, {
    tone: 'negative', parentKey: balanceSection.key, groupKey: balanceSection.key, nodeKind: 'account',
  }), (key) => (includeRealized ? periodTotals.realizedExpense[key] : 0) + (includeForecast ? periodTotals.forecastExpense[key] : 0));
  const realizedBalanceRow = createReportRow('balance:realized', 'Saldo realizado', 1, periodKeys, {
    tone: 'balance', parentKey: balanceSection.key, groupKey: balanceSection.key, nodeKind: 'account', openingBalance, isBalanceStock: true,
  });
  const forecastBalanceRow = createReportRow('balance:forecast', 'Saldo previsto', 1, periodKeys, {
    tone: 'forecast', parentKey: balanceSection.key, groupKey: balanceSection.key, nodeKind: 'account', isBalanceStock: true,
  });
  const projectedBalanceRow = createReportRow('balance:projected', 'Saldo projetado', 1, periodKeys, {
    tone: 'projected', parentKey: balanceSection.key, groupKey: balanceSection.key, nodeKind: 'account', openingBalance, isBalanceStock: true,
  });

  let runningOpening = openingBalance;
  let runningRealized = openingBalance;
  let runningForecast = 0;
  periodKeys.forEach((key) => {
    openingRow.values[key] = runningOpening;
    runningRealized += periodTotals.realizedIncome[key] - periodTotals.realizedExpense[key] + periodTotals.transferNet[key];
    runningForecast += periodTotals.forecastIncome[key] - periodTotals.forecastExpense[key];
    realizedBalanceRow.values[key] = runningRealized;
    forecastBalanceRow.values[key] = runningForecast;
    projectedBalanceRow.values[key] = runningRealized + runningForecast;
    runningOpening = runningRealized;
  });
  [openingRow, realizedBalanceRow, forecastBalanceRow, projectedBalanceRow].forEach((row) => {
    row.values.total = periodKeys.length ? row.values[periodKeys[periodKeys.length - 1]] : row.openingBalance;
  });
  [inflowRow, outflowRow].forEach((row) => {
    row.values.total = periodKeys.reduce((sum, key) => sum + row.values[key], 0);
  });
  [openingRow, inflowRow, outflowRow, realizedBalanceRow, forecastBalanceRow, projectedBalanceRow].forEach((row) => balanceRows.push(registerRow(row)));

  resultSection.values = consolidatedResultRow.values;
  resultSection.values.total = consolidatedResultRow.values.total;
  balanceSection.values = projectedBalanceRow.values;
  balanceSection.values.total = projectedBalanceRow.values.total;

  const flattenTree = (children) => Array.from(children.values())
    .sort((a, b) => {
      if (a.row.sortKey || b.row.sortKey) return String(a.row.sortKey || '').localeCompare(String(b.row.sortKey || ''));
      return Math.abs(b.row.values.total) - Math.abs(a.row.values.total) || a.row.label.localeCompare(b.row.label);
    })
    .flatMap((entry) => [entry.row, ...flattenTree(entry.children)]);
  const cashRows = Array.from(sections.values())
    .sort((a, b) => Number(a.definition.code) - Number(b.definition.code))
    .flatMap((section) => [section.row, ...flattenTree(section.children)]);
  const displayedRows = [
    ...(showIncomeExpense ? cashRows : []),
    ...(showResult ? [resultSection, ...resultRows] : []),
    ...(showBalances ? [balanceSection, ...balanceRows] : []),
  ];

  if (scenario === 'consolidated') {
    finalRows.push(
      createReportRow('final:realized', 'Resultado Realizado', 0, periodKeys, { tone: 'total', isSubtotal: true, nodeKind: 'total' }),
      createReportRow('final:forecast', 'Resultado Previsto', 0, periodKeys, { tone: 'total', isSubtotal: true, nodeKind: 'total' }),
      createReportRow('final:projected', 'Saldo Projetado', 0, periodKeys, { tone: 'total', isSubtotal: true, nodeKind: 'total', isBalanceStock: true, openingBalance }),
    );
    finalRows[0].values = { ...realizedResultRow.values };
    finalRows[1].values = { ...forecastResultRow.values };
    finalRows[2].values = { ...projectedBalanceRow.values };
  } else {
    const labels = {
      realized: 'Resultado Realizado do Periodo',
      forecast: 'Resultado Previsto do Periodo',
      projected: 'Saldo Projetado ao Final do Periodo',
    };
    const sourceRow = scenario === 'realized' ? realizedResultRow : scenario === 'forecast' ? forecastResultRow : projectedBalanceRow;
    const finalRow = createReportRow(`final:${scenario}`, labels[scenario] || 'Resultado do Periodo', 0, periodKeys, {
      tone: 'total', isSubtotal: true, nodeKind: 'total', isBalanceStock: scenario === 'projected', openingBalance,
    });
    finalRow.values = { ...sourceRow.values };
    finalRows.push(finalRow);
  }

  const realizedInflows = periodKeys.reduce((sum, key) => sum + periodTotals.realizedIncome[key], 0);
  const realizedOutflows = periodKeys.reduce((sum, key) => sum + periodTotals.realizedExpense[key], 0);
  const forecastInflows = periodKeys.reduce((sum, key) => sum + periodTotals.forecastIncome[key], 0);
  const forecastOutflows = periodKeys.reduce((sum, key) => sum + periodTotals.forecastExpense[key], 0);
  const classifiedAmount = normalizedMovements.reduce((sum, movement) => sum + (movement.chartAccountId ? movement.amount : 0), 0);
  const absoluteAmount = normalizedMovements.reduce((sum, movement) => sum + movement.amount, 0);
  const groupSummaries = [
    { label: 'Receitas realizadas', tone: 'positive', value: realizedInflows, absolute: realizedInflows },
    { label: 'Receitas previstas', tone: 'forecast', value: forecastInflows, absolute: forecastInflows },
    { label: 'Despesas realizadas', tone: 'negative', value: realizedOutflows, absolute: realizedOutflows },
    { label: 'Despesas previstas', tone: 'forecast', value: forecastOutflows, absolute: forecastOutflows },
  ].filter((summary) => summary.absolute > 0);

  return {
    months: periodKeys,
    periods,
    periodLabels: periods.reduce((acc, period) => ({ ...acc, [period.key]: formatPeriodLabel(period, periodicity, years.size > 1 || periodicity === 'monthly') }), {}),
    rows: [...displayedRows, ...finalRows],
    expandableKeys: Array.from(expandableKeys),
    groupKeys: displayedRows.filter((row) => row.nodeKind === 'group').map((row) => row.key),
    accountKeys: displayedRows.filter((row) => row.nodeKind === 'account').map((row) => row.key),
    parentMap: Array.from(rowByKey.values()).reduce((acc, row) => ({ ...acc, [row.key]: row.parentKey }), {}),
    totals: {
      inflows: includeRealized && includeForecast ? realizedInflows + forecastInflows : includeForecast ? forecastInflows : realizedInflows,
      outflows: includeRealized && includeForecast ? realizedOutflows + forecastOutflows : includeForecast ? forecastOutflows : realizedOutflows,
      net: (includeRealized ? realizedInflows - realizedOutflows : 0) + (includeForecast ? forecastInflows - forecastOutflows : 0),
      classifiedPercent: absoluteAmount > 0 ? (classifiedAmount / absoluteAmount) * 100 : 0,
      movements: normalizedMovements.length,
      realizedNet: realizedInflows - realizedOutflows,
      forecastNet: forecastInflows - forecastOutflows,
      projectedBalance: projectedBalanceRow.values.total,
    },
    groupSummaries,
  };
}

function rowClass(row) {
  if (row.tone === 'positive') return 'bg-emerald-50 text-emerald-900 font-bold dark:bg-emerald-950/55 dark:text-emerald-100';
  if (row.tone === 'negative') return 'bg-rose-50 text-rose-900 font-bold dark:bg-rose-950/55 dark:text-rose-100';
  if (row.tone === 'warning') return 'bg-amber-50 text-amber-900 font-bold dark:bg-amber-950/55 dark:text-amber-100';
  if (row.tone === 'forecast') return 'bg-sky-50 text-sky-900 font-semibold dark:bg-sky-950/50 dark:text-sky-100';
  if (row.tone === 'projected') return 'bg-cyan-50 text-cyan-900 font-bold dark:bg-cyan-950/50 dark:text-cyan-100';
  if (row.tone === 'balance') return 'bg-slate-50 text-slate-900 font-bold dark:bg-slate-800 dark:text-slate-100';
  if (row.tone === 'result') return 'bg-blue-50 text-blue-950 font-bold dark:bg-blue-950/55 dark:text-blue-100';
  if (row.tone === 'capital') return 'bg-violet-50 text-violet-900 font-bold dark:bg-violet-950/50 dark:text-violet-100';
  if (row.tone === 'attention') return 'bg-orange-50 text-orange-900 font-semibold dark:bg-orange-950/50 dark:text-orange-100';
  if (row.tone === 'account') return 'bg-white text-slate-800 font-semibold dark:bg-slate-900 dark:text-slate-200';
  if (row.tone === 'counterparty') return 'bg-slate-50 text-slate-800 font-semibold dark:bg-slate-900/85 dark:text-slate-300';
  if (row.tone === 'total') return 'bg-slate-100 text-slate-950 font-bold dark:bg-slate-800 dark:text-slate-50';
  return 'bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300';
}

function valueClass(value, row) {
  if (row?.tone === 'total') return value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300';
  if (row?.tone === 'negative' && value !== 0) return 'text-rose-700 dark:text-rose-300';
  if (row?.tone === 'forecast' && value !== 0) return 'text-blue-700 dark:text-blue-300';
  if (row?.tone === 'projected' && value !== 0) return value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-indigo-700 dark:text-indigo-300';
  if (row?.tone === 'balance' && value !== 0) return value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100';
  if (row?.tone === 'result' && value !== 0) return value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300';
  if (value < 0) return 'text-rose-700 dark:text-rose-300';
  if (value > 0) return 'text-emerald-700 dark:text-emerald-300';
  return 'text-slate-400 dark:text-slate-500';
}

function StatBlock({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const toneClasses = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-700/70 dark:bg-emerald-950/50 dark:text-emerald-100',
    red: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-700/70 dark:bg-rose-950/50 dark:text-rose-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-700/70 dark:bg-blue-950/50 dark:text-blue-100',
  };

  return (
    <div className={`min-h-[56px] rounded-lg border px-3 py-2 shadow-sm ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-0.5">
        <p className="text-base font-bold tracking-normal">{value}</p>
        {hint ? <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}

function ControlGroup({ label, value, options, onChange }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              value === option.value
                ? 'bg-slate-900 text-white shadow-sm dark:bg-blue-500 dark:text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OperationalCashFlowModel({ consolidation, clinicId, loading = false, accountingMode = 'realized' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const depthParam = searchParams.get('depth');
  const periodicityParam = searchParams.get('periodicity');
  const scenarioParam = searchParams.get('scenario');
  const displayParam = searchParams.get('display');
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [viewDepth, setViewDepth] = useState(['groups', 'accounts', 'details'].includes(depthParam) ? depthParam : 'accounts');
  const [tablePeriodicity, setTablePeriodicity] = useState(PERIODICITY_VALUES.includes(periodicityParam) ? periodicityParam : 'monthly');
  const [tableScenario, setTableScenario] = useState(SCENARIO_VALUES.includes(scenarioParam) ? scenarioParam : 'consolidated');
  const [tableDisplay, setTableDisplay] = useState(DISPLAY_VALUES.includes(displayParam) ? displayParam : 'income_expense');
  const [expandedRows, setExpandedRows] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    if (!clinicId) return undefined;

    setAccountsLoading(true);
    setAccountsError('');
    Promise.allSettled([
      listChartOfAccounts(clinicId, undefined, { page: 1, limit: 2000 }),
      listAccountPlans(clinicId),
    ])
      .then((results) => {
        if (!active) return;
        const chartAccounts = results[0].status === 'fulfilled' ? results[0].value?.data || [] : [];
        const accountPlans = results[1].status === 'fulfilled' ? results[1].value || [] : [];
        const merged = new Map();
        [...chartAccounts, ...accountPlans].forEach((account) => {
          if (account?.id) merged.set(String(account.id), normalizeAccount(account));
        });
        setAccounts(Array.from(merged.values()));

        const errors = results
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason?.message || String(result.reason));
        if (errors.length > 0 && merged.size === 0) {
          setAccountsError(errors.join(' | '));
        }
      })
      .catch((error) => {
        if (active) setAccountsError(error?.message || 'Nao foi possivel carregar o plano de contas.');
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clinicId]);

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.set('section', 'operational');
    params.set('depth', viewDepth);
    if (viewDepth === 'details') params.set('expand', 'all');
    else params.delete('expand');
    return `${location.pathname}?${params.toString()}${location.hash || ''}`;
  }, [location.hash, location.pathname, location.search, viewDepth]);

  const model = useMemo(() => buildOperationalModel(consolidation, accounts, returnTo, accountingMode, {
    periodicity: tablePeriodicity,
    scenario: tableScenario,
    displayMode: tableDisplay,
  }), [consolidation, accounts, returnTo, accountingMode, tablePeriodicity, tableScenario, tableDisplay]);
  const mainExpenseGroup = model.groupSummaries.find((group) => group.value < 0) || model.groupSummaries[0];
  const visibleRows = useMemo(() => model.rows.filter((row) => {
    if (row.nodeKind === 'total') return true;
    if (row.nodeKind === 'group') return true;
    if (viewDepth === 'groups') return false;
    if (viewDepth === 'accounts' && row.level > 2) return false;
    let parentKey = row.parentKey;
    while (parentKey) {
      if (!expandedRows.has(parentKey)) return false;
      parentKey = model.parentMap[parentKey];
    }
    return true;
  }), [expandedRows, model.parentMap, model.rows, viewDepth]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextDepth = params.get('depth');
    const expand = params.get('expand');
    const nextPeriodicity = params.get('periodicity');
    const nextScenario = params.get('scenario');
    const nextDisplay = params.get('display');

    if (PERIODICITY_VALUES.includes(nextPeriodicity)) setTablePeriodicity(nextPeriodicity);
    if (SCENARIO_VALUES.includes(nextScenario)) setTableScenario(nextScenario);
    if (DISPLAY_VALUES.includes(nextDisplay)) setTableDisplay(nextDisplay);

    if (nextDepth === 'groups') {
      setViewDepth('groups');
      setExpandedRows(new Set());
      return;
    }
    if (nextDepth === 'details') {
      setViewDepth('details');
      setExpandedRows(new Set(expand === 'all' ? model.expandableKeys : model.groupKeys));
      return;
    }
    setViewDepth('accounts');
    setExpandedRows(new Set(model.groupKeys));
  }, [location.search, model.expandableKeys.join('|'), model.groupKeys.join('|'), tableDisplay, tablePeriodicity, tableScenario]);

  const setDepth = (depth) => {
    setViewDepth(depth);
    if (depth === 'groups') {
      setExpandedRows(new Set());
      return;
    }
    if (depth === 'accounts') {
      setExpandedRows(new Set(model.groupKeys));
      return;
    }
    setExpandedRows(new Set(model.expandableKeys));
  };

  const toggleRow = (row) => {
    if (row.nodeKind === 'group' && viewDepth === 'groups') setViewDepth('accounts');
    if (row.nodeKind === 'account' && viewDepth !== 'details') setViewDepth('details');

    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(row.key)) next.delete(row.key);
      else next.add(row.key);
      return next;
    });
  };

  const expandAll = () => {
    setViewDepth('details');
    setExpandedRows(new Set(model.expandableKeys));
  };

  const collapseAll = () => {
    setViewDepth('groups');
    setExpandedRows(new Set());
  };

  if (loading) {
    return (
      <Card className="mb-6 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="h-72 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden border-slate-200 bg-white p-0 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white px-4 py-2.5 sm:px-5 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Painel Gerencial Operacional</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-gray-300">
            Visao executiva para socios e diretoria, estruturada por plano de contas, classificacoes gerenciais e movimentos realizados no periodo.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{model.months.length} competencia(s)</span>
          <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-blue-800 dark:border-blue-700/70 dark:bg-blue-950/50 dark:text-blue-200">{model.totals.movements} movimento(s)</span>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-800 dark:border-emerald-700/70 dark:bg-emerald-950/50 dark:text-emerald-200">Plano: {accountsLoading ? 'carregando' : `${accounts.length} conta(s)`}</span>
        </div>
      </div>
      </div>

      <div className="p-3 sm:p-4">

      <div className="mb-2 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <StatBlock icon={TrendingUp} label="Entradas" value={formatCurrency(model.totals.inflows)} hint="Receitas realizadas" tone="green" />
        <StatBlock icon={TrendingDown} label="Saidas" value={formatCurrency(model.totals.outflows)} hint="Despesas, taxas e deducoes" tone="red" />
        <StatBlock icon={BarChart3} label="Resultado" value={formatCurrency(model.totals.net)} hint="Entradas menos saidas" tone={model.totals.net < 0 ? 'amber' : 'blue'} />
        <StatBlock icon={CheckCircle2} label="Classificado" value={`${percentFormatter.format(model.totals.classifiedPercent)}%`} hint="Movimentos com conta/classificacao" tone="blue" />
        <StatBlock icon={AlertTriangle} label="Maior pressao" value={mainExpenseGroup ? compactText(mainExpenseGroup.label, '-') : '-'} hint={mainExpenseGroup ? formatCurrency(mainExpenseGroup.value) : 'Sem grupo'} tone="amber" />
      </div>

      {accountsError ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-100">
          O plano de contas nao foi carregado agora; a visao continua usando classificacao gerencial de fallback. Detalhe: {accountsError}
        </div>
      ) : null}

      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-100/70 p-1.5 shadow-inner dark:border-slate-700 dark:bg-slate-900/70">
        <div className="grid gap-2 xl:grid-cols-[1fr_1.35fr_1.2fr_.9fr_auto]">
          <ControlGroup label="Visualizacao" value={tablePeriodicity} options={PERIODICITY_OPTIONS} onChange={setTablePeriodicity} />
          <ControlGroup label="Cenario" value={tableScenario} options={SCENARIO_OPTIONS} onChange={setTableScenario} />
          <ControlGroup label="Exibir" value={tableDisplay} options={DISPLAY_OPTIONS} onChange={setTableDisplay} />
          <ControlGroup
            label="Nivel"
            value={viewDepth}
            options={[
              { value: 'groups', label: 'Resumo' },
              { value: 'accounts', label: 'Contas' },
              { value: 'details', label: 'Detalhes' },
            ]}
            onChange={setDepth}
          />
          <div className="flex flex-wrap items-end gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm xl:justify-end dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={expandAll}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Expandir
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Recolher
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[62vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th className="sticky left-0 z-40 min-w-[360px] border-b border-slate-200 bg-slate-100 px-3 py-2.5 text-left font-bold dark:border-slate-700 dark:bg-slate-800">Plano de Contas / Classificacao</th>
              <th className="min-w-[120px] border-b border-slate-200 px-3 py-2 text-right font-bold dark:border-slate-700">Saldo inicial</th>
              {model.months.map((month) => (
                <th key={month} className="min-w-[105px] border-b border-slate-200 px-3 py-2 text-right font-bold dark:border-slate-700">
                  {model.periodLabels[month] || month}
                </th>
              ))}
              <th className="sticky right-0 z-20 min-w-[120px] border-b border-slate-200 bg-slate-200 px-3 py-2 text-right font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50">Total</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.length === 1 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={model.months.length + 3}>
                  Sem movimentos para montar a visao operacional no periodo.
                </td>
              </tr>
            ) : visibleRows.map((row) => (
              <tr key={row.key} className={`${rowClass(row)} border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/70`}>
                <td className={`${rowClass(row)} sticky left-0 z-10 border-r border-slate-100 px-3 py-2 align-top dark:border-slate-800`} style={{ paddingLeft: `${12 + row.level * 18}px` }}>
                  <div className="flex items-start gap-2 font-semibold leading-5">
                    {row.hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleRow(row)}
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                        aria-label={expandedRows.has(row.key) ? `Recolher ${row.label}` : `Expandir ${row.label}`}
                      >
                        {expandedRows.has(row.key) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span className="h-5 w-5 shrink-0" />
                    )}
                    {row.actionPath ? (
                      <button
                        type="button"
                        onClick={() => navigate(row.actionPath)}
                        className="inline-flex items-start gap-1.5 text-left font-semibold text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline dark:text-blue-300 dark:hover:text-blue-200"
                        title="Abrir conta para editar e classificar"
                      >
                        <span>{row.label}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      </button>
                    ) : (
                      <span>{row.label}</span>
                    )}
                  </div>
                  {row.meta || row.statusLabel || row.warning ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1 pl-7 text-[10px] font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                      {row.statusLabel ? (
                        <span className={`rounded border px-1.5 py-0.5 ${row.warning ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/70 dark:bg-orange-950/50 dark:text-orange-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {row.statusLabel}
                        </span>
                      ) : null}
                      {row.warning ? <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-orange-700 dark:border-orange-700/70 dark:bg-orange-950/50 dark:text-orange-200">{row.warning}</span> : null}
                      {row.meta ? <span className="normal-case text-slate-500 dark:text-slate-400">{row.meta}</span> : null}
                    </div>
                  ) : null}
                </td>
                <td className={`border-l border-slate-50 px-3 py-2 text-right font-mono dark:border-slate-800 ${valueClass(row.openingBalance, row)}`}>
                  {row.openingBalance === 0 && !row.isSubtotal ? '-' : formatCurrency(row.openingBalance)}
                </td>
                {model.months.map((month) => {
                  const value = row.values[month] || 0;
                  return (
                    <td key={month} className={`border-l border-slate-50 px-3 py-2 text-right font-mono dark:border-slate-800 ${valueClass(value, row)}`}>
                      {value === 0 ? '-' : formatCurrency(value)}
                    </td>
                  );
                })}
                <td className={`${rowClass(row)} sticky right-0 z-10 border-l border-slate-200 px-3 py-2 text-right font-mono font-bold dark:border-slate-700 ${valueClass(row.values.total, row)}`}>
                  {row.values.total === 0 ? '-' : formatCurrency(row.values.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><Table2 className="h-3.5 w-3.5" /> Base: contas a receber, contas a pagar e lancamentos financeiros.</span>
        <span>Linhas sem conta vinculada usam classificacao inferida; Sem Classificacao fica para movimentos sem conta e sem categoria.</span>
      </div>
      </div>
    </Card>
  );
}
