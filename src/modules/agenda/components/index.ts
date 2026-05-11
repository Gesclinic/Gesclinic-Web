/**
 * 📦 COMPONENTS BARREL EXPORT
 * ==========================
 *
 * Centraliza exports de todos os componentes
 * Permite: import { AppointmentCard } from '@/modules/agenda/components'
 */

// Status Badge Components
export {
  StatusBadge,
  StatusBadgeCompact,
  StatusBadgeLarge,
  StatusBadgeWithTooltip,
  StatusBadgeAnimated,
  StatusTimeline,
  StatusSelect,
} from './StatusBadgeModule';

// Appointment Card Components
export { AppointmentCard, AppointmentCardGrid } from './AppointmentCard';

// Filters
export { AgendaFiltersPanel } from './AgendaFiltersPanel';

// Re-export defaults
export { default as statusBadgeModule } from './StatusBadgeModule';
export { default as appointmentCardModule } from './AppointmentCard';
export { default as agendaFiltersPanelDefault } from './AgendaFiltersPanel';
