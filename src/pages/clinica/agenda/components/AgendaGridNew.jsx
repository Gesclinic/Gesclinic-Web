import React, { useState } from 'react';
import { Trash2, Edit2, Plus, Eye } from 'lucide-react';
import StatusChip from './StatusChip';

/**
 * AgendaGridNew - Grid/tabela com alta densidade visual
 * 
 * Props:
 * - appointments: array de agendamentos
 * - metadata: { professionals, rooms, services, payers }
 * - onSlotClick: (slot) => void
 * - onEdit: (appointment) => void
 * - onCancel: (appointment) => void
 * - onViewDetails: (appointment) => void
 * - viewMode: 'geral' | 'profissional' | 'sala'
 * - date: string (YYYY-MM-DD)
 */
export default function AgendaGridNew({
  appointments = [],
  metadata = {},
  onSlotClick,
  onEdit,
  onCancel,
  onViewDetails,
  viewMode = 'geral',
  date,
}) {
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const professionalMap = React.useMemo(() => {
    const map = {};
    metadata.professionals?.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [metadata.professionals]);

  const roomMap = React.useMemo(() => {
    const map = {};
    metadata.rooms?.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [metadata.rooms]);

  const serviceMap = React.useMemo(() => {
    const map = {};
    metadata.services?.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [metadata.services]);

  const appointmentsByTime = React.useMemo(() => {
    const grouped = {};
    appointments.forEach((apt) => {
      const time = apt.start_time?.substring(0, 5) || '00:00';
      if (!grouped[time]) {
        grouped[time] = [];
      }
      grouped[time].push(apt);
    });
    return grouped;
  }, [appointments]);

  const timeSlots = React.useMemo(() => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(
          `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        );
      }
    }
    return slots;
  }, []);

  const isAppointmentAvailable = (time) => {
    return !appointmentsByTime[time] || appointmentsByTime[time].length === 0;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-20">
                Horário
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Paciente
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Profissional
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Serviço
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24">
                Sala
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24">
                Status
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 w-20">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {timeSlots.map((time, index) => {
              const slots = appointmentsByTime[time] || [];
              const isAvailable = slots.length === 0;

              if (isAvailable) {
                return (
                  <tr
                    key={`available-${time}`}
                    className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                    onMouseEnter={() => setHoveredRowId(`available-${time}`)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {time}
                    </td>
                    <td colSpan="5" className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusChip status="disponivel" size="sm" />
                        <span className="text-xs text-gray-500">Slot livre</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hoveredRowId === `available-${time}` && (
                        <button
                          onClick={() =>
                            onSlotClick?.({
                              time,
                              date,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Agendar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }

              return slots.map((apt, aptIndex) => (
                <tr
                  key={apt.id}
                  className={`border-b border-gray-100 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50`}
                  onMouseEnter={() => setHoveredRowId(apt.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {aptIndex === 0 && time}
                  </td>

                  <td className="px-4 py-3 text-gray-900">
                    <div className="font-medium truncate">
                      {apt.patient_name || apt.patient?.name || 'N/A'}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {apt.professional_name || professionalMap[apt.professional_id]?.name || 'N/A'}
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {apt.service_name || serviceMap[apt.service_id]?.name || 'N/A'}
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {apt.room_name || roomMap[apt.room_id]?.name || 'N/A'}
                  </td>

                  <td className="px-4 py-3">
                    <StatusChip status={apt.status} size="sm" />
                  </td>

                  <td className="px-4 py-3 text-right">
                    {hoveredRowId === apt.id && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewDetails?.(apt)}
                          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit?.(apt)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onCancel?.(apt)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Cancelar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {appointments.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <p className="text-lg font-medium mb-1">Nenhum agendamento</p>
            <p className="text-sm">Clique no botão "+" para criar um novo</p>
          </div>
        </div>
      )}
    </div>
  );
}

