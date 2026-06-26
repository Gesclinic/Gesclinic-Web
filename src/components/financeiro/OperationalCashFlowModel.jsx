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
import { buildDerivedFinancialTransactions } from '@/lib/financialConsolidationApi';
import { listAccountPlans } from '@/lib/financeApi';
import { listChartOfAccounts } from '@/modules/financeiro/plano-contas/services/chartOfAccountsApi';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
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

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value) {
  return String(value || '').split('T')[0];
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

function getMonthKey(date) {
  if (!date) return '';
  return date.slice(0, 7);
}

function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!year || !month) return monthKey;
  return monthFormatter.format(new Date(year, month - 1, 1)).replace('.', '');
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

function formatCategoryLabel(value) {
  const normalized = normalizeText(value);
  const labels = {
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
  const name = row.counterparty_name
    || row.payer_name
    || row.recipient_name
    || row.vendor_name
    || row.patient_name
    || (isReceivable ? 'Pagador nao informado' : 'Destinatario nao informado');

  return { role, name: compactText(name, role) };
}

function getMovementLabel(row = {}) {
  const parts = [
    cleanBrokenText(row.flow_detail_name || row.category_name || row.category || 'Movimento'),
    row.document_number ? `Doc. ${cleanBrokenText(row.document_number)}` : '',
    row.patient_name ? `Paciente: ${cleanBrokenText(row.patient_name)}` : '',
    row.service_name ? `Servico: ${cleanBrokenText(row.service_name)}` : '',
  ].filter(Boolean);

  return compactText(parts.join(' | '), cleanBrokenText(row.description || 'Movimento financeiro'));
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

function buildOperationalModel(consolidation, accounts = [], returnTo = '', accountingMode = 'realized') {
  const sourceRows = consolidation ? buildDerivedFinancialTransactions(consolidation) : [];
  const rows = sourceRows.filter((row) => {
    if (accountingMode !== 'accrual' && !isRealizedRow(row)) return false;
    return getMonthKey(getRowDate(row, accountingMode));
  });
  const months = buildMonths(consolidation, rows, accountingMode);
  const accountIndex = buildAccountIndex(accounts);
  const groups = new Map();
  const totals = createReportRow('total', 'Resultado Operacional do Periodo', 0, months, {
    tone: 'total',
    isSubtotal: true,
    nodeKind: 'total',
    openingBalance: getOpeningBalance(consolidation),
  });
  let inflows = 0;
  let outflows = 0;
  let classifiedAmount = 0;
  let absoluteAmount = 0;

  rows.forEach((source) => {
    const month = getMonthKey(getRowDate(source, accountingMode));
    const value = getSignedAmount(source);
    const absolute = Math.abs(value);
    const account = getPlanAccount(source, accountIndex);
    const group = chooseGroup(source, account);
    const groupKey = group.code;
    const accountLabel = account.code ? `${account.code} - ${account.name}` : account.name;
    const accountKey = `${groupKey}:${account.id || normalizeText(accountLabel)}`;
    const counterparty = getCounterparty(source);
    const counterpartyKey = `${accountKey}:party:${normalizeText(counterparty.name).slice(0, 80) || 'sem-contraparte'}`;
    const detailLabel = getMovementLabel(source);
    const detailKey = `${counterpartyKey}:${normalizeText(detailLabel).slice(0, 90) || 'sem-descricao'}`;
    const sourceEditPath = getSourceEditPath(source, returnTo);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        definition: group,
        row: createReportRow(`group:${groupKey}`, `${group.code}. ${group.label}`, 0, months, {
          tone: group.tone,
          isGroup: true,
          hasChildren: true,
          nodeKind: 'group',
        }),
        accounts: new Map(),
      });
    }

    const groupEntry = groups.get(groupKey);
    if (!groupEntry.accounts.has(accountKey)) {
      groupEntry.accounts.set(accountKey, {
        row: createReportRow(accountKey, accountLabel, 1, months, {
          tone: account.classified ? 'account' : 'attention',
          meta: account.parentName ? `Nivel ${account.level} - ${account.parentName}` : `Nivel ${account.level}`,
          parentKey: groupEntry.row.key,
          groupKey: groupEntry.row.key,
          hasChildren: true,
          nodeKind: 'account',
        }),
        counterparties: new Map(),
      });
    }

    const accountEntry = groupEntry.accounts.get(accountKey);
    if (!accountEntry.counterparties.has(counterpartyKey)) {
      accountEntry.counterparties.set(counterpartyKey, {
        row: createReportRow(counterpartyKey, counterparty.name, 2, months, {
          tone: 'counterparty',
          meta: counterparty.role,
          parentKey: accountKey,
          groupKey: groupEntry.row.key,
          hasChildren: true,
          nodeKind: 'counterparty',
        }),
        details: new Map(),
      });
    }

    const counterpartyEntry = accountEntry.counterparties.get(counterpartyKey);
    if (!counterpartyEntry.details.has(detailKey)) {
      counterpartyEntry.details.set(detailKey, createReportRow(detailKey, detailLabel, 3, months, {
        tone: 'detail',
        meta: source.origin_module || '',
        parentKey: counterpartyKey,
        groupKey: groupEntry.row.key,
        accountKey,
        actionPath: sourceEditPath,
        nodeKind: 'detail',
      }));
    }

    addValue(groupEntry.row, month, value);
    addValue(accountEntry.row, month, value);
    addValue(counterpartyEntry.row, month, value);
    addValue(counterpartyEntry.details.get(detailKey), month, value);
    addValue(totals, month, value);

    if (value >= 0) inflows += value;
    else outflows += Math.abs(value);
    if (account.classified) classifiedAmount += absolute;
    absoluteAmount += absolute;
  });

  const reportRows = Array.from(groups.values())
    .sort((a, b) => a.definition.order - b.definition.order)
    .flatMap((groupEntry) => {
      const accountRows = Array.from(groupEntry.accounts.values())
        .sort((a, b) => Math.abs(b.row.values.total) - Math.abs(a.row.values.total))
        .flatMap((accountEntry) => {
          const counterpartyRows = Array.from(accountEntry.counterparties.values())
            .sort((a, b) => Math.abs(b.row.values.total) - Math.abs(a.row.values.total))
            .flatMap((counterpartyEntry) => {
              const detailRows = Array.from(counterpartyEntry.details.values())
                .sort((a, b) => Math.abs(b.values.total) - Math.abs(a.values.total))
                .slice(0, 5);
              return [counterpartyEntry.row, ...detailRows];
            });
          return [accountEntry.row, ...counterpartyRows];
        });
      return [groupEntry.row, ...accountRows];
    });

  const groupSummaries = Array.from(groups.values())
    .map((entry) => ({
      label: entry.definition.label,
      tone: entry.definition.tone,
      value: entry.row.values.total,
      absolute: Math.abs(entry.row.values.total),
    }))
    .sort((a, b) => b.absolute - a.absolute);

  return {
    months,
    rows: [...reportRows, totals],
    expandableKeys: [...groups.values()].flatMap((groupEntry) => [
      groupEntry.row.key,
      ...Array.from(groupEntry.accounts.values()).map((accountEntry) => accountEntry.row.key),
      ...Array.from(groupEntry.accounts.values()).flatMap((accountEntry) => Array.from(accountEntry.counterparties.values()).map((counterpartyEntry) => counterpartyEntry.row.key)),
    ]),
    groupKeys: [...groups.values()].map((groupEntry) => groupEntry.row.key),
    accountKeys: [...groups.values()].flatMap((groupEntry) => Array.from(groupEntry.accounts.values()).map((accountEntry) => accountEntry.row.key)),
    totals: {
      inflows,
      outflows,
      net: inflows - outflows,
      classifiedPercent: absoluteAmount > 0 ? (classifiedAmount / absoluteAmount) * 100 : 0,
      movements: rows.length,
    },
    groupSummaries,
  };
}

function rowClass(row) {
  if (row.tone === 'positive') return 'bg-emerald-50 text-emerald-950 font-bold';
  if (row.tone === 'negative') return 'bg-rose-50 text-rose-950 font-bold';
  if (row.tone === 'warning') return 'bg-amber-50 text-amber-950 font-bold';
  if (row.tone === 'capital') return 'bg-indigo-50 text-indigo-950 font-bold';
  if (row.tone === 'attention') return 'bg-orange-50 text-orange-950 font-semibold';
  if (row.tone === 'account') return 'bg-white text-slate-900 font-semibold';
  if (row.tone === 'counterparty') return 'bg-slate-50 text-slate-900 font-semibold';
  if (row.tone === 'total') return 'bg-slate-900 text-white font-bold';
  return 'bg-white text-slate-600';
}

function valueClass(value, row) {
  if (row?.tone === 'total') return value < 0 ? 'text-rose-200' : 'text-emerald-200';
  if (value < 0) return 'text-rose-700';
  if (value > 0) return 'text-emerald-700';
  return 'text-slate-400';
}

function StatBlock({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const toneClasses = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    red: 'border-rose-200 bg-rose-50 text-rose-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    blue: 'border-blue-200 bg-blue-50 text-blue-950',
  };

  return (
    <div className={`rounded-md border p-3 ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <p className="mt-2 text-lg font-bold tracking-normal">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function OperationalCashFlowModel({ consolidation, clinicId, loading = false, accountingMode = 'realized' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const depthParam = searchParams.get('depth');
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [viewDepth, setViewDepth] = useState(['groups', 'accounts', 'details'].includes(depthParam) ? depthParam : 'accounts');
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

  const model = useMemo(() => buildOperationalModel(consolidation, accounts, returnTo, accountingMode), [consolidation, accounts, returnTo, accountingMode]);
  const mainExpenseGroup = model.groupSummaries.find((group) => group.value < 0) || model.groupSummaries[0];
  const visibleRows = useMemo(() => model.rows.filter((row) => {
    if (row.nodeKind === 'total') return true;
    if (row.nodeKind === 'group') return true;
    if (row.nodeKind === 'account') return viewDepth !== 'groups' && expandedRows.has(row.parentKey);
    if (row.nodeKind === 'counterparty') {
      return viewDepth === 'details' && expandedRows.has(row.groupKey) && expandedRows.has(row.parentKey);
    }
    if (row.nodeKind === 'detail') {
      return viewDepth === 'details'
        && expandedRows.has(row.parentKey);
    }
    return true;
  }), [expandedRows, model.rows, viewDepth]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextDepth = params.get('depth');
    const expand = params.get('expand');
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
  }, [location.search, model.expandableKeys.join('|'), model.groupKeys.join('|')]);

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
      <Card className="mb-6 border-slate-200 bg-white p-5">
        <div className="h-72 animate-pulse rounded-md bg-slate-100" />
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-700" />
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Painel Gerencial Operacional</h3>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
            Visao executiva para socios e diretoria, estruturada por plano de contas, classificacoes gerenciais e movimentos realizados no periodo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">{model.months.length} competencia(s)</span>
          <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800">{model.totals.movements} movimento(s)</span>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">Plano de contas: {accountsLoading ? 'carregando' : `${accounts.length} conta(s)`}</span>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatBlock icon={TrendingUp} label="Entradas" value={formatCurrency(model.totals.inflows)} hint="Receitas realizadas" tone="green" />
        <StatBlock icon={TrendingDown} label="Saidas" value={formatCurrency(model.totals.outflows)} hint="Despesas, taxas e deducoes" tone="red" />
        <StatBlock icon={BarChart3} label="Resultado" value={formatCurrency(model.totals.net)} hint="Entradas menos saidas" tone={model.totals.net < 0 ? 'amber' : 'blue'} />
        <StatBlock icon={CheckCircle2} label="Classificado" value={`${percentFormatter.format(model.totals.classifiedPercent)}%`} hint="Movimentos com conta/classificacao" tone="blue" />
        <StatBlock icon={AlertTriangle} label="Maior pressao" value={mainExpenseGroup ? compactText(mainExpenseGroup.label, '-') : '-'} hint={mainExpenseGroup ? formatCurrency(mainExpenseGroup.value) : 'Sem grupo'} tone="amber" />
      </div>

      {accountsError ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          O plano de contas nao foi carregado agora; a visao continua usando classificacao gerencial de fallback. Detalhe: {accountsError}
        </div>
      ) : null}

      {model.groupSummaries.length > 0 ? (
        <div className="mb-4 grid gap-2 lg:grid-cols-4">
          {model.groupSummaries.slice(0, 4).map((group) => (
            <div key={group.label} className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-slate-500">{group.label}</p>
              <p className={`mt-1 text-sm font-bold ${valueClass(group.value)}`}>{formatCurrency(group.value)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-2">
        <div className="flex flex-wrap gap-1">
          {[
            { value: 'groups', label: 'Resumo' },
            { value: 'accounts', label: 'Contas' },
            { value: 'details', label: 'Detalhes' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDepth(option.value)}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                viewDepth === option.value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Expandir tudo
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            Recolher tudo
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-md border border-slate-200 dark:border-gray-700">
        <table className="w-full min-w-[880px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-900 text-white">
            <tr>
              <th className="min-w-[300px] px-3 py-2 text-left font-bold">Plano de Contas / Classificacao</th>
              <th className="min-w-[120px] px-3 py-2 text-right font-bold">Saldo inicial</th>
              {model.months.map((month) => (
                <th key={month} className="min-w-[105px] px-3 py-2 text-right font-bold capitalize">
                  {formatMonthLabel(month)}
                </th>
              ))}
              <th className="min-w-[120px] bg-slate-800 px-3 py-2 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.length === 1 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={model.months.length + 3}>
                  Sem movimentos para montar a visao operacional no periodo.
                </td>
              </tr>
            ) : visibleRows.map((row) => (
              <tr key={row.key} className={`${rowClass(row)} border-b border-slate-100`}>
                <td className="px-3 py-2 align-top" style={{ paddingLeft: `${12 + row.level * 18}px` }}>
                  <div className="flex items-start gap-2 font-semibold leading-5">
                    {row.hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleRow(row)}
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
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
                        className="inline-flex items-start gap-1.5 text-left font-semibold text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline"
                        title="Abrir conta para editar e classificar"
                      >
                        <span>{row.label}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      </button>
                    ) : (
                      <span>{row.label}</span>
                    )}
                  </div>
                </td>
                <td className={`px-3 py-2 text-right font-mono ${valueClass(row.openingBalance, row)}`}>
                  {row.openingBalance === 0 && !row.isSubtotal ? '-' : formatCurrency(row.openingBalance)}
                </td>
                {model.months.map((month) => {
                  const value = row.values[month] || 0;
                  return (
                    <td key={month} className={`px-3 py-2 text-right font-mono ${valueClass(value, row)}`}>
                      {value === 0 ? '-' : formatCurrency(value)}
                    </td>
                  );
                })}
                <td className={`bg-slate-50 px-3 py-2 text-right font-mono font-bold ${valueClass(row.values.total, row)}`}>
                  {row.values.total === 0 ? '-' : formatCurrency(row.values.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><Table2 className="h-3.5 w-3.5" /> Base: contas a receber, contas a pagar e lancamentos financeiros.</span>
        <span>Linhas sem conta vinculada usam classificacao inferida; Sem Classificacao fica para movimentos sem conta e sem categoria.</span>
      </div>
    </Card>
  );
}
