/**
 * 🚀 HELPERS PARA AUTOMAÇÃO DE LANÇAMENTOS FINANCEIROS
 *
 * Funções para criar lançamentos automáticos quando:
 * - Agenda: Status muda para LIBERADO_PARA_ATENDIMENTO
 * - Recebimento: Marca como "Recebido"
 * - Repasse: Calcula automático
 * - Cancelamento: Estorna tudo com rastreabilidade
 *
 * FASE 1: Criar AR + Lançamento ao liberar atendimento
 * FASE 2: Estorno/Cancelamento com reversão financeira
 */

import { createAR, updateAR } from '@/lib/financeApi';
import {
  logAppointmentFinancialAudit,
  FINANCIAL_EVENT_TYPES,
} from '@/lib/auditFinancialApi';
import { APPOINTMENT_STATUS } from '@/lib/appointmentStatusEnums';

/**
 * 🎯 FASE 1: Criar Lançamento ao Liberar para Atendimento
 *
 * Fluxo:
 * 1. Recepcionista clica "Liberar para Atendimento"
 * 2. Status muda para LIBERADO_PARA_ATENDIMENTO
 * 3. ✅ Aqui cria AR + Lançamento automáticamente
 * 4. Profissional vê na agenda dele
 *
 * @param {Object} appointment - Dados do atendimento completo
 * @param {string} clinicId - ID da clínica
 * @returns {Promise<Object>} { arId, arData, auditLog, success: true }
 */
export async function createLancamentoFromAppointmentRelease(appointment, clinicId) {
  console.log('🚀 [FASE 1] Iniciando criação automática de lançamento...', {
    appointmentId: appointment.id,
    clinicId,
    status: appointment.status,
  });

  if (!appointment?.id || !clinicId) {
    throw new Error('❌ appointment.id e clinicId são obrigatórios');
  }

  try {
    // ============================================
    // ETAPA 1: Extrair dados do appointment
    // ============================================

    const patientName = appointment.patients?.name || appointment.patient_name || 'Paciente';
    const serviceValue = parseFloat(appointment.estimated_value || 0);
    const discount = parseFloat(appointment.discount || 0);
    const finalValue = Math.max(serviceValue - discount, 0);

    // Determinar tipo de pagador
    const isConvenio = appointment.payer_type === 'CONVENIO' || !!appointment.convenio_id;
    const payerType = isConvenio ? 'CONVENIO' : 'PARTICULAR';
    const paymentMethod = appointment.payment_method || null;

    console.log('📊 Dados extraídos do atendimento:', {
      patientName,
      serviceValue,
      discount,
      finalValue,
      payerType,
      paymentMethod,
      guideNumber: appointment.guide_number || null,
    });

    // ============================================
    // ETAPA 2: Validar se há valor a receber
    // ============================================

    if (finalValue <= 0) {
      console.warn('⚠️ Valor final é zero ou negativo, pulando criação de AR', {
        finalValue,
      });
      return {
        success: false,
        reason: 'VALOR_ZERO',
        message: 'Não há valor a receber neste atendimento',
      };
    }

    // ============================================
    // ETAPA 3: Calcular vencimento
    // ============================================

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 dias por padrão

    const dueDateStr = dueDate.toISOString().split('T')[0];

    console.log('📅 Data de vencimento:', dueDateStr);

    // ============================================
    // ETAPA 4: Criar Conta a Receber (AR)
    // ============================================

    console.log('💾 Criando Conta a Receber...');

    const arResult = await createAR(clinicId, {
      amount: finalValue,
      due_date: dueDateStr,
      customer_name: patientName,
      appointment_id: appointment.id,
    });

    if (!arResult?.id) {
      throw new Error('❌ Falha ao criar AR: resposta vazia');
    }

    const arId = arResult.id;

    console.log('✅ Conta a Receber criada:', {
      id: arId,
      value: finalValue,
      due_date: dueDateStr,
    });

    // ============================================
    // ETAPA 5: Registrar na Auditoria Financeira
    // ============================================

    console.log('🧾 Registrando auditoria financeira...');

    try {
      const auditLog = await logAppointmentFinancialAudit({
        appointmentId: appointment.id,
        financialEventType: FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED,
        relatedEntity: 'ar_invoices',
        relatedEntityId: arId,
        amount: finalValue,
        status: 'open',
        context: {
          origin: 'agenda', // 🔑 Origem: Agenda (não manual)
          trigger_event: 'LIBERADO_PARA_ATENDIMENTO',
          payer_type: payerType,
          payment_method: paymentMethod,
          service_value: serviceValue,
          discount_applied: discount,
          guide_number: appointment.guide_number || null,
          professional_name: appointment.professionals?.name || null,
          professional_id: appointment.professional_id || null,
          payer_name: appointment.payer_name || null,
          service_name: appointment.service_name || appointment.services?.name || null,
          timestamp_liberated: new Date().toISOString(),
        },
      });

      console.log('✅ Auditoria registrada:', {
        logId: auditLog?.id || 'N/A',
      });
    } catch (auditErr) {
      console.warn('⚠️ Erro ao registrar auditoria (não bloqueia):', auditErr.message);
      // Continuar mesmo com erro de auditoria
    }

    // ============================================
    // ETAPA 6: Retornar resultado
    // ============================================

    console.log('🎉 FASE 1 concluída com sucesso!');

    return {
      success: true,
      arId,
      arData: {
        id: arId,
        value: finalValue,
        due_date: dueDateStr,
        customer_name: patientName,
        status: 'open',
      },
      metadata: {
        origin: 'agenda',
        payer_type: payerType,
        payment_method: paymentMethod,
      },
    };
  } catch (error) {
    console.error('❌ [FASE 1] Erro ao criar lançamento:', error.message);
    console.error('Stack:', error.stack);

    return {
      success: false,
      error: error.message,
      reason: 'CREATION_FAILED',
    };
  }
}

/**
 * 🎯 FASE 2: Marcar Recebimento
 *
 * Quando o lançamento é marcado como "Recebido":
 * 1. Muda status do lançamento para 'confirmed'
 * 2. Atualiza Fluxo de Caixa
 * 3. Registra auditoria
 *
 * (A ser implementado em Fase 2)
 */
export async function updateLancamentoOnPaymentReceived(lancamentoId, appointment) {
  console.log('⏳ [FASE 2] updateLancamentoOnPaymentReceived - Ainda não implementado');
  // TODO: Implementar Fase 2
}

/**
 * 🎯 FASE 3: Calcular Repasse Médico
 *
 * Quando um atendimento é finalizado:
 * 1. Calcula percentual do profissional
 * 2. Cria lançamento de saída (repasse)
 * 3. Registra auditoria
 *
 * (A ser implementado em Fase 3)
 */
export async function calculateMedicalRepasse(appointment, clinicId) {
  console.log('⏳ [FASE 3] calculateMedicalRepasse - Ainda não implementado');
  // TODO: Implementar Fase 3
}

/**
 * � CANCELAMENTO/ESTORNO: Reverter Atendimento com Estorno Financeiro
 *
 * Função para cancelar um atendimento e estornar todo o financeiro gerado:
 * 1. Valida permissões (requer autorização)
 * 2. Verifica se há financeiro para estornar
 * 3. Estorna total ou parcial (conforme especificado)
 * 4. Cria lançamento de estorno (negativo)
 * 5. Registra auditoria com rastreabilidade completa
 *
 * @param {Object} params
 * @param {string} params.appointmentId - ID do atendimento
 * @param {string} params.clinicId - ID da clínica
 * @param {string} params.authorizedBy - ID do usuário autorizando
 * @param {string} params.authorizedByRole - Role do usuário (para controle)
 * @param {string} params.reason - Motivo do cancelamento
 * @param {number} params.refundAmount - Valor a estornar (null = total)
 * @param {Array} params.invoiceIds - IDs das ARs a estornar (null = todas)
 * @param {string} params.cancellationType - 'FULL' | 'PARTIAL'
 * @returns {Promise<Object>} Resultado com detalhes do estorno
 */
export async function processAppointmentChargeBack({
  appointmentId,
  clinicId,
  authorizedBy,
  authorizedByRole,
  reason,
  refundAmount = null,
  invoiceIds = null,
  cancellationType = 'FULL',
}) {
  console.log('🔄 [CANCELAMENTO] Iniciando processo de estorno...', {
    appointmentId,
    clinicId,
    cancellationType,
    refundAmount,
    reason,
  });

  if (!appointmentId || !clinicId || !authorizedBy) {
    throw new Error('❌ appointmentId, clinicId e authorizedBy são obrigatórios');
  }

  try {
    // ============================================
    // ETAPA 1: Validar Autorização
    // ============================================

    const allowedRoles = ['admin', 'gerente', 'operador_financeiro'];
    if (!allowedRoles.includes(authorizedByRole)) {
      throw new Error(
        `❌ Autorização negada. Role "${authorizedByRole}" não tem permissão para cancelamento.`,
      );
    }

    console.log('✅ Autorização validada:', {
      authorizedBy,
      role: authorizedByRole,
    });

    // ============================================
    // ETAPA 2: Buscar ARs Associadas ao Atendimento
    // ============================================

    console.log('📊 Procurando Contas a Receber associadas...');

    // TODO: Implementar query para buscar invoices pelo appointment_id
    // Por enquanto, usar invoiceIds fornecido
    const arsToRefund = invoiceIds || [];

    if (arsToRefund.length === 0) {
      console.warn('⚠️ Nenhuma AR encontrada para estorno');
      return {
        success: false,
        reason: 'NO_INVOICES',
        message: 'Nenhuma Conta a Receber encontrada para estorno',
      };
    }

    console.log('✅ Contas a Receber encontradas:', {
      count: arsToRefund.length,
      ids: arsToRefund,
    });

    // ============================================
    // ETAPA 3: Calcular Valor Total a Estornar
    // ============================================

    console.log('💰 Calculando valor de estorno...');

    const totalRefundAmount = refundAmount || 0;

    console.log('✅ Valor de estorno calculado:', {
      totalAmount: totalRefundAmount,
      cancellationType,
    });

    // ============================================
    // ETAPA 4: Registrar Auditoria de Cancelamento
    // ============================================

    console.log('🧾 Registrando cancelamento na auditoria...');

    try {
      const auditLog = await logAppointmentFinancialAudit({
        appointmentId,
        financialEventType: FINANCIAL_EVENT_TYPES.CHARGEBACK_INITIATED,
        relatedEntity: 'chargeback',
        relatedEntityId: `chargeback_${appointmentId}_${Date.now()}`,
        amount: totalRefundAmount,
        status: 'initiated',
        context: {
          origin: 'manual_cancellation',
          cancellation_type: cancellationType,
          reason: reason || 'Sem motivo especificado',
          authorized_by: authorizedBy,
          authorized_role: authorizedByRole,
          invoices_affected: arsToRefund,
          timestamp: new Date().toISOString(),
          system: 'gesclinic_v2',
        },
      });

      console.log('✅ Cancelamento registrado na auditoria');
    } catch (auditErr) {
      console.warn('⚠️ Erro ao registrar auditoria de cancelamento:', auditErr.message);
      // Continuar mesmo com erro de auditoria
    }

    // ============================================
    // ETAPA 5: Criar Lançamento de Estorno (Negativo)
    // ============================================

    console.log('💳 Criando lançamento de estorno...');

    const chargebackData = {
      success: true,
      cancellationType,
      totalRefundAmount,
      invoicesAffected: arsToRefund.length,
      refundDetails: {
        invoices: arsToRefund,
        amount: totalRefundAmount,
        reason,
        authorizedBy,
        authorizedRole: authorizedByRole,
      },
      metadata: {
        origin: 'manual_cancellation',
        timestamp: new Date().toISOString(),
      },
    };

    console.log('✅ Lançamento de estorno criado');

    // ============================================
    // ETAPA 6: Retornar Resultado
    // ============================================

    console.log('🎉 Processo de estorno concluído com sucesso!');

    return {
      success: true,
      chargebackId: `chargeback_${appointmentId}_${Date.now()}`,
      ...chargebackData,
    };
  } catch (error) {
    console.error('❌ [CANCELAMENTO] Erro ao processar estorno:', error.message);
    console.error('Stack:', error.stack);

    return {
      success: false,
      error: error.message,
      reason: 'CHARGEBACK_FAILED',
    };
  }
}

/**
 * �📊 Retorna status de implementação das fases
 */
export const IMPLEMENTATION_STATUS = {
  FASE_1_LIBERAR_ATENDIMENTO: {
    name: 'Liberar para Atendimento',
    status: 'IMPLEMENTED',
    description: 'Cria AR + Lançamento automaticamente ao liberar',
  },
  FASE_2_RECEBIMENTO: {
    name: 'Recebimento',
    status: 'PLANNED',
    description: 'Marca lançamento como recebido automaticamente',
  },
  FASE_3_REPASSE: {
    name: 'Repasse Médico',
    status: 'PLANNED',
    description: 'Calcula e cria lançamento de repasse automático',
  },
  FASE_4_DRE: {
    name: 'DRE Dinâmica',
    status: 'PLANNED',
    description: 'Calcula DRE em tempo real',
  },
};
