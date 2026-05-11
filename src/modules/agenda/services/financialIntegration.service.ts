/**
 * 💰 CAMADA DE INTEGRAÇÃO FINANCEIRA - STUB
 * =========================================
 *
 * Serviço desacoplado para integração com Financeiro
 * Estrutura pronta, lógica desativada (NÃO gera financeiro ainda)
 */

import {
  AppointmentWithFinancial,
  AppointmentEvent,
  AppointmentFinancialEventData,
  FinancialValidationResult,
  FinancialStatus,
  AttendanceType,
  PayerType,
} from '../types/financial';

// ============================================================================
// 1. VALIDAÇÃO FINANCEIRA (SEM EFEITO COLATERAL)
// ============================================================================

/**
 * Validar se agendamento pode gerar financeiro
 * Apenas validação - NÃO cria nada no BD ainda
 */
export async function validateAppointmentForFinancial(
  appointment: AppointmentWithFinancial
): Promise<FinancialValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFields: string[] = [];

  console.log(`🔍 [DRY-RUN] Validating appointment ${appointment.id} for financial`);

  // Validar paciente
  if (!appointment.patient_id) {
    errors.push('Paciente não informado');
    missingFields.push('patient_id');
  }

  // Validar profissional
  if (!appointment.professional_id) {
    errors.push('Profissional não informado');
    missingFields.push('professional_id');
  }

  // Validar convênio
  if (!appointment.payer_id) {
    warnings.push('Convênio não informado - pode ser particular');
  } else {
    // Validar se payer_type está consistente
    if (!appointment.payer_type) {
      missingFields.push('payer_type');
      warnings.push('Tipo de pagador não informado');
    }
  }

  // Validar valor
  if (!appointment.estimated_value || appointment.estimated_value <= 0) {
    warnings.push('Valor estimado não informado ou zerado');
    missingFields.push('estimated_value');
  }

  // Validar tipo de atendimento
  if (!appointment.attendance_type) {
    missingFields.push('attendance_type');
    warnings.push('Tipo de atendimento não informado');
  }

  // Validar autorização se necessário
  if (appointment.payer_type === 'insurance') {
    if (!appointment.authorization_code) {
      warnings.push('Código de autorização não informado para convênio');
    }
  }

  // Validar guia se necessário
  if (appointment.payer_type === 'insurance' && !appointment.guide_number) {
    warnings.push('Número de guia TISS não informado');
  }

  // Status deve estar finalizado
  if (appointment.status !== 'completed' && appointment.status !== 'no_show') {
    errors.push(`Agendamento não está finalizado (status: ${appointment.status})`);
  }

  const isValid = errors.length === 0;
  const isBillable = isValid && appointment.payer_id !== null;

  console.log(
    `📊 Validation result: ${isValid ? '✅ VALID' : '❌ INVALID'} | Billable: ${
      isBillable ? '✅ YES' : '❌ NO'
    }`
  );

  return {
    is_valid: isValid,
    is_billable: isBillable,
    blocking_errors: errors,
    warnings,
    missing_fields: missingFields,
    suggested_financial_status: isValid ? 'provisional' : 'rejected',
    suggested_attendance_type: appointment.attendance_type || 'consultation',
    recommendations: [
      ...(!appointment.estimated_value ? ['Preencher valor estimado'] : []),
      ...(!appointment.payer_type ? ['Definir tipo de pagador'] : []),
      ...(!appointment.attendance_type ? ['Informar tipo de atendimento'] : []),
    ],
  };
}

// ============================================================================
// 2. PREPARAR DADOS FINANCEIROS (SEM EFEITO COLATERAL)
// ============================================================================

/**
 * Preparar dados de agendamento para envio ao Financeiro
 * Apenas prepara estrutura - NÃO envia nada
 */
export async function prepareAppointmentForBilling(
  appointment: AppointmentWithFinancial
): Promise<AppointmentFinancialEventData | null> {
  console.log(
    `📦 [DRY-RUN] Preparing appointment ${appointment.id} for billing`
  );

  // Validar primeiro
  const validation = await validateAppointmentForFinancial(appointment);

  if (!validation.is_billable) {
    console.log(`⏸️  Appointment not billable - reason: ${validation.blocking_errors.join(', ')}`);
    return null;
  }

  // Montar dados
  const data: AppointmentFinancialEventData = {
    appointment_id: appointment.id,
    clinic_id: appointment.clinic_id,

    // Valores
    value: appointment.estimated_value || appointment.value || 0,
    discount: appointment.discount,
    total_value: appointment.total_value || (appointment.value || 0) - (appointment.discount || 0),
    authorized_value: appointment.authorized_value,

    // Pagador
    payer_id: appointment.payer_id,
    payer_type: appointment.payer_type || 'particular',

    // Atendimento
    professional_id: appointment.professional_id,
    patient_id: appointment.patient_id,
    service_id: appointment.service_id,
    attendance_type: appointment.attendance_type || 'consultation',
    scheduled_date: appointment.scheduled_date,
    scheduled_time: appointment.scheduled_time,

    // Guia/Autorização
    guide_number: appointment.guide_number,
    guide_type: appointment.guide_type,
    authorization_code: appointment.authorization_code,
    procedure_code: appointment.procedure_code,

    // Faturável?
    is_billable: validation.is_billable,
    billing_reason: validation.warnings.join('; '),
  };

  console.log(`✅ Data prepared (NOT SENT): ${JSON.stringify(data, null, 2)}`);

  return data;
}

// ============================================================================
// 3. HANDLERS DE EVENTOS (STUB - NÃO EXECUTA)
// ============================================================================

/**
 * Handler para evento appointment.completed
 * Seria chamado quando integração financeira for ativada
 */
export async function handleAppointmentCompleted(
  event: AppointmentEvent
): Promise<void> {
  console.log(
    `📌 [STUB] handleAppointmentCompleted called for ${event.appointment.id}`
  );

  // Apenas log - NÃO faz nada
  console.log('⏸️  Financial integration not yet enabled - skipping');

  // Se quiséssemos fazer algo:
  // const data = await prepareAppointmentForBilling(event.appointment);
  // if (data) {
  //   await finananceApi.createReceivable(data);
  // }
}

/**
 * Handler para evento appointment.cancelled
 * Seria chamado quando integração financeira for ativada
 */
export async function handleAppointmentCancelled(
  event: AppointmentEvent
): Promise<void> {
  console.log(
    `📌 [STUB] handleAppointmentCancelled called for ${event.appointment.id}`
  );

  // Apenas log - NÃO faz nada
  console.log('⏸️  Financial integration not yet enabled - skipping');

  // Se quiséssemos fazer algo:
  // await financeApi.cancelReceivable(event.appointment.id);
}

/**
 * Handler para evento appointment.checked_in
 * Seria chamado quando integração financeira for ativada
 */
export async function handleAppointmentCheckedIn(
  event: AppointmentEvent
): Promise<void> {
  console.log(
    `📌 [STUB] handleAppointmentCheckedIn called for ${event.appointment.id}`
  );

  // Apenas log - NÃO faz nada
  console.log('⏸️  Financial integration not yet enabled - skipping');

  // Se quiséssemos fazer algo:
  // Atualizar status para "em_atendimento"
}

// ============================================================================
// 4. ESTRUTURA PARA INTEGRAÇÃO (DESATIVADA)
// ============================================================================

/**
 * Integrator que será ativado quando financeiro estiver pronto
 */
export class FinancialIntegrator {
  private enabled: boolean = false;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
    console.log(
      `⚙️  FinancialIntegrator created (enabled: ${enabled})`
    );
  }

  /**
   * Ativar integrator
   */
  async enable(): Promise<void> {
    this.enabled = true;
    console.log('✅ FinancialIntegrator ENABLED');
  }

  /**
   * Desativar integrator
   */
  async disable(): Promise<void> {
    this.enabled = false;
    console.log('⏸️  FinancialIntegrator DISABLED');
  }

  /**
   * Status
   */
  getStatus(): { enabled: boolean } {
    return { enabled: this.enabled };
  }

  /**
   * Processar evento de agendamento
   * Chamado por appointmentEvents.service quando integrator ativo
   */
  async processAppointmentEvent(event: AppointmentEvent): Promise<void> {
    if (!this.enabled) {
      console.log(`⏸️  FinancialIntegrator disabled - ignoring ${event.type}`);
      return;
    }

    console.log(`📥 FinancialIntegrator processing: ${event.type}`);

    switch (event.type) {
      case 'appointment.completed':
        await handleAppointmentCompleted(event);
        break;

      case 'appointment.cancelled':
        await handleAppointmentCancelled(event);
        break;

      case 'appointment.checked_in':
        await handleAppointmentCheckedIn(event);
        break;

      default:
        console.log(`ℹ️  No handler for event: ${event.type}`);
    }
  }
}

// Singleton
export const financialIntegrator = new FinancialIntegrator(false);

// ============================================================================
// 5. CAMPO VALIDATION RULES
// ============================================================================

/**
 * Validar campo individual para financeiro
 */
export function validateFinancialField(
  field: keyof AppointmentWithFinancial,
  value: any
): { valid: boolean; error?: string } {
  switch (field) {
    case 'estimated_value':
      if (value !== null && value !== undefined && value <= 0) {
        return { valid: false, error: 'Valor estimado deve ser positivo' };
      }
      return { valid: true };

    case 'payer_type':
      const validPayerTypes: PayerType[] = ['insurance', 'particular', 'company', 'government'];
      if (value && !validPayerTypes.includes(value)) {
        return {
          valid: false,
          error: `Tipo de pagador inválido. Deve ser: ${validPayerTypes.join(', ')}`,
        };
      }
      return { valid: true };

    case 'attendance_type':
      const validAttendanceTypes: AttendanceType[] = [
        'consultation', 'procedure', 'surgery', 'therapy', 'exam', 'follow_up', 'administration',
      ];
      if (value && !validAttendanceTypes.includes(value)) {
        return {
          valid: false,
          error: `Tipo de atendimento inválido. Deve ser: ${validAttendanceTypes.join(', ')}`,
        };
      }
      return { valid: true };

    case 'financial_status':
      const validStatuses: FinancialStatus[] = [
        'pending', 'provisional', 'confirmed', 'billed', 'cancelled', 'rejected',
      ];
      if (value && !validStatuses.includes(value)) {
        return {
          valid: false,
          error: `Status financeiro inválido. Deve ser: ${validStatuses.join(', ')}`,
        };
      }
      return { valid: true };

    case 'authorization_code':
      if (value && typeof value !== 'string') {
        return { valid: false, error: 'Código de autorização deve ser texto' };
      }
      return { valid: true };

    case 'guide_number':
      if (value && typeof value !== 'string') {
        return { valid: false, error: 'Número de guia deve ser texto' };
      }
      return { valid: true };

    case 'procedure_code':
      if (value && typeof value !== 'string') {
        return { valid: false, error: 'Código de procedimento deve ser texto' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  validateAppointmentForFinancial,
  prepareAppointmentForBilling,
  handleAppointmentCompleted,
  handleAppointmentCancelled,
  handleAppointmentCheckedIn,
  financialIntegrator,
  validateFinancialField,
};
