// src/pages/clinica/agenda/components/AgendaTimeline.jsx
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AgendaSlot from './AgendaSlot';
import ProfessionalColumnHeader from './ProfessionalColumnHeader';
import { migrateStatus, SERVICE_STATUSES } from '@/lib/appointmentStatusConstants';

/**
 * TimelineColumnas - Visualização em colunas (por profissional ou sala)
 */
function TimelineColumnas({
  timeSlots,
  groups,
  onSlotClick,
  onCheckin,
  date,
  columnType = 'professional',
  metadata = {},
  userRole
}) {
  // Fallback se não houver grupos
  if (!groups || Object.keys(groups).length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg border border-gray-200 overflow-hidden p-8 text-center"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 text-lg font-medium"
    }, columnType === 'professional' ? '👤 Nenhum profissional com agendamentos para esta data.' : columnType === 'room' ? '🏢 Nenhuma sala com agendamentos para esta data.' : '📋 Nenhum agendamento para esta data.'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-400 text-sm mt-2"
    }, "Selecione um hor\xE1rio acima para criar um novo agendamento."));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-gray-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b-2 border-gray-300 bg-gradient-to-b from-gray-50 to-white sticky top-0 z-10"
  }, /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-700 w-20 sticky left-0 bg-gray-50 z-20"
  }, "Hor\xE1rio"), Object.entries(groups).map(([key, group]) => /*#__PURE__*/React.createElement("th", {
    key: key,
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-64 border-l border-gray-200"
  }, /*#__PURE__*/React.createElement(ProfessionalColumnHeader, {
    name: group.name,
    type: columnType,
    appointmentCount: group.appointments.length
  }))))), /*#__PURE__*/React.createElement("tbody", null, timeSlots.map(time => /*#__PURE__*/React.createElement("tr", {
    key: `row-${time}`,
    className: "border-b border-gray-100 hover:bg-gray-50 transition"
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white z-10"
  }, time), Object.entries(groups).map(([key, group]) => {
    const slotAppointments = group.appointments.filter(apt => (apt.scheduled_time?.substring(0, 5) || apt.start_time?.substring(0, 5)) === time);
    return /*#__PURE__*/React.createElement("td", {
      key: `cell-${key}-${time}`,
      className: "px-4 py-2 min-w-64 border-l border-gray-200 align-top"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2"
    }, slotAppointments.length > 0 ? slotAppointments.map(apt => /*#__PURE__*/React.createElement(AgendaSlot, {
      key: apt.id,
      appointment: apt,
      onSlotClick: () => onSlotClick({
        ...apt,
        type: 'view'
      }),
      onCheckin: () => onCheckin(apt),
      compact: true
    })) : /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const slotData = {
          date,
          time,
          type: 'new'
        };
        if (columnType === 'professional') {
          slotData.professional_id = key;
          console.log('✅ [AgendaTimeline] Novo clique em slot profissional:', {
            date,
            time,
            professional_id: key
          });
        } else if (columnType === 'room') {
          slotData.room_id = key;
          console.log('✅ [AgendaTimeline] Novo clique em slot sala:', {
            date,
            time,
            room_id: key
          });
        }
        onSlotClick(slotData);
      },
      className: "px-3 py-2 text-xs font-medium text-green-600 border border-green-300 rounded hover:bg-green-50 transition",
      title: "Agendar neste hor\xE1rio"
    }, "+ Agendar")));
  })))))));
}

/**
 * AgendaTimeline - Grade de horários com diferentes modos de renderização
 * 
 * Props:
 * - viewMode: 'geral' | 'profissional' | 'sala'
 * - date: string (ISO date)
 * - appointments: Array de agendamentos filtrados
 * - onSlotClick: (slot) => void - Quando clica em um slot
 * - onCheckin: (appointment) => void - Quando clica em Check-in
 * - userRole: string - Role do usuário logado
 * - metadata: { professionals, rooms }
 * - slotDuration: 30 (minutos)
 */
export default function AgendaTimeline({
  viewMode = 'geral',
  date,
  appointments = [],
  onSlotClick = () => {},
  onCheckin = () => {},
  userRole,
  metadata = {
    professionals: [],
    rooms: []
  },
  slotDuration = 30,
  filteredProfessionalId = null
}) {
  // Gerar slots de horários (ex: 08:00, 08:30, 09:00, etc.)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  }, [slotDuration]);

  // Agrupar agendamentos por profissional ou sala
  const groupedAppointments = useMemo(() => {
    const groups = {};
    if (viewMode === 'profissional') {
      // Agrupar por profissional
      if (metadata.professionals && metadata.professionals.length > 0) {
        metadata.professionals.forEach(prof => {
          groups[prof.id] = {
            name: prof.name,
            appointments: appointments.filter(apt => apt.professional_id === prof.id)
          };
        });
      } else {
        // Fallback: se não houver profissionais, extrair dos agendamentos
        const uniqueProfessionals = {};
        appointments.forEach(apt => {
          if (apt.professional_id && !uniqueProfessionals[apt.professional_id]) {
            uniqueProfessionals[apt.professional_id] = {
              id: apt.professional_id,
              name: apt.professional_name || `Profissional ${apt.professional_id.substring(0, 8)}`
            };
          }
        });
        Object.values(uniqueProfessionals).forEach(prof => {
          groups[prof.id] = {
            name: prof.name,
            appointments: appointments.filter(apt => apt.professional_id === prof.id)
          };
        });
      }
    } else if (viewMode === 'sala') {
      // Agrupar por sala
      if (metadata.rooms && metadata.rooms.length > 0) {
        metadata.rooms.forEach(room => {
          groups[room.id] = {
            name: room.name,
            appointments: appointments.filter(apt => apt.room_id === room.id)
          };
        });
      } else {
        // Fallback: se não houver salas, extrair dos agendamentos
        const uniqueRooms = {};
        appointments.forEach(apt => {
          if (apt.room_id && !uniqueRooms[apt.room_id]) {
            uniqueRooms[apt.room_id] = {
              id: apt.room_id,
              name: apt.room_name || `Sala ${apt.room_id.substring(0, 8)}`
            };
          }
        });
        Object.values(uniqueRooms).forEach(room => {
          groups[room.id] = {
            name: room.name,
            appointments: appointments.filter(apt => apt.room_id === room.id)
          };
        });
      }
    } else {
      // Modo geral: todos os agendamentos
      groups['geral'] = {
        name: 'Todos',
        appointments: appointments
      };
    }

    // Se ainda não houver grupos, retornar estrutura vazia com mensagem
    if (Object.keys(groups).length === 0 && viewMode !== 'geral') {
      groups['empty'] = {
        name: `Nenhum${viewMode === 'profissional' ? ' profissional' : 'a sala'} disponível`,
        appointments: []
      };
    }
    return groups;
  }, [viewMode, appointments, metadata]);

  // Renderizar de acordo com o modo
  if (viewMode === 'geral') {
    return /*#__PURE__*/React.createElement(TimelineGeral, {
      timeSlots: timeSlots,
      appointments: appointments,
      onSlotClick: onSlotClick,
      onCheckin: onCheckin,
      date: date,
      filteredProfessionalId: filteredProfessionalId
    });
  } else if (viewMode === 'profissional') {
    return /*#__PURE__*/React.createElement(TimelineColumnas, {
      timeSlots: timeSlots,
      groups: groupedAppointments,
      onSlotClick: onSlotClick,
      onCheckin: onCheckin,
      date: date,
      columnType: "professional",
      metadata: metadata,
      userRole: userRole
    });
  } else if (viewMode === 'sala') {
    return /*#__PURE__*/React.createElement(TimelineColumnas, {
      timeSlots: timeSlots,
      groups: groupedAppointments,
      onSlotClick: onSlotClick,
      onCheckin: onCheckin,
      date: date,
      columnType: "room",
      metadata: metadata,
      userRole: userRole
    });
  }
  return null;
}

/**
 * TimelineGeral - Visualização em lista única de todos os agendamentos
 */
function TimelineGeral({
  timeSlots,
  appointments,
  onSlotClick,
  onCheckin,
  date,
  filteredProfessionalId
}) {
  const [professionalSchedules, setProfessionalSchedules] = React.useState([]);
  // Recebe o profissional filtrado via appointments (todos do mesmo prof) ou metadata
  // Usa o filtro explicitamente passado
  const selectedProfessionalId = filteredProfessionalId;
  React.useEffect(() => {
    async function fetchSchedules() {
      if (!appointments || appointments.length === 0) return;
      const clinicId = appointments[0]?.clinic_id;
      if (!clinicId) return;
      try {
        const res = await import('@/lib/professionalScheduleApi');
        const schedules = await res.getProfessionalSchedules(clinicId);
        setProfessionalSchedules(schedules);
      } catch (err) {
        setProfessionalSchedules([]);
      }
    }
    fetchSchedules();
  }, [appointments]);
  const appointmentsByTime = React.useMemo(() => {
    const map = {};
    appointments.forEach(apt => {
      const time = apt.scheduled_time?.substring(0, 5) || apt.start_time?.substring(0, 5);
      if (!time) {
        console.warn('⚠️ Agendamento sem horário:', apt.id, apt);
        return;
      }
      if (!map[time]) map[time] = [];
      map[time].push(apt);
    });
    return map;
  }, [appointments]);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-gray-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b-2 border-gray-300 bg-gradient-to-b from-gray-50 to-white"
  }, /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-700 w-20"
  }, "Hor\xE1rio"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-700"
  }, "Paciente"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-700"
  }, "Profissional"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-700"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-700"
  }, "Sala"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-700"
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-700 w-80"
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", null, timeSlots.flatMap(time => {
    const slotAppointments = appointmentsByTime[time] || [];
    if (slotAppointments.length === 0) {
      const [year, month, day] = date.split('-').map(Number);
      const slotDate = new Date(year, month - 1, day);
      const dayOfWeek = slotDate.getDay();
      let isAvailable = true;
      // Se houver filtro de profissional, só mostrar disponível se o profissional tem disponibilidade
      if (filteredProfessionalId) {
        isAvailable = professionalSchedules.some(sch => {
          if (!sch.active) return false;
          if (sch.professional_id !== filteredProfessionalId) return false;
          if (sch.day_of_week !== dayOfWeek) return false;
          const [slotHour, slotMinute] = time.split(":").map(Number);
          const [startHour, startMinute] = sch.start_time.split(":").map(Number);
          const [endHour, endMinute] = sch.end_time.split(":").map(Number);
          const slotMinutes = slotHour * 60 + slotMinute;
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;
          return slotMinutes >= startMinutes && slotMinutes < endMinutes;
        });
      }
      if (!isAvailable) {
        return [/*#__PURE__*/React.createElement("tr", {
          key: `unavailable-${time}`,
          className: "border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition"
        }, /*#__PURE__*/React.createElement("td", {
          className: "px-4 py-3 text-sm font-medium text-gray-600"
        }, time), /*#__PURE__*/React.createElement("td", {
          colSpan: "5",
          className: "px-4 py-3"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-sm font-black text-gray-600"
        }, "\uD83D\uDD12 Indispon\xEDvel")), /*#__PURE__*/React.createElement("td", {
          className: "px-4 py-3"
        }))];
      }
      return [/*#__PURE__*/React.createElement("tr", {
        key: `empty-${time}`,
        className: "border-b border-gray-100 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 cursor-pointer transition group"
      }, /*#__PURE__*/React.createElement("td", {
        className: "px-4 py-3 text-sm font-medium text-gray-700"
      }, time), /*#__PURE__*/React.createElement("td", {
        colSpan: "5",
        className: "px-4 py-3"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-sm font-semibold text-green-700"
      }, "\u2713 Dispon\xEDvel")), /*#__PURE__*/React.createElement("td", {
        className: "px-4 py-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          const slotData = {
            date,
            time,
            type: 'new'
          };
          if (filteredProfessionalId) {
            slotData.professional_id = filteredProfessionalId;
            console.log('✅ [TimelineGeral] Click com professional_id:', filteredProfessionalId);
          }
          onSlotClick(slotData);
        },
        className: "px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition font-medium shadow-md",
        title: "Agendar novo paciente"
      }, "\u2795 Agendar"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          const slotData = {
            date,
            time,
            type: 'encaixe'
          };
          if (filteredProfessionalId) {
            slotData.professional_id = filteredProfessionalId;
          }
          onSlotClick(slotData);
        },
        className: "px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition font-medium shadow-md",
        title: "Encaixar paciente"
      }, "\u23F1\uFE0F Encaixar"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          const slotData = {
            date,
            time,
            type: 'bloquear'
          };
          if (filteredProfessionalId) {
            slotData.professional_id = filteredProfessionalId;
          }
          onSlotClick(slotData);
        },
        className: "px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition font-medium shadow-md",
        title: "Bloquear hor\xE1rio"
      }, "\uD83D\uDD12 Bloquear"))))];
    }
    return slotAppointments.map((apt, idx) => /*#__PURE__*/React.createElement("tr", {
      key: apt.id,
      className: `border-b border-gray-100 cursor-pointer transition group hover:shadow-md ${getStatusBgColor(apt.status)}`
    }, idx === 0 ? /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm font-bold text-gray-700"
    }, time) : /*#__PURE__*/React.createElement("td", null), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm font-bold text-gray-900"
    }, apt.patient_name), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm text-gray-700"
    }, apt.professional_name), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm text-gray-700"
    }, apt.service_name), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm text-gray-700"
    }, apt.room_name), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-block px-2 py-1 text-xs font-bold rounded ${getStatusBadgeColor(apt.status)}`
    }, getStatusLabel(apt.status))), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap"
    }, (apt.status === 'confirmado' || apt.status === 'a_confirmar' || apt.status === 'presente' || [SERVICE_STATUSES.AWAITING_PROFESSIONAL, SERVICE_STATUSES.IN_SERVICE, SERVICE_STATUSES.ATTENDED].includes(migrateStatus(apt.status))) && /*#__PURE__*/React.createElement("button", {
      onClick: () => onCheckin(apt),
      className: "px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition font-medium shadow-md whitespace-nowrap",
      title: [SERVICE_STATUSES.AWAITING_PROFESSIONAL, SERVICE_STATUSES.IN_SERVICE, SERVICE_STATUSES.ATTENDED].includes(migrateStatus(apt.status)) ? 'Abrir prontuário ou atendimento' : 'Check-in do paciente'
    }, [SERVICE_STATUSES.AWAITING_PROFESSIONAL, SERVICE_STATUSES.IN_SERVICE, SERVICE_STATUSES.ATTENDED].includes(migrateStatus(apt.status)) ? migrateStatus(apt.status) === SERVICE_STATUSES.AWAITING_PROFESSIONAL ? '📝 Prontuário' : '👨‍⚕️ Atendimento' : '📋 Check-in'), apt.status === 'pronto_atendimento' && /*#__PURE__*/React.createElement("button", {
      onClick: () => onSlotClick({
        ...apt,
        type: 'start-attendance'
      }),
      className: "px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition font-medium shadow-md whitespace-nowrap",
      title: "Iniciar atendimento"
    }, "\uD83D\uDC68\u200D\u2695\uFE0F Atender"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        console.log('🖱️ [AgendaTimeline] Clicou em EDITAR. apt completo:', apt);
        console.log('   apt.id:', apt?.id);
        console.log('   apt.appointment_id:', apt?.appointment_id);
        console.log('   apt keys:', Object.keys(apt || {}));
        onSlotClick({
          ...apt,
          type: 'edit'
        });
      },
      className: "px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition font-medium shadow-md whitespace-nowrap",
      title: "Editar agendamento"
    }, "\u270E Editar"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (window.confirm('Tem certeza que deseja deletar este agendamento?')) {
          onSlotClick({
            ...apt,
            type: 'delete'
          });
        }
      },
      className: "px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition font-medium shadow-md whitespace-nowrap",
      title: "Deletar agendamento"
    }, "\uD83D\uDDD1\uFE0F Deletar")))));
  })))));
}

/**
 * Funções auxiliares para cores de status
 */
function getStatusBgColor(status) {
  switch (status) {
    case 'confirmado':
      return 'bg-green-50';
    case 'a_confirmar':
      return 'bg-yellow-50';
    case 'presente':
      return 'bg-blue-50';
    case 'pronto_atendimento':
      return 'bg-lime-50';
    case 'em_atendimento':
      return 'bg-indigo-50';
    case 'finalizado':
      return 'bg-emerald-50';
    case 'faltou':
      return 'bg-red-50';
    case 'cancelado':
      return 'bg-orange-50';
    case 'encaixe':
      return 'bg-cyan-50';
    case 'bloqueado':
      return 'bg-slate-50';
    default:
      return 'bg-gray-50';
  }
}
function getStatusBadgeColor(status) {
  switch (status) {
    case 'confirmado':
      return 'bg-green-100 text-green-800';
    case 'a_confirmar':
      return 'bg-yellow-100 text-yellow-800';
    case 'presente':
      return 'bg-blue-100 text-blue-800';
    case 'pronto_atendimento':
      return 'bg-lime-100 text-lime-800';
    case 'em_atendimento':
      return 'bg-indigo-100 text-indigo-800';
    case 'finalizado':
      return 'bg-emerald-100 text-emerald-800';
    case 'faltou':
      return 'bg-red-100 text-red-800';
    case 'cancelado':
      return 'bg-orange-100 text-orange-800';
    case 'encaixe':
      return 'bg-cyan-100 text-cyan-800';
    case 'bloqueado':
      return 'bg-slate-100 text-slate-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
function getStatusLabel(status) {
  switch (status) {
    case 'confirmado':
      return '✓ Confirmado';
    case 'a_confirmar':
      return '⚠ A Confirmar';
    case 'presente':
      return '📍 Presente';
    case 'pronto_atendimento':
      return '🟢 Pronto para Atendimento';
    case 'em_atendimento':
      return '👨‍⚕️ Em Atendimento';
    case 'finalizado':
      return '✓ Finalizado';
    case 'faltou':
      return '✕ Faltou';
    case 'cancelado':
      return '✕ Cancelado';
    case 'encaixe':
      return '⚡ Encaixe';
    case 'bloqueado':
      return '🔒 Bloqueado';
    default:
      return status;
  }
}