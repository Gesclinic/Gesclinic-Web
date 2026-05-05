// src/components/financeiro/conciliacao/ConciliaoIndicadores.jsx
// Indicadores de conciliação bancária

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/formatters';
import { CONCILIATION_STATUS_VISUAL, CONCILIATION_STATUS } from '@/lib/conciliationStatus';

export function ConciliaoIndicadores({ indicators, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      {/* Pendentes */}
      <Card className="p-4 border-l-4 border-yellow-400">
        <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {CONCILIATION_STATUS_VISUAL[CONCILIATION_STATUS.PENDING].icon}
          Pendentes
        </div>
        <div className="text-2xl font-bold text-yellow-600 mt-2">
          {formatCurrency(indicators.pending || 0)}
        </div>
        <p className="text-xs text-gray-500 mt-1">Aguardando conciliação</p>
      </Card>

      {/* Conciliados */}
      <Card className="p-4 border-l-4 border-green-400">
        <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {CONCILIATION_STATUS_VISUAL[CONCILIATION_STATUS.CONCILIATED].icon}
          Conciliados
        </div>
        <div className="text-2xl font-bold text-green-600 mt-2">
          {formatCurrency(indicators.conciliated || 0)}
        </div>
        <p className="text-xs text-gray-500 mt-1">Vinculados com sucesso</p>
      </Card>

      {/* Ajustados */}
      <Card className="p-4 border-l-4 border-blue-400">
        <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {CONCILIATION_STATUS_VISUAL[CONCILIATION_STATUS.ADJUSTED].icon}
          Ajustados
        </div>
        <div className="text-2xl font-bold text-blue-600 mt-2">
          {formatCurrency(indicators.adjusted || 0)}
        </div>
        <p className="text-xs text-gray-500 mt-1">Lançamentos criados</p>
      </Card>

      {/* Divergentes */}
      <Card className="p-4 border-l-4 border-red-400">
        <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {CONCILIATION_STATUS_VISUAL[CONCILIATION_STATUS.DIVERGENT].icon}
          Divergências
        </div>
        <div className="text-2xl font-bold text-red-600 mt-2">
          {formatCurrency(indicators.divergent || 0)}
        </div>
        <p className="text-xs text-gray-500 mt-1">Não bateu</p>
      </Card>

      {/* Total Créditos */}
      <Card className="p-4 border-l-4 border-emerald-400">
        <div className="text-sm font-medium text-gray-600">Entradas (Créditos)</div>
        <div className="text-2xl font-bold text-emerald-600 mt-2">
          {formatCurrency(indicators.totalCredit || 0)}
        </div>
        <p className="text-xs text-gray-500 mt-1">Total recebido</p>
      </Card>

      {/* Total Débitos */}
      <Card className="p-4 border-l-4 border-orange-400">
        <div className="text-sm font-medium text-gray-600">Saídas (Débitos)</div>
        <div className="text-2xl font-bold text-orange-600 mt-2">
          {formatCurrency(indicators.totalDebit || 0)}
        </div>
        <p className="text-xs text-gray-500 mt-1">Total pago</p>
      </Card>
    </div>
  );
}
