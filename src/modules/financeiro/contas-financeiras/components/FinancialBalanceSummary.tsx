/**
 * Financial Balance Summary Component
 * Displays consolidated balance information
 */

import React from 'react';
import { Loader2, TrendingUp, BarChart3 } from 'lucide-react';
import { ConsolidatedBalanceSummary, ACCOUNT_TYPE_ICONS } from '../types';
import { BalanceSummarySkeleton } from './SkeletonLoader';

// Cor palette para bancos
const BANK_COLORS = [
  { bg: 'bg-blue-100', bar: 'bg-blue-500', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  { bg: 'bg-purple-100', bar: 'bg-purple-500', text: 'text-purple-700' },
  { bg: 'bg-orange-100', bar: 'bg-orange-500', text: 'text-orange-700' },
  { bg: 'bg-pink-100', bar: 'bg-pink-500', text: 'text-pink-700' },
  { bg: 'bg-cyan-100', bar: 'bg-cyan-500', text: 'text-cyan-700' },
  { bg: 'bg-amber-100', bar: 'bg-amber-500', text: 'text-amber-700' },
  { bg: 'bg-red-100', bar: 'bg-red-500', text: 'text-red-700' },
];

interface FinancialBalanceSummaryProps {
  summary: ConsolidatedBalanceSummary | null;
  loading?: boolean;
}

export const FinancialBalanceSummary = React.memo<FinancialBalanceSummaryProps>(({
  summary,
  loading = false,
}) => {
  if (loading) {
    return <BalanceSummarySkeleton />;
  }

  if (!summary) {
    return null;
  }

  const totalBalance = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(summary.total_balance);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
        <p className="text-sm font-medium text-blue-700 mb-2">Saldo Total</p>
        <h2 className="text-3xl font-bold text-blue-900">{totalBalance}</h2>
        <p className="text-xs text-blue-600 mt-2">
          {summary.active_account_count} conta{summary.active_account_count !== 1 ? 's' : ''} ativa
          {summary.active_account_count !== 1 ? 's' : ''}
        </p>
      </div>

      {/* By Account Type Cards */}
      {summary.by_account_type.map((type) => {
        const formattedBalance = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(type.total_balance);

        return (
          <div
            key={type.type}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{type.icon}</span>
              <div>
                <p className="text-xs font-medium text-gray-500">{type.label}</p>
                <p className="text-sm font-semibold text-gray-700">{type.count} conta{type.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{formattedBalance}</p>
            {type.default_account && (
              <p className="text-xs text-gray-500 mt-2">
                Padrão: <span className="font-medium">{type.default_account.account_name}</span>
              </p>
            )}
          </div>
        );
      })}

      {/* By Bank Cards */}
      {Object.entries(summary.total_by_bank).length > 0 && (
        <div className="md:col-span-2 border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-slate-600" />
            <h3 className="text-sm font-semibold text-gray-800">Consolidação por Banco</h3>
          </div>

          {/* Bank Summary with Bars */}
          <div className="space-y-3">
            {Object.entries(summary.total_by_bank)
              .sort(([, a], [, b]) => b - a) // Sort descending by balance
              .map(([bank, balance], idx) => {
                // Calculate percentage
                const totalBanksBalance = Object.values(summary.total_by_bank).reduce(
                  (sum, val) => sum + val,
                  0
                );
                const percentage = totalBanksBalance > 0 
                  ? ((balance / totalBanksBalance) * 100).toFixed(1)
                  : 0;

                const formattedBalance = new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(balance);

                const color = BANK_COLORS[idx % BANK_COLORS.length];

                return (
                  <div key={bank} className={`${color.bg} rounded-lg p-4 border border-slate-200`}>
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800 flex-1 truncate">{bank}</p>
                      <div className="flex items-baseline gap-2 ml-3">
                        <span className={`text-lg font-bold ${color.text}`}>{formattedBalance}</span>
                        <span className="text-xs font-medium text-gray-500 bg-white/60 px-2 py-0.5 rounded">
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color.bar} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-600">
                        {Object.values(summary.by_account_type).reduce((sum, type) => {
                          const count = type.count || 0;
                          return sum + count;
                        }, 0)} conta
                        {summary.active_account_count !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-1 text-xs">
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Ativo</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Legend / Total Info */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total em Bancos</p>
                <p className="text-lg font-bold text-gray-900">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(Object.values(summary.total_by_bank).reduce((sum, val) => sum + val, 0))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600">Bancos Ativos</p>
                <p className="text-lg font-bold text-slate-700">{Object.keys(summary.total_by_bank).length}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
