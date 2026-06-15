import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Medal, Trophy, AlertTriangle } from 'lucide-react';

/**
 * 🏆 Performance Ranking - Ranking de Desempenho
 * 
 * Identifica top performers (melhores resultados)
 * E bottom performers (que precisam melhorar)
 */
export default function PerformanceRanking({ receivables = [], payables = [], dailyData = [], loading = false }) {
  const rankings = useMemo(() => {
    if (loading) return { topPerformers: [], bottomPerformers: [] };

    // Calcular score de desempenho para receivables
    const receivableScore = receivables.map((r) => {
      const isOverdue = new Date(r.due_date) < new Date();
      const daysOverdue = isOverdue
        ? Math.floor((new Date() - new Date(r.due_date)) / (1000 * 60 * 60 * 24))
        : -Math.floor((new Date(r.due_date) - new Date()) / (1000 * 60 * 60 * 24));

      return {
        type: 'receivable',
        entity: r.covenant_name || 'Sem Convênio',
        amount: r.amount || 0,
        score: isOverdue ? Math.max(0, 100 - daysOverdue * 5) : 100,
        status: isOverdue ? 'Vencido' : 'Em dia',
        daysOverdue,
      };
    });

    // Calcular score para payables
    const payableScore = payables.map((p) => {
      const isOverdue = new Date(p.due_date) < new Date();
      const daysOverdue = isOverdue
        ? Math.floor((new Date() - new Date(p.due_date)) / (1000 * 60 * 60 * 24))
        : -Math.floor((new Date(p.due_date) - new Date()) / (1000 * 60 * 60 * 24));

      return {
        type: 'payable',
        entity: p.creditor_name || 'Sem Credor',
        amount: p.amount || 0,
        score: isOverdue ? Math.max(0, 100 - daysOverdue * 3) : 100,
        status: isOverdue ? 'Atrasado' : 'No Prazo',
        daysOverdue,
      };
    });

    const allItems = [...receivableScore, ...payableScore];

    if (allItems.length === 0) {
      return { topPerformers: [], bottomPerformers: [] };
    }

    const sorted = allItems.sort((a, b) => b.score - a.score);

    return {
      topPerformers: sorted.slice(0, 5),
      bottomPerformers: sorted.slice(-5).reverse(),
    };
  }, [receivables, payables, dailyData, loading]);

  const getScoreBadgeColor = (score) => {
    if (score >= 85) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        Ranking de Desempenho
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TOP PERFORMERS */}
        <div className="space-y-3">
          <h3 className="font-semibold text-green-900 dark:text-green-300 flex items-center gap-2 px-4">
            <Medal className="w-5 h-5" />
            🏆 Top Performers
          </h3>

          {rankings.topPerformers.length > 0 ? (
            rankings.topPerformers.map((item, idx) => (
              <Card
                key={`${item.type}-${item.entity}-${idx}`}
                className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:shadow-md dark:hover:shadow-2xl transition animate-slide-up card-hover"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{item.entity}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {item.type === 'receivable' ? 'A Receber' : 'A Pagar'} • R$ {item.amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreBadgeColor(item.score)}`}>
                    {Math.round(item.score)}
                  </div>
                </div>

                {item.status && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400"></span>
                    <span className="text-green-700 dark:text-green-300 font-semibold">{item.status}</span>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <Card className="p-4 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Nenhum item em análise</p>
            </Card>
          )}
        </div>

        {/* BOTTOM PERFORMERS */}
        <div className="space-y-3">
          <h3 className="font-semibold text-red-900 dark:text-red-300 flex items-center gap-2 px-4">
            <AlertTriangle className="w-5 h-5" />
            ⚠️ Precisam Melhorar
          </h3>

          {rankings.bottomPerformers.length > 0 ? (
            rankings.bottomPerformers.map((item, idx) => (
              <Card
                key={`${item.type}-${item.entity}-${idx}`}
                className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800 hover:shadow-md dark:hover:shadow-2xl transition animate-slide-up card-hover"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-200 text-red-700 font-bold text-sm">
                      ⬇️
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 truncate">{item.entity}</p>
                      <p className="text-xs text-gray-600">
                        {item.type === 'receivable' ? 'A Receber' : 'A Pagar'} • R$ {item.amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreBadgeColor(item.score)}`}>
                    {Math.round(item.score)}
                  </div>
                </div>

                {item.status && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-red-700 font-semibold">
                      {item.status} • {item.daysOverdue} dias
                    </span>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <Card className="p-4 bg-gray-50 border-gray-200">
              <p className="text-sm text-gray-600">Nenhum item em análise</p>
            </Card>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total em Análise</p>
              <p className="text-2xl font-bold text-blue-600">
                {(rankings.topPerformers.length + rankings.bottomPerformers.length).toLocaleString()}
              </p>
            </div>
            <Trophy className="w-6 h-6 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Em Dia</p>
              <p className="text-2xl font-bold text-green-600">
                {rankings.topPerformers.filter((p) => p.score >= 85).length.toLocaleString()}
              </p>
            </div>
            <Medal className="w-6 h-6 text-green-400" />
          </div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Com Atraso</p>
              <p className="text-2xl font-bold text-red-600">
                {rankings.bottomPerformers.filter((p) => p.score < 60).length.toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
        </Card>
      </div>
    </div>
  );
}
