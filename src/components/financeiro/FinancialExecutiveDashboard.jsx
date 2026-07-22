import React from 'react';
import {
  Activity,
  AlertTriangle,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CreditCard,
  LineChart,
  PieChart,
  Receipt,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percentFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return currencyFormatter.format(money(value));
}

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isPaidStatus(status) {
  return ['paid', 'received', 'processed', 'pago', 'paga', 'recebido', 'quitado'].includes(normalizeText(status));
}

function isInactiveStatus(status) {
  return ['canceled', 'cancelado', 'cancelada', 'reversed', 'estornado', 'estornada'].includes(normalizeText(status));
}

function getReceivableAmount(row = {}) {
  return money(row.balance_amount ?? row.open_amount ?? row.remaining_amount ?? row.net_value ?? row.gross_amount ?? row.amount ?? row.total ?? row.value ?? row.valor);
}

function getPayableAmount(row = {}) {
  return money(row.balance_amount ?? row.open_amount ?? row.remaining_amount ?? row.net_amount ?? row.amount ?? row.total ?? row.value ?? row.valor);
}

function isOverdue(row = {}) {
  if (isPaidStatus(row.status) || isInactiveStatus(row.status) || !row.due_date) return false;
  return String(row.due_date).split('T')[0] < new Date().toISOString().split('T')[0];
}

function groupByLabel(rows = [], getLabel, getAmount, limit = 6) {
  const map = new Map();
  rows.forEach((row) => {
    const label = getLabel(row) || 'Nao classificado';
    map.set(label, (map.get(label) || 0) + getAmount(row));
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((item) => Math.abs(item.value) > 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}

function monthKey(value) {
  return String(value || '').split('T')[0].slice(0, 7);
}

function KpiCard({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-700/70 dark:bg-emerald-950/40 dark:text-emerald-100',
    red: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-700/70 dark:bg-rose-950/40 dark:text-rose-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-700/70 dark:bg-blue-950/40 dark:text-blue-100',
    violet: 'border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-700/70 dark:bg-violet-950/40 dark:text-violet-100',
  };

  return (
    <div className={`rounded-lg border p-3 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</p>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <p className="mt-2 text-lg font-bold tracking-normal">{value}</p>
      {hint ? <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-300">{hint}</p> : null}
    </div>
  );
}

function RankingPanel({ title, icon: Icon, rows, tone = 'emerald' }) {
  const maxValue = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  const barClass = tone === 'rose' ? 'bg-rose-500' : tone === 'blue' ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
        <h3 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
      </div>
      <div className="space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{row.label}</span>
              <span className="shrink-0 font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(row.value)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(4, (Math.abs(row.value) / maxValue) * 100)}%` }} />
            </div>
          </div>
        )) : <p className="text-xs text-slate-500 dark:text-slate-400">Sem dados no periodo.</p>}
      </div>
    </div>
  );
}

export default function FinancialExecutiveDashboard({
  summary,
  projectedBalance = 0,
  receivable30d = 0,
  payable30d = 0,
  receivables = [],
  payables = [],
  dailyData = [],
  consolidation = null,
}) {
  const inflows = money(summary?.total_inflows ?? summary?.fluxo_entrada);
  const outflows = money(summary?.total_outflows ?? summary?.fluxo_saida);
  const result = money(summary?.net_balance ?? summary?.saldo_atual ?? inflows - outflows);
  const periodDays = Math.max(1, money(summary?.period?.days) || dailyData.length || 30);
  const openReceivables = receivables.filter((row) => !isPaidStatus(row.status) && !isInactiveStatus(row.status)).reduce((sum, row) => sum + getReceivableAmount(row), 0);
  const openPayables = payables.filter((row) => !isPaidStatus(row.status) && !isInactiveStatus(row.status)).reduce((sum, row) => sum + getPayableAmount(row), 0);
  const overdueReceivables = receivables.filter(isOverdue).reduce((sum, row) => sum + getReceivableAmount(row), 0);
  const glosses = receivables.filter((row) => /glosa|glossed/.test(normalizeText(row.status || row.category || row.description))).reduce((sum, row) => sum + getReceivableAmount(row), 0);
  const medicalRepasse = payables.filter((row) => /repasse|honorario|medico|profissional/.test(normalizeText(`${row.description || ''} ${row.category_name || ''} ${row.vendor_name || ''}`))).reduce((sum, row) => sum + getPayableAmount(row), 0);
  const receivedCount = Math.max(1, receivables.filter((row) => isPaidStatus(row.status)).length || receivables.length || 1);
  const margin = inflows > 0 ? (result / inflows) * 100 : 0;
  const workingCapital = receivable30d - payable30d;

  const monthlyRows = groupByLabel(dailyData, (row) => monthKey(row.date) || 'Sem data', (row) => money(row.inflow) - money(row.outflow), 8);
  const revenueByPayer = groupByLabel(receivables, (row) => row.convenio_name || row.company_name || row.payer_name || row.patient_name || 'Particular', getReceivableAmount);
  const revenueByProfessional = groupByLabel(receivables, (row) => row.professional_name || row.profissional_name || row.doctor_name || 'Profissional nao informado', getReceivableAmount);
  const expensesByCategory = groupByLabel(payables, (row) => row.category_name || row.chart_account_name || row.description || 'Despesas', getPayableAmount);
  const expensesByCostCenter = groupByLabel(payables, (row) => row.cost_center_name || row.centro_custo_name || row.category_name || 'Centro de custo nao informado', getPayableAmount);
  const bankDistribution = groupByLabel([...receivables, ...payables], (row) => row.financial_account_name || row.account_name || row.bank_account_name || 'Conta financeira nao informada', (row) => getReceivableAmount(row) || getPayableAmount(row));
  const clinicRevenue = groupByLabel(receivables, (row) => row.clinic_name || row.filial_name || 'Clinica atual', getReceivableAmount);

  const kpis = [
    { label: 'Saldo Atual', value: formatCurrency(result), hint: 'Resultado no periodo', icon: WalletCards, tone: result < 0 ? 'red' : 'green' },
    { label: 'Saldo Projetado', value: formatCurrency(projectedBalance || result), hint: 'Projecao consolidada', icon: LineChart, tone: projectedBalance < 0 ? 'amber' : 'blue' },
    { label: 'Entradas', value: formatCurrency(inflows), hint: 'Receitas no periodo', icon: TrendingUp, tone: 'green' },
    { label: 'Saidas', value: formatCurrency(outflows), hint: 'Despesas no periodo', icon: TrendingDown, tone: 'red' },
    { label: 'Resultado', value: formatCurrency(result), hint: 'Entradas menos saidas', icon: BarChart3, tone: result < 0 ? 'red' : 'blue' },
    { label: 'Fluxo Liquido', value: formatCurrency(result), hint: 'Fluxo realizado/projetado', icon: Activity, tone: result < 0 ? 'red' : 'green' },
    { label: 'Capital de Giro', value: formatCurrency(workingCapital), hint: 'Receber 30d - pagar 30d', icon: BriefcaseBusiness, tone: workingCapital < 0 ? 'amber' : 'blue' },
    { label: 'Contas Receber', value: formatCurrency(openReceivables || receivable30d), hint: 'Aberto e a vencer', icon: Receipt, tone: 'green' },
    { label: 'Contas Pagar', value: formatCurrency(openPayables || payable30d), hint: 'Aberto e a vencer', icon: CreditCard, tone: 'red' },
    { label: 'Inadimplencia', value: formatCurrency(overdueReceivables), hint: 'Recebiveis vencidos', icon: AlertTriangle, tone: overdueReceivables > 0 ? 'amber' : 'green' },
    { label: 'Glosas', value: formatCurrency(glosses), hint: 'Receitas glosadas', icon: AlertTriangle, tone: glosses > 0 ? 'amber' : 'slate' },
    { label: 'Margem Operacional', value: `${percentFormatter.format(margin)}%`, hint: 'Resultado / entradas', icon: PieChart, tone: margin < 0 ? 'red' : 'blue' },
    { label: 'EBITDA Caixa', value: formatCurrency(consolidation?.result?.ebitda ?? result), hint: 'Resultado operacional caixa', icon: Banknote, tone: result < 0 ? 'red' : 'green' },
    { label: 'Resultado Operacional', value: formatCurrency(consolidation?.result?.operatingIncome ?? result), hint: 'Antes de distribuicoes', icon: BarChart3, tone: result < 0 ? 'red' : 'blue' },
    { label: 'Receita Media', value: formatCurrency(inflows / periodDays), hint: 'Media diaria', icon: TrendingUp, tone: 'green' },
    { label: 'Despesa Media', value: formatCurrency(outflows / periodDays), hint: 'Media diaria', icon: TrendingDown, tone: 'red' },
    { label: 'Ticket Medio', value: formatCurrency(inflows / receivedCount), hint: 'Receita por recebimento', icon: Stethoscope, tone: 'violet' },
    { label: 'Repasse Medico', value: formatCurrency(medicalRepasse), hint: 'Honorarios e repasses', icon: BriefcaseBusiness, tone: 'amber' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <RankingPanel title="Fluxo mensal acumulado" icon={LineChart} rows={monthlyRows} tone="blue" />
        <RankingPanel title="Receita por convenio" icon={PieChart} rows={revenueByPayer} tone="emerald" />
        <RankingPanel title="Receita por profissional" icon={Stethoscope} rows={revenueByProfessional} tone="emerald" />
        <RankingPanel title="Receita por clinica" icon={BriefcaseBusiness} rows={clinicRevenue} tone="emerald" />
        <RankingPanel title="Despesas por categoria" icon={TrendingDown} rows={expensesByCategory} tone="rose" />
        <RankingPanel title="Despesas por centro de custo" icon={BarChart3} rows={expensesByCostCenter} tone="rose" />
        <RankingPanel title="Distribuicao bancaria" icon={Banknote} rows={bankDistribution} tone="blue" />
        <RankingPanel title="Fluxo diario" icon={CalendarClock} rows={groupByLabel(dailyData, (row) => row.date || 'Sem data', (row) => money(row.inflow) - money(row.outflow), 8)} tone="blue" />
        <RankingPanel title="Receita x despesa" icon={Activity} rows={[{ label: 'Receitas', value: inflows }, { label: 'Despesas', value: outflows }]} tone="blue" />
      </div>
    </div>
  );
}