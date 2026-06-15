/**
 * Status Badges Component
 * Enterprise-standard badges for reconciliation, account, and movement statuses
 */

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Power, Zap } from 'lucide-react';

/**
 * Reconciliation Status Badge
 */
export const ReconciliationBadge: React.FC<{ status: 'conciliado' | 'pendente' | 'divergente' | null }> = ({ status }) => {
  if (!status) {
    return <span className="text-xs text-gray-500">—</span>;
  }

  const badges = {
    conciliado: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: 'Conciliado',
    },
    pendente: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <Clock className="w-4 h-4" />,
      label: 'Pendente',
    },
    divergente: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Divergente',
    },
  };

  const badge = badges[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
    >
      {badge.icon}
      {badge.label}
    </span>
  );
};

/**
 * Account Status Badge
 */
export const AccountStatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Zap className="w-4 h-4" />
        Ativa
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      <Power className="w-4 h-4" />
      Inativa
    </span>
  );
};

/**
 * Movement Type Badge
 */
export const MovementTypeBadge: React.FC<{ type: 'entrada' | 'saida' }> = ({ type }) => {
  const badges = {
    entrada: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      label: '↑ Entrada',
    },
    saida: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      label: '↓ Saída',
    },
  };

  const badge = badges[type];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
      {badge.label}
    </span>
  );
};

/**
 * Default Account Badge
 */
export const DefaultAccountBadge: React.FC = () => {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
      ⭐ Padrão
    </span>
  );
};

/**
 * Generic Status Badge
 */
interface GenericBadgeProps {
  label: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'cyan';
  icon?: React.ReactNode;
}

export const GenericBadge: React.FC<GenericBadgeProps> = ({ label, color = 'gray', icon }) => {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {icon}
      {label}
    </span>
  );
};
