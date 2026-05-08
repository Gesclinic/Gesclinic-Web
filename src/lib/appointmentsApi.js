// src/lib/appointmentsApi.js
import { supabase } from '@/lib/customSupabaseClient';
import { logAppointmentAudit, AUDIT_ACTION_TYPES, logStatusChange } from '@/lib/auditApi';
import { migrateStatus } from '@/lib/appointmentStatusConstants';

// Import financial integration for auto-triggers
import { finalizeAppointmentWithFinancials } from '@/lib/appointmentFinancialIntegrationApi';

// ✅ PHASE 2: Import timezone utilities
import { formatTime, isBusinessHours, convertUTCToLocal } from '@/modules/agenda/utils/timezone';

// ============================================================
// HELPERS: Normaliza��o e Transforma��o
// ============================================================

/**
 * Normaliza UUID: converte strings vazias e undefined em null
 * @param {string} val - Valor a normalizar
 * @returns {string|null} UUID ou null
 */
const normalizeUUID = (val) => (val === '' || val === undefined ? null : val);

/**
 * Extrai data em formato YYYY-MM-DD
 * @param {string|Date} dateStr - Data como string ou Date
 * @returns {string|null} Data formatada ou null
 */
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

/**
 * Extrai hora em formato HH:MM:SS
 * @param {string|Date} timeStr - Hora como string ou Date
 * @returns {string|null} Hora formatada ou null
 * 
 * ✅ PHASE 2: Timezone utilities (formatTime, isBusinessHours) available in @/modules/agenda/utils/timezone
 */
const extractTime = (timeStr) => {
  if (!timeStr) {
    return null;
  }
  try {
    // Se j� � HH:MM ou HH:MM:SS, retornar como est�
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
      return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    }
    // Se � ISO, extrair a parte de hora
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
    throw new Error('? Cl�nica � obrigat�ria');
  }

  if (!payload.date && !payload.scheduled_date) {
    throw new Error('? Data do agendamento � obrigat�ria');
  }

  if (!payload.startTime && !payload.scheduled_time) {
    throw new Error('? Hor�rio do agendamento � obrigat�rio');
  }

  // Validar data/hora se forem fornecidas
  if (payload.date) {
    const date = new Date(payload.date);
    if (isNaN(date.getTime())) {
      throw new Error('? Data inv�lida');
    }
  }

  if (payload.startTime) {
    if (
      !/^\d{2}:\d{2}(:\d{2})?$/.test(payload.startTime) &&
      !payload.startTime.match(/T\d{2}:\d{2}/)
    ) {
      throw new Error('? Hor�rio em formato inv�lido (esperado HH:MM ou ISO)');
    }
  }

  // Valida��es de neg�cio
  if (payload.value !== undefined && payload.value < 0) {
    throw new Error('? Valor n�o pode ser negativo');
  }

  if (payload.discount !== undefined && payload.discount < 0) {
    throw new Error('? Desconto n�o pode ser negativo');
  }

  if (payload.duration !== undefined && payload.duration <= 0) {
    throw new Error('? Dura��o deve ser maior que zero');
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
  if (!payload) {
    throw new Error('Payload inválido');
  }

  console.log('🔴 [mapToDatabase] ===== INICIANDO MAPEAMENTO ====');
  console.log('   Input payload keys:', Object.keys(payload));
  console.log('   Campos críticos de entrada:', {
    payerId_camelCase: payload.payerId,
    payer_id_snake: payload.payer_id,
    roomId_camelCase: payload.roomId,
    room_id_snake: payload.room_id,
    date: payload.date || payload.scheduled_date,
    time: payload.time || payload.startTime || payload.scheduled_time,
  });

  // ✅ ACEITAR AMBOS OS FORMATOS (camelCase E snake_case)
  const result = {
    clinic_id: payload.clinicId || payload.clinic_id,
    patient_id: payload.patientId || payload.patient_id,
    professional_id: payload.professionalId || payload.professional_id,
    service_id: payload.serviceId || payload.service_id,
    room_id: payload.roomId || payload.room_id,
    payer_id: payload.payerId || payload.payer_id,
    plan_id: payload.planId || payload.plan_id,
    plano_contas_id:
      payload.plano_contas_id || payload.planosContasId || payload.planAccountId || null,
    scheduled_date: payload.date || payload.scheduled_date,
    scheduled_time: payload.time || payload.startTime || payload.scheduled_time,
    end_time: payload.endTime || payload.end_time,

    // 📊 Status e valores
    status: payload.status || 'scheduled',
    notes: payload.notes || null,
    value: payload.value ? parseFloat(payload.value) : null,
    duration: payload.duration || 30,

    // 💳 Cartão e autorização
    card_number: payload.card_number || payload.cardNumber || null,
    card_verified: payload.card_verified !== undefined ? payload.card_verified : false,
    authorization_number: payload.authorization_number || payload.authorizationNumber || null,
    authorization_expiry: payload.authorization_expiry || payload.authorizationExpiry || null,
    guide_number: payload.guide_number || payload.guideNumber || null,

    // 📋 Faturamento e desconto
    discount: payload.discount !== undefined ? parseFloat(payload.discount) : 0,
    discount_reason: payload.discount_reason || payload.discountReason || null,
    discount_requested_at: payload.discount_requested_at || payload.discountRequestedAt || null,
    discount_requested_by: payload.discount_requested_by || payload.discountRequestedBy || null,
    discount_requested_by_name:
      payload.discount_requested_by_name || payload.discountRequestedByName || null,
    discount_authorized_by: payload.discount_authorized_by || payload.discountAuthorizedBy || null,
    discount_authorized_at: payload.discount_authorized_at || payload.discountAuthorizedAt || null,
    discount_rejected_by: payload.discount_rejected_by || payload.discountRejectedBy || null,
    discount_rejected_at: payload.discount_rejected_at || payload.discountRejectedAt || null,
    discount_observation: payload.discount_observation || payload.discountObservation || null,
    payment_method: payload.payment_method || payload.paymentMethod || null,
    payment_splits:
      typeof payload.payment_splits === 'string'
        ? payload.payment_splits
        : payload.payment_splits
          ? JSON.stringify(payload.payment_splits)
          : null,
    billing_data:
      typeof payload.billing_data === 'string'
        ? payload.billing_data
        : payload.billing_data
          ? JSON.stringify(payload.billing_data)
          : null,
    billing_notes: payload.billing_notes || payload.billingNotes || null,
  };

  // ✅ Só incluir ID se existir (para UPDATE/EDIT)
  if (payload.id) {
    result.id = payload.id;
  }

  console.log('🟢 [mapToDatabase] Output formatado para banco:', {
    room_id: result.room_id,
    payer_id: result.payer_id,
    scheduled_date: result.scheduled_date,
    scheduled_time: result.scheduled_time,
    end_time: result.end_time,
  });
  console.log('   [COMPLETO] Result object tem', Object.keys(result).length, 'campos');

  return result;
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
  if (!record) {
    return null;
  }

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
    professionalId: record.professional_id, // ✅ ESSE ERA O PROBLEMA!
    serviceId: record.service_id,
    roomId: record.room_id,
    payerId: record.payer_id,
    planId: record.plan_id,

    // Datas/Horários
    date: record.scheduled_date,
    startTime: extractTime(record.scheduled_time),
    time: extractTime(record.scheduled_time),
    endTime: extractTime(record.end_time),
    end_time: extractTime(record.end_time),

    // Status e notas
    status: record.status,
    notes: record.notes,
    value: record.value,
    duration: record.duration,
    discount: record.discount,

    // Campos financeiros
    discountReason: record.discount_reason,
    discountRequestedAt: record.discount_requested_at,
    discountRequestedBy: record.discount_requested_by,
    discountRequestedByName: record.discount_requested_by_name,
    discountAuthorizedBy: record.discount_authorized_by,
    discountAuthorizedAt: record.discount_authorized_at,
    discountRejectedBy: record.discount_rejected_by,
    discountRejectedAt: record.discount_rejected_at,
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
    paymentSplits: record.payment_splits
      ? typeof record.payment_splits === 'string'
        ? JSON.parse(record.payment_splits)
        : record.payment_splits
      : null,
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
    payerName: record.payers?.active === false ? null : record.payers?.name || 'Particular',
    planName: record.plans?.name || null,
    planCode: record.plans?.code || null,

    // 📦 Dados relacionados (OBJETOS COMPLETOS para componentes)
    professionals: record.professionals || null,
    services: record.services || null,
    rooms: record.rooms || null,
    payers: record.payers || null,
    patients: record.patients || null,

    // Dados relacionados (nomes para exibição) - SNAKE_CASE (compatibilidade com agenda)
    patient_name: record.patients?.name || record.lead_name || null,
    patient_phone: record.patients?.phone || record.patient_phone || null,
    patient_mobile: record.patients?.cell_phone || record.patient_mobile || null,
    patient_cpf: record.patients?.document_id || record.patient_cpf || null,
    professional_name: record.professionals?.name || null,
    service_name: record.services?.name || null,
    room_name: record.rooms?.name || null,
    payer_name: record.payers?.active === false ? null : record.payers?.name || 'Particular',
    plan_name: record.plans?.name || null,
    plan_code: record.plans?.code || null,
    plano_contas_id: record.plano_contas_id || null,
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
    .from('appointments')
    .select(
      `
      *,
      patients (id, name, document_id, phone, cell_phone, prontuario_numero, photo_url),
      professionals (id, name),
      services (id, name, code),
      rooms (id, name),
      payers (id, name, active),
      plans (id, name, code)
    `,
    )
    .eq('clinic_id', clinicId)
    .eq('scheduled_date', date)
    .order('scheduled_time', { ascending: true });

  if (error) {
    console.error('[listAppointmentsByDate] Erro:', error);
    throw error;
  }

  return data.map((apt) => {
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
    .from('appointments')
    .select(
      `
      *,
      patients (id, name, phone),
      professionals (id, name),
      services (id, name),
      payers (id, name),
      rooms (id, name)
    `,
    )
    .eq('clinic_id', clinicId)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  // Convert ISO strings to YYYY-MM-DD format for DATE column comparison
  if (start) {
    const startDate = new Date(start).toISOString().split('T')[0];
    query = query.gte('scheduled_date', startDate);
  }
  if (end) {
    const endDate = new Date(end).toISOString().split('T')[0];
    query = query.lte('scheduled_date', endDate);
  }
  if (effectiveProfessionalId) {
    query = query.eq('professional_id', effectiveProfessionalId);
  }
  if (roomId) {
    query = query.eq('room_id', roomId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [listAppointments] Erro ao buscar agendamentos:', error);
    return [];
  }

  // 🔍 DEBUG: Ver dados RAW antes de mapear
  if (data && data.length > 0) {
    console.log('📊 [listAppointments] DADOS RAW DO SUPABASE (primeiro agendamento):');
    const first = data[0];
    console.log('   ID:', first.id);
    console.log('   scheduled_time:', first.scheduled_time);
    console.log('   patient_id:', first.patient_id);
    console.log('   professional_id:', first.professional_id);
    console.log('   service_id:', first.service_id);
    console.log('   payer_id:', first.payer_id);
    console.log('   patient_name (direto):', first.patient_name);
    console.log('   payer_name (direto):', first.payer_name);
    console.log('   patients (relacionamento):', first.patients);
    console.log('   professionals (relacionamento):', first.professionals);
    console.log('   services (relacionamento):', first.services);
    console.log('   payers (relacionamento):', first.payers);
  }

  // Se os relacionamentos não vieram do Supabase, buscar separadamente
  const appointmentsWithRelations = (data ?? []).map((apt) => ({
    ...apt,
    // Se não temos o objeto patients, tentar usar o campo desnormalizado patient_name
    patients:
      apt.patients || (apt.patient_id ? { id: apt.patient_id, name: apt.patient_name } : null),
    professionals:
      apt.professionals || (apt.professional_id ? { id: apt.professional_id, name: null } : null),
    services: apt.services || (apt.service_id ? { id: apt.service_id, name: null } : null),
    payers: apt.payers || (apt.payer_id ? { id: apt.payer_id, name: apt.payer_name } : null),
  }));

  // 🔍 Se faltam dados de paciente/profissional/serviço/convênio, buscar separadamente
  const needsPatientNames = appointmentsWithRelations.some(
    (a) =>
      (a.patient_id && !a.patients?.name) ||
      (a.professional_id && !a.professionals?.name) ||
      (a.service_id && !a.services?.name) ||
      (a.payer_id && !a.payers?.name),
  );

  if (needsPatientNames) {
    console.log('⚠️ [listAppointments] Faltam dados de relacionamentos, buscando separadamente...');

    // Coletar IDs únicos que faltam
    const patientIds = [
      ...new Set(
        appointmentsWithRelations
          .filter((a) => a.patient_id && !a.patients?.name)
          .map((a) => a.patient_id),
      ),
    ];

    const profIds = [
      ...new Set(
        appointmentsWithRelations
          .filter((a) => a.professional_id && !a.professionals?.name)
          .map((a) => a.professional_id),
      ),
    ];

    const serviceIds = [
      ...new Set(
        appointmentsWithRelations
          .filter((a) => a.service_id && !a.services?.name)
          .map((a) => a.service_id),
      ),
    ];

    const payerIds = [
      ...new Set(
        appointmentsWithRelations
          .filter((a) => a.payer_id && !a.payers?.name)
          .map((a) => a.payer_id),
      ),
    ];

    // Buscar dados em paralelo
    const [patientsData, profsData, servicesData, payersData] = await Promise.all([
      patientIds.length > 0
        ? supabase
            .from('patients')
            .select('id, name, phone')
            .in('id', patientIds)
            .then((r) => r.data || [])
        : Promise.resolve([]),
      profIds.length > 0
        ? supabase
            .from('professionals')
            .select('id, name')
            .in('id', profIds)
            .then((r) => r.data || [])
        : Promise.resolve([]),
      serviceIds.length > 0
        ? supabase
            .from('services')
            .select('id, name')
            .in('id', serviceIds)
            .then((r) => r.data || [])
        : Promise.resolve([]),
      payerIds.length > 0
        ? supabase
            .from('payers')
            .select('id, name')
            .in('id', payerIds)
            .then((r) => r.data || [])
        : Promise.resolve([]),
    ]);

    // Popular os dados que faltavam
    appointmentsWithRelations.forEach((apt) => {
      if (apt.patient_id && !apt.patients?.name) {
        const p = patientsData.find((x) => x.id === apt.patient_id);
        if (p) {
          apt.patients = p;
        }
      }
      if (apt.professional_id && !apt.professionals?.name) {
        const p = profsData.find((x) => x.id === apt.professional_id);
        if (p) {
          apt.professionals = p;
        }
      }
      if (apt.service_id && !apt.services?.name) {
        const s = servicesData.find((x) => x.id === apt.service_id);
        if (s) {
          apt.services = s;
        }
      }
      if (apt.payer_id && !apt.payers?.name) {
        const p = payersData.find((x) => x.id === apt.payer_id);
        if (p) {
          apt.payers = p;
        }
      }
    });

    console.log('✅ [listAppointments] Dados de relacionamentos populados:', {
      patients: patientsData.length,
      professionals: profsData.length,
      services: servicesData.length,
      payers: payersData.length,
    });
  }

  const result = appointmentsWithRelations.map(normalizeAppointment);

  // Helpers function to normalize appointment with proper field mapping and display data
  function normalizeAppointment(apt) {
    const mapped = mapFromDatabase(apt);
    return {
      ...mapped,
      // Apply status migration
      status: migrateStatus(mapped.status),
    };
  }

  // 🔍 DEBUG: Log para verificar dados dos agendamentos DEPOIS DE MAPEAR
  if (result.length > 0) {
    console.log('📊 [listAppointments] PRIMEIRO AGENDAMENTO COM DADOS MAPEADOS:');
    const first = result[0];
    console.log('   ID:', first.id);
    console.log('   patientName:', first.patientName);
    console.log('   patient_name:', first.patient_name);
    console.log('   professionalName:', first.professionalName);
    console.log('   professional_name:', first.professional_name);
    console.log('   serviceName:', first.serviceName);
    console.log('   service_name:', first.service_name);
    console.log('   payerName:', first.payerName);
    console.log('   payer_name:', first.payer_name);
  }

  console.log(
    `✅ [listAppointments] Carregados ${result.length} agendamentos para clínica ${clinicId}`,
  );

  return result;
}

export async function getAppointmentById(appointmentId) {
  const { data: apt, error } = await supabase
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
    `,
    )
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

  console.log('✅ [getAppointmentById] RAW SUPABASE RESPONSE:', {
    scheduled_date: apt.scheduled_date,
    scheduled_time: apt.scheduled_time,
    end_time: apt.end_time,
  });

  console.log('✅ [getAppointmentById] APÓS MAPEAMENTO:', {
    id: mapped.id,
    professionalId: mapped.professionalId,
    patientId: mapped.patientId,
    date: mapped.date,
    startTime: mapped.startTime,
    endTime: mapped.endTime,
  });

  return mapped;
}

export async function createAppointment(payload) {
  const data = mapToDatabase(payload);

  const { data: result, error } = await supabase
    .from('appointments')
    .insert([data])
    .select(
      `
      *,
      patients (id, name, phone),
      professionals (id, name),
      services (id, name),
      payers (id, name),
      rooms (id, name)
    `,
    )
    .single();

  if (error) {
    throw error;
  }

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
  console.log('\n' + '='.repeat(70));
  console.log('🔴 [updateAppointment] INICIANDO UPDATE');
  console.log('='.repeat(70));
  console.log('   ID:', id);
  console.log('   Payload recebido (campos críticos):', {
    room_id: payload.room_id,
    roomId: payload.roomId,
    payer_id: payload.payer_id,
    payerId: payload.payerId,
    date: payload.scheduled_date || payload.date,
    time: payload.scheduled_time || payload.time,
  });

  const data = mapToDatabase(payload);

  console.log('\n📋 [updateAppointment] Data após mapToDatabase (verificação final):', {
    room_id: data.room_id,
    payer_id: data.payer_id,
    scheduled_date: data.scheduled_date,
    scheduled_time: data.scheduled_time,
  });

  console.log('\n📤 [updateAppointment] Enviando UPDATE para Supabase...');
  const { data: result, error } = await supabase.from('appointments').update(data).eq('id', id)
    .select(`
      *,
      patients (id, name, phone),
      professionals (id, name),
      services (id, name),
      payers (id, name),
      rooms (id, name)
    `);

  if (error) {
    console.error('\n❌ [updateAppointment] SUPABASE ERROR:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  console.log('\n✅ [updateAppointment] UPDATE enviado com sucesso!');
  console.log('   Result length:', result?.length);
  
  if (result && result.length > 0) {
    console.log('\n✅ [SUCESSO COM SELECT] Dados retornados do Supabase:');
    console.log('   Dados críticos:', {
      appointmentId: result[0]?.id,
      payer_id: result[0]?.payer_id,
      room_id: result[0]?.room_id,
      scheduled_time: result[0]?.scheduled_time,
      payerName: result[0]?.payers?.name,
      roomName: result[0]?.rooms?.name,
    });
    const mapped = mapFromDatabase(result[0]);
    console.log('   Após mapFromDatabase:', {
      payerId: mapped.payerId,
      roomId: mapped.roomId,
      time: mapped.time,
    });
    console.log('='.repeat(70) + '\n');
    return mapped;
  }

  // If no data returned, still consider it a success but log warning
  console.warn('\n⚠️ [updateAppointment] UPDATE executado MAS SEM DADOS NA SELECT');
  console.warn('   ⚠️⚠️⚠️ DIAGNÓSTICO: RLS provavelmente bloqueou SELECT após UPDATE');
  console.warn('   ✅ [FALLBACK] Construindo resposta do payload original...');

  // ✅ FIX v2 MELHORADO: Mapear fallback corretamente
  const responseData = {
    id,
    // Campos em camelCase (para frontend)
    clinicId: payload.clinicId || payload.clinic_id,
    patientId: payload.patientId || payload.patient_id,
    professionalId: payload.professionalId || payload.professional_id,
    serviceId: payload.serviceId || payload.service_id,
    roomId: payload.roomId || payload.room_id,
    payerId: payload.payerId || payload.payer_id,
    planId: payload.planId || payload.plan_id,
    planoContasId: payload.plano_contas_id,
    date: payload.date || payload.scheduled_date,
    startTime: extractTime(payload.startTime || payload.scheduled_time || payload.time),
    time: extractTime(payload.startTime || payload.scheduled_time || payload.time),
    endTime: extractTime(payload.endTime || payload.end_time),
    end_time: extractTime(payload.endTime || payload.end_time),
    status: payload.status || 'scheduled',
    notes: payload.notes,
    value: payload.value,
    duration: payload.duration,
    discount: payload.discount,
    card_number: payload.card_number || payload.cardNumber,
    authorization_number: payload.authorization_number || payload.authorizationNumber,
    guide_number: payload.guide_number || payload.guideNumber,
    // Spread para preservar qualquer outro campo
    ...payload,
  };

  console.warn('   [FALLBACK] Resposta retornada:', {
    payerId: responseData.payerId,
    roomId: responseData.roomId,
    time: responseData.time,
  });
  console.log('='.repeat(70) + '\n');
  return responseData;
}

/**
 * Deletar agendamento
 */
export async function deleteAppointment(id) {
  if (!id) {
    throw new Error('ID do agendamento é obrigatório');
  }

  try {
    // 🚀 BLOCKER 4 FIX: Cascade delete financial records first
    console.log('🔄 [DELETE] Limpando registros financeiros associados...');

    // Delete ar_receivables (cascade FK will delete medical_production → medical_repasse)
    const { error: arError } = await supabase
      .from('ar_receivables')
      .delete()
      .eq('appointment_id', id);

    if (arError && arError.code !== 'PGRST116') {
      // PGRST116 = no rows deleted
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
    const { error } = await supabase.from('appointments').delete().eq('id', id);

    if (error) {
      console.error('Erro ao deletar agendamento:', error);
      throw new Error('Falha ao deletar agendamento');
    }

    console.log('✅ Agendamento deletado com sucesso');
    return true;
  } catch (err) {
    console.error('Erro inesperado:', err);
    throw err;
  }
}

/**
 * 🔍 FUNÇÃO DE VALIDAÇÃO: Verificar se UPDATE foi realmente salvo no banco
 * Útil para debug de RLS ou problemas de persistência
 * 
 * @param {string} appointmentId - ID do agendamento
 * @param {Object} expectedFields - Campos que deveriam ter sido atualizados
 * @returns {Object} Dados atuais do banco com comparação
 */
export async function validateAppointmentSaved(appointmentId, expectedFields) {
  console.log('\n🔍 [VALIDAÇÃO] Verificando se UPDATE foi realmente salvo...');
  console.log('   Verificando appointment:', appointmentId);
  
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, room_id, payer_id, scheduled_date, scheduled_time, 
        professional_id, service_id, duration, value,
        rooms (id, name),
        payers (id, name),
        professionals (id, name),
        services (id, name)
      `)
      .eq('id', appointmentId)
      .single();
    
    if (error) {
      console.error('❌ [VALIDAÇÃO] Erro ao buscar dados:', error);
      return { valid: false, error: error.message, data: null };
    }
    
    console.log('📊 [VALIDAÇÃO] Dados atuais no banco:');
    const validation = {
      id: data.id,
      expected: expectedFields,
      actual: {
        room_id: data.room_id,
        payer_id: data.payer_id,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        professional_id: data.professional_id,
        service_id: data.service_id,
      },
      roomName: data.rooms?.name,
      payerName: data.payers?.name,
      matches: {
        room_id: data.room_id === (expectedFields.room_id || null),
        payer_id: data.payer_id === (expectedFields.payer_id || null),
        scheduled_time: data.scheduled_time === (expectedFields.scheduled_time || expectedFields.time || null),
      },
    };

    console.log('✅ Comparação:', validation.matches);
    if (!validation.matches.room_id) {
      console.error('   ❌ room_id NÃO foi salvo! Esperado:', expectedFields.room_id, 'Banco:', data.room_id);
    }
    if (!validation.matches.payer_id) {
      console.error('   ❌ payer_id NÃO foi salvo! Esperado:', expectedFields.payer_id, 'Banco:', data.payer_id);
    }
    if (!validation.matches.scheduled_time) {
      console.error('   ❌ scheduled_time NÃO foi salvo! Esperado:', expectedFields.scheduled_time, 'Banco:', data.scheduled_time);
    }

    return validation;
  } catch (err) {
    console.error('❌ [VALIDAÇÃO] Erro inesperado:', err);
    return { valid: false, error: err.message, data: null };
  }
}

/**
 * Valida se um serviço está disponível para um convênio específico
 * Consulta a tabela service_prices para verificar o mapeamento
 * @param {string} serviceId - UUID do serviço
 * @param {string} payerId - UUID do convênio (payer)
 * @param {string} clinicId - UUID da clínica
 * @returns {Promise<{available: boolean, price?: number, coPayment?: number}>}
 */
export async function validateServicePayerAvailability(serviceId, payerId, clinicId) {
  if (!serviceId || !payerId || !clinicId) {
    console.warn('⚠️ [validateServicePayerAvailability] Parâmetros incompletos:', {
      serviceId: !!serviceId,
      payerId: !!payerId,
      clinicId: !!clinicId,
    });
    return { available: false };
  }

  try {
    const { data, error } = await supabase
      .from('service_prices')
      .select('id, price, co_pay, active')
      .eq('service_id', serviceId)
      .eq('payer_id', payerId)
      .eq('clinic_id', clinicId)
      .eq('active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (não é um erro real)
      console.error(
        '❌ [validateServicePayerAvailability] Erro ao consultar service_prices:',
        error,
      );
      return { available: false };
    }

    const available = !!data;
    console.log('🔍 [validateServicePayerAvailability] Resultado:', {
      serviceId,
      payerId,
      available,
      price: data?.price,
      coPayment: data?.co_pay,
    });

    return {
      available,
      price: data?.price,
      coPayment: data?.co_pay,
    };
  } catch (err) {
    console.error('❌ [validateServicePayerAvailability] Erro inesperado:', err);
    return { available: false };
  }
}

// ============================================================
// 🆕 MÚLTIPLOS SERVIÇOS POR AGENDAMENTO
// ============================================================

/**
 * Criar agendamento com múltiplos serviços
 * @param {Object} payload - Dados do agendamento
 * @param {Array} appointmentServices - Array com objetos de serviços
 * @returns {Promise<Object>} Agendamento criado com serviços
 */
export async function createAppointmentWithServices(payload, appointmentServices = []) {
  if (!appointmentServices || appointmentServices.length === 0) {
    throw new Error('Adicione pelo menos um serviço ao agendamento');
  }

  try {
    // ✅ PASSO 1: Criar agendamento
    const appointmentData = mapToDatabase(payload);

    const { data: appointmentResult, error: appointmentError } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select(
        `
        *,
        patients (id, name, phone),
        professionals (id, name),
        services (id, name),
        payers (id, name),
        rooms (id, name)
      `,
      )
      .single();

    if (appointmentError) {
      console.error('❌ Erro ao criar agendamento:', appointmentError);
      throw appointmentError;
    }

    const appointmentId = appointmentResult.id;
    console.log('✅ [createAppointmentWithServices] Agendamento criado:', appointmentId);

    // ✅ PASSO 2: Inserir serviços
    const servicesData = appointmentServices.map((service, index) => ({
      clinic_id: payload.clinicId || payload.clinic_id,
      appointment_id: appointmentId,
      service_id: service.service_id,
      value: parseFloat(service.value || 0),
      discount: parseFloat(service.discount || 0),
      billing_type: service.billing_type || 'per_consultation',
      quantity: parseInt(service.quantity || 1),
      sessions_completed: parseInt(service.sessions_completed || 0),
      status: 'pending',
      sequence_order: index,
    }));

    const { data: servicesResult, error: servicesError } = await supabase
      .from('appointment_services')
      .insert(servicesData)
      .select();

    if (servicesError) {
      console.error('❌ Erro ao inserir serviços:', servicesError);
      throw servicesError;
    }

    console.log('✅ [createAppointmentWithServices] Serviços criados:', servicesResult.length);

    // ✅ Retornar agendamento com serviços
    return {
      ...mapFromDatabase(appointmentResult),
      appointment_services: servicesResult,
    };
  } catch (error) {
    console.error('❌ [createAppointmentWithServices] Erro:', error);
    throw error;
  }
}

/**
 * Atualizar agendamento com múltiplos serviços
 * @param {string} appointmentId - ID do agendamento
 * @param {Object} payload - Dados do agendamento
 * @param {Array} appointmentServices - Array com objetos de serviços
 * @returns {Promise<Object>} Agendamento atualizado com serviços
 */
export async function updateAppointmentWithServices(
  appointmentId,
  payload,
  appointmentServices = [],
) {
  if (!appointmentServices || appointmentServices.length === 0) {
    throw new Error('Adicione pelo menos um serviço ao agendamento');
  }

  try {
    // ✅ PASSO 1: Atualizar agendamento
    const appointmentData = mapToDatabase(payload);

    const { data: appointmentResult, error: appointmentError } = await supabase
      .from('appointments')
      .update(appointmentData)
      .eq('id', appointmentId)
      .select(
        `
        *,
        patients (id, name, phone),
        professionals (id, name),
        services (id, name),
        payers (id, name),
        rooms (id, name)
      `,
      )
      .single();

    if (appointmentError) {
      console.error('❌ Erro ao atualizar agendamento:', appointmentError);
      throw appointmentError;
    }

    console.log('✅ [updateAppointmentWithServices] Agendamento atualizado:', appointmentId);

    // ✅ PASSO 2: Remover serviços antigos
    const { error: deleteError } = await supabase
      .from('appointment_services')
      .delete()
      .eq('appointment_id', appointmentId);

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.warn('⚠️ Erro ao deletar serviços antigos:', deleteError);
    }

    // ✅ PASSO 3: Inserir novos serviços
    const servicesData = appointmentServices
      .filter((s) => s.service_id) // Filtrar apenas serviços com ID válido
      .map((service, index) => ({
        clinic_id: payload.clinicId || payload.clinic_id,
        appointment_id: appointmentId,
        service_id: service.service_id,
        value: parseFloat(service.value || 0),
        discount: parseFloat(service.discount || 0),
        billing_type: service.billing_type || 'per_consultation',
        quantity: parseInt(service.quantity || 1),
        sessions_completed: parseInt(service.sessions_completed || 0),
        status: service.status || 'pending',
        sequence_order: index,
      }));

    const { data: servicesResult, error: servicesError } = await supabase
      .from('appointment_services')
      .insert(servicesData)
      .select();

    if (servicesError && servicesError.code !== 'PGRST116') {
      console.error('❌ Erro ao inserir novos serviços:', servicesError);
      throw servicesError;
    }

    console.log(
      '✅ [updateAppointmentWithServices] Serviços atualizados:',
      servicesResult?.length || 0,
    );

    // ✅ Retornar agendamento com serviços
    const result = appointmentResult || {
      id: appointmentId,
      ...payload,
    };

    return {
      ...mapFromDatabase(result),
      appointment_services: servicesResult || [],
    };
  } catch (error) {
    console.error('❌ [updateAppointmentWithServices] Erro:', error);
    throw error;
  }
}

/**
 * Buscar serviços de um agendamento
 * @param {string} appointmentId - ID do agendamento
 * @returns {Promise<Array>} Array com serviços do agendamento
 */
export async function getAppointmentServices(appointmentId) {
  try {
    console.log('📖 [getAppointmentServices] Buscando serviços para appointment:', appointmentId);

    const { data, error } = await supabase
      .from('appointment_services')
      .select(
        `
        *,
        services (id, name, tuss_code)
      `,
      )
      .eq('appointment_id', appointmentId)
      .order('sequence_order', { ascending: true });

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar serviços:', error);
      throw error;
    }

    // 🔄 Mapear dados para incluir service_name
    const mappedData = (data || []).map((s) => ({
      ...s,
      service_name: s.services?.name || '',
    }));

    console.log('📖 [getAppointmentServices] Resultado:', {
      appointmentId,
      services_found: mappedData?.length || 0,
      services:
        mappedData?.map((s) => ({
          id: s.id,
          service_id: s.service_id,
          service_name: s.service_name,
          value: s.value,
          quantity: s.quantity,
          status: s.status,
        })) || [],
    });

    return mappedData || [];
  } catch (error) {
    console.error('❌ [getAppointmentServices] Erro:', error);
    return [];
  }
}

/**
 * Atualizar status de serviço (ex: pendente → faturado)
 * @param {string} appointmentServiceId - ID do serviço do agendamento
 * @param {string} status - Novo status (pending, billed, cancelled)
 * @returns {Promise<Object>} Serviço atualizado
 */
export async function updateAppointmentServiceStatus(appointmentServiceId, status) {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .update({ status })
      .eq('id', appointmentServiceId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Status do serviço atualizado:', appointmentServiceId, '→', status);
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    throw error;
  }
}

/**
 * Sincronizar serviços de um agendamento (deletar antigos e inserir novos)
 * @param {string} appointmentId - ID do agendamento
 * @param {Array} appointmentServices - Array de serviços com sessions_completed
 * @returns {Promise<Array>} Array de serviços sincronizados
 */
export async function syncAppointmentServices(appointmentId, appointmentServices = []) {
  try {
    console.log('🔴 [syncAppointmentServices] INICIADO', {
      appointmentId,
      appointmentServices_length: appointmentServices?.length || 0,
      appointmentServices:
        appointmentServices?.map((s) => ({
          id: s.id,
          service_id: s.service_id,
          service_name: s.service_name,
          value: s.value,
          quantity: s.quantity,
        })) || [],
    });

    if (!appointmentId) {
      throw new Error('appointmentId é obrigatório');
    }

    if (!appointmentServices || appointmentServices.length === 0) {
      console.log('ℹ️ [syncAppointmentServices] Array vazio - nada para sincronizar');
      return [];
    }

    // 0. Buscar clinic_id do agendamento
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('clinic_id')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      throw new Error(`Agendamento não encontrado: ${fetchError?.message || appointmentId}`);
    }

    const clinicId = appointment.clinic_id;
    console.log('🔍 [syncAppointmentServices] clinic_id:', clinicId);

    // 1. Deletar serviços antigos (onde ID começa com 'new-' são novos, outros são do DB)
    const oldServiceIds = appointmentServices
      .filter((s) => !s.id?.startsWith('new-'))
      .map((s) => s.id);

    if (oldServiceIds.length > 0) {
      console.log(
        '🗑️ [syncAppointmentServices] Deletando',
        oldServiceIds.length,
        'serviços antigos',
      );
      const { error: deleteError } = await supabase
        .from('appointment_services')
        .delete()
        .in('id', oldServiceIds);

      if (deleteError) {
        console.warn('⚠️ Erro ao deletar serviços antigos:', deleteError);
      }
    }

    // 2. Preparar dados dos novos serviços (remover campos temporários)
    const servicesData = appointmentServices
      .filter((s) => s.service_id) // Filtrar apenas serviços válidos
      .map((service, index) => ({
        clinic_id: clinicId, // ✅ clinic_id obrigatório
        appointment_id: appointmentId,
        service_id: service.service_id,
        value: parseFloat(service.value || 0),
        discount: parseFloat(service.discount || 0),
        billing_type: service.billing_type || 'per_consultation',
        quantity: parseInt(service.quantity || 1),
        sessions_completed: parseInt(service.sessions_completed || 0),
        status: service.status || 'pending',
        sequence_order: index,
      }));

    if (servicesData.length === 0) {
      console.log(
        'ℹ️ [syncAppointmentServices] Nenhum serviço válido para sincronizar após filtro',
      );
      return [];
    }

    console.log(
      '💾 [syncAppointmentServices] Inserindo',
      servicesData.length,
      'serviço(s):',
      servicesData,
    );

    // 3. Inserir novos serviços
    const { data: insertedServices, error: insertError } = await supabase
      .from('appointment_services')
      .insert(servicesData)
      .select();

    if (insertError) {
      console.error('❌ [syncAppointmentServices] Erro ao inserir:', insertError);
      throw insertError;
    }

    console.log(
      '✅ [syncAppointmentServices] Sucesso! Serviços sincronizados:',
      insertedServices?.length || 0,
    );
    return insertedServices || [];
  } catch (error) {
    console.error('❌ [syncAppointmentServices] ERRO FINAL:', error.message, error);
    throw error;
  }
}

/**
 * Atualizar sessões completadas de um serviço (para pacotes/sessões)
 * @param {string} appointmentServiceId - ID do serviço do agendamento
 * @param {number} completedSessions - Número de sessões completadas
 * @returns {Promise<Object>} Serviço atualizado
 */
export async function updateAppointmentServiceSessions(appointmentServiceId, completedSessions) {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .update({ sessions_completed: completedSessions })
      .eq('id', appointmentServiceId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Sessões atualizadas:', appointmentServiceId, '→', completedSessions);
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar sessões:', error);
    throw error;
  }
}
