// src/pages/clinica/agenda/components/AgendaProfessionalView.jsx
import React, { useState, useMemo } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AgendaTimeline from './AgendaTimeline';

/**
 * AgendaProfessionalView
 * 
 * Visualização simplificada focada no profissional
 * - Timeline visual com slots de horários
 * - Lista vertical dos atendimentos como fallback
 * - Próximo atendimento destacado
 * - Apenas botões clínicos (confirmar, marcar como faltou, etc)
 * - Sem financeiro, sem heatmap, sem gestão
 */
export default function AgendaProfessionalView({
  appointments = [],
  metadata = {},
  onConfirmAppointment = () => {},
  onCancelAppointment = () => {},
  onSlotClick = () => {},
  date = new Date().toISOString().split('T')[0],
  loading = false,
  userRole = 'professional'
}) {
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
    }));
  }

  // Separar próximo atendimento (hoje) dos demais
  const todayAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    return appointments.filter(a => {
      const apptDate = parseISO(`${a.scheduled_date}T${a.scheduled_time}`);
      return isToday(apptDate);
    }).sort((a, b) => {
      const timeA = new Date(`2000-01-01T${a.scheduled_time}`);
      const timeB = new Date(`2000-01-01T${b.scheduled_time}`);
      return timeA - timeB;
    });
  }, [appointments]);
  const futureAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    return appointments.filter(a => {
      const apptDate = parseISO(`${a.scheduled_date}T${a.scheduled_time}`);
      return !isToday(apptDate);
    }).sort((a, b) => {
      const dateA = parseISO(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = parseISO(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA - dateB;
    });
  }, [appointments]);
  const nextAppointment = todayAppointments[0];
  const otherAppointments = [...todayAppointments.slice(1), ...futureAppointments];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-0"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 px-4 pt-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCC5"), "Meus Atendimentos - ", format(parseISO(date), 'EEEE, d MMMM', {
    locale: ptBR
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-gray-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gray-50 border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("tr", {
    className: "divide-x divide-gray-200"
  }, /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 w-24"
  }, "Hor\xE1rio"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1"
  }, "Paciente"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32"
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-right text-sm font-semibold text-gray-900 w-20"
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-gray-200"
  }, appointments.length > 0 ? appointments.map(appt => {
    const patient = metadata.patients?.find(p => p.id === appt.patient_id);
    const service = metadata.services?.find(s => s.id === appt.service_id);
    const payer = metadata.payers?.find(py => py.id === appt.payer_id);
    const statusBadge = getStatusBadge(appt.status);
    return /*#__PURE__*/React.createElement("tr", {
      key: appt.id,
      className: "hover:bg-gray-50 transition-colors divide-x divide-gray-200"
    }, /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap"
    }, appt.scheduled_time), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm text-gray-900"
    }, patient?.name || 'N/A'), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm text-gray-900"
    }, service?.name || 'N/A'), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm text-gray-900"
    }, payer?.name || 'N/A'), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-sm"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge.bg} ${statusBadge.text}`
    }, statusBadge.icon, " ", statusBadge.label)), /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-3 text-right"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onSlotClick({
        appointment: appt
      }),
      className: "text-blue-600 hover:text-blue-900 text-sm font-medium whitespace-nowrap"
    }, "Ver")));
  }) : /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "6",
    className: "px-4 py-8 text-center text-gray-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl block mb-2"
  }, "\uD83D\uDCED"), "Nenhum atendimento para hoje"))))))), (nextAppointment || otherAppointments.length > 0) && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-gray-200 overflow-hidden mt-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gray-50 border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("tr", {
    className: "divide-x divide-gray-200"
  }, /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 w-24"
  }, "Hor\xE1rio"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1"
  }, "Paciente"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32"
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-right text-sm font-semibold text-gray-900 w-20"
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-gray-200"
  }, nextAppointment && /*#__PURE__*/React.createElement("tr", {
    className: "hover:bg-blue-50 transition-colors divide-x divide-gray-200 bg-blue-50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap"
  }, "\uD83C\uDFAF ", nextAppointment.scheduled_time), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm text-gray-900"
  }, metadata.patients?.find(p => p.id === nextAppointment.patient_id)?.name || 'N/A'), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm text-gray-900"
  }, metadata.services?.find(s => s.id === nextAppointment.service_id)?.name || 'N/A'), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm text-gray-900"
  }, metadata.payers?.find(py => py.id === nextAppointment.payer_id)?.name || 'N/A'), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(nextAppointment.status).bg} ${getStatusBadge(nextAppointment.status).text}`
  }, getStatusBadge(nextAppointment.status).icon, " ", getStatusBadge(nextAppointment.status).label)), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-right"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onSlotClick({
      appointment: nextAppointment
    }),
    className: "text-blue-600 hover:text-blue-900 text-sm font-medium whitespace-nowrap"
  }, "Ver"))), otherAppointments.map(appt => /*#__PURE__*/React.createElement("tr", {
    key: appt.id,
    className: "hover:bg-gray-50 transition-colors divide-x divide-gray-200"
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap"
  }, appt.scheduled_time), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm text-gray-900"
  }, metadata.patients?.find(p => p.id === appt.patient_id)?.name || 'N/A'), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm text-gray-900"
  }, metadata.services?.find(s => s.id === appt.service_id)?.name || 'N/A'), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm text-gray-900"
  }, metadata.payers?.find(py => py.id === appt.payer_id)?.name || 'N/A'), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(appt.status).bg} ${getStatusBadge(appt.status).text}`
  }, getStatusBadge(appt.status).icon, " ", getStatusBadge(appt.status).label)), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-right"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onSlotClick({
      appointment: appt
    }),
    className: "text-blue-600 hover:text-blue-900 text-sm font-medium whitespace-nowrap"
  }, "Ver")))))))));
}

/**
 * AppointmentCard - Cartão individual de atendimento com detalhes expansíveis
 */
function AppointmentCard({
  appointment,
  metadata = {},
  onConfirmAppointment = () => {},
  onCancelAppointment = () => {},
  isNext = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusInfo = getStatusBadge(appointment.status);
  const apptDate = parseISO(`${appointment.scheduled_date}T${appointment.scheduled_time}`);

  // Encontrar dados relacionados do metadata
  const patient = metadata.patients?.find(p => p.id === appointment.patient_id);
  const service = metadata.services?.find(s => s.id === appointment.service_id);
  const payer = metadata.payers?.find(py => py.id === appointment.payer_id);
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-lg border-2 transition-all ${isNext ? 'border-blue-400 bg-blue-50 shadow-md' : isExpanded ? 'border-gray-300 bg-white shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setIsExpanded(!isExpanded),
    className: "cursor-pointer p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, isNext && /*#__PURE__*/React.createElement("div", {
    className: "inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2"
  }, "\uD83C\uDFAF PR\xD3XIMO ATENDIMENTO"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-3 mb-2"
  }, /*#__PURE__*/React.createElement("time", {
    className: "text-lg font-bold text-gray-900"
  }, format(apptDate, 'HH:mm', {
    locale: ptBR
  })), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-semibold px-2 py-1 rounded ${statusInfo.bg} ${statusInfo.text}`
  }, statusInfo.label)), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900 truncate"
  }, "\uD83D\uDC64 ", patient?.name || 'Paciente desconhecido'), service && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "\uD83C\uDFE5 ", service.name), payer && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "\uD83C\uDFDB\uFE0F ", payer.name)), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-xs text-gray-500"
  }, "\uD83D\uDCC5 ", format(apptDate, 'EEE, d MMM', {
    locale: ptBR
  }))), /*#__PURE__*/React.createElement("div", {
    className: `transform transition-transform ${isExpanded ? 'rotate-180' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl text-gray-400"
  }, "\u2304")))), isExpanded && /*#__PURE__*/React.createElement("div", {
    className: "border-t border-gray-200 bg-gray-50 p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-semibold text-gray-700 mb-2"
  }, "Paciente"), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded p-2 text-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-900"
  }, patient?.name), patient?.phone && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "\uD83D\uDCDE ", patient.phone), patient?.email && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "\uD83D\uDCE7 ", patient.email))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, service && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-semibold text-gray-700 mb-2"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded p-2 text-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-900"
  }, service.name))), payer && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-semibold text-gray-700 mb-2"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded p-2 text-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-900"
  }, payer.name)))), appointment.notes && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-semibold text-gray-700 mb-2"
  }, "Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded p-2 text-sm text-gray-700"
  }, appointment.notes)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 pt-3 border-t border-gray-200"
  }, appointment.status !== 'confirmado' && appointment.status !== 'cancelado' && /*#__PURE__*/React.createElement("button", {
    onClick: () => onConfirmAppointment(appointment.id),
    className: "flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded font-medium text-sm transition-colors"
  }, "\u2713 Confirmar"), appointment.status !== 'cancelado' && appointment.status !== 'faltou' && /*#__PURE__*/React.createElement("button", {
    onClick: () => onCancelAppointment(appointment.id),
    className: "flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded font-medium text-sm transition-colors"
  }, "\u2717 Cancelar"))));
}

/**
 * Helper - Status badge styling
 */
function getStatusBadge(status) {
  const statusMap = {
    'confirmado': {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: '✓ Confirmado'
    },
    'agendado': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: '📅 Agendado'
    },
    'a_confirmar': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: '⏳ A confirmar'
    },
    'faltou': {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: '✗ Faltou'
    },
    'cancelado': {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: '✗ Cancelado'
    },
    'encaixe': {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      label: '⚡ Encaixe'
    }
  };
  return statusMap[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: status
  };
}