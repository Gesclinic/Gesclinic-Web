// /src/lib/appointmentsColumns.js

// Colunas “seguras” (apenas as da tabela `appointments`)
export const APPOINTMENT_COLUMNS_SAFE =
  "id,clinic_id,patient_id,professional_id,service_id,room_id,payer_id,value,scheduled_date,scheduled_time,end_time,status,notes";

// Colunas com os JOINS necessários (tudo em uma linha, sem comentários)
export const APPOINTMENT_COLUMNS_WITH_NAMES =
  "id,clinic_id,patient_id,professional_id,service_id,room_id,payer_id,value,scheduled_date,scheduled_time,end_time,status,notes,duration,patient:patients!appointments_patient_id_fkey(id,name,document_id,phone),professional:professionals(id,name),service:services(id,name),room:rooms(id,name),payer:payers(id,name)";

/**
 * “Achata” os campos vindos pelos joins para o formato usado na UI,
 * incluindo fallbacks para nomes diferentes de colunas.
 */
export function attachDisplayNames(row = {}) {
  const patient_name = row?.patient?.name ?? row?.patient_name ?? null;

  // prontuário: aceita tanto record_number quanto chart_number
  const patient_record_number =
    row?.patient?.record_number ??
    row?.patient?.chart_number ??
    row?.patient_record_number ??
    row?.chart_number ??
    null;

  const professional_name =
    row?.professional?.name ?? row?.professional_name ?? null;

  const service_name =
    row?.service?.name ?? row?.service_name ?? null;

  // payer: quando não há convênio (payer_id null), exibir "Particular"
  const payer_name =
    row?.payer?.name ??
    row?.payer_name ??
    (row?.payer_id ? null : "Particular");

  const plan_name =
    row?.plan?.name ?? row?.plan_name ?? null;

  // duração (min) — prioriza a do agendamento, depois a do serviço
  let duration_min = null;
  if (row?.duration != null) {
    duration_min = row.duration;
  } else if (row?.service?.duration_min != null) {
    duration_min = row.service.duration_min;
  } else if (row?.scheduled_time && row?.end_time) {
    // Fallback: calcular de scheduled_time e end_time
    try {
      const start = new Date(`2000-01-01T${row.scheduled_time}`);
      const end = new Date(`2000-01-01T${row.end_time}`);
      const ms = end - start;
      if (Number.isFinite(ms) && ms > 0) {
        duration_min = Math.round(ms / 60000);
      }
    } catch (e) {
      // Ignorar se format de hora for inválido
    }
  }

  // observação: prioriza a da appointment, fallback para a do profissional
  const observation =
    row?.notes ??
    row?.professional?.schedule_notes ??
    row?.observation ??
    null;

  const result = {
    ...row,
    patient_name,
    patient_record_number, // número do prontuário p/ a grade
    professional_name,
    service_name,
    payer_name,
    plan_name,
    duration_min,
    observation,
    duration_label: duration_min != null ? `${duration_min} min` : "—",
  };
  return result;
}