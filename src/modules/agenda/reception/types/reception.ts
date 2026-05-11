/**
 * Reception Module - TypeScript Types
 * 
 * Define os tipos e interfaces para o módulo de recepção
 * Integrado com o Official Status Model
 */

import { OfficialAppointmentStatus } from '@/modules/agenda/types';

/**
 * Check-in de recepção
 * Rastreia quando um paciente fez check-in
 */
export interface ReceptionCheckIn {
  id: string; // UUID
  appointment_id: string; // UUID
  clinic_id: string; // UUID
  checked_in_at: string; // ISO timestamp
  checked_in_by: string; // UUID (user_id)
  notes?: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Agendamento na fila de espera
 * Combinação de appointment + check-in + cálculos
 */
export interface WaitingQueueAppointment {
  appointment_id: string; // UUID
  clinic_id: string; // UUID
  patient_id: string; // UUID
  professional_id?: string; // UUID (opcional)
  room_id?: string; // UUID (opcional)
  scheduled_date: string; // ISO date
  official_status: OfficialAppointmentStatus;
  
  // Check-in info
  checkin_id: string; // UUID
  checked_in_at: string; // ISO timestamp
  checked_in_by: string; // UUID (user que fez check-in)
  
  // Cálculos em tempo real
  tempo_espera_segundos: number; // Segundos desde check-in
  tempo_espera_minutos: number; // Minutos desde check-in
  wait_priority: 'normal' | 'warning' | 'critical'; // normal: <15min, warning: 15-30min, critical: >30min
}

/**
 * Estatísticas da fila de espera
 */
export interface WaitingQueueStats {
  total_waiting: number; // Total na fila
  total_in_progress: number; // Em atendimento
  average_wait_time_minutes: number; // Média de espera
  max_wait_time_minutes: number; // Máximo de espera
  critical_count: number; // Pacientes aguardando > 30min
  warning_count: number; // Pacientes aguardando 15-30min
}

/**
 * Resposta da função perform_checkin
 */
export interface PerformCheckInResponse {
  success: boolean;
  checkin_id?: string; // UUID (se sucesso)
  message: string;
}

/**
 * Dados operacionais da recepção
 * Agrupa agendamentos por status
 */
export interface ReceptionOperationalData {
  next_appointments: WaitingQueueAppointment[]; // Próximos a serem atendidos
  in_progress: WaitingQueueAppointment[]; // Em atendimento agora
  waiting: WaitingQueueAppointment[]; // Aguardando serem chamados
  awaiting_confirmation: WaitingQueueAppointment[]; // Confirmados, não fizeram check-in ainda
}

/**
 * Evento de realtime do módulo recepção
 */
export interface ReceptionRealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'reception_checkins';
  record: ReceptionCheckIn;
  timestamp: string; // ISO timestamp
}

/**
 * Estado de sincronização realtime
 */
export interface ReceptionRealtimeSyncState {
  is_connected: boolean; // Conectado ao realtime
  last_sync: string; // ISO timestamp do último sync
  pending_updates: number; // Atualizações pendentes
  error?: string; // Erro último, se houver
}

/**
 * Parâmetros para check-in
 */
export interface CheckInParams {
  appointment_id: string; // UUID
  clinic_id: string; // UUID
  notes?: string; // Notas opcionais
}

/**
 * Parâmetros para query da fila
 */
export interface WaitingQueueParams {
  clinic_id: string; // UUID (obrigatório)
  limit?: number; // Padrão: 50
  offset?: number; // Padrão: 0
}

/**
 * Opções de cache para queries
 */
export interface CacheOptions {
  stale_time: number; // Milliseconds
  cache_time: number; // Milliseconds
  retry_count: number; // Número de retentativas
  retry_delay: number; // Milliseconds entre tentativas
}

/**
 * Configuração de realtime
 */
export interface RealtimeConfig {
  enabled: boolean; // Realtime ativado
  channel: string; // Nome do channel Supabase
  auto_reconnect: boolean; // Reconectar automaticamente
  reconnect_interval: number; // Milliseconds
}

/**
 * Tipo para o estado do hook useCheckIn
 */
export interface UseCheckInState {
  loading: boolean;
  error?: string;
  success: boolean;
  checkin_id?: string;
  perform_checkin: (params: CheckInParams) => Promise<void>;
  reset: () => void;
}

/**
 * Tipo para o estado do hook useWaitingQueue
 */
export interface UseWaitingQueueState {
  queue: WaitingQueueAppointment[];
  stats: WaitingQueueStats;
  loading: boolean;
  error?: string;
  is_live: boolean; // Se está recebendo atualizações realtime
  refetch: () => Promise<void>;
}

/**
 * Tipo para o estado do hook useReceptionOperations
 */
export interface UseReceptionOperationsState {
  data: ReceptionOperationalData;
  stats: ReceptionOperationalStats;
  loading: boolean;
  error?: string;
  is_live: boolean;
  refetch: () => Promise<void>;
}

/**
 * Estatísticas operacionais da recepção
 */
export interface ReceptionOperationalStats {
  total_appointments: number; // Total de agendamentos hoje
  next_count: number; // Próximos a chamar
  in_progress_count: number; // Em atendimento
  waiting_count: number; // Aguardando
  awaiting_confirmation_count: number; // Esperando confirmação
  average_wait_time: number; // Média em minutos
}

/**
 * Tipo para o estado do hook useReceptionRealtimeSync
 */
export interface UseReceptionRealtimeSyncState {
  sync_state: ReceptionRealtimeSyncState;
  on_event: (callback: (event: ReceptionRealtimeEvent) => void) => void;
  off_event: (callback: (event: ReceptionRealtimeEvent) => void) => void;
}

/**
 * Badge de status para recepção
 */
export interface StatusBadgeConfig {
  status: OfficialAppointmentStatus;
  wait_time?: number; // Em minutos
  color: string; // Hex color
  icon: string; // Emoji ou ícone
  label: string; // Texto
}

/**
 * Configuração de timeline
 */
export interface TimelineEvent {
  timestamp: string; // ISO timestamp
  event_type: 'check_in' | 'waiting' | 'in_progress' | 'completed';
  description: string;
  user?: string; // Quem fez a ação
}
