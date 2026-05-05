/**
 * Financial Priority Suggestion API
 *
 * Sistema de Sugestão por Prioridade Financeira
 * Calcula score de viabilidade financeira de encaixes baseado em:
 * - Valor do serviço
 * - Tipo de pagamento (PARTICULAR > CONVENIO)
 * - Duração do serviço (receita/hora)
 * - Margem estimada (receita líquida)
 * - Histórico de no-show do paciente (risco)
 * - Tipo de atendimento
 *
 * Score: 0-100 (quanto maior, melhor o retorno financeiro)
 * Não persiste scores - calcula em tempo real
 */

import { customSupabaseClient as supabase } from './customSupabaseClient';
import { listAppointments } from './appointmentsApi';
import { getAgendaIndicators } from './indicatorsApi';

// ============================================================================
// CONSTANTS
// ============================================================================

export const PAYMENT_TYPES = {
  PARTICULAR: 'particular',
  CONVENIO: 'convenio',
  PLANO: 'plano',
};

export const SERVICE_TYPES = {
  CONSULTA: 'consulta',
  EXAME: 'exame',
  PROCEDIMENTO: 'procedimento',
  RETORNO: 'retorno',
};

// Pesos padrão (podem ser sobrescritos por clínica)
export const DEFAULT_WEIGHTS = {
  valor_servico: 0.3, // 30% do score é baseado no valor
  margem_estimada: 0.35, // 35% baseado na margem
  receita_por_hora: 0.2, // 20% baseado em receita/hora
  tipo_pagamento: 0.1, // 10% bônus por tipo (PARTICULAR)
  tipo_atendimento: 0.05, // 5% ajuste por tipo (procedimentos worth more)
};

// Penalidades por histórico de no-show
export const NO_SHOW_PENALTIES = {
  0: 1.0, // Sem no-show: 100% do score
  1: 0.85, // 1 no-show: -15%
  2: 0.7, // 2 no-shows: -30%
  3: 0.5, // 3+ no-shows: -50%
};

// Multiplicadores por tipo de pagamento
export const PAYMENT_TYPE_MULTIPLIERS = {
  [PAYMENT_TYPES.PARTICULAR]: 1.2, // +20% PARTICULAR é mais seguro
  [PAYMENT_TYPES.PLANO]: 1.0, // Neutro
  [PAYMENT_TYPES.CONVENIO]: 0.85, // -15% CONVENIO tem repasse menor
};

// Multiplicadores por tipo de atendimento
export const SERVICE_TYPE_MULTIPLIERS = {
  [SERVICE_TYPES.PROCEDIMENTO]: 1.3, // +30% Procedimentos mais lucrativos
  [SERVICE_TYPES.EXAME]: 1.15, // +15% Exames
  [SERVICE_TYPES.CONSULTA]: 1.0, // Neutro
  [SERVICE_TYPES.RETORNO]: 0.8, // -20% Retornos menos rentáveis
};

export const PRIORITY_LEVELS = {
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  BAIXA: 'BAIXA',
};

// ============================================================================
// MAIN FUNCTION: Calculate Financial Priority Score
// ============================================================================

/**
 * Calcula score de prioridade financeira (0-100)
 *
 * @param {Object} params
 * @param {number} params.valor_servico - Valor do serviço em R$
 * @param {string} params.tipo_pagamento - PARTICULAR | CONVENIO | PLANO
 * @param {number} params.duracao_servico - Duração em minutos
 * @param {number} params.margem_estimada - Margem líquida (valor - repasse)
 * @param {number} params.no_show_count - Quantidade de no-shows histórico
 * @param {string} params.tipo_atendimento - CONSULTA | EXAME | PROCEDIMENTO | RETORNO
 * @param {Object} params.weights - Pesos customizados (opcional)
 * @returns {number} Score 0-100
 */
export function calculateFinancialPriorityScore(params) {
  const {
    valor_servico = 0,
    tipo_pagamento = PAYMENT_TYPES.PARTICULAR,
    duracao_servico = 30,
    margem_estimada = 0,
    no_show_count = 0,
    tipo_atendimento = SERVICE_TYPES.CONSULTA,
    weights = DEFAULT_WEIGHTS,
  } = params;

  // Validação de entrada
  if (!valor_servico || !duracao_servico) {
    console.warn('[Financial Score] Valor ou duração inválidos', params);
    return 0;
  }

  // ========================================
  // CÁLCULO DOS SUB-SCORES
  // ========================================

  // 1. Score de Valor (0-100)
  // Normalizar por valor máximo esperado (R$ 500)
  const maxValor = 500;
  const scoreValor = Math.min((valor_servico / maxValor) * 100, 100);

  // 2. Score de Margem (0-100)
  // Normalizar por margem máxima esperada (R$ 300)
  const maxMargem = 300;
  const scoreMargem = Math.min((margem_estimada / maxMargem) * 100, 100);

  // 3. Score de Receita por Hora
  // Quanto maior a receita por hora, melhor
  // Exemplo: R$ 100 em 30min = R$ 200/hora
  const receitaPorHora = valor_servico / (duracao_servico / 60);
  const maxReceitaHora = 400; // R$ 400/hora = score 100
  const scoreReceitaPorHora = Math.min((receitaPorHora / maxReceitaHora) * 100, 100);

  // 4. Multiplicador de Tipo de Pagamento
  const multiplierPagamento = PAYMENT_TYPE_MULTIPLIERS[tipo_pagamento] || 1.0;

  // 5. Multiplicador de Tipo de Atendimento
  const multiplierAtendimento = SERVICE_TYPE_MULTIPLIERS[tipo_atendimento] || 1.0;

  // 6. Penalidade por No-Show
  const penaltyNoShow =
    NO_SHOW_PENALTIES[Math.min(no_show_count, Object.keys(NO_SHOW_PENALTIES).length - 1)] || 0.5;

  // ========================================
  // SCORE FINAL
  // ========================================

  let score =
    scoreValor * weights.valor_servico +
    scoreMargem * weights.margem_estimada +
    scoreReceitaPorHora * weights.receita_por_hora +
    (multiplierPagamento - 1) * 100 * weights.tipo_pagamento +
    (multiplierAtendimento - 1) * 100 * weights.tipo_atendimento;

  // Aplicar penalidade de no-show
  score = score * penaltyNoShow;

  // Garantir que score está entre 0 e 100
  score = Math.max(0, Math.min(100, score));

  return Math.round(score);
}

// ============================================================================
// Helper: Get Payment Type Multiplier
// ============================================================================

export function getPaymentTypeMultiplier(tipoPagamento) {
  return PAYMENT_TYPE_MULTIPLIERS[tipoPagamento] || 1.0;
}

// ============================================================================
// Helper: Get Service Type Multiplier
// ============================================================================

export function getServiceTypeMultiplier(tipoAtendimento) {
  return SERVICE_TYPE_MULTIPLIERS[tipoAtendimento] || 1.0;
}

// ============================================================================
// Helper: Get Priority Level from Score
// ============================================================================

export function getPriorityLevelFromScore(score) {
  if (score >= 75) {
    return PRIORITY_LEVELS.ALTA;
  }
  if (score >= 50) {
    return PRIORITY_LEVELS.MEDIA;
  }
  return PRIORITY_LEVELS.BAIXA;
}

// ============================================================================
// Helper: Get Patient No-Show History
// ============================================================================

async function getPatientNoShowHistory(clinicId, patientId) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('status')
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .eq('status', 'falta');

    if (error) {
      throw error;
    }

    return data?.length || 0;
  } catch (error) {
    console.warn('[Financial Score] Erro ao obter histórico no-show:', error);
    return 0;
  }
}

// ============================================================================
// Helper: Get Clinic Weights Configuration
// ============================================================================

async function getClinicWeights(clinicId) {
  try {
    const { data, error } = await supabase
      .from('clinic_settings')
      .select('financial_weights_config')
      .eq('clinic_id', clinicId)
      .single();

    if (error || !data?.financial_weights_config) {
      return DEFAULT_WEIGHTS;
    }

    return { ...DEFAULT_WEIGHTS, ...data.financial_weights_config };
  } catch (error) {
    console.warn('[Financial Score] Erro ao obter pesos de clínica:', error);
    return DEFAULT_WEIGHTS;
  }
}

// ============================================================================
// Helper: Get Service Details
// ============================================================================

async function getServiceDetails(serviceId) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select(
        `id, 
         name, 
         value,
         duration_minutes,
         type,
         default_repasse,
         is_active`,
      )
      .eq('id', serviceId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.warn('[Financial Score] Erro ao obter serviço:', error);
    return null;
  }
}

// ============================================================================
// Helper: Get Waitlist Patients
// ============================================================================

async function getWaitlistPatients(clinicId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .select(
        `id,
         patient_id,
         service_id,
         preferred_date,
         priority_level,
         created_at,
         patients:patient_id(id, name, email, phone),
         services:service_id(id, name, value, duration_minutes, type)`,
      )
      .eq('clinic_id', clinicId)
      .eq('status', 'ativo')
      .order('priority_level', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.warn('[Financial Score] Erro ao obter lista de espera:', error);
    return [];
  }
}

// ============================================================================
// Helper: Get Professional Availability
// ============================================================================

async function getProfessionalAvailability(clinicId, date, durationMinutes) {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(
        `id,
         professional_id,
         start_time,
         end_time,
         status,
         professionals:professional_id(id, name, specialization)`,
      )
      .eq('clinic_id', clinicId)
      .eq('date', date)
      .in('status', ['agendado', 'confirmado', 'realizado']);

    if (error) {
      throw error;
    }

    // Grupos por profissional
    const slots = {};

    if (appointments) {
      appointments.forEach((apt) => {
        const profId = apt.professional_id;
        if (!slots[profId]) {
          slots[profId] = {
            professional: apt.professionals,
            appointments: [],
          };
        }
        slots[profId].appointments.push({
          start: apt.start_time,
          end: apt.end_time,
        });
      });
    }

    return slots;
  } catch (error) {
    console.warn('[Financial Score] Erro ao obter disponibilidade:', error);
    return {};
  }
}

// ============================================================================
// Helper: Find Available Slots
// ============================================================================

function findAvailableSlots(
  appointments,
  workdayStart = '08:00',
  workdayEnd = '18:00',
  durationMinutes = 30,
) {
  const slots = [];
  const workStart = timeToMinutes(workdayStart);
  const workEnd = timeToMinutes(workdayEnd);

  // Converter appointments para minutos
  const busy = appointments
    .map((apt) => ({
      start: timeToMinutes(apt.start),
      end: timeToMinutes(apt.end),
    }))
    .sort((a, b) => a.start - b.start);

  let currentTime = workStart;

  for (const appointment of busy) {
    // Slot livre antes de appointment
    if (currentTime + durationMinutes <= appointment.start) {
      slots.push({
        start: minutesToTime(currentTime),
        end: minutesToTime(currentTime + durationMinutes),
        duration: durationMinutes,
      });
    }
    currentTime = Math.max(currentTime, appointment.end);
  }

  // Slot livre após ultimo appointment
  if (currentTime + durationMinutes <= workEnd) {
    slots.push({
      start: minutesToTime(currentTime),
      end: minutesToTime(currentTime + durationMinutes),
      duration: durationMinutes,
    });
  }

  return slots;
}

// ============================================================================
// Helper: Time Conversion
// ============================================================================

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// ============================================================================
// MAIN SERVICE: Generate Financial Priority Suggestions
// ============================================================================

/**
 * Gera sugestões ranqueadas por prioridade financeira
 *
 * @param {string} clinicId - ID da clínica
 * @param {string} date - Data no formato YYYY-MM-DD
 * @param {Object} config - Configurações
 * @param {number} config.limit - Número máximo de sugestões (default: 5)
 * @param {string} config.minPriority - Prioridade mínima (BAIXA, MEDIA, ALTA)
 * @returns {Promise<Array>} Array de sugestões ordenadas por score
 */
export async function generateFinancialPrioritySuggestions(clinicId, date, config = {}) {
  const { limit = 5, minPriority = PRIORITY_LEVELS.BAIXA } = config;

  try {
    // 1. Obter configurações da clínica
    const weights = await getClinicWeights(clinicId);

    // 2. Obter pacientes em lista de espera
    const waitlistPatients = await getWaitlistPatients(clinicId, limit * 2);

    if (!waitlistPatients.length) {
      console.log('[Financial Suggestions] Nenhum paciente em lista de espera');
      return [];
    }

    // 3. Obter disponibilidade de profissionais
    const professionalSlots = await getProfessionalAvailability(clinicId, date, 30);

    // 4. Calcular scores para cada combinação possível
    const suggestions = [];

    for (const waitlistItem of waitlistPatients) {
      // Validar dados
      if (!waitlistItem.patient_id || !waitlistItem.service_id) {
        continue;
      }

      // Obter detalhes do serviço
      const service = await getServiceDetails(waitlistItem.service_id);
      if (!service) {
        continue;
      }

      // Obter histórico de no-show do paciente
      const noShowCount = await getPatientNoShowHistory(clinicId, waitlistItem.patient_id);

      // Calcular margem estimada
      const valorServico = service.value || 0;
      const repasse = service.default_repasse || 0;
      const margemEstimada = Math.max(0, valorServico - repasse);

      // Calcular score financeiro
      const scoreFinanceiro = calculateFinancialPriorityScore({
        valor_servico: valorServico,
        tipo_pagamento: PAYMENT_TYPES.PARTICULAR, // Default, poderia vir de patient preferences
        duracao_servico: service.duration_minutes || 30,
        margem_estimada: margemEstimada,
        no_show_count: noShowCount,
        tipo_atendimento: service.type || SERVICE_TYPES.CONSULTA,
        weights,
      });

      // Obter prioridade
      const prioridade = getPriorityLevelFromScore(scoreFinanceiro);

      // Criar sugestão
      suggestions.push({
        id: `${waitlistItem.id}-${service.id}`,
        waitlist_id: waitlistItem.id,
        patient_id: waitlistItem.patient_id,
        patient_name: waitlistItem.patients?.name || 'Desconhecido',
        service_id: service.id,
        service_name: service.name,
        service_type: service.type,
        valor_estimado: valorServico,
        margem_estimada: margemEstimada,
        duracao_minutos: service.duration_minutes,
        score_financeiro: scoreFinanceiro,
        prioridade,
        no_show_historico: noShowCount,
        justificativa: generateJustification({
          score: scoreFinanceiro,
          valor: valorServico,
          margem: margemEstimada,
          duracao: service.duration_minutes,
          noShow: noShowCount,
          tipo: service.type,
        }),
        created_at: new Date().toISOString(),
      });
    }

    // 5. Filtrar por prioridade mínima
    const priorityOrder = [PRIORITY_LEVELS.ALTA, PRIORITY_LEVELS.MEDIA, PRIORITY_LEVELS.BAIXA];
    const minPriorityIndex = priorityOrder.indexOf(minPriority);

    const filtered = suggestions.filter(
      (s) => priorityOrder.indexOf(s.prioridade) <= minPriorityIndex,
    );

    // 6. Ordenar por score (maior primeiro)
    const sorted = filtered.sort((a, b) => b.score_financeiro - a.score_financeiro);

    // 7. Limitar resultado
    return sorted.slice(0, limit);
  } catch (error) {
    console.error('[Financial Suggestions] Erro ao gerar sugestões:', error);
    throw error;
  }
}

// ============================================================================
// Helper: Generate Justification Text
// ============================================================================

function generateJustification(params) {
  const { score, valor, margem, duracao, noShow, tipo } = params;

  const reasons = [];

  // Razão 1: Receita
  if (valor >= 200) {
    reasons.push(`Maior receita (R$ ${valor.toFixed(2)})`);
  }

  // Razão 2: Margem
  if (margem >= 100) {
    reasons.push(`Margem saudável (R$ ${margem.toFixed(2)})`);
  }

  // Razão 3: Receita por hora
  const receitaPorHora = (valor / (duracao / 60)).toFixed(2);
  if (receitaPorHora >= 200) {
    reasons.push(`Excelente receita/hora (R$ ${receitaPorHora}/h)`);
  }

  // Razão 4: Tipo de atendimento
  if (tipo === SERVICE_TYPES.PROCEDIMENTO) {
    reasons.push('Procedimento (maior lucratividade)');
  }

  // Razão 5: Risco baixo
  if (noShow === 0) {
    reasons.push('Paciente confiável (sem no-shows)');
  }

  // Se não houver razões, gerar genérica
  if (reasons.length === 0) {
    return `Boa oportunidade com score ${score}`;
  }

  return reasons.slice(0, 2).join(' • ');
}

// ============================================================================
// AUDIT: Log Financial Suggestion Action
// ============================================================================

/**
 * Registra auditoria quando sugestão financeira é aplicada
 *
 * @param {Object} params
 * @param {string} params.clinic_id - ID da clínica
 * @param {string} params.appointment_id - ID do agendamento criado
 * @param {number} params.score_financeiro - Score calculado
 * @param {number} params.valor_estimado - Valor estimado
 * @param {string} params.executed_by - User ID que executou
 * @returns {Promise<Object>} Resultado da inserção
 */
export async function logFinancialSuggestionAction(params) {
  const { clinic_id, appointment_id, score_financeiro, valor_estimado, executed_by } = params;

  try {
    const { data, error } = await supabase
      .from('suggestion_audit_logs')
      .insert([
        {
          clinic_id,
          suggestion_type: 'SUGESTAO_FINANCEIRA_APLICADA',
          appointment_id,
          action_taken: 'CRIAR_ENCAIXE',
          executed_by,
          executed_at: new Date().toISOString(),
          result: {
            score_financeiro,
            valor_estimado,
            timestamp: new Date().toISOString(),
          },
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('[Financial Audit] Ação registrada:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('[Financial Audit] Erro ao registrar:', error);
    return { success: false, error };
  }
}

// ============================================================================
// Helper: Get Financial Suggestion History
// ============================================================================

/**
 * Obtém histórico de sugestões financeiras aplicadas
 *
 * @param {string} clinicId - ID da clínica
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Array>} Histórico de sugestões
 */
export async function getFinancialSuggestionHistory(clinicId, filters = {}) {
  try {
    let query = supabase
      .from('suggestion_audit_logs')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('suggestion_type', 'SUGESTAO_FINANCEIRA_APLICADA')
      .order('executed_at', { ascending: false });

    // Aplicar filtros
    if (filters.start_date) {
      query = query.gte('executed_at', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('executed_at', filters.end_date);
    }
    if (filters.executed_by) {
      query = query.eq('executed_by', filters.executed_by);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.warn('[Financial History] Erro ao obter histórico:', error);
    return [];
  }
}

// ============================================================================
// Helper: Calculate Clinic Financial Stats
// ============================================================================

/**
 * Calcula estatísticas financeiras aplicadas via sugestões
 *
 * @param {string} clinicId - ID da clínica
 * @param {number} days - Número de dias para análise (default: 30)
 * @returns {Promise<Object>} Estatísticas
 */
export async function getFinancialSuggestionsStats(clinicId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await getFinancialSuggestionHistory(clinicId, {
      start_date: startDate.toISOString(),
    });

    if (!history.length) {
      return {
        total_applied: 0,
        total_value: 0,
        total_margin: 0,
        average_score: 0,
        by_priority: {},
      };
    }

    let totalValue = 0;
    let totalScores = 0;
    const byPriority = {};

    history.forEach((log) => {
      const result = log.result || {};
      totalValue += result.valor_estimado || 0;
      totalScores += result.score_financeiro || 0;

      // Contar por prioridade
      const priority = getPriorityLevelFromScore(result.score_financeiro);
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    });

    return {
      total_applied: history.length,
      total_value: totalValue,
      average_score: Math.round(totalScores / history.length),
      by_priority: byPriority,
      period_days: days,
    };
  } catch (error) {
    console.warn('[Financial Stats] Erro ao calcular stats:', error);
    return null;
  }
}

// ============================================================================
// Export Utility Functions
// ============================================================================

export const FinancialPriorityAPI = {
  calculateFinancialPriorityScore,
  generateFinancialPrioritySuggestions,
  logFinancialSuggestionAction,
  getFinancialSuggestionHistory,
  getFinancialSuggestionsStats,
  getPriorityLevelFromScore,
  getPaymentTypeMultiplier,
  getServiceTypeMultiplier,
};

export default FinancialPriorityAPI;
