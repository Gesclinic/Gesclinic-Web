import React from 'react';

type ViewMode = 'executive' | 'spreadsheet';
type AccountingMode = 'realized' | 'accrual';

interface CashFlowWorkbookModelProps {
  viewMode?: ViewMode;
  accountingMode?: AccountingMode;
  summary?: {
    total_inflows?: number;
    total_outflows?: number;
    net_balance?: number;
    saldo_atual?: number;
  } | null;
  dailyData?: Array<{
    date?: string;
    inflow?: number;
    outflow?: number;
    balance_change?: number;
    cumulative_balance?: number;
    balance?: number;
  }>;
  receivable30d?: number;
  payable30d?: number;
  projectedBalance?: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export default function CashFlowWorkbookModel({
  viewMode = 'executive',
  accountingMode = 'realized',
  summary,
  dailyData = [],
  receivable30d = 0,
  payable30d = 0,
  projectedBalance = 0,
}: CashFlowWorkbookModelProps) {
  const regimeLabel = accountingMode === 'accrual' ? 'Competência' : 'Caixa (Realizado)';

  const executiveCards = [
    { label: `Entradas (${regimeLabel})`, value: formatCurrency(summary?.total_inflows || 0) },
    { label: `Saídas (${regimeLabel})`, value: formatCurrency(summary?.total_outflows || 0) },
    { label: 'Saldo do período', value: formatCurrency(summary?.net_balance || 0) },
    { label: 'Saldo projetado (30d)', value: formatCurrency(projectedBalance) },
  ];

  const rows = (Array.isArray(dailyData) ? dailyData : [])
    .slice()
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .slice(-10)
    .map((item) => {
      const net = Number(item.balance_change ?? (Number(item.inflow || 0) - Number(item.outflow || 0)));
      return {
        date: item.date,
        description: accountingMode === 'accrual' ? 'Movimento diário por competência' : 'Movimento diário realizado',
        type: net >= 0 ? 'Entrada' : 'Saída',
        amount: Math.abs(net),
        balance: Number(item.cumulative_balance ?? item.balance ?? 0),
      };
    });

  const rowsInflows = rows
    .filter((row) => row.type === 'Entrada')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const rowsOutflows = rows
    .filter((row) => row.type !== 'Entrada')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const rowsNet = rowsInflows - rowsOutflows;

  const cardsInflows = Number(summary?.total_inflows || 0);
  const cardsOutflows = Number(summary?.total_outflows || 0);
  const cardsNet = Number(summary?.net_balance || 0);

  const deltaInflows = Number((cardsInflows - rowsInflows).toFixed(2));
  const deltaOutflows = Number((cardsOutflows - rowsOutflows).toFixed(2));
  const deltaNet = Number((cardsNet - rowsNet).toFixed(2));

  const isZeroDelta = (value: number) => Math.abs(Number(value || 0)) < 0.01;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Modelo de workbook</p>
            <h2 className="text-lg font-semibold text-slate-900">Fluxo de caixa consolidado do período</h2>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {viewMode === 'spreadsheet' ? `Visualização em planilha • ${regimeLabel}` : `Resumo executivo • ${regimeLabel}`}
          </span>
        </div>
      </div>

      {viewMode === 'spreadsheet' ? (
        <div className="space-y-4 p-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Data</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Descrição</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Valor</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? rows.map((row) => (
                  <tr key={`${row.date}-${row.balance}`} className="odd:bg-white even:bg-slate-50/70">
                    <td className="border-b border-slate-100 px-4 py-3 whitespace-nowrap text-slate-600">{formatDate(row.date)}</td>
                    <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">{row.description}</td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.type === 'Entrada' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatCurrency(row.amount)}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatCurrency(row.balance)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      {accountingMode === 'accrual'
                        ? 'Sem movimentações por competência no período selecionado.'
                        : 'Sem movimentações realizadas no período selecionado.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Conferência de Cálculo (Cards x Linhas)</p>
            <div className="mt-3 grid gap-2 text-sm">
              {[
                { label: 'Entradas', cards: cardsInflows, rows: rowsInflows, delta: deltaInflows },
                { label: 'Saídas', cards: cardsOutflows, rows: rowsOutflows, delta: deltaOutflows },
                { label: 'Saldo', cards: cardsNet, rows: rowsNet, delta: deltaNet },
              ].map((item) => (
                <div key={item.label} className="grid grid-cols-1 gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 md:grid-cols-[0.8fr_1fr_1fr_1fr]">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-slate-600">Cards: {formatCurrency(item.cards)}</span>
                  <span className="text-slate-600">Linhas: {formatCurrency(item.rows)}</span>
                  <span className={isZeroDelta(item.delta) ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                    Delta: {formatCurrency(item.delta)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {executiveCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Resumo operacional</p>
                  <p className="text-sm text-slate-600">Visão compacta para leitura rápida do fluxo projetado.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Plano mensal</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['A receber (30d)', formatCurrency(receivable30d), 'text-emerald-700'],
                  ['A pagar (30d)', formatCurrency(payable30d), 'text-rose-700'],
                  ['Saldo projetado', formatCurrency(projectedBalance), 'text-slate-900'],
                ].map(([label, value, tone]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className={`text-sm font-semibold ${tone}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">Leitura sugerida</p>
              <ul className="mt-3 space-y-2 text-sm text-blue-900/90">
                <li>• Dados refletindo o período e regime selecionados no topo.</li>
                <li>• Linhas diárias consolidadas sem lançamentos fictícios.</li>
                <li>• Use a visão planilha para auditar o comportamento do saldo.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}