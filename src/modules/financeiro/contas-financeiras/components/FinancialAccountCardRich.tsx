/**
 * Financial Account Card Component (Enriched)
 * Displays account information with balance, reconciliation status, and last movement
 */

import React from 'react';
import { MoreVertical, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FinancialAccountCardData, RECONCILIATION_STATUS_LABELS, RECONCILIATION_STATUS_COLORS } from '../types';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '../types';

interface FinancialAccountCardProps {
  account: FinancialAccountCardData;
  onEdit?: (account: FinancialAccountCardData) => void;
  onSetDefault?: (account: FinancialAccountCardData) => void;
  onDeactivate?: (account: FinancialAccountCardData) => void;
  onViewMovements?: (account: FinancialAccountCardData) => void;
}

/**
 * Memoized Financial Account Card Component
 */
export const FinancialAccountCard = React.memo<FinancialAccountCardProps>(
  ({ account, onEdit, onSetDefault, onDeactivate, onViewMovements }) => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    const formatDate = (dateString?: string) => {
      if (!dateString) return '—';
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString));
    };

    const reconciliationStatusClass = account.reconciliation_status
      ? RECONCILIATION_STATUS_COLORS[account.reconciliation_status]
      : 'bg-gray-100 text-gray-800';

    const reconciliationStatusLabel = account.reconciliation_status
      ? RECONCILIATION_STATUS_LABELS[account.reconciliation_status]
      : 'Não verificado';

    const getReconciliationIcon = () => {
      switch (account.reconciliation_status) {
        case 'conciliado':
          return <CheckCircle className="w-4 h-4" />;
        case 'divergente':
          return <AlertCircle className="w-4 h-4" />;
        case 'pendente':
        default:
          return <Clock className="w-4 h-4" />;
      }
    };

    return (
      <div className={`border rounded-lg p-5 bg-white hover:shadow-lg transition-shadow ${!account.is_active ? 'opacity-60' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{ACCOUNT_TYPE_ICONS[account.account_type]}</span>
              <div>
                <h3 className="font-semibold text-base">{account.account_name}</h3>
                <p className="text-sm text-gray-500">{account.bank_name}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {account.agency && `Agência: ${account.agency}`} • {account.account_number}
            </p>
          </div>
          
          {/* Status Badge */}
          <div className="flex flex-col items-end gap-2">
            {account.is_default && (
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                Padrão
              </span>
            )}
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${account.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {account.is_active ? 'Ativa' : 'Inativa'}
            </span>
          </div>
        </div>

        {/* Balances Section */}
        <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Saldo Atual</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(account.current_balance)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Saldo Conciliado</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(account.balance_reconciled || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Saldo Previsto</p>
            <p className="text-lg font-bold text-orange-600">
              {formatCurrency((account.balance_pending || 0) + account.current_balance)}
            </p>
          </div>
        </div>

        {/* Reconciliation Info */}
        {account.allows_reconciliation && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className={`flex items-center gap-2 flex-1`}>
              <div className={`${reconciliationStatusClass} p-2 rounded-full`}>
                {getReconciliationIcon()}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Status Conciliação</p>
                <p className="text-sm font-semibold">{reconciliationStatusLabel}</p>
              </div>
            </div>
            {account.last_reconciliation_at && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Última:</p>
                <p className="text-xs font-medium">{formatDate(account.last_reconciliation_at)}</p>
              </div>
            )}
          </div>
        )}

        {/* Last Movement */}
        {account.last_movement && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs font-medium text-blue-600 mb-1">Última Movimentação</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{account.last_movement.description}</p>
                <p className="text-xs text-gray-500">
                  {new Intl.DateTimeFormat('pt-BR').format(new Date(account.last_movement.movement_date))} • 
                  <span className={account.last_movement.movement_type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                    {' '}{account.last_movement.movement_type === 'entrada' ? '+' : '-'}{formatCurrency(account.last_movement.amount)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Fields Summary */}
        {(account.bank_code || account.participates_cashflow || account.credit_limit) && (
          <div className="mb-4 text-xs text-gray-600 space-y-1">
            {account.bank_code && <p>💳 Código: {account.bank_code}</p>}
            {account.participates_cashflow && <p>📊 Participa do fluxo de caixa</p>}
            {account.credit_limit && account.credit_limit > 0 && (
              <p>💰 Limite de crédito: {formatCurrency(account.credit_limit)}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(account)}
            className="flex-1"
          >
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewMovements?.(account)}
            className="flex-1"
          >
            Movimentações
          </Button>
          {!account.is_default && account.is_active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetDefault?.(account)}
              title="Definir como padrão"
            >
              ⭐
            </Button>
          )}
          {account.is_active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeactivate?.(account)}
              title="Desativar"
            >
              🔴
            </Button>
          )}
        </div>
      </div>
    );
  }
);

FinancialAccountCard.displayName = 'FinancialAccountCard';
