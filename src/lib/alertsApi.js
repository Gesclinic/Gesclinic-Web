/**
 * alertsApi.js - API para gerenciar alertas
 * 
 * Funções:
 * - getAlerts() - Lista alertas ativos
 * - getAlertHistory() - Histórico completo de alertas
 * - resolveAlert() - Marca alerta como resolvido
 * - dismissAlert() - Marca alerta como descartado
 * - getAlertStats() - Estatísticas de alertas
 * - getAlertConfigs() - Configurações de alertas
 * - updateAlertConfig() - Atualiza configuração
 * - createAlertRule() - Cria regra de alerta
 * - deleteAlertRule() - Deleta regra
 */

import { supabase } from './customSupabaseClient';

// ════════════════════════════════════════════════════════════════════════════
// LISTAR ALERTAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Busca alertas ativos para uma clínica
 * @param {string} clinicId
 * @param {object} filters - { type, severity, limit, offset }
 * @returns {Promise<Array>}
 */
export const getAlerts = async (clinicId, filters = {}) => {
  try {
    const { type, severity, limit = 50, offset = 0 } = filters;
    
    let query = supabase
      .from('alert_notifications')
      .select('*, alert_configs(alert_type, notify_channels), notification_logs(id, channel, status)')
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (type) {
      query = query.eq('alert_type', type);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    
    const { data, error } = await query.range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    throw error;
  }
};

/**
 * Busca contagem de alertas por severidade
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export const getAlertCount = async (clinicId) => {
  try {
    const { data: critical } = await supabase
      .from('alert_notifications')
      .select('id', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .eq('severity', 'CRITICAL');
    
    const { data: high } = await supabase
      .from('alert_notifications')
      .select('id', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .eq('severity', 'HIGH');
    
    const { data: medium } = await supabase
      .from('alert_notifications')
      .select('id', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .eq('severity', 'MEDIUM');
    
    return {
      critical: critical?.length || 0,
      high: high?.length || 0,
      medium: medium?.length || 0,
      total: (critical?.length || 0) + (high?.length || 0) + (medium?.length || 0)
    };
  } catch (error) {
    console.error('Erro ao contar alertas:', error);
    return { critical: 0, high: 0, medium: 0, total: 0 };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// HISTÓRICO DE ALERTAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Busca histórico completo de alertas (ativos + resolvidos)
 * @param {string} clinicId
 * @param {object} filters - { type, status, dateStart, dateEnd, limit, offset }
 * @returns {Promise<Array>}
 */
export const getAlertHistory = async (clinicId, filters = {}) => {
  try {
    const { type, status = 'all', dateStart, dateEnd, limit = 100, offset = 0 } = filters;
    
    let query = supabase
      .from('alert_notifications')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    
    if (type) {
      query = query.eq('alert_type', type);
    }
    
    if (status !== 'all') {
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
    console.error('Erro ao buscar histórico de alertas:', error);
    throw error;
  }
};

/**
 * Busca estatísticas de alertas
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export const getAlertStats = async (clinicId) => {
  try {
    // Total de alertas por tipo
    const { data: byType } = await supabase
      .from('alert_notifications')
      .select('alert_type')
      .eq('clinic_id', clinicId)
      .eq('status', 'active');
    
    // Total resolvido
    const { data: resolved } = await supabase
      .from('alert_notifications')
      .select('id', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('status', 'resolved');
    
    // Tempo médio de resolução
    const { data: avgTime } = await supabase
      .from('alert_notifications')
      .select('created_at, resolved_at')
      .eq('clinic_id', clinicId)
      .eq('status', 'resolved')
      .not('resolved_at', 'is', null);
    
    const avgResolutionTime = avgTime?.length > 0 
      ? Math.round(
          avgTime.reduce((acc, a) => {
            const created = new Date(a.created_at);
            const resolved = new Date(a.resolved_at);
            return acc + (resolved - created) / 1000 / 60; // em minutos
          }, 0) / avgTime.length
        )
      : 0;
    
    return {
      activeCount: byType?.length || 0,
      resolvedCount: resolved?.length || 0,
      avgResolutionMinutes: avgResolutionTime,
      byType: (byType || []).reduce((acc, a) => {
        acc[a.alert_type] = (acc[a.alert_type] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return { activeCount: 0, resolvedCount: 0, avgResolutionMinutes: 0, byType: {} };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// AÇÕES EM ALERTAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Marca alerta como resolvido
 * @param {string} alertId
 * @returns {Promise<Object>}
 */
export const resolveAlert = async (alertId) => {
  try {
    const { data, error } = await supabase
      .from('alert_notifications')
      .update({ 
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    throw error;
  }
};

/**
 * Marca alerta como descartado (dismissed)
 * @param {string} alertId
 * @returns {Promise<Object>}
 */
export const dismissAlert = async (alertId) => {
  try {
    const { data, error } = await supabase
      .from('alert_notifications')
      .update({ 
        status: 'dismissed',
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao descartar alerta:', error);
    throw error;
  }
};

/**
 * Marca alerta como lido
 * @param {string} alertId
 * @returns {Promise<Object>}
 */
export const markAlertAsRead = async (alertId) => {
  try {
    const { data, error } = await supabase
      .from('alert_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao marcar como lido:', error);
    throw error;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES DE ALERTAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Busca configurações de alertas para uma clínica
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export const getAlertConfigs = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('alert_type');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar configurações de alertas:', error);
    return [];
  }
};

/**
 * Busca uma configuração específica
 * @param {string} clinicId
 * @param {string} alertType
 * @returns {Promise<Object>}
 */
export const getAlertConfig = async (clinicId, alertType) => {
  try {
    const { data, error } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('alert_type', alertType)
      .single();
    
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return null;
  }
};

/**
 * Atualiza configuração de alertas
 * @param {string} clinicId
 * @param {string} alertType
 * @param {object} updates - { is_enabled, severity_level, email_recipients, notify_channels }
 * @returns {Promise<Object>}
 */
export const updateAlertConfig = async (clinicId, alertType, updates) => {
  try {
    const { data, error } = await supabase
      .from('alert_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('clinic_id', clinicId)
      .eq('alert_type', alertType)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    throw error;
  }
};

/**
 * Cria configuração de alerta para uma clínica
 * @param {string} clinicId
 * @param {string} alertType
 * @param {object} config
 * @returns {Promise<Object>}
 */
export const createAlertConfig = async (clinicId, alertType, config = {}) => {
  try {
    const { data, error } = await supabase
      .from('alert_configs')
      .insert({
        clinic_id: clinicId,
        alert_type: alertType,
        is_enabled: config.is_enabled ?? true,
        severity_level: config.severity_level || 'MEDIUM',
        check_frequency: config.check_frequency || 'DAILY',
        notify_channels: config.notify_channels || { email: true, dashboard: true },
        email_recipients: config.email_recipients || []
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar configuração:', error);
    throw error;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// REGRAS DE ALERTAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Busca regras de alerta
 * @param {string} clinicId
 * @param {string} alertType
 * @returns {Promise<Array>}
 */
export const getAlertRules = async (clinicId, alertType = null) => {
  try {
    let query = supabase
      .from('alert_rules')
      .select('*')
      .eq('clinic_id', clinicId);
    
    if (alertType) {
      query = query.eq('alert_config_id', alertType);
    }
    
    const { data, error } = await query.order('priority');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar regras:', error);
    return [];
  }
};

/**
 * Cria regra de alerta
 * @param {object} rule - { clinic_id, alert_config_id, rule_name, condition_type, condition_value, condition_operator, action_on_trigger }
 * @returns {Promise<Object>}
 */
export const createAlertRule = async (rule) => {
  try {
    const { data, error } = await supabase
      .from('alert_rules')
      .insert(rule)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar regra:', error);
    throw error;
  }
};

/**
 * Deleta regra de alerta
 * @param {string} ruleId
 * @returns {Promise<void>}
 */
export const deleteAlertRule = async (ruleId) => {
  try {
    const { error } = await supabase
      .from('alert_rules')
      .delete()
      .eq('id', ruleId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao deletar regra:', error);
    throw error;
  }
};

export default {
  getAlerts,
  getAlertCount,
  getAlertHistory,
  getAlertStats,
  resolveAlert,
  dismissAlert,
  markAlertAsRead,
  getAlertConfigs,
  getAlertConfig,
  updateAlertConfig,
  createAlertConfig,
  getAlertRules,
  createAlertRule,
  deleteAlertRule
};
