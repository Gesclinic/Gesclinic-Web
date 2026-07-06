import { supabase } from '@/lib/customSupabaseClient.js';
import { APPOINTMENT_COLUMNS_SAFE } from '@/lib/appointmentsColumns';

const norm = (v) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const createInFlight = new Map();

const buildCreateKey = (clinicId, body) =>
  [clinicId, body.patient_id || norm(body.patient_name), body.start_time].join('|');

const toDbStatus = (s) => {
  if (s == null || s === '') {
    return undefined;
  }
  const k = norm(s);
  const map = {
    livre: 'scheduled', // Livre vira agendado
    free: 'scheduled',
    scheduled: 'scheduled',
    confirmed: 'confirmed',
    present: 'present',
    in_office: 'in_office',
    attended: 'attended',
    no_show: 'no_show',
    cancelled: 'cancelled',
    agendado: 'scheduled',
    confirmado: 'confirmed',
    presente: 'present',
    'em consultorio': 'in_office',
    concluido: 'attended',
    'nao compareceu': 'no_show',
    cancelado: 'cancelled',
  };
  return map[k] ?? 'scheduled';
};

const toIso = (v) => {
  if (v == null || v === '') {
    return undefined;
  }
  // Se vier string, retorna como está (frontend já converte para UTC)
  if (typeof v === 'string') {
    return v;
  }
  // Se vier Date, retorna como ISO
  if (v instanceof Date) {
    return v.toISOString();
  }
  return undefined;
};

const toNumberOrNull = (v) => {
  if (v == null || v === '') {
    return null;
  }
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const isStatusCheckError = (err) =>
  /status/i.test(err?.message || '') &&
  /check constraint|invalid input value/i.test(err?.message || '');

const isOverlapError = (err) =>
  err?.code === '23P01' || /no_overlaps_per_professional/i.test(err?.message || '');

function normalizeAppointmentPayload(payload, { includeClinicId = false, clinicId } = {}) {
  const p = {};

  for (const key of ['patient_id', 'professional_id', 'service_id', 'payer_id', 'plan_id']) {
    if (key in payload && payload[key] && payload[key] !== 'NONE') {
      p[key] = payload[key];
    }
  }

  // Incluir patient_name para pacientes não cadastrados
  if ('patient_name' in payload && payload.patient_name) {
    p.patient_name = payload.patient_name.trim();
  }

  // Incluir outros campos simples
  for (const key of ['notes', 'is_blocked', 'discount']) {
    if (key in payload) {
      if (key === 'discount') {
        p[key] = toNumberOrNull(payload[key]);
      } else if (key === 'is_blocked') {
        p[key] = Boolean(payload[key]);
      } else {
        p[key] = payload[key];
      }
    }
  }

  if ('price' in payload) {
    p.price = toNumberOrNull(payload.price);
  }

  if ('start_time' in payload) {
    p.start_time = toIso(payload.start_time) ?? null;
  }
  if ('end_time' in payload) {
    p.end_time = toIso(payload.end_time) ?? null;
  }

  if ('start' in payload && !('start_time' in payload)) {
    p.start_time = toIso(payload.start) ?? null;
  }
  if ('end' in payload && !('end_time' in payload)) {
    p.end_time = toIso(payload.end) ?? null;
  }

  if ('status' in payload) {
    const dbStatus = toDbStatus(payload.status);
    if (dbStatus) {
      p.status = dbStatus;
    } else if (payload.status == null) {
      p.status = null;
    }
  }

  if (includeClinicId) {
    p.clinic_id = clinicId;
  }

  Object.keys(p).forEach((k) => {
    if (p[k] === undefined || p[k] === null || p[k] === 'NONE') {
      p[k] = null;
    }
  });

  return p;
}

const RETURN_COLUMNS = APPOINTMENT_COLUMNS_SAFE;

async function findExistingAppointment(clinicId, body) {
  let query = supabase
    .from('appointments')
    .select(RETURN_COLUMNS)
    .eq('clinic_id', clinicId)
    .eq('start_time', body.start_time)
    .not('status', 'in', '(canceled,cancelado,cancelled)')
    .limit(1);

  if (body.patient_id) {
    query = query.eq('patient_id', body.patient_id);
  } else if (body.patient_name) {
    query = query.eq('patient_name', body.patient_name);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data || null;
}

/* ------------------------------------------------------------
 * CREATE
 * ------------------------------------------------------------ */
export async function createAppointment(clinicId, payload) {
  if (!clinicId) {
    throw new Error('Clínica não selecionada.');
  }

  const body = normalizeAppointmentPayload(payload, { includeClinicId: true, clinicId });

  if (!body.professional_id) {
    throw new Error('Profissional é obrigatório para salvar o agendamento.');
  }
  if (!body.start_time) {
    throw new Error('Informe a data/hora de início do agendamento.');
  }
  if (!body.end_time) {
    throw new Error('Informe a data/hora de término do agendamento.');
  }
  if (new Date(body.end_time) <= new Date(body.start_time)) {
    throw new Error('Horário final deve ser maior que o inicial.');
  }
  if (!('status' in body) || body.status == null) {
    body.status = 'scheduled';
  }

  const createKey = buildCreateKey(clinicId, body);
  if (createInFlight.has(createKey)) {
    return createInFlight.get(createKey);
  }

  const createPromise = (async () => {
    const existing = await findExistingAppointment(clinicId, body);
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(body)
      .select(RETURN_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    return data;
  })().finally(() => {
    createInFlight.delete(createKey);
  });

  createInFlight.set(createKey, createPromise);

  try {
    return await createPromise;
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    if (isOverlapError(error)) {
      throw new Error(
        'Conflito de horário: já existe um agendamento para este profissional no intervalo escolhido.',
      );
    }
    if (isStatusCheckError(error)) {
      throw new Error(
        'Status inválido. Use: scheduled, confirmed, present, in_office, attended, no_show ou cancelled.',
      );
    }
    if (error.code === '23502' && /professional_id/i.test(error.message || '')) {
      throw new Error('Profissional é obrigatório para salvar o agendamento.');
    }
    throw new Error(`Falha ao criar agendamento: ${error.message}`);
  }
}

/* ------------------------------------------------------------
 * UPDATE
 * ------------------------------------------------------------ */
export async function updateAppointment(id, clinicId, payload) {
  if (!id || !clinicId) {
    throw new Error('ID do agendamento e da clínica são obrigatórios.');
  }

  // 🧩 Evita update de slots livres com id fake
  if (String(id).startsWith('free-')) {
    console.warn('[updateAppointment] Ignorado: slot livre não possui ID real:', id);
    return null;
  }

  const body = normalizeAppointmentPayload(payload, { includeClinicId: false, clinicId });

  if ('start_time' in body && !body.start_time) {
    throw new Error('Informe a data/hora de início do agendamento.');
  }
  if ('end_time' in body && !body.end_time) {
    throw new Error('Informe a data/hora de término do agendamento.');
  }
  if (body.start_time && body.end_time && new Date(body.end_time) <= new Date(body.start_time)) {
    throw new Error('Horário final deve ser maior que o inicial.');
  }

  if (Object.keys(body).length === 0) {
    return await getAppointmentById(id, clinicId);
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(body)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select(RETURN_COLUMNS);

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];

  if (error) {
    console.error('Erro ao atualizar agendamento:', error);
    if (isOverlapError(error)) {
      throw new Error(
        'Conflito de horário: já existe um agendamento para este profissional no intervalo escolhido.',
      );
    }
    if (isStatusCheckError(error)) {
      throw new Error(
        'Status inválido. Use: scheduled, confirmed, present, in_office, attended, no_show ou cancelled.',
      );
    }
    throw new Error(`Falha ao atualizar agendamento: ${error.message}`);
  }

  return data;
}

/* ------------------------------------------------------------
 * DELETE
 * ------------------------------------------------------------ */
export async function deleteAppointment(id, clinicId) {
  if (!id || !clinicId) {
    throw new Error('ID do agendamento e da clínica são obrigatórios.');
  }

  // 🧩 Evita tentar deletar slots livres
  if (String(id).startsWith('free-')) {
    console.warn('[deleteAppointment] Ignorado: slot livre não possui ID real:', id);
    return null;
  }

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('clinic_id', clinicId);

  if (error) {
    console.error('Erro ao deletar agendamento:', error);
    if (error.code === '42501') {
      throw new Error('Você não tem permissão para excluir este agendamento.');
    }
    throw new Error(`Falha ao deletar agendamento: ${error.message}`);
  }

  return true;
}

/* ------------------------------------------------------------
 * GET BY ID
 * ------------------------------------------------------------ */
async function getAppointmentById(id, clinicId) {
  if (String(id).startsWith('free-')) {
    console.warn('[getAppointmentById] Ignorado: slot livre não possui ID real:', id);
    return null;
  }

  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      *,
      patients:patient_id(id, name, document_id, phone, cell_phone, prontuario_numero),
      professionals:professional_id(id, name),
      services:service_id(id, name, code, tuss_code),
      rooms:room_id(id, name),
      payers:payer_id(id, name, active),
      plans:plan_id(id, name, code)
    `,
    )
    .eq('id', id)
    .eq('clinic_id', clinicId);

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];

  if (error) {
    throw new Error(`Falha ao ler agendamento: ${error.message}`);
  }
  return data;
}
