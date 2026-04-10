// src/pages/clinica/agenda/components/ProfessionalColumnHeader.jsx
import React, { useMemo } from 'react';

/**
 * ProfessionalColumnHeader - Header de coluna para profissional/sala na visualização em grid
 * 
 * Exibe:
 * - Nome e ícone
 * - Especialidade (opcional)
 * - Taxa de ocupação com barra visual
 * - Total de agendamentos
 * - Badge de disponibilidade
 * 
 * Props:
 * - groupId: string
 * - group: { name, specialty?, appointments[] }
 * - columnType: 'professional' | 'room'
 * - totalSlots: number (total de horários do dia)
 */
export default function ProfessionalColumnHeader({
  groupId,
  group,
  columnType,
  totalSlots,
}) {
  // Calcular métricas
  const metrics = useMemo(() => {
    const totalAppointments = group.appointments?.length || 0;
    const occupationRate = totalSlots > 0 ? ((totalAppointments / totalSlots) * 100).toFixed(0) : 0;
    const availableSlots = totalSlots - totalAppointments;
    
    return {
      totalAppointments,
      occupationRate: parseInt(occupationRate),
      availableSlots
    };
  }, [group.appointments, totalSlots]);

  // Determinar status de ocupação
  const isHighOccupancy = metrics.occupationRate >= 75;
  const isMediumOccupancy = metrics.occupationRate >= 50;
  const isLowOccupancy = metrics.occupationRate < 50;

  // Cores para taxa de ocupação
  const occupancyColor = isHighOccupancy
    ? 'bg-red-500'
    : isMediumOccupancy
    ? 'bg-yellow-500'
    : 'bg-green-500';

  const occupancyTextColor = isHighOccupancy
    ? 'text-red-600'
    : isMediumOccupancy
    ? 'text-yellow-600'
    : 'text-green-600';

  // Cores para badge de disponibilidade
  const availabilityColor = metrics.availableSlots > 5
    ? 'bg-green-100 text-green-800'
    : metrics.availableSlots > 0
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800';

  return (
    <div className="flex flex-col h-full">
      {/* Nome e ícone */}
      <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-gray-200">
        <span className="text-2xl flex-shrink-0">
          {columnType === 'professional' ? '👨‍⚕️' : '🏥'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">
            {group.name}
          </div>
          {group.specialty && (
            <div className="text-xs text-gray-500 truncate">
              {group.specialty}
            </div>
          )}
        </div>
      </div>

      {/* Métricas em grid 2x2 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Taxa de ocupação */}
        <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs text-gray-600 font-semibold mb-1.5">Ocupação</div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${occupancyColor}`}
                style={{ width: `${Math.min(metrics.occupationRate, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-bold whitespace-nowrap ${occupancyTextColor}`}>
              {metrics.occupationRate}%
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {metrics.totalAppointments} de {totalSlots}
          </div>
        </div>

        {/* Total de agendamentos */}
        <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs text-gray-600 font-semibold mb-1.5">Agendamentos</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-blue-600">
              {metrics.totalAppointments}
            </span>
            <span className="text-xs text-gray-500">agendado{metrics.totalAppointments !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Badge de disponibilidade */}
      <div className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold text-center w-full border-2 ${
        metrics.availableSlots > 5
          ? 'bg-green-50 text-green-800 border-green-200'
          : metrics.availableSlots > 0
          ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
          : 'bg-red-50 text-red-800 border-red-200'
      }`}>
        {metrics.availableSlots > 0
          ? `${metrics.availableSlots} vaga${metrics.availableSlots !== 1 ? 's' : ''} livres`
          : '🔴 Dia completo'
        }
      </div>

      {/* Indicador de status */}
      {isHighOccupancy && (
        <div className="mt-2 px-2 py-1 bg-red-50 rounded text-xs text-red-700 text-center border border-red-200 font-semibold">
          ⚠️ Agenda lotada
        </div>
      )}
    </div>
  );
}

