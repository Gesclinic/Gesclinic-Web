/**
 * Componente: CheckInButton
 * 
 * Botão para fazer check-in de um paciente na recepção
 * Abre dialog de confirmação
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OfficialAppointmentStatus } from '@/modules/agenda/types';
import CheckInDialog from './CheckInDialog';

interface CheckInButtonProps {
  appointment_id: string;
  clinic_id: string;
  status: OfficialAppointmentStatus;
  patient_name?: string;
  scheduled_time?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
}

/**
 * Botão Check-in com dialog
 * 
 * Uso:
 * ```
 * <CheckInButton
 *   appointment_id="123"
 *   clinic_id="clinic-1"
 *   status="confirmed"
 *   patient_name="João Silva"
 *   scheduled_time="14:30"
 *   onSuccess={() => console.log('Check-in feito!')}
 * />
 * ```
 */
const CheckInButton = React.memo(
  ({
    appointment_id,
    clinic_id,
    status,
    patient_name,
    scheduled_time,
    onSuccess,
    onError,
    disabled = false,
    size = 'md',
    variant = 'default',
  }: CheckInButtonProps) => {
    const [open, setOpen] = useState(false);

    // Só permite check-in se status é 'confirmed'
    const canCheckIn = status === 'confirmed' && !disabled;

    const handleDialogClose = (success: boolean) => {
      setOpen(false);
      if (success) {
        onSuccess?.();
      }
    };

    const handleError = (error: string) => {
      onError?.(error);
    };

    return (
      <>
        <Button
          onClick={() => setOpen(true)}
          disabled={!canCheckIn}
          size={size}
          variant={variant}
          className={canCheckIn ? 'bg-purple-600 hover:bg-purple-700' : ''}
          title={canCheckIn ? 'Fazer check-in' : 'Agendamento deve estar confirmado'}
        >
          📍 Check-in
        </Button>

        {canCheckIn && (
          <CheckInDialog
            open={open}
            appointment_id={appointment_id}
            clinic_id={clinic_id}
            patient_name={patient_name}
            scheduled_time={scheduled_time}
            onClose={handleDialogClose}
            onError={handleError}
          />
        )}
      </>
    );
  }
);

CheckInButton.displayName = 'CheckInButton';

export default CheckInButton;
