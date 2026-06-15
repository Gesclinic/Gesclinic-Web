import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Gauge, TrendingUp, AlertCircle } from 'lucide-react';

/**
 * 📊 Clinic Cockpit - Painel de Controle com 5 Indicadores
 * 
 * Exibe saúde financeira em 5 dimensões (0-100 cada)
 * Gauge visual com cores: Verde (80+), Amarelo (50-80), Vermelho (<50)
 */
export default function ClinicCockpit({ summary, receivables = [], payables = [], healthScores = null, loading = false }) {
  const cockpitScores = useMemo(() => {
    // Se healthScores estão disponíveis (vindos do dashboardDataService), usar diretamente
    if (healthScores) {
      return {
        liquidity: { score: healthScores.liquidity, label: 'Liquidez', icon: '💧' },
        balance: { score: healthScores.balance, label: 'Saldo/Cobertura', icon: '💰' },
        flow: { score: healthScores.flow, label: 'Fluxo', icon: '📊' },
        receivables: { score: healthScores.receivables, label: 'Recebíveis', icon: '📥' },
        efficiency: { score: healthScores.efficiency, label: 'Eficiência', icon: '⚡' },
      };
    }

    // Fallback: calcular a partir do summary (compatibilidade com dados legados)
    if (!summary || loading) return null;

    // Score 1: Liquidez (0-100)
    let liquidityScore = Math.min(100, Math.max(0, (summary.liquidity_ratio || 0) * 50));

    // Score 2: Saldo (0-100) - baseado em dias de cobertura
    let balanceScore = Math.min(100, Math.max(0, (summary.coverage_days || 0) * 3.33));

    // Score 3: Fluxo (0-100) - razão inflows/outflows
    let flowScore = 50;
    if (summary.total_outflows > 0) {
      flowScore = Math.min(100, Math.max(0, (summary.total_inflows / summary.total_outflows) * 50));
    }

    // Score 4: Recebíveis (0-100) - % de contas vencidas
    let receivablesScore = 100;
    if (receivables.length > 0) {
      const overdue = receivables.filter((r) => new Date(r.due_date) < new Date()).length;
      receivablesScore = Math.max(0, 100 - (overdue / receivables.length) * 100);
    }

    // Score 5: Eficiência (0-100) - margem operacional
    let efficiencyScore = 50;
    if (summary.total_inflows > 0) {
      const margin = (summary.net_balance / summary.total_inflows) * 100;
      efficiencyScore = Math.min(100, Math.max(0, margin + 50));
    }

    return {
      liquidity: { score: liquidityScore, label: 'Liquidez', icon: '💧' },
      balance: { score: balanceScore, label: 'Saldo/Cobertura', icon: '💰' },
      flow: { score: flowScore, label: 'Fluxo', icon: '📊' },
      receivables: { score: receivablesScore, label: 'Recebíveis', icon: '📥' },
      efficiency: { score: efficiencyScore, label: 'Eficiência', icon: '⚡' },
    };
  }, [summary, receivables, healthScores, loading]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'from-green-100 to-green-50 border-green-200';
    if (score >= 50) return 'from-yellow-100 to-yellow-50 border-yellow-200';
    return 'from-red-100 to-red-50 border-red-200';
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4 w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (!cockpitScores) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Gauge className="w-5 h-5 text-blue-600" />
        Cockpit de Saúde (5 Dimensões)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(cockpitScores).map(([key, dimension]) => (
          <Card key={key} className={`p-6 bg-gradient-to-br ${getScoreBgColor(dimension.score)} border overflow-hidden`}>
            {/* Gauge Background */}
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>

            {/* Content */}
            <div className="relative z-10">
              {/* Icon & Label */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{dimension.icon}</span>
                <p className="text-xs font-semibold text-gray-600 text-right">{dimension.label}</p>
              </div>

              {/* Score Circle */}
              <div className="flex items-center justify-center mb-3">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${(dimension.score / 100) * 282.7} 282.7`}
                      className={`transition-all ${getScoreColor(dimension.score)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="text-center">
                    <p className={`text-xl font-bold ${getScoreColor(dimension.score)}`}>
                      {Math.round(dimension.score)}
                    </p>
                    <p className="text-xs text-gray-500">/100</p>
                  </div>
                </div>
              </div>

              {/* Status Text */}
              <div className="text-center">
                <p className={`text-xs font-semibold ${dimension.score >= 80 ? 'text-green-700' : dimension.score >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>
                  {dimension.score >= 80 ? '✅ Excelente' : dimension.score >= 50 ? '⚠️ Atenção' : '🔴 Crítico'}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Overall Score */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">Score Geral de Saúde</p>
            <p className="text-xs text-blue-700">Média das 5 dimensões</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">
              {Math.round(
                (cockpitScores.liquidity.score +
                  cockpitScores.balance.score +
                  cockpitScores.flow.score +
                  cockpitScores.receivables.score +
                  cockpitScores.efficiency.score) /
                  5
              )}
            </p>
            <p className="text-xs text-blue-600 font-semibold">/100</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
