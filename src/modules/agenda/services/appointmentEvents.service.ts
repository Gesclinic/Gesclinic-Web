/**
 * 📡 SISTEMA DE EVENTOS - MÓDULO AGENDA
 * ====================================
 *
 * Sistema desacoplado de eventos para integração com Financeiro
 * Permite que módulos se inscrevam para eventos sem acoplamento direto
 */

import {
  AppointmentEvent,
  AppointmentEventType,
  AppointmentEventListener,
  AppointmentWithFinancial,
} from '../types/financial';

// ============================================================================
// 1. REGISTRO GLOBAL DE LISTENERS
// ============================================================================

class AppointmentEventBus {
  private listeners: Map<string, AppointmentEventListener> = new Map();
  private eventHistory: AppointmentEvent[] = [];
  private maxHistorySize = 1000;

  /**
   * Inscrever listener para eventos
   */
  subscribe(
    eventTypes: AppointmentEventType[],
    handler: (event: AppointmentEvent) => Promise<void>,
    options?: {
      id?: string;
      priority?: number;
    }
  ): string {
    const listenerId = options?.id || `listener-${Date.now()}-${Math.random()}`;

    const listener: AppointmentEventListener = {
      id: listenerId,
      eventType: eventTypes,
      handler,
      enabled: true,
      priority: options?.priority || 0,
    };

    this.listeners.set(listenerId, listener);

    console.log(`✅ Subscribed to events: ${eventTypes.join(', ')} (${listenerId})`);

    return listenerId;
  }

  /**
   * Desinscrever listener
   */
  unsubscribe(listenerId: string): boolean {
    const result = this.listeners.delete(listenerId);
    if (result) {
      console.log(`✅ Unsubscribed: ${listenerId}`);
    }
    return result;
  }

  /**
   * Disparar evento
   */
  async fireEvent(event: AppointmentEvent): Promise<void> {
    // Adicionar ao histórico
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    console.log(`📤 Event fired: ${event.type} (${event.appointment.id})`);

    // Obter listeners para este tipo de evento
    const relevantListeners = Array.from(this.listeners.values())
      .filter(l => l.enabled && l.eventType.includes(event.type))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Executar handlers em paralelo
    try {
      await Promise.all(
        relevantListeners.map(listener =>
          listener.handler(event)
            .catch(error => {
              console.error(
                `❌ Error in listener ${listener.id}:`,
                error
              );
            })
        )
      );
    } catch (error) {
      console.error('❌ Error firing event:', error);
    }
  }

  /**
   * Habilitar/desabilitar listener
   */
  setEnabled(listenerId: string, enabled: boolean): boolean {
    const listener = this.listeners.get(listenerId);
    if (listener) {
      listener.enabled = enabled;
      console.log(
        `✅ Listener ${listenerId} ${enabled ? 'enabled' : 'disabled'}`
      );
      return true;
    }
    return false;
  }

  /**
   * Obter histórico de eventos
   */
  getEventHistory(limit: number = 10): AppointmentEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Limpar histórico
   */
  clearEventHistory(): void {
    this.eventHistory = [];
    console.log('✅ Event history cleared');
  }

  /**
   * Obter status do bus
   */
  getStatus() {
    return {
      listeners: this.listeners.size,
      eventHistory: this.eventHistory.length,
      activeListeners: Array.from(this.listeners.values())
        .filter(l => l.enabled)
        .map(l => ({
          id: l.id,
          events: l.eventType,
          priority: l.priority || 0,
        })),
    };
  }
}

// Singleton global
export const appointmentEventBus = new AppointmentEventBus();

// ============================================================================
// 2. HELPER PARA CRIAR EVENTOS
// ============================================================================

/**
 * Factory function para criar eventos
 */
export function createAppointmentEvent(
  type: AppointmentEventType,
  appointment: AppointmentWithFinancial,
  options?: {
    previousAppointment?: Partial<AppointmentWithFinancial>;
    triggeredBy?: 'user' | 'system' | 'api';
    triggerSource?: string;
    requestId?: string;
  }
): AppointmentEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    clinic_id: appointment.clinic_id,
    appointment,
    previousAppointment: options?.previousAppointment,
    triggered_by: options?.triggeredBy || 'system',
    trigger_source: options?.triggerSource,
    request_id: options?.requestId,
  };
}

// ============================================================================
// 3. HELPER PARA DISPARAR EVENTOS DE STATUS
// ============================================================================

/**
 * Disparar evento baseado em mudança de status
 */
export async function fireAppointmentStatusEvent(
  oldStatus: string | undefined,
  newStatus: string,
  appointment: AppointmentWithFinancial,
  options?: {
    triggeredBy?: 'user' | 'system' | 'api';
    triggerSource?: string;
  }
): Promise<void> {
  // Mapear status para tipo de evento
  const statusEventMap: Record<string, AppointmentEventType> = {
    scheduled: 'appointment.scheduled',
    confirmed: 'appointment.confirmed',
    checked_in: 'appointment.checked_in',
    in_progress: 'appointment.in_progress',
    completed: 'appointment.completed',
    cancelled: 'appointment.cancelled',
    no_show: 'appointment.no_show',
  };

  const eventType = statusEventMap[newStatus];
  if (!eventType) return; // Status não tem evento mapeado

  const event = createAppointmentEvent(eventType, appointment, {
    previousAppointment: oldStatus ? { status: oldStatus } : undefined,
    triggeredBy: options?.triggeredBy,
    triggerSource: options?.triggerSource,
  });

  await appointmentEventBus.fireEvent(event);
}

// ============================================================================
// 4. SUBSCRIBERS PRÉ-DEFINIDOS (DESATIVADOS)
// ============================================================================

/**
 * Subscriber para eventos de Financeiro
 * Será ativado quando integração financeira for implementada
 */
export const createFinancialEventListener = (
  handler?: (event: AppointmentEvent) => Promise<void>
): AppointmentEventListener => {
  return {
    id: 'financial-listener',
    eventType: [
      'appointment.created',
      'appointment.checked_in',
      'appointment.completed',
      'appointment.cancelled',
    ],
    handler: handler || (async () => {
      // Placeholder - será substituído pela lógica real
      console.log('⏸️  Financial integration not yet enabled');
    }),
    enabled: false, // Desativado por padrão
    priority: 100,
  };
};

/**
 * Subscriber para eventos de TISS
 * Será ativado quando integração TISS for implementada
 */
export const createTISSEventListener = (
  handler?: (event: AppointmentEvent) => Promise<void>
): AppointmentEventListener => {
  return {
    id: 'tiss-listener',
    eventType: [
      'appointment.completed',
      'appointment.cancelled',
    ],
    handler: handler || (async () => {
      // Placeholder - será substituído pela lógica real
      console.log('⏸️  TISS integration not yet enabled');
    }),
    enabled: false, // Desativado por padrão
    priority: 90,
  };
};

/**
 * Subscriber para eventos de Auditoria
 * Sempre ativado para rastreamento
 */
export const createAuditEventListener = (): AppointmentEventListener => {
  return {
    id: 'audit-listener',
    eventType: [
      'appointment.created',
      'appointment.updated',
      'appointment.completed',
      'appointment.cancelled',
      'appointment.deleted',
    ],
    handler: async (event: AppointmentEvent) => {
      // Log de auditoria - pode ser expandido para enviar a BD
      console.log(`📋 [AUDIT] ${event.type} on appointment ${event.appointment.id}`);
    },
    enabled: true, // Sempre ativado
    priority: 0,
  };
};

// ============================================================================
// 5. INICIALIZAÇÃO DO SISTEMA DE EVENTOS
// ============================================================================

/**
 * Inicializar listeners padrão
 */
export function initializeAppointmentEventSystem(): void {
  // Sempre inicializar audit listener
  const auditListener = createAuditEventListener();
  appointmentEventBus.subscribe(
    auditListener.eventType,
    auditListener.handler,
    { id: auditListener.id }
  );

  console.log('✅ Appointment Event System initialized (audit enabled, financial/TISS disabled)');
}

/**
 * Ativar integração financeira
 * Chamado quando módulo financeiro estiver pronto
 */
export function enableFinancialIntegration(
  handler: (event: AppointmentEvent) => Promise<void>
): string {
  const listener = createFinancialEventListener(handler);
  const listenerId = appointmentEventBus.subscribe(
    listener.eventType,
    listener.handler,
    { id: listener.id, priority: listener.priority }
  );

  appointmentEventBus.setEnabled(listenerId, true);
  console.log('✅ Financial integration ENABLED');

  return listenerId;
}

/**
 * Desativar integração financeira
 */
export function disableFinancialIntegration(): boolean {
  return appointmentEventBus.setEnabled('financial-listener', false);
}

/**
 * Ativar integração TISS
 * Chamado quando módulo TISS estiver pronto
 */
export function enableTISSIntegration(
  handler: (event: AppointmentEvent) => Promise<void>
): string {
  const listener = createTISSEventListener(handler);
  const listenerId = appointmentEventBus.subscribe(
    listener.eventType,
    listener.handler,
    { id: listener.id, priority: listener.priority }
  );

  appointmentEventBus.setEnabled(listenerId, true);
  console.log('✅ TISS integration ENABLED');

  return listenerId;
}

/**
 * Desativar integração TISS
 */
export function disableTISSIntegration(): boolean {
  return appointmentEventBus.setEnabled('tiss-listener', false);
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  appointmentEventBus,
  createAppointmentEvent,
  fireAppointmentStatusEvent,
  initializeAppointmentEventSystem,
  enableFinancialIntegration,
  disableFinancialIntegration,
  enableTISSIntegration,
  disableTISSIntegration,
};
