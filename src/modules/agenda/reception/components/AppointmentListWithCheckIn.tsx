/**
 * Componente: AppointmentListWithCheckIn
 * 
 * Lista de agendamentos com integração de CheckInButton
 * Mostra apenas agendamentos "confirmed"
 * Permite fazer check-in diretamente da lista
 */

import React, { useMemo } from 'react';
import { CheckInButton } from '@/modules/agenda/reception';
import { OfficialAppointmentStatus } from '@/modules/agenda/types';

/**
 * Tipo para agendamento (ajuste conforme seu modelo)
 */
interface Appointment {
  id: string;
  patient_name: string;
  patient_id?: string;
  professional_name?: string;
  service_name?: string;
  scheduled_date: string;
  official_status: OfficialAppointmentStatus;
  room_name?: string;
}

interface AppointmentListWithCheckInProps {
  appointments: Appointment[];
  clinic_id: string;
  onCheckInSuccess?: (appointment: Appointment) => void;
  onCheckInError?: (appointment: Appointment, error: string) => void;
}

/**
 * Lista de agendamentos com CheckInButton integrado
 * 
 * Uso:
 * ```
 * <AppointmentListWithCheckIn
 *   appointments={appointments}
 *   clinic_id={clinic_id}
 *   onCheckInSuccess={(apt) => console.log('Check-in:', apt.patient_name)}
 * />
 * ```
 */
export function AppointmentListWithCheckIn({
  appointments,
  clinic_id,
  onCheckInSuccess,
  onCheckInError,
}: AppointmentListWithCheckInProps) {
  // Filtrar apenas agendamentos confirmados e não feitos check-in
  const confirmedAppointments = useMemo(
    () =>
      appointments
        .filter((apt) => apt.official_status === 'confirmed')
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()),
    [appointments]
  );

  if (confirmedAppointments.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-8">
        <div className="text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-gray-600">Nenhum agendamento aguardando check-in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <h3 className="font-semibold text-gray-900">
          Aguardando Check-in ({confirmedAppointments.length})
        </h3>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {confirmedAppointments.map((apt) => (
          <AppointmentCard
            key={apt.id}
            appointment={apt}
            clinic_id={clinic_id}
            onCheckInSuccess={() => onCheckInSuccess?.(apt)}
            onCheckInError={(error) => onCheckInError?.(apt, error)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Card individual de agendamento
 */
interface AppointmentCardProps {
  appointment: Appointment;
  clinic_id: string;
  onCheckInSuccess?: () => void;
  onCheckInError?: (error: string) => void;
}

function AppointmentCard({
  appointment,
  clinic_id,
  onCheckInSuccess,
  onCheckInError,
}: AppointmentCardProps) {
  const scheduledTime = new Date(appointment.scheduled_date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const scheduledDate = new Date(appointment.scheduled_date).toLocaleDateString('pt-BR');

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        {/* Informações do Paciente */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-2">
            <h4 className="text-base font-semibold text-gray-900 truncate">
              {appointment.patient_name}
            </h4>
            <span className="text-xs text-gray-500 flex-shrink-0">ID: {appointment.patient_id}</span>
          </div>

          {/* Detalhes em grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">📅 Data/Hora</span>
              <div className="font-medium text-gray-900">
                {scheduledDate} às {scheduledTime}
              </div>
            </div>

            {appointment.professional_name && (
              <div>
                <span className="text-gray-600">👨‍⚕️ Profissional</span>
                <div className="font-medium text-gray-900">{appointment.professional_name}</div>
              </div>
            )}

            {appointment.service_name && (
              <div>
                <span className="text-gray-600">📋 Serviço</span>
                <div className="font-medium text-gray-900">{appointment.service_name}</div>
              </div>
            )}

            {appointment.room_name && (
              <div>
                <span className="text-gray-600">🚪 Sala</span>
                <div className="font-medium text-gray-900">{appointment.room_name}</div>
              </div>
            )}
          </div>
        </div>

        {/* Botão Check-in */}
        <div className="flex-shrink-0">
          <CheckInButton
            appointment_id={appointment.id}
            clinic_id={clinic_id}
            status={appointment.official_status}
            patient_name={appointment.patient_name}
            scheduled_time={scheduledTime}
            onSuccess={onCheckInSuccess}
            onError={onCheckInError}
            size="md"
          />
        </div>
      </div>
    </div>
  );
}

export default AppointmentListWithCheckIn;
