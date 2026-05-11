/**
 * LEGACY REDIRECT - src/pages/clinica/agenda/index.tsx
 * 
 * This file ensures that old imports still work after the refactoring.
 * It redirects to the new module structure in src/modules/agenda/.
 * 
 * BACKWARD COMPATIBILITY: All old imports from this location will continue to work.
 */

// Re-export everything from the new module
export * from '@/modules/agenda';

// Default exports for common patterns
export { default as Agenda } from '@/modules/agenda/pages/Agenda';
export { default as AgendaPage } from '@/modules/agenda/pages/AgendaPage';
export { default as AgendaLayout } from '@/modules/agenda/pages/AgendaLayout';

// Export common components
export { useAppointments, useAgendaFilters, useAppointmentForm } from '@/modules/agenda/hooks';

// Types
export type { Appointment, AppointmentStatus, AgendaFilters } from '@/modules/agenda/types';
