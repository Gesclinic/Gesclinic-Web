/**
 * @module compatibility/agendaLegacyCompat.ts
 * 
 * COMPATIBILITY LAYER - Agenda Module
 * ===================================
 * 
 * Ensures backward compatibility with existing code.
 * Old imports from pages/clinica/agenda continue to work.
 * 
 * This file provides legacy exports that point to the new module location.
 * 
 * Legacy usage (still works):
 *   import AgendaPage from '@/pages/clinica/agenda/AgendaPage';
 * 
 * New recommended usage:
 *   import { useAppointments } from '@/modules/agenda';
 *   import { Appointment } from '@/modules/agenda/types';
 */

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

// Re-export all types from new module
export type * from '@/modules/agenda/types';

// Re-export all constants from new module
export * from '@/modules/agenda/constants';

// Re-export all services from new module
export * from '@/modules/agenda/services';

// Re-export all hooks from new module
export * from '@/modules/agenda/hooks';

// ============================================================================
// DOCUMENTATION
// ============================================================================

/**
 * MIGRATION GUIDE
 * ===============
 * 
 * The Agenda module has been restructured into a modular enterprise architecture.
 * 
 * OLD PATHS (still work due to this compatibility layer):
 * - src/pages/clinica/agenda/AgendaPage.jsx
 * - src/lib/appointmentsApi.js
 * - src/hooks/useAgenda.js
 * 
 * NEW PATHS (recommended):
 * - src/modules/agenda/pages/
 * - src/modules/agenda/services/
 * - src/modules/agenda/hooks/
 * 
 * EXAMPLES:
 * 
 * // List appointments (old way - still works)
 * import { listAppointments } from '@/lib/appointmentsApi';
 * 
 * // List appointments (new way - recommended)
 * import { listAppointments } from '@/modules/agenda';
 * 
 * // Use hook (old way - still works through compat)
 * import { useAppointments } from '@/hooks/useAppointments';
 * 
 * // Use hook (new way - recommended)
 * import { useAppointments } from '@/modules/agenda';
 * 
 * // Type definitions (new way - recommended)
 * import type { Appointment, AppointmentStatus } from '@/modules/agenda/types';
 */

export const COMPATIBILITY_VERSION = '1.0.0';
export const MIGRATION_COMPLETED_DATE = '2026-05-10';
