// src/lib/agendaRulesApi.js
// ============================================================
// API - Regras de Agendamento
// ============================================================

import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

/**
 * Lista todas as regras de agenda de uma clínica
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listAgendaRules(clinicId) {
  const { data, error } = await supabase
    .from('agenda_rules')
    .select(
      `
      id,
      service_id,
      default_duration_minutes,
      interval_minutes,
      max_days_in_future,
      min_days_in_advance,
      allow_same_day_booking,
      requires_specific_professional,
      requires_specific_room,
      max_per_day,
      requires_clinic_confirmation,
      active,
      services(code, name)
    `,
    )
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('services(name)', { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar regras: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Obtém regra de agenda de um serviço
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<Object|null>}
 */
export async function getAgendaRule(serviceId, clinicId) {
  const { data, error } = await supabase
    .from('agenda_rules')
    .select(
      `
      id,
      service_id,
      default_duration_minutes,
      interval_minutes,
      max_days_in_future,
      min_days_in_advance,
      allow_same_day_booking,
      requires_specific_professional,
      requires_specific_room,
      max_per_day,
      requires_clinic_confirmation,
      active
    `,
    )
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao obter regra: ${error.message}`);
  }
  return data;
}

/**
 * Cria nova regra de agenda
 * @param {string} serviceId
 * @param {string} clinicId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createAgendaRule(serviceId, clinicId, data) {
  const {
    default_duration_minutes = 30,
    interval_minutes = 0,
    max_days_in_future = null,
    min_days_in_advance = 0,
    allow_same_day_booking = true,
    requires_specific_professional = false,
    requires_specific_room = false,
    max_per_day = null,
    requires_clinic_confirmation = false,
  } = data;

  // Verificar se já existe
  const existing = await supabase
    .from('agenda_rules')
    .select('id')
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (existing.data) {
    throw new Error('Regra de agenda para este serviço já existe');
  }

  const { data: rule, error } = await supabase
    .from('agenda_rules')
    .insert([
      {
        service_id: serviceId,
        clinic_id: clinicId,
        default_duration_minutes,
        interval_minutes,
        max_days_in_future,
        min_days_in_advance,
        allow_same_day_booking,
        requires_specific_professional,
        requires_specific_room,
        max_per_day,
        requires_clinic_confirmation,
        active: true,
      },
    ])
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao criar regra: ${error.message}`);
  }
  return rule;
}

/**
 * Atualiza regra de agenda
 * @param {string} serviceId
 * @param {string} clinicId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateAgendaRule(serviceId, clinicId, updates) {
  const { data, error } = await supabase
    .from('agenda_rules')
    .update(updates)
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .select();

  if (error) {
    throw new Error(`Falha ao atualizar regra: ${error.message}`);
  }

  // Handle array response (query may return 0+ rows, not 1)
  if (!data || data.length === 0) {
    throw new Error('Regra não encontrada');
  }

  return data[0]; // Return first match (or consider filtering by id if exists)
}

/**
 * Desativa regra (não deleta)
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function deactivateAgendaRule(serviceId, clinicId) {
  const { data, error } = await supabase
    .from('agenda_rules')
    .update({ active: false })
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .select();

  if (error) {
    throw new Error(`Falha ao desativar regra: ${error.message}`);
  }

  // Handle array response
  if (!data || data.length === 0) {
    throw new Error('Regra não encontrada');
  }

  return data[0];
}

/** Desativa uma regra pelo ID, sempre limitada à clínica ativa. */
export async function deleteAgendaRule(id, clinicId) {
  if (!id || !clinicId) throw new Error('Regra ou clínica não informada');
  const { data, error } = await supabase
    .from('agenda_rules')
    .update({ active: false })
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Falha ao desativar regra: ${error.message}`);
  if (!data) throw new Error('Regra não encontrada');
  return data;
}

/**
 * Valida se data/hora pode ser agendada (baseado em regras)
 * @param {string} serviceId
 * @param {string} clinicId
 * @param {Date} scheduledDate
 * @returns {Promise<{valid: boolean, errors: Array}>}
 */
export async function validateSchedulingByRules(serviceId, clinicId, scheduledDate) {
  const errors = [];
  const rule = await getAgendaRule(serviceId, clinicId);

  if (!rule) {
    return {
      valid: false,
      errors: ['Nenhuma regra de agendamento definida para este serviço'],
    };
  }

  const now = new Date();
  const daysFromNow = Math.floor((scheduledDate - now) / (1000 * 60 * 60 * 24));

  // Validar min_days_in_advance
  if (daysFromNow < rule.min_days_in_advance) {
    errors.push(`Deve agendar com pelo menos ${rule.min_days_in_advance} dia(s) de antecedência`);
  }

  // Validar max_days_in_future
  if (rule.max_days_in_future && daysFromNow > rule.max_days_in_future) {
    errors.push(
      `Não é possível agendar com mais de ${rule.max_days_in_future} dias de antecedência`,
    );
  }

  // Validar same_day_booking
  if (daysFromNow === 0 && !rule.allow_same_day_booking) {
    errors.push('Não é permitido agendar para o mesmo dia');
  }

  return {
    valid: errors.length === 0,
    errors,
    rule,
  };
}

/**
 * Obtém duração padrão de atendimento (por regra)
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<number>}
 */
export async function getDefaultDuration(serviceId, clinicId) {
  const rule = await getAgendaRule(serviceId, clinicId);
  return rule?.default_duration_minutes || 30;
}

/**
 * Calcula fim do atendimento
 * @param {Date} startTime
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<Date>}
 */
export async function calculateEndTime(startTime, serviceId, clinicId) {
  const durationMinutes = await getDefaultDuration(serviceId, clinicId);

  // Handle string time format (HH:MM) or Date object
  let startDate;
  if (typeof startTime === 'string') {
    // Parse "HH:MM" string to minutes
    const [hours, minutes] = startTime.split(':').map(Number);
    startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
  } else {
    startDate = startTime;
  }

  return new Date(startDate.getTime() + durationMinutes * 60000);
}

/**
 * Verifica se pode agendar múltiplos slots
 * @param {string} serviceId
 * @param {string} clinicId
 * @param {Date} date
 * @returns {Promise<number>}
 */
export async function getRemainingSlots(serviceId, clinicId, date) {
  const rule = await getAgendaRule(serviceId, clinicId);

  if (!rule?.max_per_day) {
    return 999; // Sem limite
  }

  // Contar agendamentos confirmados para este dia
  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact' })
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .eq('scheduled_date', date)
    .in('status', ['scheduled', 'confirmed', 'in_progress']);

  if (error) {
    throw error;
  }

  return Math.max(0, rule.max_per_day - (count || 0));
}

/**
 * Conta quantas regras estão configuradas
 * @param {string} clinicId
 * @returns {Promise<number>}
 */
export async function countAgendaRules(clinicId) {
  const { count, error } = await supabase
    .from('agenda_rules')
    .select('id', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .eq('active', true);

  if (error) {
    throw error;
  }
  return count || 0;
}

/**
 * Obtém serviços sem regra de agenda
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listServicesWithoutRules(clinicId) {
  const { data, error } = await supabase
    .from('services')
    .select('id, code, name')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .not(
      'id',
      'in',
      `(SELECT service_id FROM agenda_rules WHERE clinic_id = '${clinicId}' AND active = true)`,
    );

  if (error) {
    throw error;
  }
  return data ?? [];
}

// Alias para compatibilidade com páginas que chamam getAgendaRules
export const getAgendaRules = listAgendaRules;
