import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  calculatePayablesByDueWindow,
  formatCurrency,
} from '@/lib/financialCalculations';
import { getOpenPayableBalance } from '@/services/dashboardDataService';

/**
 * 📤 Resumo de Contas a Pagar
 * 
 * Exibe 4 cards com valores a pagar em diferentes períodos:
 * - Hoje
 * - Próximos 7 dias
 * - Próximos 30 dias
 * - Vencidos
 */
export default function PayableSummary(props) {
  const { payables = [], loading = false } = props;
  const navigate = useNavigate();
  const detailsUrl = '/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=payable-summary&status=open,partial,approved,overdue';

  // Calcular períodos de pagamento
  const windows = useMemo(() => {
    return calculatePayablesByDueWindow(payables);
  }, [payables]);

  // Calcular total a pagar
  const total = useMemo(() => {
    return payables.reduce((sum, p) => {
      const status = String(p.status || '').toUpperCase();
      if (['OPEN', 'PARTIAL', 'APPROVED', 'OVERDUE'].includes(status)) {
        return sum + getOpenPayableBalance(p);
      }
      return sum;
    }, 0);
  }, [payables]);

  if (loading) {
    return (
      <Card className="mb-3 p-4 dark:bg-gray-800 dark:border-gray-700">
        <div className="mb-3 h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-3 border-orange-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 animate-slide-up">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          Contas a Pagar
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(detailsUrl)}
          className="h-8 gap-1.5 px-2.5 text-xs"
        >
          Ver Detalhes
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {total === 0 ? (
        <div className="rounded-md border border-orange-100 bg-orange-50/40 px-3 py-2 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <p className="text-xs">Nenhuma conta a pagar aberta</p>
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
            {/* Hoje */}
            <PayableWindow
              title="Hoje"
              value={windows.today}
              color="orange"
            />

            {/* Próximos 7 dias */}
            <PayableWindow
              title="Próximos 7 Dias"
              value={windows.next7d}
              color="amber"
            />

            {/* Próximos 30 dias */}
            <PayableWindow
              title="Próximos 30 Dias"
              value={windows.next30d}
              color="yellow"
            />

            {/* Vencidos */}
            <PayableWindow
              title="Vencidos"
              value={windows.overdue}
              color={windows.overdue > 0 ? 'red' : 'gray'}
              alert={windows.overdue > 0}
            />
          </div>

          <div className="border-t border-orange-100 pt-2 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Total a Pagar: <span className="font-bold text-gray-900 dark:text-white number-transition">{formatCurrency(total)}</span>
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

function PayableWindow({ title, value, color, alert = false }) {
  const bgClasses = {
    orange: 'bg-orange-50 dark:bg-orange-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    gray: 'bg-gray-50 dark:bg-gray-700/50',
  };

  const borderClasses = {
    orange: 'border-orange-300 dark:border-orange-700',
    amber: 'border-amber-300 dark:border-amber-700',
    yellow: 'border-yellow-300 dark:border-yellow-700',
    red: 'border-red-300 dark:border-red-700',
    gray: 'border-gray-300 dark:border-gray-600',
  };

  const textClasses = {
    orange: 'text-orange-900 dark:text-orange-300',
    amber: 'text-amber-900 dark:text-amber-300',
    yellow: 'text-yellow-900 dark:text-yellow-300',
    red: 'text-red-900 dark:text-red-300',
    gray: 'text-gray-900 dark:text-gray-300',
  };

  return (
    <div className={`${bgClasses[color]} border ${borderClasses[color]} rounded-md p-2.5 animate-slide-up card-hover`}>
      <p className="mb-1 text-[11px] font-medium text-gray-600 dark:text-gray-400">{title}</p>
      <p className={`text-sm font-bold ${textClasses[color]} number-transition`}>
        {formatCurrency(value)}
      </p>
      {alert && (
        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">Atenção necessária</p>
      )}
    </div>
  );
}
