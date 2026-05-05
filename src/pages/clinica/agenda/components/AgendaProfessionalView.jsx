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
  userRole = 'professional',
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Separar próximo atendimento (hoje) dos demais
  const todayAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return [];
    }
    return appointments
      .filter((a) => {
        const apptDate = parseISO(`${a.scheduled_date}T${a.scheduled_time}`);
        return isToday(apptDate);
      })
      .sort((a, b) => {
        const timeA = new Date(`2000-01-01T${a.scheduled_time}`);
        const timeB = new Date(`2000-01-01T${b.scheduled_time}`);
        return timeA - timeB;
      });
  }, [appointments]);

  const futureAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return [];
    }
    return appointments
      .filter((a) => {
        const apptDate = parseISO(`${a.scheduled_date}T${a.scheduled_time}`);
        return !isToday(apptDate);
      })
      .sort((a, b) => {
        const dateA = parseISO(`${a.scheduled_date}T${a.scheduled_time}`);
        const dateB = parseISO(`${b.scheduled_date}T${b.scheduled_time}`);
        return dateA - dateB;
      });
  }, [appointments]);

  const nextAppointment = todayAppointments[0];
  const otherAppointments = [...todayAppointments.slice(1), ...futureAppointments];

  return (
    <div className="space-y-0">
      {/* Timeline visual - Meus Atendimentos */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 px-4 pt-4">
          <span className="text-2xl">📅</span>
          Meus Atendimentos - {format(parseISO(date), 'EEEE, d MMMM', { locale: ptBR })}
        </h2>

        {/* Tabela com detalhes dos atendimentos */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="divide-x divide-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-24">
                    Horário
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1">
                    Paciente
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1">
                    Serviço
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1">
                    Convênio
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 w-20">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.length > 0 ? (
                  appointments.map((appt) => {
                    const statusBadge = getStatusBadge(appt.status);

                    return (
                      <tr
                        key={appt.id}
                        className="hover:bg-gray-50 transition-colors divide-x divide-gray-200"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">
                          {appt.scheduled_time}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {appt.patient_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {appt.service_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {appt.payer_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge.bg} ${statusBadge.text}`}
                          >
                            {statusBadge.icon} {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onSlotClick({ appointment: appt })}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium whitespace-nowrap"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      <span className="text-2xl block mb-2">📭</span>
                      Nenhum atendimento para hoje
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Lista complementar de atendimentos */}
      {(nextAppointment || otherAppointments.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="divide-x divide-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-24">
                    Horário
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1">
                    Paciente
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1">
                    Serviço
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 flex-1">
                    Convênio
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 w-20">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {nextAppointment && (
                  <tr className="hover:bg-blue-50 transition-colors divide-x divide-gray-200 bg-blue-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">
                      🎯 {nextAppointment.scheduled_time}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {nextAppointment.patient_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {nextAppointment.service_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {nextAppointment.payer_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(nextAppointment.status).bg} ${getStatusBadge(nextAppointment.status).text}`}
                      >
                        {getStatusBadge(nextAppointment.status).icon}{' '}
                        {getStatusBadge(nextAppointment.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSlotClick({ appointment: nextAppointment })}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium whitespace-nowrap"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                )}
                {otherAppointments.map((appt) => (
                  <tr
                    key={appt.id}
                    className="hover:bg-gray-50 transition-colors divide-x divide-gray-200"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">
                      {appt.scheduled_time}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {appt.patient_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {appt.service_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{appt.payer_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(appt.status).bg} ${getStatusBadge(appt.status).text}`}
                      >
                        {getStatusBadge(appt.status).icon} {getStatusBadge(appt.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSlotClick({ appointment: appt })}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium whitespace-nowrap"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AppointmentCard - Cartão individual de atendimento com detalhes expansíveis
 */
function AppointmentCard({
  appointment,
  metadata = {},
  onConfirmAppointment = () => {},
  onCancelAppointment = () => {},
  isNext = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusInfo = getStatusBadge(appointment.status);
  const apptDate = parseISO(`${appointment.scheduled_date}T${appointment.scheduled_time}`);

  // Usar dados normalizados do appointment (já vêm do mapFromDatabase)
  const patientName =
    appointment.patient_name || appointment.patientName || 'Paciente desconhecido';
  const serviceName = appointment.service_name || appointment.serviceName;
  const payerName = appointment.payer_name || appointment.payerName;

  return (
    <div
      className={`rounded-lg border-2 transition-all ${
        isNext
          ? 'border-blue-400 bg-blue-50 shadow-md'
          : isExpanded
            ? 'border-gray-300 bg-white shadow-md'
            : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isNext && (
              <div className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                🎯 PRÓXIMO ATENDIMENTO
              </div>
            )}

            <div className="flex items-baseline gap-3 mb-2">
              <time className="text-lg font-bold text-gray-900">
                {format(apptDate, 'HH:mm', { locale: ptBR })}
              </time>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${statusInfo.bg} ${statusInfo.text}`}
              >
                {statusInfo.label}
              </span>
            </div>

            <div className="mt-3 space-y-1">
              <p className="font-semibold text-gray-900 truncate">👤 {patientName}</p>
              {serviceName && <p className="text-sm text-gray-600">🏥 {serviceName}</p>}
              {payerName && <p className="text-sm text-gray-600">🏛️ {payerName}</p>}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              📅 {format(apptDate, 'EEE, d MMM', { locale: ptBR })}
            </div>
          </div>

          <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <span className="text-xl text-gray-400">⌄</span>
          </div>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
          {/* Info do paciente */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Paciente</h4>
            <div className="bg-white rounded p-2 text-sm">
              <p className="font-medium text-gray-900">{patientName}</p>
              {appointment.patient_phone && (
                <p className="text-gray-600">📞 {appointment.patient_phone}</p>
              )}
              {appointment.patient_mobile && (
                <p className="text-gray-600">📱 {appointment.patient_mobile}</p>
              )}
            </div>
          </div>

          {/* Serviço e convênio */}
          <div className="grid grid-cols-2 gap-3">
            {serviceName && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Serviço</h4>
                <div className="bg-white rounded p-2 text-sm">
                  <p className="font-medium text-gray-900">{serviceName}</p>
                </div>
              </div>
            )}

            {payerName && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Convênio</h4>
                <div className="bg-white rounded p-2 text-sm">
                  <p className="font-medium text-gray-900">{payerName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          {appointment.notes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Observações</h4>
              <div className="bg-white rounded p-2 text-sm text-gray-700">{appointment.notes}</div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 pt-3 border-t border-gray-200">
            {appointment.status !== 'confirmado' && appointment.status !== 'cancelado' && (
              <button
                onClick={() => onConfirmAppointment(appointment.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded font-medium text-sm transition-colors"
              >
                ✓ Confirmar
              </button>
            )}

            {appointment.status !== 'cancelado' && appointment.status !== 'faltou' && (
              <button
                onClick={() => onCancelAppointment(appointment.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded font-medium text-sm transition-colors"
              >
                ✗ Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper - Status badge styling
 */
function getStatusBadge(status) {
  const statusMap = {
    confirmado: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Confirmado' },
    agendado: { bg: 'bg-blue-100', text: 'text-blue-800', label: '📅 Agendado' },
    a_confirmar: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏳ A confirmar' },
    faltou: { bg: 'bg-red-100', text: 'text-red-800', label: '✗ Faltou' },
    cancelado: { bg: 'bg-gray-100', text: 'text-gray-800', label: '✗ Cancelado' },
    encaixe: { bg: 'bg-purple-100', text: 'text-purple-800', label: '⚡ Encaixe' },
  };
  return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
}
