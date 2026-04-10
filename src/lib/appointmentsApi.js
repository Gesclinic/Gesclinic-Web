// src/lib/appointmentsApi.js
import { supabase } from "@/lib/customSupabaseClient";
import { logAppointmentAudit, AUDIT_ACTION_TYPES, logStatusChange } from "@/lib/auditApi";
import { migrateStatus } from "@/lib/appointmentStatusConstants";

// Import financial integration for auto-triggers
import { finalizeAppointmentWithFinancials } from "@/lib/appointmentFinancialIntegrationApi";

export async function listAppointments({
  clinicId,
  start,
  end,
  professionalId = null,
  roomId = null,
  status = null,
  userRole = null,
  userProfessionalId = null,
}) {
  console.log('[listAppointments] Input params:', { clinicId, start, end, professionalId, roomId, status, userRole, userProfessionalId });
  
  if (!clinicId) {
    console.warn('[listAppointments] Missing clinicId');
    return [];
  }

  // 🔒 REGRA DE PERMISSÃO: Se for profissional, só pode ver sua própria agenda
  let effectiveProfessionalId = professionalId;
  if (userRole === 'profissional' && userProfessionalId) {
    console.log(`🔒 [RBAC] Profissional detectado. Forçando filtro para: ${userProfessionalId}`);
    console.log(`   (Tentativa de acesso a: ${professionalId} foi ignorada)`);
    effectiveProfessionalId = userProfessionalId;
  } else if (userRole === 'profissional' && !userProfessionalId) {
    console.warn(`⚠️ [RBAC] Profissional sem userProfessionalId! Não filtrando!`);
  }

  console.log('[listAppointments] effectiveProfessionalId:', effectiveProfessionalId);

  let query = supabase
    .from("appointments")
    .select(`
      id,
      clinic_id,
      patient_id,
      professional_id,
      service_id,
      room_id,
      payer_id,
      plan_id,
      scheduled_date,
      scheduled_time,
      end_time,
      status,
      notes,
      value,
      duration,
      discount,
      discount_reason,
      discount_authorized_by,
      discount_authorized_at,
      discount_observation,
      patient_type,
      lead_name,
      lead_phone,
      lead_mobile,
      patient_name,
      patient_cpf,
      patient_phone,
      card_number,
      insurance_card_verified,
      authorization_number,
      authorization_date,
      authorization_verified,
      authorization_expiry,
      guide_number,
      guide_generated,
      payment_method,
      payment_status,
      billing_data,
      billing_notes,
      billing_xml,
      convenio_id,
      plano_contas_id,
      agenda_rule_id,
      created_at,
      updated_at,
      patients:patient_id(id, name, document_id, phone, cell_phone, prontuario_numero, photo_url),
      professionals:professional_id(id, name),
      services:service_id(id, name, code, tuss_code),
      rooms:room_id(id, name),
      payers:payer_id(id, name, active),
      plans:plan_id(id, name, code)
    `)
    .eq("clinic_id", clinicId)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  // Convert ISO strings to YYYY-MM-DD format for DATE column comparison
  if (start) {
    const startDate = new Date(start).toISOString().split('T')[0];
    console.log('[listAppointments] startDate filter:', startDate);
    query = query.gte("scheduled_date", startDate);
  }
  if (end) {
    const endDate = new Date(end).toISOString().split('T')[0];
    console.log('[listAppointments] endDate filter:', endDate);
    query = query.lte("scheduled_date", endDate);
  }
  if (effectiveProfessionalId) {
    console.log('[listAppointments] Applying professional_id filter:', effectiveProfessionalId);
    query = query.eq("professional_id", effectiveProfessionalId);
  } else {
    console.warn('[listAppointments] ⚠️ NO professional_id filter applied!');
  }
  if (roomId) query = query.eq("room_id", roomId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    console.error("❌ Erro ao buscar agendamentos:", error);
    return [];
  }

  console.log('[listAppointments] Raw data from DB:', data);

  const result = (data ?? []).map(apt => ({
    ...apt,
    // ✅ NORMALIZAR STATUS: converter status antigos para novos
    status: migrateStatus(apt.status),
    // Usar nome do paciente ou nome do lead (pré-paciente)
    patient_name: apt.patients?.name || apt.lead_name || null,
    professional_name: apt.professionals?.name || null,
    service_name: apt.services?.name || null,
    room_name: apt.rooms?.name || null,
    // 🔧 Mostrar nome do convênio apenas se estiver ativo
    payer_name: apt.payers?.active === false ? null : (apt.payers?.name || (apt.payer_id ? null : 'Particular')),
    // 🔧 Mostrar nome do plano
    plan_name: apt.plans?.name || null,
    // 🔧 Mostrar código do plano
    plan_code: apt.plans?.code || null,
    // Adicionar dados do paciente para edição
    patient_cpf: apt.patients?.document_id || null,
    patient_phone: apt.patients?.phone || null,
    patient_mobile: apt.patients?.cell_phone || null,
    // 🆕 Adicionar prontuário do paciente
    patient_prontuario: apt.patients?.prontuario_numero || null,
  }));

  // DEBUG ESPECIAL: Procurar por Marcia
  const marcia = result.find(apt => apt.patient_name?.includes('Marcia'));
  if (marcia) {
    console.log(`✅ [listAppointments] Marcia encontrado:`, {
      data: marcia.scheduled_date,
      time: marcia.scheduled_time,
      profId: marcia.professional_id,
      profName: marcia.professional_name
    });
  } else {
    console.log(`❌ [listAppointments] Marcia NÃO encontrado! Total de agendamentos: ${result.length}`);
  }

  console.log(`✅ Carregados ${result.length} agendamentos para ${clinicId}. Professional filter was: ${effectiveProfessionalId}`);
  
  if (userRole === 'profissional' && effectiveProfessionalId) {
    console.log(`🔍 Professional view - returned ${result.length} appointments for professional ${effectiveProfessionalId}`);
    // Show first 3 appointments for debugging
    result.slice(0, 3).forEach((apt, idx) => {
      console.log(`  Apt ${idx + 1}: professional_id=${apt.professional_id}, patient=${apt.patient_name}, time=${apt.scheduled_time}`);
    });
  } else if (userRole === 'profissional' && !effectiveProfessionalId) {
    console.error(`🔴 Professional filter NOT applied! effectiveProfessionalId=${effectiveProfessionalId}`);
  }
  
  return result;
}

/**
 * Criar novo agendamento
 */
export async function createAppointment(data) {
  // clinic_id é obrigatório sempre
  // patient_id pode ser nulo para pré-pacientes (agendamento rápido)
  if (!data.clinic_id) {
    throw new Error("clinic_id é obrigatório");
  }

  try {
    // Validar payer_id se fornecido
    let validPayerId = data.payer_id;
    if (validPayerId) {
      const { data: payer, error: payerError } = await supabase
        .from("payers")
        .select("id")
        .eq("id", validPayerId)
        .maybeSingle();
      
      if (payerError || !payer) {
        console.warn(`Payer ID ${validPayerId} não encontrado. Salvando como particular.`);
        validPayerId = null;
      }
    }

    // Usar scheduled_date e scheduled_time direto (já vêm formatados corretamente)
    // ou fazer parsing se start_time vier em formato ISO
    let scheduledDate = data.scheduled_date;
    let scheduledTime = data.scheduled_time;
    let endTime = data.end_time && data.end_time.trim() ? data.end_time : null;

    if (!scheduledDate && data.start_time) {
      // Fallback: parsear start_time se scheduled_date não for fornecido
      try {
        const startDateTime = new Date(data.start_time);
        if (isNaN(startDateTime.getTime())) {
          throw new Error(`Data inválida: ${data.start_time}`);
        }
        scheduledDate = startDateTime.toISOString().split('T')[0];
        const timeStr = startDateTime.toISOString().split('T')[1];
        scheduledTime = timeStr.substring(0, 8);
      } catch (err) {
        console.error('Erro ao parsear start_time:', data.start_time, err);
        throw new Error(`Data/hora inválida: ${data.start_time}`);
      }
    }

    console.log('✅ Criando agendamento:', { scheduledDate, scheduledTime, endTime, clinic_id: data.clinic_id });

    // Normalizar campos UUID: converter strings vazias em null
    const normalizeUUID = (val) => {
      return (val === '' || val === undefined) ? null : val;
    };

    const { data: result, error } = await supabase
      .from("appointments")
      .insert([
        {
          clinic_id: data.clinic_id,
          patient_id: normalizeUUID(data.patient_id),
          patient_type: data.patient_type || "PATIENT",
          lead_name: data.lead_name || null,
          lead_phone: data.lead_phone || null,
          lead_mobile: data.lead_mobile || null,
          professional_id: normalizeUUID(data.professional_id),
          room_id: normalizeUUID(data.room_id),
          service_id: normalizeUUID(data.service_id),
          payer_id: normalizeUUID(validPayerId),
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          end_time: endTime,
          status: data.status || "scheduled",
          notes: data.notes || null,
          value: data.value || null,
          duration: data.duration || null,
          discount: data.discount || 0,
          discount_reason: data.discount_reason || null,
          discount_authorized_by: data.discount_authorized_by || null,
          discount_authorized_at: data.discount_authorized_at || null,
          discount_observation: data.discount_observation || null,
          patient_name: data.patient_name || null,
          patient_cpf: data.patient_cpf || null,
          patient_phone: data.patient_phone || null,
          card_number: data.card_number || null,
          insurance_card_verified: data.insurance_card_verified || false,
          authorization_number: data.authorization_number || null,
          authorization_date: data.authorization_date || null,
          authorization_verified: data.authorization_verified || false,
          authorization_expiry: data.authorization_expiry || null,
          guide_number: data.guide_number || null,
          guide_generated: data.guide_generated || false,
          payment_method: data.payment_method || null,
          payment_status: data.payment_status || null,
          payer_name: data.payer_name || null,
          agenda_rule_id: normalizeUUID(data.agenda_rule_id),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao criar agendamento:", error);
      throw new Error(`Falha ao criar agendamento: ${error.message}`);
    }

    console.log("✅ Agendamento criado com sucesso:", result.id);

    // Log de auditoria: Agendamento criado
    logAppointmentAudit({
      appointmentId: result.id,
      actionType: AUDIT_ACTION_TYPES.APPOINTMENT_CREATED,
      newStatus: result.status,
      context: {
        patient_type: data.patient_type || "PATIENT",
        professional_id: data.professional_id,
        room_id: data.room_id,
        service_id: data.service_id,
      },
    }).catch(err => console.warn("Erro ao logar auditoria:", err));

    return result;
  } catch (err) {
    console.error("❌ Erro inesperado em createAppointment:", err.message || err);
    throw err;
  }
}

/**
 * Atualizar agendamento existente
 */
export async function updateAppointment(id, updates) {
  if (!id) {
    throw new Error("ID do agendamento é obrigatório");
  }

  try {
    // Buscar status anterior para auditoria
    const { data: current, error: fetchError } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Erro ao buscar agendamento:", fetchError);
      throw new Error("Falha ao buscar agendamento");
    }

    const oldStatus = current?.status;

    // Parse start_time e end_time para scheduled_date e scheduled_time se fornecido
    const updateData = { ...updates };

    // Normalizar campos UUID: converter strings vazias em null
    const uuidFields = [
      'professional_id',
      'service_id',
      'room_id',
      'payer_id',
      'patient_id',
      'agenda_rule_id'
    ];
    
    uuidFields.forEach(field => {
      if (updateData[field] === '') {
        updateData[field] = null;
      }
    });

    if (updates.start_time) {
      const startDateTime = new Date(updates.start_time);
      if (isNaN(startDateTime.getTime())) {
        throw new Error(`Data/hora de início inválida: ${updates.start_time}`);
      }
      updateData.scheduled_date = startDateTime.toISOString().split('T')[0];
      const timeStr = startDateTime.toISOString().split('T')[1];
      updateData.scheduled_time = timeStr.substring(0, 8);
      delete updateData.start_time; // Remove campo que não existe
    }

    if (updates.end_time && updates.end_time.trim()) {
      const endDateTime = new Date(updates.end_time);
      if (isNaN(endDateTime.getTime())) {
        console.warn(`Aviso: end_time inválido, ignorando: ${updates.end_time}`);
      } else {
        const timeStr = endDateTime.toISOString().split('T')[1];
        updateData.end_time = timeStr.substring(0, 8);
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: result, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("❌ Erro ao atualizar agendamento:", JSON.stringify(error, null, 2));
      console.error("🔍 [DEBUG RLS] Error details:", error.message, error.code);
      throw new Error("Falha ao atualizar agendamento: " + (error.message || 'Erro desconhecido'));
    }

    // Log de auditoria: Se status mudou
    if (updates.status && updates.status !== oldStatus) {
      console.log(`📝 Status mudou: ${oldStatus} → ${updates.status}`);
      console.log(`🔍 [DEBUG RLS] Verificando se UPDATE funcionou. ID: ${id}, Novo status no BD: ${result?.status}`);

      // 🚀 BLOCKER 1 FIX: Auto-trigger financial processing when appointment is finalized
      if (updates.status === 'finalizado' || updates.status === 'completed' || updates.status === 'finished') {
        console.log('⚡ [AUTO-TRIGGER] Appointment finalizado - iniciando processamento financeiro...');
        try {
          setTimeout(async () => {
            await finalizeAppointmentWithFinancials(id);
            console.log('✅ [AUTO-TRIGGER] Processamento financeiro concluído');
          }, 100);
        } catch (finErr) {
          console.warn('⚠️ [AUTO-TRIGGER] Erro ao processar financeiro:', finErr.message);
        }
      }
    }

    console.log('✅ [UPDATE Result]:', JSON.stringify(result, null, 2));

    // Retornar o primeiro item do array ou o objeto de retorno
    return (Array.isArray(result) && result.length > 0) ? result[0] : result;
  } catch (err) {
    console.error("Erro inesperado:", err);
    throw err;
  }
}

/**
 * Deletar agendamento
 */
export async function deleteAppointment(id) {
  if (!id) {
    throw new Error("ID do agendamento é obrigatório");
  }

  try {
    // 🚀 BLOCKER 4 FIX: Cascade delete financial records first
    console.log('🔄 [DELETE] Limpando registros financeiros associados...');
    
    // Delete ar_receivables (cascade FK will delete medical_production → medical_repasse)
    const { error: arError } = await supabase
      .from('ar_receivables')
      .delete()
      .eq('appointment_id', id);
    
    if (arError && arError.code !== 'PGRST116') { // PGRST116 = no rows deleted
      console.warn('⚠️ Erro ao deletar AR:', arError);
    } else {
      console.log('✅ AR e registros financeiros deletados (cascade)');
    }

    // Delete billing_guides (cascade FK added 2026-04-09)
    const { error: guidesError } = await supabase
      .from('billing_guides')
      .delete()
      .eq('appointment_id', id);
    
    if (guidesError && guidesError.code !== 'PGRST116') {
      console.warn('⚠️ Erro ao deletar guias:', guidesError);
    } else {
      console.log('✅ Guias de faturamento deletadas');
    }

    // Now delete the appointment
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao deletar agendamento:", error);
      throw new Error("Falha ao deletar agendamento");
    }

    console.log('✅ Agendamento deletado com sucesso');
    return true;
  } catch (err) {
    console.error("Erro inesperado:", err);
    throw err;
  }
}
