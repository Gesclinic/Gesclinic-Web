/**
 * 📋 SERVIÇO TISS - PREPARAÇÃO DE GUIAS
 * ====================================
 *
 * Preparar dados para integração TISS (Troca de Informações em Saúde Suplementar)
 * SEM gerar guias ainda - apenas prepara estrutura
 */

import {
  AppointmentWithFinancial,
  AppointmentTISSData,
} from '../types/financial';

// ============================================================================
// 1. VALIDAÇÃO TISS
// ============================================================================

/**
 * Validar se agendamento tem dados necessários para TISS
 */
export function validateForTISS(
  appointment: AppointmentWithFinancial
): {
  valid: boolean;
  missingFields: string[];
  errors: string[];
} {
  const missingFields: string[] = [];
  const errors: string[] = [];

  console.log(`🔍 [TISS] Validating appointment ${appointment.id}`);

  // Beneficiário (Paciente)
  if (!appointment.patient_id) {
    missingFields.push('patient_id');
    errors.push('Beneficiário (paciente) não informado');
  }

  // Prestador (Clínica)
  if (!appointment.clinic_id) {
    missingFields.push('clinic_id');
    errors.push('Prestador (clínica) não informado');
  }

  // Profissional (Executor)
  if (!appointment.professional_id) {
    missingFields.push('professional_id');
    errors.push('Profissional executante não informado');
  }

  // Procedimento
  if (!appointment.procedure_code) {
    missingFields.push('procedure_code');
    errors.push('Código do procedimento (CBHPM) não informado');
  }

  if (!appointment.procedure_name) {
    missingFields.push('procedure_name');
    errors.push('Nome do procedimento não informado');
  }

  // Guia
  if (!appointment.guide_number) {
    missingFields.push('guide_number');
    errors.push('Número de guia não informado');
  }

  // Tipo de guia
  if (!appointment.guide_type) {
    missingFields.push('guide_type');
    errors.push('Tipo de guia não informado');
  }

  // Valores
  if (!appointment.estimated_value || appointment.estimated_value <= 0) {
    missingFields.push('estimated_value');
    errors.push('Valor do procedimento não informado');
  }

  const valid = errors.length === 0;

  console.log(
    `📊 TISS validation: ${valid ? '✅ VALID' : '❌ INVALID'} (${errors.length} errors)`
  );

  return {
    valid,
    missingFields,
    errors,
  };
}

// ============================================================================
// 2. FORMATAÇÃO DE GUIA
// ============================================================================

/**
 * Formatar número de guia TISS
 * Formato: NNNNNNNNNNNNN (13 dígitos)
 */
export function formatTISSGuideNumber(number: string): string {
  // Remover caracteres não-numéricos
  const cleaned = number.replace(/\D/g, '');

  // Padronizar para 13 dígitos
  if (cleaned.length > 13) {
    console.warn(`⚠️  Guide number too long: ${cleaned.length} digits`);
    return cleaned.substring(0, 13);
  }

  if (cleaned.length < 13) {
    console.warn(`⚠️  Guide number too short: ${cleaned.length} digits`);
    // Preench com zeros à esquerda
    return cleaned.padStart(13, '0');
  }

  return cleaned;
}

/**
 * Gerar ID único para TISS
 */
export function generateTISSGuideId(): string {
  return `TISS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// 3. CONSTRUÇÃO DE DADOS TISS
// ============================================================================

/**
 * Construir dados TISS a partir de agendamento
 * Preparação apenas - NÃO gera guia no BD
 */
export async function buildTISSData(
  appointment: AppointmentWithFinancial,
  clinicData?: {
    name: string;
    cnpj: string;
  },
  professionalData?: {
    name: string;
    crm: string;
    specialty: string;
  }
): Promise<AppointmentTISSData | null> {
  console.log(`📋 [DRY-RUN] Building TISS data for appointment ${appointment.id}`);

  // Validar primeiro
  const validation = validateForTISS(appointment);
  if (!validation.valid) {
    console.log(
      `❌ Cannot build TISS: ${validation.errors.join('; ')}`
    );
    return null;
  }

  // Formatar guia
  const formattedGuide = appointment.guide_number
    ? formatTISSGuideNumber(appointment.guide_number)
    : generateTISSGuideId();

  const tissData: AppointmentTISSData = {
    // Guia
    guide_id: generateTISSGuideId(),
    guide_number: formattedGuide,
    guide_type: (appointment.guide_type as any) || 'PS',

    // Beneficiário (Paciente)
    beneficiary_id: appointment.patient_id || '',
    beneficiary_name: appointment.patient?.name || 'Unknown',
    beneficiary_cpf: appointment.patient?.cpf || '',

    // Prestador (Clínica)
    provider_id: appointment.clinic_id,
    provider_name: clinicData?.name || 'Clínica',
    provider_cnpj: clinicData?.cnpj || '',

    // Profissional (Executor)
    professional_id: appointment.professional_id,
    professional_name: professionalData?.name || appointment.professional?.name || 'Unknown',
    professional_crm: professionalData?.crm || appointment.professional?.crm || '',
    professional_specialty: professionalData?.specialty || appointment.professional?.specialty || '',

    // Procedimento
    procedure_code: appointment.procedure_code || '',
    procedure_name: appointment.procedure_name || 'Procedimento',
    procedure_date: appointment.scheduled_date,
    procedure_time: appointment.scheduled_time,

    // Valores
    procedure_value: appointment.estimated_value || 0,
    authorization_percentage: appointment.authorized_value
      ? (appointment.authorized_value / (appointment.estimated_value || 1)) * 100
      : 100,
    patient_copay: 0, // Será definido pela integração

    // Status
    tiss_status: 'draft',
  };

  console.log(`✅ TISS data prepared (NOT SAVED):`);
  console.log(JSON.stringify(tissData, null, 2));

  return tissData;
}

// ============================================================================
// 4. VALIDAÇÃO DE CAMPOS TISS INDIVIDUAIS
// ============================================================================

/**
 * Validar campos individuais para TISS
 */
export function validateTISSField(
  field: keyof AppointmentTISSData,
  value: any
): { valid: boolean; error?: string } {
  switch (field) {
    case 'guide_number':
      if (!value || value.toString().length !== 13) {
        return { valid: false, error: 'Número de guia deve ter 13 dígitos' };
      }
      return { valid: true };

    case 'guide_type':
      if (!['PS', 'SP', 'AH'].includes(value)) {
        return {
          valid: false,
          error: 'Tipo de guia inválido. Deve ser PS, SP ou AH',
        };
      }
      return { valid: true };

    case 'beneficiary_cpf':
      // Validação básica de CPF
      if (value && typeof value === 'string') {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length !== 11) {
          return { valid: false, error: 'CPF deve ter 11 dígitos' };
        }
      }
      return { valid: true };

    case 'procedure_code':
      // Validação básica - código CBHPM deve ter 6 dígitos
      if (value && typeof value === 'string') {
        if (!/^\d{6}$/.test(value.replace(/\D/g, ''))) {
          return { valid: false, error: 'Código CBHPM deve ter 6 dígitos' };
        }
      }
      return { valid: true };

    case 'procedure_value':
      if (value !== null && value !== undefined && value <= 0) {
        return { valid: false, error: 'Valor do procedimento deve ser positivo' };
      }
      return { valid: true };

    case 'procedure_date':
      if (!value) return { valid: false, error: 'Data do procedimento não informada' };
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { valid: false, error: 'Data do procedimento inválida' };
        }
      } catch {
        return { valid: false, error: 'Data do procedimento inválida' };
      }
      return { valid: true };

    case 'tiss_status':
      const validStatuses = ['draft', 'sent', 'confirmed', 'rejected', 'paid'];
      if (!validStatuses.includes(value)) {
        return {
          valid: false,
          error: `Status TISS inválido. Deve ser: ${validStatuses.join(', ')}`,
        };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

// ============================================================================
// 5. ESTRUTURA PARA GERAÇÃO FUTURA
// ============================================================================

/**
 * Interface para gerador de guias TISS
 * Será implementada quando integração TISS ativada
 */
export interface TISSGuideGenerator {
  generateGuide(data: AppointmentTISSData): Promise<string>;
  validateGuide(guide: AppointmentTISSData): Promise<boolean>;
  sendToOperator(guideNumber: string): Promise<any>;
}

/**
 * Stub de gerador TISS
 * Não faz nada - apenas placeholder para integração futura
 */
export class TISSGuideGeneratorStub implements TISSGuideGenerator {
  async generateGuide(data: AppointmentTISSData): Promise<string> {
    console.log(`⏸️  [STUB] Would generate TISS guide for: ${data.procedure_name}`);
    return data.guide_number;
  }

  async validateGuide(guide: AppointmentTISSData): Promise<boolean> {
    console.log(`⏸️  [STUB] Would validate TISS guide: ${guide.guide_number}`);
    return true;
  }

  async sendToOperator(guideNumber: string): Promise<any> {
    console.log(`⏸️  [STUB] Would send guide to operator: ${guideNumber}`);
    return { status: 'pending', message: 'Not sent (stub mode)' };
  }
}

/**
 * Singleton
 */
export const tissGuideGenerator = new TISSGuideGeneratorStub();

// ============================================================================
// 6. MAPEAMENTOS CBHPM
// ============================================================================

/**
 * Tabela resumida de códigos CBHPM comuns
 * Completa será integrada com banco de dados
 */
export const COMMON_CBHPM_CODES = {
  '301401': { code: '301401', name: 'Consulta - Clínica Geral' },
  '304102': { code: '304102', name: 'Sutura - Primeiro ponto' },
  '304110': { code: '304110', name: 'Sutura - Ponto adicional' },
  '404101': { code: '404101', name: 'Radiografia - Tórax' },
  '405101': { code: '405101', name: 'Ultrassom - Abdominal' },
  '502801': { code: '502801', name: 'Fisioterapia - Sessão' },
} as const;

/**
 * Buscar código CBHPM
 */
export function lookupCBHPMCode(code: string) {
  const key = code as keyof typeof COMMON_CBHPM_CODES;
  if (key in COMMON_CBHPM_CODES) {
    return COMMON_CBHPM_CODES[key];
  }

  // Se não encontrar, retorna estrutura vazia
  return {
    code,
    name: 'Procedimento não encontrado na tabela',
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  validateForTISS,
  buildTISSData,
  formatTISSGuideNumber,
  generateTISSGuideId,
  validateTISSField,
  lookupCBHPMCode,
  tissGuideGenerator,
  COMMON_CBHPM_CODES,
};
