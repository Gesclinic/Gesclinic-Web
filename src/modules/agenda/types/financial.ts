/**
 * 💰 TIPOS DE INTEGRAÇÃO FINANCEIRA - MÓDULO AGENDA
 * ================================================
 *
 * Tipos para preparar integração desacoplada com módulo Financeiro
 * Sem ativar automações ainda
 */

import { Appointment, AppointmentStatus } from './index';

// ============================================================================
// 1. ENUMS FINANCEIROS
// ============================================================================

export type FinancialStatus =
  | 'pending'        // Aguardando processamento
  | 'provisional'    // Provisório (pode ser editado)
  | 'confirmed'      // Confirmado (não pode ser editado)
  | 'billed'         // Já faturado
  | 'cancelled'      // Cancelado
  | 'rejected';      // Rejeitado

export type AttendanceType =
  | 'consultation'    // Consulta
  | 'procedure'       // Procedimento
  | 'surgery'         // Cirurgia
  | 'therapy'         // Terapia
  | 'exam'            // Exame
  | 'follow_up'       // Retorno
  | 'administration'; // Administrativa

export type PayerType =
  | 'insurance'      // Convênio
  | 'particular'     // Particular
  | 'company'        // Empresa
  | 'government';    // Público

export type AuthorizationStatus =
  | 'not_required'    // Não requerido
  | 'pending'         // Aguardando
  | 'authorized'      // Autorizado
  | 'denied'          // Negado
  | 'expired';        // Expirado

// ============================================================================
// 2. APPOINTMENT COM CAMPOS FINANCEIROS
// ============================================================================

/**
 * Extensão de Appointment com campos para integração financeira
 * Todos os campos são OPCIONAIS para manter compatibilidade retroativa
 */
export interface AppointmentWithFinancial extends Appointment {
  // Valores financeiros preparados
  estimated_value?: number;           // Valor estimado (antes de confirmar)
  authorized_value?: number;          // Valor autorizado pela operadora
  
  // Informações de financeiro
  payer_type?: PayerType;            // Tipo de pagador
  attendance_type?: AttendanceType;  // Tipo de atendimento
  financial_status?: FinancialStatus; // Status financeiro
  
  // Autorização
  authorization_code?: string;       // Código de autorização
  authorization_status?: AuthorizationStatus; // Status da autorização
  authorization_expires_at?: string; // Validade da autorização (ISO)
  
  // Guia
  guide_number?: string;             // Número da guia (TISS)
  guide_type?: string;               // Tipo de guia (PS, SP, etc)
  
  // Procedimento
  procedure_code?: string;           // Código do procedimento (CBHPM)
  procedure_name?: string;           // Nome do procedimento
  
  // Metadata
  financial_notes?: string;          // Notas para financeiro
  financial_updated_at?: string;     // Última atualização financeira
  
  // Referência para ar_receivable
  ar_receivable_id?: string;         // ID do A receber vinculado
}

// ============================================================================
// 3. EVENTOS DE APPOINTMENT
// ============================================================================

export type AppointmentEventType =
  | 'appointment.created'        // Agendamento criado
  | 'appointment.updated'        // Agendamento atualizado
  | 'appointment.scheduled'      // Status → scheduled
  | 'appointment.confirmed'      // Status → confirmed
  | 'appointment.checked_in'     // Status → checked_in
  | 'appointment.in_progress'    // Status → in_progress
  | 'appointment.completed'      // Status → completed
  | 'appointment.cancelled'      // Status → cancelled
  | 'appointment.no_show'        // Status → no_show
  | 'appointment.deleted';       // Agendamento deletado

/**
 * Payload de evento de agendamento
 * Estrutura para system de eventos desacoplado
 */
export interface AppointmentEvent {
  id: string;                              // Event ID (UUID)
  type: AppointmentEventType;              // Tipo de evento
  timestamp: string;                       // ISO timestamp
  clinic_id: string;                       // Clínica
  
  // Dados do agendamento
  appointment: AppointmentWithFinancial;   // Agendamento completo
  previousAppointment?: Partial<AppointmentWithFinancial>; // Valores anteriores se UPDATE
  
  // Metadata
  triggered_by: 'user' | 'system' | 'api';
  trigger_source?: string;                 // Qual componente/função disparou
  
  // Para rastreamento
  request_id?: string;                     // ID da requisição que causou
}

// ============================================================================
// 4. DADOS DE INTEGRAÇÃO COM FINANCEIRO
// ============================================================================

/**
 * Dados preparados para passar ao módulo Financeiro
 * Enviados quando appointment.completed é true
 */
export interface AppointmentFinancialEventData {
  appointment_id: string;
  clinic_id: string;
  
  // Valores
  value: number;
  discount?: number;
  total_value: number;
  authorized_value?: number;
  
  // Informações do pagador
  payer_id?: string;
  payer_type: PayerType;
  
  // Atendimento
  professional_id: string;
  patient_id: string;
  service_id?: string;
  attendance_type: AttendanceType;
  scheduled_date: string;
  scheduled_time: string;
  
  // Guia / Autorização
  guide_number?: string;
  guide_type?: string;
  authorization_code?: string;
  procedure_code?: string;
  
  // Para criar AR Receivable
  is_billable: boolean;              // Deve gerar A Receber?
  billing_reason?: string;           // Por que é/não é faturável
}

// ============================================================================
// 5. ESTRUTURA TISS
// ============================================================================

/**
 * Dados preparados para integração TISS (Troca de Informações em Saúde Suplementar)
 * Estrutura base para geração de guias
 */
export interface AppointmentTISSData {
  // Guia
  guide_id: string;                  // ID único da guia
  guide_number: string;              // Número sequencial
  guide_type: 'PS' | 'SP' | 'AH';    // Prestação de Serviço, Serviço Profissional, Autorização de Honorário
  
  // Beneficiário (Paciente)
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_cpf: string;
  
  // Prestador (Clínica)
  provider_id: string;
  provider_name: string;
  provider_cnpj: string;
  
  // Profissional (Executor)
  professional_id: string;
  professional_name: string;
  professional_crm: string;
  professional_specialty: string;
  
  // Procedimento
  procedure_code: string;            // Tabela CBHPM
  procedure_name: string;
  procedure_date: string;            // ISO date
  procedure_time: string;            // HH:mm
  
  // Valores
  procedure_value: number;
  authorization_percentage?: number;
  patient_copay?: number;
  
  // Status
  tiss_status: 'draft' | 'sent' | 'confirmed' | 'rejected' | 'paid';
  tiss_sent_at?: string;
  tiss_response?: string;            // Resposta da operadora
}

// ============================================================================
// 6. PAYLOAD PARA EVENTOS FUTUROS
// ============================================================================

/**
 * Estrutura de listener para eventos de integração
 * Permite que módulos se inscrevam para eventos sem acoplamento
 */
export interface AppointmentEventListener {
  id: string;
  eventType: AppointmentEventType[];
  handler: (event: AppointmentEvent) => Promise<void>;
  enabled: boolean;
  priority?: number;                 // Ordem de execução (maior = primeiro)
}

/**
 * Registro global de listeners
 */
export interface AppointmentEventRegistry {
  listeners: Map<string, AppointmentEventListener>;
  fireEvent: (event: AppointmentEvent) => Promise<void>;
  subscribe: (listener: AppointmentEventListener) => string;
  unsubscribe: (listenerId: string) => boolean;
}

// ============================================================================
// 7. VALIDAÇÃO FINANCEIRA
// ============================================================================

/**
 * Resultado de validação financeira
 * Determina se pode faturar ou se há bloqueios
 */
export interface FinancialValidationResult {
  is_valid: boolean;
  is_billable: boolean;
  
  // Bloqueios
  blocking_errors: string[];         // Impedem faturamento
  warnings: string[];                // Alertas mas permite faturamento
  
  // Dados coletados
  suggested_financial_status?: FinancialStatus;
  suggested_attendance_type?: AttendanceType;
  missing_fields?: string[];         // Campos que deveriam estar preenchidos
  
  // Recomendações
  recommendations?: string[];
}

// ============================================================================
// 8. CONFIGURAÇÃO DE INTEGRAÇÃO
// ============================================================================

/**
 * Configuração de como agenda se integra com financeiro
 * Permite ligar/desligar integrações sem código
 */
export interface FinancialIntegrationConfig {
  // Ativação
  enabled: boolean;
  
  // Comportamento
  auto_create_receivable: boolean;      // Criar AR Receivable automaticamente?
  auto_create_tiss_guide: boolean;      // Criar guia TISS automaticamente?
  
  // Qual status dispara eventos
  trigger_events_on_statuses: AppointmentStatus[];
  
  // Validação
  require_authorization?: boolean;      // Exigir autorização?
  require_guide_number?: boolean;       // Exigir número de guia?
  
  // Valores
  default_attendance_type: AttendanceType;
  default_payer_type: PayerType;
  
  // Timing
  event_delay_ms?: number;              // Delay antes de disparar eventos
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type {
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
};
