import { customSupabaseClient } from './customSupabaseClient';

const supabase = customSupabaseClient;

const parseWebhookResponse = async (response) => {
  const body = await response.text();

  if (!body) return null;

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

/**
 * Webhook Management Service
 * Permite integração com sistemas externos via webhooks
 */

export const registerWebhook = async (clinicId, webhookData) => {
  try {
    const { data, error } = await supabase
      .from('webhooks')
      .insert([
        {
          clinic_id: clinicId,
          webhook_name: webhookData.name,
          webhook_url: webhookData.url,
          event_types: webhookData.event_types || [],
          headers: webhookData.headers || {},
          retry_policy: webhookData.retry_policy || { max_retries: 3, timeout: 30000 },
          enabled: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, webhook: data?.[0] };
  } catch (error) {
    console.error('Erro ao registrar webhook:', error);
    return { success: false, error: error.message };
  }
};

export const listWebhooks = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('enabled', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar webhooks:', error);
    return [];
  }
};

export const testWebhook = async (webhookId, testPayload = null) => {
  let webhook = null;

  try {
    // Get webhook details
    const { data, error: fetchError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (fetchError) throw fetchError;
    webhook = data;

    // Send test request
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Test': 'true',
        ...webhook.headers,
      },
      body: JSON.stringify(
        testPayload || {
          event_type: 'test_webhook',
          timestamp: new Date().toISOString(),
          data: {
            message: 'Este é um teste do webhook',
          },
        }
      ),
    });

    const result = await parseWebhookResponse(response);

    // Log webhook test
    await supabase.from('webhook_logs').insert([
      {
        webhook_id: webhookId,
        event_type: 'test',
        status: response.ok ? 'success' : 'failed',
        status_code: response.status,
        response_body: result,
        created_at: new Date().toISOString(),
      },
    ]);

    return {
      success: response.ok,
      status: response.status,
      response: result,
    };
  } catch (error) {
    console.error('Erro ao testar webhook:', error);

    if (webhook?.id) {
      await supabase.from('webhook_logs').insert([
        {
          webhook_id: webhook.id,
          event_type: 'test',
          status: 'error',
          error_message: error.message,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    return { success: false, error: error.message };
  }
};

export const deleteWebhook = async (webhookId) => {
  try {
    const { error } = await supabase
      .from('webhooks')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('id', webhookId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar webhook:', error);
    return { success: false, error: error.message };
  }
};

export const getWebhookLogs = async (webhookId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar logs de webhook:', error);
    return [];
  }
};

// ========== WEBHOOK EVENT TYPES ==========

export const WEBHOOK_EVENT_TYPES = {
  // Financial events
  cash_alert_critical: {
    label: 'Alerta - Caixa Crítico',
    description: 'Disparado quando o saldo em caixa atinge nível crítico',
    category: 'alerts',
  },
  receivable_alert: {
    label: 'Alerta - Contas a Receber',
    description: 'Disparado quando contas a receber excedem limite',
    category: 'alerts',
  },
  payable_alert: {
    label: 'Alerta - Contas a Pagar',
    description: 'Disparado quando contas a pagar excedem limite',
    category: 'alerts',
  },
  daily_report: {
    label: 'Relatório Diário',
    description: 'Enviado diariamente com resumo financeiro',
    category: 'reports',
  },
  weekly_report: {
    label: 'Relatório Semanal',
    description: 'Enviado semanalmente com análise detalhada',
    category: 'reports',
  },
  monthly_report: {
    label: 'Relatório Mensal',
    description: 'Enviado mensalmente com métricas consolidadas',
    category: 'reports',
  },

  // Transaction events
  appointment_created: {
    label: 'Agendamento Criado',
    description: 'Quando um novo agendamento é criado',
    category: 'transactions',
  },
  payment_received: {
    label: 'Pagamento Recebido',
    description: 'Quando um pagamento é recebido',
    category: 'transactions',
  },
  invoice_generated: {
    label: 'Nota Fiscal Gerada',
    description: 'Quando uma nota fiscal é gerada',
    category: 'transactions',
  },
};

// ========== WEBHOOK PAYLOAD TEMPLATES ==========

export const generateWebhookPayload = (eventType, eventData) => {
  const timestamp = new Date().toISOString();

  const basePayload = {
    event_type: eventType,
    timestamp,
    webhook_version: '1.0',
    data: eventData,
  };

  switch (eventType) {
    case 'cash_alert_critical':
      return {
        ...basePayload,
        data: {
          clinic_id: eventData.clinic_id,
          current_balance: eventData.current_balance,
          minimum_threshold: eventData.minimum_threshold,
          urgency: 'critical',
        },
      };

    case 'daily_report':
      return {
        ...basePayload,
        data: {
          clinic_id: eventData.clinic_id,
          period: 'daily',
          report_date: new Date().toISOString().split('T')[0],
          metrics: eventData.metrics,
        },
      };

    default:
      return basePayload;
  }
};

/**
 * Fire webhook for an event
 * Called by backend/functions when events occur
 */
export const fireWebhook = async (clinicId, eventType, eventData) => {
  try {
    // Get all registered webhooks for this clinic
    const webhooks = await listWebhooks(clinicId);
    const relevantWebhooks = webhooks.filter((wh) =>
      wh.event_types.includes(eventType) || wh.event_types.includes('*')
    );

    if (!relevantWebhooks.length) {
      console.log(`No webhooks registered for event: ${eventType}`);
      return [];
    }

    const payload = generateWebhookPayload(eventType, eventData);

    // Fire all relevant webhooks and return the result for observability/tests.
    return await Promise.all(
      relevantWebhooks.map(async (webhook) => {
      try {
        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': eventType,
            ...webhook.headers,
          },
          body: JSON.stringify(payload),
        });

        const result = await parseWebhookResponse(response);

        // Log webhook call
        await supabase.from('webhook_logs').insert([
          {
            webhook_id: webhook.id,
            event_type: eventType,
            status: response.ok ? 'success' : 'failed',
            status_code: response.status,
            response_body: result,
            created_at: new Date().toISOString(),
          },
        ]);

        return {
          webhook_id: webhook.id,
          success: response.ok,
          status: response.status,
          response: result,
        };
      } catch (error) {
        console.error(`Webhook ${webhook.id} failed:`, error);
        // Log failure
        await supabase.from('webhook_logs').insert([
          {
            webhook_id: webhook.id,
            event_type: eventType,
            status: 'error',
            error_message: error.message,
            created_at: new Date().toISOString(),
          },
        ]);

        return {
          webhook_id: webhook.id,
          success: false,
          error: error.message,
        };
      }
      })
    );
  } catch (error) {
    console.error('Error firing webhooks:', error);
    return [];
  }
};
