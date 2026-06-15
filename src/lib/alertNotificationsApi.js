/**
 * alertNotificationsApi.js - API para gerenciar notificações de alertas
 * 
 * Funções:
 * - getAlertNotifications() - Lista notificações pendentes
 * - getAlertNotificationLogs() - Histórico de envios
 * - markAsDelivered() - Marca como entregue
 * - retryNotification() - Retenta envio
 * - sendAlertNotification() - Envia notificação imediata
 * - subscribeToAlertNotifications() - Subscreve a notificações em tempo real
 */

import { supabase } from './customSupabaseClient';

// ════════════════════════════════════════════════════════════════════════════
// OBTER NOTIFICAÇÕES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Busca notificações pendentes para envio
 * @param {object} filters - { channel, status, limit }
 * @returns {Promise<Array>}
 */
export const getAlertNotifications = async (filters = {}) => {
  try {
    const { channel, status = 'pending', limit = 100 } = filters;
    
    let query = supabase
      .from('notification_logs')
      .select('*, alert_notifications(title, message, data, severity)')
      .eq('status', status)
      .order('created_at', { ascending: true });
    
    if (channel) {
      query = query.eq('channel', channel);
    }
    
    const { data, error } = await query.limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
};

/**
 * Busca notificações para um usuário específico
 * @param {string} clinicId
 * @param {string} userId
 * @param {object} filters - { limit, offset }
 * @returns {Promise<Array>}
 */
export const getUserAlertNotifications = async (clinicId, userId, filters = {}) => {
  try {
    const { limit = 50, offset = 0 } = filters;
    
    const { data, error } = await supabase
      .from('notification_logs')
      .select(`
        *,
        alert_notifications(
          id,
          title,
          message,
          severity,
          alert_type,
          data,
          status,
          created_at
        )
      `)
      .eq('recipient', userId)
      .eq('alert_notifications.clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar notificações do usuário:', error);
    return [];
  }
};

/**
 * Busca notificações recentes (últimas 24 horas)
 * @param {string} clinicId
 * @param {string} channel - 'email', 'push', 'dashboard'
 * @returns {Promise<Array>}
 */
export const getRecentAlertNotifications = async (clinicId, channel = null) => {
  try {
    let query = supabase
      .from('notification_logs')
      .select(`
        id,
        channel,
        status,
        created_at,
        alert_notifications(
          title,
          message,
          severity,
          data
        )
      `)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (channel) {
      query = query.eq('channel', channel);
    }
    
    const { data, error } = await query.limit(100);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar notificações recentes:', error);
    return [];
  }
};

// ════════════════════════════════════════════════════════════════════════════
// HISTÓRICO DE NOTIFICAÇÕES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Busca histórico completo de notificações
 * @param {string} clinicId
 * @param {object} filters - { channel, status, dateStart, dateEnd, limit, offset }
 * @returns {Promise<Array>}
 */
export const getAlertNotificationLogs = async (clinicId, filters = {}) => {
  try {
    const { channel, status, dateStart, dateEnd, limit = 100, offset = 0 } = filters;
    
    let query = supabase
      .from('notification_logs')
      .select(`
        *,
        alert_notifications(clinic_id, title, message, severity, alert_type)
      `)
      .eq('alert_notifications.clinic_id', clinicId)
      .order('created_at', { ascending: false });
    
    if (channel) {
      query = query.eq('channel', channel);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (dateStart) {
      query = query.gte('created_at', dateStart);
    }
    
    if (dateEnd) {
      query = query.lte('created_at', dateEnd);
    }
    
    const { data, error } = await query.range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar histórico de notificações:', error);
    return [];
  }
};

/**
 * Busca estatísticas de notificações
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export const getAlertNotificationStats = async (clinicId) => {
  try {
    // Por canal
    const { data: byChannel } = await supabase
      .from('notification_logs')
      .select('channel')
      .eq('alert_notifications.clinic_id', clinicId);
    
    // Por status
    const { data: byStatus } = await supabase
      .from('notification_logs')
      .select('status')
      .eq('alert_notifications.clinic_id', clinicId);
    
    // Taxa de entrega
    const total = byStatus?.length || 0;
    const sent = byStatus?.filter(n => n.status === 'sent').length || 0;
    const failed = byStatus?.filter(n => n.status === 'failed').length || 0;
    
    return {
      total,
      sent,
      failed,
      pending: byStatus?.filter(n => n.status === 'pending').length || 0,
      deliveryRate: total > 0 ? Math.round((sent / total) * 100) : 0,
      byChannel: (byChannel || []).reduce((acc, n) => {
        acc[n.channel] = (acc[n.channel] || 0) + 1;
        return acc;
      }, {}),
      byStatus: (byStatus || []).reduce((acc, n) => {
        acc[n.status] = (acc[n.status] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas de notificações:', error);
    return { total: 0, sent: 0, failed: 0, pending: 0, deliveryRate: 0, byChannel: {}, byStatus: {} };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// AÇÕES EM NOTIFICAÇÕES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Marca notificação como entregue
 * @param {string} notificationLogId
 * @param {object} deliveryInfo - { delivery_status, error_message }
 * @returns {Promise<Object>}
 */
export const markAlertNotificationAsDelivered = async (notificationLogId, deliveryInfo = {}) => {
  try {
    const { data, error } = await supabase
      .from('notification_logs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        delivery_status: deliveryInfo.delivery_status || 'delivered',
        error_message: null
      })
      .eq('id', notificationLogId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao marcar como entregue:', error);
    throw error;
  }
};

/**
 * Marca notificação como falha
 * @param {string} notificationLogId
 * @param {string} errorMessage
 * @returns {Promise<Object>}
 */
export const markAlertNotificationAsFailed = async (notificationLogId, errorMessage) => {
  try {
    const { data, error } = await supabase
      .from('notification_logs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        sent_at: new Date().toISOString()
      })
      .eq('id', notificationLogId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao marcar como falha:', error);
    throw error;
  }
};

/**
 * Retenta envio de notificação
 * @param {string} notificationLogId
 * @returns {Promise<Object>}
 */
export const retryAlertNotification = async (notificationLogId) => {
  try {
    const { data, error } = await supabase
      .from('notification_logs')
      .update({
        status: 'pending',
        error_message: null,
        sent_at: null
      })
      .eq('id', notificationLogId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao retentarar envio:', error);
    throw error;
  }
};

/**
 * Envia notificação imediata
 * @param {object} notification - { alert_notification_id, channel, recipient }
 * @returns {Promise<Object>}
 */
export const sendAlertNotification = async (notification) => {
  try {
    const { data, error } = await supabase
      .from('notification_logs')
      .insert({
        alert_notification_id: notification.alert_notification_id,
        channel: notification.channel,
        recipient: notification.recipient,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Em produção, aqui entraría em fila de processamento
    console.log('Notificação enfileirada:', data);
    
    return data;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
};

/**
 * Envia bulk de notificações
 * @param {string} alertNotificationId
 * @param {array} recipients - Array de { channel, recipient }
 * @returns {Promise<Array>}
 */
export const sendBulkAlertNotifications = async (alertNotificationId, recipients) => {
  try {
    const notifications = recipients.map(r => ({
      alert_notification_id: alertNotificationId,
      channel: r.channel,
      recipient: r.recipient,
      status: 'pending',
      created_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('notification_logs')
      .insert(notifications)
      .select();
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao enviar notificações em bulk:', error);
    return [];
  }
};

// ════════════════════════════════════════════════════════════════════════════
// SUBSCRIÇÃO EM TEMPO REAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Subscreve a notificações em tempo real
 * @param {string} clinicId
 * @param {function} callback
 * @returns {object} subscription para unsubscribe
 */
export const subscribeToAlertNotifications = (clinicId, callback) => {
  try {
    const subscription = supabase
      .channel(`alerts-clinic-${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alert_notifications',
          filter: `clinic_id=eq.${clinicId}`
        },
        (payload) => {
          callback({
            type: 'alert_created',
            data: payload.new
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alert_notifications',
          filter: `clinic_id=eq.${clinicId}`
        },
        (payload) => {
          callback({
            type: 'alert_updated',
            data: payload.new
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs'
        },
        (payload) => {
          callback({
            type: 'notification_sent',
            data: payload.new
          });
        }
      )
      .subscribe();
    
    return subscription;
  } catch (error) {
    console.error('Erro ao subscrever a notificações:', error);
    return null;
  }
};

/**
 * Unsubscribe de notificações
 * @param {object} subscription
 * @returns {void}
 */
export const unsubscribeFromAlertNotifications = async (subscription) => {
  if (subscription) {
    await supabase.removeChannel(subscription);
  }
};

export default {
  getAlertNotifications,
  getUserAlertNotifications,
  getRecentAlertNotifications,
  getAlertNotificationLogs,
  getAlertNotificationStats,
  markAlertNotificationAsDelivered,
  markAlertNotificationAsFailed,
  retryAlertNotification,
  sendAlertNotification,
  sendBulkAlertNotifications,
  subscribeToAlertNotifications,
  unsubscribeFromAlertNotifications
};
