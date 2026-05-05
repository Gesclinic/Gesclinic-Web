/**
 * agendaSuggestionsApi.js
 *
 * 💡 SISTEMA DE SUGESTÃO INTELIGENTE DE ENCAIXE
 *
 * Analisa agenda, indicadores e dados operacionais para gerar
 * sugestões de agendamento que aumentam ocupação e receita
 *
 * Tipos de sugestões:
 * - SLOT_LIVRE: Horário nobre disponível
 * - NO_SHOW: Falta confirmada com slot vago
 * - PROFISSIONAL_OCIOSO: Profissional sem atendimentos
 * - AGENDA_CRITICA: Ocupação ou receita abaixo de meta
 */

import { supabase } from '@/lib/customSupabaseClient';
import { listAppointments } from '@/lib/appointmentsApi';
import { getAgendaIndicators, getProfessionalIndicators } from '@/lib/indicatorsApi';
import { logAppointmentAudit, AUDIT_ACTION_TYPES } from '@/lib/auditApi';

/**
 * Tipos de sugestão disponíveis
 */
export const SUGGESTION_TYPES = {
  SLOT_LIVRE: 'SLOT_LIVRE',
  NO_SHOW: 'NO_SHOW',
  PROFISSIONAL_OCIOSO: 'PROFISSIONAL_OCIOSO',
  AGENDA_CRITICA: 'AGENDA_CRITICA',
};

/**
 * Níveis de prioridade
 */
export const PRIORITY_LEVELS = {
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  BAIXA: 'BAIXA',
};

/**
 * Tipos de ação sugerida
 */
export const SUGGESTED_ACTIONS = {
  VER_LISTA_ESPERA: 'VER_LISTA_ESPERA',
  CRIAR_ENCAIXE: 'CRIAR_ENCAIXE',
  CONTATAR_PACIENTE: 'CONTATAR_PACIENTE',
  OTIMIZAR_AGENDA: 'OTIMIZAR_AGENDA',
  IGNORAR: 'IGNORAR',
};

/**
 * Gerar sugestões inteligentes para um dia específico
 *
 * @param {string} clinicId - ID da clínica
 * @param {string} date - Data (YYYY-MM-DD)
 * @param {Object} config - Configurações opcionais
 * @returns {Promise<Array>} Array de sugestões
 */
export async function generateEncaixeSuggestions(clinicId, date, config = {}) {
  if (!clinicId || !date) {
    throw new Error('clinicId e date são obrigatórios');
  }

  try {
    const suggestions = [];

    // 1. Buscar dados necessários
    const [appointments, indicators, professionals, waitlist] = await Promise.all([
      listAppointments({
        clinicId,
        start: date + 'T00:00:00',
        end: date + 'T23:59:59',
      }),
      getAgendaIndicators(clinicId, date),
      getProfessionals(clinicId),
      getWaitlistByClinic(clinicId, 10), // Top 10 da lista de espera
    ]);

    // 2. Buscar configurações de horários nobres da clínica
    const nobleHours = (await getNobleHoursConfig(clinicId)) || getDefaultNobleHours();

    // 3. Análise 1: Slots livres em horários nobres
    const nobleSlotsAvailable = findNobleSlotsAvailable(
      appointments,
      professionals,
      date,
      nobleHours,
    );

    if (nobleSlotsAvailable.length > 0 && waitlist?.length > 0) {
      nobleSlotsAvailable.forEach((slot) => {
        suggestions.push({
          type: SUGGESTION_TYPES.SLOT_LIVRE,
          prioridade: PRIORITY_LEVELS.ALTA,
          horario: slot.time,
          profissional_id: slot.professionalId,
          profissional_nome: slot.professionalName,
          sala_id: slot.roomId,
          sala_nome: slot.roomName,
          mensagem: `Horário nobre disponível às ${slot.time} com ${slot.professionalName}. ${waitlist.length} pacientes na espera.`,
          acao: SUGGESTED_ACTIONS.VER_LISTA_ESPERA,
          metadata: {
            waitlistSize: waitlist.length,
            estimatedRevenue: slot.estimatedRevenue,
          },
        });
      });
    }

    // 4. Análise 2: Faltas confirmadas com slots vazios
    const noShowSuggestions = findNoShowFallbacks(appointments, professionals, date);
    suggestions.push(...noShowSuggestions);

    // 5. Análise 3: Profissionais ociosos
    if (indicators) {
      const idleProfessionals = findIdleProfessionals(
        appointments,
        professionals,
        indicators,
        date,
      );

      idleProfessionals.forEach((prof) => {
        suggestions.push({
          type: SUGGESTION_TYPES.PROFISSIONAL_OCIOSO,
          prioridade: PRIORITY_LEVELS.MEDIA,
          horario: prof.suggestedTime || 'Dia inteiro',
          profissional_id: prof.id,
          profissional_nome: prof.name,
          mensagem: `${prof.name} está sem atendimentos ${prof.suggestedTime ? `às ${prof.suggestedTime}` : 'neste período'}. Oportunidade para encaixe.`,
          acao: SUGGESTED_ACTIONS.CRIAR_ENCAIXE,
          metadata: {
            appointmentsToday: prof.appointmentsCount,
          },
        });
      });
    }

    // 6. Análise 4: Agenda crítica (ocupação ou receita baixa)
    if (indicators && waitlist?.length > 0) {
      const criticalSuggestions = generateCriticalAlerts(indicators, appointments, waitlist, date);
      suggestions.push(...criticalSuggestions);
    }

    // 7. Ordenar por prioridade
    suggestions.sort((a, b) => {
      const priorityOrder = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
      return priorityOrder[a.prioridade] - priorityOrder[b.prioridade];
    });

    return suggestions;
  } catch (err) {
    console.error('Erro ao gerar sugestões de encaixe:', err);
    return [];
  }
}

/**
 * Buscar profissionais da clínica
 */
async function getProfessionals(clinicId) {
  try {
    const { data, error } = await supabase
      .from('professionals')
      .select('id, name, specialization')
      .eq('clinic_id', clinicId)
      .eq('status', 'ativo');

    if (error) {
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar profissionais:', err);
    return [];
  }
}

/**
 * Buscar lista de espera da clínica
 */
async function getWaitlistByClinic(clinicId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        patient_id,
        lead_name,
        service_id,
        value,
        created_at
      `,
      )
      .eq('clinic_id', clinicId)
      .eq('status', 'em_espera')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar lista de espera:', err);
    return [];
  }
}

/**
 * Buscar configuração de horários nobres da clínica
 */
async function getNobleHoursConfig(clinicId) {
  try {
    const { data, error } = await supabase
      .from('clinic_settings')
      .select('noble_hours_config')
      .eq('clinic_id', clinicId)
      .single();

    if (error) {
      throw error;
    }
    return data?.noble_hours_config;
  } catch (err) {
    console.warn('Usando horários nobres padrão:', err);
    return null;
  }
}

/**
 * Horários nobres padrão (7h-9h, 12h-13h, 17h-18h)
 */
function getDefaultNobleHours() {
  return {
    slots: [
      { start: '07:00', end: '09:00' }, // Manhã cedo
      { start: '12:00', end: '13:00' }, // Meio dia
      { start: '17:00', end: '18:00' }, // Final da tarde
    ],
  };
}

/**
 * Encontrar slots livres em horários nobres
 */
function findNobleSlotsAvailable(appointments, professionals, date, nobleHours) {
  const slots = [];
  const appointmentsByTime = new Map();

  // Agrupar agendamentos por horário
  appointments.forEach((apt) => {
    const time = apt.start_time?.substring(0, 5);
    if (time) {
      if (!appointmentsByTime.has(time)) {
        appointmentsByTime.set(time, []);
      }
      appointmentsByTime.get(time).push(apt);
    }
  });

  // Verificar cada horário nobre
  nobleHours.slots.forEach((period) => {
    const [startHour, startMin] = period.start.split(':').map(Number);
    const [endHour, endMin] = period.end.split(':').map(Number);

    // Gerar slots de 30 em 30 minutos
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const appointmentsAtTime = appointmentsByTime.get(time) || [];

        // Verificar se há profissional disponível
        professionals.forEach((prof) => {
          const profAvailable = !appointmentsAtTime.some((apt) => apt.professional_id === prof.id);

          if (profAvailable) {
            slots.push({
              time,
              professionalId: prof.id,
              professionalName: prof.name,
              roomId: null,
              roomName: null,
              estimatedRevenue: 0, // Pode ser enriquecido com dados de preço
            });
          }
        });
      }
    }
  });

  return slots.slice(0, 5); // Retornar top 5
}

/**
 * Encontrar fallbacks para faltas confirmadas
 */
function findNoShowFallbacks(appointments, professionals, date) {
  const suggestions = [];

  const noShows = appointments.filter((apt) => apt.status === 'falta');

  noShows.forEach((noShow) => {
    if (noShow.professional_id) {
      const professional = professionals.find((p) => p.id === noShow.professional_id);
      if (professional) {
        suggestions.push({
          type: SUGGESTION_TYPES.NO_SHOW,
          prioridade: PRIORITY_LEVELS.ALTA,
          horario: noShow.start_time?.substring(0, 5),
          profissional_id: noShow.professional_id,
          profissional_nome: professional.name,
          mensagem: `Falta confirmada às ${noShow.start_time?.substring(0, 5)}. ${professional.name} terá horário livre. Procurar paciente na lista de espera?`,
          acao: SUGGESTED_ACTIONS.VER_LISTA_ESPERA,
          metadata: {
            noShowAppointmentId: noShow.id,
            patientId: noShow.patient_id,
          },
        });
      }
    }
  });

  return suggestions;
}

/**
 * Encontrar profissionais ociosos
 */
function findIdleProfessionals(appointments, professionals, indicators, date) {
  const idle = [];

  professionals.forEach((prof) => {
    const profAppointments = appointments.filter(
      (apt) => apt.professional_id === prof.id && apt.status !== 'cancelado',
    );

    // Menos de 2 atendimentos = ocioso
    if (profAppointments.length < 2) {
      idle.push({
        id: prof.id,
        name: prof.name,
        appointmentsCount: profAppointments.length,
        suggestedTime:
          profAppointments.length === 0 ? null : profAppointments[0].start_time?.substring(0, 5),
      });
    }
  });

  return idle;
}

/**
 * Gerar alertas para agenda crítica
 */
function generateCriticalAlerts(indicators, appointments, waitlist, date) {
  const suggestions = [];

  // Verificar taxa de ocupação
  if (indicators.occupancy_rate !== null && indicators.occupancy_rate < 40) {
    suggestions.push({
      type: SUGGESTION_TYPES.AGENDA_CRITICA,
      prioridade: PRIORITY_LEVELS.ALTA,
      horario: 'Dia inteiro',
      mensagem: `Taxa de ocupação abaixo de 40% (${(indicators.occupancy_rate * 100).toFixed(0)}%). Há ${waitlist.length} pacientes na lista de espera.`,
      acao: SUGGESTED_ACTIONS.VER_LISTA_ESPERA,
      metadata: {
        occupancyRate: indicators.occupancy_rate,
        revenue: indicators.estimated_revenue,
        appointments: appointments.length,
      },
    });
  }

  // Verificar receita estimada vs meta
  if (
    indicators.revenue_goal &&
    indicators.estimated_revenue &&
    indicators.estimated_revenue < indicators.revenue_goal * 0.7
  ) {
    suggestions.push({
      type: SUGGESTION_TYPES.AGENDA_CRITICA,
      prioridade: PRIORITY_LEVELS.MEDIA,
      horario: 'Dia inteiro',
      mensagem: `Receita estimada em ${(indicators.estimated_revenue || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })} (${Math.round((indicators.estimated_revenue / indicators.revenue_goal) * 100)}% da meta). ${waitlist.length} pacientes aguardando.`,
      acao: SUGGESTED_ACTIONS.OTIMIZAR_AGENDA,
      metadata: {
        revenueGoal: indicators.revenue_goal,
        estimatedRevenue: indicators.estimated_revenue,
        percentageOfGoal: (indicators.estimated_revenue / indicators.revenue_goal) * 100,
      },
    });
  }

  return suggestions;
}

/**
 * Registrar que uma sugestão foi executada (para auditoria)
 */
export async function logSuggestionAction({
  suggestionType,
  clinicId,
  appointmentId = null,
  action = null,
  result = null,
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('suggestion_audit_logs').insert([
      {
        clinic_id: clinicId,
        suggestion_type: suggestionType,
        appointment_id: appointmentId,
        action_taken: action,
        result: result,
        executed_by: user?.id || null,
        executed_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('Erro ao registrar ação de sugestão:', error);
    }
  } catch (err) {
    console.error('Erro ao logar ação de sugestão:', err);
  }
}

/**
 * Obter histórico de sugestões executadas
 */
export async function getSuggestionHistory(clinicId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('suggestion_audit_logs')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('executed_at', startDate.toISOString())
      .order('executed_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar histórico de sugestões:', err);
    return [];
  }
}
