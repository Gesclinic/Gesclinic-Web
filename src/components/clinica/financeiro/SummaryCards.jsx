import React from 'react';
import { AlertTriangle, Clock, CalendarDays, CircleDollarSign } from 'lucide-react';
import { formatBRL } from '@/utils/formatCurrency';
import { isOverdue, inNextNDays, inPeriod } from '@/utils/dateUtils';

export default function SummaryCards({ items, startFilter, endFilter }) {
  const open = items.filter(it => { const st = String(it.status || 'open').toLowerCase(); return st !== 'paid' && st !== 'canceled'; });
  const overdue = open.filter(it => isOverdue(it));
  const next7 = open.filter(it => inNextNDays(it, 7));
  const periodItems = items.filter(it => inPeriod(it, startFilter, endFilter));

  const cards = [
    { key: 'open', label: 'Total em aberto', value: open.reduce((acc, it) => acc + Number(it.amount || 0), 0), icon: CircleDollarSign, border: 'border-yellow-400', iconBg: 'bg-yellow-100', iconText: 'text-yellow-700', labelText: 'text-yellow-700' },
    { key: 'overdue', label: 'Total vencido', value: overdue.reduce((acc, it) => acc + Number(it.amount || 0), 0), icon: AlertTriangle, border: 'border-red-400', iconBg: 'bg-red-100', iconText: 'text-red-700', labelText: 'text-red-700' },
    { key: 'period', label: 'Total do período filtrado', value: periodItems.reduce((acc, it) => acc + Number(it.amount || 0), 0), icon: CalendarDays, border: 'border-indigo-400', iconBg: 'bg-indigo-100', iconText: 'text-indigo-700', labelText: 'text-indigo-700' },
    { key: 'next7', label: 'Total próximos 7 dias', value: next7.reduce((acc, it) => acc + Number(it.amount || 0), 0), icon: Clock, border: 'border-blue-400', iconBg: 'bg-blue-100', iconText: 'text-blue-700', labelText: 'text-blue-700' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
      {cards.map(c => (
        <div key={c.key} className={`border rounded p-2 bg-white border-l-4 ${c.border}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-full ${c.iconBg} ${c.iconText}`}>
              {c.icon && React.createElement(c.icon, { className: 'w-4 h-4' })}
            </div>
            <div>
              <div className={`text-[11px] ${c.labelText}`}>{c.label}</div>
              <div className="text-base font-semibold">{formatBRL(c.value)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
