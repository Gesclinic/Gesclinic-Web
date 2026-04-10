import { supabase } from "@/lib/customSupabaseClient";

/**
 * LEGACY: NÃO USAR MAIS NA AGENDA
 * Calcula horário final baseado no tempo médio
 * MANTIDO APENAS PARA HISTÓRICO
 */
// NÃO USAR MAIS: calcularEndTime
export function calcularEndTime(startTime, minutos = 30) {
  const start = new Date(startTime);
  return new Date(start.getTime() + minutos * 60000).toISOString();
}

/**
 * LEGACY: NÃO USAR MAIS NA AGENDA
 * Cria ou atualiza agendamento
 * MANTIDO APENAS PARA HISTÓRICO
 */
// NÃO USAR MAIS: salvarAgendamento
export async function salvarAgendamento(payload) {
  const {
    id,
    clinicId,
    start_time,
    end_time,
    patient_id,
    patient_name,
    patient_phone,
    professional_id,
    service_id,
    payer_id,
    plan_id,
    notes,
    status = "agendado"
  } = payload;

  if (!clinicId || !start_time || !end_time) {
    throw new Error("Dados obrigatórios não informados");
  }

  // 🔒 Verificar conflito de horário
  const { data: conflitos } = await supabase
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .neq("id", id || "00000000-0000-0000-0000-000000000000")
    .lt("start_time", end_time)
    .gt("end_time", start_time);

  if (conflitos?.length) {
    throw new Error("Conflito de horário com outro agendamento");
  }

  const data = {
    clinic_id: clinicId,
    start_time,
    end_time,
    patient_id,
    patient_name,
    patient_phone,
    professional_id,
    service_id,
    payer_id,
    plan_id,
    notes,
    status
  };

  if (id) {
    await supabase.from("appointments").update(data).eq("id", id);
  } else {
    await supabase.from("appointments").insert(data);
  }
}

/**
 * LEGACY: NÃO USAR MAIS NA AGENDA
 * Atualiza status
 * MANTIDO APENAS PARA HISTÓRICO
 */
// NÃO USAR MAIS: atualizarStatus
export async function atualizarStatus(id, status) {
  await supabase.from("appointments").update({ status }).eq("id", id);
}
