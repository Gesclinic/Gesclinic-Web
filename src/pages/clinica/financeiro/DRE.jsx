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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const [professionals, setProfessionals] = useState([]);
  const [payers, setPayers] = useState([]);
  const [healthInsurances, setHealthInsurances] = useState([]);
  const [units, setUnits] = useState([]);
  const [collapsedTabs, setCollapsedTabs] = useState({});

  const enterpriseDRE = useFinancialDRE(clinicId || '', 'gerencial', {
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

  const isGerencial = enterpriseDRE.variant === 'gerencial';
  const isContabil = enterpriseDRE.variant === 'contabil';
  const isCentro = enterpriseDRE.variant === 'centro';
  const isMedico = enterpriseDRE.variant === 'medico';
  const isConvenio = enterpriseDRE.variant === 'convenio';
  const isUnidade = enterpriseDRE.variant === 'unidade';
  const isEspecialidade = enterpriseDRE.variant === 'especialidade';
  const isProjetada = enterpriseDRE.variant === 'projetada';
  const isActiveTabCollapsed = Boolean(collapsedTabs[enterpriseDRE.variant]);
  const showMedicoPanel = isMedico;
  const showConvenioPanel = isConvenio;
  const showUnidadePanel = isUnidade;
  const showEspecialidadePanel = isEspecialidade;
  const showAlerts = isGerencial || isProjetada;
  const showCashflowComparison = isGerencial || isProjetada;
  const showComparisonCard = isGerencial || isProjetada || isContabil || isCentro;
  const showBenchmark = isProjetada;
  const showRentabilidade = !isGerencial && !isProjetada;
  const showDreTable = isGerencial || isContabil || isCentro || isProjetada;
  const showCharts = !isGerencial && !isProjetada;
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
    gerencial: 'Visão consolidada: resumo da DRE com números agregados do período.',
    contabil: 'Visão contábil: priorize unidade para analisar classificação e resultado.',
    centro: 'Visão centro de custo: filtre por unidade para localizar eficiência operacional.',
    medico: 'Visão médica: foque no profissional e compare produtividade no período.',
    convenio: 'Visão convênio: foque no pagador para acompanhar glosa e recebimento.',
    unidade: 'Visão unidade: compare desempenho por filial/unidade operacional.',
    especialidade: 'Visão especialidade: combine convênio e unidade para entender margens.',
    projetada: 'Visão projetada: os controles principais estão no cenário e no horizonte de forecast.',
  }[enterpriseDRE.variant];

  const toggleActiveTab = () => {
    setCollapsedTabs((current) => ({
      ...current,
      [enterpriseDRE.variant]: !current[enterpriseDRE.variant],
    }));
  };

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
              <p className="text-sm text-gray-600">Motor novo com variantes, drill-down e análise por base consolidada. Base para ETAPA 4+.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => enterpriseDRE.refresh()}>
                Atualizar analise
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <DREVariantSelector value={enterpriseDRE.variant} onChange={enterpriseDRE.setVariant} />
              <Button
                size="sm"
                variant="outline"
                onClick={toggleActiveTab}
                className="w-full gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 xl:w-auto"
              >
                {isActiveTabCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                {isActiveTabCollapsed ? 'Expandir aba' : 'Recolher aba'}
              </Button>
            </div>
            {isActiveTabCollapsed ? (
              <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${variantBanner.className}`}>
                <div className="text-xs uppercase tracking-[0.2em] opacity-70">{variantBanner.title}</div>
                <div className="mt-1 leading-6">Aba recolhida. Use o botão Expandir aba para visualizar filtros, KPIs e relatórios.</div>
              </div>
            ) : (
              <>
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
                period={enterpriseDRE.period}
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
                drillDowns={enterpriseDRE.drillDowns}
                loadingDrillDown={enterpriseDRE.loadingDrillDown}
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
                period={enterpriseDRE.period}
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
                  Consolida receita, custos, despesas e resultado do período. Para cortes por médico, convênio, unidade ou especialidade, use as abas dedicadas para evitar misturar leitura consolidada com rateios segmentados.
                </div>
              </div>
            ) : null}
            
            {/* ========== ETAPA 17: GRÁFICOS PREMIUM ========== */}
            {showCharts ? (
              <DRECharts
                summary={enterpriseDRE.dre?.summary || null}
                variant={enterpriseDRE.variant}
                loading={enterpriseDRE.loading}
                period={enterpriseDRE.period}
              />
            ) : null}
            
            {/* ========== ETAPA 20: INTEGRAÇÕES ========== */}
            {isGerencial || isProjetada ? (
              <DREIntegrationStatus loading={enterpriseDRE.loading} />
            ) : null}
              </>
            )}
          </div>
        </Card>

      </div>
    </PageLayout>
  );
}
