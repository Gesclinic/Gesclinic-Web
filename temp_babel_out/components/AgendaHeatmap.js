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
  rooms = []
}) {
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Calcular ocupação por horário
  const heatmapData = useMemo(() => {
    return timeSlots.map(time => {
      const appointmentsInSlot = appointments.filter(apt => apt.start_time?.substring(0, 5) === time);

      // Calcular slots totais
      let totalSlots = columnCount; // Default: profissionais ou salas
      if (viewMode === 'geral') {
        totalSlots = 1; // Modo geral: apenas 1 "coluna"
      }

      // Calcular ocupação
      const occupiedSlots = appointmentsInSlot.length;
      const occupationPercent = totalSlots > 0 ? Math.round(occupiedSlots / totalSlots * 100) : 0;
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
        groupedByProfessional
      };
    });
  }, [timeSlots, appointments, viewMode, columnCount]);

  // Obter nome do profissional por ID
  const getProfessionalName = profId => {
    const prof = professionals.find(p => p.id === profId);
    return prof?.name || 'Desconhecido';
  };

  // Obter nome da sala por ID
  const getRoomName = roomId => {
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Desconhecida';
  };

  // Obter cor baseada na ocupação
  const getHeatColor = percent => {
    if (percent <= 30) {
      return 'bg-green-400 hover:bg-green-500';
    } else if (percent <= 70) {
      return 'bg-yellow-400 hover:bg-yellow-500';
    } else {
      return 'bg-red-400 hover:bg-red-500';
    }
  };

  // Obter cor de texto para tooltip
  const getHeatTextColor = percent => {
    if (percent <= 30) {
      return 'text-green-700';
    } else if (percent <= 70) {
      return 'text-yellow-700';
    } else {
      return 'text-red-700';
    }
  };

  // Handler para clique no horário - filtro automático
  const handleTimeSlotClick = time => {
    if (onTimeSlotClick) {
      onTimeSlotClick(time);
    }
  };
  if (!timeSlots || timeSlots.length === 0) {
    return null;
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-semibold text-gray-900"
  }, "Heatmap de Ocupa\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "Taxa de ocupa\xE7\xE3o por hor\xE1rio \u2022", viewMode === 'geral' && ' Todos os agendamentos', viewMode === 'profissional' && ` ${columnCount} profissionais`, viewMode === 'sala' && ` ${columnCount} salas`)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-4 h-4 bg-green-400 rounded"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "< 30%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-4 h-4 bg-yellow-400 rounded"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "30-70%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-4 h-4 bg-red-400 rounded"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "> 70%")))), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto pb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 min-w-max"
  }, heatmapData.map(slot => /*#__PURE__*/React.createElement("div", {
    key: slot.time,
    className: "relative",
    onMouseEnter: () => setHoveredSlot(slot.time),
    onMouseLeave: () => setHoveredSlot(null)
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleTimeSlotClick(slot.time),
    className: `w-10 h-10 rounded-lg cursor-pointer transition-all transform hover:scale-110 shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${getHeatColor(slot.occupationPercent)}`,
    title: `${slot.time}: ${slot.occupationPercent}% ocupado • Clique para filtrar`
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-white drop-shadow"
  }, slot.occupationPercent, "%"))), hoveredSlot === slot.time && /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-900 text-white px-4 py-3 rounded-lg whitespace-nowrap text-xs shadow-lg border border-gray-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-sm text-blue-300 mb-2"
  }, slot.time), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-300"
  }, "Ocupa\xE7\xE3o:"), /*#__PURE__*/React.createElement("span", {
    className: `font-bold ml-2 ${getHeatTextColor(slot.occupationPercent)}`
  }, slot.occupationPercent, "%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2 text-gray-300"
  }, /*#__PURE__*/React.createElement("span", null, "Agendamentos:"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold ml-2"
  }, slot.occupiedSlots, " / ", slot.totalSlots)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 text-gray-300"
  }, /*#__PURE__*/React.createElement("span", null, "Livres:"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold ml-2 text-green-400"
  }, slot.availableSlots)), slot.appointmentsInSlot.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "border-t border-gray-700 pt-2 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-gray-400 font-semibold text-xs mb-1"
  }, "Agendamentos:"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, viewMode === 'profissional' ?
  // Modo profissional: mostrar por profissional
  Object.entries(slot.groupedByProfessional).map(([profId, apts]) => /*#__PURE__*/React.createElement("div", {
    key: profId,
    className: "text-gray-300 text-xs ml-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-300"
  }, "\u2022"), " ", getProfessionalName(profId), ": ", apts.length)) : viewMode === 'sala' ?
  // Modo sala: mostrar por sala
  slot.appointmentsInSlot.slice(0, 3).map((apt, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "text-gray-300 text-xs ml-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-300"
  }, "\u2022"), " ", getRoomName(apt.room_id), ": ", apt.patient_name)) :
  /*#__PURE__*/
  // Modo geral: mostrar resumo
  React.createElement("div", {
    className: "text-gray-300 text-xs ml-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-300"
  }, "\u2022"), " ", slot.appointmentsInSlot.length, " agendamento", slot.appointmentsInSlot.length !== 1 ? 's' : '')))), /*#__PURE__*/React.createElement("div", {
    className: "text-gray-500 text-xs italic border-t border-gray-700 pt-2"
  }, "\uD83D\uDCA1 Clique para filtrar por hor\xE1rio"), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-600 font-medium mb-1"
  }, "Melhor Hor\xE1rio"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold text-green-600"
  }, heatmapData.reduce((min, slot) => slot.occupationPercent < min.occupationPercent ? slot : min)?.time || '--'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500"
  }, Math.min(...heatmapData.map(s => s.occupationPercent)), "% ocupado")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-600 font-medium mb-1"
  }, "Pior Hor\xE1rio"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold text-red-600"
  }, heatmapData.reduce((max, slot) => slot.occupationPercent > max.occupationPercent ? slot : max)?.time || '--'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500"
  }, Math.max(...heatmapData.map(s => s.occupationPercent)), "% ocupado")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-600 font-medium mb-1"
  }, "Ocupa\xE7\xE3o M\xE9dia"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold text-blue-600"
  }, Math.round(heatmapData.reduce((sum, slot) => sum + slot.occupationPercent, 0) / heatmapData.length), "%"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500"
  }, "de todos hor\xE1rios"))));
}