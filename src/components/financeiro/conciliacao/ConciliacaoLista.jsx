// src/components/financeiro/conciliacao/ConciliacaoLista.jsx
// Lista de movimentações do extrato

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  CONCILIATION_STATUS_VISUAL,
  CONCILIATION_STATUS,
  TRANSACTION_TYPE,
} from '@/lib/conciliationStatus';

export function ConciliacaoLista({
  statements,
  loading,
  onSelectStatement,
  onBulkConciliate,
  selectedStatements = [],
  onToggleSelect,
}) {
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);

  const filtered = statements.filter((stmt) => {
    if (statusFilter && stmt.status !== statusFilter) {
      return false;
    }
    if (typeFilter && stmt.transaction_type !== typeFilter) {
      return false;
    }
    return true;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      filtered.forEach((stmt) => {
        if (!selectedStatements.includes(stmt.id)) {
          onToggleSelect(stmt.id);
        }
      });
    } else {
      filtered.forEach((stmt) => {
        if (selectedStatements.includes(stmt.id)) {
          onToggleSelect(stmt.id);
        }
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando lançamentos...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Movimentações do Extrato ({filtered.length})
        </h3>

        {selectedStatements.length > 0 && (
          <div className="flex gap-2">
            <span className="text-sm text-gray-600">
              {selectedStatements.length} selecionado(s)
            </span>
            <Button
              onClick={() => onBulkConciliate(selectedStatements)}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              Conciliar Selecionados
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(CONCILIATION_STATUS).map(([key, value]) => (
            <option key={value} value={value}>
              {CONCILIATION_STATUS_VISUAL[value].label}
            </option>
          ))}
        </select>

        <select
          value={typeFilter || ''}
          onChange={(e) => setTypeFilter(e.target.value || null)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os tipos</option>
          <option value={TRANSACTION_TYPE.CREDIT}>Crédito (Entrada)</option>
          <option value={TRANSACTION_TYPE.DEBIT}>Débito (Saída)</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && filtered.every((s) => selectedStatements.includes(s.id))
                  }
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Descrição</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Valor</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Tipo</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                  Nenhum lançamento encontrado
                </td>
              </tr>
            ) : (
              filtered.map((stmt) => {
                const visual = CONCILIATION_STATUS_VISUAL[stmt.status];
                const isCredit = stmt.transaction_type === TRANSACTION_TYPE.CREDIT;

                return (
                  <tr key={stmt.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedStatements.includes(stmt.id)}
                        onChange={() => onToggleSelect(stmt.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatDate(stmt.statement_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {stmt.description.substring(0, 40)}
                      {stmt.description.length > 40 ? '...' : ''}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${isCredit ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {isCredit ? '+' : '-'} {formatCurrency(stmt.amount)}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      <span
                        className={`px-2 py-1 rounded ${isCredit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {isCredit ? 'Crédito' : 'Débito'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${visual.className}`}>
                        {visual.icon} {visual.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        onClick={() => onSelectStatement(stmt)}
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        →
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
