/**
 * TISS Submission Service API - Integração com Operadoras
 * =======================================================
 * Responsabilidades:
 * 1. Gerenciar ciclo completo de envio TISS
 * 2. Integração com APIs/portais de operadoras
 * 3. Processamento de respostas e confirmações
 * 4. Agendamento de retries automáticos
 * 5. Webhook handlers para notificações de status
 *
 * Data: Abril 10, 2026
 */

import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';
import {
  submitTISSGuide,
  generateTISSXML,
  getTISSSubmissionStatus,
  retryTISSSubmission,
} from '@/lib/tissApi';

/**
 * ============================================================
 * 1. SUBMISSÃO CENTRALIZADA COM ROTEAMENTO POR OPERADORA
 * ============================================================
 */

/**
 * Submete guia TISS com roteamento automático por operadora
 * @param {string} guideId
 * @param {string} clinicId
 * @returns {Promise<{success: boolean, message: string, details: object}>}
 */
export async function submitGuideWithOperatorRouting(guideId, clinicId) {
  try {
    // 1. Fetch dados completos da guia
    const { data: guide, error } = await supabase
      .from('billing_guides')
      .select(
        `
        id, guide_number,
        health_insurances(id, name, registration_ans, tiss_endpoint, tiss_username, tiss_password, submission_method),
        appointments(id, scheduled_date, total_value)
      `,
      )
      .eq('id', guideId)
      .eq('clinic_id', clinicId)
      .single();

    if (error || !guide) {
      throw new Error(`Guia não encontrada: ${error?.message}`);
    }

    const payer = guide.health_insurances;
    if (!payer) {
      throw new Error('Operadora não configurada para esta guia');
    }

    // 2. Validar credenciais da operadora
    if (!payer.tiss_endpoint) {
      throw new Error(
        `Operadora "${payer.name}" não tem endpoint TISS configurado. Contate suporte.`,
      );
    }

    // 3. Chamar função de envio da operadora específica
    let submissionResult;
    switch (payer.submission_method?.toLowerCase()) {
      case 'sftp':
        submissionResult = await submitViaHTTPSFTP(guideId, clinicId, payer);
        break;
      case 'api':
      case 'http':
        submissionResult = await submitViaHTTPAPI(guideId, clinicId, payer);
        break;
      case 'portal':
      case 'web':
        submissionResult = await generateForPortalSubmission(guideId, clinicId, payer);
        break;
      default:
        submissionResult = await submitViaHTTPAPI(guideId, clinicId, payer); // Default a HTTP
    }

    if (!submissionResult.success) {
      throw new Error(submissionResult.message || 'Erro ao submeter guia');
    }

    // 4. Atualizar status em Supabase
    await supabase
      .from('billing_guides')
      .update({
        status: 'submitted',
        last_submission_at: new Date().toISOString(),
      })
      .eq('id', guideId);

    return {
      success: true,
      message: `Guia enviada para ${payer.name} com sucesso`,
      details: submissionResult,
    };
  } catch (error) {
    console.error('[submitGuideWithOperatorRouting]', error);
    return {
      success: false,
      message: error.message,
      details: { error: error.message },
    };
  }
}

/**
 * ============================================================
 * 2. MÉTODOS DE ENVIO POR OPERADORA
 * ============================================================
 */

/**
 * Envia via HTTP API (POST para endpoint da operadora)
 * @param {string} guideId
 * @param {string} clinicId
 * @param {Object} payer - Dados da operadora
 * @returns {Promise<Object>}
 */
async function submitViaHTTPAPI(guideId, clinicId, payer) {
  try {
    // 1. Preparar XML
    const { data: xmlData, error: xmlError } = await supabase
      .from('tiss_submissions')
      .select('xml_content')
      .eq('guide_id', guideId)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(1);


    if (xmlError || !xmlData) {
      // Gerar XML se ainda não existir
      const guideData = await fetchCompleteGuideData(guideId, clinicId);
      const xmlContent = generateTISSXML(guideData);

      // Salvar na DB
      await supabase.from('tiss_submissions').insert({
        id: `TISS-${guideId}-${Date.now()}`,
        clinic_id: clinicId,
        guide_id: guideId,
        xml_content: xmlContent,
        status: 'pending',
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
      });

      return {
        success: true,
        method: 'http',
        message: 'XML preparado para envio. Aguardando transmissão...',
        xmlGenerated: true,
      };
    }

    // 2. Preparar request HTTP (simulado - em produção integrar com SDK de cada operadora)
    const response = await fetch(payer.tiss_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: `Bearer ${btoa(`${payer.tiss_username}:${payer.tiss_password}`)}`,
      },
      body: xmlData.xml_content,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();

    // 3. Registrar resposta
    await supabase
      .from('tiss_submissions')
      .update({
        status: 'sent',
        response_data: responseData,
      })
      .eq('guide_id', guideId)
      .eq('clinic_id', clinicId);

    return {
      success: true,
      method: 'http',
      message: 'Guia enviada via HTTP API',
      submissionId: responseData.submissionId || 'http-sent',
    };
  } catch (error) {
    console.error('[submitViaHTTPAPI]', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Envia via SFTP (para operadoras que usam SFTP)
 * @param {string} guideId
 * @param {string} clinicId
 * @param {Object} payer
 * @returns {Promise<Object>}
 */
async function submitViaHTTPSFTP(guideId, clinicId, payer) {
  // Nota: SFTP em browser não é direto. Seria necessário:
  // 1. Enviar para backend que faz SFTP
  // 2. Ou usar webDAV como alternativa
  // Por agora, retornar instrução manual

  const xmlData = await supabase
    .from('tiss_submissions')
    .select('xml_content')
    .eq('guide_id', guideId)
    .eq('clinic_id', clinicId)
    .limit(1);


  return {
    success: true,
    method: 'sftp',
    message: `Guia preparada para envio SFTP. Arquivo: TISS-${guideId}.xml`,
    manualStep: true,
    instructions: `
      1. Conectar ao SFTP: ${payer.tiss_endpoint}
      2. Usuário: ${payer.tiss_username}
      3. Diretório: /guias/entrada
      4. Arquivo: TISS-${guideId}.xml
    `,
  };
}

/**
 * Gera para envio manual via portal web
 * @param {string} guideId
 * @param {string} clinicId
 * @param {Object} payer
 * @returns {Promise<Object>}
 */
async function generateForPortalSubmission(guideId, clinicId, payer) {
  try {
    const xmlData = await supabase
      .from('tiss_submissions')
      .select('xml_content')
      .eq('guide_id', guideId)
      .eq('clinic_id', clinicId)
      .limit(1);


    return {
      success: true,
      method: 'portal',
      message: `Guia preparada para envio manual via portal ${payer.name}`,
      manualStep: true,
      portalUrl: payer.tiss_endpoint,
      xmlFileName: `TISS-${guideId}.xml`,
      downloadLink: true,
      instructions: `
        1. Acessar portal: ${payer.tiss_endpoint}
        2. Login: ${payer.tiss_username}
        3. Menu: Enviar Guias TISS
        4. Carregar arquivo: TISS-${guideId}.xml
        5. Confirmar envio
      `,
    };
  } catch (error) {
    console.error('[generateForPortalSubmission]', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * ============================================================
 * 3. PROCESSAMENTO DE RESPOSTAS
 * ============================================================
 */

/**
 * Webhook handler - Recepciona status de submissão da operadora
 * @param {Object} webhookData - Payload do webhook
 * @returns {Promise<Object>}
 */
export async function handleOperatorWebhook(webhookData) {
  try {
    const {
      submissionId,
      status, // accepted, rejected, processing
      message,
      errors,
      guideData,
    } = webhookData;

    if (!submissionId) {
      throw new Error('submissionId obrigatório no webhook');
    }

    // 1. Fetch submissão
    const { data: submission, error: fetchError } = await supabase
      .from('tiss_submissions')
      .select('id, clinic_id, guide_id')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return {
        success: false,
        message: 'Submissão não encontrada',
      };
    }

    // 2. Atualizar status
    await supabase
      .from('tiss_submissions')
      .update({
        status: status,
        response_data: {
          receivedAt: new Date().toISOString(),
          message,
          errors,
          guideData,
        },
      })
      .eq('id', submissionId);

    // 3. Atualizar guia também
    await supabase
      .from('billing_guides')
      .update({
        status:
          status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : 'processing',
      })
      .eq('id', submission.guide_id);

    // 4. Se rejeitado, notificar usuário
    if (status === 'rejected') {
      await createNotification({
        clinic_id: submission.clinic_id,
        type: 'tiss_rejected',
        title: 'Guia rejeitada pela operadora',
        message: errors ? errors.join('; ') : message,
        guide_id: submission.guide_id,
        severity: 'error',
      });
    }

    // 5. Se aceito, registrar em auditoria
    if (status === 'accepted') {
      await supabase.from('tiss_audit_logs').insert({
        clinic_id: submission.clinic_id,
        guide_id: submission.guide_id,
        event: 'ACCEPTED',
        message: 'Guia aceita pela operadora',
        created_at: new Date().toISOString(),
      });
    }

    return {
      success: true,
      message: `Webhook processado: status = ${status}`,
    };
  } catch (error) {
    console.error('[handleOperatorWebhook]', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * ============================================================
 * 4. RETRY AUTOMÁTICO
 * ============================================================
 */

/**
 * Processa retries automáticos para submissões falhadas
 * Deve ser executado via background job/cron
 * @param {string} clinicId
 * @returns {Promise<{processed: number, successful: number, failed: number}>}
 */
export async function processPendingTISSRetries(clinicId) {
  try {
    const now = new Date();

    // 1. Buscar submissões que precisam de retry
    const { data: submissions, error } = await supabase
      .from('tiss_submissions')
      .select('id, guide_id, attempt_count, status')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .lt('next_retry_at', now.toISOString())
      .lt('attempt_count', 3);

    if (error) {
      throw error;
    }

    let successful = 0;
    let failed = 0;

    // 2. Reenviar cada um
    for (const submission of submissions || []) {
      const retryResult = await retryTISSSubmission(submission.id, clinicId);
      if (retryResult.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      processed: (submissions || []).length,
      successful,
      failed,
    };
  } catch (error) {
    console.error('[processPendingTISSRetries]', error);
    return {
      processed: 0,
      successful: 0,
      failed: 0,
      error: error.message,
    };
  }
}

/**
 * ============================================================
 * 5. UTILITÁRIOS
 * ============================================================
 */

/**
 * Fetch dados completos da guia para XML
 * @param {string} guideId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
async function fetchCompleteGuideData(guideId, clinicId) {
  const { data: guide, error } = await supabase
    .from('billing_guides')
    .select(
      `
      id, guide_number,
      appointments(
        id, patient_id, scheduled_date, scheduled_time, total_value, service_id, 
        professional_id, authorization_number, subscriber_number, quantity, notes,
        patients(id, name, cpf, birthdate, gender, mother_name),
        professionals(id, name, cbo_code, council_number, council_state, cpf),
        services(id, name, tuss_code, guide_type, unit_measure, cost_value)
      ),
      health_insurances(id, name, registration_ans)
    `,
    )
    .eq('id', guideId)
    .eq('clinic_id', clinicId);


  if (error) {
    throw error;
  }

  const appoData = guide.appointments[0];
  return {
    patient: appoData.patients[0],
    professional: appoData.professionals[0],
    service: appoData.services[0],
    payer: guide.health_insurances,
    appointment: appoData,
  };
}

/**
 * Cria notificação para usuário
 * @param {Object} notificationData
 */
async function createNotification(notificationData) {
  try {
    await supabase.from('user_notifications').insert({
      ...notificationData,
      created_at: new Date().toISOString(),
      is_read: false,
    });
  } catch (error) {
    console.warn('[createNotification]', error);
  }
}

/**
 * Busca submissões rejeitadas para análise
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function getRejectedTISSSubmissions(clinicId) {
  try {
    const { data, error } = await supabase
      .from('tiss_submissions')
      .select(
        `
        id, guide_id, status, response_data, error_message, created_at,
        billing_guides(guide_number, appointments(patients(name)))
      `,
      )
      .eq('clinic_id', clinicId)
      .eq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('[getRejectedTISSSubmissions]', error);
    return [];
  }
}

/**
 * Busca resumo de submissões por status
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function getTISSSubmissionSummary(clinicId) {
  try {
    const { data, error } = await supabase
      .from('tiss_submissions')
      .select('status')
      .eq('clinic_id', clinicId);

    if (error) {
      throw error;
    }

    const summary = {
      total: data.length,
      pending: data.filter((d) => d.status === 'pending').length,
      sent: data.filter((d) => d.status === 'sent').length,
      processing: data.filter((d) => d.status === 'processing').length,
      accepted: data.filter((d) => d.status === 'accepted').length,
      rejected: data.filter((d) => d.status === 'rejected').length,
      error: data.filter((d) => d.status === 'error').length,
    };

    return summary;
  } catch (error) {
    console.error('[getTISSSubmissionSummary]', error);
    return { error: error.message };
  }
}
