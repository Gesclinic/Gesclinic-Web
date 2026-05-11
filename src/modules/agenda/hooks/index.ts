/**
 * 📦 HOOKS BARREL EXPORT
 * ====================
 *
 * Centraliza exports de todos os hooks
 * Permite: import { useAppointments } from '@/modules/agenda/hooks'
 */

export { useAppointments } from './useAppointments';
export type { UseAppointmentsOptions, UseAppointmentsReturn } from './useAppointments';

export { useAgendaFilters } from './useAgendaFilters';
export type { UseAgendaFiltersReturn } from './useAgendaFilters';

export { useAppointmentForm } from './useAppointmentForm';
export type {
  UseAppointmentFormOptions,
  UseAppointmentFormReturn,
} from './useAppointmentForm';

// ============================================================================
// FINANCIAL INTEGRATION HOOKS (Phase 3)
// ============================================================================

export {
  useAppointmentFinancialValidation,
  useAppointmentBillingPreparation,
  useAppointmentEvents,
  useAppointmentFinancialStatus,
  useAppointmentFinancialFields,
  useAppointmentFinancial,
} from './useFinancial';

// Re-export defaults
export { default as useAppointmentsDefault } from './useAppointments';
export { default as useAgendaFiltersDefault } from './useAgendaFilters';
export { default as useAppointmentFormDefault } from './useAppointmentForm';
