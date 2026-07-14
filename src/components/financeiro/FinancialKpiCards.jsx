import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { calculateVariation, formatCurrency } from '@/lib/financialCalculations';

/**
 * 💳 KPI Cards - 8 cards principais do painel
 * 
 * Cards exibidos:
 * 1. Entradas realizadas
 * 2. Saidas realizadas
 * 3. Resultado do periodo
 * 4. A vencer (30 dias)
 * 5. A pagar (30 dias)
 * 6. Saldo projetado (30 dias)
 * 7. Liquidez / dias cobertura
 */
export default function FinancialKpiCards(props) {
  const {
    summary,
    previousSummary,
    projectedBalance,
    receivable30d,
    payable30d,
    loading = false,
  } = props;

  // Calcular variações
  const variations = useMemo(() => {
    if (!summary || !previousSummary) {
      return {
        balance: 0,
        inflows: 0,
        outflows: 0,
        liquidity: 0,
      };
    }
    return {
      balance: calculateVariation(summary.net_balance, previousSummary.net_balance),
      inflows: calculateVariation(summary.total_inflows, previousSummary.total_inflows),
      outflows: calculateVariation(summary.total_outflows, previousSummary.total_outflows),
      liquidity: calculateVariation(summary.liquidity_ratio, previousSummary.liquidity_ratio),
    };
  }, [summary, previousSummary]);

  // Estados de loading (skeleton)
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-2" />
            <div className="h-6 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Sem dados de fluxo de caixa disponíveis</p>
      </div>
    );
  }

  return (
    <div className="mb-4 grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {/* Card 1: Entradas Realizadas */}
      <KpiCard
        title="Entradas Realizadas"
        value={summary.total_inflows}
        variation={variations.inflows}
        icon={<TrendingUp className="w-5 h-5" />}
        color="green"
      />

      {/* Card 2: Saídas Realizadas */}
      <KpiCard
        title="Saídas Realizadas"
        value={summary.total_outflows}
        variation={variations.outflows}
        icon={<TrendingDown className="w-5 h-5" />}
        color="red"
      />

      {/* Card 3: Resultado do Período */}
      <KpiCard
        title="Resultado do Período"
        value={summary.net_balance}
        variation={variations.balance}
        icon={<Activity className="w-5 h-5" />}
        color={summary.net_balance >= 0 ? 'green' : 'red'}
      />

      {/* Card 4: A Vencer 30d */}
      <KpiCard
        title="A Vencer (30d)"
        value={receivable30d}
        variation={0}
        icon={<DollarSign className="w-5 h-5" />}
        color="blue"
      />

      {/* Card 5: A Pagar 30d */}
      <KpiCard
        title="A Pagar (30d)"
        value={payable30d}
        variation={0}
        icon={<DollarSign className="w-5 h-5" />}
        color="orange"
      />

      {/* Card 6: Saldo Projetado */}
      <KpiCard
        title="Saldo Projetado (30d)"
        value={projectedBalance}
        variation={0}
        icon={<Calendar className="w-5 h-5" />}
        color={projectedBalance >= 0 ? 'green' : 'red'}
      />

      {/* Card 7: Liquidez / Dias de Cobertura */}
      <Card className="min-h-[64px] border-l-4 border-purple-500 bg-purple-50 p-2 dark:bg-purple-900/10 animate-slide-up card-hover transition-all duration-300">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="text-[11px] font-semibold leading-tight text-gray-700 dark:text-gray-300">Saúde Financeira</h3>
          <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <p className="text-[9px] leading-tight text-gray-600 dark:text-gray-400">Liquidez</p>
            <p className="text-xs font-bold leading-tight text-gray-900 dark:text-white number-transition">
              {summary.liquidity_ratio.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[9px] leading-tight text-gray-600 dark:text-gray-400">Cobertura</p>
            <p className="text-xs font-bold leading-tight text-gray-900 dark:text-white number-transition">
              {summary.coverage_days} dias
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Componente individual de KPI Card
 */
function KpiCard({ title, value, variation, icon, color }) {
  const colorClasses = {
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-600',
    green: 'border-green-500 bg-green-50 dark:bg-green-900/10 dark:border-green-600',
    red: 'border-red-500 bg-red-50 dark:bg-red-900/10 dark:border-red-600',
    orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-600',
    purple: 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-600',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    orange: 'text-orange-600 dark:text-orange-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };

  const textColorClasses = {
    blue: 'text-blue-900 dark:text-blue-100',
    green: 'text-green-900 dark:text-green-100',
    red: 'text-red-900 dark:text-red-100',
    orange: 'text-orange-900 dark:text-orange-100',
    purple: 'text-purple-900 dark:text-purple-100',
  };

  const isPositive = value >= 0;
  const variationColor = variation >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const variationBg = variation >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30';

  return (
    <Card className={`min-h-[64px] border-l-4 p-2 ${colorClasses[color]} animate-slide-up card-hover transition-all duration-300`}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="text-[11px] font-semibold leading-tight text-gray-700 dark:text-gray-300">{title}</h3>
        <div className={`${iconColorClasses[color]} [&>svg]:h-4 [&>svg]:w-4`}>{icon}</div>
      </div>

      <p className={`mb-0.5 text-sm font-bold leading-tight ${textColorClasses[color]} number-transition`}>
        {formatCurrency(value)}
      </p>

      {variation !== 0 && (
        <div className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${variationBg} ${variationColor}`}>
          {variation > 0 ? '↑' : '↓'} {Math.abs(variation).toFixed(1)}%
        </div>
      )}
    </Card>
  );
}
