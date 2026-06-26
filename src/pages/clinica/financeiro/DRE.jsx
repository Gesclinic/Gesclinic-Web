import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/useClinicContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  TrendingUpIcon,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getDREData, getMarginAnalysis, getRevenueByService, getExpenseByCategory, comparePeriods } from '@/lib/dreApi';
import RelatoriosToolbar from '@/components/financeiro/RelatoriosToolbar';
import useFinancialDRE from '@/modules/financeiro/dre/hooks/useFinancialDRE';
import DREVariantSelector from '@/modules/financeiro/dre/components/DREVariantSelector';
import DREKpis from '@/modules/financeiro/dre/components/DREKpis';
import DRETable from '@/modules/financeiro/dre/components/DRETable';
import DREComparisonCard from '@/modules/financeiro/dre/components/DREComparison';
import DREBenchmark from '@/modules/financeiro/dre/components/DREBenchmark';
import DREAlerts from '@/modules/financeiro/dre/components/DREAlerts';
import DRECashflowComparison from '@/modules/financeiro/dre/components/DRECashflowComparison';
import DRERentabilidade from '@/modules/financeiro/dre/components/DRERentabilidade';
import DREMedicoPanel from '@/modules/financeiro/dre/components/DREMedicoPanel';
import DREConvenioPanel from '@/modules/financeiro/dre/components/DREConvenioPanel';
import DREUnidadePanel from '@/modules/financeiro/dre/components/DREUnidadePanel';
import DRECharts from '@/modules/financeiro/dre/components/DRECharts';
import DREIntegrationStatus from '@/modules/financeiro/dre/components/DREIntegrationStatus';
import ScenarioPanel from '@/modules/financeiro/fluxo-caixa/components/ScenarioPanel';
import ForecastPanel from '@/modules/financeiro/fluxo-caixa/components/ForecastPanel';
import { listProfessionals } from '@/lib/professionalsApi';
import { listPayers } from '@/lib/payersApi';
import { listHealthInsurances } from '@/lib/healthInsurancesApi';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * 📊 DRE - Demonstração de Resultado do Exercício
 * 
 * Mostra:
 * - DRE estruturada (receitas, custos, despesas, impostos, lucro)
 * - Margens vs benchmarks
 * - Receitas por serviço
 * - Despesas por categoria
 * - Comparação com período anterior
 */
export default function DREPage() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'DRE' },
  ]);

  const { clinic } = useClinicContext();
  const clinicId = clinic?.id;
  const [showLegacy, setShowLegacy] = useState(false);
  const [professionals, setProfessionals] = useState([]);
  const [payers, setPayers] = useState([]);
  const [healthInsurances, setHealthInsurances] = useState([]);
  const [units, setUnits] = useState([]);

  const enterpriseDRE = useFinancialDRE(clinicId || '', 'gerencial', {
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Estados
  const [dre, setDRE] = useState(null);
  const [margins, setMargins] = useState(null);
  const [revenueByService, setRevenueByService] = useState([]);
  const [expenseByCategory, setExpenseByCategory] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!clinicId) return;

    let active = true;

    const loadReferenceData = async () => {
      const [profs, payersData, insurances, costCentersRes] = await Promise.all([
        listProfessionals(clinicId).catch(() => []),
        listPayers(clinicId).catch(() => []),
        listHealthInsurances(clinicId).catch(() => []),
        supabase
          .from('financial_cost_centers')
          .select('id, name, unit_name, center_type, is_active')
          .eq('clinic_id', clinicId)
          .eq('is_active', true),
      ]);

      if (!active) return;

      setProfessionals(profs || []);
      setPayers(payersData || []);
      setHealthInsurances(insurances || []);

      const nextUnits = new Map();
      const pushUnit = (value, label, unitId, unitName) => {
        if (!value || !label || nextUnits.has(value)) return;
        nextUnits.set(value, { value, label, unitId, unitName });
      };

      (costCentersRes.data || []).forEach((row) => {
        const unitName = row.unit_name || row.name;
        if (!unitName) return;
        pushUnit(`unit:${String(unitName).trim().toLowerCase()}`, unitName, undefined, unitName);
      });

      setUnits(Array.from(nextUnits.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')));
    };

    loadReferenceData();

    return () => {
      active = false;
    };
  }, [clinicId, clinic?.brand_name, clinic?.name]);

  useEffect(() => {
    if (!clinicId) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Buscar em paralelo
        const [dreData, marginsData, revenueData, expenseData] = await Promise.all([
          getDREData(clinicId, dateRange.start, dateRange.end),
          getMarginAnalysis(clinicId, dateRange.start, dateRange.end),
          getRevenueByService(clinicId, dateRange.start, dateRange.end),
          getExpenseByCategory(clinicId, dateRange.start, dateRange.end),
        ]);

        setDRE(dreData);
        setMargins(marginsData);
        setRevenueByService(revenueData || []);
        setExpenseByCategory(expenseData || []);

        // Buscar comparação com período anterior
        const currentStart = new Date(`${dateRange.start}T00:00:00`);
        const currentEnd = new Date(`${dateRange.end}T00:00:00`);
        const rangeDays = Math.max(
          1,
          Math.floor((currentEnd.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)) + 1,
        );

        const prevEnd = new Date(currentStart);
        prevEnd.setDate(prevEnd.getDate() - 1);

        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - (rangeDays - 1));

        const compData = await comparePeriods(
          clinicId,
          { start: dateRange.start, end: dateRange.end },
          {
            start: prevStart.toISOString().split('T')[0],
            end: prevEnd.toISOString().split('T')[0],
          }
        );
        setComparison(compData);
      } catch (err) {
        console.error('Erro ao carregar DRE:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

  }, [clinicId, dateRange]);

  // Atualizar período
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);

    const end = new Date();
    let start = new Date();

    if (newPeriod === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (newPeriod === 'month') {
      start.setDate(end.getDate() - 30);
    } else if (newPeriod === 'quarter') {
      start.setDate(end.getDate() - 90);
    } else if (newPeriod === 'year') {
      start.setFullYear(end.getFullYear() - 1);
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });

    enterpriseDRE.setPeriod({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  const updateEnterpriseFilters = (patch) => {
    enterpriseDRE.setFilters({
      ...enterpriseDRE.filters,
      ...patch,
    });
  };

  const convenioOptions = [...payers, ...healthInsurances].reduce((acc, item) => {
    const id = item?.id ? String(item.id) : '';
    if (!id || acc.some((option) => option.id === id)) return acc;
    acc.push({ id, label: item.name || item.trade_name || item.razao_social || id });
    return acc;
  }, []);

  const projectedScenarioComparison = enterpriseDRE.variant === 'projetada' && enterpriseDRE.dre?.metadata?.forecastScenarios
    ? {
        conservador: enterpriseDRE.dre.metadata.forecastScenarios.conservador?.totals,
        realista: enterpriseDRE.dre.metadata.forecastScenarios.realista?.totals,
        otimista: enterpriseDRE.dre.metadata.forecastScenarios.otimista?.totals,
      }
    : null;

  const projectedScenario = enterpriseDRE.filters.projectedScenario || 'realista';
  const projectedScenarioLabel = {
    conservador: 'conservador',
    realista: 'realista',
    otimista: 'otimista',
  }[projectedScenario] || projectedScenario;

  const projectedForecast = enterpriseDRE.variant === 'projetada'
    ? enterpriseDRE.dre?.metadata?.forecastScenarios?.[projectedScenario] || null
    : null;

  const projectedHorizon = React.useMemo(() => {
    const start = new Date(`${enterpriseDRE.period.start}T00:00:00`);
    const end = new Date(`${enterpriseDRE.period.end}T00:00:00`);
    const diff = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    if (diff <= 30) return 30;
    if (diff <= 60) return 60;
    if (diff <= 90) return 90;
    if (diff <= 180) return 180;
    return 365;
  }, [enterpriseDRE.period.end, enterpriseDRE.period.start]);

  const variantBanner = {
    gerencial: {
      title: 'Visao gerencial',
      description: 'Resumo consolidado da operacao, com leitura completa de receita, custos, margem e resultado.',
      className: 'border-slate-200 bg-slate-50 text-slate-800',
    },
    contabil: {
      title: 'Visao contabil',
      description: 'Analise orientada a classificacao contabil, impostos, despesas e resultado liquido.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
    centro: {
      title: 'Visao centro de custo',
      description: 'Leitura por absorcao de custos, com foco em eficiencia operacional por centro.',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    },
    medico: {
      title: 'Visao medico',
      description: 'Produtividade, repasses e rentabilidade por profissional em destaque.',
      className: 'border-blue-200 bg-blue-50 text-blue-800',
    },
    convenio: {
      title: 'Visao convenio',
      description: 'Glosa, recebimento e saldo a receber por plano de saude.',
      className: 'border-teal-200 bg-teal-50 text-teal-800',
    },
    unidade: {
      title: 'Visao unidade',
      description: 'Comparativo entre unidades e leitura de EBITDA e lucro por filial.',
      className: 'border-violet-200 bg-violet-50 text-violet-800',
    },
    especialidade: {
      title: 'Visao especialidade',
      description: 'Comportamento de receita, margem e resultado por especialidade atendida.',
      className: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    },
    projetada: {
      title: 'Visao projetada',
      description: 'Cenarios futuros, burn rate, runway e saldo projetado de caixa.',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
    },
  }[enterpriseDRE.variant];

  const handleProjectedHorizonChange = (days) => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days - 1);
    enterpriseDRE.setPeriod({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  if (!clinicId) {
    return (
      <PageLayout breadcrumbs={breadcrumbs} title="DRE">
        <Card className="p-8 text-center text-gray-500">
          <p>Carregando informações da clínica...</p>
        </Card>
      </PageLayout>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const formatComparisonPct = (value, decimals = 2) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return 'N/A';
    }
    const numeric = Number(value);
    const sign = numeric >= 0 ? '+' : '';
    return `${sign}${numeric.toFixed(decimals)}%`;
  };

  const comparisonTrendIcon = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return 'ℹ️';
    }
    return Number(value) >= 0 ? '📈' : '📉';
  };

  const isComparisonPctNA = (value) => value === null || value === undefined || Number.isNaN(Number(value));
  const isGerencial = enterpriseDRE.variant === 'gerencial';
  const isContabil = enterpriseDRE.variant === 'contabil';
  const isCentro = enterpriseDRE.variant === 'centro';
  const isMedico = enterpriseDRE.variant === 'medico';
  const isConvenio = enterpriseDRE.variant === 'convenio';
  const isUnidade = enterpriseDRE.variant === 'unidade';
  const isEspecialidade = enterpriseDRE.variant === 'especialidade';
  const isProjetada = enterpriseDRE.variant === 'projetada';
  const showMedicoPanel = isMedico || isGerencial;
  const showConvenioPanel = isConvenio || isGerencial;
  const showUnidadePanel = isUnidade || isGerencial;
  const showEspecialidadePanel = isEspecialidade || isGerencial;
  const showAlerts = isGerencial || isProjetada;
  const showCashflowComparison = isGerencial || isProjetada;
  const showComparisonCard = isGerencial || isProjetada || isContabil || isCentro;
  const showBenchmark = isGerencial || isProjetada;
  const showRentabilidade = isGerencial || isProjetada;
  const showDreTable = isGerencial || isContabil || isCentro || isProjetada;
  const showCharts = !isProjetada;
  const showProfessionalFilter = isGerencial || isMedico;
  const showPayerFilter = isGerencial || isConvenio || isEspecialidade;
  const showUnitFilter = !isProjetada;
  const visibleFilterCount = [showProfessionalFilter, showPayerFilter, showUnitFilter].filter(Boolean).length + 1;
  const filterGridClass = visibleFilterCount <= 2
    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4'
    : visibleFilterCount === 3
      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
      : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4';

  const filterHintByVariant = {
    gerencial: 'Visão consolidada: use os filtros para cruzar médico, convênio e unidade.',
    contabil: 'Visão contábil: priorize unidade para analisar classificação e resultado.',
    centro: 'Visão centro de custo: filtre por unidade para localizar eficiência operacional.',
    medico: 'Visão médica: foque no profissional e compare produtividade no período.',
    convenio: 'Visão convênio: foque no pagador para acompanhar glosa e recebimento.',
    unidade: 'Visão unidade: compare desempenho por filial/unidade operacional.',
    especialidade: 'Visão especialidade: combine convênio e unidade para entender margens.',
    projetada: 'Visão projetada: os controles principais estão no cenário e no horizonte de forecast.',
  }[enterpriseDRE.variant];

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="📊 DRE - Demonstração de Resultado"
            subtitle="Análise de desempenho financeiro por competência (regime de competência)"
    >
      <div className="space-y-6 mt-6">
        <Card className="p-5 border-blue-200 bg-blue-50/40">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">DRE Enterprise 360</h2>
              <p className="text-sm text-gray-600">Motor novo com variantes, drill-down e benchmark. Base para ETAPA 4+.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => enterpriseDRE.refresh()}>
                Atualizar analise
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowLegacy((v) => !v)}>
                {showLegacy ? 'Exibir motor novo' : 'Exibir legado'}
              </Button>
            </div>
          </div>

          {!showLegacy ? (
            <div className="space-y-4">
            <DREVariantSelector value={enterpriseDRE.variant} onChange={enterpriseDRE.setVariant} />
            <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${variantBanner.className}`}>
              <div className="text-xs uppercase tracking-[0.2em] opacity-70">{variantBanner.title}</div>
              <div className="mt-1 leading-6">{variantBanner.description}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Filtros da visao</p>
              <p className="text-sm text-slate-700 mt-1 mb-3">{filterHintByVariant}</p>
              <div className={filterGridClass}>
                {showProfessionalFilter ? (
                  <div className="space-y-2">
                    <Label>Médico</Label>
                    <Select
                      value={enterpriseDRE.filters.professionalId || 'all'}
                      onValueChange={(value) => updateEnterpriseFilters({ professionalId: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {professionals.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id}>
                            {professional.name || professional.full_name || professional.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {showPayerFilter ? (
                  <div className="space-y-2">
                    <Label>Convênio</Label>
                    <Select
                      value={enterpriseDRE.filters.payerId || 'all'}
                      onValueChange={(value) => updateEnterpriseFilters({ payerId: value === 'all' ? undefined : value, convenioId: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {convenioOptions.map((payer) => (
                          <SelectItem key={payer.id} value={payer.id}>
                            {payer.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {showUnitFilter ? (
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select
                      value={enterpriseDRE.filters.unitId || enterpriseDRE.filters.unitName || 'all'}
                      onValueChange={(value) => {
                        if (value === 'all') {
                          updateEnterpriseFilters({ unitId: undefined, unidadeId: undefined, unitName: undefined });
                          return;
                        }

                        const unit = units.find((item) => item.value === value);
                        updateEnterpriseFilters({
                          unitId: unit?.unitId,
                          unidadeId: unit?.unitId,
                          unitName: unit?.unitName,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {units.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>Limpar</Label>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => enterpriseDRE.clearFilters()}
                  >
                    Remover filtros
                  </Button>
                </div>
              </div>
            </div>
            {isContabil ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Modo contabil ativo: linhas classificadas por conta contabil vinculada (chart_account_id/category_id) com fallback gerencial para lancamentos sem vinculo.
              </div>
            ) : null}
            {isCentro ? (
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                Modo centro de custo ativo: receitas e despesas agrupadas por financial_cost_centers / cost_center_id / centro_custo_id.
              </div>
            ) : null}
            {isMedico ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Modo médico ativo: foco em produção, repasses e rentabilidade por profissional.
              </div>
            ) : null}
            {isConvenio ? (
              <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                Modo convênio ativo: foco em glosas, recebimento e pendências por pagador.
              </div>
            ) : null}
            {isUnidade ? (
              <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                Modo unidade ativo: comparativo entre filiais com leitura de eficiência operacional.
              </div>
            ) : null}
            {isEspecialidade ? (
              <div className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
                Modo especialidade ativo: visão assistencial por linha de serviço e margem por especialidade.
              </div>
            ) : null}
            {isProjetada ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Modo projetado ativo: DRE derivada do motor de forecast com cenários conservador, realista e otimista usando o horizonte do período selecionado.
              </div>
            ) : null}
            {isProjetada && enterpriseDRE.dre?.summary ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Projeção ativa no cenário {projectedScenarioLabel}: burn rate diário, runway e saldos de caixa foram incorporados aos KPIs desta visão. O quadro de cenários abaixo compara conservador, realista e otimista sem duplicar a DRE.
              </div>
            ) : null}
            {(enterpriseDRE.filters.professionalId || enterpriseDRE.filters.payerId || enterpriseDRE.filters.unitName) ? (
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                Filtro ativo: {enterpriseDRE.filters.professionalId ? 'médico' : ''}
                {enterpriseDRE.filters.professionalId && enterpriseDRE.filters.payerId ? ' • ' : ''}
                {enterpriseDRE.filters.payerId ? 'convênio' : ''}
                {(enterpriseDRE.filters.professionalId || enterpriseDRE.filters.payerId) && enterpriseDRE.filters.unitName ? ' • ' : ''}
                {enterpriseDRE.filters.unitName ? 'unidade' : ''}
              </div>
            ) : null}
            {showAlerts ? (
              <DREAlerts summary={enterpriseDRE.dre?.summary || null} comparison={enterpriseDRE.comparison} />
            ) : null}
            {showCashflowComparison && (
              <DRECashflowComparison
                summary={enterpriseDRE.dre?.summary || null}
                loading={enterpriseDRE.loading}
              />
            )}
            <DREKpis
              summary={enterpriseDRE.dre?.summary || null}
              loading={enterpriseDRE.loading}
              variant={enterpriseDRE.variant}
              projectedScenarioLabel={isProjetada ? projectedScenarioLabel : undefined}
            />
            {isProjetada ? (
              <>
                <ScenarioPanel
                  comparison={projectedScenarioComparison}
                  activeScenario={projectedScenario}
                  onScenarioChange={(scenario) => updateEnterpriseFilters({ projectedScenario: scenario })}
                />
                <ForecastPanel
                  horizon={projectedHorizon}
                  onHorizonChange={handleProjectedHorizonChange}
                  forecast={projectedForecast}
                  loading={enterpriseDRE.loading}
                  projectedScenarioLabel={projectedScenarioLabel}
                />
              </>
            ) : null}
            {showDreTable ? (
              <DRETable
                lines={enterpriseDRE.dre?.lines || []}
                loading={enterpriseDRE.loading}
                onDrillDown={enterpriseDRE.drillDown}
                projectedScenarioLabel={isProjetada ? projectedScenarioLabel : undefined}
              />
            ) : null}
            {showComparisonCard ? (
              <DREComparisonCard
                comparison={enterpriseDRE.comparison}
                loading={enterpriseDRE.loadingComparison}
                projectedScenarioLabel={isProjetada ? projectedScenarioLabel : undefined}
                projectedHorizonDays={isProjetada ? projectedHorizon : undefined}
                titleOverride={
                  isContabil
                    ? 'Comparacao Contabil de Periodos'
                    : isCentro
                      ? 'Comparacao por Centro de Custo'
                      : undefined
                }
                descriptionOverride={
                  isContabil
                    ? 'Leitura focada em variacao de deducoes, despesas operacionais e resultado liquido contabil.'
                    : isCentro
                      ? 'Leitura focada em variacao de custos e eficiencia operacional por centro de custo.'
                      : undefined
                }
              />
            ) : null}
            {showBenchmark ? (
              <DREBenchmark
                benchmarks={enterpriseDRE.benchmarks}
                loading={enterpriseDRE.loadingBenchmark}
                projectedScenarioLabel={isProjetada ? projectedScenarioLabel : undefined}
                projectedHorizonDays={isProjetada ? projectedHorizon : undefined}
              />
            ) : null}
            {showRentabilidade ? (
              <DRERentabilidade
                summary={enterpriseDRE.dre?.summary || null}
                variant={enterpriseDRE.variant}
                loading={enterpriseDRE.loading}
              />
            ) : null}
            
            {/* ========== ETAPA 7-9: PAINÉIS DEDICADOS ========== */}
            {showMedicoPanel ? (
              <DREMedicoPanel
                summary={enterpriseDRE.dre?.summary || null}
                variant={enterpriseDRE.variant}
                loading={enterpriseDRE.loading}
                period={enterpriseDRE.period}
              />
            ) : null}
            {showConvenioPanel ? (
              <DREConvenioPanel
                summary={enterpriseDRE.dre?.summary || null}
                variant={enterpriseDRE.variant}
                loading={enterpriseDRE.loading}
                period={enterpriseDRE.period}
              />
            ) : null}
            {showUnidadePanel ? (
              <DREUnidadePanel
                summary={enterpriseDRE.dre?.summary || null}
                variant={enterpriseDRE.variant}
                loading={enterpriseDRE.loading}
                period={enterpriseDRE.period}
              />
            ) : null}

            {showEspecialidadePanel ? (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm text-cyan-900">
                <div className="font-semibold uppercase tracking-[0.2em] text-xs opacity-70">Visao especialidade</div>
                <div className="mt-1 leading-6">
                  Esta visão usa a mesma base de DRE, mas pode receber o painel de especialidade em uma etapa seguinte.
                  Hoje ela já se diferencia pela faixa-resumo, KPIs e filtros ativos da especialidade.
                </div>
              </div>
            ) : null}

            {isGerencial ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <div className="font-semibold uppercase tracking-[0.2em] text-xs opacity-70">Visao gerencial</div>
                <div className="mt-1 leading-6">
                  Consolida a leitura completa com os painéis dedicados acima, benchmark, comparativos e gráficos premium.
                </div>
              </div>
            ) : null}
            
            {/* ========== ETAPA 17: GRÁFICOS PREMIUM ========== */}
            {showCharts ? (
              <DRECharts
                summary={enterpriseDRE.dre?.summary || null}
                variant={enterpriseDRE.variant}
                loading={enterpriseDRE.loading}
              />
            ) : null}
            
            {/* ========== ETAPA 20: INTEGRAÇÕES ========== */}
            {isGerencial || isProjetada ? (
              <DREIntegrationStatus loading={enterpriseDRE.loading} />
            ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Modo legado ativo: a visão enterprise foi ocultada temporariamente.
            </div>
          )}
        </Card>

        {showLegacy ? (
        <>
        {/* ========== HEADER COM FILTROS ========== */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Período: {dateRange.start} a {dateRange.end}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              onClick={() => handlePeriodChange('week')}
              size="sm"
            >
              7 dias
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              onClick={() => handlePeriodChange('month')}
              size="sm"
            >
              30 dias
            </Button>
            <Button
              variant={period === 'quarter' ? 'default' : 'outline'}
              onClick={() => handlePeriodChange('quarter')}
              size="sm"
            >
              90 dias
            </Button>
            <Button
              variant={period === 'year' ? 'default' : 'outline'}
              onClick={() => handlePeriodChange('year')}
              size="sm"
            >
              1 ano
            </Button>
          </div>
        </div>

        {/* ========== DRE TABLE ========== */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Demonstração de Resultado</h2>

          {loading ? (
            <div className="text-center text-gray-500 py-8">Carregando DRE...</div>
          ) : dre ? (
            <div className="space-y-4">
              {/* RECEITAS */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-green-900">RECEITAS TOTAIS</span>
                  <span className="font-bold text-lg text-green-600">
                    R$ {(dre.receitas?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-sm text-green-700 space-y-1 ml-4">
                  <div className="flex justify-between">
                    <span>Quantidade de recebíveis:</span>
                    <span>{dre.receitas?.quantidade || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor médio:</span>
                    <span>R$ {(dre.receitas?.valor_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-900">
                    <span>Receita líquida:</span>
                    <span>R$ {(dre.receitas?.valor_liquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {(dre.receitas?.deducoes || dre.receitas?.descontos || dre.receitas?.taxa_cartao) ? (
                <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-rose-900">(-) DEDUÇÕES E TAXAS SOBRE RECEITA</span>
                    <span className="font-bold text-lg text-rose-600">
                      R$ {((dre.receitas?.deducoes || 0) + (dre.receitas?.taxa_cartao || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-sm text-rose-700 space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span>Descontos concedidos:</span>
                      <span>R$ {(dre.receitas?.descontos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxas de cartão:</span>
                      <span>R$ {(dre.receitas?.taxa_cartao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* CUSTOS */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-yellow-900">(-) CUSTOS OPERACIONAIS</span>
                  <span className="font-bold text-lg text-yellow-600">
                    R$ {(dre.custos_operacionais?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* = EBITDA */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-900">= EBITDA (Receitas - Custos)</span>
                  <span className="font-bold text-lg text-blue-600">
                    R$ {(dre.lucros?.ebitda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* DESPESAS */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-orange-900">(-) DESPESAS ADMINISTRATIVAS</span>
                  <span className="font-bold text-lg text-orange-600">
                    R$ {(dre.despesas_administrativas?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {(dre.despesas_administrativas?.financeiras || 0) > 0 && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-900">(-) DESPESAS FINANCEIRAS</span>
                    <span className="font-bold text-lg text-amber-600">
                      R$ {(dre.despesas_administrativas?.financeiras || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* = LUCRO OPERACIONAL */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-purple-900">= LUCRO OPERACIONAL</span>
                  <span className="font-bold text-lg text-purple-600">
                    R$ {(dre.lucros?.operacional || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* IMPOSTOS */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-red-900">(-) IMPOSTOS ({dre.impostos?.regime === 'consolidado' ? 'Consolidado' : dre.impostos?.regime === 'lucro_presumido' ? 'Lucro Presumido' : dre.impostos?.regime === 'lucro_real' ? 'Lucro Real' : 'Simples Nacional'})</span>
                  <span className="font-bold text-lg text-red-600">
                    R$ {(dre.impostos?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({(dre.impostos?.percentual_sobre_receita || 0).toFixed(2)}%)
                  </span>
                </div>
                <div className="text-xs text-red-700 space-y-1 ml-4">
                  <div className="flex justify-between">
                    <span>PIS ({(dre.impostos?.aliquotas?.pis || 0).toFixed(2)}%):</span>
                    <span>R$ {(dre.impostos?.detalhes?.pis || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>COFINS ({(dre.impostos?.aliquotas?.cofins || 0).toFixed(2)}%):</span>
                    <span>R$ {(dre.impostos?.detalhes?.cofins || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CSLL ({(dre.impostos?.aliquotas?.csll || 0).toFixed(2)}%):</span>
                    <span>R$ {(dre.impostos?.detalhes?.csll || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IR ({(dre.impostos?.aliquotas?.ir || 0).toFixed(2)}%):</span>
                    <span>R$ {(dre.impostos?.detalhes?.ir || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ISSQN ({(dre.impostos?.aliquotas?.issqn || 0).toFixed(2)}%):</span>
                    <span>R$ {(dre.impostos?.detalhes?.issqn || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* = LUCRO LÍQUIDO */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-lg border border-green-800 font-bold text-xl">
                <div className="flex justify-between items-center">
                  <span>= LUCRO LÍQUIDO</span>
                  <span>
                    R$ {(dre.lucros?.liquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">Nenhum dado de DRE disponível</div>
          )}
        </Card>

        {/* ========== MARGENS ========== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Margem Bruta */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-blue-900">Margem Bruta</h3>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {loading ? '...' : `${(dre?.margens?.bruta || 0).toFixed(2)}%`}
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Target: {margins?.benchmarks?.bruta_target?.toFixed(2)}%
            </p>
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
              {loading ? '...' : margins?.analise?.bruta?.status === 'ok' ? '✅ Excelente!' : '⚠️ Atenção'}
            </div>
          </Card>

          {/* Margem Operacional */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-purple-900">Margem Operacional</h3>
              <TrendingUpIcon className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {loading ? '...' : `${(dre?.margens?.operacional || 0).toFixed(2)}%`}
            </p>
            <p className="text-sm text-purple-700 mt-2">
              Target: {margins?.benchmarks?.operacional_target?.toFixed(2)}%
            </p>
            <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-purple-800">
              {loading ? '...' : margins?.analise?.operacional?.status === 'ok' ? '✅ Excelente!' : '⚠️ Atenção'}
            </div>
          </Card>

          {/* Margem Líquida */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-green-900">Margem Líquida</h3>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {loading ? '...' : `${(dre?.margens?.liquida || 0).toFixed(2)}%`}
            </p>
            <p className="text-sm text-green-700 mt-2">
              Target: {margins?.benchmarks?.liquida_target?.toFixed(2)}%
            </p>
            <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-800">
              {loading ? '...' : margins?.analise?.liquida?.status === 'ok' ? '✅ Excelente!' : '⚠️ Atenção'}
            </div>
          </Card>
        </div>

        {/* RELATÓRIOS TOOLBAR */}
        <RelatoriosToolbar
          title="DRE - Demonstração de Resultado"
          data={Array.isArray(dre?.periodos) ? dre.periodos.map(item => ({
            periodo: item.period,
            receita_bruta: item.gross_revenue,
            despesas: item.total_operating_expenses,
            comissoes: item.medical_commissions,
            resultado: item.net_income,
            margem_bruta: item.gross_margin,
            margem_liquida: item.net_margin
          })) : []}
          columns={[
            { key: 'periodo', label: 'Período', width: 15 },
            { key: 'receita_bruta', label: 'Receita Bruta', width: 18, format: 'currency' },
            { key: 'despesas', label: 'Despesas', width: 18, format: 'currency' },
            { key: 'comissoes', label: 'Comissões', width: 18, format: 'currency' },
            { key: 'resultado', label: 'Resultado Líquido', width: 18, format: 'currency' },
            { key: 'margem_bruta', label: 'Margem Bruta (%)', width: 14, format: 'percent' },
            { key: 'margem_liquida', label: 'Margem Líquida (%)', width: 14, format: 'percent' }
          ]}
          templateFileName="dre_resultado"
        />

        {/* ========== INSIGHTS ========== */}
        {margins?.analise?.insights && margins.analise.insights.length > 0 && (
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">💡 Insights</h3>
            <ul className="space-y-2">
              {margins.analise.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 font-bold">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ========== RECEITAS POR SERVIÇO + DESPESAS POR CATEGORIA ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receitas por Serviço */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Receitas por Serviço</h2>

            {loading ? (
              <div className="text-center text-gray-500 py-8">Carregando...</div>
            ) : revenueByService.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByService}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.percentual.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {revenueByService.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {revenueByService.map((svc, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{svc.servico}</span>
                      <span className="font-semibold">
                        R$ {(svc.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">Sem receitas neste período</div>
            )}
          </Card>

          {/* Despesas por Categoria */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h2>

            {loading ? (
              <div className="text-center text-gray-500 py-8">Carregando...</div>
            ) : expenseByCategory.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseByCategory} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="categoria"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis style={{ fontSize: '12px' }} />
                    <RechartsTooltip
                      formatter={(value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <Bar dataKey="total" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {expenseByCategory.map((exp, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {exp.categoria} ({exp.tipo})
                      </span>
                      <span className="font-semibold">
                        R$ {(exp.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">Sem despesas neste período</div>
            )}
          </Card>
        </div>

        {/* ========== COMPARAÇÃO COM PERÍODO ANTERIOR ========== */}
        {comparison && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Comparação com Período Anterior</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Receitas */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-medium">Receitas</p>
                <p className="text-2xl font-bold text-green-600 mt-1 flex items-center gap-2">
                  {formatComparisonPct(comparison.comparacao?.receitas?.variacao_percentual, 2)}
                  {isComparisonPctNA(comparison.comparacao?.receitas?.variacao_percentual) ? (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-green-300 bg-green-100 text-green-800 cursor-help"
                            aria-label="Informação sobre base anterior"
                          >
                            <Info className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Base anterior muito baixa para percentual.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {comparisonTrendIcon(comparison.comparacao?.receitas?.variacao_percentual)} Variação: R$ {Math.abs(comparison.comparacao?.receitas?.variacao_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Custos */}
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700 font-medium">Custos</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1 flex items-center gap-2">
                  {formatComparisonPct(comparison.comparacao?.custos?.variacao_percentual, 2)}
                  {isComparisonPctNA(comparison.comparacao?.custos?.variacao_percentual) ? (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-yellow-300 bg-yellow-100 text-yellow-800 cursor-help"
                            aria-label="Informação sobre base anterior"
                          >
                            <Info className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Base anterior muito baixa para percentual.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Variação: R$ {Math.abs(comparison.comparacao?.custos?.variacao_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Lucro */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-medium">Lucro</p>
                <p className="text-2xl font-bold text-green-600 mt-1 flex items-center gap-2">
                  {formatComparisonPct(comparison.comparacao?.lucro_liquido?.variacao_percentual, 2)}
                  {isComparisonPctNA(comparison.comparacao?.lucro_liquido?.variacao_percentual) ? (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-green-300 bg-green-100 text-green-800 cursor-help"
                            aria-label="Informação sobre base anterior"
                          >
                            <Info className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Base anterior muito baixa para percentual.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Variação: R$ {Math.abs(comparison.comparacao?.lucro_liquido?.variacao_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Margem */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 font-medium">Margem Líquida</p>
                <p className="text-2xl font-bold text-purple-600 mt-1 flex items-center gap-2">
                  {formatComparisonPct(comparison.comparacao?.margem_liquida?.variacao_percentual, 2)}
                  {isComparisonPctNA(comparison.comparacao?.margem_liquida?.variacao_percentual) ? (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-purple-300 bg-purple-100 text-purple-800 cursor-help"
                            aria-label="Informação sobre base anterior"
                          >
                            <Info className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Base anterior muito baixa para percentual.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Variação em p.p.
                </p>
              </div>
            </div>

            {/* Insights da Comparação */}
            {comparison.insights && comparison.insights.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">📊 Tendências Observadas:</p>
                <ul className="space-y-1">
                  {comparison.insights.map((insight, idx) => (
                    <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}
        </>
        ) : null}
      </div>
    </PageLayout>
  );
}
