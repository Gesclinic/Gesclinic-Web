/**
 * 📦 MÓDULO AGENDA - ROOT EXPORT
 * =============================
 *
 * Central de exports do módulo agenda
 * Permite imports como: import { AppointmentCard } from '@/modules/agenda'
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  Appointment,
  AppointmentStatus,
  AppointmentUI,
  Patient,
  Professional,
  Service,
  Room,
  Payer,
  Plan,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  UpdateAppointmentStatusPayload,
  AppointmentFinancialData,
  ARReceivable,
  AgendaFilters,
  AgendaQueryOptions,
  PaginatedAppointments,
  AgendaViewState,
  AgendaViewType,
  AppointmentModalMode,
  AppointmentFormState,
  RealtimePayload,
  ApiResponse,
  ApiErrorResponse,
  ValidationResult,
  FieldValidation,
  CachedAppointments,
  CacheConfig,
  AppointmentWithRelationships,
  // Financial integration types (Phase 3)
  FinancialStatus,
  AttendanceType,
  PayerType,
  AuthorizationStatus,
  AppointmentWithFinancial,
  AppointmentEventType,
  AppointmentEvent,
  AppointmentFinancialEventData,
  AppointmentTISSData,
  AppointmentEventListener,
  AppointmentEventRegistry,
  FinancialValidationResult,
  FinancialIntegrationConfig,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

export {
  APPOINTMENT_STATUS_CONFIG,
  OPERATIONAL_FLOW_STATUSES,
  FINAL_STATUSES,
  ACTIVE_STATUSES,
  CANCELLED_STATUSES,
  AGENDA_CONFIG,
  AGENDA_MESSAGES,
  VALIDATION_RULES,
  AGENDA_VIEW_TYPES,
  APPOINTMENT_MODAL_MODES,
  AGENDA_ENDPOINTS,
  getStatusConfig,
  getStatusLabel,
  getStatusIcon,
  getStatusBadgeClass,
  isStatusFinalized,
  isStatusCancelled,
  canEditAppointmentInStatus,
  getNextPossibleStatuses,
  // Financial integration constants (Phase 3)
  FINANCIAL_STATUS_CONFIG,
  ATTENDANCE_TYPE_CONFIG,
  PAYER_TYPE_CONFIG,
  AUTHORIZATION_STATUS_CONFIG,
  TISS_GUIDE_TYPES,
  FINANCIAL_INTEGRATION_CONFIG,
  FINANCIAL_MESSAGES,
  FINANCIAL_STATUSES,
  ATTENDANCE_TYPES,
  PAYER_TYPES,
  AUTHORIZATION_STATUSES,
  getFinancialStatusConfig,
  getAttendanceTypeConfig,
  getPayerTypeConfig,
  getAuthorizationStatusConfig,
  canTransitionFinancialStatus,
  requiresAuthorizationFor,
  requiresGuideFor,
} from './constants';

// ============================================================================
// SERVICES
// ============================================================================

export {
  appointmentToUI,
  uiToAppointment,
  createPayloadFromForm,
  createUpdatePayloadFromForm,
  validateField,
  validateAppointmentPayload,
  validateStatusTransition,
  enrichAppointment,
  calculateEndTime,
  calculateDuration,
  formatDateDisplay,
  formatTimeDisplay,
  formatAppointmentPeriod,
  formatCurrency,
  buildFilterQuery,
  filterAppointments,
  isAppointmentPast,
  isAppointmentToday,
  isAppointmentFuture,
  hasAppointmentChanged,
  getChangedFields,
} from './services/appointments.service';

export {
  getSupabaseClient,
  setSupabaseClient,
  listAppointments,
  getAppointment,
  checkAvailability,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  subscribeToAppointments,
  unsubscribeFromAppointments,
  unsubscribeFromAll,
} from './services/agendaApi.service';

export type { RealtimeCallback, RealtimeErrorCallback } from './services/agendaApi.service';

// ============================================================================
// FINANCIAL INTEGRATION SERVICES (Phase 3)
// ============================================================================

export {
  appointmentEventBus,
  createAppointmentEvent,
  fireAppointmentStatusEvent,
  initializeAppointmentEventSystem,
  enableFinancialIntegration,
  disableFinancialIntegration,
  enableTISSIntegration,
  disableTISSIntegration,
} from './services/appointmentEvents.service';

export {
  validateAppointmentForFinancial,
  prepareAppointmentForBilling,
  handleAppointmentCompleted,
  handleAppointmentCancelled,
  handleAppointmentCheckedIn,
  financialIntegrator,
  validateFinancialField,
} from './services/financialIntegration.service';

export {
  validateForTISS,
  buildTISSData,
  formatTISSGuideNumber,
  generateTISSGuideId,
  validateTISSField,
  lookupCBHPMCode,
  tissGuideGenerator,
  COMMON_CBHPM_CODES,
} from './services/tiss.service';

// ============================================================================
// UTILS
// ============================================================================

export {
  isValidDateFormat,
  isValidTimeFormat,
  isDateInRange,
  hasTimeOverlap,
  checkAppointmentConflict,
  findAppointmentConflicts,
  getTimeDiffMinutes,
  getDaysDiff,
  addDays,
  subtractDays,
  filterAppointmentsByMultipleCriteria,
  groupAppointmentsByDate,
  groupAppointmentsByProfessional,
  sortAppointmentsByDateTime,
} from './utils/validation';

// ============================================================================
// HOOKS
// ============================================================================

export { useAppointments } from './hooks/useAppointments';
export type {
  UseAppointmentsOptions,
  UseAppointmentsReturn,
} from './hooks/useAppointments';

export { useAgendaFilters } from './hooks/useAgendaFilters';
export type { UseAgendaFiltersReturn } from './hooks/useAgendaFilters';

export { useAppointmentForm } from './hooks/useAppointmentForm';
export type {
  UseAppointmentFormOptions,
  UseAppointmentFormReturn,
} from './hooks/useAppointmentForm';

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
} from './hooks/useFinancial';

// ============================================================================
// COMPONENTS
// ============================================================================

// Official Status Components (NEW - Enterprise Standard)
export { OfficialStatusBadge } from './components/OfficialStatusBadge';
export { OfficialStatusBadgeCompact } from './components/OfficialStatusBadge';
export { OfficialStatusDot } from './components/OfficialStatusBadge';
export { OfficialStatusSelect } from './components/OfficialStatusSelect';
export { OperationalTimeline } from './components/OperationalTimeline';

// Legacy Status Components
export {
  StatusBadge,
  StatusBadgeCompact,
  StatusBadgeLarge,
  StatusBadgeWithTooltip,
  StatusBadgeAnimated,
  StatusTimeline,
  StatusSelect,
} from './components/StatusBadgeModule';

export { AppointmentCard, AppointmentCardGrid } from './components/AppointmentCard';

export { AgendaFiltersPanel } from './components/AgendaFiltersPanel';

// ============================================================================
// EXEMPLO DE USO RÁPIDO
// ============================================================================

/*

// 1. Listar agendamentos com realtime
import { useAppointments } from '@/modules/agenda';

function MyComponent() {
  const { appointments, isLoading } = useAppointments({
    clinicId: 'clinic-1',
    autoSubscribe: true,
  });

  return <div>{appointments.length} agendamentos</div>;
}

// 2. Exibir card de agendamento
import { AppointmentCard } from '@/modules/agenda';

<AppointmentCard
  appointment={appointment}
  onClick={() => handleEdit(appointment)}
/>

// 3. Validar dados
import { validateAppointmentPayload } from '@/modules/agenda';

const result = validateAppointmentPayload(data);
if (!result.valid) {
  console.error(result.errors);
}

// 4. Formatar para exibição
import { formatAppointmentPeriod, formatCurrency } from '@/modules/agenda';

const period = formatAppointmentPeriod(appointment); // "Seg, 06/05/2025 10:00 - 10:30"
const value = formatCurrency(appointment.value); // "R$ 100,00"

// 5. Verificar conflitos
import { checkAppointmentConflict } from '@/modules/agenda';

const hasConflict = checkAppointmentConflict(newAppt, existingAppts);

*/

// ============================================================================
// ROOT DEFAULT EXPORT
// ============================================================================

export default {
  // Types exports
  types: {
    Appointment: 'See types import',
    AppointmentStatus: 'See types import',
  },

  // Constants
  constants: {
    APPOINTMENT_STATUS_CONFIG,
    ACTIVE_STATUSES,
    FINAL_STATUSES,
  },

  // Services
  services: {
    appointments: require('./services/appointments.service').default,
    agendaApi: require('./services/agendaApi.service').default,
  },

  // Utils
  utils: {
    validation: require('./utils/validation').default,
  },

  // Hooks
  hooks: {
    useAppointments,
    useAgendaFilters,
    useAppointmentForm,
  },

  // Components
  components: {
    StatusBadge,
    AppointmentCard,
    AgendaFiltersPanel,
  },
};
