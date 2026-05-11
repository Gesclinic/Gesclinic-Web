/**
 * QUICK FILTERS - Filtros rápidos para status oficial
 * ================================================
 * 
 * Filtros pré-configurados para consultas comuns
 */

import {
  OfficialAppointmentStatus,
  OPERATIONAL_STATUSES,
  FINALIZED_STATUSES,
  EDITABLE_STATUSES,
  NON_BILLABLE_STATUSES,
  AUTO_BILLABLE_STATUSES,
} from './officialStatusModel';

// ============================================================================
// QUICK FILTER PRESETS
// ============================================================================

export const QUICK_FILTERS = {
  /**
   * Agendamentos em processamento (ainda não finalizados)
   */
  PENDING: OPERATIONAL_STATUSES,

  /**
   * Agendamentos finalizados (não podem mudar)
   */
  FINALIZED: FINALIZED_STATUSES,

  /**
   * Agendamentos ainda hoje (hoje até in_progress)
   */
  TODAY_FLOW: ['scheduled', 'confirmed', 'checked_in', 'waiting', 'in_progress'],

  /**
   * Agendamentos que precisam ação (não confirmados ou em espera)
   */
  NEEDS_ACTION: ['scheduled', 'checked_in', 'waiting'],

  /**
   * Agendamentos com problemas (não compareceu ou cancelado)
   */
  ISSUES: ['cancelled', 'no_show'],

  /**
   * Agendamentos que passaram
   */
  COMPLETED: ['completed', 'cancelled', 'no_show'],

  /**
   * Agendamentos que podem gerar financeiro
   */
  BILLABLE_READY: ['completed'],

  /**
   * Todos os status operacionais
   */
  ALL_OPERATIONAL: OPERATIONAL_STATUSES,

  /**
   * Todos os 8 status
   */
  ALL: [
    'scheduled',
    'confirmed',
    'checked_in',
    'waiting',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
  ],
} as const;

// ============================================================================
// HUMAN READABLE FILTER LABELS
// ============================================================================

export const QUICK_FILTER_LABELS: Record<keyof typeof QUICK_FILTERS, string> = {
  PENDING: '⏳ Em Processamento',
  FINALIZED: '✅ Finalizados',
  TODAY_FLOW: '📅 Hoje',
  NEEDS_ACTION: '⚠️ Precisa Ação',
  ISSUES: '🔴 Problemas',
  COMPLETED: '✔️ Completos',
  BILLABLE_READY: '💰 Pronto Faturar',
  ALL_OPERATIONAL: '🔄 Operacionais',
  ALL: '📋 Todos',
};

// ============================================================================
// FILTER HELPER FUNCTIONS
// ============================================================================

/**
 * Filtra agendamentos por preset
 */
export function filterByQuickFilter(
  appointments: Array<{ status: OfficialAppointmentStatus }>,
  filterKey: keyof typeof QUICK_FILTERS
) {
  const statusList = QUICK_FILTERS[filterKey];
  return appointments.filter((apt) => statusList.includes(apt.status as OfficialAppointmentStatus));
}

/**
 * Conta agendamentos por status
 */
export function countByStatus(
  appointments: Array<{ status: OfficialAppointmentStatus }>
): Record<OfficialAppointmentStatus, number> {
  const counts = {} as Record<OfficialAppointmentStatus, number>;

  appointments.forEach((apt) => {
    counts[apt.status] = (counts[apt.status] || 0) + 1;
  });

  return counts;
}

/**
 * Obtém resumo de filtros rápidos
 */
export function getQuickFilterSummary(
  appointments: Array<{ status: OfficialAppointmentStatus }>
) {
  return {
    pending: filterByQuickFilter(appointments, 'PENDING').length,
    finalized: filterByQuickFilter(appointments, 'FINALIZED').length,
    needsAction: filterByQuickFilter(appointments, 'NEEDS_ACTION').length,
    issues: filterByQuickFilter(appointments, 'ISSUES').length,
    billableReady: filterByQuickFilter(appointments, 'BILLABLE_READY').length,
    total: appointments.length,
  };
}

// ============================================================================
// CHART DATA GENERATION
// ============================================================================

/**
 * Gera dados para gráfico de status
 */
export function generateChartData(
  appointments: Array<{ status: OfficialAppointmentStatus }>
) {
  const counts = countByStatus(appointments);
  const statusMap: Record<OfficialAppointmentStatus, { label: string; color: string }> = {
    scheduled: { label: 'Agendado', color: '#dbeafe' },
    confirmed: { label: 'Confirmado', color: '#dcfce7' },
    checked_in: { label: 'Check-in', color: '#e9d5ff' },
    waiting: { label: 'Aguardando', color: '#fef08a' },
    in_progress: { label: 'Em Atendimento', color: '#cffafe' },
    completed: { label: 'Completo', color: '#d1fae5' },
    cancelled: { label: 'Cancelado', color: '#fee2e2' },
    no_show: { label: 'Não Compareceu', color: '#f3f4f6' },
  };

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status: status as OfficialAppointmentStatus,
      count,
      label: statusMap[status as OfficialAppointmentStatus].label,
      color: statusMap[status as OfficialAppointmentStatus].color,
      percentage: Math.round((count / appointments.length) * 100),
    }));
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  QUICK_FILTERS,
  QUICK_FILTER_LABELS,
  filterByQuickFilter,
  countByStatus,
  getQuickFilterSummary,
  generateChartData,
};
