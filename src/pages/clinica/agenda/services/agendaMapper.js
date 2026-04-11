// agendaMapper.js
// Mapper único para Agenda Unificada, por Profissional e por Sala

export function mapAgendaItem(a = {}) {
  console.log('[mapAgendaItem] Input:', a);
  
  // Handle both formats:
  // Format 1 (from listarAgenda): scheduled_date + scheduled_time
  // Format 2 (from listAppointments): already has start_time, end_time from mapping
  
  const startTime = a.startTime || (a.scheduled_date && a.scheduled_time
    ? new Date(`${a.scheduled_date}T${a.scheduled_time}`)
    : null);
  
  const endTime = a.endTime || (a.scheduled_date && a.end_time
    ? new Date(`${a.scheduled_date}T${a.end_time}`)
    : null);

  // Use the mapped time or construct from scheduled_time
  const start_time = a.start_time || a.scheduled_time || null;
  const end_time = a.end_time || null;

  return {
    // IDs
    id: a.id,
    clinic_id: a.clinic_id,
    patient_id: a.patient_id,
    professional_id: a.professional_id,
    service_id: a.service_id,
    room_id: a.room_id,
    payer_id: a.payer_id,

    // Datas / Horários (new format + backward compat)
    startTime: startTime,
    endTime: endTime,
    start_time: start_time,  // Backward compatibility: HH:MM:SS format for components
    end_time: end_time,      // Backward compatibility: HH:MM:SS format for components
    scheduled_date: a.scheduled_date,
    scheduled_time: a.scheduled_time,

    // Status
    status: a.status ?? "—",

    // Entidades principais
    // Handle both formats: patient vs patients relationship, patients?.name vs patient_name
    patient: {
      name: a.patient_name || a.patients?.name || a.patient?.name || "—",
      full_name: a.patient_name || a.patients?.name || a.patient?.name || "—",
      record_number: a.patients?.record_number || a.patient?.record_number || "—",
      document_id: a.patients?.document_id || a.patient?.document_id || "—",
      phone: a.patient_phone || a.patients?.phone || a.patient?.phone || "—",
      cell_phone: a.patient_mobile || a.patients?.cell_phone || a.patient?.cell_phone || "—",
    },
    patient_name: a.patient_name || a.patients?.name || a.patient?.name || "—",
    patient_prontuario: a.patients?.prontuario_numero || a.patient?.prontuario_numero || "—",
    prontuario: a.patients?.record_number || a.patient?.record_number || "—",
    patientPhone: a.patient_phone || a.patients?.phone || a.patient?.phone || "—",
    patientEmail: a.patients?.email || a.patient?.email || "—",
    patientCpf: a.patient_cpf || a.patients?.document_id || a.patient?.document_id || "—",
    
    professional: a.professional_name || a.professionals?.name || a.professional?.name || "Sem profissional",
    professional_name: a.professional_name || a.professionals?.name || a.professional?.name || "Sem profissional",
    professionalSpecialty: a.professionals?.specialty || a.professional?.specialty || "—",
    
    service: a.service_name || a.services?.name || a.service?.name || "—",
    service_name: a.service_name || a.services?.name || a.service?.name || "—",
    serviceType: a.services?.type || a.service?.type || "—",
    serviceDuration: a.services?.duration_min || a.service?.duration || null,
    serviceValue: a.services?.value || a.service?.value || null,
    
    room: a.room_name || a.rooms?.name || a.room?.name || "Sem sala",
    room_name: a.room_name || a.rooms?.name || a.room?.name || "Sem sala",
    roomType: a.rooms?.type || a.room?.type || "—",
    roomUnit: a.rooms?.unit || a.room?.unit || "—",

    // Convênio / Plano
    payer:
      !a.payer_id
        ? "Particular"
        : a.payer_name || a.payers?.name
          ? (a.payer_name || a.payers?.name)
          : (a.convenio?.name || a.convenio || "—"),
    payer_name: a.payer_name || a.payers?.name || (a.payer_id ? "Convênio" : "Particular"),
    plan: a.plan?.name ?? "—",
    plan_name: a.plan_name || a.plans?.name || a.plan?.name ?? "—",

    // Observações
    notes: a.notes ?? "—",
    internalNotes: a.internal_notes ?? "—",
    updatedAt: a.updated_at ?? null,
    value: a.value ?? a.serviceValue ?? null,

    // IDs auxiliares (úteis para filtros e cliques)
    patientId: a.patient?.id ?? a.patient_id ?? null,
    professionalId: a.professional?.id ?? a.professional_id ?? null,
    serviceId: a.service?.id ?? a.service_id ?? null,
    roomId: a.room?.id ?? a.room_id ?? null,
    payerId: a.payer?.id || a.payer_id || null,
    planId: a.plan?.id ?? a.plan_id ?? null,
  };
}
