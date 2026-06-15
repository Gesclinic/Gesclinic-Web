import { supabase } from '@/lib/customSupabaseClient';

/**
 * Gerenciador de notificações automáticas de alertas
 * Suporta: Email, Toast, Webhooks
 */
export class AlertNotificationManager {
  /**
   * Envia email para usuários quando há alertas críticos
   * @param {Array} alerts - Array de alertas
   * @param {String} clinicId - ID da clínica
   * @param {String} recipientEmail - Email do destinatário
   */
  static async sendAlertEmail(alerts, clinicId, recipientEmail) {
    try {
      if (!alerts || alerts.length === 0) return;

      const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
      if (criticalAlerts.length === 0) return;

      // Preparar conteúdo do email
      const subject = `🚨 Alertas Críticos de Auditoria - ${new Date().toLocaleDateString('pt-BR')}`;
      const alertContent = criticalAlerts
        .map(
          a => `
        <div style="border-left: 4px solid #dc2626; padding: 12px; margin: 8px 0; background-color: #fee2e2;">
          <strong>${a.title}</strong><br/>
          <small>${a.message}</small><br/>
          <small style="color: #666;">${new Date(a.timestamp).toLocaleString('pt-BR')}</small>
        </div>
      `
        )
        .join('');

      const htmlContent = `
        <h2 style="color: #1f2937;">Alertas de Auditoria Críticos</h2>
        <p>Você recebeu ${criticalAlerts.length} alerta(s) crítico(s) de auditoria.</p>
        ${alertContent}
        <hr/>
        <p style="font-size: 12px; color: #666;">
          Para desativar estas notificações, acesse as <a href="#">configurações de alertas</a>.
        </p>
      `;

      // Chamar função de envio de email (usando Supabase Edge Function ou similar)
      const { data, error } = await supabase.functions.invoke('send-alert-email', {
        body: {
          to: recipientEmail,
          subject,
          html: htmlContent,
          clinic_id: clinicId,
        },
      });

      if (error) {
        console.error('Erro ao enviar email de alerta:', error);
        return false;
      }

      console.log('Email de alerta enviado com sucesso:', data);
      return true;
    } catch (error) {
      console.error('Erro em AlertNotificationManager.sendAlertEmail:', error);
      return false;
    }
  }

  /**
   * Salva preferências de notificação do usuário
   */
  static async saveNotificationPreferences(userId, preferences) {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          email_critical_alerts: preferences.emailCritical,
          email_daily_digest: preferences.emailDigest,
          alert_threshold: preferences.threshold || 3,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      return false;
    }
  }

  /**
   * Recupera preferências de notificação do usuário
   */
  static async getNotificationPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return (
        data || {
          email_critical_alerts: true,
          email_daily_digest: false,
          alert_threshold: 3,
        }
      );
    } catch (error) {
      console.error('Erro ao recuperar preferências:', error);
      return null;
    }
  }

  /**
   * Criar notificação de webhook para integrações externas
   */
  static async sendWebhookNotification(alerts, webhookUrl) {
    try {
      if (!webhookUrl || !alerts || alerts.length === 0) return false;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          alerts,
          count: alerts.length,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      return false;
    }
  }

  /**
   * Agenda email com relatório diário/semanal
   */
  static async scheduleReportEmail(clinicId, userId, frequency = 'daily') {
    try {
      const { error } = await supabase.from('scheduled_reports').insert({
        clinic_id: clinicId,
        user_id: userId,
        frequency, // 'daily', 'weekly', 'monthly'
        enabled: true,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao agendar relatório:', error);
      return false;
    }
  }

  /**
   * Define limiar customizado para alertas de um usuário
   */
  static setAlertThreshold(threshold) {
    localStorage.setItem('audit_alert_threshold', JSON.stringify(threshold));
  }

  /**
   * Recupera limiar de alertas customizado
   */
  static getAlertThreshold() {
    const stored = localStorage.getItem('audit_alert_threshold');
    return stored ? JSON.parse(stored) : { deletions: 3, rapidChanges: 5 };
  }
}
