/**
 * F.5: Auditoria de Taxas - Relatório Automático por Email
 * Arquivo: src/lib/auditEmailReports.js
 *
 * Gera e envia relatórios automáticos de auditoria via email
 * Inclui:
 * - Resumo semanal/mensal
 * - KPIs e tendências
 * - Anomalias detectadas
 * - Usuários mais ativos
 * - Recomendações
 */

import { supabase } from './customSupabaseClient';

/**
 * Gera relatório de auditoria para email
 */
export async function generateAuditReportForEmail(clinicId, period = 'weekly') {
  try {
    const daysBack = period === 'weekly' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch data
    const { data: logs, error } = await supabase
      .from('fee_audit_log')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('changed_at', startDate.toISOString())
      .order('changed_at', { ascending: false });

    if (error) throw error;

    // Calcular KPIs
    const kpis = calculateKPIs(logs);

    // Detectar anomalias
    const anomalies = detectAnomalies(logs);

    // Top users
    const topUsers = getTopUsers(logs, 5);

    // Trending processadores
    const topProcessors = getTopProcessors(logs, 5);

    // Gerar HTML do email
    const emailHTML = generateEmailHTML({
      period,
      daysBack,
      clinicId,
      kpis,
      anomalies,
      topUsers,
      topProcessors,
      generatedAt: new Date().toLocaleString('pt-BR'),
    });

    return {
      subject: `[Auditoria de Taxas] Relatório ${period === 'weekly' ? 'Semanal' : 'Mensal'} - ${formatDate(new Date())}`,
      html: emailHTML,
      kpis,
      anomalies,
    };
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    throw err;
  }
}

/**
 * Envia relatório por email
 */
export async function sendAuditReportEmail(clinicId, emails, period = 'weekly') {
  try {
    // Gerar relatório
    const report = await generateAuditReportForEmail(clinicId, period);

    // Enviar via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'auditoria@gesclinic.com.br',
        to: emails,
        subject: report.subject,
        html: report.html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar email: ${response.statusText}`);
    }

    const data = await response.json();

    // Log the email sent
    await logEmailSent(clinicId, emails, period, data.id);

    return data;
  } catch (err) {
    console.error('Erro ao enviar relatório:', err);
    throw err;
  }
}

/**
 * Calcula KPIs para o relatório
 */
function calculateKPIs(logs) {
  const actions = {
    creates: logs.filter((l) => l.action === 'create').length,
    updates: logs.filter((l) => l.action === 'update').length,
    deletes: logs.filter((l) => l.action === 'delete').length,
  };

  const total = logs.length;

  // Usuários únicos
  const uniqueUsers = new Set(logs.map((l) => l.changed_by)).size;

  // Processadores
  const uniqueProcessors = new Set(
    logs.map((l) => {
      const v = JSON.parse(l.new_values || '{}');
      return v.card_processor_id;
    })
  ).size;

  // Taxa de mudança
  const daysCount = logs.length > 0
    ? Math.ceil(
        (new Date(logs[0].changed_at) - new Date(logs[logs.length - 1].changed_at)) /
        (1000 * 60 * 60 * 24)
      )
    : 1;
  const changesPerDay = (total / daysCount).toFixed(1);

  return {
    totalChanges: total,
    creates: actions.creates,
    updates: actions.updates,
    deletes: actions.deletes,
    uniqueUsers,
    uniqueProcessors,
    changesPerDay,
  };
}

/**
 * Detecta anomalias
 */
function detectAnomalies(logs) {
  const anomalies = [];

  // Deletions
  const deletes = logs.filter((l) => l.action === 'delete');
  if (deletes.length > 0) {
    anomalies.push({
      type: 'deletion',
      severity: 'critical',
      message: `${deletes.length} operações DELETE foram registradas`,
    });
  }

  // Off-hours
  const offHours = logs.filter((l) => {
    const hour = parseInt(l.changed_at.substring(11, 13));
    return hour < 8 || hour > 18;
  });

  if (offHours.length > 0) {
    anomalies.push({
      type: 'off_hours',
      severity: 'warning',
      message: `${offHours.length} mudanças fora do horário comercial`,
    });
  }

  // Mass changes
  const logsPerHour = {};
  logs.forEach((l) => {
    const hour = l.changed_at.substring(0, 13);
    logsPerHour[hour] = (logsPerHour[hour] || 0) + 1;
  });

  const maxPerHour = Math.max(...Object.values(logsPerHour));
  if (maxPerHour > 20) {
    anomalies.push({
      type: 'mass_changes',
      severity: 'warning',
      message: `Atividade em massa detectada: ${maxPerHour} mudanças em 1 hora`,
    });
  }

  return anomalies;
}

/**
 * Obtém usuários mais ativos
 */
function getTopUsers(logs, limit = 5) {
  const userCounts = {};

  logs.forEach((l) => {
    const user = l.changed_by || 'Unknown';
    userCounts[user] = (userCounts[user] || 0) + 1;
  });

  return Object.entries(userCounts)
    .map(([user, count]) => ({ user: user.substring(0, 12), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Obtém processadores mais alterados
 */
function getTopProcessors(logs, limit = 5) {
  const processorCounts = {};

  logs.forEach((l) => {
    const values = JSON.parse(l.new_values || '{}');
    const processor = values.card_processor_id || 'Unknown';
    processorCounts[processor] = (processorCounts[processor] || 0) + 1;
  });

  return Object.entries(processorCounts)
    .map(([processor, count]) => ({ processor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Gera HTML do email
 */
function generateEmailHTML({
  period,
  daysBack,
  clinicId,
  kpis,
  anomalies,
  topUsers,
  topProcessors,
  generatedAt,
}) {
  const periodLabel = period === 'weekly' ? 'Semanal' : 'Mensal';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 5px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 15px 0;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 8px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }
    .kpi-label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }
    .anomaly {
      padding: 12px;
      margin-bottom: 10px;
      border-left: 3px solid #ff6b6b;
      background: #fff5f5;
      border-radius: 4px;
      font-size: 13px;
    }
    .anomaly.warning {
      border-left-color: #ffc93c;
      background: #fffbf0;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table th {
      background: #f0f0f0;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      color: #333;
    }
    .table td {
      padding: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .table tr:last-child td {
      border-bottom: none;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #e0e0e0;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 10px;
    }
    .highlight {
      font-weight: 600;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    {/* Header */}
    <div class="header">
      <h1>📊 Auditoria de Taxas</h1>
      <p>Relatório ${periodLabel}</p>
    </div>

    {/* Content */}
    <div class="content">
      {/* KPIs */}
      <div class="section">
        <h2>📈 Resumo Executivo</h2>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total de Mudanças</div>
            <div class="kpi-value">${kpis.totalChanges}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Média por Dia</div>
            <div class="kpi-value">${kpis.changesPerDay}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Usuários Ativos</div>
            <div class="kpi-value">${kpis.uniqueUsers}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Processadoras</div>
            <div class="kpi-value">${kpis.uniqueProcessors}</div>
          </div>
        </div>

        {/* Action Breakdown */}
        <div class="kpi-grid">
          <div class="kpi-card" style="border-left-color: #10b981;">
            <div class="kpi-label">Criações</div>
            <div class="kpi-value" style="color: #10b981;">${kpis.creates}</div>
          </div>
          <div class="kpi-card" style="border-left-color: #3b82f6;">
            <div class="kpi-label">Atualizações</div>
            <div class="kpi-value" style="color: #3b82f6;">${kpis.updates}</div>
          </div>
          <div class="kpi-card" style="border-left-color: #ef4444;">
            <div class="kpi-label">Deletions</div>
            <div class="kpi-value" style="color: #ef4444;">${kpis.deletes}</div>
          </div>
          <div class="kpi-card" style="border-left-color: #f59e0b;">
            <div class="kpi-label">Período</div>
            <div class="kpi-value" style="color: #f59e0b;">${daysBack}d</div>
          </div>
        </div>
      </div>

      {/* Anomalies */}
      ${
        anomalies.length > 0
          ? `
      <div class="section">
        <h2>⚠️ Anomalias Detectadas</h2>
        ${anomalies.map((a) => `<div class="anomaly ${a.severity}">${a.message}</div>`).join('')}
      </div>
      `
          : `
      <div class="section">
        <h2>✅ Status</h2>
        <p>Nenhuma anomalia detectada neste período.</p>
      </div>
      `
      }

      {/* Top Users */}
      <div class="section">
        <h2>👥 Usuários Mais Ativos</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th style="text-align: right;">Mudanças</th>
            </tr>
          </thead>
          <tbody>
            ${topUsers.map((u) => `<tr><td>${u.user}</td><td style="text-align: right;"><span class="highlight">${u.count}</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      {/* Top Processors */}
      <div class="section">
        <h2>🏦 Processadoras Mais Alteradas</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Processadora</th>
              <th style="text-align: right;">Mudanças</th>
            </tr>
          </thead>
          <tbody>
            ${topProcessors.map((p) => `<tr><td>${p.processor || '-'}</td><td style="text-align: right;"><span class="highlight">${p.count}</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <div class="section">
        <h2>💡 Recomendações</h2>
        <ul style="margin: 0; padding-left: 20px;">
          ${
            kpis.deletes > 0
              ? '<li>Revisar operações DELETE - podem indicar erros ou testes</li>'
              : ''
          }
          ${
            kpis.changesPerDay > 10
              ? '<li>Atividade elevada - considerar validação adicional</li>'
              : ''
          }
          ${
            anomalies.some((a) => a.severity === 'critical')
              ? '<li>Anomalias críticas detectadas - ação imediata recomendada</li>'
              : ''
          }
          <li>Manter auditoria atualizada para conformidade regulatória</li>
        </ul>
      </div>
    </div>

    {/* Footer */}
    <div class="footer">
      <p>
        Relatório gerado em <strong>${generatedAt}</strong>
        <br>
        <a href="https://app.gesclinic.com/clinica/financeiro/auditoria" style="color: #667eea; text-decoration: none;">
          Ver Detalhes Completos →
        </a>
      </p>
      <p style="margin: 10px 0 0 0; opacity: 0.7;">
        Clínica ID: ${clinicId}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Log email enviado
 */
async function logEmailSent(clinicId, emails, period, emailId) {
  try {
    await supabase.from('audit_email_logs').insert({
      clinic_id: clinicId,
      recipients: emails.join(','),
      period,
      email_id: emailId,
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Erro ao logar email:', err);
  }
}

/**
 * Formata data
 */
function formatDate(date) {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('pt-BR', options);
}

/**
 * Schedule email reports
 * Usar com cron job ou agendador externo
 *
 * Exemplo de configuração com cron (Linux):
 * 0 9 * * 1 curl -X POST https://api.gesclinic.com/audit/schedule-emails
 */
export async function scheduleAuditEmails(clinicId, emails, periodDays = 'weekly') {
  // Esta função seria integrada com um serviço de agendamento
  // Pode usar: Vercel Crons, AWS Lambda Events, ou Google Cloud Scheduler
  return generateAuditReportForEmail(clinicId, periodDays);
}
