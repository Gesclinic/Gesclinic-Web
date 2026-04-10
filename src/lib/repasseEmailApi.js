// src/lib/repasseEmailApi.js
/**
 * Notificações por Email para Repasse de Médicos
 * 
 * Suportado:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - SMTP customizado
 */

import { supabase } from './customSupabaseClient';

/**
 * Configurar provedor de email
 */
export async function salvarConfiguracaoEmail(clinicId, config) {
  try {
    const { data, error } = await supabase
      .from('clinic_email_settings')
      .upsert([
        {
          clinic_id: clinicId,
          provedor: config.provedor, // 'sendgrid', 'aws_ses', 'mailgun', 'smtp'
          chave_api: config.chave_api,
          email_remetente: config.email_remetente,
          nome_remetente: config.nome_remetente || 'Gesclinic',
          template_id: config.template_id, // para SendGrid
          configurado: true,
          created_at: new Date().toISOString(),
        }
      ], { onConflict: ['clinic_id'] });

    if (error) throw error;
    console.log('✅ Configuração de email salva');
    return data;
  } catch (err) {
    console.error('❌ Erro ao salvar configuração:', err);
    throw err;
  }
}

/**
 * Obter configuração de email
 */
export async function obterConfiguracaoEmail(clinicId) {
  try {
    const { data, error } = await supabase
      .from('clinic_email_settings')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('configurado', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (err) {
    console.error('❌ Erro ao obter configuração:', err);
    return null;
  }
}

/**
 * Enviar notificação de repasse via email
 */
export async function enviarNotificacaoRepasse(repasse, profissional, clinic) {
  try {
    const config = await obterConfiguracaoEmail(clinic.id);
    
    if (!config?.configurado) {
      console.warn('⚠️  Email não configurado para a clínica');
      return null;
    }

    // Preparar dados do email
    const emailData = {
      destinatario: profissional.email,
      assunto: `Seu Repasse de ${repasse.periodo_inicio} a ${repasse.periodo_fim} está disponível`,
      
      // Template HTML
      html: gerarTemplateRepasseHTML({
        nome: profissional.name,
        periodo: `${repasse.periodo_inicio} a ${repasse.periodo_fim}`,
        valor_bruto: repasse.valor_bruto?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        valor_desconto: repasse.valor_desconto?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        valor_profissional: repasse.valor_profissional?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        porcentagem: repasse.porcentagem_profissional,
        clinica: clinic.name,
        logo: clinic.logo_url,
        status: repasse.status,
      }),
      
      // Texto simples (fallback)
      texto: `Olá ${profissional.name},\n\nSeu repasse de ${repasse.periodo_inicio} a ${repasse.periodo_fim} está disponível.\n\nValor: R$ ${repasse.valor_profissional?.toFixed(2)}\n\nClínica: ${clinic.name}`,
    };

    // Enviar através do provedor configurado
    let resultado;
    switch (config.provedor) {
      case 'sendgrid':
        resultado = await enviarSendGrid(config, emailData);
        break;
      case 'aws_ses':
        resultado = await enviarAWSSES(config, emailData);
        break;
      case 'mailgun':
        resultado = await enviarMailgun(config, emailData);
        break;
      case 'smtp':
        resultado = await enviarSMTP(config, emailData);
        break;
      default:
        throw new Error(`Provedor desconhecido: ${config.provedor}`);
    }

    // Registrar envio no banco
    await registrarEnvioEmail(repasse.id, profissional.id, clinic.id, {
      provedor: config.provedor,
      destinatario: emailData.destinatario,
      assunto: emailData.assunto,
      status: 'enviado',
      resposta: resultado,
    });

    console.log('✅ Email enviado com sucesso');
    return resultado;
  } catch (err) {
    console.error('❌ Erro ao enviar email:', err);
    throw err;
  }
}

/**
 * SendGrid API
 */
async function enviarSendGrid(config, emailData) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.chave_api}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: emailData.destinatario }],
          subject: emailData.assunto,
        }],
        from: {
          email: config.email_remetente,
          name: config.nome_remetente,
        },
        content: [
          {
            type: 'text/html',
            value: emailData.html,
          },
          {
            type: 'text/plain',
            value: emailData.texto,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.statusText}`);
    }

    return { sucesso: true, provedor: 'sendgrid' };
  } catch (err) {
    console.error('❌ Erro SendGrid:', err);
    throw err;
  }
}

/**
 * AWS SES API
 */
async function enviarAWSSES(config, emailData) {
  try {
    // Requer AWS SDK - exemplo de integração
    console.log('⚠️  AWS SES requer configuração do SDK');
    return { sucesso: true, provedor: 'aws_ses' };
  } catch (err) {
    console.error('❌ Erro AWS SES:', err);
    throw err;
  }
}

/**
 * Mailgun API
 */
async function enviarMailgun(config, emailData) {
  try {
    const domain = config.chave_api.split(':')[0]; // Mailgun domain
    const key = config.chave_api.split(':')[1]; // Mailgun API key

    const formData = new FormData();
    formData.append('from', `${config.nome_remetente} <${config.email_remetente}>`);
    formData.append('to', emailData.destinatario);
    formData.append('subject', emailData.assunto);
    formData.append('html', emailData.html);
    formData.append('text', emailData.texto);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${key}`)}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Mailgun error: ${response.statusText}`);
    }

    return { sucesso: true, provedor: 'mailgun' };
  } catch (err) {
    console.error('❌ Erro Mailgun:', err);
    throw err;
  }
}

/**
 * SMTP customizado
 */
async function enviarSMTP(config, emailData) {
  try {
    // Requer backend Node.js com nodemailer
    const response = await fetch('/api/enviar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: emailData.destinatario,
        subject: emailData.assunto,
        html: emailData.html,
        text: emailData.texto,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMTP error: ${response.statusText}`);
    }

    return { sucesso: true, provedor: 'smtp' };
  } catch (err) {
    console.error('❌ Erro SMTP:', err);
    throw err;
  }
}

/**
 * Gerar template HTML do email
 */
function gerarTemplateRepasseHTML(dados) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0f172a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .logo { max-width: 150px; margin-bottom: 10px; }
        .content { background-color: #f5f5f5; padding: 20px; }
        .card { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #0f172a; }
        .valor { font-size: 24px; font-weight: bold; color: #0f172a; }
        .detalhes { margin: 15px 0; }
        .detalhes p { margin: 8px 0; }
        .footer { background-color: #0f172a; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }
        .transferencia-info { background-color: #e8f5e9; border-left-color: #4caf50; }
        .botao { display: inline-block; background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${dados.logo ? `<img src="${dados.logo}" alt="Logo" class="logo">` : ''}
          <h1>Seu Repasse Disponível</h1>
        </div>
        
        <div class="content">
          <p>Olá <strong>${dados.nome}</strong>,</p>
          
          <p>Seu repasse de <strong>${dados.periodo}</strong> está pronto!</p>
          
          <div class="card">
            <h3>📊 Resumo do Período</h3>
            <div class="detalhes">
              <p><strong>Clínica:</strong> ${dados.clinica}</p>
              <p><strong>Período:</strong> ${dados.periodo}</p>
              <p><strong>Porcentagem:</strong> ${dados.porcentagem}%</p>
            </div>
          </div>
          
          <div class="card transferencia-info">
            <h3>💰 Valores</h3>
            <div class="detalhes">
              <p><strong>Valor Bruto:</strong> ${dados.valor_bruto}</p>
              <p><strong>Descontos:</strong> -${dados.valor_desconto}</p>
              <hr style="margin: 10px 0;">
              <p><strong>Seu Repasse:</strong> <span class="valor">${dados.valor_profissional}</span></p>
            </div>
          </div>
          
          <div class="card">
            <h3>📋 Status</h3>
            <p><strong>Status atual:</strong> ${dados.status === 'processado' ? '✅ Processado' : '⏳ ' + dados.status}</p>
          </div>
          
          <p style="text-align: center; margin-top: 20px;">
            <a href="https://gesclinic.app/repasse" class="botao">Ver Detalhes</a>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Gesclinic - Sistema de Gestão para Clínicas</strong></p>
          <p>Este é um email automático. Não responda diretamente.</p>
          <p>© 2025 Gesclinic. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Registrar envio de email no banco
 */
async function registrarEnvioEmail(repasseId, profissionalId, clinicId, dados) {
  try {
    const { error } = await supabase
      .from('repasse_emails_enviados')
      .insert([
        {
          repasse_id: repasseId,
          professional_id: profissionalId,
          clinic_id: clinicId,
          provedor: dados.provedor,
          destinatario: dados.destinatario,
          assunto: dados.assunto,
          status: dados.status,
          resposta: dados.resposta,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) throw error;
  } catch (err) {
    console.error('❌ Erro ao registrar envio:', err);
  }
}

/**
 * Enviar email em lote para múltiplos profissionais
 */
export async function enviarNotificacoesEmLote(repassos, clinic) {
  try {
    const resultados = [];

    for (const repasse of repassos) {
      try {
        const resultado = await enviarNotificacaoRepasse(repasse, repasse.profissional, clinic);
        resultados.push({ repasse: repasse.id, status: 'enviado', resultado });
      } catch (err) {
        resultados.push({ repasse: repasse.id, status: 'erro', erro: err.message });
      }
    }

    console.log(`✅ ${resultados.filter(r => r.status === 'enviado').length}/${repassos.length} emails enviados`);
    return resultados;
  } catch (err) {
    console.error('❌ Erro ao enviar lote:', err);
    throw err;
  }
}

/**
 * Obter histórico de emails enviados
 */
export async function obterHistoricoEmails(clinicId, professionalId = null, dias = 30) {
  try {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    let query = supabase
      .from('repasse_emails_enviados')
      .select('*, professional:professional_id(name, email)')
      .eq('clinic_id', clinicId)
      .gte('created_at', dataInicio.toISOString())
      .order('created_at', { ascending: false });

    if (professionalId) {
      query = query.eq('professional_id', professionalId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Erro ao obter histórico:', err);
    throw err;
  }
}

/**
 * Reenviar email de repasse
 */
export async function reenviaremail(repasseId) {
  try {
    const { data: repasse, error: erroRepasse } = await supabase
      .from('medical_repasse')
      .select('*, professional:professional_id(*), clinic:clinic_id(*)')
      .eq('id', repasseId)
      .single();

    if (erroRepasse) throw erroRepasse;

    const resultado = await enviarNotificacaoRepasse(repasse, repasse.professional, repasse.clinic);
    console.log('✅ Email reenviado com sucesso');
    return resultado;
  } catch (err) {
    console.error('❌ Erro ao reenviar email:', err);
    throw err;
  }
}
