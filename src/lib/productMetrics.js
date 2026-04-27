/**
 * productMetrics.js
 * 
 * Sistema de Métricas de Produto para Gesclinic
 * Captura eventos de negócio e envia para Sentry com tags para análise
 * 
 * Objetivo:
 * - Identificar gargalos (onde usuários falham)
 * - Entender uso real (quais funcionalidades são usadas)
 * - Base para tomadas de decisão de produto
 * 
 * @example
 * import { trackEvent } from '@/lib/productMetrics';
 * 
 * trackEvent('appointment_created', {
 *   clinicId: 'clinic-123',
 *   userId: 'user-456',
 *   duration: 2500, // ms
 *   appointmentType: 'consulta',
 * });
 */

import * as Sentry from '@sentry/react';

// ============================================================
// 1. TIPOS DE EVENTOS
// ============================================================

export const PRODUCT_EVENTS = {
  // Agendamentos
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_UPDATED: 'appointment_updated',
  APPOINTMENT_DELETED: 'appointment_deleted',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENT_CONFLICT: 'appointment_conflict',
  APPOINTMENT_VALIDATION_ERROR: 'appointment_validation_error',

  // Financeiro
  BILL_CREATED: 'bill_created',
  BILL_PAID: 'bill_paid',
  BILL_PARTIAL_PAID: 'bill_partial_paid',
  BILL_CANCELLED: 'bill_cancelled',

  // Estoque
  PRODUCT_ADDED: 'product_added',
  PRODUCT_REMOVED: 'product_removed',
  PRODUCT_ADJUSTMENT: 'product_adjustment',

  // Usuários
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_CREATED: 'user_created',

  // Sistema
  PAGE_VIEW: 'page_view',
  FEATURE_USED: 'feature_used',
  ERROR_OCCURRED: 'error_occurred',
};

// ============================================================
// 2. FUNÇÃO PRINCIPAL: TRACK EVENT
// ============================================================

/**
 * Registra evento de produto com métricas
 * 
 * @param {string} eventName - Tipo de evento (ex: 'appointment_created')
 * @param {Object} metadata - Dados do evento
 * @param {string} metadata.clinicId - ID da clínica (required)
 * @param {string} metadata.userId - ID do usuário (required)
 * @param {string} metadata.action - Ação realizada (required)
 * @param {Object} metadata.extra - Dados adicionais (optional)
 * @param {number} metadata.duration - Tempo em ms (optional)
 * @param {string} metadata.severity - 'info', 'warning', 'error' (default: 'info')
 * 
 * @example
 * trackEvent(PRODUCT_EVENTS.APPOINTMENT_CREATED, {
 *   clinicId: 'clinic-123',
 *   userId: 'user-456',
 *   action: 'create',
 *   duration: 2500,
 *   extra: {
 *     appointmentType: 'consulta',
 *     paymentMethod: 'cash',
 *   }
 * });
 */
export function trackEvent(eventName, metadata = {}) {
  const { clinicId, userId, action, extra = {}, duration, severity = 'info' } = metadata;

  // Validações obrigatórias
  if (!eventName) {
    console.warn('[ProductMetrics] eventName é obrigatório');
    return;
  }

  if (!clinicId) {
    console.warn('[ProductMetrics] clinicId é obrigatório');
    return;
  }

  if (!userId) {
    console.warn('[ProductMetrics] userId é obrigatório');
    return;
  }

  if (!action) {
    console.warn('[ProductMetrics] action é obrigatória');
    return;
  }

  // Apenas enviar para Sentry em produção
  if (import.meta.env.PROD) {
    const message = `[${eventName.toUpperCase()}] ${action} executado`;

    // Preparar tags
    const tags = {
      event_type: eventName,
      clinic_id: clinicId,
      user_id: userId,
      action: action,
      severity: severity,
    };

    // Preparar contexto extra
    const extraData = {
      ...extra,
      event_name: eventName,
      timestamp: new Date().toISOString(),
    };

    if (duration !== undefined) {
      extraData.duration_ms = duration;
      tags.performance = duration > 5000 ? 'slow' : 'fast';
    }

    // Log com context
    if (severity === 'error') {
      Sentry.captureMessage(message, 'error');
    } else if (severity === 'warning') {
      Sentry.captureMessage(message, 'warning');
    } else {
      Sentry.captureMessage(message, 'info');
    }

    // Adicionar tags e contexto
    Sentry.setContext('product_event', {
      event_name: eventName,
      action: action,
      clinic_id: clinicId,
      user_id: userId,
      ...extra,
      duration_ms: duration,
    });

    Sentry.setTags(tags);

    // Debug em dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ProductMetrics] ${eventName}:`, {
        tags,
        extra: extraData,
      });
    }
  } else if (process.env.NODE_ENV === 'development') {
    // Em dev, logar no console mesmo sem Sentry
    console.log(`[ProductMetrics] ${eventName}:`, {
      clinicId,
      userId,
      action,
      extra,
      duration,
    });
  }
}

// ============================================================
// 3. HELPERS ESPECÍFICOS
// ============================================================

/**
 * Rastrear criação de agendamento
 */
export function trackAppointmentCreated(clinicId, userId, data = {}) {
  trackEvent(PRODUCT_EVENTS.APPOINTMENT_CREATED, {
    clinicId,
    userId,
    action: 'create',
    severity: 'info',
    duration: data.duration,
    extra: {
      appointment_id: data.appointmentId,
      appointment_type: data.type || 'default',
      professional_id: data.professionalId,
      patient_id: data.patientId,
      payment_method: data.paymentMethod,
      has_conflict_check: data.hasConflictCheck !== false,
    },
  });
}

/**
 * Rastrear atualização de agendamento
 */
export function trackAppointmentUpdated(clinicId, userId, data = {}) {
  trackEvent(PRODUCT_EVENTS.APPOINTMENT_UPDATED, {
    clinicId,
    userId,
    action: 'update',
    severity: 'info',
    duration: data.duration,
    extra: {
      appointment_id: data.appointmentId,
      fields_changed: data.fieldsChanged || [],
      status_changed: data.statusChanged,
      previous_status: data.previousStatus,
      new_status: data.newStatus,
    },
  });
}

/**
 * Rastrear cancelamento de agendamento
 */
export function trackAppointmentCancelled(clinicId, userId, data = {}) {
  trackEvent(PRODUCT_EVENTS.APPOINTMENT_CANCELLED, {
    clinicId,
    userId,
    action: 'cancel',
    severity: 'info',
    extra: {
      appointment_id: data.appointmentId,
      cancellation_reason: data.reason,
      refund_status: data.refundStatus,
    },
  });
}

/**
 * Rastrear conflito de concorrência
 */
export function trackAppointmentConflict(clinicId, userId, data = {}) {
  trackEvent(PRODUCT_EVENTS.APPOINTMENT_CONFLICT, {
    clinicId,
    userId,
    action: 'conflict_detected',
    severity: 'warning',
    duration: data.duration,
    extra: {
      appointment_id: data.appointmentId,
      expected_updated_at: data.expectedUpdatedAt,
      current_updated_at: data.currentUpdatedAt,
      user_who_updated: data.userWhoUpdated,
    },
  });
}

/**
 * Rastrear erro de validação
 */
export function trackValidationError(clinicId, userId, data = {}) {
  trackEvent(PRODUCT_EVENTS.APPOINTMENT_VALIDATION_ERROR, {
    clinicId,
    userId,
    action: 'validation_failed',
    severity: 'warning',
    extra: {
      error_type: data.errorType,
      error_message: data.errorMessage,
      field: data.field,
      attempted_action: data.attemptedAction,
    },
  });
}

/**
 * Rastrear confirmação de presença
 */
export function trackAppointmentConfirmed(clinicId, userId, data = {}) {
  trackEvent(PRODUCT_EVENTS.APPOINTMENT_CONFIRMED, {
    clinicId,
    userId,
    action: 'confirm',
    severity: 'info',
    extra: {
      appointment_id: data.appointmentId,
      confirmation_method: data.method || 'manual', // manual, sms, whatsapp, etc
      duration_since_appointment: data.durationSinceAppointment,
    },
  });
}

/**
 * Rastrear login de usuário
 */
export function trackUserLogin(clinicId, userId, data = {}) {
  trackEvent(PRODUCT_EVENTS.USER_LOGIN, {
    clinicId,
    userId,
    action: 'login',
    severity: 'info',
    extra: {
      user_role: data.userRole,
      login_method: data.loginMethod || 'email',
      duration_since_last_login: data.timeSinceLastLogin,
    },
  });
}

/**
 * Rastrear visualização de página
 */
export function trackPageView(clinicId, userId, data = {}) {
  trackEvent(PRODUCT_EVENTS.PAGE_VIEW, {
    clinicId,
    userId,
    action: 'page_visited',
    severity: 'info',
    extra: {
      page_path: data.pagePath,
      page_name: data.pageName,
      previous_page: data.previousPage,
      time_on_page: data.timeOnPage,
    },
  });
}

/**
 * Rastrear uso de feature
 */
export function trackFeatureUsed(clinicId, userId, data = {}) {
  trackEvent(PRODUCT_EVENTS.FEATURE_USED, {
    clinicId,
    userId,
    action: 'feature_used',
    severity: 'info',
    extra: {
      feature_name: data.featureName,
      feature_category: data.category,
      duration: data.duration,
    },
  });
}

// ============================================================
// 4. ANÁLISE: GARGALOS E PADRÕES
// ============================================================

/**
 * Agrupar eventos por tipo para análise
 * (Use no console Sentry para análise)
 */
export function getEventSummary() {
  return {
    description: 'Use Sentry.io Dashboard para análise:',
    steps: [
      '1. Abrir https://sentry.io/organizations/[seu-org]/issues/',
      '2. Filtrar por tag: event_type:appointment_created',
      '3. Análises disponíveis:',
      '   - Gargalos: Eventos com duration_ms > 5000',
      '   - Conflitos: Contar appointment_conflict',
      '   - Erros: Filtrar severity:error',
      '   - Taxa de sucesso: (created + updated) / (created + failed)',
      '   - Usuários ativos: COUNT(DISTINCT user_id)',
    ],
  };
}

// ============================================================
// 5. DEBUG
// ============================================================

if (process.env.NODE_ENV === 'development') {
  window.__PRODUCT_METRICS__ = {
    trackEvent,
    trackAppointmentCreated,
    trackAppointmentUpdated,
    trackAppointmentCancelled,
    trackAppointmentConflict,
    trackValidationError,
    trackAppointmentConfirmed,
    trackUserLogin,
    trackPageView,
    trackFeatureUsed,
    PRODUCT_EVENTS,
    getEventSummary,
  };
}

export default {
  trackEvent,
  trackAppointmentCreated,
  trackAppointmentUpdated,
  trackAppointmentCancelled,
  trackAppointmentConflict,
  trackValidationError,
  trackAppointmentConfirmed,
  trackUserLogin,
  trackPageView,
  trackFeatureUsed,
  PRODUCT_EVENTS,
  getEventSummary,
};