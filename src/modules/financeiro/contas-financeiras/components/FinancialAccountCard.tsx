/**
 * Financial Account Card Component
 * Displays summary card for a single account
 */

import React from 'react';
import { Star } from 'lucide-react';
import { FinancialAccount, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '../types';

interface FinancialAccountCardProps {
  account: FinancialAccount;
  onClick?: () => void;
  isDefault?: boolean;
  className?: string;
}

export const FinancialAccountCard = React.memo<FinancialAccountCardProps>(({
  account,
  onClick,
  isDefault = false,
  className = '',
}) => {
  const formattedBalance = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: account.currency,
  }).format(account.current_balance);

  return (
    <div
      onClick={onClick}
      className={`
        p-4 border rounded-lg bg-white hover:shadow-md transition-shadow
        ${onClick ? 'cursor-pointer' : ''}
        ${isDefault ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{account.account_name}</h3>
          <p className="text-sm text-gray-500">{account.bank_name}</p>
        </div>
        {isDefault && (
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" title="Conta padrão" />
        )}
      </div>

      {/* Type */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">{ACCOUNT_TYPE_ICONS[account.account_type]}</span>
        <span className="text-sm text-gray-600">
          {ACCOUNT_TYPE_LABELS[account.account_type]}
        </span>
      </div>

      {/* Account Details */}
      <div className="text-xs text-gray-500 mb-3 space-y-1">
        <p>
          {account.agency && <span>{account.agency} / </span>}
          <span>{account.account_number}</span>
        </p>
        {account.pix_key && <p>PIX: {account.pix_key}</p>}
      </div>

      {/* Balance */}
      <div className="pt-3 border-t">
        <p className="text-xs text-gray-500 mb-1">Saldo Atual</p>
        <p className="text-2xl font-bold text-gray-900">{formattedBalance}</p>
      </div>

      {/* Status Badge */}
      {!account.is_active && (
        <div className="mt-3 pt-3 border-t">
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
            Inativa
          </span>
        </div>
      )}
    </div>
  );
});
