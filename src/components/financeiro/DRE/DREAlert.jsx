/**
 * Componente de Alerta da DRE
 * Mostra alertas para limites de lucratividade
 */

import React, { useState, useEffect } from 'react';

export default function DREAlert({ currentMonth }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (currentMonth) {
      const newAlerts = [];

      // Check gross margin
      if (currentMonth.gross_margin_pct < 20) {
        newAlerts.push({
          id: 'gross-margin',
          type: 'warning',
          title: 'Margem Bruta Baixa',
          message: `Margem bruta é ${currentMonth.gross_margin_pct.toFixed(2)}%. Meta: ≥20%`,
          icon: '⚠️'
        });
      }

      // Check operating margin
      if (currentMonth.operating_margin_pct < 15) {
        newAlerts.push({
          id: 'operating-margin',
          type: 'warning',
          title: 'Margem Operacional Baixa',
          message: `Margem operacional é ${currentMonth.operating_margin_pct.toFixed(2)}%. Meta: ≥15%`,
          icon: '⚠️'
        });
      }

      // Check net margin
      if (currentMonth.net_margin_pct < 10) {
        newAlerts.push({
          id: 'net-margin',
          type: 'error',
          title: 'Margem Líquida Crítica',
          message: `Margem líquida é ${currentMonth.net_margin_pct.toFixed(2)}%. Meta: ≥10%`,
          icon: '🚨'
        });
      }

      // Check negative net income
      if (currentMonth.net_income < 0) {
        newAlerts.push({
          id: 'negative-income',
          type: 'error',
          title: 'Prejuízo Operacional',
          message: `Lucro líquido é negativo: R$ ${currentMonth.net_income.toFixed(2)}`,
          icon: '🚨'
        });
      }

      // Check commission ratio
      const commissionRatio = currentMonth.total_medical_commissions > 0
        ? (currentMonth.total_medical_commissions / currentMonth.gross_revenue) * 100
        : 0;

      if (commissionRatio > 35) {
        newAlerts.push({
          id: 'high-commissions',
          type: 'info',
          title: 'Comissões Médicas Altas',
          message: `Comissões representam ${commissionRatio.toFixed(2)}% da receita`,
          icon: '💡'
        });
      }

      setAlerts(newAlerts);
    }
  }, [currentMonth]);

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-semibold text-green-900">Todos os Sistemas Saudáveis</p>
          <p className="text-sm text-green-800">As métricas de lucratividade estão dentro dos intervalos ótimos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const bgColor = alert.type === 'error'
          ? 'bg-red-50 border-red-200'
          : alert.type === 'warning'
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-blue-50 border-blue-200';

        const textColor = alert.type === 'error'
          ? 'text-red-900'
          : alert.type === 'warning'
          ? 'text-yellow-900'
          : 'text-blue-900';

        return (
          <div
            key={alert.id}
            className={`border-l-4 ${
              alert.type === 'error'
                ? 'border-red-500'
                : alert.type === 'warning'
                ? 'border-yellow-500'
                : 'border-blue-500'
            } rounded-lg p-4 ${bgColor}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{alert.icon}</span>
              <div>
                <p className={`font-semibold ${textColor}`}>
                  {alert.title}
                </p>
                <p className={`text-sm ${textColor} opacity-90 mt-1`}>
                  {alert.message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
