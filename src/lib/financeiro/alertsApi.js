// src/lib/financeiro/alertsApi.js
// API para gerenciamento de alertas e configurações

import { supabase } from '../customSupabaseClient';

/**
 * CONFIGURAÇÃO DE ALERTAS
 */

export const alertsApi = {
  // Listar configurações de alertas para uma clínica
  async listAlertConfigs(clinicId) {
    console.log('🔍 [alertsApi.listAlertConfigs] Iniciando chamada com clinicId:', clinicId);

    const { data, error } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('alert_type', { ascending: true });

    if (error) {
      console.error('❌ [alertsApi.listAlertConfigs] Erro ao listar:', error);
      throw new Error(`Erro ao listar alertas: ${error.message}`);
    }

    console.log('✅ [alertsApi.listAlertConfigs] Sucesso! Dados retornados:', data);
    return data || [];
  },

  // Obter configuração específica
  async getAlertConfig(configId) {
    const { data, error } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('id', configId)
      .single();

    if (error) throw new Error(`Erro ao obter alerta: ${error.message}`);
    return data;
  },

  // Atualizar configuração de alerta
  async updateAlertConfig(configId, updates) {
    const { data, error } = await supabase
      .from('alert_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', configId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar alerta: ${error.message}`);
    return data;
  },

  // Ativar/desativar alerta
  async toggleAlertConfig(configId, isEnabled) {
    return this.updateAlertConfig(configId, { is_enabled: isEnabled });
  },

  // Atualizar email recipients
  async updateEmailRecipients(configId, emails) {
    return this.updateAlertConfig(configId, { email_recipients: emails });
  },

  // Atualizar canais de notificação
  async updateNotificationChannels(configId, channels) {
    return this.updateAlertConfig(configId, { notify_channels: channels });
  },

  // Atualizar configuração de automação
  async updateAutoAction(configId, autoActionType, autoActionConfig) {
    return this.updateAlertConfig(configId, {
      is_auto_action: true,
      auto_action_type: autoActionType,
      auto_action_config: autoActionConfig,
    });
  },

  /**
   * NOTIFICAÇÕES DE ALERTA
   */

  // Listar alertas ativos
  async listActiveAlerts(clinicId, filters = {}) {
    let query = supabase
      .from('alert_notifications')
      .select('*, alert_configs(alert_type)')
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Filtros opcionais
    if (filters.alertType) {
      query = query.eq('alert_type', filters.alertType);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao listar alertas ativos: ${error.message}`);
    return data || [];
  },

  // Obter histórico de alertas
  async getAlertHistory(clinicId, filters = {}) {
    let query = supabase
      .from('alert_notifications')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    // Filtros
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.alertType) {
      query = query.eq('alert_type', filters.alertType);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao obter histórico: ${error.message}`);
    return data || [];
  },

  // Obter um alerta específico
  async getAlert(alertId) {
    const { data, error } = await supabase
      .from('alert_notifications')
      .select('*')
      .eq('id', alertId)
      .single();

    if (error) throw new Error(`Erro ao obter alerta: ${error.message}`);
    return data;
  },

  // Marcar alerta como lido
  async markAsRead(alertId) {
    const { data, error } = await supabase
      .from('alert_notifications')
      .update({ is_read: true })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao marcar como lido: ${error.message}`);
    return data;
  },

  // Resolver alerta
  async resolveAlert(alertId, resolvedBy = null) {
    const { data, error } = await supabase
      .from('alert_notifications')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        created_by: resolvedBy,
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao resolver alerta: ${error.message}`);
    return data;
  },

  // Descartar alerta
  async dismissAlert(alertId, dismissedBy = null) {
    const { data, error } = await supabase
      .from('alert_notifications')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
        dismissed_by: dismissedBy,
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao descartar alerta: ${error.message}`);
    return data;
  },

  // Obter contagem de alertas por severidade
  async getAlertsSummary(clinicId) {
    const { data, error } = await supabase
      .from('alert_notifications')
      .select('severity')
      .eq('clinic_id', clinicId)
      .eq('status', 'active');

    if (error) throw new Error(`Erro ao obter resumo: ${error.message}`);

    // Processar contagem por severidade no JavaScript
    const summary = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
      TOTAL: (data || []).length,
    };

    (data || []).forEach(alert => {
      if (alert.severity && summary.hasOwnProperty(alert.severity)) {
        summary[alert.severity]++;
      }
    });

    return summary;
  },

  // Listar alertas não lidos
  async getUnreadAlerts(clinicId) {
    const { data, error } = await supabase
      .from('alert_notifications')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_read', false)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao obter alertas não lidos: ${error.message}`);
    return data || [];
  },

  /**
   * AÇÕES AUTOMÁTICAS
   */

  // Listar ações pendentes
  async listPendingActions(clinicId, limit = 50) {
    const { data, error } = await supabase
      .from('alert_actions')
      .select('*')
      .eq('clinic_id', clinicId)
      .in('status', ['pending', 'executing'])
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Erro ao listar ações: ${error.message}`);
    return data || [];
  },

  // Criar ação automática
  async createAction(clinicId, alertNotificationId, actionType, params) {
    const { data, error } = await supabase
      .from('alert_actions')
      .insert({
        clinic_id: clinicId,
        alert_notification_id: alertNotificationId,
        action_type: actionType,
        action_params: params || {},
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar ação: ${error.message}`);
    return data;
  },

  // Cancelar ação
  async cancelAction(actionId) {
    const { data, error } = await supabase
      .from('alert_actions')
      .update({ status: 'failed', error_message: 'Cancelado pelo usuário' })
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao cancelar ação: ${error.message}`);
    return data;
  },

  /**
   * LOGS DE NOTIFICAÇÃO
   */

  // Listar logs de notificação
  async getNotificationLogs(alertId) {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('alert_notification_id', alertId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao obter logs: ${error.message}`);
    return data || [];
  },

  // Listar logs por status
  async getNotificationLogsByStatus(status) {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(`Erro ao obter logs: ${error.message}`);
    return data || [];
  },

  /**
   * TRIGGERS MANUAIS COM CONFIGURAÇÕES
   */

  // Disparar verificação de todos os alertas usando configurações da clínica
  async triggerAlertCheckWithConfigs(clinicId) {
    try {
      // Carregar configurações
      const configs = await this.listAlertConfigs(clinicId);

      const results = [];

      // Processar cada alerta configurado
      for (const config of configs) {
        if (!config.is_enabled) {
          console.log(`⏭️ Alerta ${config.alert_type} desativado, pulando...`);
          continue;
        }

        const threshold = config.threshold_value;
        console.log(`🔔 Verificando ${config.alert_type} com threshold: ${threshold}`);

        try {
          let result;

          switch (config.alert_type) {
            case 'REPAYMENT_LATE':
              result = await this.triggerRepaymentAlert(clinicId, Number(threshold));
              break;
            case 'DELINQUENCY':
              result = await this.triggerDelinquencyAlert(clinicId, Number(threshold));
              break;
            case 'LOW_CASHFLOW':
              result = await this.triggerLowCashflowAlert(clinicId, Number(threshold));
              break;
            case 'COLLECTION_LOW':
              // Alerta de coleta baixa seria implementado aqui
              console.log('⚠️ COLLECTION_LOW ainda não implementado');
              break;
            default:
              console.warn(`Tipo de alerta desconhecido: ${config.alert_type}`);
          }

          results.push({
            alert_type: config.alert_type,
            threshold: threshold,
            status: 'checked',
            result: result,
          });
        } catch (err) {
          console.error(`❌ Erro ao verificar ${config.alert_type}:`, err);
          results.push({
            alert_type: config.alert_type,
            status: 'error',
            error: err.message,
          });
        }
      }

      return {
        clinic_id: clinicId,
        timestamp: new Date().toISOString(),
        total_checks: configs.length,
        results: results,
      };
    } catch (err) {
      throw new Error(`Erro ao disparar verificação de alertas: ${err.message}`);
    }
  },

  /**
   * TRIGGERS MANUAIS
   */

  // Disparar verificação de alertas agora
  async triggerAlertCheck() {
    const { data, error } = await supabase.rpc('check_and_trigger_alerts');

    if (error) throw new Error(`Erro ao disparar check: ${error.message}`);
    return data;
  },

  // Executar ações pendentes agora
  async executeActions() {
    const { data, error } = await supabase.rpc('execute_pending_alert_actions');

    if (error) throw new Error(`Erro ao executar ações: ${error.message}`);
    return data;
  },

  // Disparar alerta de inadimplência manualmente
  async triggerDelinquencyAlert(clinicId, daysThreshold = 5) {
    const { data, error } = await supabase.rpc('create_alert_if_delinquency', {
      p_clinic_id: clinicId,
      p_days_threshold: daysThreshold,
    });

    if (error) throw new Error(`Erro ao disparar alerta: ${error.message}`);
    return data;
  },

  // Disparar alerta de repasse atrasado
  async triggerRepaymentAlert(clinicId, hoursThreshold = 48) {
    const { data, error } = await supabase.rpc('create_alert_if_repayment_late', {
      p_clinic_id: clinicId,
      p_hours_threshold: hoursThreshold,
    });

    if (error) throw new Error(`Erro ao disparar alerta: ${error.message}`);
    return data;
  },

  // Disparar alerta de fluxo de caixa baixo
  async triggerLowCashflowAlert(clinicId, thresholdPercent = 10) {
    const { data, error } = await supabase.rpc('create_alert_if_low_cashflow', {
      p_clinic_id: clinicId,
      p_threshold_percent: thresholdPercent,
    });

    if (error) throw new Error(`Erro ao disparar alerta: ${error.message}`);
    return data;
  },
};

export default alertsApi;
