import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/useClinicContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  TrendingUpIcon,
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getDREData, getMarginAnalysis, getRevenueByService, getExpenseByCategory, comparePeriods } from '@/lib/dreApi';
import RelatoriosToolbar from '@/components/financeiro/RelatoriosToolbar';

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

  // Carregar dados
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
        const prevStart = new Date(dateRange.start);
        prevStart.setDate(prevStart.getDate() - 30);
        const prevEnd = new Date(dateRange.start);
        prevEnd.setDate(prevEnd.getDate() - 1);

        const compData = await comparePeriods(
          clinicId,
          {
            start: prevStart.toISOString().split('T')[0],
            end: prevEnd.toISOString().split('T')[0],
          },
          { start: dateRange.start, end: dateRange.end }
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

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="📊 DRE - Demonstração de Resultado"
      subtitle="Análise completa de receitas, despesas e rentabilidade"
    >
      <div className="space-y-6 mt-6">
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
                    R$ {dre.receitas?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    <Tooltip
                      formatter={(value) => `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {revenueByService.map((svc, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{svc.servico}</span>
                      <span className="font-semibold">
                        R$ {svc.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    <Tooltip
                      formatter={(value) => `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
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
                        R$ {exp.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {comparison.comparacao?.receita?.variacao >= 0 ? '+' : ''}
                  {(comparison.comparacao?.receita?.variacao || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {comparison.comparacao?.receita?.variacao >= 0 ? '📈' : '📉'} Variação: R$ {Math.abs(comparison.comparacao?.receita?.diferenca || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Custos */}
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700 font-medium">Custos</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {comparison.comparacao?.custos?.variacao >= 0 ? '+' : ''}
                  {(comparison.comparacao?.custos?.variacao || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Variação: R$ {Math.abs(comparison.comparacao?.custos?.diferenca || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Lucro */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-medium">Lucro</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {comparison.comparacao?.lucro?.variacao >= 0 ? '+' : ''}
                  {(comparison.comparacao?.lucro?.variacao || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Variação: R$ {Math.abs(comparison.comparacao?.lucro?.diferenca || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Margem */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 font-medium">Margem Líquida</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {comparison.comparacao?.margem?.variacao >= 0 ? '+' : ''}
                  {(comparison.comparacao?.margem?.variacao || 0).toFixed(2)}%
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
      </div>
    </PageLayout>
  );
}
