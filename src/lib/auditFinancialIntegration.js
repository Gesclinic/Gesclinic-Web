/**
 * 🔗 INTEGRAÇÃO DE AUDITORIA FINANCEIRA
 *
 * Funções wrapper que adicionam logging automático aos fluxos existentes:
 * - financeApi.createAR() → logAppointmentFinancialAudit(RECEIVABLE_CREATED)
 * - financeApi.updateAR() → logAppointmentFinancialAudit(PAYMENT_RECEIVED)
 * - repasseMedicoApi.gerarRepasse() → logAppointmentFinancialAudit(REPASSE_CALCULATED)
 * - repasseMedicoApi.liberarRepasseParaPagamento() → logAppointmentFinancialAudit(REPASSE_PAID)
 *
 * Como usar:
 * - Importar este arquivo antes de usar as APIs: import "@/lib/auditFinancialIntegration"
 * - Ou adicionar import em main.jsx/App.jsx para inicializar globalmente
 */

import {
  logAppointmentFinancialAudit,
  FINANCIAL_EVENT_TYPES,
  RELATED_ENTITY_TYPES,
} from '@/lib/auditFinancialApi';

/**
 * Log de Conta a Receber Criada
 *
 * @param {string} appointmentId - ID do atendimento
 * @param {string} receivableId - ID da conta a receber criada
 * @param {number} amount - Valor da conta
 * @param {Object} context - Contexto adicional
 */
export async function logReceivableCreated(appointmentId, receivableId, amount, context = {}) {
  return logAppointmentFinancialAudit({
    appointmentId,
    financialEventType: FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED,
    relatedEntity: RELATED_ENTITY_TYPES.ACCOUNTS_RECEIVABLE,
    relatedEntityId: receivableId,
    amount,
    status: 'open',
    context: {
      description: 'Conta a receber foi criada para este atendimento',
      ...context,
    },
  });
}

/**
 * Log de Pagamento Recebido
 *
 * @param {string} appointmentId - ID do atendimento
 * @param {string} receivableId - ID da conta a receber
 * @param {number} amount - Valor pago
 * @param {number} previousAmount - Valor anterior pendente
 * @param {string} status - Status após pagamento (received, partial)
 * @param {Object} context - Contexto adicional
 */
export async function logPaymentReceived(
  appointmentId,
  receivableId,
  amount,
  previousAmount,
  status = 'received',
  context = {},
) {
  return logAppointmentFinancialAudit({
    appointmentId,
    financialEventType: FINANCIAL_EVENT_TYPES.PAYMENT_RECEIVED,
    relatedEntity: RELATED_ENTITY_TYPES.ACCOUNTS_RECEIVABLE,
    relatedEntityId: receivableId,
    amount,
    previousAmount,
    status,
    context: {
      description: `Pagamento de R$ ${amount} foi recebido`,
      ...context,
    },
  });
}

/**
 * Log de Guia de Convênio Criada
 *
 * @param {string} appointmentId - ID do atendimento
 * @param {string} billingGuideId - ID da guia de convênio
 * @param {number} amount - Valor da guia
 * @param {string} payerId - ID do convênio
 * @param {Object} context - Contexto adicional
 */
export async function logBillingGuideCreated(
  appointmentId,
  billingGuideId,
  amount,
  payerId,
  context = {},
) {
  return logAppointmentFinancialAudit({
    appointmentId,
    financialEventType: FINANCIAL_EVENT_TYPES.BILLING_GUIDE_CREATED,
    relatedEntity: RELATED_ENTITY_TYPES.BILLING_GUIDE,
    relatedEntityId: billingGuideId,
    amount,
    status: 'created',
    context: {
      description: 'Guia de convênio foi gerada para este atendimento',
      payer_id: payerId,
      ...context,
    },
  });
}

/**
 * Log de Guia Enviada para Operadora
 *
 * @param {string} appointmentId - ID do atendimento
 * @param {string} billingGuideId - ID da guia
 * @param {number} amount - Valor da guia
 * @param {Object} context - Contexto adicional
 */
export async function logBillingSent(appointmentId, billingGuideId, amount, context = {}) {
  return logAppointmentFinancialAudit({
    appointmentId,
    financialEventType: FINANCIAL_EVENT_TYPES.BILLING_SENT,
    relatedEntity: RELATED_ENTITY_TYPES.BILLING_GUIDE,
    relatedEntityId: billingGuideId,
    amount,
    status: 'sent',
    context: {
      description: 'Guia foi enviada para a operadora de saúde',
      ...context,
    },
  });
}

/**
 * Log de Glosa Registrada
 *
 * @param {string} appointmentId - ID do atendimento
 * @param {string} glosaId - ID da glosa
 * @param {number} amount - Valor glosado
 * @param {string} reason - Motivo da glosa
 * @param {Object} context - Contexto adicional
 */
export async function logGlosaRegistered(appointmentId, glosaId, amount, reason, context = {}) {
  return logAppointmentFinancialAudit({
    appointmentId,
    financialEventType: FINANCIAL_EVENT_TYPES.GLOSA_REGISTERED,
    relatedEntity: RELATED_ENTITY_TYPES.GLOSA,
    relatedEntityId: glosaId,
    amount,
    status: 'glossed',
    context: {
      description: `Glosa registrada: ${reason}`,
      reason,
      ...context,
    },
  });
}

/**
 * Log de Glosa Revertida
 *
 * @param {string} appointmentId - ID do atendimento
 * @param {string} glosaId - ID da glosa
 * @param {number} amount - Valor revertido
 * @param {string} reason - Motivo da reversão
 * @param {Object} context - Contexto adicional
 */
export async function logGlosaReversed(appointmentId, glosaId, amount, reason, context = {}) {
  return logAppointmentFinancialAudit({
    appointmentId,
    financialEventType: FINANCIAL_EVENT_TYPES.GLOSA_REVERSED,
    relatedEntity: RELATED_ENTITY_TYPES.GLOSA,
    relatedEntityId: glosaId,
    amount,
    status: 'reversed',
    context: {
      description: `Glosa revertida: ${reason}`,
      reason,
      ...context,
    },
  });
}

/**
 * Log de Repasse Médico Calculado
 *
 * @param {string} appointmentId - ID do atendimento
 * @param {string} professionalId - ID do profissional
 * @param {string} repasseId - ID do repasse médico
 * @param {number} amount - Valor do repasse
 * @param {number} commission - Comissão
 * @param {Object} context - Contexto adicional
 */
export async function logRepasseCalculated(
  appointmentId,
  professionalId,
  repasseId,
  amount,
  commission,
  context = {},
) {
  return logAppointmentFinancialAudit({
    appointmentId,
    financialEventType: FINANCIAL_EVENT_TYPES.REPASSE_CALCULATED,
    relatedEntity: RELATED_ENTITY_TYPES.REPASSE_MEDICO,
    relatedEntityId: repasseId,
    amount,
    status: 'calculated',
    context: {
      description: `Repasse médico calculado: R$ ${amount}`,
      professional_id: professionalId,
      commission,
      ...context,
    },
  });
}

/**
 * Log de Repasse Médico Pago
 *
 * @param {string} appointmentId - ID do atendimento
 * @param {string} professionalId - ID do profissional
 * @param {string} repasseId - ID do repasse médico
 * @param {number} amount - Valor do repasse pago
 * @param {Object} context - Contexto adicional
 */
export async function logRepassePaid(
  appointmentId,
  professionalId,
  repasseId,
  amount,
  context = {},
) {
  return logAppointmentFinancialAudit({
    appointmentId,
    financialEventType: FINANCIAL_EVENT_TYPES.REPASSE_PAID,
    relatedEntity: RELATED_ENTITY_TYPES.REPASSE_MEDICO,
    relatedEntityId: repasseId,
    amount,
    status: 'paid',
    context: {
      description: `Repasse médico pago: R$ ${amount}`,
      professional_id: professionalId,
      ...context,
    },
  });
}

/**
 * Exportar todas as funções
 */
export const AuditIntegration = {
  logReceivableCreated,
  logPaymentReceived,
  logBillingGuideCreated,
  logBillingSent,
  logGlosaRegistered,
  logGlosaReversed,
  logRepasseCalculated,
  logRepassePaid,
};

export default AuditIntegration;
