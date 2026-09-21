import {
  GROUPS,
  MANAGEMENT_TREE_BY_KEY,
  MANAGEMENT_TREE_SECTIONS,
} from './constants';
import {
  buildStatementBalanceRows,
  getFinancialBalanceAccountName,
  getFinancialBalanceOpening,
  getStatementBalanceForAccount,
} from './bankBalance';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const fullMonthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percentFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function getFinancialPlanSectionTone(sectionKey = '', type = '') {
  const key = String(sectionKey || '').toLowerCase();
  const planType = String(type || '').toUpperCase();
  if (key === 'revenue' || planType === 'REVENUE') return 'positive';
  if (key === 'deductions' || planType === 'DEDUCTION') return 'warning';
  if (key === 'taxes' || planType === 'TAX') return 'tax';
  if (key === 'medical-transfers' || planType === 'MEDICAL_TRANSFER') return 'transfer';
  if (key === 'investments' || planType === 'INVESTMENT') return 'capital';
  if (key === 'distribution' || planType === 'DISTRIBUTION') return 'capital';
  return 'negative';
}

function getFinancialPlanSectionIcon(sectionKey = '', type = '') {
  return '';
}

function getFinancialPlanSortOrder(account = {}, fallback = 0) {
  const explicit = Number(account.sort_order);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const fromCode = Number(String(account.code || '').replace(/\D/g, '').padEnd(4, '0'));
  return Number.isFinite(fromCode) && fromCode > 0 ? fromCode : fallback;
}

function buildFinancialPlanContext(accounts = []) {
  const activeAccounts = (Array.isArray(accounts) ? accounts : [])
    .filter((account) => account && account.is_active !== false)
    .sort((left, right) => String(left.code || '').localeCompare(String(right.code || ''), 'pt-BR', { numeric: true }));

  if (activeAccounts.length === 0) {
    return {
      sections: MANAGEMENT_TREE_SECTIONS,
      byKey: MANAGEMENT_TREE_BY_KEY,
      accountsById: new Map(),
      accountsBySection: new Map(),
      childrenByParent: new Map(),
      hasPersistedPlan: false,
    };
  }

  const roots = activeAccounts.filter((account) => !account.parent_id);
  const persistedSections = roots
    .filter((account) => {
      const key = normalizeText(account.section_key || account.code || account.name);
      const label = normalizeText(account.name);
      return key !== 'opening' && key !== 'closing' && label !== 'saldo inicial' && label !== 'saldo final';
    })
    .map((account, index) => ({
      key: account.section_key || account.code || account.id,
      order: getFinancialPlanSortOrder(account, index + 1),
      code: account.code || '',
      label: cleanBrokenText(account.name || '').toUpperCase(),
      tone: getFinancialPlanSectionTone(account.section_key, account.type),
      icon: getFinancialPlanSectionIcon(account.section_key, account.type),
      financialPlanAccountId: account.id,
    }));

  const sections = [
    MANAGEMENT_TREE_BY_KEY.get('opening'),
    ...persistedSections,
    MANAGEMENT_TREE_BY_KEY.get('closing'),
  ].filter(Boolean);
  const byKey = new Map(sections.map((section) => [section.key, section]));
  const accountsById = new Map(activeAccounts.map((account) => [String(account.id), account]));
  const accountsBySection = new Map();
  const childrenByParent = new Map();

  activeAccounts.forEach((account) => {
    const sectionKey = account.section_key || '';
    if (!accountsBySection.has(sectionKey)) accountsBySection.set(sectionKey, []);
    accountsBySection.get(sectionKey).push(account);

    if (account.parent_id) {
      const parentKey = String(account.parent_id);
      if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
      childrenByParent.get(parentKey).push(account);
    }
  });

  return { sections, byKey, accountsById, accountsBySection, childrenByParent, hasPersistedPlan: true };
}

const WEEKDAY_LABELS = ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado'];

function readOperationalLayout() {
  if (typeof window === 'undefined') return DEFAULT_OPERATIONAL_LAYOUT;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OPERATIONAL_LAYOUT_STORAGE_KEY) || '{}');
    return {
      ...DEFAULT_OPERATIONAL_LAYOUT,
      ...parsed,
      density: ['compact', 'comfortable'].includes(parsed?.density) ? parsed.density : DEFAULT_OPERATIONAL_LAYOUT.density,
    };
  } catch (error) {
    return DEFAULT_OPERATIONAL_LAYOUT;
  }
}

export function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value) {
  return String(value || '').split('T')[0];
}

export function parseLocalDate(value) {
  const date = dateOnly(value);
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function toIsoDate(date) {
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

export function formatFullDate(date) {
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

export function formatCurrency(value) {
  return currencyFormatter.format(money(value));
}

export function normalizeText(value) {
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
    .replace(/N�/gi, 'No')
    .replace(/�+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value, fallback = 'Sem descricao') {
  const text = String(cleanBrokenText(value || fallback)).replace(/\s+/g, ' ').trim();
  return text.length > 92 ? `${text.slice(0, 89)}...` : text;
}

export function isMeaningfulText(value) {
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

export function firstMeaningful(...values) {
  return values.find((value) => isMeaningfulText(value)) || '';
}
function isUuidValue(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}
function isInternalCashFlowKey(value) {
  const text = String(value || '').trim();
  return !text || isUuidValue(text) || /^(section|account|detail|node|group):/i.test(text);
}
export function firstFriendlyDetail(...values) {
  return values.find((value) => isMeaningfulText(value) && !isInternalCashFlowKey(value)) || '';
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

export function formatSourceLabel(value) {
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
    account: 'Conta do plano financeiro',
    accounts: 'Contas do plano financeiro',
    group: 'Grupo do plano financeiro',
    groups: 'Grupos do plano financeiro',
    detail: 'Lancamento detalhado',
    details: 'Lancamentos detalhados',
    total: 'Totalizador',
    node: 'Item da arvore operacional',
    tree: 'Arvore operacional',
    section: 'Secao do plano financeiro',
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
  return dateOnly(row.received_date || row.received_at || row.payment_date || row.paid_at || row.transaction_date || row.competency_date || row.invoice_date || row.due_date || row.created_at);
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

function getIncomePayerGroupLabel(movement = {}, accountLabel = '') {
  const accountText = normalizeText(accountLabel);
  if (/particular/.test(accountText)) return 'Particular';
  if (/unimed|amil|bradesco|sulamerica|sul america|hapvida|convenio|plano de saude|cooperativa/.test(accountText)) return 'Convenios';
  if (/empresa|corporativo|ocupacional/.test(accountText)) return 'Empresas';

  const text = normalizeText([
    movement.payerName,
    movement.counterpartyName,
    movement.chartAccountName,
    movement.categoryName,
    movement.description,
  ].filter(Boolean).join(' '));

  if (/unimed|amil|bradesco|sulamerica|sul america|hapvida|convenio|plano de saude|cooperativa/.test(text)) {
    return 'Convenios';
  }

  if (/empresa|corporativo|ocupacional/.test(text)) {
    return 'Empresas';
  }

  return 'Particular';
}

function shouldShowIncomePayerGroup(accountLabel = '') {
  const accountText = normalizeText(accountLabel);
  return !/particular|unimed|amil|bradesco|sulamerica|sul america|hapvida|convenio|plano de saude|cooperativa|empresa/.test(accountText);
}

function getBalanceAccountLabel(name = '') {
  return compactText(name, 'Conta financeira nao informada')
    .replace(/^saldo\s+inicial\s+/i, '')
    .replace(/^(banco|caixa|cartao|cartoes)\s+-\s+/i, '')
    .trim();
}

function getBalanceAccountGroup(account = {}) {
  const text = normalizeText([
    account.kind,
    account.type,
    account.accountType,
    account.account_type,
    account.category,
    account.name,
    account.bankName,
    account.bank_name,
  ].filter(Boolean).join(' '));

  if (/stone|pagbank|pagseguro|cielo|rede|getnet|cartao|cartoes|card/.test(text)) {
    return { key: 'cards', label: 'Cartoes', icon: '', sortKey: '0000:030:cartoes' };
  }
  if (/caixa|cash drawer|drawer|dinheiro/.test(text)) {
    return { key: 'cash', label: 'Caixa', icon: '', sortKey: '0000:010:caixa' };
  }
  return { key: 'bank', label: 'Banco', icon: '', sortKey: '0000:020:banco' };
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

function extractPatientFromDescription(value = '') {
  const match = String(value || '').match(/paciente\s+(.+?)(?:\s+-|\s+por\s+op[cç][aã]o|\s+monitoriza|\s+fatura|\s+realizado|$)/i)
    || String(value || '').match(/paciente\s+([^-.|]+)/i);
  return compactText(match?.[1] || '', '');
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
    financialPlanAccountId: base.financialPlanAccountId || null,
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
    payerType: base.payerType || '',
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
  const description = buildMovementDescription(row, 'Conta a receber');
  const common = {
    sourceId: row.id,
    sourceType: 'accounts_receivable',
    type: 'income',
    status: row.status,
    financialPlanAccountId: row.financial_plan_account_id || null,
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
    patientName: firstMeaningful(row.patient_name, row.paciente_name, row.customer_name, row.client_name, extractPatientFromDescription(description)),
    payerName: firstMeaningful(row.payer_name, row.convenio_name, row.company_name, row.patient_name),
    payerType: row.payer_type || row.tipo_pagador || '',
    description,
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
    financialPlanAccountId: row.financial_plan_account_id || null,
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
    financialPlanAccountId: row.financial_plan_account_id || null,
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
    payerType: row.payer_type || row.tipo_pagador || row.metadata?.payer_type || '',
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

function getMovementBusinessKey(movement = {}) {
  const descriptionKey = normalizeText(movement.description).replace(/[^a-z0-9]+/g, '');
  const patientKey = normalizeText(movement.patientName || extractPatientFromDescription(movement.description)).replace(/[^a-z0-9]+/g, '');
  const payerKey = normalizeText(movement.payerName || movement.counterpartyName).replace(/[^a-z0-9]+/g, '');
  return [
    movement.sourceType,
    movement.type,
    movement.scenario,
    money(movement.amount).toFixed(2),
    movement.effectiveDate || '',
    movement.dueDate || '',
    movement.periodDate || '',
    movement.documentNumber || '',
    patientKey,
    payerKey,
    descriptionKey,
  ].join('|');
}

function normalizeCashFlowMovements(consolidation = {}) {
  const movements = [
    ...(consolidation.receivables || []).flatMap(normalizeReceivableMovements),
    ...(consolidation.payables || []).flatMap(normalizePayableMovements),
    ...(consolidation.transactions || []).flatMap(normalizeTransactionMovement),
  ].filter((movement) => movement.periodDate && movement.amount > 0 && !movement.canceled);

  const seen = new Set();
  return movements.filter((movement) => {
    const key = getMovementBusinessKey(movement);
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
    icon: options.icon || '',
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

export function normalizeAccount(account = {}) {
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

function makeNode(label, meta, options = {}) {
  return {
    label: compactText(label, options.fallback || meta || 'Nao informado'),
    meta,
    sortKey: options.sortKey || '',
    icon: options.icon || '',
    financialPlanAccountId: options.financialPlanAccountId || null,
  };
}

function formatFinancialPlanAccountLabel(account = {}) {
  return account?.code ? `${account.code} - ${account.name}` : account?.name || '';
}

function simplifyPlanLabel(value = '') {
  return normalizeText(value)
    .replace(/^\d+(?:\.\d+)*\s*-?\s*/, '')
    .replace(/guias? de /g, '')
    .replace(/receitas? de /g, '')
    .replace(/despesas? de /g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function labelsMatchPlanAccount(account = {}, label = '') {
  const accountName = simplifyPlanLabel(account.name || '');
  const wanted = simplifyPlanLabel(label);
  if (!accountName || !wanted) return false;
  if (accountName === wanted) return true;
  if (accountName.includes(wanted) || wanted.includes(accountName)) return true;
  const singularAccount = accountName.replace(/s\b/g, '');
  const singularWanted = wanted.replace(/s\b/g, '');
  return singularAccount === singularWanted || singularAccount.includes(singularWanted) || singularWanted.includes(singularAccount);
}

function findFinancialPlanAccount(financialPlan, sectionKey = '', label = '', parentId = null) {
  if (!financialPlan?.hasPersistedPlan || !isMeaningfulText(label)) return null;
  const candidates = parentId
    ? financialPlan.childrenByParent.get(String(parentId)) || []
    : (financialPlan.accountsBySection.get(sectionKey) || []).filter((account) => account.parent_id);

  return [...candidates]
    .sort((left, right) => getFinancialPlanSortOrder(left) - getFinancialPlanSortOrder(right))
    .find((account) => labelsMatchPlanAccount(account, label)) || null;
}

function getFinancialPlanAccountById(financialPlan, id) {
  if (!financialPlan?.hasPersistedPlan || !id) return null;
  return financialPlan.accountsById.get(String(id)) || null;
}

function makeFinancialPlanNode(financialPlan, sectionKey, label, meta, options = {}) {
  const account = findFinancialPlanAccount(financialPlan, sectionKey, label, options.parentId || null);
  if (!account) return makeNode(label, meta, options);
  return makeNode(formatFinancialPlanAccountLabel(account), meta, {
    ...options,
    sortKey: account.code || options.sortKey,
    financialPlanAccountId: account.id,
  });
}

function getRevenueCategory(movement = {}, accountLabel = '') {
  const payerType = normalizeText(
    movement.payerType
      || movement.raw?.payer_type
      || movement.raw?.tipo_pagador
      || movement.raw?.metadata?.payer_type,
  );
  const hasInsuranceId = Boolean(movement.raw?.convenio_id || movement.raw?.insurance_id || movement.raw?.health_insurance_id);
  const paymentText = normalizeText([movement.paymentMethod, movement.raw?.received_payment_method].filter(Boolean).join(' '));
  const isDirectPayment = /pix|cartao|credito|debito|dinheiro|transferencia|boleto/.test(paymentText);
  if (['paciente', 'patient', 'particular', 'manual'].includes(payerType)) return 'Particulares';
  if (['empresa', 'company', 'corporativo'].includes(payerType)) return 'Empresas';

  const accountText = normalizeText(accountLabel);
  const payerText = normalizeText([
    movement.payerName,
    movement.counterpartyName,
    movement.raw?.payer_name,
    movement.raw?.payer_display,
    movement.raw?.convenio_name,
    movement.raw?.insurance_name,
  ].filter(Boolean).join(' '));
  const serviceText = normalizeText([
    movement.chartAccountName,
    movement.categoryName,
    movement.serviceGroupName,
    movement.serviceName,
    movement.description,
  ].filter(Boolean).join(' '));

  if (['convenio', 'insurance', 'health_insurance', 'plano'].includes(payerType)) {
    if (hasInsuranceId || /convenio|plano de saude|insurance/.test(paymentText)) return 'Convenios';
    if (isDirectPayment || /particular/.test(serviceText)) return 'Particulares';
  }

  if (/particular|pix|cartao|credito|debito|dinheiro|transferencia|boleto/.test(accountText)) return 'Particulares';
  if (/unimed|cassi|amil|bradesco|sulamerica|sul america|saude caixa|copel|sanepar|pam|siam|convenio|plano de saude|cooperativa/.test(accountText)) return 'Convenios';
  if (/empresa|corporativo|ocupacional/.test(accountText)) return 'Empresas';
  if (/unimed|cassi|amil|bradesco|sulamerica|sul america|saude caixa|copel|sanepar|pam|siam|convenio|plano de saude|cooperativa/.test(payerText)) return 'Convenios';
  if (/empresa|corporativo|ocupacional/.test(payerText)) return 'Empresas';
  if (/sus|sistema unico/.test(payerText)) return 'SUS';
  if (/prefeitura|municipio|municipal/.test(payerText)) return 'Prefeituras';
  if (/exame|laborator|imagem|tomografia|ressonancia|ultrassom|eletro/.test(serviceText)) return 'Exames';
  if (/cirurg/.test(serviceText)) return 'Cirurgias';
  if (/internacao|hospital/.test(serviceText)) return 'Internacoes';
  return 'Outras Receitas';
}

function getRevenueCategorySortKey(category = '') {
  const normalized = normalizeText(category);
  const order = {
    particulares: '01',
    convenios: '02',
    empresas: '03',
    sus: '04',
    prefeituras: '05',
    exames: '06',
    cirurgias: '07',
    internacoes: '08',
    'outras receitas': '09',
  };
  return `01:${order[normalized] || '99'}:${normalized}`;
}

function getInsuranceOperator(movement = {}) {
  const text = normalizeText([movement.payerName, movement.counterpartyName, movement.description, movement.chartAccountName].filter(Boolean).join(' '));
  const operators = [
    ['Unimed', /unimed/],
    ['Cassi', /cassi/],
    ['Amil', /amil/],
    ['Bradesco', /bradesco/],
    ['Sul America', /sulamerica|sul america/],
    ['Saude Caixa', /saude caixa|caixa/],
    ['Copel', /copel/],
    ['Sanepar', /sanepar/],
    ['PAM', /\bpam\b/],
    ['SIAM', /\bsiam\b/],
  ];
  return operators.find(([, pattern]) => pattern.test(text))?.[0] || 'Demais Convenios';
}

function getPaymentMethodLabel(movement = {}) {
  const text = normalizeText([movement.paymentMethod, movement.description].filter(Boolean).join(' '));
  if (/pix/.test(text)) return 'PIX';
  if (/credito|credit/.test(text)) return 'Cartao Credito';
  if (/debito|debit/.test(text)) return 'Cartao Debito';
  if (/dinheiro|cash/.test(text)) return 'Dinheiro';
  if (/transfer|ted|doc/.test(text)) return 'Transferencia';
  if (/boleto/.test(text)) return 'Boleto';
  if (/other|outro/.test(text)) return 'Outros';
  return compactText(movement.paymentMethod || 'Forma nao informada', 'Forma nao informada');
}

function getAttendanceTypeLabel(movement = {}) {
  const text = normalizeText([movement.serviceGroupName, movement.serviceName, movement.description].filter(Boolean).join(' '));
  if (/exame|laborator|imagem|tomografia|ressonancia|ultrassom|eletro/.test(text)) return 'Exame';
  if (/cirurg/.test(text)) return 'Cirurgia';
  if (/proced|sessao|terapia|aplicacao|infiltracao/.test(text)) return 'Procedimento';
  if (/telemed/.test(text)) return 'Telemedicina';
  if (/retorno/.test(text)) return 'Retorno';
  return 'Consulta';
}

function getAttendanceGroupLabel(movement = {}) {
  const type = getAttendanceTypeLabel(movement);
  const labels = {
    Consulta: 'Consultas',
    Exame: 'Exames',
    Cirurgia: 'Cirurgias',
    Procedimento: 'Procedimentos',
    Telemedicina: 'Telemedicina',
    Retorno: 'Retornos',
  };
  return labels[type] || 'Atendimentos';
}

function getAttendanceGroupSortKey(label = '') {
  const normalized = normalizeText(label);
  const order = {
    consultas: '01',
    exames: '02',
    procedimentos: '03',
    cirurgias: '04',
    telemedicina: '05',
    retornos: '06',
    atendimentos: '99',
  };
  return `03:${order[normalized] || '99'}:${normalized}`;
}

function getProfessionalManagementLabel(movement = {}) {
  return firstMeaningful(
    movement.professionalName,
    movement.raw?.professional_name,
    movement.raw?.profissional_name,
    movement.raw?.doctor_name,
    movement.raw?.medico_name,
  ) || 'Sem profissional vinculado';
}

function getInsuranceManagementLabel(movement = {}) {
  return firstMeaningful(
    movement.payerName,
    movement.counterpartyName,
    movement.raw?.convenio_name,
    movement.raw?.insurance_name,
    getInsuranceOperator(movement),
    'Convenio nao informado',
  );
}

function getRevenuePatientLabel(movement = {}) {
  return firstMeaningful(
    movement.patientName,
    movement.raw?.patient_name,
    movement.raw?.paciente_name,
    movement.raw?.customer_name,
    movement.raw?.client_name,
    extractPatientFromDescription(movement.description),
  ) || 'Sem paciente vinculado';
}

function getExpenseDocumentLabel(movement = {}) {
  const documentLabel = firstMeaningful(
    movement.documentNumber,
    movement.raw?.document_number,
    movement.raw?.invoice_number,
    movement.raw?.nf_number,
    movement.raw?.numero_documento,
  );
  if (documentLabel) return documentLabel;

  return firstMeaningful(movement.description, movement.categoryName, 'Documento nao informado');
}

function getExpenseCategoryFromText(text = '', fallback = 'Outras Despesas Operacionais') {
  const normalized = normalizeText(text);
  const category = [
    ['Folha e salarios', /folha|salario|ferias|decimo|rescisao/],
    ['Beneficios', /beneficio|vale alimentacao|vale refeicao|nutricard|cartao beneficio/],
    ['Encargos trabalhistas', /fgts|inss|encargo trabalh|e-social|esocial/],
    ['Servicos medicos', /servico medico|honorario medico|repasse medico/],
    ['Servicos de terceiros', /servico|prestador|terceir|consultoria|gestao|assessoria|ltda|administradora/],
    ['Medicamentos', /medicamento|farmaco|remedio/],
    ['Materiais e insumos', /material|insumo|descartavel|luva|seringa|agulha/],
    ['Laboratorio', /laborator/],
    ['Centro cirurgico', /centro cirurg|cirurgico/],
    ['Exames', /exame/],
    ['Hotelaria', /hotelaria/],
    ['Manutencao', /manutenc|reparo|conserto/],
    ['Tecnologia', /tecnologia|internet|software|sistema|licenca/],
    ['Energia eletrica', /energia|eletrica|copel/],
    ['Agua e saneamento', /agua|sanepar/],
    ['Telefonia', /telefon/],
    ['Limpeza', /limpeza|higien/],
    ['Aluguel e condominio', /aluguel|condominio/],
    ['Seguros', /seguro/],
    ['Combustivel e transporte', /combustivel|transporte|frete|uber|taxi/],
    ['Documentos fiscais', /nota fiscal|documento fiscal|\bnf\b/],
  ].find(([, pattern]) => pattern.test(normalized))?.[0];

  return category || fallback;
}

function getExpenseSectionAndCategory(movement = {}, accountLabel = '') {
  const rawText = [
    accountLabel,
    movement.chartAccountName,
    movement.categoryName,
    movement.supplierName,
    movement.counterpartyName,
    movement.description,
    movement.documentNumber,
  ].filter(Boolean).join(' ');
  const text = normalizeText(rawText);

  if (/glosa|desconto|cancel|estorno|taxa administrativa/.test(text)) return { sectionKey: 'deductions', category: /glosa/.test(text) ? 'Glosas' : /desconto/.test(text) ? 'Descontos' : /cancel/.test(text) ? 'Cancelamentos' : /estorno/.test(text) ? 'Estornos' : 'Taxas Administrativas' };
  if (/iss|cbs|ibs|\bis\b|irpj|csll|pis|cofins|inss|fgts|imposto|tribut/.test(text)) return { sectionKey: 'taxes', category: /iss/.test(text) ? 'ISS' : /cbs/.test(text) ? 'CBS' : /ibs/.test(text) ? 'IBS' : /irpj/.test(text) ? 'IRPJ' : /csll/.test(text) ? 'CSLL' : /pis/.test(text) ? 'PIS' : /cofins/.test(text) ? 'COFINS' : /inss/.test(text) ? 'INSS' : /fgts/.test(text) ? 'FGTS' : 'Demais Tributos' };
  if (/repasse|honorario medico|medico/.test(text)) return { sectionKey: 'medical-transfers', category: 'Profissional' };
  if (/juros|iof|tarifa|multa|antecip|desconto financeiro|banco/.test(text)) return { sectionKey: 'financial-expenses', category: /juros/.test(text) ? 'Juros' : /iof/.test(text) ? 'IOF' : /tarifa/.test(text) ? 'Tarifas Bancarias' : /multa/.test(text) ? 'Multas' : /antecip/.test(text) ? 'Antecipacoes' : 'Descontos Financeiros' };
  if (/marketing|jurid|contabil|consult|trein|viagem|licenca|software|equipamento|rh/.test(text)) return { sectionKey: 'administrative-expenses', category: /rh/.test(text) ? 'RH' : /marketing/.test(text) ? 'Marketing' : /jurid/.test(text) ? 'Juridico' : /contabil/.test(text) ? 'Contabilidade' : /consult/.test(text) ? 'Consultorias' : /trein/.test(text) ? 'Treinamentos' : /viagem/.test(text) ? 'Viagens' : /licenca/.test(text) ? 'Licencas' : /software/.test(text) ? 'Software' : 'Equipamentos' };
  if (/invest|obra|aquisicao|aquisicoes|imobilizado/.test(text)) return { sectionKey: 'investments', category: /obra/.test(text) ? 'Obras' : /tecnologia|software/.test(text) ? 'Tecnologia' : /aquis/.test(text) ? 'Aquisicoes' : 'Equipamentos' };
  if (/socio|distribuicao|retirada|pro labore|lucro/.test(text)) return { sectionKey: 'distribution', category: /socio/.test(text) ? 'Socios' : /retirada/.test(text) ? 'Retiradas' : /pro labore/.test(text) ? 'Pro-Labore' : 'Distribuicoes' };

  const fallbackLabel = firstMeaningful(movement.chartAccountName, movement.categoryName, 'Outras Despesas Operacionais');
  const genericFallback = /documento fiscal|conta pagar|contas a pagar|previsao|pagamento|lancamento financeiro|nao classificado/.test(normalizeText(fallbackLabel));
  const operationalCategory = getExpenseCategoryFromText(
    rawText,
    genericFallback ? 'Outras Despesas Operacionais' : compactText(fallbackLabel, 'Outras Despesas Operacionais'),
  );

  return { sectionKey: 'operational-expenses', category: operationalCategory };
}

function getManagementSectionForMovement(movement = {}, accountLabel = '', financialPlan = null) {
  const sectionByKey = financialPlan?.byKey || MANAGEMENT_TREE_BY_KEY;
  const explicitAccount = getFinancialPlanAccountById(financialPlan, movement.financialPlanAccountId);
  if (explicitAccount?.section_key) {
    return sectionByKey.get(explicitAccount.section_key)
      || MANAGEMENT_TREE_BY_KEY.get(explicitAccount.section_key)
      || MANAGEMENT_TREE_BY_KEY.get('operational-expenses');
  }
  if (movement.type === 'income') return sectionByKey.get('revenue') || MANAGEMENT_TREE_BY_KEY.get('revenue');
  const expenseGroup = getExpenseSectionAndCategory(movement, accountLabel);
  return sectionByKey.get(expenseGroup.sectionKey) || MANAGEMENT_TREE_BY_KEY.get(expenseGroup.sectionKey) || MANAGEMENT_TREE_BY_KEY.get('operational-expenses');
}

function getManagementPath(movement = {}, accountLabel = '', financialPlan = null) {
  const explicitAccount = getFinancialPlanAccountById(financialPlan, movement.financialPlanAccountId);
  if (explicitAccount) {
    return [
      makeNode(formatFinancialPlanAccountLabel(explicitAccount), 'Plano financeiro', {
        sortKey: explicitAccount.code || '',
        financialPlanAccountId: explicitAccount.id,
        icon: getFinancialPlanSectionIcon(explicitAccount.section_key, explicitAccount.type),
      }),
    ];
  }

  const patient = getRevenuePatientLabel(movement);
  const attendance = firstMeaningful(movement.serviceName, movement.description, 'Atendimento nao informado');
  const sourceLabel = formatSourceLabel(movement.originModule);

  if (movement.type === 'income') {
    const category = getRevenueCategory(movement, accountLabel);
    const attendanceGroup = getAttendanceGroupLabel(movement);
    const categoryAccount = findFinancialPlanAccount(financialPlan, 'revenue', category);
    const categoryNode = makeFinancialPlanNode(financialPlan, 'revenue', category, 'Categoria de receita', {
      sortKey: getRevenueCategorySortKey(category),
      icon: '',
    });
    const attendanceNode = makeFinancialPlanNode(financialPlan, 'revenue', attendanceGroup, 'Tipo de atendimento', {
      parentId: categoryAccount?.id,
      sortKey: getAttendanceGroupSortKey(attendanceGroup),
      icon: '',
    });

    if (category === 'Convenios') {
      return [
        categoryNode,
        makeNode(getInsuranceManagementLabel(movement), 'Convenio', { sortKey: `02:${normalizeText(getInsuranceManagementLabel(movement))}`, icon: '' }),
        attendanceNode,
        makeNode(getProfessionalManagementLabel(movement), 'Profissional', { sortKey: `03:${normalizeText(getProfessionalManagementLabel(movement))}`, icon: '' }),
        makeNode(patient, 'Paciente', { icon: '' }),
      ];
    }

    if (category === 'Particulares') {
      return [
        categoryNode,
        attendanceNode,
        makeNode(getProfessionalManagementLabel(movement), 'Profissional', { sortKey: `02:${normalizeText(getProfessionalManagementLabel(movement))}`, icon: '' }),
        makeNode(patient, 'Paciente', { icon: '' }),
      ];
    }

    return [
      categoryNode,
      attendanceNode,
      makeNode(getProfessionalManagementLabel(movement), 'Profissional', { sortKey: `02:${normalizeText(getProfessionalManagementLabel(movement))}`, icon: '' }),
      makeNode(patient, 'Paciente', { icon: '' }),
    ];
  }

  const expenseGroup = getExpenseSectionAndCategory(movement, accountLabel);
  if (expenseGroup.sectionKey === 'medical-transfers') {
    return [
      makeNode(firstMeaningful(movement.professionalName, movement.supplierName, movement.counterpartyName, 'Profissional nao informado'), 'Profissional', { icon: '' }),
      makeNode(movement.periodDate?.slice(0, 7) || 'Competencia nao informada', 'Competencia'),
      makeNode(firstMeaningful(movement.serviceGroupName, 'Producao'), 'Producao'),
      makeNode(firstMeaningful(movement.serviceName, movement.description, 'Procedimentos'), 'Procedimentos'),
      makeNode('Repasse', 'Repasse', { icon: '' }),
      makeNode(sourceLabel, 'Pagamento', { icon: '' }),
    ];
  }

  return [
    makeFinancialPlanNode(financialPlan, expenseGroup.sectionKey, expenseGroup.category, 'Categoria de despesa'),
    makeNode(firstMeaningful(movement.supplierName, movement.counterpartyName, 'Fornecedor nao informado'), 'Fornecedor', { icon: '' }),
    makeNode(getExpenseDocumentLabel(movement), 'Documento', { icon: '' }),
  ];
}

export function buildOperationalModel(consolidation, accounts = [], returnTo = '', accountingMode = 'realized', options = {}) {
  const periodicity = options.periodicity || 'monthly';
  const scenario = options.scenario || 'consolidated';
  const displayMode = options.displayMode || 'income_expense';
  const balanceAccounts = Array.isArray(options.balanceAccounts) ? options.balanceAccounts : [];
  const bankStatements = Array.isArray(options.bankStatements) ? options.bankStatements : [];
  const financialPlan = buildFinancialPlanContext(options.financialPlanAccounts);
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
      const sectionLabel = sectionDefinition.code ? `${sectionDefinition.code} ${sectionDefinition.label}` : sectionDefinition.label;
      sections.set(key, {
        definition: sectionDefinition,
        row: registerRow(createReportRow(key, sectionLabel, 0, periodKeys, {
          tone: sectionDefinition.tone,
          isGroup: true,
          hasChildren: true,
          nodeKind: 'group',
          openingBalance: sectionDefinition.key === 'balance' ? openingBalance : 0,
          icon: sectionDefinition.icon,
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
        icon: config.icon || '',
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

  financialPlan.sections.forEach(getSection);

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
    const sectionDefinition = getManagementSectionForMovement(movement, accountLabel, financialPlan);
    const section = getSection(sectionDefinition);
    const managementPath = movement.type === 'income' && !financialPlan.hasPersistedPlan
      ? [
          getInternalPeriodNode(movement, periodicity),
          makeNode(accountLabel, 'Conta financeira', { accountKey: account.id || accountLabel }),
          makeNode(getProfessionalManagementLabel(movement), 'Profissional'),
          makeNode(firstMeaningful(movement.serviceGroupName, 'Grupo nao informado'), 'Grupo do servico'),
          makeNode(firstMeaningful(movement.serviceName, movement.description, 'Servico nao informado'), 'Servico'),
          makeNode(getRevenuePatientLabel(movement), 'Paciente'),
        ]
      : getManagementPath(movement, accountLabel, financialPlan);
    const path = [
      ...managementPath,
      {
        label: `${movement.description} - ${getMovementStatusLabel(movement)} - ${formatCurrency(movement.amount)}`,
        meta: [
          movement.effectiveDate ? `Efetiva: ${formatDayMonth(movement.effectiveDate)}` : '',
          movement.dueDate ? `Venc.: ${formatDayMonth(movement.dueDate)}` : '',
          movement.paymentMethod ? `Forma: ${getPaymentMethodLabel(movement)}` : '',
          movement.documentNumber ? `Doc.: ${movement.documentNumber}` : '',
          formatSourceLabel(movement.originModule),
        ].filter(Boolean).join(' | '),
        leaf: true,
        actionPath: getSourceEditPath({ origin_module: movement.originModule, origin_id: movement.originId, id: movement.originId }, returnTo),
        icon: '',
      },
    ].filter((item, index, arr) => {
      if (!isMeaningfulText(item.label)) return false;
      const normalized = normalizeText(item.label);
      return arr.findIndex((candidate) => normalizeText(candidate.label) === normalized) === index;
    });
    if (movement.type === 'income' && !path.some((item) => item.meta === 'Paciente')) {
      path.splice(Math.max(0, path.length - 1), 0, makeNode('Sem paciente vinculado', 'Paciente', { icon: '' }));
    }

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
        warning: isLeaf && movement.overdue ? 'Vencido' : '',
        source: isLeaf ? movement : null,
        sortKey: item.sortKey || (isLeaf ? `${movement.periodDate}|${movement.description}|${movement.id}` : ''),
        icon: item.icon || '',
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
  const variationRow = fillValues(createReportRow('result:variation', 'Variacao realizado x previsto', 1, periodKeys, {
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
    runningOpening = projectedBalanceRow.values[key];
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

  if (showIncomeExpense) {
    const openingSection = getSection(MANAGEMENT_TREE_BY_KEY.get('opening'));
    const closingSection = getSection(MANAGEMENT_TREE_BY_KEY.get('closing'));
    const movementBalanceAccounts = Array.from(new Set(normalizedMovements
      .filter((movement) => shouldIncludeMovement(movement) && isMeaningfulText(movement.financialAccountName))
      .map((movement) => compactText(movement.financialAccountName, 'Banco/caixa nao informado'))))
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({ id: normalizeText(name), name, openingBalance: 0 }));
    const configuredBalanceAccounts = balanceAccounts
      .filter((account) => account && account.is_active !== false && account.participates_cashflow !== false)
      .map((account) => ({
        id: account.id || normalizeText(getFinancialBalanceAccountName(account)),
        name: getFinancialBalanceAccountName(account),
        openingBalance: getFinancialBalanceOpening(account),
        kind: account.kind || account.type || account.account_type || account.category || '',
        type: account.type || '',
        accountType: account.account_type || '',
        bankName: account.bank_name || '',
        balanceDate: account.balance_date || account.updated_at || account.created_at || '',
      }))
      .filter((account) => isMeaningfulText(account.name))
      .sort((left, right) => left.name.localeCompare(right.name));
    const balanceAccountRows = configuredBalanceAccounts.length > 0 ? configuredBalanceAccounts : movementBalanceAccounts;
    const accountsWithOpeningBalance = balanceAccountRows.filter((account) => money(account.openingBalance) !== 0);
    const primaryUnlinkedBalanceAccountId = accountsWithOpeningBalance.length === 1 ? accountsWithOpeningBalance[0].id : null;
    const statementBalances = buildStatementBalanceRows(bankStatements, periods, findPeriodKey, dateOnly);
    const movementMatchesAnyBalanceAccount = (movement) => balanceAccountRows.some((account) => {
      const sameAccountId = account.id && movement.financialAccountId && String(account.id) === String(movement.financialAccountId);
      const sameAccountName = normalizeText(account.name) && normalizeText(account.name) === normalizeText(movement.financialAccountName);
      return sameAccountId || sameAccountName;
    });
    const openingConsolidatedRow = registerRow(createReportRow('opening:consolidated', 'Saldo inicial consolidado', 1, periodKeys, {
      tone: 'balance',
      parentKey: openingSection.row.key,
      groupKey: openingSection.row.key,
      nodeKind: 'account',
      openingBalance,
      isBalanceStock: true,
      meta: 'Saldo inicial de banco/caixa',
      icon: '',
      sortKey: '0000:900:saldo-inicial',
    }));
    const closingConsolidatedRow = registerRow(createReportRow('closing:consolidated', 'Saldo final consolidado', 1, periodKeys, {
      tone: 'projected',
      parentKey: closingSection.row.key,
      groupKey: closingSection.row.key,
      nodeKind: 'account',
      openingBalance,
      isBalanceStock: true,
      meta: 'Saldo final acumulado de banco/caixa',
      icon: '',
      sortKey: '0000:999:saldo-final',
    }));

    openingConsolidatedRow.values = makeEmptyValues(periodKeys);
    closingConsolidatedRow.values = makeEmptyValues(periodKeys);
    periodKeys.forEach((key, index) => {
      const previousKey = periodKeys[index - 1];
      openingSection.row.values[key] = index === 0
        ? openingBalance || inflowRow.values[key]
        : projectedBalanceRow.values[previousKey];
    });
    openingSection.row.values.total = projectedBalanceRow.values.total;
    closingSection.row.values = { ...projectedBalanceRow.values };
    closingSection.row.values.total = projectedBalanceRow.values.total;

    const getAccountPeriodNet = (account, periodKey) => normalizedMovements.reduce((sum, movement) => {
      if (!shouldIncludeMovement(movement) || findPeriodKey(movement.periodDate, periods) !== periodKey) return sum;
      const sameAccountId = account.id && movement.financialAccountId && String(account.id) === String(movement.financialAccountId);
      const sameAccountName = normalizeText(account.name) && normalizeText(account.name) === normalizeText(movement.financialAccountName);
      const shouldUsePrimaryUnlinkedAccount = primaryUnlinkedBalanceAccountId
        && String(account.id) === String(primaryUnlinkedBalanceAccountId)
        && !movement.financialAccountId
        && !movementMatchesAnyBalanceAccount(movement);
      if (!sameAccountId && !sameAccountName && !shouldUsePrimaryUnlinkedAccount) return sum;
      if (movement.type === 'income') return sum + movement.amount;
      if (movement.type === 'expense') return sum - movement.amount;
      if (movement.type === 'transfer' && movement.scenario === 'realized') return sum + movement.signedAmount;
      return sum;
    }, 0);

    const getAccountFirstActiveIndex = (account) => {
      const matchingStatementIndexes = statementBalances
        .filter((statement) => {
          if (statement.accountId && account.id && String(statement.accountId) === String(account.id)) return true;
          return primaryUnlinkedBalanceAccountId
            && String(account.id) === String(primaryUnlinkedBalanceAccountId)
            && !statement.accountId;
        })
        .map((statement) => periodKeys.indexOf(statement.periodKey))
        .filter((index) => index >= 0);
      const matchingMovementIndexes = normalizedMovements
        .filter((movement) => {
          if (!shouldIncludeMovement(movement)) return false;
          const sameAccountId = account.id && movement.financialAccountId && String(account.id) === String(movement.financialAccountId);
          const sameAccountName = normalizeText(account.name) && normalizeText(account.name) === normalizeText(movement.financialAccountName);
          const shouldUsePrimaryUnlinkedAccount = primaryUnlinkedBalanceAccountId
            && String(account.id) === String(primaryUnlinkedBalanceAccountId)
            && !movement.financialAccountId
            && !movementMatchesAnyBalanceAccount(movement);
          return sameAccountId || sameAccountName || shouldUsePrimaryUnlinkedAccount;
        })
        .map((movement) => periodKeys.indexOf(findPeriodKey(movement.periodDate, periods)))
        .filter((index) => index >= 0);

      const balanceDatePeriodIndex = account.balanceDate
        ? periodKeys.indexOf(findPeriodKey(account.balanceDate, periods))
        : -1;
      const openingBalanceIndex = money(account.openingBalance) !== 0 ? 0 : -1;
      const candidateIndexes = [openingBalanceIndex, balanceDatePeriodIndex, ...matchingStatementIndexes, ...matchingMovementIndexes].filter((index) => index >= 0);
      return candidateIndexes.length ? Math.min(...candidateIndexes) : 0;
    };

    const openingGroupEntries = new Map();
    const getOpeningGroupEntry = (group) => {
      const key = `opening:group:${group.key}`;
      if (!openingGroupEntries.has(key)) {
        const groupRow = registerRow(createReportRow(key, group.label, 1, periodKeys, {
          tone: 'balance',
          parentKey: openingSection.row.key,
          groupKey: openingSection.row.key,
          nodeKind: 'group',
          hasChildren: true,
          isBalanceStock: true,
          meta: 'Saldo inicial por tipo de conta financeira',
          icon: group.icon,
          sortKey: group.sortKey,
        }));
        groupRow.values = makeEmptyValues(periodKeys);
        openingGroupEntries.set(key, { row: groupRow, children: new Map() });
      }
      return openingGroupEntries.get(key);
    };

    balanceAccountRows.forEach((account, index) => {
      const group = getBalanceAccountGroup(account);
      const groupEntry = getOpeningGroupEntry(group);
      const accountLabel = getBalanceAccountLabel(account.name);
      const accountOpening = money(account.openingBalance);
      const accountBalanceRow = registerRow(createReportRow(`opening:account:${account.id || normalizeText(account.name)}`, accountLabel, 2, periodKeys, {
        tone: 'balance',
        parentKey: groupEntry.row.key,
        groupKey: openingSection.row.key,
        nodeKind: 'account',
        openingBalance: accountOpening,
        isBalanceStock: true,
        meta: 'Conta financeira',
        icon: group.icon,
        sortKey: `${group.sortKey}:${String(index).padStart(3, '0')}:${normalizeText(accountLabel)}`,
      }));
      const accountClosingRow = registerRow(createReportRow(`closing:account:${account.id || normalizeText(account.name)}`, accountLabel, 2, periodKeys, {
        tone: 'projected',
        parentKey: closingConsolidatedRow.key,
        groupKey: closingSection.row.key,
        nodeKind: 'account',
        openingBalance: accountOpening,
        isBalanceStock: true,
        meta: 'Conta financeira',
        icon: group.icon,
        sortKey: `${group.sortKey}:${String(index).padStart(3, '0')}:${normalizeText(accountLabel)}`,
      }));
      accountBalanceRow.values = makeEmptyValues(periodKeys);
      accountClosingRow.values = makeEmptyValues(periodKeys);
      let runningAccountOpening = accountOpening;
      const firstActiveIndex = getAccountFirstActiveIndex(account);
      periodKeys.forEach((key, periodIndex) => {
        if (periodIndex < firstActiveIndex) return;
        accountBalanceRow.values[key] = runningAccountOpening;
        groupEntry.row.values[key] += runningAccountOpening;
        const statementBalance = getStatementBalanceForAccount(statementBalances, account, key, primaryUnlinkedBalanceAccountId);
        if (statementBalance !== null) {
          runningAccountOpening = statementBalance;
        } else {
          runningAccountOpening += getAccountPeriodNet(account, key);
        }
        accountClosingRow.values[key] = runningAccountOpening;
      });
      accountBalanceRow.values.total = periodKeys.length ? accountBalanceRow.values[periodKeys[periodKeys.length - 1]] : accountOpening;
      accountClosingRow.values.total = periodKeys.length ? accountClosingRow.values[periodKeys[periodKeys.length - 1]] : accountOpening;
      groupEntry.row.openingBalance += accountOpening;
      groupEntry.row.values.total = periodKeys.length ? groupEntry.row.values[periodKeys[periodKeys.length - 1]] : groupEntry.row.openingBalance;
      groupEntry.children.set(accountBalanceRow.key, { row: accountBalanceRow, children: new Map() });
      closingConsolidatedRow.children ??= new Map();
      periodKeys.forEach((key) => {
        closingConsolidatedRow.values[key] += accountClosingRow.values[key];
      });
      closingConsolidatedRow.values.total += accountClosingRow.values.total;
      closingConsolidatedRow.hasChildren = true;
      closingConsolidatedRow.nodeKind = 'group';
      closingConsolidatedRow.children.set(accountClosingRow.key, { row: accountClosingRow, children: new Map() });
    });

    if (openingGroupEntries.size > 0) {
      openingSection.row.openingBalance = 0;
      openingSection.row.values = makeEmptyValues(periodKeys);
      Array.from(openingGroupEntries.values()).forEach((entry) => {
        openingSection.row.openingBalance += money(entry.row.openingBalance);
        periodKeys.forEach((key) => {
          openingSection.row.values[key] += money(entry.row.values[key]);
        });
        openingSection.row.values.total += money(entry.row.values.total);
      });

      openingConsolidatedRow.openingBalance = openingSection.row.openingBalance;
      openingConsolidatedRow.values = { ...openingSection.row.values };

      const financialCurrentBalance = openingSection.row.openingBalance;
      closingSection.row.openingBalance = openingSection.row.openingBalance;
      closingSection.row.values = makeEmptyValues(periodKeys);
      closingConsolidatedRow.openingBalance = openingSection.row.openingBalance;
      periodKeys.forEach((key, index) => {
        const value = money(closingConsolidatedRow.values[key]);
        closingSection.row.values[key] = value;
        if (index === periodKeys.length - 1) {
          closingSection.row.values.total = value;
        }
      });
      if (periodKeys.length === 0) {
        closingSection.row.values.total = financialCurrentBalance;
        closingConsolidatedRow.values.total = financialCurrentBalance;
      } else {
        closingConsolidatedRow.values.total = closingSection.row.values.total;
      }
    }

    Array.from(openingGroupEntries.values())
      .sort((left, right) => String(left.row.sortKey).localeCompare(String(right.row.sortKey)))
      .forEach((entry) => openingSection.children.set(entry.row.key, entry));
    openingSection.children.set(openingConsolidatedRow.key, { row: openingConsolidatedRow, children: new Map() });
    closingSection.children.set(closingConsolidatedRow.key, { row: closingConsolidatedRow, children: closingConsolidatedRow.children || new Map() });
  }

  const flattenTree = (children) => Array.from(children.values())
    .sort((a, b) => {
      if (a.row.sortKey || b.row.sortKey) return String(a.row.sortKey || '9999').localeCompare(String(b.row.sortKey || '9999'));
      return Math.abs(b.row.values.total) - Math.abs(a.row.values.total) || a.row.label.localeCompare(b.row.label);
    })
    .flatMap((entry) => [entry.row, ...flattenTree(entry.children)]);
  const cashRows = Array.from(sections.values())
    .sort((a, b) => {
      if (a.definition.key === 'opening') return -1;
      if (b.definition.key === 'opening') return 1;
      if (a.definition.key === 'closing') return 1;
      if (b.definition.key === 'closing') return -1;
      return Number(a.definition.order) - Number(b.definition.order);
    })
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
      realized: 'Resultado realizado do periodo',
      forecast: 'Resultado previsto do periodo',
      projected: 'Saldo projetado ao final do periodo',
    };
    const sourceRow = scenario === 'realized' ? realizedResultRow : scenario === 'forecast' ? forecastResultRow : projectedBalanceRow;
    const finalRow = createReportRow(`final:${scenario}`, labels[scenario] || 'Resultado do periodo', 0, periodKeys, {
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
    rows: [...displayedRows, ...(showIncomeExpense ? [] : finalRows)],
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

