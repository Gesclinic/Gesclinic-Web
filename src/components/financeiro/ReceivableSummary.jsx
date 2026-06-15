import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  calculateReceivablesByDueWindow,
  formatCurrency,
} from '@/lib/financialCalculations';

/**
 * 📥 Resumo de Contas a Receber
 * 
 * Exibe 4 cards com valores a receber em diferentes períodos:
 * - Hoje
 * - Próximos 7 dias
 * - Próximos 30 dias
 * - Vencidos
 */
export default function ReceivableSummary(props) {
  const { receivables = [], loading = false } = props;
  const navigate = useNavigate();
  const detailsUrl = '/clinica/financeiro/receber?from=fluxo-caixa&trace=receivable-summary';

  // Calcular períodos de recebimento
  const windows = useMemo(() => {
    return calculateReceivablesByDueWindow(receivables);
  }, [receivables]);

  // Calcular total a receber
  const total = useMemo(() => {
    return receivables.reduce((sum, r) => {
      if (r.status === 'open') return sum + Number(r.net_value ?? r.balance_amount ?? r.amount ?? 0);
      return sum;
    }, 0);
  }, [receivables]);

  if (loading) {
    return (
      <Card className="p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-white border-blue-200 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Contas a Receber
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(detailsUrl)}
          className="gap-2"
        >
          Ver Detalhes
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {total === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">Nenhuma conta a receber aberta</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Hoje */}
            <ReceivableWindow
              title="Hoje"
              value={windows.today}
              color="blue"
            />

            {/* Próximos 7 dias */}
            <ReceivableWindow
              title="Próximos 7 Dias"
              value={windows.next7d}
              color="cyan"
            />

            {/* Próximos 30 dias */}
            <ReceivableWindow
              title="Próximos 30 Dias"
              value={windows.next30d}
              color="green"
            />

            {/* Vencidos */}
            <ReceivableWindow
              title="Vencidos"
              value={windows.overdue}
              color={windows.overdue > 0 ? 'red' : 'gray'}
              alert={windows.overdue > 0}
            />
          </div>

          <div className="pt-4 border-t border-blue-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total a Receber: <span className="font-bold text-gray-900 dark:text-white number-transition">{formatCurrency(total)}</span>
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

function ReceivableWindow({ title, value, color, alert = false }) {
  const bgClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20',
    green: 'bg-green-50 dark:bg-green-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    gray: 'bg-gray-50 dark:bg-gray-700/50',
  };

  const borderClasses = {
    blue: 'border-blue-300 dark:border-blue-700',
    cyan: 'border-cyan-300 dark:border-cyan-700',
    green: 'border-green-300 dark:border-green-700',
    red: 'border-red-300 dark:border-red-700',
    gray: 'border-gray-300 dark:border-gray-600',
  };

  const textClasses = {
    blue: 'text-blue-900 dark:text-blue-300',
    cyan: 'text-cyan-900 dark:text-cyan-300',
    green: 'text-green-900 dark:text-green-300',
    red: 'text-red-900 dark:text-red-300',
    gray: 'text-gray-900 dark:text-gray-300',
  };

  return (
    <div className={`${bgClasses[color]} border ${borderClasses[color]} rounded-lg p-4 animate-slide-up card-hover`}>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{title}</p>
      <p className={`text-lg font-bold ${textClasses[color]} number-transition`}>
        {formatCurrency(value)}
      </p>
      {alert && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">⚠️ Atenção necessária</p>
      )}
    </div>
  );
}
