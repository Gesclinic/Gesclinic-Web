// src/lib/appointmentsApi.js
import { supabase } from "@/lib/customSupabaseClient";
import { logAppointmentAudit, AUDIT_ACTION_TYPES, logStatusChange } from "@/lib/auditApi";
import { migrateStatus } from "@/lib/appointmentStatusConstants";

// Import financial integration for auto-triggers
import { finalizeAppointmentWithFinancials } from "@/lib/appointmentFinancialIntegrationApi";

// ============================================================
// HELPERS: Normaliza��o e Transforma��o
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
    // Se j� � HH:MM ou HH:MM:SS, retornar como est�
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
      return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    }
    // Se � ISO, extrair a parte de hora
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return null;
    const isoStr = date.toISOString();
    return isoStr.split('T')[1].substring(0, 8); // HH:MM:SS
  } catch {
    return null;
  }
};

// ============================================================
// VALIDA��O: Garantir dados v�lidos ANTES de salvar
// ============================================================

/**
 * Valida agendamento antes de salvar no banco
 * @param {Object} payload - Dados do agendamento
 * @throws {Error} Se alguma valida��o falhar
 */
function validateAppointment(payload) {
  // Valida��es obrigat�rias
  if (!payload.clinicId && !payload.clinic_id) {
    throw new Error("? Cl�nica � obrigat�ria");
  }

  if (!payload.date && !payload.scheduled_date) {
    throw new Error("? Data do agendamento � obrigat�ria");
  }

  if (!payload.startTime && !payload.scheduled_time) {
    throw new Error("? Hor�rio do agendamento � obrigat�rio");
  }

  // Validar data/hora se forem fornecidas
  if (payload.date) {
    const date = new Date(payload.date);
    if (isNaN(date.getTime())) {
      throw new Error("? Data inv�lida");
    }
  }

  if (payload.startTime) {
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(payload.startTime) && !payload.startTime.match(/T\d{2}:\d{2}/)) {
      throw new Error("? Hor�rio em formato inv�lido (esperado HH:MM ou ISO)");
    }
  }

  // Valida��es de neg�cio
  if (payload.value !== undefined && payload.value < 0) {
    throw new Error("? Valor n�o pode ser negativo");
  }

  if (payload.discount !== undefined && payload.discount < 0) {
    throw new Error("? Desconto n�o pode ser negativo");
  }

  if (payload.duration !== undefined && payload.duration <= 0) {
    throw new Error("? Dura��o deve ser maior que zero");
  }

  return true;
}

// ============================================================
// MAPPER: Frontend ? Banco de Dados
// ============================================================

/**
 * Mapeia payload do frontend para formato correto do banco de dados
 * 
 * REGRAS CR�TICAS:
 * - ? NUNCA usar start_time (coluna n�o existe no banco)
 * - ? SEMPRE converter startTime ? scheduled_time
 * - ? SEMPRE converter date ? scheduled_date
 * - ? SEMPRE passar pelo mapper (nunca enviar payload direto)
 * 
 * Frontend usa:  date, startTime, endTime, clinicId, patientId, etc
 * Banco usa:     scheduled_date, scheduled_time, end_time, clinic_id, patient_id, etc
 * 
 * @param {Object} payload - Dados vindos do frontend
 * @returns {Object} Dados formatados para o banco
 * @throws {Error} Se payload for inv�lido
 */
function mapToDatabase(payload) {
  if (!payload) throw new Error("Payload inv�lido");

  return {
    id: payload.id,

    clinic_id: payload.clinicId,
    patient_id: payload.patientId,
    professional_id: payload.professionalId,
    service_id: payload.serviceId,

    scheduled_date: payload.date,
    scheduled_time: payload.startTime,
    end_time: payload.endTime,

    status: payload.status || "scheduled",

    notes: payload.notes || null,
    value: payload.value || 0,
    discount: payload.discount || 0,

    payer_id: payload.payerId || null,
    payer_type: payload.payerType || null,

    updated_at: new Date().toISOString()
  };
}

// ============================================================
// MAPPER INVERSO: Banco de Dados ? Frontend
// ============================================================

/**
 * Mapeia registro do banco para formato esperado pelo frontend
 * 
 * Convers�o: Banco (snake_case) ? Frontend (camelCase)
 * 
 * @param {Object} record - Registro vindo do banco de dados
 * @returns {Object} Dados formatados para o frontend
 */
export function mapFromDatabase(record) {
  if (!record) return null;
  
  // 🔍 DEBUG: Log raw data before mapping
  console.log('📦 [mapFromDatabase] Raw record snake_case:', {
    patient_id: record.patient_id,
    professional_id: record.professional_id,
    service_id: record.service_id,
    room_id: record.room_id,
    payer_id: record.payer_id,
  });
  
  const mapped = {
    // IDs em camelCase (critical para componentes)
    id: record.id,
    clinicId: record.clinic_id,
    patientId: record.patient_id,
    professionalId: record.professional_id,  // ✅ ESSE ERA O PROBLEMA!
    serviceId: record.service_id,
    roomId: record.room_id,
    payerId: record.payer_id,
    planId: record.plan_id,
    
    // Datas/Horários
    date: record.scheduled_date,
    startTime: record.scheduled_time,
    endTime: record.end_time,
    
    // Status e notas
    status: record.status,
    notes: record.notes,
    value: record.value,
    duration: record.duration,
    discount: record.discount,
    
    // Campos financeiros
    discountReason: record.discount_reason,
    discountAuthorizedBy: record.discount_authorized_by,
    discountAuthorizedAt: record.discount_authorized_at,
    discountObservation: record.discount_observation,
    
    // Dados do paciente
    patientType: record.patient_type,
    leadName: record.lead_name,
    leadPhone: record.lead_phone,
    leadMobile: record.lead_mobile,
    patientName: record.patients?.name || record.lead_name || null,
    patientCpf: record.patients?.document_id || record.patient_cpf || null,
    patientPhone: record.patients?.phone || record.patient_phone || null,
    patientMobile: record.patients?.cell_phone || record.patient_mobile || null,
    patientProntuario: record.patients?.prontuario_numero || null,
    
    // Dados de seguro/cartão
    cardNumber: record.card_number,
    insuranceCardVerified: record.insurance_card_verified,
    authorizationNumber: record.authorization_number,
    authorizationDate: record.authorization_date,
    authorizationVerified: record.authorization_verified,
    authorizationExpiry: record.authorization_expiry,
    
    // Dados de faturamento
    guideNumber: record.guide_number,
    guideGenerated: record.guide_generated,
    paymentMethod: record.payment_method,
    paymentStatus: record.payment_status,
    billingData: record.billing_data,
    billingNotes: record.billing_notes,
    billingXml: record.billing_xml,
    
    // Convênios e planos
    convenioId: record.convenio_id,
    planoContasId: record.plano_contas_id,
    agendaRuleId: record.agenda_rule_id,
    
    // Timestamps
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    
    // Dados relacionados (nomes para exibição) - CAMELCASE
    professionalName: record.professionals?.name || null,
    serviceName: record.services?.name || null,
    roomName: record.rooms?.name || null,
    payerName: record.payers?.active === false ? null : (record.payers?.name || 'Particular'),
    planName: record.plans?.name || null,
    planCode: record.plans?.code || null,
    
    // Dados relacionados (nomes para exibição) - SNAKE_CASE (compatibilidade com agenda)
    patient_name: record.patients?.name || record.lead_name || null,
    patient_phone: record.patients?.phone || record.patient_phone || null,
    patient_mobile: record.patients?.cell_phone || record.patient_mobile || null,
    patient_cpf: record.patients?.document_id || record.patient_cpf || null,
    professional_name: record.professionals?.name || null,
    service_name: record.services?.name || null,
    room_name: record.rooms?.name || null,
    payer_name: record.payers?.active === false ? null : (record.payers?.name || 'Particular'),
    plan_name: record.plans?.name || null,
    plan_code: record.plans?.code || null,
    
    // Keep raw snake_case for backward compatibility if needed
    ...record
  };
  
  // 🔍 DEBUG: Log mapped camelCase data
  console.log(`✅ [mapFromDatabase] MAPEADO - ID: ${mapped.id}`, {
    patientId: mapped.patientId,
    professionalId: mapped.professionalId,
    serviceId: mapped.serviceId,
    roomId: mapped.roomId,
    payerId: mapped.payerId,
    patientName: mapped.patientName,
    professionalName: mapped.professionalName,
    serviceName: mapped.serviceName,
    roomName: mapped.roomName,
    payerName: mapped.payerName,
  });
  
  return mapped;
}

// ============================================================
// LISTAGEM SIMPLIFICADA: Por data
// ============================================================

export async function listAppointmentsByDate(clinicId, date) {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      patients (id, name, document_id, phone, cell_phone, prontuario_numero, photo_url),
      professionals (id, name),
      services (id, name, code),
      rooms (id, name),
      payers (id, name, active),
      plans (id, name, code)
    `)
    .eq("clinic_id", clinicId)
    .eq("scheduled_date", date)
    .order("scheduled_time", { ascending: true });

  if (error) {
    console.error('[listAppointmentsByDate] Erro:', error);
    throw error;
  }

  return data.map(apt => {
    const mapped = mapFromDatabase(apt);
    mapped.status = migrateStatus(mapped.status);
    return mapped;
  });
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
  if (!clinicId) {
    console.warn('[listAppointments] ❌ Missing clinicId');
    return [];
  }

  // 🔒 RBAC: Se for profissional, força filtro para sua própria agenda
  let effectiveProfessionalId = professionalId;
  if (userRole === 'profissional' && userProfessionalId) {
    effectiveProfessionalId = userProfessionalId;
  }

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
      patients (id, name, document_id, phone, cell_phone, prontuario_numero, photo_url),
      professionals (id, name),
      services (id, name, code, tuss_code),
      rooms (id, name),
      payers (id, name, active),
      plans (id, name, code)
    `)
    .eq("clinic_id", clinicId)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  // Convert ISO strings to YYYY-MM-DD format for DATE column comparison
  if (start) {
    const startDate = new Date(start).toISOString().split('T')[0];
    query = query.gte("scheduled_date", startDate);
  }
  if (end) {
    const endDate = new Date(end).toISOString().split('T')[0];
    query = query.lte("scheduled_date", endDate);
  }
  if (effectiveProfessionalId) {
    query = query.eq("professional_id", effectiveProfessionalId);
  }
  if (roomId) query = query.eq("room_id", roomId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    console.error("❌ [listAppointments] Erro ao buscar agendamentos:", error);
    return [];
  }

  const result = (data ?? []).map(normalizeAppointment);
  
  // Helpers function to normalize appointment with proper field mapping and display data
  function normalizeAppointment(apt) {
    return {
      ...mapFromDatabase(apt),
      // Apply status migration
      status: migrateStatus(mapFromDatabase(apt).status),
    };
  }

  console.log(`✅ [listAppointments] Carregados ${result.length} agendamentos para clínica ${clinicId}`);
  
  return result;
}

export async function getAppointmentById(appointmentId) {
  const { data: apt, error } = await supabase
    .from('appointments')
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
      payment_method,
      convenio_id,
      plano_contas_id,
      billing_notes,
      billing_data,
      guide_number,
      authorization_number,
      authorization_expiry,
      authorization_verified,
      card_number,
      discount,
      discount_reason,
      discount_authorized_by,
      discount_authorized_at,
      discount_observation,
      patients (
        id,
        name,
        phone,
        cell_phone,
        email,
        document_id,
        birthdate,
        gender,
        street,
        number,
        neighborhood,
        city,
        state,
        zip_code,
        record_number,
        photo_url,
        prontuario_numero
      ),
      professionals (id, name),
      services (id, name, code),
      payers (id, name, active),
      plans (id, name, code)
    `)
    .eq('id', appointmentId)
    .maybeSingle();

  if (error) {
    console.error('❌ [getAppointmentById] Erro ao carregar agendamento:', error);
    return null;
  }

  if (!apt) {
    console.warn('⚠️ [getAppointmentById] Agendamento não encontrado:', appointmentId);
    return null;
  }

  // Apply field mapping to ensure camelCase fields
  const mapped = mapFromDatabase(apt);
  // Apply status migration
  mapped.status = migrateStatus(mapped.status);
  
  console.log('✅ [getAppointmentById] Agendamento carregado com mapeamento:', {
    id: mapped.id,
    professionalId: mapped.professionalId,
    patientId: mapped.patientId,
    date: mapped.date,
  });
  
  return mapped;
}

export async function createAppointment(payload) {
  const data = mapToDatabase(payload);

  const { data: result, error } = await supabase
    .from("appointments")
    .insert([data])
    .select(`
      *,
      patients (id, name, phone),
      professionals (id, name),
      services (id, name),
      payers (id, name),
      rooms (id, name)
    `)
    .single();

  if (error) throw error;

  console.log('✅ [createAppointment] Appointment created com relacionamentos:', {
    appointmentId: result?.id,
    patientName: result?.patients?.name,
    professionalName: result?.professionals?.name,
    serviceName: result?.services?.name,
    payerName: result?.payers?.name,
    roomName: result?.rooms?.name,
  });

  return mapFromDatabase(result);
}


export async function updateAppointment(id, payload) {
  const data = mapToDatabase(payload);

  const { data: result, error } = await supabase
    .from("appointments")
    .update(data)
    .eq("id", id)
    .select(`
      *,
      patients (id, name, phone),
      professionals (id, name),
      services (id, name),
      payers (id, name),
      rooms (id, name)
    `);

  if (error) {
    console.error('❌ [updateAppointment] Supabase error:', error);
    throw error;
  }

  // ✅ UPDATE was successful even if .select() returns empty (RLS might block)
  if (result && result.length > 0) {
    console.log('✅ [updateAppointment] Appointment updated com relacionamentos:', {
      appointmentId: result[0]?.id,
      patientName: result[0]?.patients?.name,
      professionalName: result[0]?.professionals?.name,
      serviceName: result[0]?.services?.name,
      payerName: result[0]?.payers?.name,
      roomName: result[0]?.rooms?.name,
    });
    return mapFromDatabase(result[0]);
  }

  // If no data returned, still consider it a success but log warning
  console.warn('⚠️ [updateAppointment] UPDATE executed but no data returned (possible RLS filtering)');
  return { id, ...mapFromDatabase(payload) }; // Return what we sent as fallback
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
