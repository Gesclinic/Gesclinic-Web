import React from 'react';
import { User, Stethoscope, Trash2, Activity, Building2, Wallet, FileText, Pencil } from 'lucide-react';
import type { CashMovement, CashMovementStatus } from '../types/CashMovement';

interface CashTableProps {
  movements: CashMovement[];
  loading: boolean;
  onEdit?: (movement: CashMovement) => void;
  onDelete?: (id: string) => Promise<void>;
}

const getStatusColor = (status: CashMovementStatus) => {
  switch (status) {
    case 'confirmado':
      return 'bg-green-100 text-green-800';
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800';
    case 'estornado':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

const formatCurrency = (value: number, isEntry: boolean) => {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">—</span>;
  }
  
  const formatted = value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return isEntry ? (
    <span className="text-green-600 font-semibold">{formatted}</span>
  ) : (
    <span className="text-red-600 font-semibold">-{formatted}</span>
  );
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const CashTable: React.FC<CashTableProps> = ({ movements, loading, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Nenhum movimento registrado</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-slate-100">
      <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-20">
          <tr>
            <th
              className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider sticky bg-slate-50 z-30 border-r border-slate-100"
              style={{ left: '0px' }}
            >
              ⏰ Hora
            </th>
            <th
              className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider sticky bg-slate-50 z-30 border-r border-slate-100"
              style={{ left: '100px' }}
            >
              <User className="inline mr-1 w-4 h-4" /> Paciente
            </th>
            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              <Activity className="inline mr-1 w-4 h-4" /> Serviço
            </th>
            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              <Building2 className="inline mr-1 w-4 h-4" /> Convênio
            </th>
            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              📌 Tipo
            </th>
            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              <Stethoscope className="inline mr-1 w-4 h-4" /> Profissional
            </th>
            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              <Wallet className="inline mr-1 w-4 h-4" /> Forma Pgto
            </th>
            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              <FileText className="inline mr-1 w-4 h-4" /> Descrição / Ref.
            </th>
            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
              💰 Valor
            </th>
            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              ✓ Status
            </th>
            <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider sticky right-0 bg-slate-50 z-30 border-l border-slate-100">
              Ação
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {movements.map((movement) => (
            <tr key={movement.id} className="hover:bg-slate-50/50 transition-colors">
              <td
                className="px-4 py-3 text-sm text-slate-700 font-medium sticky bg-white z-10 border-r border-slate-100"
                style={{ left: '0px' }}
              >
                {movement.created_at ? formatTime(movement.created_at) : 'N/A'}
              </td>
              <td
                className="px-4 py-3 text-sm text-slate-700 sticky bg-white z-10 border-r border-slate-100"
                style={{ left: '100px' }}
              >
                {movement.patient?.name || '—'}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">{movement.service?.name || '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {movement.payer_type === 'convenio' && movement.payer
                  ? movement.payer.name
                  : 'Particular'}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {movement.type === 'entrada' ? 'Receita' : 'Despesa'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {movement.professional?.name || '—'}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">{movement.payment_method || '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-700 min-w-56">
                <div className="font-medium text-slate-700">{movement.description || '—'}</div>
                {movement.reference_document && (
                  <div className="text-xs text-slate-500 mt-0.5">Ref.: {movement.reference_document}</div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {formatCurrency(movement.amount, movement.type === 'entrada')}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(movement.status)}`}
                >
                  {movement.status.charAt(0).toUpperCase() + movement.status.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-center sticky right-0 bg-white z-10 border-l border-slate-100">
                <div className="flex items-center justify-center gap-2">
                  {onEdit && movement.origin === 'manual' && (
                    <button
                      onClick={() => onEdit(movement)}
                      className="text-slate-400 hover:text-blue-600 transition"
                      title="Editar movimento"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(movement.id)}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Deletar movimento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
