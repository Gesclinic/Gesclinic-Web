/**
 * Component: AccountTypeBadge
 * Displays account type and nature with color coding
 */

import React from 'react';
import { AccountType, AccountNature } from '../types';

const typeColors: Record<AccountType, { bg: string; text: string; border: string }> = {
  RECEITA: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' },
  DESPESA: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
  CUSTO: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  DEDUCAO: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  HONORARIO: { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-300' },
  INVESTIMENTO: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  ATIVO: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  PASSIVO: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
  PATRIMONIO: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
};

const typeLabels: Record<AccountType, string> = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
  CUSTO: 'Custo',
  DEDUCAO: 'Deducao',
  HONORARIO: 'Honorario',
  INVESTIMENTO: 'Investimento',
  ATIVO: 'Ativo',
  PASSIVO: 'Passivo',
  PATRIMONIO: 'Patrimonio',
};

const fallbackColor = { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-300' };

const natureColors: Record<AccountNature, { bg: string; text: string; border: string }> = {
  CREDORA: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' },
  DEVEDORA: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
};

const natureLabels: Record<AccountNature, string> = {
  CREDORA: 'Credora',
  DEVEDORA: 'Devedora',
};

interface AccountTypeBadgeProps {
  type: AccountType;
  nature?: AccountNature;
  variant?: 'type' | 'nature' | 'both';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AccountTypeBadge: React.FC<AccountTypeBadgeProps> = ({
  type,
  nature,
  variant = 'type',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const typeColor = typeColors[type] || fallbackColor;
  const natureColor = nature ? natureColors[nature] || fallbackColor : null;
  const typeLabel = typeLabels[type] || type;
  const natureLabel = nature ? natureLabels[nature] || nature : null;

  if (variant === 'both' && nature) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <span
          className={`inline-flex items-center font-medium rounded-full border ${sizeClasses[size]} ${typeColor.bg} ${typeColor.text} ${typeColor.border} border`}
        >
          {typeLabel}
        </span>
        <span
          className={`inline-flex items-center font-medium rounded-full border ${sizeClasses[size]} ${natureColor.bg} ${natureColor.text} ${natureColor.border} border`}
        >
          {natureLabel}
        </span>
      </div>
    );
  }

  if (variant === 'nature' && nature) {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full border ${sizeClasses[size]} ${natureColor.bg} ${natureColor.text} ${natureColor.border} border`}
      >
        {natureLabel}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses[size]} ${typeColor.bg} ${typeColor.text} ${typeColor.border} border`}
    >
      {typeLabel}
    </span>
  );
};

export default AccountTypeBadge;
