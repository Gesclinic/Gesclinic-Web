import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useDataCache } from '@/hooks/useDataCache';
import { buildDerivedFinancialTransactions, getFinancialConsolidation } from '@/lib/financialConsolidationApi';

function calcPctDelta(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (p === 0) {
    if (c === 0) return 0;
    return 100;
  }
  return ((c - p) / Math.abs(p)) * 100;
}

export default function DashboardFinanceiro() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Dashboard' },
  ]);
  const { clinicId: authClinicId } = useAuth();
  const clinicContext = useClinicContext();
  const clinicId = clinicContext?.clinicId || authClinicId;

  const [kpi, setKpi] = useState({
    entradas: 0,
    saidas: 0,
    resultado_liquido: 0,
    saldo_final: 0,
    receita_liquida: 0,
    recebiveis_aberto: 0,
    pagar_aberto: 0,
    taxa_cartao: 0,
    margem_liquida_pct: 0,
    compare: {
      entradas: 0,
      saidas: 0,
      saldo_final: 0,
      receita_liquida: 0,
      recebiveis_aberto: 0,
      pagar_aberto: 0,
      taxa_cartao: 0,
    },
    recentes: [],
  });
  const [period] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      start: iso(start),
      end: iso(end),
      prevStart: iso(prevStart),
      prevEnd: iso(prevEnd),
    };
  });

  const loadFinancialKpi = useCallback(async () => {
    try {
      const [consolidation, previousConsolidation] = await Promise.all([
        getFinancialConsolidation(clinicId, period.start, period.end),
        getFinancialConsolidation(clinicId, period.prevStart, period.prevEnd),
      ]);
      const entradas = consolidation.revenue.grossRevenue;
      const saidas = consolidation.expenses.totalWithCardFees;
      const resultado_liquido = consolidation.result.netIncome;
      const saldo_final = resultado_liquido;
      const receita_liquida = consolidation.revenue.netRevenue;
      const recebiveis_aberto = consolidation.revenue.openReceivables;
      const pagar_aberto = consolidation.expenses.open;
      const taxa_cartao = consolidation.revenue.cardFees;
      const margem_liquida_pct = consolidation.result.netMarginPct;

      const prevEntradas = previousConsolidation.revenue.grossRevenue;
      const prevSaidas = previousConsolidation.expenses.totalWithCardFees;
      const prevSaldoFinal = previousConsolidation.result.netIncome;
      const prevReceitaLiquida = previousConsolidation.revenue.netRevenue;
      const prevRecebiveisAberto = previousConsolidation.revenue.openReceivables;
      const prevPagarAberto = previousConsolidation.expenses.open;
      const prevTaxaCartao = previousConsolidation.revenue.cardFees;

      const recentes = buildDerivedFinancialTransactions(consolidation)
        .sort((a, b) => String(b.transaction_date || b.created_at || '').localeCompare(String(a.transaction_date || a.created_at || '')))
        .slice(0, 5);

      return {
        entradas: Number(entradas || 0),
        saidas: Number(saidas || 0),
        resultado_liquido: Number(resultado_liquido || 0),
        saldo_final: Number(saldo_final || 0),
        receita_liquida: Number(receita_liquida || 0),
        recebiveis_aberto: Number(recebiveis_aberto || 0),
        pagar_aberto: Number(pagar_aberto || 0),
        taxa_cartao: Number(taxa_cartao || 0),
        margem_liquida_pct: Number(margem_liquida_pct || 0),
        compare: {
          entradas: calcPctDelta(entradas, prevEntradas),
          saidas: calcPctDelta(saidas, prevSaidas),
          saldo_final: calcPctDelta(saldo_final, prevSaldoFinal),
          receita_liquida: calcPctDelta(receita_liquida, prevReceitaLiquida),
          recebiveis_aberto: calcPctDelta(recebiveis_aberto, prevRecebiveisAberto),
          pagar_aberto: calcPctDelta(pagar_aberto, prevPagarAberto),
          taxa_cartao: calcPctDelta(taxa_cartao, prevTaxaCartao),
        },
        recentes,
      };
    } catch (error) {
      console.error('Error fetching KPI:', error);
      return {
        entradas: 0,
        saidas: 0,
        resultado_liquido: 0,
        saldo_final: 0,
        receita_liquida: 0,
        recebiveis_aberto: 0,
        pagar_aberto: 0,
        taxa_cartao: 0,
        margem_liquida_pct: 0,
        compare: {
          entradas: 0,
          saidas: 0,
          saldo_final: 0,
          receita_liquida: 0,
          recebiveis_aberto: 0,
          pagar_aberto: 0,
          taxa_cartao: 0,
        },
        recentes: [],
      };
    }
  }, [clinicId, period.end, period.prevEnd, period.prevStart, period.start]);

  const { data: cachedKpi, loading } = useDataCache({
    key: `dashboard_financeiro_kpi_v4_${clinicId}_${period.start}_${period.end}`,
    fetcher: loadFinancialKpi,
    ttl: 5 * 60 * 1000,
    enabled: !!clinicId,
  });

  useEffect(() => {
    if (cachedKpi) {
      setKpi(cachedKpi);
    }
  }, [cachedKpi]);

  const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (value) => {
    if (!value) {
      return '-';
    }
    const [year, month, day] = String(value).split('T')[0].split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

  const formatDescription = (value) => String(value || 'Lançamento financeiro')
    .replace(/OP�+O/gi, 'OPÇÃO')
    .replace(/�+/g, '')
    .trim();

  const formatPercent = (value) => `${Number(value || 0).toFixed(2).replace('.', ',')}%`;

  const formatDelta = (value) => {
    const n = Number(value || 0);
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2).replace('.', ',')}%`;
  };

  const quickActions = [
    { label: 'Fluxo de Caixa', to: '/clinica/financeiro/fluxo-caixa' },
    { label: 'Contas a Receber', to: '/clinica/financeiro/receber' },
    { label: 'Contas a Pagar', to: '/clinica/financeiro/contas-pagar' },
    { label: 'DRE', to: '/clinica/financeiro/resultado' },
    { label: 'Repasse Médico', to: '/clinica/financeiro/repasse/dashboard-executivo' },
  ];

  const kpiCards = [
    {
      title: 'Entradas do mês',
      compareKey: 'entradas',
      value: kpi.entradas,
      color: 'text-green-700',
      border: 'border-l-green-600',
    },
    {
      title: 'Saídas do mês',
      compareKey: 'saidas',
      value: kpi.saidas,
      color: 'text-red-600',
      border: 'border-l-red-600',
    },
    {
      title: 'Saldo Atual',
      compareKey: 'saldo_final',
      value: kpi.saldo_final,
      color: kpi.saldo_final >= 0 ? 'text-blue-600' : 'text-red-600',
      border: kpi.saldo_final >= 0 ? 'border-l-blue-600' : 'border-l-red-600',
    },
    {
      title: 'Receita líquida',
      compareKey: 'receita_liquida',
      value: kpi.receita_liquida,
      color: 'text-emerald-700',
      border: 'border-l-emerald-600',
    },
    {
      title: 'Recebíveis em aberto',
      compareKey: 'recebiveis_aberto',
      value: kpi.recebiveis_aberto,
      color: 'text-amber-700',
      border: 'border-l-amber-500',
    },
    {
      title: 'A pagar em aberto',
      compareKey: 'pagar_aberto',
      value: kpi.pagar_aberto,
      color: 'text-orange-700',
      border: 'border-l-orange-500',
    },
    {
      title: 'Taxas de cartão',
      compareKey: 'taxa_cartao',
      value: kpi.taxa_cartao,
      color: 'text-fuchsia-700',
      border: 'border-l-fuchsia-500',
    },
  ];

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Dashboard Financeiro"
      subtitle="Visão executiva de caixa, resultado, recebíveis e despesas da competência atual."
    >
      <div className="space-y-5">
        <Card className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">Competência: {formatDate(period.start)} até {formatDate(period.end)}</p>
            <p className="text-xs text-slate-500">Comparação: {formatDate(period.prevStart)} até {formatDate(period.prevEnd)}</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <Card key={card.title} className={cn('min-h-[112px] rounded-lg border-l-4 bg-white p-6 shadow-sm', card.border)}>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <p className={cn('mt-3 text-2xl font-bold tracking-normal', card.color)}>
                {loading ? 'Carregando...' : formatCurrency(card.value)}
              </p>
              <p className={cn('mt-1 text-xs font-medium', Number(kpi.compare?.[card.compareKey] || 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {loading ? '...' : `${formatDelta(kpi.compare?.[card.compareKey] || 0)} vs mês anterior`}
              </p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-lg bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="font-semibold text-slate-950">Movimentações recentes</h3>
            <p className="text-sm text-slate-500">Últimos lançamentos consolidados da competência</p>

            {kpi.recentes?.length ? (
              <div className="mt-3 divide-y divide-slate-100">
                {kpi.recentes.map((item) => (
                  <div key={item.id} className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 sm:text-base" title={formatDescription(item.description)}>
                        {formatDescription(item.description)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(item.transaction_date)}</p>
                    </div>
                    <p className={`whitespace-nowrap text-sm font-semibold sm:text-base ${item.type === 'revenue' ? 'text-green-700' : 'text-red-600'}`}>
                      {item.type === 'revenue' ? '+' : '-'}{formatCurrency(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Nenhuma movimentação encontrada.</p>
            )}
          </Card>

          <Card className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-950">Radar financeiro</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Margem líquida</span>
                <span className={cn('font-semibold', kpi.margem_liquida_pct >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {formatPercent(kpi.margem_liquida_pct)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Resultado líquido</span>
                <span className={cn('font-semibold', kpi.resultado_liquido >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {loading ? 'Carregando...' : formatCurrency(kpi.resultado_liquido)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Gap (receber - pagar)</span>
                <span className={cn('font-semibold', (kpi.recebiveis_aberto - kpi.pagar_aberto) >= 0 ? 'text-blue-700' : 'text-red-600')}>
                  {loading ? 'Carregando...' : formatCurrency(kpi.recebiveis_aberto - kpi.pagar_aberto)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
