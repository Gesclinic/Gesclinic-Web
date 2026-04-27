import { supabase } from "@/lib/customSupabaseClient";
import * as Sentry from "@sentry/react";
import { mapAppointmentToDatabase, mapAppointmentFromDatabase, sanitizePayload } from "@/lib/mappers";
import { validateAppointmentPayload, validateAppointmentUpdatePayload, validateClinicId } from "@/lib/validators";

/**
 * CRIAR AGENDAMENTO
 */
export async function criarAgendamento(payload) {
  try {
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    validateAppointmentPayload(payload);
    const sanitized = sanitizePayload(payload);
    const dbPayload = mapAppointmentToDatabase(sanitized);

    // Garantir clinic_id válido
    if (!dbPayload.clinic_id) {
      throw new Error("clinic_id obrigatório");
    }

    console.log("➕ [CREATE] Agendamento:", { clinicId: dbPayload.clinic_id, date: dbPayload.scheduled_date, userId: user.id });

    const { data, error } = await supabase
      .from("appointments")
      .insert([dbPayload])
      .select()
      .maybeSingle();

    if (error) throw error;
    
    if (!data) {
      throw new Error("Falha ao inserir agendamento - nenhum dado retornado");
    }

    const response = mapAppointmentFromDatabase(data);
    console.log("✅ [CREATE] Sucesso:", response.id);
    Sentry.captureMessage("Agendamento criado", "info", { tags: { action: "create_appointment" } });
    return response;
  } catch (err) {
    console.error("❌ [CREATE] Erro:", err.message);
    Sentry.captureException(err, { tags: { action: "create_appointment_error" } });
    throw err;
  }
}

/**
 * ATUALIZAR AGENDAMENTO
 */
export async function atualizarAgendamento(agendamentoId, payload) {
  try {
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado - sessão expirada");
    }

    // Validações obrigatórias
    if (!agendamentoId) throw new Error("ID do agendamento é obrigatório");
    if (!payload.clinicId && !payload.clinic_id) throw new Error("clinic_id é obrigatório");

    validateAppointmentUpdatePayload({ ...payload, id: agendamentoId });
    const sanitized = sanitizePayload(payload);
    const dbPayload = mapAppointmentToDatabase(sanitized);

    // Extrair clinic_id válido
    const clinicId = dbPayload.clinic_id || payload.clinic_id || payload.clinicId;
    if (!clinicId) {
      throw new Error("clinic_id não pode ser extraído do payload");
    }

    // Remove id e clinic_id (immutable fields)
    const updateData = {};
    Object.keys(dbPayload).forEach(key => {
      if (key !== "id" && key !== "clinic_id" && dbPayload[key] !== undefined && dbPayload[key] !== null) {
        updateData[key] = dbPayload[key];
      }
    });

    console.log("✏️ [UPDATE] DEBUG PAYLOAD:", {
      agendamentoId,
      clinicId,
      userId: user.id,
      updateDataKeys: Object.keys(updateData),
      updateData
    });

    if (Object.keys(updateData).length === 0) {
      throw new Error("Nenhum campo válido para atualizar");
    }

    // PASSO 1: Executar UPDATE
    const { error: updateError } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", agendamentoId)
      .eq("clinic_id", clinicId);

    if (updateError) {
      console.error("❌ [UPDATE] ERRO NO UPDATE:", updateError);
      throw new Error(`Falha na atualização: ${updateError.message}`);
    }

    // PASSO 2: Buscar registro atualizado com clinic_id filter
    const { data, error: fetchError } = await supabase
      .from("appointments")
      .select()
      .eq("id", agendamentoId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ [UPDATE] ERRO AO BUSCAR:", fetchError);
      throw new Error(`Falha ao buscar registro: ${fetchError.message}`);
    }

    if (!data) {
      console.warn("⚠️ [UPDATE] Nenhum registro encontrado após UPDATE");
      throw new Error("Nenhum registro encontrado - RLS ou ID inválido");
    }

    const response = mapAppointmentFromDatabase(data);
    console.log("✅ [UPDATE] Sucesso:", response.id);
    Sentry.captureMessage("Agendamento atualizado", "info", { tags: { action: "update_appointment" } });
    return response;
  } catch (err) {
    console.error("❌ [UPDATE] Erro:", err.message);
    Sentry.captureException(err, { tags: { action: "update_appointment_error" } });
    throw err;
  }
}

/**
 * DELETAR AGENDAMENTO
 */
export async function deletarAgendamento(agendamentoId, clinicId) {
  try {
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    if (!agendamentoId) throw new Error("ID do agendamento é obrigatório");
    validateClinicId(clinicId);

    console.log("🗑️ [DELETE] Agendamento:", { agendamentoId, clinicId, userId: user.id });

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", agendamentoId)
      .eq("clinic_id", clinicId);

    if (error) throw error;
    console.log("✅ [DELETE] Sucesso:", agendamentoId);
    Sentry.captureMessage("Agendamento deletado", "info", { tags: { action: "delete_appointment" } });
    return { success: true };
  } catch (err) {
    console.error("❌ [DELETE] Erro:", err.message);
    Sentry.captureException(err, { tags: { action: "delete_appointment_error" } });
    throw err;
  }
}
