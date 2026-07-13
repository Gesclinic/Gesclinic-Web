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
      <Card className="mb-3 p-4 dark:bg-gray-800 dark:border-gray-700">
        <div className="mb-3 h-7 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  if (alerts.length === 1 && alerts[0].severity === 'success') {
    const alert = alerts[0];
    return (
      <Card className="mb-3 border-green-200 bg-green-50/60 p-3 dark:border-green-800 dark:bg-green-900/20 animate-slide-up">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-green-700 dark:text-green-300">{alert.title}</span>
          <span className="text-xs text-gray-700 dark:text-gray-300">{alert.message}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-3 border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700 animate-slide-up">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        Alertas Financeiros
      </h2>

      <div className="space-y-2">
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
    <div className={`rounded-md border p-3 ${getSeverityBgClass(alert.severity)}`}>
      <div className="flex gap-2.5">
        {/* Ícone */}
        <div className={`flex-shrink-0 ${getSeverityIconClass(alert.severity)}`}>
          {getAlertIcon(alert.severity)}
        </div>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1">
          <h3 className={`mb-0.5 text-sm font-semibold ${getSeverityTextClass(alert.severity)}`}>
            {alert.title}
          </h3>
          <p className="mb-1 text-xs text-gray-700 dark:text-gray-300">{alert.message}</p>

          {alert.impactEstimate && (
            <p className="mb-1 text-xs font-medium text-gray-600">
              {alert.impactEstimate}
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
              className="h-7 gap-1 px-2 text-xs"
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
