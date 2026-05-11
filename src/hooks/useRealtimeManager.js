/**
 * ⚡ RealtimeManager - Centralizado e Estável
 * 
 * Responsabilidades:
 * 1. Deduplicação de eventos (Set com últimos N eventos)
 * 2. Gerenciamento centralizado de listeners
 * 3. Reconexão com backoff exponencial
 * 4. Logs estruturados com timestamps
 * 5. Cleanup seguro
 * 6. Broadcast Channel para cross-tab sync
 * 
 * Uso:
 * const manager = useRealtimeManager(clinicId);
 * manager.subscribe('appointments', { onUpdate: handleUpdate });
 * 
 * Remoção:
 * return () => manager.unsubscribe('appointments');
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// Config para reconexão e retry
const CONFIG = {
  MAX_RETRIES: 10,
  INITIAL_RETRY_DELAY: 1000,
  MAX_RETRY_DELAY: 30000,
  HEARTBEAT_INTERVAL: 30000,
  EVENT_HISTORY_SIZE: 500,
  DEDUP_TIMEOUT: 5000, // 5 segundos
};

// Singleton para evitar múltiplas instâncias por clinic
const managers = new Map();

/**
 * ============================================================
 * REALTIME MANAGER - Centralizado para uma clínica
 * ============================================================
 */
class RealtimeManager {
  constructor(clinicId) {
    this.clinicId = clinicId;
    
    // Subscriptions
    this.subscriptions = new Map();
    this.listeners = new Map();
    
    // Deduplicação
    this.eventHistory = new Set();
    this.eventTimestamps = new Map();
    
    // Reconexão
    this.retryCount = 0;
    this.retryTimer = null;
    this.isConnected = false;
    
    // Broadcast Channel para cross-tab sync
    this.broadcastChannel = this.initBroadcastChannel();
    
    // Health check
    this.heartbeatTimer = null;
    
    this.log('✨ RealtimeManager inicializado', { clinicId });
  }

  /**
   * 📝 Log estruturado com timestamp
   */
  log(msg, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      clinic_id: this.clinicId,
      message: msg,
      ...data,
    };
    console.log(`[${timestamp}] [Realtime:${this.clinicId}] ${msg}`, data);
    
    // Enviar para observabilidade (opcional)
    // window.__realtimeLogs?.push(logEntry);
  }

  /**
   * 📡 Broadcast Channel para cross-tab sync
   */
  initBroadcastChannel() {
    try {
      if (!('BroadcastChannel' in window)) {
        this.log('⚠️ BroadcastChannel não suportado neste navegador');
        return null;
      }
      
      const channel = new BroadcastChannel(`realtime-clinic-${this.clinicId}`);
      
      channel.onmessage = (event) => {
        if (event.data.type === 'REALTIME_EVENT') {
          this.log('📡 [Cross-tab] Evento recebido de outra aba', {
            table: event.data.table,
            event: event.data.eventType,
          });
          
          // Marcar como já processado em outra aba
          this.markEventProcessed(event.data.eventId);
        }
      };
      
      return channel;
    } catch (err) {
      this.log('❌ Erro ao inicializar BroadcastChannel', { error: err.message });
      return null;
    }
  }

  /**
   * 🔄 Deduplicação: Verificar se evento já foi processado
   */
  isDuplicate(eventId) {
    if (this.eventHistory.has(eventId)) {
      this.log('🔄 [Dedup] Evento duplicado ignorado', { eventId });
      return true;
    }
    
    // Adicionar ao histórico
    this.eventHistory.add(eventId);
    this.eventTimestamps.set(eventId, Date.now());
    
    // Limpar eventos antigos (> DEDUP_TIMEOUT)
    this.cleanOldEvents();
    
    return false;
  }

  /**
   * 🗑️ Limpar eventos do histórico que expiram
   */
  cleanOldEvents() {
    const now = Date.now();
    for (const [eventId, timestamp] of this.eventTimestamps.entries()) {
      if (now - timestamp > CONFIG.DEDUP_TIMEOUT) {
        this.eventHistory.delete(eventId);
        this.eventTimestamps.delete(eventId);
      }
    }
  }

  /**
   * ✅ Marcar evento como processado (sincronização cross-tab)
   */
  markEventProcessed(eventId) {
    this.eventHistory.add(eventId);
    this.eventTimestamps.set(eventId, Date.now());
  }

  /**
   * 📡 Broadcast evento para outras abas
   */
  broadcastEvent(table, payload) {
    if (!this.broadcastChannel) return;
    
    try {
      const eventId = `${table}:${payload.new?.id || payload.old?.id}:${Date.now()}`;
      this.broadcastChannel.postMessage({
        type: 'REALTIME_EVENT',
        table,
        eventType: payload.eventType,
        eventId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.log('⚠️ Erro ao fazer broadcast', { error: err.message });
    }
  }

  /**
   * 🔗 Subscribe a um evento de realtime
   * 
   * @param {string} table - Nome da tabela
   * @param {Object} options
   *   - {Function} onUpdate - Callback quando evento chega
   *   - {Array} events - ['INSERT', 'UPDATE', 'DELETE'] ou '*'
   *   - {string} filter - Filter SQL (ex: 'clinic_id=eq.123')
   */
  subscribe(table, options = {}) {
    const { onUpdate, events = '*', filter = null } = options;
    
    if (this.subscriptions.has(table)) {
      this.log('⚠️ Já subscrito a essa tabela, retornando listener existente', { table });
      return this.getUnsubscribe(table);
    }

    this.log('🔗 [Subscribe] Iniciando subscription', { table, events, filter });

    try {
      // Criar channel único com timestamp para evitar duplicatas
      const channelId = `realtime:${table}:${this.clinicId}:${Date.now()}:${Math.random()}`;
      
      let channel = supabase.channel(channelId);

      // Configurar listener
      channel = channel.on(
        'postgres_changes',
        {
          event: events,
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          this.handlePayload(table, payload, onUpdate);
        }
      );

      // Adicionar listeners de reconexão
      channel
        .on('system', { event: 'subscribe' }, () => {
          this.log('✅ [Subscribe] Conectado', { table });
          this.isConnected = true;
          this.retryCount = 0;
          this.startHeartbeat();
        })
        .on('system', { event: 'unsubscribe' }, () => {
          this.log('⚠️ [Subscribe] Desconectado', { table });
          this.isConnected = false;
          this.stopHeartbeat();
        });

      // Subscribe
      channel.subscribe((status) => {
        this.log('📡 [Channel] Status alterado', { table, status });
      });

      // Armazenar
      this.subscriptions.set(table, channel);
      if (!this.listeners.has(table)) {
        this.listeners.set(table, new Set());
      }
      this.listeners.get(table).add(onUpdate);

      return this.getUnsubscribe(table);
    } catch (err) {
      this.log('❌ [Subscribe] Erro ao criar subscription', { table, error: err.message });
      throw err;
    }
  }

  /**
   * ⚡ Processar payload com deduplicação
   */
  handlePayload(table, payload, onUpdate) {
    try {
      // Gerar ID único do evento para deduplicação
      const eventId = `${table}:${payload.eventType}:${payload.new?.id || payload.old?.id}:${Date.now()}`;
      
      // Verificar se é duplicado
      if (this.isDuplicate(eventId)) {
        return;
      }

      // Fazer broadcast para outras abas
      this.broadcastEvent(table, payload);

      // Chamar callback
      this.log('📬 [Realtime] Evento recebido', {
        table,
        eventType: payload.eventType,
        recordId: payload.new?.id || payload.old?.id,
      });

      if (onUpdate) {
        onUpdate(payload);
      }
    } catch (err) {
      this.log('❌ [Payload] Erro ao processar', { error: err.message });
    }
  }

  /**
   * 🔗 Unsubscribe seguro
   */
  getUnsubscribe(table) {
    return () => {
      try {
        const channel = this.subscriptions.get(table);
        if (channel) {
          supabase.removeChannel(channel);
          this.subscriptions.delete(table);
          this.listeners.delete(table);
          this.log('🔓 [Unsubscribe] Listener removido', { table });
        }
      } catch (err) {
        this.log('❌ [Unsubscribe] Erro ao remover', { table, error: err.message });
      }
    };
  }

  /**
   * ❤️ Heartbeat para detectar desconexões
   */
  startHeartbeat() {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      this.log('❤️ [Heartbeat] Ping', { subscriptionCount: this.subscriptions.size });
    }, CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * ⏹️ Parar heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 🔄 Reconexão com backoff exponencial
   */
  reconnect() {
    if (this.retryCount >= CONFIG.MAX_RETRIES) {
      this.log('❌ [Reconnect] Max retries atingido', { retryCount: this.retryCount });
      return;
    }

    const delay = Math.min(
      CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, this.retryCount),
      CONFIG.MAX_RETRY_DELAY
    );

    this.log('🔄 [Reconnect] Tentando reconectar', {
      retryCount: this.retryCount,
      nextRetryIn: `${delay}ms`,
    });

    this.retryTimer = setTimeout(() => {
      this.retryCount++;
      
      // Re-criar todas as subscriptions
      const tablesToResubscribe = Array.from(this.subscriptions.keys());
      for (const table of tablesToResubscribe) {
        const callback = Array.from(this.listeners.get(table) || [])[0];
        if (callback) {
          this.subscribe(table, { onUpdate: callback });
        }
      }
    }, delay);
  }

  /**
   * 🧹 Cleanup completo
   */
  destroy() {
    this.log('🧹 [Destroy] Limpando RealtimeManager', {
      subscriptions: this.subscriptions.size,
      listeners: this.listeners.size,
    });

    // Parar heartbeat
    this.stopHeartbeat();

    // Limpar retry timer
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    // Unsubscribe de todos os channels
    for (const [table, channel] of this.subscriptions.entries()) {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        this.log('⚠️ Erro ao remover channel', { table, error: err.message });
      }
    }

    // Fechar Broadcast Channel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (err) {
        this.log('⚠️ Erro ao fechar BroadcastChannel', { error: err.message });
      }
    }

    // Limpar
    this.subscriptions.clear();
    this.listeners.clear();
    this.eventHistory.clear();
    this.eventTimestamps.clear();
  }

  /**
   * 📊 Get status do manager
   */
  getStatus() {
    return {
      clinicId: this.clinicId,
      isConnected: this.isConnected,
      subscriptionCount: this.subscriptions.size,
      eventHistorySize: this.eventHistory.size,
      retryCount: this.retryCount,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * ============================================================
 * HOOK: useRealtimeManager
 * ============================================================
 */
export function useRealtimeManager(clinicId) {
  const managerRef = useRef(null);
  const [status, setStatus] = useState(null);

  // Criar ou reusar manager para esta clínica
  useEffect(() => {
    if (!clinicId) return;

    if (!managers.has(clinicId)) {
      managers.set(clinicId, new RealtimeManager(clinicId));
    }

    managerRef.current = managers.get(clinicId);
    setStatus(managerRef.current.getStatus());

    return () => {
      // NÃO destruir aqui - manter para reutilização
      // (apenas destruir quando componente pai desmontar completamente)
    };
  }, [clinicId]);

  const subscribe = useCallback(
    (table, options) => {
      if (!managerRef.current) {
        console.warn('[useRealtimeManager] Manager não inicializado');
        return () => {};
      }
      return managerRef.current.subscribe(table, options);
    },
    []
  );

  const getStatus = useCallback(() => {
    return managerRef.current?.getStatus() || null;
  }, []);

  return {
    subscribe,
    getStatus,
    status,
  };
}

/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */
export { RealtimeManager };
export default useRealtimeManager;
