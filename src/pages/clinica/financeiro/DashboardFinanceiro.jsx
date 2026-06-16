import React, { useCallback, useEffect, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import DashboardAtendimentos from '@/pages/clinica/dashboard/DashboardAtendimentos';
import DashboardFaturamento from '@/pages/clinica/dashboard/DashboardFaturamento';
import DashboardEstoque from '@/pages/clinica/dashboard/DashboardEstoque';
import DashboardRepasses from '@/pages/clinica/dashboard/DashboardRepasses';
import DashboardOrcamentos from '@/pages/clinica/dashboard/DashboardOrcamentos';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useDataCache } from '@/hooks/useDataCache';
import { buildDerivedFinancialTransactions, getFinancialConsolidation } from '@/lib/financialConsolidationApi';

export default function DashboardFinanceiro() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Dashboard' },
  ]);
  const [tab, setTab] = useState('financeiro');
  const { clinicId: authClinicId } = useAuth();
  const clinicContext = useClinicContext();
  const clinicId = clinicContext?.clinicId || authClinicId;

  const [kpi, setKpi] = useState({ entradas: 0, saidas: 0, resultado_liquido: 0, saldo_final: 0, recentes: [] });
  const [period] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: iso(start), end: iso(end) };
  });

  const loadFinancialKpi = useCallback(async () => {
    try {
      const consolidation = await getFinancialConsolidation(clinicId, period.start, period.end);
      const entradas = consolidation.revenue.grossRevenue;
      const saidas = consolidation.expenses.totalWithCardFees;
      const resultado_liquido = consolidation.result.netIncome;
      const saldo_final = resultado_liquido;
      const recentes = buildDerivedFinancialTransactions(consolidation)
        .sort((a, b) => String(b.transaction_date || b.created_at || '').localeCompare(String(a.transaction_date || a.created_at || '')))
        .slice(0, 5);

      return {
        entradas: Number(entradas || 0),
        saidas: Number(saidas || 0),
        resultado_liquido: Number(resultado_liquido || 0),
        saldo_final: Number(saldo_final || 0),
        recentes,
      };
    } catch (error) {
      console.error('Error fetching KPI:', error);
      return { entradas: 0, saidas: 0, resultado_liquido: 0, saldo_final: 0, recentes: [] };
    }
  }, [clinicId, period.end, period.start]);

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

  const dashboards = [
    { label: 'Financeiro', tab: 'financeiro' },
    { label: 'Atendimentos', tab: 'atendimentos' },
    { label: 'Faturamento', tab: 'faturamento' },
    { label: 'Estoque', tab: 'estoque' },
    { label: 'Repasses', tab: 'repasses' },
    { label: 'Orçamentos', tab: 'orcamentos' },
  ];

  const kpiCards = [
    {
      title: 'Entradas do mês',
      value: kpi.entradas,
      color: 'text-green-700',
      border: 'border-l-green-600',
    },
    {
      title: 'Saídas do mês',
      value: kpi.saidas,
      color: 'text-red-600',
      border: 'border-l-red-600',
    },
    {
      title: 'Saldo Atual',
      value: kpi.saldo_final,
      color: kpi.saldo_final >= 0 ? 'text-blue-600' : 'text-red-600',
      border: kpi.saldo_final >= 0 ? 'border-l-blue-600' : 'border-l-red-600',
    },
  ];

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Dashboard da Clínica"
      subtitle="Visão geral dos indicadores da clínica."
    >
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg bg-slate-100 p-1">
          {dashboards.map((dashboard) => (
            <TabsTrigger
              key={dashboard.tab}
              value={dashboard.tab}
              className="min-h-9 shrink-0 rounded-md px-4 text-sm data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm"
            >
              {dashboard.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="financeiro" className="mt-0 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            {kpiCards.map((card) => (
              <Card key={card.title} className={cn('min-h-[112px] rounded-lg border-l-4 bg-white p-6 shadow-sm', card.border)}>
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className={cn('mt-3 text-2xl font-bold tracking-normal', card.color)}>
                  {loading ? 'Carregando...' : formatCurrency(card.value)}
                </p>
              </Card>
            ))}
          </div>

          <Card className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-950">Movimentações recentes</h3>
                <p className="text-sm text-slate-500">Competência de {formatDate(period.start)} a {formatDate(period.end)}</p>
              </div>
            </div>

            {kpi.recentes?.length ? (
              <div className="divide-y divide-slate-100">
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
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Nenhuma movimentação encontrada.</p>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="atendimentos">
          <DashboardAtendimentos />
        </TabsContent>
        <TabsContent value="faturamento">
          <DashboardFaturamento />
        </TabsContent>
        <TabsContent value="estoque">
          <DashboardEstoque />
        </TabsContent>
        <TabsContent value="repasses">
          <DashboardRepasses />
        </TabsContent>
        <TabsContent value="orcamentos">
          <DashboardOrcamentos />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
