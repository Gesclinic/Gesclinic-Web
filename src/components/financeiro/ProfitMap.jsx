import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Target } from 'lucide-react';

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function movementAmount(item = {}) {
  return money(item.amount || item.net_amount || item.paid_value || item.balance_amount || item.valor || item.total_amount);
}

/**
 * Profit Map - Rentabilidade por categoria
 *
 * Identifica quais serviços/procedimentos são mais lucrativos
 * Segmenta por receita, custo e margem
 */
export default function ProfitMap({ dailyData = [], payables = [], loading = false }) {
  const profitAnalysis = useMemo(() => {
    if (loading || (!dailyData.length && !payables.length)) return [];

    const servicesByCategory = {};

    const hasDetailedPayables = payables.length > 0;

    dailyData.forEach((day) => {
      const category = day.category || 'Sem Categoria';
      if (!servicesByCategory[category]) {
        servicesByCategory[category] = {
          name: category,
          revenue: 0,
          cost: 0,
          margin: 0,
          count: 0,
        };
      }

      servicesByCategory[category].revenue += day.inflow || 0;
      if (!hasDetailedPayables) {
        servicesByCategory[category].cost += day.outflow || 0;
      }
      servicesByCategory[category].count += 1;
    });

    payables.forEach((payable) => {
      const category = payable.category || payable.category_name || payable.dre_classification || 'Despesas sem categoria';
      if (!servicesByCategory[category]) {
        servicesByCategory[category] = {
          name: category,
          revenue: 0,
          cost: 0,
          margin: 0,
          count: 0,
        };
      }

      servicesByCategory[category].cost += movementAmount(payable);
      servicesByCategory[category].count += 1;
    });

    // Calcular margem
    return Object.values(servicesByCategory)
      .map((s) => ({
        ...s,
        profit: s.revenue - s.cost,
        marginPercent: s.revenue > 0 ? ((s.revenue - s.cost) / s.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [dailyData, payables, loading]);

  const getMargingColor = (margin) => {
    if (margin >= 40) return 'text-green-600';
    if (margin >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const totalRevenue = profitAnalysis.reduce((sum, s) => sum + s.revenue, 0);
  const totalProfit = profitAnalysis.reduce((sum, s) => sum + s.profit, 0);
  const avgMargin = profitAnalysis.length > 0 ? totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0 : 0;

  if (loading) {
    return (
      <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (profitAnalysis.length === 0) {
    return (
      <Card className="p-6 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-slide-up">
        <div className="flex gap-3">
          <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-1" />
          <p className="text-gray-600 dark:text-gray-400">Sem dados de rentabilidade disponíveis</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
        Rentabilidade por categoria ({profitAnalysis.length} categorias)
      </h2>

      <div className="space-y-3">
        {profitAnalysis.map((service, idx) => (
          <Card key={service.name} className="p-4 hover:shadow-md dark:bg-gray-800 dark:border-gray-700 dark:hover:shadow-2xl transition-shadow animate-slide-up card-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-gray-400 dark:text-gray-500">{idx + 1}º</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{service.name}</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {service.count} transaç{service.count !== 1 ? 'ões' : 'ão'} no período
                </p>
              </div>

              <div className="text-right">
                <p className={`text-2xl font-bold number-transition ${getMargingColor(service.marginPercent)}`}>
                  {service.marginPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Margem</p>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
              <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                <p className="text-gray-600 dark:text-gray-400 mb-0.5">Receita</p>
                <p className="font-bold text-green-600 dark:text-green-400 number-transition">R$ {service.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                <p className="text-gray-600 dark:text-gray-400 mb-0.5">Custo</p>
                <p className="font-bold text-red-600 dark:text-red-400 number-transition">R$ {service.cost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-gray-600 dark:text-gray-400 mb-0.5">Lucro</p>
                <p className="font-bold text-blue-600 dark:text-blue-400 number-transition">R$ {service.profit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${getMargingColor(service.marginPercent).replace('text-', 'bg-')}`}
                style={{ width: `${Math.min(service.marginPercent, 100)}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 animate-slide-up card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Receita consolidada</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 number-transition">
                R$ {totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Resultado operacional consolidado</p>
              <p className="text-2xl font-bold text-blue-600">
                R$ {totalProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <Target className="w-5 h-5 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Margem operacional média</p>
              <p className="text-2xl font-bold text-purple-600">{avgMargin.toFixed(1)}%</p>
            </div>
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
        </Card>
      </div>
    </div>
  );
}
