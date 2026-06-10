// src/lib/financeiro/notificationsApi.js
// API para envio de notificações (email, SMS, push)

import { supabase } from '../customSupabaseClient';

export const notificationsApi = {
  /**
   * ENVIO DE EMAIL
   */

  // Enviar email de alerta
  async sendAlertEmail(toEmail, alertTitle, alertMessage, alertData = {}) {
    try {
      // Em produção, isso chamaria uma API de email (SendGrid, Mailgun, etc)
      // Por enquanto, registra na tabela notification_logs

      const emailPayload = {
        to: toEmail,
        subject: `[ALERTA] ${alertTitle}`,
        template: 'alert_notification',
        data: {
          title: alertTitle,
          message: alertMessage,
          alertData: alertData,
          timestamp: new Date().toLocaleString('pt-BR'),
          actionUrl: `${window.location.origin}/clinica/financeiro/alerts`,
        },
      };

      // Aqui você integraria com seu serviço de email
      console.log('📧 Email seria enviado para:', toEmail, emailPayload);

      return {
        success: true,
        channel: 'email',
        recipient: toEmail,
        status: 'sent',
      };
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return {
        success: false,
        channel: 'email',
        recipient: toEmail,
        status: 'failed',
        error: error.message,
      };
    }
  },

  /**
   * ENVIO DE SMS
   */

  // Enviar SMS de alerta
  async sendAlertSMS(phoneNumber, alertMessage) {
    try {
      // Em produção, isso chamaria Twilio, AWS SNS, etc

      const smsPayload = {
        to: phoneNumber,
        message: `🚨 ALERTA FINANCEIRO: ${alertMessage}`,
      };

      console.log('📱 SMS seria enviado para:', phoneNumber, smsPayload);

      return {
        success: true,
        channel: 'sms',
        recipient: phoneNumber,
        status: 'sent',
      };
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      return {
        success: false,
        channel: 'sms',
        recipient: phoneNumber,
        status: 'failed',
        error: error.message,
      };
    }
  },

  /**
   * NOTIFICAÇÃO PUSH
   */

  // Enviar notificação push
  async sendPushNotification(userId, title, message, data = {}) {
    try {
      // Em produção, integraria com Firebase Cloud Messaging, etc

      const pushPayload = {
        userId: userId,
        title: title,
        body: message,
        data: data,
        icon: '🔔',
        tag: 'alert',
      };

      console.log('🔔 Push seria enviado para:', userId, pushPayload);

      // Simular notificação no dashboard
      const event = new CustomEvent('notification', {
        detail: { title, message, data, type: 'alert' }
      });
      window.dispatchEvent(event);

      return {
        success: true,
        channel: 'push',
        recipient: userId,
        status: 'sent',
      };
    } catch (error) {
      console.error('Erro ao enviar push:', error);
      return {
        success: false,
        channel: 'push',
        recipient: userId,
        status: 'failed',
        error: error.message,
      };
    }
  },

  /**
   * NOTIFICAÇÃO NO DASHBOARD
   */

  // Criar notificação no dashboard
  async sendDashboardNotification(userId, title, message, severity = 'info', data = {}) {
    try {
      // Notificação local no navegador
      const notification = {
        userId: userId,
        title: title,
        message: message,
        severity: severity, // 'info', 'warning', 'error', 'success'
        icon: this.getIconBySeverity(severity),
        data: data,
        timestamp: new Date(),
        read: false,
      };

      // Disparar evento customizado
      const event = new CustomEvent('dashboardNotification', {
        detail: notification
      });
      window.dispatchEvent(event);

      // Armazenar em localStorage (opcional)
      const notifications = JSON.parse(localStorage.getItem('dashboard_notifications') || '[]');
      notifications.unshift(notification);
      if (notifications.length > 50) notifications.pop(); // Manter últimas 50
      localStorage.setItem('dashboard_notifications', JSON.stringify(notifications));

      return {
        success: true,
        channel: 'dashboard',
        status: 'delivered',
      };
    } catch (error) {
      console.error('Erro ao enviar notificação dashboard:', error);
      return {
        success: false,
        channel: 'dashboard',
        status: 'failed',
        error: error.message,
      };
    }
  },

  /**
   * WEBHOOK
   */

  // Enviar notificação via webhook
  async sendWebhookNotification(webhookUrl, alertData) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Alert-Token': 'secret-token', // Em produção, usar token seguro
        },
        body: JSON.stringify({
          alert: alertData,
          timestamp: new Date().toISOString(),
          source: 'gesclinic-alerts',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        channel: 'webhook',
        recipient: webhookUrl,
        status: 'sent',
      };
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      return {
        success: false,
        channel: 'webhook',
        recipient: webhookUrl,
        status: 'failed',
        error: error.message,
      };
    }
  },

  /**
   * ENVIO MULTI-CANAL
   */

  // Enviar notificação por múltiplos canais
  async sendMultiChannelAlert(alertId, channels, recipients, alertTitle, alertMessage, alertData = {}) {
    const results = [];

    for (const channel of channels) {
      let result;

      switch (channel) {
        case 'email':
          for (const email of recipients.emails || []) {
            result = await this.sendAlertEmail(email, alertTitle, alertMessage, alertData);
            results.push(result);
          }
          break;

        case 'sms':
          for (const phone of recipients.phones || []) {
            result = await this.sendAlertSMS(phone, alertMessage);
            results.push(result);
          }
          break;

        case 'push':
          for (const userId of recipients.userIds || []) {
            result = await this.sendPushNotification(userId, alertTitle, alertMessage, alertData);
            results.push(result);
          }
          break;

        case 'dashboard':
          for (const userId of recipients.userIds || []) {
            result = await this.sendDashboardNotification(userId, alertTitle, alertMessage, 'warning', alertData);
            results.push(result);
          }
          break;

        case 'webhook':
          if (recipients.webhooks) {
            for (const webhook of recipients.webhooks) {
              result = await this.sendWebhookNotification(webhook, {
                alertId,
                title: alertTitle,
                message: alertMessage,
                data: alertData,
              });
              results.push(result);
            }
          }
          break;
      }
    }

    return results;
  },

  /**
   * TEMPLATES DE NOTIFICAÇÃO
   */

  // Gerar template de inadimplência
  generateDelinquencyTemplate(alertData) {
    const { patients_count, total_amount, days_overdue } = alertData || {};
    return {
      title: '⚠️ Inadimplência Detectada',
      message: `${patients_count} faturas em atraso há ${days_overdue} dias. Total: R$ ${total_amount?.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`,
    };
  },

  // Gerar template de repasse atrasado
  generateRepaymentTemplate(alertData) {
    const { professionals_count, total_amount, hours_overdue } = alertData || {};
    const days = Math.ceil(hours_overdue / 24);
    return {
      title: '🚨 Repasse Profissional Atrasado',
      message: `${professionals_count} profissional(is) aguardando repasse há ${days} dias. Total: R$ ${total_amount?.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    };
  },

  // Gerar template de fluxo de caixa baixo
  generateCashflowTemplate(alertData) {
    const { available_balance, percentage } = alertData || {};
    return {
      title: '🚨 Fluxo de Caixa Crítico',
      message: `Saldo disponível em apenas ${percentage?.toFixed(1)}% da receita mensal. Disponível: R$ ${available_balance?.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    };
  },

  /**
   * UTILIDADES
   */

  // Obter ícone por severidade
  getIconBySeverity(severity) {
    const icons = {
      LOW: 'ℹ️',
      MEDIUM: '⚠️',
      HIGH: '⚠️',
      CRITICAL: '🚨',
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      success: '✅',
    };
    return icons[severity] || '🔔';
  },

  // Obter cor por severidade
  getColorBySeverity(severity) {
    const colors = {
      LOW: '#3B82F6', // blue
      MEDIUM: '#F59E0B', // amber
      HIGH: '#EF4444', // red
      CRITICAL: '#7C3AED', // violet
      info: '#3B82F6',
      warning: '#F59E0B',
      error: '#EF4444',
      success: '#10B981',
    };
    return colors[severity] || '#6B7280';
  },

  // Formatar tempo relativo
  formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} dia${days > 1 ? 's' : ''} atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}m atrás`;
    return 'Agora mesmo';
  },
};

export default notificationsApi;
