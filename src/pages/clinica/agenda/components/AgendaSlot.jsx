// src/pages/clinica/agenda/components/AgendaSlot.jsx
import React, { useState } from 'react';
import { migrateStatus, SERVICE_STATUSES } from '@/lib/appointmentStatusConstants';

/**
 * AgendaSlot - Componente reutilizável para renderizar um slot de horário
 *
 * Props:
 * - time: string (HH:MM)
 * - date: string (YYYY-MM-DD)
 * - appointment: object | null (agendamento ou null se disponível)
 * - onSlotClick: (slot) => void - Callback ao clicar no slot
 * - onCheckin: (appointment) => void - Callback ao clicar em Check-in
 * - groupId: string (profissional_id ou room_id, opcional)
 * - columnType: 'professional' | 'room' | null (para identificar o contexto)
 * - size: 'compact' | 'standard' (para visualizações diferentes)
 * - userRole: string (papel do usuário, para validar permissões)
 */
export default function AgendaSlot({
  time,
  date,
  appointment,
  onSlotClick,
  onCheckin,
  groupId,
  columnType,
  size = 'standard',
  userRole = null,
  professionalSchedules = [],
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Definir dayOfWeek no início para uso em toda a função
  const slotDate = new Date(date);
  // Corrige: JS getDay() (0=domingo, 1=segunda, ..., 6=sábado) para padrão banco (1=segunda, ..., 7=domingo)
  let dayOfWeek = slotDate.getDay();
  dayOfWeek = dayOfWeek === 0 ? 0 : dayOfWeek + 1;

  // Checar disponibilidade semanal se for slot disponível e coluna de profissional
  let isAvailable = !appointment;
  if (columnType === 'professional' && groupId) {
    // Busca horários do profissional para o dia da semana
    const schedules = professionalSchedules.filter(
      (s) => s.professional_id === groupId && parseInt(s.day_of_week, 10) === dayOfWeek,
    );
    // LOG TEMPORÁRIO PARA DEBUG
    // eslint-disable-next-line no-console
    console.log(
      '[AgendaSlot DEBUG] groupId:',
      groupId,
      'date:',
      date,
      'dayOfWeek:',
      dayOfWeek,
      'schedules:',
      schedules,
      'allSchedules:',
      professionalSchedules,
    );
    if (schedules.length === 0) {
      isAvailable = false;
    } else {
      isAvailable = schedules.some((s) => {
        // Checa se o horário do slot está dentro de algum intervalo configurado
        const [slotHour, slotMinute] = time.split(':').map(Number);
        const [startHour, startMinute] = s.start_time.split(':').map(Number);
        const [endHour, endMinute] = s.end_time.split(':').map(Number);
        const slotMinutes = slotHour * 60 + slotMinute;
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        return slotMinutes >= startMinutes && slotMinutes < endMinutes;
      });
    }
  }
  const status = appointment?.status || (isAvailable ? 'available' : 'unavailable');
  const normalizedStatus = migrateStatus(status);
  const isClinicalFlow = [
    SERVICE_STATUSES.AWAITING_PROFESSIONAL,
    SERVICE_STATUSES.IN_SERVICE,
    SERVICE_STATUSES.ATTENDED,
  ].includes(normalizedStatus);
  const actionLabel = isClinicalFlow
    ? normalizedStatus === SERVICE_STATUSES.AWAITING_PROFESSIONAL
      ? '📝 Prontuário'
      : '👨‍⚕️ Atendimento'
    : '📋 Check-in';
  const actionTitle = isClinicalFlow
    ? normalizedStatus === SERVICE_STATUSES.AWAITING_PROFESSIONAL
      ? 'Abrir prontuário do paciente'
      : 'Abrir atendimento em andamento'
    : 'Abrir check-in';

  // Cores por status
  const statusColors = {
    available: {
      bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
      border: 'border-gray-200',
      hover: 'hover:from-green-50 hover:to-green-100',
      text: 'text-gray-600',
      badge: 'bg-green-50 text-green-700',
    },
    confirmado: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      border: 'border-green-200',
      hover: 'hover:from-green-100 hover:to-green-200',
      text: 'text-green-800',
      badge: 'bg-green-200 text-green-900',
    },
    a_confirmar: {
      bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      border: 'border-yellow-200',
      hover: 'hover:from-yellow-100 hover:to-yellow-200',
      text: 'text-yellow-800',
      badge: 'bg-yellow-200 text-yellow-900',
    },
    faltou: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      border: 'border-red-200',
      hover: 'hover:from-red-100 hover:to-red-200',
      text: 'text-red-800',
      badge: 'bg-red-200 text-red-900',
    },
    encaixe: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      hover: 'hover:from-blue-100 hover:to-blue-200',
      text: 'text-blue-800',
      badge: 'bg-blue-200 text-blue-900',
    },
    bloqueado: {
      bg: 'bg-gradient-to-br from-gray-100 to-gray-200',
      border: 'border-gray-300',
      hover: 'hover:from-gray-100 hover:to-gray-200',
      text: 'text-gray-700',
      badge: 'bg-gray-300 text-gray-900',
    },
  };

  const colors = statusColors[status] || statusColors.available;

  // Tamanho do slot
  const slotClasses = size === 'compact' ? 'min-h-16 p-1.5' : 'min-h-20 p-2';

  // Ações disponíveis
  const handleAgendar = (e) => {
    e.stopPropagation();
    onSlotClick({ date, time, groupId, type: 'new' });
  };

  const handleEncaixar = (e) => {
    e.stopPropagation();
    onSlotClick({ date, time, groupId, type: 'encaixe' });
  };

  const handleBloquear = (e) => {
    e.stopPropagation();
    onSlotClick({ date, time, groupId, type: 'bloquear' });
  };

  const handleEditar = (e) => {
    e.stopPropagation();
    onSlotClick({ ...appointment, type: 'edit' });
  };

  if (isAvailable) {
    return (
      <div
        className={`
          flex flex-col items-center justify-center border rounded-md cursor-pointer 
          transition-all duration-200 group relative
          ${slotClasses} ${colors.bg} ${colors.border} ${colors.hover} border-l-4
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={handleAgendar}
      >
        {/* Indicator de disponibilidade */}
        <div className="text-2xl mb-1">✓</div>
        <span className={`text-xs font-semibold ${colors.text}`}>Disponível</span>

        {/* Ações rápidas no hover */}
        <div className="absolute inset-0 bg-black/5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1 backdrop-blur-sm">
          <button
            onClick={handleAgendar}
            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors duration-150 font-medium shadow-lg transform hover:scale-105"
            title="Agendar novo paciente"
          >
            ➕
          </button>
          <button
            onClick={handleEncaixar}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors duration-150 font-medium shadow-lg transform hover:scale-105"
            title="Encaixar paciente"
          >
            ⏱️
          </button>
          <button
            onClick={handleBloquear}
            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors duration-150 font-medium shadow-lg transform hover:scale-105"
            title="Bloquear horário"
          >
            🔒
          </button>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
            Clique para agendar
          </div>
        )}
      </div>
    );
  }

  // Slot ocupado
  return (
    <div
      className={`
        flex flex-col justify-between border-l-4 rounded-md cursor-pointer 
        transition-all duration-200 group relative overflow-hidden
        ${slotClasses} ${colors.bg} ${colors.border} ${colors.hover}
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleEditar}
    >
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div className="font-bold text-sm truncate text-gray-900">
          {appointment ? appointment.patient_name || 'Paciente' : 'Paciente'}
        </div>

        {size === 'standard' && (
          <>
            <div className="text-xs text-gray-700 truncate">
              {appointment.professional_name && `👨‍⚕️ ${appointment.professional_name}`}
            </div>
            <div className="text-xs text-gray-600 truncate">{appointment.service_name}</div>
          </>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center justify-between gap-1 pt-1">
        <span className={`inline-block px-1.5 py-0.5 text-xs font-bold rounded ${colors.badge}`}>
          {getStatusIcon(status)} {getStatusLabel(status)}
        </span>
      </div>

      {/* Overlay com ações no hover */}
      <div className="absolute inset-0 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1 backdrop-blur-sm p-2">
        {/* Botão de fluxo operacional/clínico (apenas para recepção/gestor) */}
        {onCheckin && ['recepcao', 'gestor', 'admin'].includes(userRole?.toLowerCase?.()) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCheckin(appointment);
            }}
            className="px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors duration-150 font-medium shadow-lg transform hover:scale-105"
            title={actionTitle}
          >
            {actionLabel}
          </button>
        )}
        <button
          onClick={handleEditar}
          className="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors duration-150 font-medium shadow-lg transform hover:scale-105"
          title="Editar agendamento"
        >
          ✎ Editar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSlotClick({ ...appointment, type: 'delete' });
          }}
          className="px-3 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors duration-150 font-medium shadow-lg transform hover:scale-105"
          title="Cancelar agendamento"
        >
          ✕ Cancelar
        </button>
      </div>

      {/* Tooltip detalhado */}
      {showTooltip && appointment && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-3 py-2 rounded whitespace-nowrap z-50 shadow-lg">
          <div className="font-semibold">{appointment.patient_name}</div>
          {appointment.patient_phone && <div>📞 {appointment.patient_phone}</div>}
          {appointment.patient_mobile && <div>📱 {appointment.patient_mobile}</div>}
          {appointment.professional_name && <div>👨‍⚕️ {appointment.professional_name}</div>}
          {appointment.room_name && <div>🏥 {appointment.room_name}</div>}
          {appointment.service_name && <div>📋 {appointment.service_name}</div>}
          <div className="mt-1 border-t border-gray-700 pt-1">
            {getStatusIcon(status)} {getStatusLabel(status)}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Ícones de status
 */
function getStatusIcon(status) {
  switch (status) {
  case 'confirmado':
    return '✓';
  case 'a_confirmar':
    return '⚠';
  case 'faltou':
    return '✕';
  case 'encaixe':
    return '⚡';
  case 'bloqueado':
    return '🔒';
  default:
    return '•';
  }
}

/**
 * Rótulos de status em português
 */
function getStatusLabel(status) {
  switch (status) {
  case 'confirmado':
    return 'Confirmado';
  case 'a_confirmar':
    return 'A Confirmar';
  case 'faltou':
    return 'Faltou';
  case 'encaixe':
    return 'Encaixe';
  case 'bloqueado':
    return 'Bloqueado';
  case 'available':
    return 'Disponível';
  default:
    return status;
  }
}
