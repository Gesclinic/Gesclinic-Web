import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, MoreVertical } from 'lucide-react';
import StatusChip from './StatusChip';

/**
 * AgendaGridOptimized - Tabela ultra-premium com densidade máxima
 * 
 * ✨ Otimizações de UX Premium:
 * 1. Slots livres: Apenas horário + bolinha verde + botão (invisível)
 * 2. Ações flutuantes: Aparecem só no hover, não ocupam coluna
 * 3. Status com tooltip: Compacto, acessível, profissional
 * 4. Hierarquia de dados: Paciente principal, Prof/Serviço/Sala secundários
 * 5. Densidade aumentada: Menos espaço vertical, mais horários visíveis
 * 6. Hover claro: Background + cursor pointer + ações visíveis
 * 
 * 🔥 Melhorias de Ouro:
 * 1. Clique direto no slot livre → abre modal
 * 2. Duplo clique no atendimento → editar
 * 3. Botão direito → menu rápido
 * 4. Indicador de atraso (borda vermelha)
 * 5. Destaque do "horário atual" (linha azul suave)
 * 
 * Props:
 * - appointments: array de agendamentos
 * - onBookSlot: (slot) => void
 * - onEditAppointment: (id) => void
 * - onViewDetails: (id) => void
 * - isLoading: boolean
 */
export default function AgendaGridOptimized({
  appointments = [],
  onBookSlot = () => {},
  onEditAppointment = () => {},
  onViewDetails = () => {},
  isLoading = false
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Atualizar horário atual a cada minuto
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fechar menu de contexto ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Agrupar por horário para melhor visualização
  const groupedByTime = appointments.reduce((acc, appt) => {
    const time = appt.horário || appt.time || '00:00';
    if (!acc[time]) {
      acc[time] = [];
    }
    acc[time].push(appt);
    return acc;
  }, {});
  const sortedTimes = Object.keys(groupedByTime).sort();

  // Obter horário atual no formato HH:MM
  const currentTimeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

  // Verificar se é atraso (status = falta ou confirmado mas passou da hora)
  const isLate = appt => {
    return appt.status === 'falta' || appt.status === 'confirmado' && appt.horário < currentTimeStr && appt.paciente;
  };

  // Handler para clique direito
  const handleContextMenu = (e, appt) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      appointment: appt
    });
  };
  if (isLoading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center h-40 text-gray-500"
    }, /*#__PURE__*/React.createElement("span", null, "Carregando agenda..."));
  }
  if (appointments.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center h-40 text-gray-500"
    }, /*#__PURE__*/React.createElement("span", null, "Nenhum hor\xE1rio dispon\xEDvel"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "h-full w-full flex flex-col relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
  }, sortedTimes.map(time => groupedByTime[time].map((appt, idx) => {
    const isOccupied = appt.paciente || appt.patient;
    const status = appt.status || 'disponivel';
    const statusLabel = appt.status || 'confirmado';
    const isCurrentTime = time === currentTimeStr;
    const late = isLate(appt);
    const statusMap = {
      confirmado: 'bg-blue-500',
      aguardando: 'bg-yellow-400',
      falta: 'bg-red-500',
      disponivel: 'bg-green-500'
    };
    const statusColor = statusMap[statusLabel] || 'bg-green-500';
    const statusLabels = {
      confirmado: 'Confirmado',
      aguardando: 'Aguardando',
      falta: 'Falta',
      disponivel: 'Disponível'
    };
    // Estilos para atraso
    const delayBorderClass = late ? 'border-l-4 border-l-red-500' : '';
    const delayBgClass = late ? 'bg-red-50/30' : '';
    if (!isOccupied) {
      // SLOT LIVRE
      return /*#__PURE__*/React.createElement("div", {
        key: appt.id || idx,
        className: `group border-b border-gray-100 hover:bg-green-50/80 hover:shadow-md transition-all cursor-pointer ${delayBorderClass} ${isCurrentTime ? 'bg-blue-100/50' : 'bg-white'} ${delayBgClass}`,
        onClick: () => onBookSlot(appt),
        onContextMenu: e => handleContextMenu(e, appt)
      }, /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-12 gap-0 h-11 items-center px-0.5"
      }, /*#__PURE__*/React.createElement("div", {
        className: `col-span-1 px-2 text-sm font-semibold ${isCurrentTime ? 'text-blue-600 font-bold' : 'text-gray-800'}`
      }, time, isCurrentTime && /*#__PURE__*/React.createElement("span", {
        className: "ml-1 inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse"
      })), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2 px-2 flex items-center justify-between pr-3"
      }, /*#__PURE__*/React.createElement("span", {
        className: "h-2.5 w-2.5 rounded-full bg-green-500"
      }), /*#__PURE__*/React.createElement("button", {
        onClick: e => {
          e.stopPropagation();
          onBookSlot(appt);
        },
        className: "opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700",
        title: "Novo agendamento"
      }, "\u2795")), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2"
      }), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2"
      }), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2"
      }), /*#__PURE__*/React.createElement("div", {
        className: "col-span-1"
      }), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2"
      })));
    }

    // SLOT OCUPADO
    return /*#__PURE__*/React.createElement("div", {
      key: appt.id || idx,
      className: `group border-b border-gray-100 hover:bg-blue-50/80 hover:shadow-md transition-all cursor-pointer ${delayBorderClass} ${isCurrentTime ? 'bg-blue-100/50' : 'bg-white'} ${delayBgClass}`,
      onDoubleClick: () => onEditAppointment(appt.id),
      onContextMenu: e => handleContextMenu(e, appt)
    }, /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-12 gap-0 h-11 items-center px-0.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: `col-span-1 px-2 text-sm font-bold ${isCurrentTime ? 'text-blue-600' : 'text-gray-700'}`
    }, time, isCurrentTime && /*#__PURE__*/React.createElement("span", {
      className: "ml-1 inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse"
    })), /*#__PURE__*/React.createElement("div", {
      className: "col-span-2 px-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate"
    }, appt.paciente || appt.patient || '—')), /*#__PURE__*/React.createElement("div", {
      className: "col-span-2 px-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-gray-600 group-hover:text-gray-700 transition-colors truncate"
    }, appt.serviço || appt.service || '—')), /*#__PURE__*/React.createElement("div", {
      className: "col-span-2 px-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-gray-600 group-hover:text-gray-700 transition-colors truncate"
    }, appt.profissional || appt.professional || '—')), /*#__PURE__*/React.createElement("div", {
      className: "col-span-2 px-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-gray-600 group-hover:text-gray-700 transition-colors truncate"
    }, appt.sala || appt.room || '—')), /*#__PURE__*/React.createElement("div", {
      className: "col-span-1 px-2 flex justify-center"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-block h-3 w-3 rounded-full shadow-sm ${statusColor}`,
      title: statusLabels[statusLabel] || 'Status'
    })), /*#__PURE__*/React.createElement("div", {
      className: "col-span-2 px-2 flex justify-end gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onEditAppointment(appt.id),
      title: "Editar (ou duplo clique)",
      className: "opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:scale-110"
    }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onViewDetails(appt.id),
      title: "Detalhes",
      className: "opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-800 hover:scale-110"
    }, "\uD83D\uDC41"))));
  }))), contextMenu && /*#__PURE__*/React.createElement("div", {
    className: "fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-max",
    style: {
      left: `${contextMenu.x}px`,
      top: `${contextMenu.y}px`
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onEditAppointment(contextMenu.appointment.id);
      setContextMenu(null);
    },
    className: "block w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 border-b border-gray-100"
  }, "\u270F\uFE0F Editar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onViewDetails(contextMenu.appointment.id);
      setContextMenu(null);
    },
    className: "block w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 border-b border-gray-100"
  }, "\uD83D\uDC41\uFE0F Ver Detalhes"), contextMenu.appointment.status === 'confirmado' && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      console.log('Marcar como falta:', contextMenu.appointment.id);
      setContextMenu(null);
    },
    className: "block w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600"
  }, "\u2716\uFE0F Marcar Falta")));
}