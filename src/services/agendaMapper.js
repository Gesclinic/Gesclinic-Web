// src/services/agendaMapper.js
// Mapper único para agendamentos

export function mapAgendaItem(a) {
  return {
    id: a.id,
    startTime: a.start_time ? new Date(a.start_time) : null,
    endTime: a.end_time ? new Date(a.end_time) : null,
    status: a.status ?? '—',

    // Paciente
    patient: a.patient?.name || '—',
    patientPhone: a.patient?.phone || '—',
    patientEmail: a.patient?.email || '—',
    patientCpf: a.patient?.cpf || '—',
    patientId: a.patient_id ?? '—',

    // Profissional
    professional: a.professional?.name || 'Sem profissional',
    professionalSpecialty: a.professional?.specialty || '—',
    professionalRegister: a.professional?.register || '—',
    professionalId: a.professional_id ?? '—',

    // Serviço
    service: a.service?.name || '—',
    serviceType: a.service?.type || '—',
    serviceDuration: a.service?.duration || null,
    serviceValue: a.service?.value || null,
    serviceId: a.service_id ?? '—',

    // Sala
    room: a.room?.name || 'Sem sala',
    roomType: a.room?.type || '—',
    roomUnit: a.room?.unit || '—',
    roomId: a.room_id ?? '—',

    // Convênio/Plano
    payer: a.payer?.name || '—',
    payerId: a.payer_id ?? '—',
    plan: a.plan?.name || '—',
    planId: a.plan_id ?? '—',

    // Status e datas
    updatedAt: a.updated_at || null,

    // Observações
    notes: a.notes || '',
    internalNotes: a.internal_notes || '',
  };
}
