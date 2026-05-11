/**
 * Componente: AgendaCheckInIntegration
 * 
 * Integra a lista de agendamentos com check-in direto na página de Agenda
 * Permite fazer check-in de pacientes confirmados sem sair da Agenda
 * 
 * Uso:
 * ```
 * import { AgendaCheckInIntegration } from '@/modules/agenda/reception/AgendaCheckInIntegration';
 * 
 * <AgendaCheckInIntegration 
 *   clinic_id={clinicId}
 *   date={selectedDate}
 *   onCheckInSuccess={() => refetchAppointments()}
 * />
 * ```
 */

import React from 'react';
import { AppointmentListWithCheckIn } from './components/AppointmentListWithCheckIn';

interface AgendaCheckInIntegrationProps {
  clinic_id: string;
  date?: string;
  onCheckInSuccess?: () => void;
}

export const AgendaCheckInIntegration: React.FC<AgendaCheckInIntegrationProps> = ({
  clinic_id,
  date,
  onCheckInSuccess,
}) => {
  return (
    <div className="w-full">
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="text-lg font-semibold text-purple-900 mb-1">✅ Check-in de Pacientes</h3>
        <p className="text-sm text-purple-700">
          Faça o check-in diretamente pela Agenda. Pacientes confirmados serão movidos para a Fila
          de Espera.
        </p>
      </div>

      <AppointmentListWithCheckIn
        clinic_id={clinic_id}
        filter_status="confirmed"
        onCheckInSuccess={onCheckInSuccess}
      />
    </div>
  );
};

export default AgendaCheckInIntegration;
