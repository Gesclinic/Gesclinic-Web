import { useMemo } from 'react';

/**
 * AgendaStats - KPIs do dia
 *
 * Exibe:
 * - Total de atendimentos
 * - Horários livres
 * - Percentual de ocupação
 * - Atrasos
 */
export default function AgendaStats({ appointments = [], allSlots = [] }) {
  const stats = useMemo(() => {
    const totalSlots = allSlots.length;
    const occupiedSlots = appointments.filter((a) => a.paciente || a.patient_name).length;
    const freeSlots = totalSlots - occupiedSlots;
    const occupancyPercent = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

    const delays = appointments.filter((a) => {
      const status = a.status?.toLowerCase();
      return status === 'falta' || (status === 'confirmado' && a.horário);
    }).length;

    return {
      total: occupiedSlots,
      free: freeSlots,
      occupancy: occupancyPercent,
      delays,
    };
  }, [appointments, allSlots]);

  return (
    <div className="flex gap-4 items-center bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
      {/* Total de Atendimentos */}
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-blue-600">{stats.total}</span>
        <span className="text-xs text-gray-600">Atendimentos</span>
      </div>

      {/* Separador */}
      <div className="w-px h-10 bg-gray-300" />

      {/* Horários Livres */}
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-green-600">{stats.free}</span>
        <span className="text-xs text-gray-600">Livres</span>
      </div>

      {/* Separador */}
      <div className="w-px h-10 bg-gray-300" />

      {/* Ocupação */}
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-purple-600">{stats.occupancy}%</span>
        <span className="text-xs text-gray-600">Ocupação</span>
      </div>

      {/* Separador */}
      <div className="w-px h-10 bg-gray-300" />

      {/* Atrasos */}
      {stats.delays > 0 && (
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-red-600">{stats.delays}</span>
          <span className="text-xs text-gray-600">Atrasos</span>
        </div>
      )}
    </div>
  );
}
