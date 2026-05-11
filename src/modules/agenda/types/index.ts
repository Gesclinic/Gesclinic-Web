/**
 * 📋 TIPOS CENTRALIZADOS - MÓDULO AGENDA
 * ====================================
 *
 * Tipos TypeScript para toda a aplicação de Agenda
 * Único source of truth para estrutura de dados
 */

// ============================================================================
// 1. APPOINTMENT - Entidade Principal
// ============================================================================

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document_id?: string;
  date_of_birth?: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty?: string;
  crm?: string;
}

export interface Service {
  id: string;
  name: string;
  code?: string;
  default_duration?: number;
  value?: number;
}

export interface Room {
  id: string;
  name: string;
  code?: string;
  capacity?: number;
}

export interface Payer {
  id: string;
  name: string;
  type: 'insurance' | 'particular';
  code?: string;
}

export interface Plan {
  id: string;
  name: string;
  code?: string;
  payer_id: string;
}

/**
 * Appointment completa com relacionamentos resolvidos
 */
export interface Appointment {
  // Identificação
  id: string;
  clinic_id: string;
  
  // Relacionamentos
  patient_id: string;
  professional_id: string;
  service_id?: string;
  room_id?: string;
  payer_id?: string;
  plan_id?: string;
  
  // Dados de agendamento
  scheduled_date: string; // ISO date (YYYY-MM-DD)
  scheduled_time: string; // HH:mm
  duration?: number; // em minutos
  end_time?: string;
  
  // Dados financeiros
  value?: number;
  discount?: number;
  total_value?: number;
  
  // Status e controle
  status: AppointmentStatus;
  status_official?: AppointmentStatus;
  
  // Observações
  notes?: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  
  // Dados desnormalizados para performance
  patient?: Patient;
  professional?: Professional;
  service?: Service;
  room?: Room;
  payer?: Payer;
  plan?: Plan;
}

/**
 * Appointment com todos os campos resolvidos
 * Pronta para exibição na UI
 */
export interface AppointmentWithRelationships extends Appointment {
  patient: Patient;
  professional: Professional;
  service?: Service;
  room?: Room;
  payer?: Payer;
  plan?: Plan;
}

/**
 * Appointment em camelCase (usado internamente)
 */
export interface AppointmentUI {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  serviceId?: string;
  roomId?: string;
  payerId?: string;
  planId?: string;
  scheduledDate: string;
  scheduledTime: string;
  duration?: number;
  endTime?: string;
  value?: number;
  discount?: number;
  totalValue?: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  patient?: Patient;
  professional?: Professional;
  service?: Service;
  room?: Room;
  payer?: Payer;
  plan?: Plan;
}

// ============================================================================
// 2. PAYLOADS - Para CREATE/UPDATE
// ============================================================================

/**
 * Payload para criar agendamento
 */
export interface CreateAppointmentPayload {
  clinic_id: string;
  patient_id: string;
  professional_id: string;
  service_id?: string;
  room_id?: string;
  payer_id?: string;
  plan_id?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration?: number;
  value?: number;
  discount?: number;
  notes?: string;
}

/**
 * Payload para atualizar agendamento
 */
export interface UpdateAppointmentPayload {
  patient_id?: string;
  professional_id?: string;
  service_id?: string;
  room_id?: string;
  payer_id?: string;
  plan_id?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  duration?: number;
  value?: number;
  discount?: number;
  status?: AppointmentStatus;
  notes?: string;
}

/**
 * Payload para atualização de status apenas
 */
export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatus;
}

// ============================================================================
// 3. FINANCIAL DATA - Integração com Financeiro
// ============================================================================

export interface AppointmentFinancialData {
  appointment_id: string;
  guide_type?: string;
  procedure_code?: string;
  guide_number?: string;
  authorization_number?: string;
  authorized_value?: number;
  notes?: string;
}

export interface ARReceivable {
  id: string;
  appointment_id: string;
  clinic_id: string;
  payer_id?: string;
  amount: number;
  status: 'open' | 'partial' | 'paid' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// 4. FILTROS E QUERIES
// ============================================================================

export interface AgendaFilters {
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  professionalId?: string;
  roomId?: string;
  payerId?: string;
  status?: AppointmentStatus[];
  patientName?: string;
}

export interface AgendaQueryOptions {
  filters?: AgendaFilters;
  limit?: number;
  offset?: number;
  orderBy?: 'date_asc' | 'date_desc' | 'professional';
}

export interface PaginatedAppointments {
  data: Appointment[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// 5. ESTADO DE VIEWS
// ============================================================================

export type AgendaViewType = 'day' | 'week' | 'month' | 'table';

export interface AgendaViewState {
  viewType: AgendaViewType;
  selectedDate: string; // ISO date
  selectedProfessionalId?: string;
  selectedRoomId?: string;
}

// ============================================================================
// 6. MODAL / FORM STATE
// ============================================================================

export type AppointmentModalMode = 'create' | 'edit' | 'view' | 'reception';

export interface AppointmentFormState {
  mode: AppointmentModalMode;
  appointmentId?: string;
  formData: Partial<AppointmentUI>;
  errors: Record<string, string>;
  isLoading: boolean;
  isDirty: boolean;
}

// ============================================================================
// 7. REALTIME
// ============================================================================

export interface RealtimePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  appointment: Appointment;
  oldAppointment?: Appointment;
}

// ============================================================================
// 8. RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: 'success' | 'error';
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, any>;
}

// ============================================================================
// 9. VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

// ============================================================================
// 10. PERFORMANCE / CACHING
// ============================================================================

export interface CachedAppointments {
  appointments: Appointment[];
  lastFetch: number;
  expiresAt: number;
}

export interface CacheConfig {
  ttl?: number; // Time to live em ms
  enabled?: boolean;
}

// ============================================================================
// 11. RE-EXPORT FINANCIAL TYPES
// ============================================================================

// Financial integration types (Phase 3)
export * from './financial';

// ============================================================================
// 12. EXPORT TYPES
// ============================================================================

export type {
  Appointment,
  AppointmentStatus,
  Patient,
  Professional,
  Service,
  Room,
  Payer,
  Plan,
  AppointmentUI,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  AgendaFilters,
  AgendaViewState,
  AppointmentFormState,
};
