// Atualiza agendamento existente
export async function atualizarAgendamento(agendamentoId, payload) {
  const {
    date,
    startTime,
    endTime,
    pacienteId,
    profissionalId,
    servicoId,
    salaId,
    convenioId,
    status,
    observacoes,
  } = payload;
  console.log('[atualizarAgendamento] payload:', payload);
  const { error } = await supabase
    .from('appointments')
    .update({
      scheduled_date: date,
      scheduled_time: startTime,
      end_time: endTime,
      patient_id: pacienteId,
      professional_id: profissionalId || null,
      service_id: servicoId || null,
      room_id: salaId || null,
      payer_id: convenioId !== '' ? convenioId : null,
      status,
      notes: observacoes || null,
    })
    .eq('id', agendamentoId);
  console.log('[atualizarAgendamento] resultado:', { error });
  if (error) {
    throw error;
  }
  return true;
}
// Busca agendamento por ID (completo, para modal de detalhes)
export async function buscarAgendamentoPorId(agendamentoId) {
  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      *,
      patient:patient_id (id, name, phone, email, cpf),
      professional:professional_id (id, name, specialty, register),
      service:service_id (id, name, type, duration, value),
      room:room_id (id, name, type, unit),
      payer:payer_id (id, name),
      plan:plan_id (id, name),
      updated_at,
      notes,
      internal_notes
    `,
    )
    .eq('id', agendamentoId)
    .single();
  return { data, error };
}
// Lista pacientes da clínica
export async function listarPacientes({ clinicId }) {
  const { data, error } = await supabase
    .from('patients')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true });
  return data || [];
}

// Lista profissionais ativos da clínica
export async function listarProfissionais({ clinicId }) {
  const { data, error } = await supabase
    .from('professionals')
    .select('id, name, active')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('name', { ascending: true });
  return (data || []).filter((p) => p.active);
}

// Lista serviços vinculados ao profissional
export async function listarServicosPorProfissional({ profissionalId }) {
  const { data, error } = await supabase
    .from('professional_services')
    .select('service:service_id(id, name, duration)')
    .eq('professional_id', profissionalId);
  return (data || []).map((ps) => ps.service);
}

// Lista salas da clínica
export async function listarSalas({ clinicId }) {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true });
  return data || [];
}

// Lista convênios da clínica
export async function listarConvenios({ clinicId }) {
  const { data, error } = await supabase
    .from('payers')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true });
  return data || [];
}

// Lista planos vinculados ao convênio
export async function listarPlanosPorConvenio({ convenioId }) {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name')
    .eq('payer_id', convenioId)
    .order('name', { ascending: true });
  return data || [];
}

// Cria novo agendamento
export async function criarAgendamento(payload) {
  // Monta objeto para tabela appointments
  const {
    clinicId,
    date,
    startTime,
    endTime,
    pacienteId,
    profissionalId,
    servicoId,
    salaId,
    convenioId,
    status,
    observacoes,
  } = payload;
  const { error } = await supabase.from('appointments').insert([
    {
      clinic_id: clinicId,
      scheduled_date: date,
      scheduled_time: startTime,
      end_time: endTime,
      patient_id: pacienteId,
      professional_id: profissionalId || null,
      service_id: servicoId || null,
      room_id: salaId || null,
      payer_id: convenioId || null,
      status,
      notes: observacoes || null,
    },
  ]);
  if (error) {
    throw error;
  }
  return true;
}
// src/services/agendaService.js
// Serviço responsável por buscar agendamentos do Supabase
import { supabase } from '../lib/customSupabaseClient';

/**
 * Busca agendamentos da tabela appointments, filtrando por clínica e data.
 * Retorna dados crus do Supabase, incluindo relacionamentos.
 * @param {Object} params
 * @param {string|number} params.clinicId
 * @param {string} params.date - Data no formato 'YYYY-MM-DD'
 * @returns {Promise<{ data: any[], error: any }>} Dados crus do Supabase
 */
export async function listarAgenda({ clinicId, date }) {
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;

  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      scheduled_date,
      scheduled_time,
      end_time,
      status,
      patient:patient_id (*),
      professional:professional_id (*),
      service:service_id (*),
      room:room_id (*),
      payer:payer_id (*)
    `,
    )
    .eq('clinic_id', clinicId)
    .gte('scheduled_date', start)
    .lte('scheduled_date', end);

  // DEBUG: logar resultado para diagnóstico
  console.log('[listarAgenda] params:', { clinicId, date, start, end });
  console.log('[listarAgenda] resultado:', { data, error });

  return { data, error };
}
