/**
 * 🧾 AUDITORIA FINANCEIRA DO ATENDIMENTO
 *
 * API para logging automático de eventos financeiros:
 * - Rastreamento de conta a receber
 * - Guia de convênio
 * - Pagamentos
 * - Glosas
 * - Repasses médicos
 *
 * Sistema append-only: não permite updates/deletes
 */

import { supabase } from '@/lib/customSupabaseClient';

// ============================================================
// CONSTANTES
// ============================================================

export const FINANCIAL_EVENT_TYPES = {
  RECEIVABLE_CREATED: 'RECEIVABLE_CREATED',
  BILLING_GUIDE_CREATED: 'BILLING_GUIDE_CREATED',
  BILLING_SENT: 'BILLING_SENT',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  GLOSA_REGISTERED: 'GLOSA_REGISTERED',
  GLOSA_REVERSED: 'GLOSA_REVERSED',
  REPASSE_CALCULATED: 'REPASSE_CALCULATED',
  REPASSE_PAID: 'REPASSE_PAID',
  CHARGEBACK_INITIATED: 'CHARGEBACK_INITIATED',
  CHARGEBACK_COMPLETED: 'CHARGEBACK_COMPLETED',
  CHARGEBACK_REVERSED: 'CHARGEBACK_REVERSED',
};

export const RELATED_ENTITY_TYPES = {
  AR_INVOICE: 'ar_invoices',
  BILLING_GUIDE: 'billing_guide',
  GLOSA: 'glosa',
  REPASSE_MEDICO: 'repasse_medico',
};

// ============================================================
// FUNÇÃO PRINCIPAL DE LOGGING
// ============================================================

/**
 * Log de evento financeiro do atendimento
 *
 * @param {Object} params
 * @param {string} params.appointmentId - ID do atendimento (OBRIGATÓRIO)
 * @param {string} params.financialEventType - Tipo de evento (FINANCIAL_EVENT_TYPES)
 * @param {string} params.relatedEntity - Entidade relacionada (RELATED_ENTITY_TYPES)
 * @param {string} params.relatedEntityId - ID da entidade relacionada
 * @param {number} params.amount - Valor do evento
 * @param {number} params.previousAmount - Valor anterior (para mudanças)
 * @param {string} params.status - Status atual
 * @param {Object} params.context - Dados contextuais adicionais (JSONB)
 * @returns {Promise<Object>} Log criado
 */
export async function logAppointmentFinancialAudit({
  appointmentId,
  financialEventType,
  relatedEntity = null,
  relatedEntityId = null,
  amount = null,
  previousAmount = null,
  status = null,
  context = null,
}) {
  // Validações obrigatórias
  if (!appointmentId || !financialEventType) {
    console.error(
      'logAppointmentFinancialAudit: appointmentId e financialEventType são obrigatórios',
    );
    return null;
  }

  if (!Object.values(FINANCIAL_EVENT_TYPES).includes(financialEventType)) {
    console.error(
      `logAppointmentFinancialAudit: financialEventType inválido: ${financialEventType}`,
    );
    return null;
  }

  try {
    // Obter usuário atual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Obter role do usuário
    let userRole = null;
    if (userId) {
      try {
        // ⚠️ COMENTADO: Coluna role_name não existe em user_roles
        // TODO: Verificar estrutura correta da tabela user_roles
        // const { data: roleData } = await supabase
        //   .from("user_roles")
        //   .select("role_name")
        //   .eq("user_id", userId)
        //   .single();
        //
        // userRole = roleData?.role_name || "UNKNOWN";
        userRole = 'UNKNOWN';
      } catch (err) {
        userRole = 'UNKNOWN';
      }
    }

    // Enriquecer contexto com informações de clínica (se necessário)
    const enrichedContext = context || {};

    // Se não houver clinic_id no contexto, buscar da appointment
    if (!enrichedContext.clinic_id) {
      try {
        const { data: appt } = await supabase
          .from('appointments')
          .select('clinic_id, professional_id, patient_id, payer_id')
          .eq('id', appointmentId)
          .single();

        if (appt) {
          enrichedContext.clinic_id = appt.clinic_id;
          enrichedContext.professional_id = appt.professional_id;
          enrichedContext.patient_id = appt.patient_id;
          enrichedContext.payer_id = appt.payer_id;
        }
      } catch (err) {
        console.warn('Erro ao enriquecer contexto:', err);
      }
    }

    // Inserir log de auditoria
    const { data: log, error } = await supabase
      .from('appointment_financial_audit_logs')
      .insert([
        {
          appointment_id: appointmentId,
          financial_event_type: financialEventType,
          related_entity: relatedEntity || null,
          related_entity_id: relatedEntityId || null,
          amount: amount !== null ? Number(amount) : null,
          previous_amount: previousAmount !== null ? Number(previousAmount) : null,
          status: status || null,
          performed_by: userId,
          performed_by_role: userRole,
          context:
            enrichedContext && Object.keys(enrichedContext).length > 0 ? enrichedContext : null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao logar auditoria financeira:', error);
      return null;
    }

    return log;
  } catch (err) {
    console.error('Erro inesperado ao logar auditoria financeira:', err);
    return null;
  }
}

// ============================================================
// QUERIES PARA AUDITORIA FINANCEIRA
// ============================================================

/**
 * Obter timeline financeira completa de um atendimento
 *
 * @param {string} appointmentId - ID do atendimento
 * @returns {Promise<Array>} Lista de eventos ordenados por data
 */
export async function getAppointmentFinancialAuditTrail(appointmentId) {
  if (!appointmentId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('appointment_financial_audit_logs')
      .select(
        `
        id,
        appointment_id,
        financial_event_type,
        related_entity,
        related_entity_id,
        amount,
        previous_amount,
        status,
        performed_by,
        performed_by_role,
        performed_at,
        context,
        created_at
      `,
      )
      .eq('appointment_id', appointmentId)
      .order('performed_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar trail financeiro:', error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Erro inesperado:', err);
    return [];
  }
}

/**
 * Buscar eventos financeiros de uma clínica
 *
 * @param {string} clinicId - ID da clínica
 * @param {string} eventType - Tipo de evento (opcional)
 * @param {string} startDate - Data inicial (opcional)
 * @param {string} endDate - Data final (opcional)
 * @param {number} limit - Limite de resultados
 * @param {number} offset - Offset para paginação
 * @returns {Promise<Array>} Lista de eventos
 */
export async function listFinancialAuditEvents({
  clinicId,
  eventType = null,
  startDate = null,
  endDate = null,
  limit = 100,
  offset = 0,
} = {}) {
  if (!clinicId) {
    return [];
  }

  try {
    let query = supabase
      .from('appointment_financial_audit_logs')
      .select(
        `
        id,
        appointment_id,
        financial_event_type,
        related_entity,
        related_entity_id,
        amount,
        status,
        performed_by,
        performed_by_role,
        performed_at,
        context
      `,
      )
      .eq('context->clinic_id', clinicId)
      .order('performed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventType && Object.values(FINANCIAL_EVENT_TYPES).includes(eventType)) {
      query = query.eq('financial_event_type', eventType);
    }

    if (startDate) {
      query = query.gte('performed_at', startDate);
    }

    if (endDate) {
      query = query.lte('performed_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar eventos de auditoria:', error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Erro inesperado:', err);
    return [];
  }
}

/**
 * Buscar eventos de um atendimento por tipo
 *
 * @param {string} appointmentId - ID do atendimento
 * @param {string} eventType - Tipo de evento
 * @returns {Promise<Array>} Lista de eventos do tipo especificado
 */
export async function getAppointmentEventsByType(appointmentId, eventType) {
  if (!appointmentId || !eventType) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('appointment_financial_audit_logs')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('financial_event_type', eventType)
      .order('performed_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Erro inesperado:', err);
    return [];
  }
}

/**
 * Buscar eventos relacionados a uma entidade específica (e.g., conta a receber)
 *
 * @param {string} relatedEntityId - ID da entidade
 * @param {string} relatedEntity - Tipo de entidade
 * @returns {Promise<Array>} Lista de eventos
 */
export async function getEventsForRelatedEntity(relatedEntityId, relatedEntity) {
  if (!relatedEntityId || !relatedEntity) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('appointment_financial_audit_logs')
      .select('*')
      .eq('related_entity_id', relatedEntityId)
      .eq('related_entity', relatedEntity)
      .order('performed_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Erro inesperado:', err);
    return [];
  }
}

/**
 * Obter estatísticas de eventos financeiros por atendimento
 *
 * @param {string} appointmentId - ID do atendimento
 * @returns {Promise<Object>} Estatísticas
 */
export async function getAppointmentFinancialStats(appointmentId) {
  if (!appointmentId) {
    return null;
  }

  try {
    const trail = await getAppointmentFinancialAuditTrail(appointmentId);

    const stats = {
      totalEvents: trail.length,
      eventsByType: {},
      totalAmount: 0,
      totalPreviousAmount: 0,
      firstEventAt: null,
      lastEventAt: null,
      performedByUsers: new Set(),
    };

    trail.forEach((event) => {
      // Contar por tipo
      if (!stats.eventsByType[event.financial_event_type]) {
        stats.eventsByType[event.financial_event_type] = 0;
      }
      stats.eventsByType[event.financial_event_type]++;

      // Somar valores
      if (event.amount) {
        stats.totalAmount += Number(event.amount);
      }
      if (event.previous_amount) {
        stats.totalPreviousAmount += Number(event.previous_amount);
      }

      // Tracking de data
      if (!stats.firstEventAt || new Date(event.performed_at) < new Date(stats.firstEventAt)) {
        stats.firstEventAt = event.performed_at;
      }
      if (!stats.lastEventAt || new Date(event.performed_at) > new Date(stats.lastEventAt)) {
        stats.lastEventAt = event.performed_at;
      }

      // Rastrear usuários
      if (event.performed_by) {
        stats.performedByUsers.add(event.performed_by);
      }
    });

    // Converter Set para Array
    stats.performedByCount = stats.performedByUsers.size;
    delete stats.performedByUsers;

    return stats;
  } catch (err) {
    console.error('Erro ao calcular estatísticas:', err);
    return null;
  }
}

/**
 * Verificar divergências na auditoria financeira
 *
 * @param {string} appointmentId - ID do atendimento
 * @returns {Promise<Array>} Array de divergências encontradas
 */
export async function checkFinancialDivergences(appointmentId) {
  if (!appointmentId) {
    return [];
  }

  const divergences = [];

  try {
    const trail = await getAppointmentFinancialAuditTrail(appointmentId);

    // Verificar se há conta a receber criada
    const hasReceivable = trail.some(
      (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED,
    );

    // Verificar se há pagamento sem conta a receber
    const hasPayment = trail.some(
      (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.PAYMENT_RECEIVED,
    );

    if (hasPayment && !hasReceivable) {
      divergences.push({
        type: 'PAYMENT_WITHOUT_RECEIVABLE',
        severity: 'HIGH',
        message: 'Pagamento registrado sem conta a receber criada',
        details: trail.filter(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.PAYMENT_RECEIVED,
        ),
      });
    }

    // Verificar se há glosa e repasse para o mesmo atendimento
    const hasGlosa = trail.some(
      (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.GLOSA_REGISTERED,
    );
    const hasRepasse = trail.some(
      (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.REPASSE_CALCULATED,
    );

    if (hasGlosa && hasRepasse) {
      const glosedAmount = trail
        .filter((e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.GLOSA_REGISTERED)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const repasseAmount = trail
        .filter((e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.REPASSE_CALCULATED)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      if (glosedAmount > 0 && repasseAmount > 0) {
        divergences.push({
          type: 'GLOSA_AND_REPASSE',
          severity: 'MEDIUM',
          message: 'Atendimento tem glosa e repasse registrados',
          details: {
            glosedAmount,
            repasseAmount,
          },
        });
      }
    }

    // Verificar se há glosa revertida sem glosa original
    const hasGlosReversed = trail.some(
      (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.GLOSA_REVERSED,
    );

    if (hasGlosReversed && !hasGlosa) {
      divergences.push({
        type: 'GLOSA_REVERSED_WITHOUT_ORIGINAL',
        severity: 'HIGH',
        message: 'Glosa revertida sem glosa original',
        details: trail.filter(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.GLOSA_REVERSED,
        ),
      });
    }

    return divergences;
  } catch (err) {
    console.error('Erro ao verificar divergências:', err);
    return [];
  }
}

/**
 * Obter sumário financeiro completo de um atendimento
 *
 * @param {string} appointmentId - ID do atendimento
 * @returns {Promise<Object>} Sumário financeiro
 */
export async function getAppointmentFinancialSummary(appointmentId) {
  if (!appointmentId) {
    return null;
  }

  try {
    const trail = await getAppointmentFinancialAuditTrail(appointmentId);
    const stats = await getAppointmentFinancialStats(appointmentId);
    const divergences = await checkFinancialDivergences(appointmentId);

    const summary = {
      appointmentId,
      trail,
      stats,
      divergences,
      timeline: {
        receivableCreated: trail.find(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED,
        ),
        billingGuideCreated: trail.find(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.BILLING_GUIDE_CREATED,
        ),
        billingSent: trail.find(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.BILLING_SENT,
        ),
        paymentReceived: trail.find(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.PAYMENT_RECEIVED,
        ),
        glosaRegistered: trail.find(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.GLOSA_REGISTERED,
        ),
        glosaReversed: trail.find(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.GLOSA_REVERSED,
        ),
        repasseCalculated: trail.find(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.REPASSE_CALCULATED,
        ),
        repassePaid: trail.find(
          (e) => e.financial_event_type === FINANCIAL_EVENT_TYPES.REPASSE_PAID,
        ),
      },
    };

    return summary;
  } catch (err) {
    console.error('Erro ao obter sumário financeiro:', err);
    return null;
  }
}

// ============================================================
// EXPORTAR CONSTANTES E FUNÇÕES
// ============================================================

export default {
  FINANCIAL_EVENT_TYPES,
  RELATED_ENTITY_TYPES,
  logAppointmentFinancialAudit,
  getAppointmentFinancialAuditTrail,
  listFinancialAuditEvents,
  getAppointmentEventsByType,
  getEventsForRelatedEntity,
  getAppointmentFinancialStats,
  checkFinancialDivergences,
  getAppointmentFinancialSummary,
};
