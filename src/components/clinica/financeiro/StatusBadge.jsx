import React from 'react';

const statusStyles = {
  open: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  scheduled: 'bg-blue-100 text-blue-800',
};

export default function StatusBadge({ status }) {
  const s = String(status || 'open').toLowerCase();
  const cls = statusStyles[s] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {s === 'open' && 'Em aberto'}
      {s === 'paid' && 'Paga'}
      {s === 'overdue' && 'Vencida'}
      {s === 'scheduled' && 'Agendada'}
      {!['open','paid','overdue','scheduled'].includes(s) && s}
    </span>
  );
}
