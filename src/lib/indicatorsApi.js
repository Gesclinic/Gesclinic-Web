/**
 * indicatorsApi.js
 *
 * 📊 API para Indicadores da Agenda
 *
 * Funções para buscar e calcular indicadores operacionais,
 * financeiros e de tempo de atendimento da clínica.
 */

import { supabase } from '@/lib/customSupabaseClient';

/**
 * Buscar indicadores consolidados para um dia específico
 * @param {string} clinicId - ID da clínica
 * @param {string} date - Data (YYYY-MM-DD)
 * @param {string} professionalId - ID do profissional (opcional)
 * @returns {Promise<Object>} Indicadores consolidados
 */
export async function getAgendaIndicators(
  clinicId,
  date = new Date().toISOString().split('T')[0],
  professionalId = null,
) {
  if (!clinicId) {
    throw new Error('clinic_id é obrigatório');
  }

  try {
    const { data, error } = await supabase.rpc('get_agenda_indicators', {
      p_clinic_id: clinicId,
      p_date: date,
      p_professional_id: professionalId,
    });

    if (error) {
      console.error('Erro ao buscar indicadores:', error);
      return null;
    }

    // Retorna o primeiro resultado (sempre será um por data)
    return data?.[0] || null;
  } catch (err) {
    console.error('Erro inesperado ao buscar indicadores:', err);
    return null;
  }
}

/**
 * Buscar indicadores de um profissional específico
 * @param {string} clinicId - ID da clínica
 * @param {string} professionalId - ID do profissional
 * @param {string} date - Data (YYYY-MM-DD)
 * @returns {Promise<Object>} Indicadores do profissional
 */
export async function getProfessionalIndicators(
  clinicId,
  professionalId,
  date = new Date().toISOString().split('T')[0],
) {
  if (!clinicId || !professionalId) {
    throw new Error('clinic_id e professional_id são obrigatórios');
  }

  try {
    const { data, error } = await supabase.rpc('get_professional_indicators', {
      p_clinic_id: clinicId,
      p_professional_id: professionalId,
      p_date: date,
    });

    if (error) {
      console.error('Erro ao buscar indicadores do profissional:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Erro inesperado:', err);
    return null;
  }
}

/**
 * Buscar indicadores diários para múltiplas datas
 * @param {string} clinicId - ID da clínica
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @returns {Promise<Array>} Array de indicadores por data
 */
export async function getAgendaIndicatorsByDateRange(clinicId, startDate, endDate) {
  if (!clinicId || !startDate || !endDate) {
    throw new Error('clinic_id, startDate e endDate são obrigatórios');
  }

  try {
    const { data, error } = await supabase
      .from('v_agenda_indicators_daily')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('indicator_date', startDate)
      .lte('indicator_date', endDate)
      .order('indicator_date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar indicadores por período:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erro inesperado:', err);
    return [];
  }
}

/**
 * Calcular alertas baseado nos indicadores
 * @param {Object} indicators - Objeto com indicadores
 * @returns {Array<Object>} Array de alertas
 */
export function generateAlerts(indicators) {
  const alerts = [];

  if (!indicators) {
    return alerts;
  }

  // Alerta: Taxa de ocupação baixa
  if (indicators.taxa_ocupacao_percent < 40) {
    alerts.push({
      type: 'warning',
      severity: 'high',
      message: `Taxa de ocupação baixa: ${indicators.taxa_ocupacao_percent}%`,
      metric: 'taxa_ocupacao_percent',
      value: indicators.taxa_ocupacao_percent,
      actionable: true,
    });
  }

  // Alerta: Muitas faltas
  if (indicators.faltas && indicators.total_agendamentos > 0) {
    const taxa_faltas = (indicators.faltas / indicators.total_agendamentos) * 100;
    if (taxa_faltas > 15) {
      alerts.push({
        type: 'error',
        severity: 'high',
        message: `Taxa de faltas elevada: ${taxa_faltas.toFixed(1)}%`,
        metric: 'taxa_faltas',
        value: taxa_faltas,
        actionable: true,
      });
    }
  }

  // Alerta: Receita abaixo da meta
  if (indicators.meta_dia && indicators.receita_estimada < indicators.meta_dia * 0.7) {
    alerts.push({
      type: 'warning',
      severity: 'medium',
      message: 'Receita estimada abaixo de 70% da meta',
      metric: 'receita_estimada',
      value: indicators.percentual_meta_atingida,
      actionable: true,
    });
  }

  // Alerta: Muitos slots livres em horários nobres
  if (
    indicators.slots_livres &&
    indicators.total_slots > 0 &&
    (indicators.slots_livres / indicators.total_slots) * 100 > 50
  ) {
    alerts.push({
      type: 'info',
      severity: 'medium',
      message: `Muitos horários livres disponíveis (${indicators.slots_livres}/${indicators.total_slots})`,
      metric: 'slots_livres',
      value: indicators.slots_livres,
      actionable: true,
    });
  }

  // Alerta: Profissional sem atendimentos
  if (indicators.profissionais_ativos === 0 && indicators.total_slots > 0) {
    alerts.push({
      type: 'warning',
      severity: 'high',
      message: 'Nenhum profissional com atendimentos agendados',
      metric: 'profissionais_ativos',
      value: 0,
      actionable: true,
    });
  }

  // Alerta: Tempo de checkin muito alto
  if (indicators.tempo_medio_checkin_minutos > 15) {
    alerts.push({
      type: 'warning',
      severity: 'low',
      message: `Tempo médio de check-in alto: ${Math.round(
        indicators.tempo_medio_checkin_minutos,
      )} minutos`,
      metric: 'tempo_medio_checkin_minutos',
      value: indicators.tempo_medio_checkin_minutos,
      actionable: false,
    });
  }

  return alerts;
}

/**
 * Obter status de saúde baseado nos indicadores
 * @param {Object} indicators - Objeto com indicadores
 * @returns {string} 'healthy' | 'warning' | 'critical'
 */
export function getHealthStatus(indicators) {
  if (!indicators) {
    return 'unknown';
  }

  const ocupacao = indicators.taxa_ocupacao_percent || 0;
  const receita = indicators.percentual_meta_atingida || 0;
  const faltas = indicators.faltas || 0;
  const total = indicators.total_agendamentos || 1;

  const taxa_faltas = (faltas / total) * 100;

  // Crítico: múltiplas coisas erradas
  if (ocupacao < 40 && receita < 50) {
    return 'critical';
  }
  if (taxa_faltas > 20) {
    return 'critical';
  }

  // Aviso: algo está fora
  if (ocupacao < 50) {
    return 'warning';
  }
  if (receita < 70) {
    return 'warning';
  }
  if (taxa_faltas > 15) {
    return 'warning';
  }

  // Saudável
  return 'healthy';
}

/**
 * Formatar indicadores para exibição
 * @param {Object} indicators - Indicadores brutos
 * @returns {Object} Indicadores formatados
 */
export function formatIndicators(indicators) {
  if (!indicators) {
    return null;
  }

  return {
    // Operacionais
    ocupacao: {
      value: indicators.taxa_ocupacao_percent || 0,
      percent: true,
      label: 'Taxa de Ocupação',
    },
    agendamentos: {
      value: indicators.total_agendamentos || 0,
      label: 'Total de Agendamentos',
    },
    confirmados: {
      value: indicators.confirmados || 0,
      label: 'Confirmados',
    },
    faltas: {
      value: indicators.faltas || 0,
      label: 'Faltas',
    },
    encaixes: {
      value: indicators.encaixes || 0,
      label: 'Encaixes',
    },
    profissionais: {
      value: indicators.profissionais_ativos || 0,
      label: 'Profissionais Ativos',
    },

    // Slots
    slots_ocupados: {
      value: indicators.slots_ocupados || 0,
      label: 'Slots Ocupados',
    },
    slots_livres: {
      value: indicators.slots_livres || 0,
      label: 'Slots Livres',
    },
    total_slots: {
      value: indicators.total_slots || 0,
      label: 'Total de Slots',
    },

    // Financeiros
    receita_dia: {
      value: indicators.receita_estimada || 0,
      currency: true,
      label: 'Receita Estimada',
    },
    receita_hora: {
      value: indicators.receita_por_hora || 0,
      currency: true,
      label: 'Receita por Hora',
    },
    meta: {
      value: indicators.meta_dia || 0,
      currency: true,
      label: 'Meta do Dia',
    },
    percentual_meta: {
      value: indicators.percentual_meta_atingida || 0,
      percent: true,
      label: '% da Meta',
    },

    // Tempo
    tempo_checkin: {
      value: Math.round(indicators.tempo_medio_checkin_minutos || 0),
      label: 'Tempo Médio Check-in',
      suffix: 'min',
    },
  };
}

/**
 * Mapear cor de status para um valor
 * @param {string} metric - Nome do indicador
 * @param {number} value - Valor do indicador
 * @returns {string} 'green' | 'yellow' | 'red'
 */
export function getStatusColor(metric, value) {
  switch (metric) {
    case 'taxa_ocupacao_percent':
      if (value >= 80) {
        return 'green';
      }
      if (value >= 40) {
        return 'yellow';
      }
      return 'red';

    case 'faltas':
      if (value === 0) {
        return 'green';
      }
      if (value <= 2) {
        return 'yellow';
      }
      return 'red';

    case 'percentual_meta_atingida':
      if (value >= 100) {
        return 'green';
      }
      if (value >= 70) {
        return 'yellow';
      }
      return 'red';

    case 'tempo_medio_checkin_minutos':
      if (value <= 10) {
        return 'green';
      }
      if (value <= 15) {
        return 'yellow';
      }
      return 'red';

    case 'receita_estimada':
      if (value >= 5000) {
        return 'green';
      }
      if (value >= 3000) {
        return 'yellow';
      }
      return 'red';

    default:
      return 'yellow';
  }
}

/**
 * Exportar indicadores para CSV
 * @param {Array<Object>} indicators - Array de indicadores
 * @returns {string} CSV formatado
 */
export function exportIndicatorsToCSV(indicators) {
  if (!indicators || indicators.length === 0) {
    return '';
  }

  // Headers
  const headers = Object.keys(indicators[0]).join(',');

  // Rows
  const rows = indicators.map((ind) =>
    Object.values(ind)
      .map((val) => (typeof val === 'string' ? `"${val}"` : val))
      .join(','),
  );

  return [headers, ...rows].join('\n');
}
