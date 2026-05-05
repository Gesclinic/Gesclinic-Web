import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DashboardAtendimentos from '@/pages/clinica/dashboard/DashboardAtendimentos';
import DashboardFaturamento from '@/pages/clinica/dashboard/DashboardFaturamento';
import DashboardEstoque from '@/pages/clinica/dashboard/DashboardEstoque';
import DashboardRepasses from '@/pages/clinica/dashboard/DashboardRepasses';
import DashboardOrcamentos from '@/pages/clinica/dashboard/DashboardOrcamentos';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useDataCache, CacheManager } from '@/hooks/useDataCache';

export default function DashboardFinanceiro() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Dashboard' },
  ]);
  const [tab, setTab] = useState('financeiro');
  const navigate = useNavigate();
  const { clinicId } = useAuth();

  const [kpi, setKpi] = useState({ entradas: 0, saidas: 0, resultado_liquido: 0, saldo_final: 0 });
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: iso(start), end: iso(end) };
  });

  // 💾 Cache para KPI (5 minutos TTL - dados financeiros mudam frequentemente)
  const { data: cachedKpi, loading: kpiLoading } = useDataCache({
    key: `dashboard_financeiro_kpi_${clinicId}_${period.start}_${period.end}`,
    fetcher: async () => {
      const { data, error } = await supabase.rpc('cashflow_summary', {
        p_clinic_id: clinicId,
        p_start: period.start,
        p_end: period.end,
      });
      if (error) {
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return row
        ? {
          entradas: Number(row.entradas || 0),
          saidas: Number(row.saidas || 0),
          resultado_liquido: Number(row.resultado_liquido || 0),
          saldo_final: Number(row.saldo_final || 0),
        }
        : { entradas: 0, saidas: 0, resultado_liquido: 0, saldo_final: 0 };
    },
    ttl: 5 * 60 * 1000, // 5 minutos (dados financeiros mudam frequentemente)
    enabled: !!clinicId,
  });

  // Sincronizar KPI em cache com estado local
  useEffect(() => {
    if (cachedKpi) {
      setKpi(cachedKpi);
    }
  }, [cachedKpi]);

  const dashboards = [
    { label: 'Financeiro', tab: 'financeiro' },
    { label: 'Atendimentos', tab: 'atendimentos' },
    { label: 'Faturamento', tab: 'faturamento' },
    { label: 'Estoque', tab: 'estoque' },
    { label: 'Repasses', tab: 'repasses' },
    { label: 'Orçamentos', tab: 'orcamentos' },
  ];

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Dashboard da Clínica"
      subtitle="Visão geral dos indicadores da clínica."
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {dashboards.map((d) => (
          <button
            key={d.tab}
            className={`rounded-lg border border-gray-200 bg-white shadow-sm p-4 flex flex-col items-center hover:bg-blue-50 transition font-medium ${tab === d.tab ? 'ring-2 ring-blue-400' : ''}`}
            onClick={() => setTab(d.tab)}
            type="button"
          >
            {d.label}
          </button>
        ))}
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="repasses">Repasses</TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
        </TabsList>
        <TabsContent value="financeiro">
          {/* Conteúdo do dashboard financeiro atual */}
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <Card className="p-6">
              <h3 className="text-gray-600 text-sm">Entradas do mês</h3>
              <p className="text-2xl font-bold text-green-700 mt-2">
                {kpi.entradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-gray-600 text-sm">Saídas do mês</h3>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {kpi.saidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-gray-600 text-sm">Saldo Atual</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {kpi.saldo_final.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </Card>
          </div>
          <Card className="p-6 mt-6">
            <h3 className="font-semibold mb-2">Movimentações recentes</h3>
            <p className="text-gray-500">Nenhuma movimentação encontrada.</p>
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
