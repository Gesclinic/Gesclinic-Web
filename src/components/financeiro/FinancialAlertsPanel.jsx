import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  PAYABLES_FROM_CASHFLOW_URL,
  RECEIVABLES_OPEN_FROM_CASHFLOW_URL,
  RECEIVABLES_OVERDUE_FROM_CASHFLOW_URL,
  generateFinancialAlerts,
  getSeverityColor,
} from '@/lib/financialInsights';

const defaultAlertActionLinks = {
  overdue: RECEIVABLES_OVERDUE_FROM_CASHFLOW_URL,
  'low-liquidity': RECEIVABLES_OVERDUE_FROM_CASHFLOW_URL,
  'low-coverage': RECEIVABLES_OPEN_FROM_CASHFLOW_URL,
  'no-revenue': RECEIVABLES_OPEN_FROM_CASHFLOW_URL,
  'revenue-decrease': RECEIVABLES_OPEN_FROM_CASHFLOW_URL,
  'negative-balance': PAYABLES_FROM_CASHFLOW_URL,
  'expense-increase': PAYABLES_FROM_CASHFLOW_URL,
};

/**
 * 🚨 Painel de Alertas Financeiros Inteligentes
 * 
 * Gera alertas automáticos baseado em:
 * - Contas vencidas
 * - Saldo negativo
 * - Liquidez baixa
 * - Dias de cobertura baixos
 * - Ausência de receitas
 * - Aumento de despesas
 * - Queda de receitas
 */
export default function FinancialAlertsPanel(props) {
  const { summary, receivables = [], payables = [], previousSummary, loading = false } = props;
  const navigate = useNavigate();

  // Gerar alertas automáticos
  const alerts = useMemo(() => {
    return generateFinancialAlerts(summary, receivables, payables, previousSummary);
  }, [summary, receivables, payables, previousSummary]);

  if (loading) {
    return (
      <Card className="p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 mb-6 border-l-4 border-gray-300 dark:bg-gray-800 dark:border-l-gray-700 dark:border-gray-700 animate-slide-up">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        Alertas Financeiros
      </h2>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} navigate={navigate} />
        ))}
      </div>
    </Card>
  );
}

function AlertItem({ alert, navigate }) {
  const actionLink = alert.actionLink || defaultAlertActionLinks[alert.type];

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />;
      case 'high':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <Info className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityBgClass = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'high':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const getSeverityTextClass = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700 dark:text-red-300';
      case 'high':
        return 'text-orange-700 dark:text-orange-300';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'success':
        return 'text-green-700 dark:text-green-300';
      default:
        return 'text-blue-700 dark:text-blue-300';
    }
  };

  const getSeverityIconClass = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getSeverityBgClass(alert.severity)}`}>
      <div className="flex gap-3">
        {/* Ícone */}
        <div className={`flex-shrink-0 ${getSeverityIconClass(alert.severity)}`}>
          {getAlertIcon(alert.severity)}
        </div>

        {/* Conteúdo */}
        <div className="flex-1">
          <h3 className={`font-semibold ${getSeverityTextClass(alert.severity)} mb-1`}>
            {alert.title}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{alert.message}</p>

          {alert.impactEstimate && (
            <p className="text-xs font-medium text-gray-600 mb-2">
              💡 {alert.impactEstimate}
            </p>
          )}

          {alert.action && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (actionLink) {
                  navigate(actionLink);
                }
              }}
              className="gap-1"
            >
              {alert.action}
              <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
