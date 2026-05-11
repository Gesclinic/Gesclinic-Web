/**
 * 📦 SERVICES BARREL EXPORT
 * ========================
 *
 * Centraliza exports de todos os serviços
 * Permite: import { listAppointments } from '@/modules/agenda/services'
 */

export * from './appointments.service';
export * from './agendaApi.service';

// ============================================================================
// FINANCIAL INTEGRATION SERVICES (Phase 3)
// ============================================================================

export * from './appointmentEvents.service';
export * from './financialIntegration.service';
export * from './tiss.service';

// Re-export defaults
export { default as appointmentsService } from './appointments.service';
export { default as agendaApiService } from './agendaApi.service';
export { default as appointmentEventsService } from './appointmentEvents.service';
export { default as financialIntegrationService } from './financialIntegration.service';
export { default as tissService } from './tiss.service';
