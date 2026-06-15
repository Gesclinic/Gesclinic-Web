/**
 * Componente de Cartões KPI da DRE
 * Mostra indicadores-chave de desempenho: Receita, Despesas, Lucro Líquido, Margens
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

export default function DREKPICards({ currentMonth, ytd }) {
  const cards = [
    {
      title: 'Receita Bruta',
      value: currentMonth?.gross_revenue || 0,
      format: 'currency',
      icon: '📈',
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-900'
    },
    {
      title: 'Despesas Operacionais',
      value: currentMonth?.total_operating_expenses || 0,
      format: 'currency',
      icon: '💸',
      color: 'bg-red-50 border-red-200',
      textColor: 'text-red-900',
      isNegative: true
    },
    {
      title: 'Comissões Médicas',
      value: currentMonth?.total_medical_commissions || 0,
      format: 'currency',
      icon: '👨‍⚕️',
      color: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-900',
      isNegative: true
    },
    {
      title: 'Resultado Operacional',
      value: currentMonth?.operating_income || 0,
      format: 'currency',
      icon: '💰',
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-900'
    },
    {
      title: 'Margem Bruta',
      value: currentMonth?.gross_margin_pct || 0,
      format: 'percent',
      icon: '📊',
      color: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-900'
    },
    {
      title: 'Margem Líquida',
      value: currentMonth?.net_margin_pct || 0,
      format: 'percent',
      icon: '🎯',
      color: 'bg-indigo-50 border-indigo-200',
      textColor: 'text-indigo-900'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`border-2 rounded-lg p-6 ${card.color}`}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className={`text-sm font-semibold ${card.textColor}`}>
              {card.title}
            </h3>
            <span className="text-2xl">{card.icon}</span>
          </div>
          <p className={`text-2xl font-bold ${card.textColor}`}>
            {card.format === 'currency'
              ? formatCurrency(card.value)
              : formatPercent(card.value)}
          </p>
          {ytd && card.format === 'currency' && (
            <p className="text-xs text-gray-600 mt-2">
              YTD: {formatCurrency(
                card.title === 'Receita Bruta' ? ytd.total_gross_revenue :
                card.title === 'Despesas Operacionais' ? ytd.total_operating_expenses :
                card.title === 'Comissões Médicas' ? ytd.total_medical_commissions :
                card.title === 'Resultado Operacional' ? ytd.total_operating_income : 0
              )}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
