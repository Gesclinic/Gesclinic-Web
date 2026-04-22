import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useCashDashboard, type CashDashboardFilters } from './hooks/useCashDashboard';
import { CashFilters } from './components/CashFilters';
import { CashCards } from './components/CashCards';
import { CashCharts } from './components/CashCharts';
import { CashMovementsTable } from './components/CashMovementsTable';
import { CashProfessionalsTable } from './components/CashProfessionalsTable';
import { CashPayersTable } from './components/CashPayersTable';
import { RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CashDashboardPage() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Caixa Gerencial' }
  ]);

  const { clinicId } = useAuth();
  const [filters, setFilters] = useState<CashDashboardFilters>({});
  const [professionals, setProfessionals] = useState<Array<{ id: string; name: string }>>([]);
  const [payers, setPayers] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState('visao-geral');

  const { data, loading, error, refetch } = useCashDashboard(clinicId || '', filters);

  // Carregar profissionais e convÃªnios
  useEffect(() => {
    if (!clinicId) return;

    const loadMetadata = async () => {
      try {
        const [profsRes, payersRes] = await Promise.all([
          supabase
            .from('professionals')
            .select('id, name')
            .eq('clinic_id', clinicId)
            .order('name'),
          supabase
            .from('payers')
            .select('id, name')
            .eq('clinic_id', clinicId)
            .order('name')
        ]);

        if (profsRes.data) setProfessionals(profsRes.data);
        if (payersRes.data) setPayers(payersRes.data);
      } catch (err) {
        console.error('Erro ao carregar metadata:', err);
      }
    };

    loadMetadata();
  }, [clinicId]);

  const handleExport = () => {
    const headers = [
      'Data',
      'Paciente',
      'Profissional',
      'Tipo',
      'ConvÃªnio',
      'Forma Pagamento',
      'Origem',
      'Valor'
    ];

    const rows = data.movimentos.map((mov) => [
      new Date(mov.created_at).toLocaleDateString('pt-BR'),
      mov.patient?.name || '—',
      mov.professional?.name || '—',
      mov.type === 'entrada' ? 'Entrada' : 'Saída',
      mov.payer?.name || 'Particular',
      mov.payment_method || '—',
      mov.origin === 'agenda' ? 'Agenda' : 'Manual',
      mov.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]);

    const csv = [headers, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `caixa-gerencial-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <PageLayout
        breadcrumbs={breadcrumbs}
        title="Caixa Gerencial"
        subtitle="Erro ao carregar dashboard"
      >
        <div className="p-6 text-center text-red-600">{error}</div>
      </PageLayout>
    );
  }

  const tabs = [
    { id: 'visao-geral', label: 'ðŸ“Š VisÃ£o Geral' },
    { id: 'movimentos', label: 'ðŸ“ Movimentos' },
    { id: 'profissionais', label: 'ðŸ‘¨â€âš•ï¸ Profissionais' },
    { id: 'convenios', label: 'ðŸ¥ ConvÃªnios' }
  ];

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Caixa Gerencial"
      subtitle="Dashboard financeiro completo com anÃ¡lise de movimentos, profissionais e convÃªnios"
    >
      <div className="space-y-6">
        {/* Filtros e BotÃµes */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end gap-4">
          <div className="flex-1 w-full">
            <CashFilters
              filters={filters}
              onFiltersChange={setFilters}
              professionals={professionals}
              payers={payers}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={loading || data.movimentos.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Cards Principais */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-slate-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <CashCards
              totalReceita={data.totalReceita}
              totalDespesas={data.totalDespesas}
              resultado={data.resultado}
              receitaParticular={data.receitaParticular}
              receitaConvenio={data.receitaConvenio}
              repasseTotal={data.repasseTotal}
            />
          )}
        </div>

        {/* Abas */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 flex flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-blue-600'
                    : 'text-slate-600 border-b-transparent hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Aba: VisÃ£o Geral */}
            {activeTab === 'visao-geral' && (
              <div>
                {loading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-80 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <CashCharts
                    porOrigem={data.porOrigem}
                    porProfissional={data.porProfissional}
                    porServico={data.porServico}
                    evolucaoDiaria={data.evolucaoDiaria}
                  />
                )}
              </div>
            )}

            {/* Aba: Movimentos */}
            {activeTab === 'movimentos' && (
              <CashMovementsTable movements={data.movimentos} loading={loading} />
            )}

            {/* Aba: Profissionais */}
            {activeTab === 'profissionais' && (
              <CashProfessionalsTable professionals={data.porProfissional} loading={loading} />
            )}

            {/* Aba: ConvÃªnios */}
            {activeTab === 'convenios' && (
              <CashPayersTable payers={data.porConvenio} loading={loading} />
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}




