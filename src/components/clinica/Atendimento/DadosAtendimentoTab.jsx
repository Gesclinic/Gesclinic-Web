import React from 'react';

export default function DadosAtendimentoTab({ appointment }) {
  if (!appointment) {
    return null;
  }
  return (
    <div className="space-y-2">
      <div>
        <b>Paciente:</b> {appointment.patient?.full_name || '-'}
      </div>
      <div>
        <b>Profissional:</b> {appointment.professional?.name || '-'}
      </div>
      <div>
        <b>Serviço:</b> {appointment.service?.name || '-'}
      </div>
      <div>
        <b>Convênio:</b> {appointment.insurance_id || '-'}
      </div>
      <div>
        <b>Plano:</b> {appointment.plan_id || '-'}
      </div>
      <div>
        <b>Sala:</b> {appointment.room_id || '-'}
      </div>
      <div>
        <b>Data/Hora:</b>{' '}
        {appointment.start_time ? new Date(appointment.start_time).toLocaleString() : '-'}
      </div>
      <div>
        <b>Duração:</b> {appointment.duration || '-'}
      </div>
    </div>
  );
}
