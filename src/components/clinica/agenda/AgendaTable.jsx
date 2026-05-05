import React, { useState } from 'react';
import { labelForStatus } from '@/lib/statusLabels';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const statusColors = {
  agendado: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmado: 'bg-green-100 text-green-800 border-green-200',
  esperando: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
  finalizado: 'bg-gray-100 text-gray-800 border-gray-200',
  atendimento: 'bg-purple-100 text-purple-800 border-purple-200',
  bloqueado: 'bg-gray-200 text-gray-700 border-gray-300',
  livre: 'bg-teal-100 text-teal-800 border-teal-200',
  aguardando_execucao: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  em_faturamento: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function AgendaTable({
  appointments = [],
  onClickSlot,
  loading,
  isProfessional,
  onStatusChange,
  selectedDate,
}) {
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');

  // Lista de opções de status em português
  const statusOptions = [
    { key: 'agendado', label: 'Agendado' },
    { key: 'confirmado', label: 'Confirmado' },
    { key: 'cancelado', label: 'Cancelado' },
    { key: 'faltou', label: 'Faltou' },
    { key: 'presente', label: 'Presente' },
    { key: 'em_consultorio', label: 'Em Consultório' },
    { key: 'atendido', label: 'Atendido' },
    { key: 'livre', label: 'Livre' },
  ];

  if (loading) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando agendamentos...
      </div>
    );
  }

  if (!appointments.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        Nenhum agendamento encontrado para esta data ou filtros.
      </div>
    );
  }

  // Filtrar agendamentos para o dia selecionado (America/Sao_Paulo)
  const dateToFilter = selectedDate ? new Date(selectedDate) : new Date();
  const { utcToZonedTime } = require('date-fns-tz');
  const { isSameDay } = require('date-fns');
  const appointmentsForDay = appointments.filter((apt) => {
    if (!apt.start_time) {
      return false;
    }
    try {
      const zoned = utcToZonedTime(apt.start_time, 'America/Sao_Paulo');
      return isSameDay(zoned, dateToFilter);
    } catch (e) {
      return false;
    }
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
          <tr>
            <th className="p-3 text-left">Hora</th>
            <th className="p-3 text-left hidden md:table-cell">Nº Prontuário</th>
            <th className="p-3 text-left">Paciente</th>
            <th className="p-3 text-left hidden lg:table-cell">Serviço</th>
            <th className="p-3 text-left hidden md:table-cell">Convênio</th>
            <th className="p-3 text-left hidden xl:table-cell">Valor</th>
            <th className="p-3 text-left">Status</th>
            {!isProfessional && (
              <th className="p-3 text-left hidden lg:table-cell">Profissional</th>
            )}
            <th className="p-3 text-left hidden xl:table-cell">Observações</th>
          </tr>
        </thead>
        <tbody>
          {appointmentsForDay.map((apt) => (
            <tr
              key={apt.id}
              className={`border-b hover:bg-gray-100/50 cursor-pointer transition-colors duration-150 ${apt.status === 'cancelado' ? 'bg-red-50/50' : ''} ${apt.status === 'confirmado' ? 'border-l-4 border-l-green-400' : ''}`}
              onClick={() => onClickSlot(apt)}
            >
              <td className="p-3 font-medium">
                {apt.start_time
                  ? (() => {
                    try {
                      const { utcToZonedTime, format: formatTz } = require('date-fns-tz');
                      const zoned = utcToZonedTime(apt.start_time, 'America/Sao_Paulo');
                      return formatTz(zoned, 'HH:mm', { timeZone: 'America/Sao_Paulo' });
                    } catch (e) {
                      return '-';
                    }
                  })()
                  : '-'}
                h
              </td>
              <td className="p-3 hidden md:table-cell">
                {apt.patient_record_number
                  ? String(apt.patient_record_number).padStart(6, '0')
                  : 'não existe'}
              </td>
              <td className="p-3 font-semibold">{apt.patient_name || '-'}</td>
              <td className="p-3 hidden lg:table-cell">{apt.service_name || '-'}</td>
              <td className="p-3 hidden md:table-cell">{apt.payer_name || 'Particular'}</td>
              <td className="p-3 hidden xl:table-cell">
                R$ {apt.price?.toFixed(2).replace('.', ',') || '0,00'}
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${statusColors[apt.status] || 'bg-gray-100 text-gray-800'} relative`}
                  >
                    {labelForStatus(apt.status) || 'N/A'}
                    {apt.status === 'aguardando_execucao' && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-400 rounded-full animate-pulse"></span>
                    )}
                    {apt.status === 'em_faturamento' && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-400 rounded-full animate-pulse"></span>
                    )}
                  </Badge>
                  {editingStatusId === apt.id ? (
                    <select
                      className="ml-1 px-2 py-1 text-xs bg-white text-blue-700 rounded border border-blue-200"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      onBlur={() => setEditingStatusId(null)}
                      autoFocus
                    >
                      <option value="">Selecione...</option>
                      {statusOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      className="ml-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
                      title="Alterar status"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStatusId(apt.id);
                        setSelectedStatus('');
                      }}
                    >
                      Editar
                    </button>
                  )}
                  {editingStatusId === apt.id && selectedStatus && (
                    <button
                      className="ml-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStatusId(null);
                        if (onStatusChange) {
                          onStatusChange(apt.id, selectedStatus);
                        }
                      }}
                    >
                      Salvar
                    </button>
                  )}
                </div>
              </td>
              {!isProfessional && (
                <td className="p-3 hidden lg:table-cell">{apt.professional_name || '-'}</td>
              )}
              <td className="p-3 hidden xl:table-cell truncate max-w-xs">{apt.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
