// src/pages/clinica/agenda/components/AgendaHeatmap.jsx
import React, { useMemo, useState } from 'react';

/**
 * AgendaHeatmap - Visualização de ocupação por horário
 * 
 * Props:
 * - timeSlots: Array de horários (ex: ["08:00", "08:30", ...])
 * - appointments: Array de agendamentos filtrados
 * - viewMode: 'geral' | 'profissional' | 'sala'
 * - columnCount: Número de colunas (profissionais ou salas)
 * - onTimeSlotClick: Callback quando clica em um horário
 * - professionals: Array de profissionais (para modo profissional)
 * - rooms: Array de salas (para modo sala)
 */
export default function AgendaHeatmap({
  timeSlots = [],
  appointments = [],
  viewMode = 'geral',
  columnCount = 1,
  onTimeSlotClick = null,
  professionals = [],
  rooms = [],
}) {
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Calcular ocupação por horário
  const heatmapData = useMemo(() => {
    return timeSlots.map((time) => {
      const appointmentsInSlot = appointments.filter(
        apt => apt.start_time?.substring(0, 5) === time
      );

      // Calcular slots totais
      let totalSlots = columnCount; // Default: profissionais ou salas
      if (viewMode === 'geral') {
        totalSlots = 1; // Modo geral: apenas 1 "coluna"
      }

      // Calcular ocupação
      const occupiedSlots = appointmentsInSlot.length;
      const occupationPercent = totalSlots > 0 
        ? Math.round((occupiedSlots / totalSlots) * 100) 
        : 0;
      const availableSlots = totalSlots - occupiedSlots;

      // Agrupar agendamentos por profissional/sala para tooltip
      const groupedByProfessional = {};
      appointmentsInSlot.forEach(apt => {
        if (!groupedByProfessional[apt.professional_id]) {
          groupedByProfessional[apt.professional_id] = [];
        }
        groupedByProfessional[apt.professional_id].push(apt);
      });

      return {
        time,
        occupiedSlots,
        totalSlots,
        availableSlots,
        occupationPercent,
        appointmentsInSlot,
        groupedByProfessional,
      };
    });
  }, [timeSlots, appointments, viewMode, columnCount]);

  // Obter nome do profissional por ID
  const getProfessionalName = (profId) => {
    const prof = professionals.find(p => p.id === profId);
    return prof?.name || 'Desconhecido';
  };

  // Obter nome da sala por ID
  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Desconhecida';
  };

  // Obter cor baseada na ocupação
  const getHeatColor = (percent) => {
    if (percent <= 30) {
      return 'bg-green-400 hover:bg-green-500';
    } else if (percent <= 70) {
      return 'bg-yellow-400 hover:bg-yellow-500';
    } else {
      return 'bg-red-400 hover:bg-red-500';
    }
  };

  // Obter cor de texto para tooltip
  const getHeatTextColor = (percent) => {
    if (percent <= 30) {
      return 'text-green-700';
    } else if (percent <= 70) {
      return 'text-yellow-700';
    } else {
      return 'text-red-700';
    }
  };

  // Handler para clique no horário - filtro automático
  const handleTimeSlotClick = (time) => {
    if (onTimeSlotClick) {
      onTimeSlotClick(time);
    }
  };

  if (!timeSlots || timeSlots.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      {/* Título */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Heatmap de Ocupação</h3>
          <p className="text-xs text-gray-500 mt-1">
            Taxa de ocupação por horário • 
            {viewMode === 'geral' && ' Todos os agendamentos'}
            {viewMode === 'profissional' && ` ${columnCount} profissionais`}
            {viewMode === 'sala' && ` ${columnCount} salas`}
          </p>
        </div>
        
        {/* Legenda de cores */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span className="text-gray-600">&lt; 30%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span className="text-gray-600">30-70%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span className="text-gray-600">&gt; 70%</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1.5 min-w-max">
          {heatmapData.map((slot) => (
            <div
              key={slot.time}
              className="relative"
              onMouseEnter={() => setHoveredSlot(slot.time)}
              onMouseLeave={() => setHoveredSlot(null)}
            >
              {/* Quadrado do heatmap */}
              <button
                onClick={() => handleTimeSlotClick(slot.time)}
                className={`w-10 h-10 rounded-lg cursor-pointer transition-all transform hover:scale-110 shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${getHeatColor(
                  slot.occupationPercent
                )}`}
                title={`${slot.time}: ${slot.occupationPercent}% ocupado • Clique para filtrar`}
              >
                {/* Porcentagem dentro do quadrado */}
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow">
                    {slot.occupationPercent}%
                  </span>
                </div>
              </button>

              {/* Tooltip Rico */}
              {hoveredSlot === slot.time && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none">
                  <div className="bg-gray-900 text-white px-4 py-3 rounded-lg whitespace-nowrap text-xs shadow-lg border border-gray-700">
                    {/* Cabeçalho: Horário */}
                    <div className="font-bold text-sm text-blue-300 mb-2">{slot.time}</div>
                    
                    {/* Ocupação */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Ocupação:</span>
                      <span className={`font-bold ml-2 ${getHeatTextColor(slot.occupationPercent)}`}>
                        {slot.occupationPercent}%
                      </span>
                    </div>

                    {/* Contadores */}
                    <div className="flex items-center justify-between mb-2 text-gray-300">
                      <span>Agendamentos:</span>
                      <span className="font-semibold ml-2">{slot.occupiedSlots} / {slot.totalSlots}</span>
                    </div>

                    {/* Disponíveis */}
                    <div className="flex items-center justify-between mb-3 text-gray-300">
                      <span>Livres:</span>
                      <span className="font-semibold ml-2 text-green-400">{slot.availableSlots}</span>
                    </div>

                    {/* Agendamentos detalhados (se houver) */}
                    {slot.appointmentsInSlot.length > 0 && (
                      <>
                        <div className="border-t border-gray-700 pt-2 mb-2">
                          <div className="text-gray-400 font-semibold text-xs mb-1">Agendamentos:</div>
                          <div className="space-y-1">
                            {viewMode === 'profissional' ? (
                              // Modo profissional: mostrar por profissional
                              Object.entries(slot.groupedByProfessional).map(([profId, apts]) => (
                                <div key={profId} className="text-gray-300 text-xs ml-1">
                                  <span className="text-blue-300">•</span> {getProfessionalName(profId)}: {apts.length}
                                </div>
                              ))
                            ) : viewMode === 'sala' ? (
                              // Modo sala: mostrar por sala
                              slot.appointmentsInSlot.slice(0, 3).map((apt, idx) => (
                                <div key={idx} className="text-gray-300 text-xs ml-1">
                                  <span className="text-blue-300">•</span> {getRoomName(apt.room_id)}: {apt.patient_name}
                                </div>
                              ))
                            ) : (
                              // Modo geral: mostrar resumo
                              <div className="text-gray-300 text-xs ml-1">
                                <span className="text-blue-300">•</span> {slot.appointmentsInSlot.length} agendamento{slot.appointmentsInSlot.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Dica */}
                    <div className="text-gray-500 text-xs italic border-t border-gray-700 pt-2">
                      💡 Clique para filtrar por horário
                    </div>

                    {/* Seta apontando para baixo */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Estatísticas Resumidas */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
        {/* Horário com menor ocupação */}
        <div>
          <div className="text-xs text-gray-600 font-medium mb-1">Melhor Horário</div>
          <div className="text-sm font-bold text-green-600">
            {heatmapData.reduce((min, slot) => 
              slot.occupationPercent < min.occupationPercent ? slot : min
            )?.time || '--'}
          </div>
          <div className="text-xs text-gray-500">
            {Math.min(...heatmapData.map(s => s.occupationPercent))}% ocupado
          </div>
        </div>

        {/* Horário com maior ocupação */}
        <div>
          <div className="text-xs text-gray-600 font-medium mb-1">Pior Horário</div>
          <div className="text-sm font-bold text-red-600">
            {heatmapData.reduce((max, slot) => 
              slot.occupationPercent > max.occupationPercent ? slot : max
            )?.time || '--'}
          </div>
          <div className="text-xs text-gray-500">
            {Math.max(...heatmapData.map(s => s.occupationPercent))}% ocupado
          </div>
        </div>

        {/* Ocupação média */}
        <div>
          <div className="text-xs text-gray-600 font-medium mb-1">Ocupação Média</div>
          <div className="text-sm font-bold text-blue-600">
            {Math.round(
              heatmapData.reduce((sum, slot) => sum + slot.occupationPercent, 0) /
                heatmapData.length
            )}%
          </div>
          <div className="text-xs text-gray-500">de todos horários</div>
        </div>
      </div>
    </div>
  );
}

