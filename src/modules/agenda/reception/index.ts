/**
 * Reception Module - Barrel Export
 * 
 * Exporta todos os componentes, hooks e utilities do módulo recepção
 */

// Types
export * from './types/reception';

// Services/API
export { 
  performCheckIn,
  getWaitingQueue,
  getWaitingQueueStats,
  getReceptionOperationalData,
  getCheckIn,
  updateCheckInNotes,
  getCheckInHistory,
  subscribeToWaitingQueue,
  subscribeToAppointmentStatusChanges,
} from './services/receptionApi';

// Hooks
export { useCheckIn } from './hooks/useCheckIn';
export { useWaitingQueue } from './hooks/useWaitingQueue';
export { useReceptionRealtimeSync } from './hooks/useReceptionRealtimeSync';

// Components
export { default as CheckInButton } from './components/CheckInButton';
export { default as CheckInDialog } from './components/CheckInDialog';
export { default as QueueStatusBadge } from './components/QueueStatusBadge';
export { default as WaitingQueuePanel } from './components/WaitingQueuePanel';
export { default as OperationalDashboard } from './components/OperationalDashboard';
