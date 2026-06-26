import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Radar, AlertCircle, TrendingUp } from 'lucide-react';

const closedStatuses = new Set(['paid', 'pago', 'paga', 'received', 'recebido', 'quitado', 'processed', 'canceled', 'cancelado', 'cancelada', 'reversed', 'estornado']);

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOpenPastDue(item = {}) {
  if (closedStatuses.has(String(item.status || '').toLowerCase()) || !item.due_date) return false;
  return new Date(`${String(item.due_date).split('T')[0]}T00:00:00`) < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
}

function isOpenReceivable(item = {}) {
  return !closedStatuses.has(String(item.status || '').toLowerCase());
}

function receivableAmount(item = {}) {
  return money(item.balance_amount || item.open_amount || item.amount || item.gross_amount || item.valor || item.total_amount);
}

/**
 * Covenant Radar - Análise de convênios médicos
 *
 * Monitora saúde financeira de cada convênio
 * Identifica convênios críticos e oportunidades de melhoria
 */
export default function CovenantRadar({ receivables = [], loading = false }) {
  const covenantAnalysis = useMemo(() => {
    if (loading || !receivables.length) return [];

    // Agrupar por convênio
    const byConvenant = {};
    receivables.filter(isOpenReceivable).forEach((r) => {
      const covenantName = r.covenant_name || 'Convênio Desconhecido';
      if (!byConvenant[covenantName]) {
        byConvenant[covenantName] = {
          name: covenantName,
          total: 0,
          count: 0,
          overdue: 0,
          overdueAmount: 0,
          avgDelay: 0,
          lastPayment: null,
        };
      }

      byConvenant[covenantName].total += receivableAmount(r);
      byConvenant[covenantName].count += 1;

      if (isOpenPastDue(r)) {
        byConvenant[covenantName].overdue += 1;
        byConvenant[covenantName].overdueAmount += receivableAmount(r);
        const delayDays = Math.floor((new Date(new Date().toISOString().split('T')[0] + 'T00:00:00') - new Date(`${String(r.due_date).split('T')[0]}T00:00:00`)) / (1000 * 60 * 60 * 24));
        byConvenant[covenantName].avgDelay += delayDays;
      }
    });

    // Converter em array e calcular scores
    return Object.values(byConvenant)
      .map((c) => ({
        ...c,
        avgDelay: c.overdue > 0 ? c.avgDelay / c.overdue : 0,
        healthScore: Math.max(0, 100 - (c.overdue / c.count) * 100 - (c.overdue > 0 ? (c.avgDelay / c.overdue) : 0) * 0.5),
        percentageOverdue: ((c.overdue / c.count) * 100).toFixed(1),
      }))
      .sort((a, b) => a.healthScore - b.healthScore);
  }, [receivables, loading]);

  const getHealthColor = (score) => {
    if (score >= 80) return { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-900 dark:text-green-300', badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' };
    if (score >= 60) return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-900 dark:text-yellow-300', badge: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' };
    return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-900 dark:text-red-300', badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' };
  };

  if (loading) {
    return (
      <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (covenantAnalysis.length === 0) {
    return (
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 animate-slide-up">
        <div className="flex gap-3">
          <Radar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-300">Sem carteira de convênios para análise</p>
            <p className="text-sm text-blue-700 dark:text-blue-400">Cadastre ou sincronize convênios para habilitar este painel.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Radar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        Saúde da carteira de convênios ({covenantAnalysis.length})
      </h2>

      <div className="space-y-3">
        {covenantAnalysis.map((covenant) => {
          const colors = getHealthColor(covenant.healthScore);

          return (
            <Card key={covenant.name} className={`p-4 ${colors.bg} border-2 ${colors.border} animate-slide-up card-hover`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className={`font-semibold ${colors.text}`}>{covenant.name}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {covenant.count} conta{covenant.count !== 1 ? 's' : ''} | Valor a receber: R$ {covenant.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${colors.badge}`}>
                  {Math.round(covenant.healthScore)}/100
                </div>
              </div>

              {/* Status Bars */}
              <div className="space-y-2">
                {/* Healthy Rate */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-20">Adimplência:</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 dark:bg-green-600 h-full transition-all"
                      style={{ width: `${100 - Number(covenant.percentageOverdue)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 w-10">
                    {(100 - Number(covenant.percentageOverdue)).toFixed(0)}%
                  </span>
                </div>

                {/* Overdue Rate */}
                {covenant.overdue > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 w-20">Inadimplência:</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-red-500 dark:bg-red-600 h-full transition-all"
                        style={{ width: `${Number(covenant.percentageOverdue)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 w-10">
                      {covenant.percentageOverdue}%
                    </span>
                  </div>
                )}
              </div>

              {/* Alert if problematic */}
              {covenant.overdue > 0 && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20 flex gap-2 items-start text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>{covenant.overdue} conta{covenant.overdue !== 1 ? 's' : ''}</strong> vencida
                    {covenant.overdue !== 1 ? 's' : ''} por <strong>{covenant.avgDelay.toFixed(0)} dias</strong> em média.
                    Recomenda-se tratativa com {covenant.name}.
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Valor total a receber</p>
            <p className="text-lg font-bold text-purple-600">
              R$ {covenantAnalysis.reduce((sum, c) => sum + c.total, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Convênios sob risco</p>
            <p className="text-lg font-bold text-red-600">
              {covenantAnalysis.filter((c) => c.healthScore < 60).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Índice médio de saúde</p>
            <p className="text-lg font-bold text-blue-600">
              {(covenantAnalysis.reduce((sum, c) => sum + c.healthScore, 0) / covenantAnalysis.length).toFixed(0)}/100
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
