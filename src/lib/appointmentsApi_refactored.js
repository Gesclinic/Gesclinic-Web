// src/lib/appointmentsApi.js
import { supabase } from '@/lib/customSupabaseClient';
import { logAppointmentAudit, AUDIT_ACTION_TYPES, logStatusChange } from '@/lib/auditApi';
import { migrateStatus } from '@/lib/appointmentStatusConstants';

// Import financial integration for auto-triggers
import { finalizeAppointmentWithFinancials } from '@/lib/appointmentFinancialIntegrationApi';

// ============================================================
// MAPPER: Frontend → Banco de Dados
// ============================================================
/**
 * Mapeia payload do frontend para formato correto do banco de dados
 *
 * Frontend usa:  date, startTime, endTime, clinicId, patientId, etc
 * Banco usa:     scheduled_date, scheduled_time, end_time, clinic_id, patient_id, etc
 *
 * @param {Object} payload - Dados vindos do frontend
 * @returns {Object} Dados formatados para o banco
 */
function mapToDatabase(payload) {
  // Helper: normalizar UUID (converter strings vazias em null)
  const normalizeUUID = (val) => (val === '' || val === undefined ? null : val);

  // Helper: extrair data (YYYY-MM-DD)
  const extractDate = (dateStr) => {
    if (!dateStr) {
      return null;
    }
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  // Helper: extrair hora (HH:MM:SS)
  const extractTime = (timeStr) => {
    if (!timeStr) {
      return null;
    }
    try {
      // Se já é HH:MM ou HH:MM:SS, retornar como está
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
        return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
      }
      // Se é ISO, extrair a parte de hora
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {
        return null;
      }
      const isoStr = date.toISOString();
      return isoStr.split('T')[1].substring(0, 8); // HH:MM:SS
    } catch {
      return null;
    }
  };

  return {
    id: payload.id || undefined,
    clinic_id: payload.clinicId,
    patient_id: normalizeUUID(payload.patientId),
    professional_id: normalizeUUID(payload.professionalId),
    service_id: normalizeUUID(payload.serviceId),
    room_id: normalizeUUID(payload.roomId || payload.salaId),
    payer_id: normalizeUUID(payload.payerId || payload.convenioId),
    plan_id: normalizeUUID(payload.planId || payload.planoId),

    // ✅ MAPEAMENTO CRÍTICO: Frontend → Banco
    scheduled_date: extractDate(payload.date),
    scheduled_time: extractTime(payload.startTime),
    end_time: extractTime(payload.endTime),

    status: payload.status || 'scheduled',
    notes: payload.notes || payload.observacoes || null,
    value: payload.value || 0,
    duration: payload.duration || null,
    discount: payload.discount || 0,
    discount_reason: payload.discount_reason || null,
    discount_authorized_by: payload.discount_authorized_by || null,
    discount_authorized_at: payload.discount_authorized_at || null,
    discount_observation: payload.discount_observation || null,

    // Lead/Paciente
    patient_type: payload.patient_type || 'PATIENT',
    lead_name: payload.lead_name || null,
    lead_phone: payload.lead_phone || null,
    lead_mobile: payload.lead_mobile || null,
    patient_name: payload.patient_name || null,
    patient_cpf: payload.patient_cpf || null,
    patient_phone: payload.patient_phone || null,

    // Cartão/Seguro
    card_number: payload.card_number || null,
    insurance_card_verified: payload.insurance_card_verified || false,
    authorization_number: payload.authorization_number || null,
    authorization_date: payload.authorization_date || null,
    authorization_verified: payload.authorization_verified || false,
    authorization_expiry: payload.authorization_expiry || null,

    // Guia/Faturamento
    guide_number: payload.guide_number || null,
    guide_generated: payload.guide_generated || false,
    payment_method: payload.payment_method || null,
    payment_status: payload.payment_status || null,
    billing_data: payload.billing_data || null,
    billing_notes: payload.billing_notes || null,
    billing_xml: payload.billing_xml || null,

    // Outros
    agenda_rule_id: normalizeUUID(payload.agenda_rule_id),
    payer_name: payload.payer_name || null,

    // Timestamp (será ignorado no INSERT, atualizado no UPDATE)
    updated_at: payload.updated_at || new Date().toISOString(),
  };
}

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
  console.log('[listAppointments] Input params:', {
    clinicId,
    start,
    end,
    professionalId,
    roomId,
    status,
    userRole,
    userProfessionalId,
  });

  if (!clinicId) {
    console.warn('[listAppointments] Missing clinicId');
    return [];
  }

  // ðŸ”’ REGRA DE PERMISSÃƒO: Se for profissional, sÃ³ pode ver sua prÃ³pria agenda
  let effectiveProfessionalId = professionalId;
  if (userRole === 'profissional' && userProfessionalId) {
    console.log(`ðŸ”’ [RBAC] Profissional detectado. ForÃ§ando filtro para: ${userProfessionalId}`);
    console.log(`   (Tentativa de acesso a: ${professionalId} foi ignorada)`);
    effectiveProfessionalId = userProfessionalId;
  } else if (userRole === 'profissional' && !userProfessionalId) {
    console.warn('âš ï¸ [RBAC] Profissional sem userProfessionalId! NÃ£o filtrando!');
  }

  console.log('[listAppointments] effectiveProfessionalId:', effectiveProfessionalId);

  let query = supabase
    .from('appointments')
    .select(
      `
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
    `,
    )
    .eq('clinic_id', clinicId)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  // Convert ISO strings to YYYY-MM-DD format for DATE column comparison
  if (start) {
    const startDate = new Date(start).toISOString().split('T')[0];
    console.log('[listAppointments] startDate filter:', startDate);
    query = query.gte('scheduled_date', startDate);
  }
  if (end) {
    const endDate = new Date(end).toISOString().split('T')[0];
    console.log('[listAppointments] endDate filter:', endDate);
    query = query.lte('scheduled_date', endDate);
  }
  if (effectiveProfessionalId) {
    console.log('[listAppointments] Applying professional_id filter:', effectiveProfessionalId);
    query = query.eq('professional_id', effectiveProfessionalId);
  } else {
    console.warn('[listAppointments] âš ï¸ NO professional_id filter applied!');
  }
  if (roomId) {
    query = query.eq('room_id', roomId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('âŒ Erro ao buscar agendamentos:', error);
    return [];
  }

  console.log('[listAppointments] Raw data from DB:', data);

  const result = (data ?? []).map((apt) => ({
    ...apt,
    // âœ… NORMALIZAR STATUS: converter status antigos para novos
    status: migrateStatus(apt.status),
    // Usar nome do paciente ou nome do lead (prÃ©-paciente)
    patient_name: apt.patients?.name || apt.lead_name || null,
    professional_name: apt.professionals?.name || null,
    service_name: apt.services?.name || null,
    room_name: apt.rooms?.name || null,
    // ðŸ”§ Mostrar nome do convÃªnio apenas se estiver ativo
    payer_name:
      apt.payers?.active === false
        ? null
        : apt.payers?.name || (apt.payer_id ? null : 'Particular'),
    // ðŸ”§ Mostrar nome do plano
    plan_name: apt.plans?.name || null,
    // ðŸ”§ Mostrar cÃ³digo do plano
    plan_code: apt.plans?.code || null,
    // Adicionar dados do paciente para ediÃ§Ã£o
    patient_cpf: apt.patients?.document_id || null,
    patient_phone: apt.patients?.phone || null,
    patient_mobile: apt.patients?.cell_phone || null,
    // ðŸ†• Adicionar prontuÃ¡rio do paciente
    patient_prontuario: apt.patients?.prontuario_numero || null,
  }));

  // DEBUG ESPECIAL: Procurar por Marcia
  const marcia = result.find((apt) => apt.patient_name?.includes('Marcia'));
  if (marcia) {
    console.log('âœ… [listAppointments] Marcia encontrado:', {
      data: marcia.scheduled_date,
      time: marcia.scheduled_time,
      profId: marcia.professional_id,
      profName: marcia.professional_name,
    });
  } else {
    console.log(
      `âŒ [listAppointments] Marcia NÃƒO encontrado! Total de agendamentos: ${result.length}`,
    );
  }

  console.log(
    `âœ… Carregados ${result.length} agendamentos para ${clinicId}. Professional filter was: ${effectiveProfessionalId}`,
  );

  if (userRole === 'profissional' && effectiveProfessionalId) {
    console.log(
      `ðŸ” Professional view - returned ${result.length} appointments for professional ${effectiveProfessionalId}`,
    );
    // Show first 3 appointments for debugging
    result.slice(0, 3).forEach((apt, idx) => {
      console.log(
        `  Apt ${idx + 1}: professional_id=${apt.professional_id}, patient=${apt.patient_name}, time=${apt.scheduled_time}`,
      );
    });
  } else if (userRole === 'profissional' && !effectiveProfessionalId) {
    console.error(
      `ðŸ”´ Professional filter NOT applied! effectiveProfessionalId=${effectiveProfessionalId}`,
    );
  }

  return result;
}

/**
 * Criar novo agendamento
 */
export async function createAppointment(data) {
  // clinic_id Ã© obrigatÃ³rio sempre
  // patient_id pode ser nulo para prÃ©-pacientes (agendamento rÃ¡pido)
  if (!data.clinic_id) {
    throw new Error('clinic_id Ã© obrigatÃ³rio');
  }

  try {
    // Validar payer_id se fornecido
    let validPayerId = data.payer_id;
    if (validPayerId) {
      const { data: payer, error: payerError } = await supabase
        .from('payers')
        .select('id')
        .eq('id', validPayerId)
        .maybeSingle();

      if (payerError || !payer) {
        console.warn(`Payer ID ${validPayerId} nÃ£o encontrado. Salvando como particular.`);
        validPayerId = null;
      }
    }

    // Usar scheduled_date e scheduled_time direto (jÃ¡ vÃªm formatados corretamente)
    // ou fazer parsing se start_time vier em formato ISO
    let scheduledDate = data.scheduled_date;
    let scheduledTime = data.scheduled_time;
    const endTime = data.end_time && data.end_time.trim() ? data.end_time : null;

    if (!scheduledDate && data.start_time) {
      // Fallback: parsear start_time se scheduled_date nÃ£o for fornecido
      try {
        const startDateTime = new Date(data.start_time);
        if (isNaN(startDateTime.getTime())) {
          throw new Error(`Data invÃ¡lida: ${data.start_time}`);
        }
        scheduledDate = startDateTime.toISOString().split('T')[0];
        const timeStr = startDateTime.toISOString().split('T')[1];
        scheduledTime = timeStr.substring(0, 8);
      } catch (err) {
        console.error('Erro ao parsear start_time:', data.start_time, err);
        throw new Error(`Data/hora invÃ¡lida: ${data.start_time}`);
      }
    }

    console.log('âœ… Criando agendamento:', {
      scheduledDate,
      scheduledTime,
      endTime,
      clinic_id: data.clinic_id,
    });

    // Normalizar campos UUID: converter strings vazias em null
    const normalizeUUID = (val) => {
      return val === '' || val === undefined ? null : val;
    };

    const { data: result, error } = await supabase
      .from('appointments')
      .insert([
        {
          clinic_id: data.clinic_id,
          patient_id: normalizeUUID(data.patient_id),
          patient_type: data.patient_type || 'PATIENT',
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
          status: data.status || 'scheduled',
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
      console.error('âŒ Erro ao criar agendamento:', error);
      throw new Error(`Falha ao criar agendamento: ${error.message}`);
    }

    console.log('âœ… Agendamento criado com sucesso:', result.id);

    // Log de auditoria: Agendamento criado
    logAppointmentAudit({
      appointmentId: result.id,
      actionType: AUDIT_ACTION_TYPES.APPOINTMENT_CREATED,
      newStatus: result.status,
      context: {
        patient_type: data.patient_type || 'PATIENT',
        professional_id: data.professional_id,
        room_id: data.room_id,
        service_id: data.service_id,
      },
    }).catch((err) => console.warn('Erro ao logar auditoria:', err));

    return result;
  } catch (err) {
    console.error('âŒ Erro inesperado em createAppointment:', err.message || err);
    throw err;
  }
}

/**
 * Atualizar agendamento existente
 */
export async function updateAppointment(id, updates) {
  if (!id) {
    throw new Error('ID do agendamento Ã© obrigatÃ³rio');
  }

  try {
    // Buscar status anterior e updated_at atual para validaÃ§Ã£o de concorrÃªncia
    const { data: current, error: fetchError } = await supabase
      .from('appointments')
      .select('status, updated_at')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar agendamento:', fetchError);
      throw new Error('Falha ao buscar agendamento');
    }

    const oldStatus = current?.status;
    const currentUpdatedAt = current?.updated_at;

    // Validar conflito de concorrÃªncia: se updated_at no payload Ã© diferente do BD
    if (updates.updated_at && updates.updated_at !== currentUpdatedAt) {
      console.warn(
        'âš ï¸ [CONCURRENCY] Conflito detectado - agendamento foi alterado por outro usuÃ¡rio',
      );
      const error = new Error('Este agendamento foi atualizado por outro usuÃ¡rio');
      error.code = 'conflict_detected';
      error.details = {
        current_updated_at: currentUpdatedAt,
        expected_updated_at: updates.updated_at,
      };
      throw error;
    }

    // Parse start_time e end_time para scheduled_date e scheduled_time se fornecido
    const updateData = { ...updates };

    // Normalizar campos UUID: converter strings vazias em null
    const uuidFields = [
      'professional_id',
      'service_id',
      'room_id',
      'payer_id',
      'patient_id',
      'agenda_rule_id',
    ];

    uuidFields.forEach((field) => {
      if (updateData[field] === '') {
        updateData[field] = null;
      }
    });

    if (updates.start_time) {
      const startDateTime = new Date(updates.start_time);
      if (isNaN(startDateTime.getTime())) {
        throw new Error(`Data/hora de inÃ­cio invÃ¡lida: ${updates.start_time}`);
      }
      updateData.scheduled_date = startDateTime.toISOString().split('T')[0];
      const timeStr = startDateTime.toISOString().split('T')[1];
      updateData.scheduled_time = timeStr.substring(0, 8);
      delete updateData.start_time; // Remove campo que nÃ£o existe
    }

    if (updates.end_time && updates.end_time.trim()) {
      const endDateTime = new Date(updates.end_time);
      if (isNaN(endDateTime.getTime())) {
        console.warn(`Aviso: end_time invÃ¡lido, ignorando: ${updates.end_time}`);
      } else {
        const timeStr = endDateTime.toISOString().split('T')[1];
        updateData.end_time = timeStr.substring(0, 8);
      }
    }

    // Remover updated_at do updateData (serÃ¡ gerenciado pelo trigger do BD)
    delete updateData.updated_at;

    // Preparar payload para a RPC (remover campos internos)
    const rpcPayload = JSON.stringify(updateData);

    // Chamar funÃ§Ã£o RPC segura com validaÃ§Ã£o de concorrÃªncia
    const { data: rpcResult, error: rpcError } = await supabase.rpc('update_appointment_safe', {
      p_appointment_id: id,
      p_updated_at: currentUpdatedAt,
      p_payload: JSON.parse(rpcPayload),
    });

    if (rpcError) {
      console.error('âŒ Erro RPC ao atualizar agendamento:', JSON.stringify(rpcError, null, 2));
      throw new Error(
        'Falha ao atualizar agendamento: ' + (rpcError.message || 'Erro desconhecido'),
      );
    }

    // Verificar resultado da RPC
    if (!rpcResult.success) {
      const error = new Error(rpcResult.message);
      error.code = rpcResult.error;
      error.details = {
        current_updated_at: rpcResult.current_updated_at,
        expected_updated_at: rpcResult.expected_updated_at,
      };
      throw error;
    }

    console.log('âœ… [CONCURRENCY] Agendamento atualizado com sucesso');

    // Buscar registro atualizado para retornar
    const { data: result, error: selectError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (selectError) {
      console.error('Erro ao buscar agendamento atualizado:', selectError);
      throw new Error('Agendamento atualizado, mas nÃ£o foi possÃ­vel recuperar os dados');
    }

    // Log de auditoria: Se status mudou
    if (updates.status && updates.status !== oldStatus) {
      console.log(`ðŸ“ Status mudou: ${oldStatus} â†’ ${updates.status}`);

      // ðŸš€ BLOCKER 1 FIX: Auto-trigger financial processing when appointment is finalized
      if (
        updates.status === 'finalizado' ||
        updates.status === 'completed' ||
        updates.status === 'finished'
      ) {
        console.log(
          'âš¡ [AUTO-TRIGGER] Appointment finalizado - iniciando processamento financeiro...',
        );
        try {
          setTimeout(async () => {
            await finalizeAppointmentWithFinancials(id);
            console.log('âœ… [AUTO-TRIGGER] Processamento financeiro concluÃ­do');
          }, 100);
        } catch (finErr) {
          console.warn('âš ï¸ [AUTO-TRIGGER] Erro ao processar financeiro:', finErr.message);
        }
      }
    }

    console.log('âœ… [UPDATE Result]:', JSON.stringify(result, null, 2));

    return result;
  } catch (err) {
    console.error('Erro inesperado:', err);
    throw err;
  }
}

/**
 * Deletar agendamento
 */
export async function deleteAppointment(id) {
  if (!id) {
    throw new Error('ID do agendamento Ã© obrigatÃ³rio');
  }

  try {
    // ðŸš€ BLOCKER 4 FIX: Cascade delete financial records first
    console.log('ðŸ”„ [DELETE] Limpando registros financeiros associados...');

    // Delete ar_receivables (cascade FK will delete medical_production â†’ medical_repasse)
    const { error: arError } = await supabase
      .from('ar_receivables')
      .delete()
      .eq('appointment_id', id);

    if (arError && arError.code !== 'PGRST116') {
      // PGRST116 = no rows deleted
      console.warn('âš ï¸ Erro ao deletar AR:', arError);
    } else {
      console.log('âœ… AR e registros financeiros deletados (cascade)');
    }

    // Delete billing_guides (cascade FK added 2026-04-09)
    const { error: guidesError } = await supabase
      .from('billing_guides')
      .delete()
      .eq('appointment_id', id);

    if (guidesError && guidesError.code !== 'PGRST116') {
      console.warn('âš ï¸ Erro ao deletar guias:', guidesError);
    } else {
      console.log('âœ… Guias de faturamento deletadas');
    }

    // Now delete the appointment
    const { error } = await supabase.from('appointments').delete().eq('id', id);

    if (error) {
      console.error('Erro ao deletar agendamento:', error);
      throw new Error('Falha ao deletar agendamento');
    }

    console.log('âœ… Agendamento deletado com sucesso');
    return true;
  } catch (err) {
    console.error('Erro inesperado:', err);
    throw err;
  }
}
