/**
 * 💰 CONSTANTES DE INTEGRAÇÃO FINANCEIRA E TISS
 * =============================================
 *
 * Configurações para integração com Financeiro e Faturamento
 * Inclui enums, mapeamentos, e tabelas de códigos
 */

import {
  FinancialStatus,
  AttendanceType,
  PayerType,
  AuthorizationStatus,
} from '../types/financial';

// ============================================================================
// 1. STATUS FINANCEIRO
// ============================================================================

export const FINANCIAL_STATUS_CONFIG: Record<
  FinancialStatus,
  {
    label: string;
    description: string;
    icon: string;
    color: string;
    canTransitionTo: FinancialStatus[];
    blockEdit: boolean;
  }
> = {
  pending: {
    label: 'Pendente',
    description: 'Aguardando processamento',
    icon: '⏳',
    color: 'yellow',
    canTransitionTo: ['provisional', 'rejected'],
    blockEdit: false,
  },
  provisional: {
    label: 'Provisório',
    description: 'Pode ser editado',
    icon: '✏️',
    color: 'blue',
    canTransitionTo: ['confirmed', 'cancelled'],
    blockEdit: false,
  },
  confirmed: {
    label: 'Confirmado',
    description: 'Não pode ser editado',
    icon: '✅',
    color: 'green',
    canTransitionTo: ['billed', 'cancelled'],
    blockEdit: true,
  },
  billed: {
    label: 'Faturado',
    description: 'Já foi para faturamento',
    icon: '📄',
    color: 'cyan',
    canTransitionTo: [],
    blockEdit: true,
  },
  cancelled: {
    label: 'Cancelado',
    description: 'Cancelado',
    icon: '🚫',
    color: 'red',
    canTransitionTo: [],
    blockEdit: true,
  },
  rejected: {
    label: 'Rejeitado',
    description: 'Rejeitado pela validação',
    icon: '❌',
    color: 'red',
    canTransitionTo: ['provisional'],
    blockEdit: false,
  },
};

// ============================================================================
// 2. TIPO DE ATENDIMENTO
// ============================================================================

export const ATTENDANCE_TYPE_CONFIG: Record<
  AttendanceType,
  {
    label: string;
    code: string;
    description: string;
    cbhpmEligible: boolean;
    requiresAuthorization: boolean;
  }
> = {
  consultation: {
    label: 'Consulta',
    code: '01',
    description: 'Consulta / Atendimento clínico',
    cbhpmEligible: true,
    requiresAuthorization: false,
  },
  procedure: {
    label: 'Procedimento',
    code: '02',
    description: 'Procedimento / Técnica',
    cbhpmEligible: true,
    requiresAuthorization: true,
  },
  surgery: {
    label: 'Cirurgia',
    code: '03',
    description: 'Procedimento cirúrgico',
    cbhpmEligible: true,
    requiresAuthorization: true,
  },
  therapy: {
    label: 'Terapia',
    code: '04',
    description: 'Terapia / Reabilitação',
    cbhpmEligible: true,
    requiresAuthorization: true,
  },
  exam: {
    label: 'Exame',
    code: '05',
    description: 'Exame diagnóstico',
    cbhpmEligible: true,
    requiresAuthorization: true,
  },
  follow_up: {
    label: 'Retorno',
    code: '06',
    description: 'Consulta de retorno/acompanhamento',
    cbhpmEligible: true,
    requiresAuthorization: false,
  },
  administration: {
    label: 'Administrativa',
    code: '99',
    description: 'Atividade administrativa',
    cbhpmEligible: false,
    requiresAuthorization: false,
  },
};

// ============================================================================
// 3. TIPO DE PAGADOR
// ============================================================================

export const PAYER_TYPE_CONFIG: Record<
  PayerType,
  {
    label: string;
    code: string;
    requiresGuide: boolean;
    requiresAuthorization: boolean;
    requiresCopay: boolean;
    taxApplied: number; // percentual de taxa administrativa
  }
> = {
  insurance: {
    label: 'Convênio / Seguro',
    code: '01',
    requiresGuide: true,
    requiresAuthorization: true,
    requiresCopay: false,
    taxApplied: 5, // 5% de taxa
  },
  particular: {
    label: 'Particular',
    code: '02',
    requiresGuide: false,
    requiresAuthorization: false,
    requiresCopay: false,
    taxApplied: 0,
  },
  company: {
    label: 'Empresa / Corporate',
    code: '03',
    requiresGuide: false,
    requiresAuthorization: true,
    requiresCopay: false,
    taxApplied: 3, // 3% de taxa
  },
  government: {
    label: 'Público / SUS',
    code: '04',
    requiresGuide: true,
    requiresAuthorization: true,
    requiresCopay: false,
    taxApplied: 0,
  },
};

// ============================================================================
// 4. STATUS DE AUTORIZAÇÃO
// ============================================================================

export const AUTHORIZATION_STATUS_CONFIG: Record<
  AuthorizationStatus,
  {
    label: string;
    description: string;
    icon: string;
    canProceed: boolean;
  }
> = {
  not_required: {
    label: 'Não Requerido',
    description: 'Autorização não necessária',
    icon: '✅',
    canProceed: true,
  },
  pending: {
    label: 'Aguardando',
    description: 'Aguardando resposta da operadora',
    icon: '⏳',
    canProceed: false,
  },
  authorized: {
    label: 'Autorizado',
    description: 'Autorizado pela operadora',
    icon: '✅',
    canProceed: true,
  },
  denied: {
    label: 'Negado',
    description: 'Negado pela operadora',
    icon: '❌',
    canProceed: false,
  },
  expired: {
    label: 'Expirado',
    description: 'Autorização expirou',
    icon: '⏰',
    canProceed: false,
  },
};

// ============================================================================
// 5. TABELA TISS - TIPOS DE GUIA
// ============================================================================

export const TISS_GUIDE_TYPES = {
  PS: {
    code: 'PS',
    label: 'Prestação de Serviço',
    description: 'Serviço prestado',
    canRetroactive: false,
  },
  SP: {
    code: 'SP',
    label: 'Serviço Profissional',
    description: 'Honorários profissionais',
    canRetroactive: false,
  },
  AH: {
    code: 'AH',
    label: 'Autorização de Honorário',
    description: 'Autorização prévia de honorários',
    canRetroactive: true,
  },
} as const;

// ============================================================================
// 6. INTEGRAÇÃO E CONFIGURAÇÃO
// ============================================================================

export const FINANCIAL_INTEGRATION_CONFIG = {
  // Ativação
  ENABLED: false,                    // ⚠️ Desativado por padrão
  
  // Comportamento quando ativado
  AUTO_CREATE_RECEIVABLE: false,     // Criar AR Receivable?
  AUTO_CREATE_TISS_GUIDE: false,     // Criar guia TISS?
  AUTO_SEND_TO_BILLING: false,       // Enviar para faturamento?
  
  // Qual status dispara eventos
  TRIGGER_EVENTS_ON_STATUSES: [
    'completed',
    'cancelled',
    'checked_in',
  ] as const,
  
  // Validação
  REQUIRE_AUTHORIZATION: true,       // Exigir autorização para convênio?
  REQUIRE_GUIDE_NUMBER: true,        // Exigir número de guia TISS?
  REQUIRE_PROCEDURE_CODE: true,      // Exigir código CBHPM?
  
  // Valores
  DEFAULT_ATTENDANCE_TYPE: 'consultation' as AttendanceType,
  DEFAULT_PAYER_TYPE: 'particular' as PayerType,
  
  // Timing
  EVENT_DELAY_MS: 0,                 // Delay antes de disparar eventos
  
  // Log/Debug
  DEBUG_MODE: false,                 // Log detalhado?
};

// ============================================================================
// 7. MENSAGENS
// ============================================================================

export const FINANCIAL_MESSAGES = {
  // Sucesso
  VALIDATION_PASSED: 'Validação financeira passou',
  READY_FOR_BILLING: 'Pronto para faturamento',
  BILLING_IN_PROGRESS: 'Enviando para faturamento...',
  BILLING_COMPLETED: 'Faturamento completado',
  
  // Erros
  VALIDATION_FAILED: 'Falha na validação financeira',
  MISSING_PATIENT: 'Paciente não informado',
  MISSING_PROFESSIONAL: 'Profissional não informado',
  MISSING_VALUE: 'Valor não informado',
  MISSING_PAYER: 'Convênio não informado',
  MISSING_AUTHORIZATION: 'Autorização não informada',
  MISSING_GUIDE_NUMBER: 'Número de guia não informado',
  
  // Avisos
  NO_PAYER: 'Nenhum convênio - será faturado como particular',
  NO_SERVICE: 'Serviço não informado',
  INCOMPLETE_DATA: 'Dados incompletos para faturamento',
  
  // Info
  FINANCIAL_INTEGRATION_DISABLED: 'Integração financeira desativada',
  DRY_RUN_MODE: 'Modo simulação (não cria dados financeiros)',
};

// ============================================================================
// 8. HELPER FUNCTIONS
// ============================================================================

export function getFinancialStatusConfig(status: FinancialStatus) {
  return FINANCIAL_STATUS_CONFIG[status];
}

export function getAttendanceTypeConfig(type: AttendanceType) {
  return ATTENDANCE_TYPE_CONFIG[type];
}

export function getPayerTypeConfig(type: PayerType) {
  return PAYER_TYPE_CONFIG[type];
}

export function getAuthorizationStatusConfig(status: AuthorizationStatus) {
  return AUTHORIZATION_STATUS_CONFIG[status];
}

export function canTransitionFinancialStatus(
  from: FinancialStatus,
  to: FinancialStatus
): boolean {
  return FINANCIAL_STATUS_CONFIG[from].canTransitionTo.includes(to);
}

export function requiresAuthorizationFor(payer: PayerType): boolean {
  return PAYER_TYPE_CONFIG[payer].requiresAuthorization;
}

export function requiresGuideFor(payer: PayerType): boolean {
  return PAYER_TYPE_CONFIG[payer].requiresGuide;
}

// ============================================================================
// 9. ARRAYS DE VALORES
// ============================================================================

export const FINANCIAL_STATUSES = Object.keys(
  FINANCIAL_STATUS_CONFIG
) as FinancialStatus[];

export const ATTENDANCE_TYPES = Object.keys(
  ATTENDANCE_TYPE_CONFIG
) as AttendanceType[];

export const PAYER_TYPES = Object.keys(PAYER_TYPE_CONFIG) as PayerType[];

export const AUTHORIZATION_STATUSES = Object.keys(
  AUTHORIZATION_STATUS_CONFIG
) as AuthorizationStatus[];

// ============================================================================
// EXPORT
// ============================================================================

export default {
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
  // Helpers
  getFinancialStatusConfig,
  getAttendanceTypeConfig,
  getPayerTypeConfig,
  getAuthorizationStatusConfig,
  canTransitionFinancialStatus,
  requiresAuthorizationFor,
  requiresGuideFor,
};
