import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  TrendingDown,
} from 'lucide-react';
import { listAccountPlans } from '@/lib/financeApi';
import { listChartOfAccounts } from '@/modules/financeiro/plano-contas/services/chartOfAccountsApi';
import { listFinancialPlanAccounts } from '@/modules/financeiro/plano-financeiro/services/financialPlanApi';
import { supabase } from '@/lib/customSupabaseClient';
import {
  DEFAULT_OPERATIONAL_LAYOUT,
  DISPLAY_VALUES,
  OPERATIONAL_LAYOUT_STORAGE_KEY,
  OUTFLOW_MANAGEMENT_SECTION_KEYS,
  PERIODICITY_VALUES,
  SCENARIO_VALUES,
  VIRTUAL_ROW_LIMIT,
} from './operationalCashFlow/constants';
import {
  buildOperationalModel,
  firstFriendlyDetail,
  firstMeaningful,
  formatCurrency,
  formatFullDate,
  formatSourceLabel,
  isMeaningfulText,
  money,
  normalizeAccount,
  normalizeText,
  parseLocalDate,
  toIsoDate,
} from './operationalCashFlow/modelBuilder';
import OperationalCashFlowTable from './operationalCashFlow/OperationalCashFlowTable';
import OperationalCashFlowDrilldownDrawer from './operationalCashFlow/OperationalCashFlowDrilldownDrawer';
import OperationalCashFlowControls from './operationalCashFlow/OperationalCashFlowControls';

const percentFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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

function makeEmptyValues(months) {
  return months.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, { total: 0 });
}

function compactText(value, fallback = 'Sem descricao') {
  const text = String(value || fallback).replace(/\s+/g, ' ').trim();
  return text.length > 92 ? `${text.slice(0, 89)}...` : text;
}

function rowClass(row) {
  if (row?.nodeKind === 'group') {
    if (row.tone === 'positive') return 'bg-emerald-50 text-emerald-950 font-bold dark:bg-emerald-950/40 dark:text-emerald-100';
    if (row.tone === 'negative') return 'bg-rose-50 text-rose-950 font-bold dark:bg-rose-950/40 dark:text-rose-100';
    if (row.tone === 'balance') return 'bg-blue-50 text-blue-950 font-bold dark:bg-blue-950/40 dark:text-blue-100';
    if (row.tone === 'tax') return 'bg-orange-50 text-orange-950 font-bold dark:bg-orange-950/40 dark:text-orange-100';
    if (row.tone === 'transfer') return 'bg-violet-50 text-violet-950 font-bold dark:bg-violet-950/40 dark:text-violet-100';
    if (row.tone === 'warning') return 'bg-amber-50 text-amber-950 font-bold dark:bg-amber-950/40 dark:text-amber-100';
  }
  if (row.key === 'final:realized' || row.key === 'result:realized' || row.key === 'result:consolidated') return 'bg-white text-blue-800 font-bold dark:bg-slate-950 dark:text-blue-300';
  if (row.key === 'final:forecast' || row.key === 'result:forecast') return 'bg-white text-amber-800 font-bold dark:bg-slate-950 dark:text-amber-300';
  if (row.key === 'final:projected' || row.key === 'balance:projected') return 'bg-white text-cyan-800 font-bold dark:bg-slate-950 dark:text-cyan-300';
  if (row.key === 'section:income') return 'bg-white text-emerald-800 font-bold dark:bg-slate-950 dark:text-emerald-300';
  if (row.key === 'section:expense') return 'bg-white text-rose-800 font-bold dark:bg-slate-950 dark:text-rose-300';
  if (row.groupKey === 'section:income') return row.hasChildren
    ? 'bg-white text-emerald-800 font-bold dark:bg-slate-950 dark:text-emerald-300'
    : 'bg-white text-emerald-700 dark:bg-slate-950 dark:text-emerald-300';
  if (row.groupKey === 'section:expense') return row.hasChildren
    ? 'bg-white text-rose-800 font-bold dark:bg-slate-950 dark:text-rose-300'
    : 'bg-white text-rose-700 dark:bg-slate-950 dark:text-rose-300';
  if (row.tone === 'positive') return 'bg-white text-emerald-800 font-bold dark:bg-slate-950 dark:text-emerald-300';
  if (row.tone === 'negative') return 'bg-white text-rose-800 font-bold dark:bg-slate-950 dark:text-rose-300';
  if (row.tone === 'warning') return 'bg-white text-amber-800 font-bold dark:bg-slate-950 dark:text-amber-300';
  if (row.tone === 'tax') return 'bg-white text-orange-800 font-bold dark:bg-slate-950 dark:text-orange-300';
  if (row.tone === 'transfer') return 'bg-white text-violet-800 font-bold dark:bg-slate-950 dark:text-violet-300';
  if (row.tone === 'forecast') return 'bg-white text-sky-800 font-semibold dark:bg-slate-950 dark:text-sky-300';
  if (row.tone === 'projected') return 'bg-white text-cyan-800 font-bold dark:bg-slate-950 dark:text-cyan-300';
  if (row.tone === 'balance') return 'bg-white text-slate-900 font-bold dark:bg-slate-950 dark:text-slate-100';
  if (row.tone === 'result') return 'bg-white text-blue-800 font-bold dark:bg-slate-950 dark:text-blue-300';
  if (row.tone === 'capital') return 'bg-white text-violet-800 font-bold dark:bg-slate-950 dark:text-violet-300';
  if (row.tone === 'attention') return 'bg-white text-orange-800 font-semibold dark:bg-slate-950 dark:text-orange-300';
  if (row.tone === 'account') return 'bg-white text-slate-800 font-semibold dark:bg-slate-950 dark:text-slate-200';
  if (row.tone === 'counterparty') return 'bg-white text-slate-800 font-semibold dark:bg-slate-950 dark:text-slate-300';
  if (row.tone === 'total') return 'bg-white text-slate-950 font-bold dark:bg-slate-950 dark:text-slate-50';
  return 'bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300';
}

function valueClass(value, row) {
  const isOutflowManagementRow = OUTFLOW_MANAGEMENT_SECTION_KEYS.has(row?.key) || OUTFLOW_MANAGEMENT_SECTION_KEYS.has(row?.groupKey);
  const sourceType = normalizeText(row?.source?.type);
  const sourceOrigin = normalizeText(row?.source?.originModule || row?.source?.sourceType);
  const rowText = normalizeText([row?.label, row?.meta, row?.statusLabel, row?.source?.description].filter(Boolean).join(' '));
  const isOutflowSource = sourceType === 'expense'
    || sourceOrigin.includes('accounts_payable')
    || sourceOrigin.includes('contas_pagar')
    || sourceOrigin.includes('ap_bills')
    || /contas a pagar|conta a pagar|despesa|pagamento|fornecedor/.test(rowText);
  if (row?.key === 'final:realized' || row?.key === 'result:realized' || row?.key === 'result:consolidated') return 'text-blue-800 dark:text-blue-300';
  if (row?.key === 'final:forecast' || row?.key === 'result:forecast') return 'text-amber-800 dark:text-amber-300';
  if (row?.key === 'final:projected' || row?.key === 'balance:projected') return 'text-cyan-800 dark:text-cyan-300';
  if (row?.tone === 'total') return value < 0 ? 'text-rose-700 dark:text-rose-300' : value > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400';
  if (isOutflowSource && value !== 0) return 'text-rose-700 dark:text-rose-300';
  if (isOutflowManagementRow && value !== 0) return 'text-rose-700 dark:text-rose-300';
  if (row?.tone === 'negative' && value !== 0) return 'text-rose-700 dark:text-rose-300';
  if ((row?.key === 'section:expense' || row?.groupKey === 'section:expense') && value !== 0) return 'text-rose-700 dark:text-rose-300';
  if (row?.tone === 'forecast' && value !== 0) return value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-sky-700 dark:text-sky-300';
  if (row?.tone === 'projected' && value !== 0) return value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-indigo-700 dark:text-indigo-300';
  if (row?.tone === 'balance' && value !== 0) return value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100';
  if (row?.tone === 'result' && value !== 0) return value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300';
  if (value < 0) return 'text-rose-700 dark:text-rose-300';
  if (value > 0) return 'text-emerald-700 dark:text-emerald-300';
  return 'text-slate-400 dark:text-slate-500';
}

function rowLabelWeightClass(row) {
  if (row?.hasChildren || row?.nodeKind === 'group' || row?.nodeKind === 'total') return 'font-bold';
  return 'font-normal';
}

function rowTypographyClass(row) {
  if (row?.nodeKind === 'group') return 'text-[15px] font-bold';
  if (row?.level === 1) return 'text-sm font-bold';
  if (row?.level === 2) return 'text-[13px] font-semibold';
  if (row?.level === 3) return 'text-xs font-medium';
  return 'text-[11px] font-medium';
}

function formatPercentValue(value) {
  if (!Number.isFinite(value)) return '-';
  return `${percentFormatter.format(value)}%`;
}

function getRowIcon(row = {}) {
  return '';
}

function toDateInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return formatFullDate(value.split('T')[0]);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatFullDate(toIsoDate(value));
  return '';
}

function formatDateMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBrazilDate(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 8) return '';
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = parseLocalDate(isoDate);
  if (!parsed || parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day) return '';
  return isoDate;
}

function OperationalCashFlowModel({
  consolidation,
  clinicId,
  loading = false,
  accountingMode = 'realized',
  dateRange = null,
  onDateRangeChange = null,
  showDateControls = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const depthParam = searchParams.get('depth');
  const periodicityParam = searchParams.get('periodicity');
  const scenarioParam = searchParams.get('scenario');
  const displayParam = searchParams.get('display');
  const [accounts, setAccounts] = useState([]);
  const [financialPlanAccounts, setFinancialPlanAccounts] = useState([]);
  const [balanceAccounts, setBalanceAccounts] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [viewDepth, setViewDepth] = useState(['groups', 'accounts', 'details'].includes(depthParam) ? depthParam : 'accounts');
  const [tablePeriodicity, setTablePeriodicity] = useState(PERIODICITY_VALUES.includes(periodicityParam) ? periodicityParam : 'monthly');
  const [tableScenario, setTableScenario] = useState(SCENARIO_VALUES.includes(scenarioParam) ? scenarioParam : 'consolidated');
  const [tableDisplay, setTableDisplay] = useState(DISPLAY_VALUES.includes(displayParam) ? displayParam : 'income_expense');
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [dateStart, setDateStart] = useState(() => toDateInputValue(dateRange?.start));
  const [dateEnd, setDateEnd] = useState(() => toDateInputValue(dateRange?.end));
  const [rowSearch, setRowSearch] = useState('');
  const [quickTreeFilter, setQuickTreeFilter] = useState('all');
  const [layoutOptions, setLayoutOptions] = useState(() => readOperationalLayout());
  const [drilldownRow, setDrilldownRow] = useState(null);
  const expansionPresetRef = useRef('');

  useEffect(() => {
    setDateStart(toDateInputValue(dateRange?.start));
    setDateEnd(toDateInputValue(dateRange?.end));
  }, [dateRange?.start, dateRange?.end]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(OPERATIONAL_LAYOUT_STORAGE_KEY, JSON.stringify(layoutOptions));
  }, [layoutOptions]);

  useEffect(() => {
    let active = true;
    if (!clinicId) return undefined;

    setAccountsLoading(true);
    setAccountsError('');
    Promise.allSettled([
      listChartOfAccounts(clinicId, undefined, { page: 1, limit: 2000 }),
      listAccountPlans(clinicId),
      supabase
        .from('financial_accounts')
        .select('*')
        .eq('clinic_id', clinicId),
      listFinancialPlanAccounts(clinicId),
      supabase
        .from('conciliation_bank_statements')
        .select('id, bank_account_id, statement_date, amount, transaction_type, status, metadata')
        .eq('clinic_id', clinicId)
        .not('status', 'eq', 'ignored')
        .order('statement_date', { ascending: true })
        .limit(10000),
    ])
      .then((results) => {
        if (!active) return;
        const chartAccounts = results[0].status === 'fulfilled' ? results[0].value?.data || [] : [];
        const accountPlans = results[1].status === 'fulfilled' ? results[1].value || [] : [];
        const financialAccounts = results[2].status === 'fulfilled' ? results[2].value?.data || [] : [];
        const financialPlanRows = results[3].status === 'fulfilled' ? results[3].value || [] : [];
        const statementRows = results[4].status === 'fulfilled' ? results[4].value?.data || [] : [];
        const merged = new Map();
        [...chartAccounts, ...accountPlans].forEach((account) => {
          if (account?.id) merged.set(String(account.id), normalizeAccount(account));
        });
        setAccounts(Array.from(merged.values()));
        setFinancialPlanAccounts(financialPlanRows);
        setBalanceAccounts(financialAccounts);
        setBankStatements(statementRows);

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
    params.delete('expand');
    return `${location.pathname}?${params.toString()}${location.hash || ''}`;
  }, [location.hash, location.pathname, location.search]);

  const model = useMemo(() => buildOperationalModel(consolidation, accounts, returnTo, accountingMode, {
    periodicity: tablePeriodicity,
    scenario: tableScenario,
    displayMode: tableDisplay,
    balanceAccounts,
    bankStatements,
    financialPlanAccounts,
  }), [consolidation, accounts, balanceAccounts, bankStatements, financialPlanAccounts, returnTo, accountingMode, tablePeriodicity, tableScenario, tableDisplay]);
  const rowLookup = useMemo(() => new Map(model.rows.map((row) => [row.key, row])), [model.rows]);
  const mainExpenseGroup = [...model.groupSummaries]
    .filter((group) => normalizeText(group.label).includes('despesas'))
    .sort((a, b) => money(b.absolute) - money(a.absolute))[0];
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
  const normalizedRowSearch = normalizeText(rowSearch);
  const rowMatchesTextSearch = useCallback((row) => {
    if (!normalizedRowSearch) return true;
    return normalizeText([
      row.label,
      row.meta,
      row.statusLabel,
      row.warning,
      row.source?.description,
      row.source?.counterpartyName,
      row.source?.payerName,
      row.source?.supplierName,
      row.source?.patientName,
      row.source?.professionalName,
      row.source?.serviceName,
    ].filter(Boolean).join(' ')).includes(normalizedRowSearch);
  }, [normalizedRowSearch]);
  const rowMatchesQuickFilter = useCallback((row) => {
    if (quickTreeFilter === 'all') return true;
    const text = normalizeText([row.label, row.meta, row.statusLabel, row.source?.description, row.source?.originModule].filter(Boolean).join(' '));
    if (quickTreeFilter === 'attendance') {
      const isRevenueRow = row.groupKey === 'section:revenue'
        || row.key === 'section:revenue'
        || row.source?.type === 'income';
      const isNonAttendanceRevenue = /glosa|deducao|desconto|cancelamento|estorno|taxa administrativa|imposto|saldo inicial|saldo final/.test(text);
      return isRevenueRow && !isNonAttendanceRevenue;
    }
    if (quickTreeFilter === 'realized-expenses') {
      if (!row.source) return false;
      const sourceOrigin = normalizeText(row.source.originModule || row.source.sourceType);
      const isExpense = row.source.type === 'expense'
        || sourceOrigin.includes('accounts_payable')
        || sourceOrigin.includes('contas_pagar')
        || sourceOrigin.includes('ap_bills')
        || /despesa|conta pagar|contas a pagar|pagamento|fornecedor/.test(text);
      const isRealized = row.source.scenario === 'realized'
        || row.source.reconciled === true
        || /realizado|pago|pagamento|contas a pagar/.test(text);
      return isExpense && isRealized;
    }
    return true;
  }, [quickTreeFilter]);
  const filterSourceRows = quickTreeFilter === 'realized-expenses' ? model.rows : visibleRows;
  const directMatchedRows = useMemo(() => filterSourceRows.filter((row) => rowMatchesTextSearch(row) && rowMatchesQuickFilter(row)), [filterSourceRows, rowMatchesQuickFilter, rowMatchesTextSearch]);
  const searchedVisibleRows = useMemo(() => {
    if (quickTreeFilter === 'all' && !normalizedRowSearch) return directMatchedRows;

    const directKeys = new Set(directMatchedRows.map((row) => row.key));
    const includedKeys = new Set(directKeys);
    directMatchedRows.forEach((row) => {
      let parentKey = row.parentKey;
      while (parentKey) {
        includedKeys.add(parentKey);
        parentKey = model.parentMap[parentKey];
      }
    });

    if (quickTreeFilter !== 'realized-expenses') {
      return filterSourceRows.filter((row) => includedKeys.has(row.key));
    }

    const isAncestorOf = (ancestorKey, row) => {
      let parentKey = row.parentKey;
      while (parentKey) {
        if (parentKey === ancestorKey) return true;
        parentKey = model.parentMap[parentKey];
      }
      return false;
    };

    return model.rows
      .filter((row) => includedKeys.has(row.key))
      .map((row) => {
        if (directKeys.has(row.key)) return row;
        const descendants = directMatchedRows.filter((matchedRow) => isAncestorOf(row.key, matchedRow));
        if (descendants.length === 0) return row;
        const values = makeEmptyValues(model.months);
        descendants.forEach((matchedRow) => {
          model.months.forEach((month) => {
            values[month] += money(matchedRow.values?.[month]);
          });
          values.total += money(matchedRow.values?.total);
        });
        return { ...row, values, openingBalance: 0 };
      });
  }, [directMatchedRows, filterSourceRows, model.months, model.parentMap, model.rows, normalizedRowSearch, quickTreeFilter]);
  const isOutflowRow = useCallback((row) => {
    const sourceType = normalizeText(row?.source?.type);
    const sourceOrigin = normalizeText(row?.source?.originModule || row?.source?.sourceType);
    const rowText = normalizeText([row?.label, row?.meta, row?.statusLabel, row?.source?.description].filter(Boolean).join(' '));
    return sourceType === 'expense'
      || sourceOrigin.includes('accounts_payable')
      || sourceOrigin.includes('contas_pagar')
      || sourceOrigin.includes('ap_bills')
      || /contas a pagar|conta a pagar|despesa|pagamento|fornecedor/.test(rowText)
      || OUTFLOW_MANAGEMENT_SECTION_KEYS.has(row?.groupKey)
      || OUTFLOW_MANAGEMENT_SECTION_KEYS.has(row?.key)
      || ['negative', 'tax', 'transfer', 'capital'].includes(row?.tone);
  }, []);
  const displayTotals = useMemo(() => {
    const hasRowFilter = quickTreeFilter !== 'all' || Boolean(normalizedRowSearch);
    if (!hasRowFilter) return model.totals;

    const filteredKeys = new Set(searchedVisibleRows.map((row) => row.key));
    const topFilteredRows = searchedVisibleRows.filter((row) => {
      if (row.nodeKind === 'total' || row.isBalanceStock) return false;
      let parentKey = row.parentKey;
      while (parentKey) {
        if (filteredKeys.has(parentKey)) return false;
        parentKey = model.parentMap[parentKey];
      }
      return Math.abs(money(row.values?.total)) > 0;
    });

    const totals = topFilteredRows.reduce((acc, row) => {
      const value = Math.abs(money(row.values?.total));
      if (isOutflowRow(row)) acc.outflows += value;
      else acc.inflows += value;
      return acc;
    }, { inflows: 0, outflows: 0 });

    return {
      ...model.totals,
      inflows: totals.inflows,
      outflows: totals.outflows,
      net: totals.inflows - totals.outflows,
      movements: topFilteredRows.length,
      filtered: true,
    };
  }, [isOutflowRow, model.parentMap, model.totals, normalizedRowSearch, quickTreeFilter, searchedVisibleRows]);
  const summaryItems = [
    { label: displayTotals.filtered ? 'Entradas filtradas' : 'Entradas', value: formatCurrency(displayTotals.inflows), tone: 'text-emerald-700 dark:text-emerald-300' },
    { label: displayTotals.filtered ? 'Saidas filtradas' : 'Saidas', value: formatCurrency(displayTotals.outflows), tone: 'text-rose-700 dark:text-rose-300' },
    { label: displayTotals.filtered ? 'Resultado filtrado' : 'Resultado', value: formatCurrency(displayTotals.net), tone: displayTotals.net < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-blue-300' },
    { label: 'Classificado', value: `${percentFormatter.format(model.totals.classifiedPercent)}%`, tone: 'text-slate-800 dark:text-slate-100' },
    { label: displayTotals.filtered ? 'Linhas filtradas' : 'Movimentos', value: String(displayTotals.movements), tone: 'text-slate-800 dark:text-slate-100' },
    { label: 'Maior pressao', value: mainExpenseGroup ? compactText(mainExpenseGroup.label, '-') : '-', hint: mainExpenseGroup ? formatCurrency(mainExpenseGroup.absolute) : '', tone: 'text-amber-700 dark:text-amber-300' },
  ];
  const updateLayoutOption = (key, value) => {
    setLayoutOptions((current) => ({ ...current, [key]: value }));
  };
  const densityCellClass = layoutOptions.density === 'compact' ? 'py-1.5' : 'py-2';
  const densityHeaderClass = layoutOptions.density === 'compact' ? 'py-1.5' : 'py-2.5';
  const showTotalColumn = true;
  const visibleColumnCount = 1 + model.months.length + 4;
  const currentPeriodKey = model.months[model.months.length - 1];
  const previousPeriodKey = model.months[model.months.length - 2];
  const renderedRows = useMemo(() => searchedVisibleRows.slice(0, VIRTUAL_ROW_LIMIT), [searchedVisibleRows]);

  const getRowVariation = useCallback((row) => {
    if (row?.isBalanceStock) return null;
    if (!currentPeriodKey) return 0;
    return money(row.values[currentPeriodKey]) - money(previousPeriodKey ? row.values[previousPeriodKey] : row.openingBalance);
  }, [currentPeriodKey, previousPeriodKey]);

  const getRowPercent = useCallback((row) => {
    if (row?.isBalanceStock) return null;
    if (displayTotals.filtered) {
      const basis = Math.abs(isOutflowRow(row) ? displayTotals.outflows : displayTotals.inflows);
      if (!basis) return null;
      return (Math.abs(row.values.total || 0) / basis) * 100;
    }
    const basis = row.groupKey ? Math.abs(rowLookup.get(row.groupKey)?.values.total || 0) : Math.abs(model.totals.inflows || model.totals.outflows || 0);
    if (!basis) return null;
    return (Math.abs(row.values.total || 0) / basis) * 100;
  }, [displayTotals.filtered, displayTotals.inflows, displayTotals.outflows, isOutflowRow, model.totals.inflows, model.totals.outflows, rowLookup]);

  const getRowParticipation = useCallback((row) => {
    if (row?.isBalanceStock && !row.parentKey) return null;
    if (displayTotals.filtered) {
      const basis = Math.abs(isOutflowRow(row) ? displayTotals.outflows : displayTotals.inflows);
      if (!basis) return null;
      return (Math.abs(row.values.total || 0) / basis) * 100;
    }
    const parent = row.parentKey ? rowLookup.get(row.parentKey) : null;
    const basis = Math.abs(parent?.values?.total || rowLookup.get(row.groupKey)?.values?.total || 0);
    if (!basis) return null;
    return (Math.abs(row.values.total || 0) / basis) * 100;
  }, [displayTotals.filtered, displayTotals.inflows, displayTotals.outflows, isOutflowRow, rowLookup]);

  const openDrilldown = useCallback((row) => setDrilldownRow(row), []);
  const closeDrilldown = useCallback(() => setDrilldownRow(null), []);
  const adjustDrilldownRow = useCallback((row) => {
    if (!row?.actionPath) return;
    setDrilldownRow(null);
    navigate(row.actionPath);
  }, [navigate]);

  const updateOperationalUrl = (updates = {}) => {
    const params = new URLSearchParams(location.search);
    params.set('section', 'operational');

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    if (params.get('depth') !== 'details') {
      params.delete('expand');
    }

    navigate(`${location.pathname}?${params.toString()}${location.hash || ''}`, { replace: true });
  };

  const getAccountDepthExpandedRows = () => new Set(
    model.rows
      .filter((row) => row.hasChildren && (row.nodeKind === 'group' || row.level <= 1))
      .map((row) => row.key)
  );

  const getDetailsDepthExpandedRows = () => new Set(
    model.rows
      .filter((row) => row.hasChildren)
      .map((row) => row.key)
  );

  const setPeriodicity = (periodicity) => {
    setTablePeriodicity(periodicity);
    updateOperationalUrl({ periodicity });
  };

  const setScenario = (scenario) => {
    setTableScenario(scenario);
    updateOperationalUrl({ scenario });
  };

  const setDisplay = (display) => {
    setTableDisplay(display);
    updateOperationalUrl({ display });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextDepth = params.get('depth');
    const nextPeriodicity = params.get('periodicity');
    const nextScenario = params.get('scenario');
    const nextDisplay = params.get('display');

    if (PERIODICITY_VALUES.includes(nextPeriodicity)) setTablePeriodicity(nextPeriodicity);
    if (SCENARIO_VALUES.includes(nextScenario)) setTableScenario(nextScenario);
    if (DISPLAY_VALUES.includes(nextDisplay)) setTableDisplay(nextDisplay);

    const resolvedDepth = ['groups', 'accounts', 'details'].includes(nextDepth) ? nextDepth : 'accounts';
    setViewDepth((current) => (current === resolvedDepth ? current : resolvedDepth));
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resolvedDepth = ['groups', 'accounts', 'details'].includes(params.get('depth')) ? params.get('depth') : 'accounts';
    const expandMode = params.get('expand');
    const modelReady = model.rows.length > 1;
    const presetKey = `${location.search}:${resolvedDepth}:${expandMode || ''}:${modelReady ? 'ready' : 'empty'}`;

    if (!modelReady) return;

    if (expansionPresetRef.current === presetKey) return;
    expansionPresetRef.current = presetKey;

    if (resolvedDepth === 'groups') {
      setExpandedRows(new Set());
      return;
    }

    if (resolvedDepth === 'details' && expandMode === 'all') {
      setExpandedRows(getDetailsDepthExpandedRows());
      return;
    }

    setExpandedRows(getAccountDepthExpandedRows());
  }, [location.search, model.rows.length > 1]);

  useEffect(() => {
    if (!normalizedRowSearch && quickTreeFilter === 'all') return;
    const matchingRows = model.rows.filter((row) => rowMatchesTextSearch(row) && rowMatchesQuickFilter(row));
    if (!matchingRows.length) return;
    setExpandedRows((current) => {
      const next = new Set(current);
      matchingRows.forEach((row) => {
        let parentKey = row.parentKey;
        while (parentKey) {
          next.add(parentKey);
          parentKey = model.parentMap[parentKey];
        }
      });
      return next;
    });
    setViewDepth('details');
  }, [model.parentMap, model.rows, normalizedRowSearch, quickTreeFilter, rowMatchesQuickFilter, rowMatchesTextSearch]);

  const setDepth = (depth) => {
    setViewDepth(depth);
    if (depth === 'groups') {
      setExpandedRows(new Set());
      updateOperationalUrl({ depth, expand: null });
      return;
    }
    if (depth === 'accounts') {
      setExpandedRows(getAccountDepthExpandedRows());
      updateOperationalUrl({ depth, expand: null });
      return;
    }
    setExpandedRows((current) => {
      const next = new Set(current);
      getAccountDepthExpandedRows().forEach((key) => next.add(key));
      return next;
    });
    updateOperationalUrl({ depth, expand: null });
  };

  const toggleRow = (row) => {
    if (row.nodeKind === 'group' && viewDepth === 'groups') {
      setViewDepth('accounts');
    }
    if (row.nodeKind === 'account' && viewDepth !== 'details') {
      setViewDepth('details');
    }

    setExpandedRows((current) => {
      const next = new Set(current);
      let parentKey = row.parentKey;
      while (parentKey) {
        next.add(parentKey);
        parentKey = model.parentMap[parentKey];
      }
      if (next.has(row.key)) next.delete(row.key);
      else next.add(row.key);
      return next;
    });
  };

  const expandAll = () => {
    setViewDepth('details');
    setExpandedRows(getDetailsDepthExpandedRows());
    updateOperationalUrl({ depth: 'details', expand: 'all' });
  };

  const expandCurrentLevel = () => {
    setViewDepth('accounts');
    setExpandedRows(getAccountDepthExpandedRows());
    updateOperationalUrl({ depth: 'accounts', expand: null });
  };

  const collapseAll = () => {
    setViewDepth('groups');
    setExpandedRows(new Set());
    updateOperationalUrl({ depth: 'groups', expand: null });
  };

  const normalizedDateStart = parseBrazilDate(dateStart);
  const normalizedDateEnd = parseBrazilDate(dateEnd);

  const applyDateRange = () => {
    if (!onDateRangeChange || !normalizedDateStart || !normalizedDateEnd) return;
    onDateRangeChange(normalizedDateStart, normalizedDateEnd);
  };

  const clearDateRange = () => {
    setDateStart('');
    setDateEnd('');
    onDateRangeChange?.(null, null);
  };

  if (loading) {
    return (
      <Card className="mb-6 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="h-72 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      </Card>
    );
  }

  return (
    <>
    <Card className="mb-6 overflow-hidden border-slate-200 bg-white p-0 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white px-4 py-2 sm:px-5 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[240px]">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Painel Gerencial Operacional</h3>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1 text-[11px] font-semibold">
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800 dark:border-emerald-700/70 dark:bg-emerald-950/50 dark:text-emerald-200">{displayTotals.filtered ? 'Entradas filtradas' : 'Entradas'} {formatCurrency(displayTotals.inflows)}</span>
          <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-rose-800 dark:border-rose-700/70 dark:bg-rose-950/50 dark:text-rose-200">{displayTotals.filtered ? 'Saidas filtradas' : 'Saidas'} {formatCurrency(displayTotals.outflows)}</span>
          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800 dark:border-blue-700/70 dark:bg-blue-950/50 dark:text-blue-200">{displayTotals.filtered ? 'Resultado filtrado' : 'Resultado'} {formatCurrency(displayTotals.net)}</span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{model.months.length} competencias | {displayTotals.movements} {displayTotals.filtered ? 'linhas filtradas' : 'movimentos'} | {accountsLoading ? 'plano carregando' : `${accounts.length} contas`}</span>
        </div>
      </div>
      </div>

      <div className="p-3 sm:p-4">
      {accountsError ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-100">
          O plano de contas nao foi carregado agora; a visao continua usando classificacao gerencial de fallback. Detalhe: {accountsError}
        </div>
      ) : null}

      <OperationalCashFlowControls
        tablePeriodicity={tablePeriodicity}
        onPeriodicityChange={setPeriodicity}
        tableScenario={tableScenario}
        onScenarioChange={setScenario}
        tableDisplay={tableDisplay}
        onDisplayChange={setDisplay}
        viewDepth={viewDepth}
        onDepthChange={setDepth}
        showDateControls={showDateControls}
        dateStart={dateStart}
        dateEnd={dateEnd}
        onDateStartChange={setDateStart}
        onDateEndChange={setDateEnd}
        formatDateMask={formatDateMask}
        normalizedDateStart={normalizedDateStart}
        normalizedDateEnd={normalizedDateEnd}
        onDateRangeChange={onDateRangeChange}
        onApplyDateRange={applyDateRange}
        onClearDateRange={clearDateRange}
        rowSearch={rowSearch}
        onRowSearchChange={setRowSearch}
        quickTreeFilter={quickTreeFilter}
        onQuickTreeFilterChange={(value) => {
          setQuickTreeFilter(value);
          if (value !== 'all') setViewDepth('details');
        }}
        layoutOptions={layoutOptions}
        onLayoutOptionChange={updateLayoutOption}
        onExpandAll={expandAll}
        onExpandCurrentLevel={expandCurrentLevel}
        onCollapseAll={collapseAll}
      />

      <OperationalCashFlowTable
        model={model}
        renderedRows={renderedRows}
        searchedVisibleRows={searchedVisibleRows}
        visibleColumnCount={visibleColumnCount}
        densityHeaderClass={densityHeaderClass}
        densityCellClass={densityCellClass}
        showTotalColumn={showTotalColumn}
        expandedRows={expandedRows}
        toggleRow={toggleRow}
        openDrilldown={openDrilldown}
        getRowIcon={getRowIcon}
        getRowVariation={getRowVariation}
        getRowPercent={getRowPercent}
        getRowParticipation={getRowParticipation}
        rowClass={rowClass}
        rowTypographyClass={rowTypographyClass}
        valueClass={valueClass}
        formatCurrency={formatCurrency}
        formatPercentValue={formatPercentValue}
      />
      </div>
    </Card>
    <OperationalCashFlowDrilldownDrawer
      row={drilldownRow}
      onClose={closeDrilldown}
      onAdjust={adjustDrilldownRow}
      formatCurrency={formatCurrency}
      formatSourceLabel={formatSourceLabel}
      firstFriendlyDetail={firstFriendlyDetail}
      firstMeaningful={firstMeaningful}
      isMeaningfulText={isMeaningfulText}
    />
    </>
  );
}

export default memo(OperationalCashFlowModel);
