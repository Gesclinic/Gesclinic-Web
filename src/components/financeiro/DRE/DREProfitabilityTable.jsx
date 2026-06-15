/**
 * DRE Profitability Table Component
 * Shows profitability metrics and ratios
 */

import React from 'react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

const formatPercent = (value) => {
  return `${(value || 0).toFixed(2)}%`;
};

const getMarginColor = (percent) => {
  if (percent >= 30) return 'text-green-700 bg-green-50';
  if (percent >= 20) return 'text-green-600 bg-green-50';
  if (percent >= 10) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

export default function DREProfitabilityTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhum dado de lucratividade disponível ainda
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Período</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Receita</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Despesas</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Resultado Líquido</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Margem Bruta</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Margem Operacional</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Margem Líquida</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
            >
              <td className="py-3 px-4 text-gray-900 font-medium">
                {new Date(row.period_start_date).toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric'
                })}
              </td>
              <td className="text-right py-3 px-4 text-gray-900">
                {formatCurrency(row.gross_revenue || 0)}
              </td>
              <td className="text-right py-3 px-4 text-gray-900">
                {formatCurrency(row.total_operating_expenses || 0)}
              </td>
              <td className={`text-right py-3 px-4 font-semibold ${
                (row.net_income || 0) >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {formatCurrency(row.net_income || 0)}
              </td>
              <td className={`text-right py-3 px-4 font-medium rounded ${
                getMarginColor(row.gross_margin_pct)
              }`}>
                {formatPercent(row.gross_margin_pct)}
              </td>
              <td className={`text-right py-3 px-4 font-medium rounded ${
                getMarginColor(row.operating_margin_pct)
              }`}>
                {formatPercent(row.operating_margin_pct)}
              </td>
              <td className={`text-right py-3 px-4 font-medium rounded ${
                getMarginColor(row.net_margin_pct)
              }`}>
                {formatPercent(row.net_margin_pct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
