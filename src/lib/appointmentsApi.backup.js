// src/lib/appointmentsApi.js
import { supabase } from "@/lib/customSupabaseClient";
import { logAppointmentAudit, AUDIT_ACTION_TYPES, logStatusChange } from "@/lib/auditApi";
import { migrateStatus } from "@/lib/appointmentStatusConstants";

// Import financial integration for auto-triggers
import { finalizeAppointmentWithFinancials } from "@/lib/appointmentFinancialIntegrationApi";

// ============================================================
// HELPERS: Normalização e Transformação
// ============================================================

/**
 * Normaliza UUID: converte strings vazias e undefined em null
 * @param {string} val - Valor a normalizar
 * @returns {string|null} UUID ou null
 */
const normalizeUUID = (val) => (val === '' || val === undefined) ? null : val;

/**
 * Extrai data em formato YYYY-MM-DD
 * @param {string|Date} dateStr - Data como string ou Date
 * @returns {string|null} Data formatada ou null
 */
const extractDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

/**
 * Extrai hora em formato HH:MM:SS
 * @param {string|Date} timeStr - Hora como string ou Date
 * @returns {string|null} Hora formatada ou null
 */
const extractTime = (timeStr) => {
  if (!timeStr) return null;
  try {
    // Se já é HH:MM ou HH:MM:SS, retornar como está
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
      return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    }
    // Se é ISO, extrair a parte de hora
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return null;
    const isoStr = date.toISOString();
    return isoStr.split('T')[1].substring(0, 8); // HH:MM:SS
  } catch {
    return null;
  }
};

// ============================================================
// VALIDAÇÃO: Garantir dados válidos ANTES de salvar
// ============================================================

/**
 * Valida agendamento antes de salvar no banco
 * @param {Object} payload - Dados do agendamento
 * @throws {Error} Se alguma validação falhar
 */
function validateAppointment(payload) {
  // Validações obrigatórias
  if (!payload.clinicId && !payload.clinic_id) {
    throw new Error("❌ Clínica é obrigatória");
  }

  if (!payload.date && !payload.scheduled_date) {
    throw new Error("❌ Data do agendamento é obrigatória");
  }

  if (!payload.startTime && !payload.scheduled_time) {
    throw new Error("❌ Horário do agendamento é obrigatório");
  }

  // Validar data/hora se forem fornecidas
  if (payload.date) {
    const date = new Date(payload.date);
    if (isNaN(date.getTime())) {
      throw new Error("❌ Data inválida");
    }
  }

  if (payload.startTime) {
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(payload.startTime) && !payload.startTime.match(/T\d{2}:\d{2}/)) {
      throw new Error("❌ Horário em formato inválido (esperado HH:MM ou ISO)");
    }
  }

  // Validações de negócio
  if (payload.value !== undefined && payload.value < 0) {
    throw new Error("❌ Valor não pode ser negativo");
  }

  if (payload.discount !== undefined && payload.discount < 0) {
    throw new Error("❌ Desconto não pode ser negativo");
  }

  if (payload.duration !== undefined && payload.duration <= 0) {
    throw new Error("❌ Duração deve ser maior que zero");
  }

  return true;
}

// ============================================================
// MAPPER: Frontend → Banco de Dados
// ============================================================

/**
 * Mapeia payload do frontend para formato correto do banco de dados
 * 
 * REGRAS CRÍTICAS:
 * - ❌ NUNCA usar start_time (coluna não existe no banco)
 * - ✅ SEMPRE converter startTime → scheduled_time
 * - ✅ SEMPRE converter date → scheduled_date
 * - ✅ SEMPRE passar pelo mapper (nunca enviar payload direto)
 * 
 * Frontend usa:  date, startTime, endTime, clinicId, patientId, etc
 * Banco usa:     scheduled_date, scheduled_time, end_time, clinic_id, patient_id, etc
 * 
 * @param {Object} payload - Dados vindos do frontend
 * @returns {Object} Dados formatados para o banco
 * @throws {Error} Se payload for inválido
 */
function mapToDatabase(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error("Payload inválido - esperado objeto");
  }

  // Validar antes de mapear
  validateAppointment(payload);

  return {
    id: payload.id || undefined,
    clinic_id: payload.clinicId || payload.clinic_id,
    patient_id: normalizeUUID(payload.patientId || payload.patient_id),
    professional_id: normalizeUUID(payload.professionalId || payload.professional_id),
    service_id: normalizeUUID(payload.serviceId || payload.service_id),
    room_id: normalizeUUID(payload.roomId || payload.salaId || payload.room_id),
    payer_id: normalizeUUID(payload.payerId || payload.convenioId || payload.payer_id),
    plan_id: normalizeUUID(payload.planId || payload.planoId || payload.plan_id),
    
    // ✅ MAPEAMENTO CRÍTICO: Frontend → Banco
    // startTime → scheduled_time (formato HH:MM:SS)
    // date → scheduled_date (formato YYYY-MM-DD)
    // ❌ NUNCA usar start_time
    scheduled_date: extractDate(payload.date || payload.scheduled_date),
    scheduled_time: extractTime(payload.startTime || payload.scheduled_time),
    end_time: extractTime(payload.endTime || payload.end_time),
    
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
    agenda_rule_id: normalizeUUID(payload.agenda_rule_id || payload.agendaRuleId),
    payer_name: payload.payer_name || null,
    
    // Timestamp
    updated_at: payload.updated_at || new Date().toISOString(),
  };
}

// ============================================================
// MAPPER INVERSO: Banco de Dados → Frontend
// ============================================================

/**
 * Mapeia registro do banco para formato esperado pelo frontend
 * 
 * Conversão: Banco (snake_case) → Frontend (camelCase)
 * 
 * @param {Object} record - Registro vindo do banco de dados
 * @returns {Object} Dados formatados para o frontend
 */
function mapFromDatabase(record) {
  if (!record || typeof record !== 'object') {
    throw new Error("Registro inválido");
  }

  return {
    id: record.id,
    
    clinicId: record.clinic_id,
    patientId: record.patient_id,
    professionalId: record.professional_id,
    serviceId: record.service_id,
    roomId: record.room_id,
    payerId: record.payer_id,
    planId: record.plan_id,
    
    // ✅ MAPEAMENTO CRÍTICO: Banco → Frontend
    date: record.scheduled_date,
    startTime: record.scheduled_time,
    endTime: record.end_time,
    
    status: record.status,
    notes: record.notes,
    value: record.value,
    duration: record.duration,
    discount: record.discount,
    discount_reason: record.discount_reason,
    discount_authorized_by: record.discount_authorized_by,
    discount_authorized_at: record.discount_authorized_at,
    discount_observation: record.discount_observation,
    
    patient_type: record.patient_type,
    lead_name: record.lead_name,
    lead_phone: record.lead_phone,
    lead_mobile: record.lead_mobile,
    patient_name: record.patient_name,
    patient_cpf: record.patient_cpf,
    patient_phone: record.patient_phone,
    
    card_number: record.card_number,
    insurance_card_verified: record.insurance_card_verified,
    authorization_number: record.authorization_number,
    authorization_date: record.authorization_date,
    authorization_verified: record.authorization_verified,
    authorization_expiry: record.authorization_expiry,
    
    guide_number: record.guide_number,
    guide_generated: record.guide_generated,
    payment_method: record.payment_method,
    payment_status: record.payment_status,
    billing_data: record.billing_data,
    billing_notes: record.billing_notes,
    billing_xml: record.billing_xml,
    
    agendaRuleId: record.agenda_rule_id,
    payer_name: record.payer_name,
    
    created_at: record.created_at,
    updated_at: record.updated_at,
    
    // Dados relacionados (se virem junto na query)
    patient_name: record.patient_name || record.patients?.name,
    professional_name: record.professional_name || record.professionals?.name,
    service_name: record.service_name || record.services?.name,
    room_name: record.room_name || record.rooms?.name,
    payer_name: record.payer_name || record.payers?.name,
    plan_name: record.plan_name || record.plans?.name,
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
  console.log('[listAppointments] Input params:', { clinicId, start, end, professionalId, roomId, status, userRole, userProfessionalId });
  
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
    console.warn(`âš ï¸ [RBAC] Profissional sem userProfessionalId! NÃ£o filtrando!`);
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
    console.warn('[listAppointments] âš ï¸ NO professional_id filter applied!');
  }
  if (roomId) query = query.eq("room_id", roomId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    console.error("âŒ Erro ao buscar agendamentos:", error);
    return [];
  }

  console.log('[listAppointments] Raw data from DB:', data);

  const result = (data ?? []).map(apt => ({
    ...apt,
    // âœ… NORMALIZAR STATUS: converter status antigos para novos
    status: migrateStatus(apt.status),
    // Usar nome do paciente ou nome do lead (prÃ©-paciente)
    patient_name: apt.patients?.name || apt.lead_name || null,
    professional_name: apt.professionals?.name || null,
    service_name: apt.services?.name || null,
    room_name: apt.rooms?.name || null,
    // ðŸ”§ Mostrar nome do convÃªnio apenas se estiver ativo
    payer_name: apt.payers?.active === false ? null : (apt.payers?.name || (apt.payer_id ? null : 'Particular')),
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
  const marcia = result.find(apt => apt.patient_name?.includes('Marcia'));
  if (marcia) {
    console.log(`âœ… [listAppointments] Marcia encontrado:`, {
      data: marcia.scheduled_date,
      time: marcia.scheduled_time,
      profId: marcia.professional_id,
      profName: marcia.professional_name
    });
  } else {
    console.log(`âŒ [listAppointments] Marcia NÃƒO encontrado! Total de agendamentos: ${result.length}`);
  }

  console.log(`âœ… Carregados ${result.length} agendamentos para ${clinicId}. Professional filter was: ${effectiveProfessionalId}`);
  
  if (userRole === 'profissional' && effectiveProfessionalId) {
    console.log(`ðŸ” Professional view - returned ${result.length} appointments for professional ${effectiveProfessionalId}`);
    // Show first 3 appointments for debugging
    result.slice(0, 3).forEach((apt, idx) => {
      console.log(`  Apt ${idx + 1}: professional_id=${apt.professional_id}, patient=${apt.patient_name}, time=${apt.scheduled_time}`);
    });
  } else if (userRole === 'profissional' && !effectiveProfessionalId) {
    console.error(`ðŸ”´ Professional filter NOT applied! effectiveProfessionalId=${effectiveProfessionalId}`);
  }
  
  return result;
}

/**
 * Criar novo agendamento
 * 
 * FLUXO:
 * 1. Validar payload obrigatório
 * 2. Mapear para formato do banco via mapToDatabase()
 * 3. Inserir no banco
 * 4. Log de auditoria automático (via trigger)
 * 5. Retornar registro criado
 * 
 * @param {Object} data - Dados do agendamento
 * @returns {Object} Agendamento criado
 * @throws {Error} Se falhar na validação ou no banco
 */
export async function createAppointment(data) {
  try {
    // ✅ PASSO 1: Validar dados obrigatórios
    if (!data.clinicId && !data.clinic_id) {
      throw new Error("Clínica é obrigatória");
    }

    // ✅ PASSO 2: Mapear payload para formato do banco
    const dbPayload = mapToDatabase(data);

    console.log('[appointmentsApi.createAppointment] ✅ Criando agendamento:', {
      scheduled_date: dbPayload.scheduled_date,
      scheduled_time: dbPayload.scheduled_time,
      end_time: dbPayload.end_time,
      clinic_id: dbPayload.clinic_id,
      professional_id: dbPayload.professional_id,
    });

    // ✅ PASSO 3: Inserir no banco (NUNCA enviar payload direto)
    const { data: result, error } = await supabase
      .from("appointments")
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      console.error("[appointmentsApi.createAppointment] ❌ Erro ao criar:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });

      // Erro específico: coluna não existe (antiga bug com start_time)
      if (error.message?.includes("start_time")) {
        throw new Error("❌ ERRO CRÍTICO: Coluna 'start_time' não existe. Use 'startTime' no payload.");
      }

      throw new Error(`Falha ao criar agendamento: ${error.message}`);
    }

    console.log("[appointmentsApi.createAppointment] ✅ Agendamento criado:", result.id);

    // ✅ PASSO 4: Log de auditoria (via trigger do banco)
    logAppointmentAudit({
      appointmentId: result.id,
      actionType: AUDIT_ACTION_TYPES.APPOINTMENT_CREATED,
      newStatus: result.status,
      context: {
        patient_type: data.patient_type || "PATIENT",
        professional_id: data.professional_id || data.professionalId,
        room_id: data.room_id || data.salaId,
        service_id: data.service_id || data.serviceId,
      },
    }).catch(err => console.warn("[appointmentsApi.createAppointment] Aviso ao logar auditoria:", err));

    // ✅ PASSO 5: Retornar resultado
    return result;

  } catch (err) {
    console.error("[appointmentsApi.createAppointment] ❌ Erro inesperado:", err.message || err);
    throw err;
  }
}


/**
 * Atualizar agendamento existente
 * 
 * FLUXO (com controle de concorrência):
 * 1. Validar ID obrigatório
 * 2. Buscar versão atual (updated_at) para detectar conflitos
 * 3. Mapear updates para formato do banco
 * 4. Chamar RPC segura (update_appointment_safe) com validação de versão
 * 5. Log de auditoria automático (via trigger)
 * 6. Retornar registro atualizado
 * 
 * IMPORTANTE: Esta função garante que conflitos de concorrência sejam detectados
 * e rejeitados com erro.code = 'conflict_detected'
 * 
 * @param {string} id - ID do agendamento
 * @param {Object} updates - Dados a atualizar
 * @returns {Object} Agendamento atualizado
 * @throws {Error} Se ID for inválido, conflito de concorrência ou erro no banco
 */
export async function updateAppointment(id, updates) {
  if (!id) {
    throw new Error("ID do agendamento é obrigatório");
  }

  try {
    // ✅ PASSO 1: Buscar status anterior e versão atual para auditoria e concorrência
    const { data: current, error: fetchError } = await supabase
      .from("appointments")
      .select("status, updated_at")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("[appointmentsApi.updateAppointment] ❌ Erro ao buscar:", fetchError);
      throw new Error("Agendamento não encontrado");
    }

    const oldStatus = current?.status;
    const currentUpdatedAt = current?.updated_at;

    console.log('[appointmentsApi.updateAppointment] 📋 Estado atual:', {
      id,
      status: oldStatus,
      updated_at: currentUpdatedAt,
    });

    // ✅ PASSO 2: Validar conflito de concorrência
    if (updates.updated_at && updates.updated_at !== currentUpdatedAt) {
      console.warn("[appointmentsApi.updateAppointment] ⚠️ CONFLITO DE CONCORRÊNCIA:", {
        current_updated_at: currentUpdatedAt,
        expected_updated_at: updates.updated_at,
        message: "Outro usuário atualizou este agendamento",
      });
      
      const error = new Error("Este agendamento foi atualizado por outro usuário. Recarregue e tente novamente.");
      error.code = "conflict_detected";
      error.details = {
        current_updated_at: currentUpdatedAt,
        expected_updated_at: updates.updated_at,
      };
      throw error;
    }

    // ✅ PASSO 3: Mapear updates para formato do banco (NUNCA enviar direto)
    const dbPayload = mapToDatabase(updates);
    delete dbPayload.updated_at; // Será gerenciado pelo trigger

    console.log('[appointmentsApi.updateAppointment] 🔄 Payload mapeado:', {
      scheduled_date: dbPayload.scheduled_date,
      scheduled_time: dbPayload.scheduled_time,
      end_time: dbPayload.end_time,
      status: dbPayload.status,
    });

    // ✅ PASSO 4: Chamar RPC segura com validação de versão
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc("update_appointment_safe", {
        p_appointment_id: id,
        p_updated_at: currentUpdatedAt,
        p_payload: JSON.parse(JSON.stringify(dbPayload)),
      });

    if (rpcError) {
      console.error("[appointmentsApi.updateAppointment] ❌ Erro RPC:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
      });
      throw new Error(`Falha ao atualizar agendamento: ${rpcError.message}`);
    }

    // Validar resultado da RPC
    if (!rpcResult.success) {
      console.warn("[appointmentsApi.updateAppointment] ⚠️ RPC retornou falha:", {
        error_code: rpcResult.error,
        message: rpcResult.message,
      });

      const error = new Error(rpcResult.message || "Falha ao atualizar agendamento");
      error.code = rpcResult.error;
      error.details = {
        current_updated_at: rpcResult.current_updated_at,
        expected_updated_at: rpcResult.expected_updated_at,
      };
      throw error;
    }

    console.log("[appointmentsApi.updateAppointment] ✅ RPC executada com sucesso");

    // ✅ PASSO 5: Buscar registro atualizado para retornar
    const { data: result, error: selectError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (selectError) {
      console.error("[appointmentsApi.updateAppointment] ❌ Erro ao buscar resultado:", selectError);
      throw new Error("Agendamento atualizado, mas não foi possível recuperar os dados");
    }

    // ✅ PASSO 6: Se status mudou, processar eventos especiais
    if (updates.status && updates.status !== oldStatus) {
      console.log(`[appointmentsApi.updateAppointment] 📝 Status mudou: ${oldStatus} → ${updates.status}`);

      // Auto-trigger: Se finalizado, processar financeiro
      if (updates.status === 'finalizado' || updates.status === 'completed' || updates.status === 'finished') {
        console.log('[appointmentsApi.updateAppointment] ⚡ AUTO-TRIGGER: Processamento financeiro iniciado');
        try {
          setTimeout(async () => {
            await finalizeAppointmentWithFinancials(id);
            console.log('[appointmentsApi.updateAppointment] ✅ AUTO-TRIGGER: Processamento financeiro concluído');
          }, 100);
        } catch (finErr) {
          console.warn('[appointmentsApi.updateAppointment] ⚠️ AUTO-TRIGGER: Erro no processamento financeiro:', finErr.message);
        }
      }
    }

    console.log('[appointmentsApi.updateAppointment] ✅ Agendamento atualizado:', result.id);
    return result;

  } catch (err) {
    console.error("[appointmentsApi.updateAppointment] ❌ Erro inesperado:", err.message || err);
    throw err;
  }
}


/**
 * Deletar agendamento
 */
export async function deleteAppointment(id) {
  if (!id) {
    throw new Error("ID do agendamento Ã© obrigatÃ³rio");
  }

  try {
    // ðŸš€ BLOCKER 4 FIX: Cascade delete financial records first
    console.log('ðŸ”„ [DELETE] Limpando registros financeiros associados...');
    
    // Delete ar_receivables (cascade FK will delete medical_production â†’ medical_repasse)
    const { error: arError } = await supabase
      .from('ar_receivables')
      .delete()
      .eq('appointment_id', id);
    
    if (arError && arError.code !== 'PGRST116') { // PGRST116 = no rows deleted
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
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao deletar agendamento:", error);
      throw new Error("Falha ao deletar agendamento");
    }

    console.log('âœ… Agendamento deletado com sucesso');
    return true;
  } catch (err) {
    console.error("Erro inesperado:", err);
    throw err;
  }
}
