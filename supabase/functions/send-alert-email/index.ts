// supabase/functions/send-alert-email/index.ts
// Processa fila de emails pendentes e envia via Supabase Email API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import { authorizeClinic } from '../_shared/authorize-clinic.ts'

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Supabase client com service role para acesso total
const supabase = createClient(supabaseUrl, supabaseServiceKey)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
}

interface PendingEmail {
  id: string
  clinic_id: string
  notification_id: string
  recipient_email: string
  subject: string
  template_name: string
  alert_title: string
  alert_message: string
  severity: string
  brand_name: string
  retry_count: number
  max_retries: number
}

interface SendEmailRequest {
  id: string
  recipient: string
  subject: string
  body: string
  clinic_name: string
  severity: string
}

/**
 * Envia email usando Resend ou SendGrid
 */
async function sendEmail(emailRequest: SendEmailRequest): Promise<boolean> {
  try {
    // Construir HTML mais elaborado com branding
    const htmlBody = buildEmailHTML(emailRequest)
    
    // Tentar Resend primeiro
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (resendApiKey) {
      return await sendViaResend(resendApiKey, emailRequest, htmlBody)
    }

    // Fallback para SendGrid
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")
    if (sendgridApiKey) {
      return await sendViaSendGrid(sendgridApiKey, emailRequest, htmlBody)
    }

    console.error("No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY)")
    return false
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

/**
 * Enviar via Resend API
 */
async function sendViaResend(apiKey: string, req: SendEmailRequest, html: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "alerts@gesclinic.com",
        to: req.recipient,
        subject: req.subject,
        html: html,
        text: `Alerta: ${req.subject}`,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Resend error: ${response.status} - ${error}`)
      return false
    }

    const data = await response.json()
    console.log(`✅ Email sent via Resend: ${data.id}`)
    return true
  } catch (error) {
    console.error("Resend send error:", error)
    return false
  }
}

/**
 * Enviar via SendGrid API
 */
async function sendViaSendGrid(apiKey: string, req: SendEmailRequest, html: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: req.recipient }],
            subject: req.subject,
          },
        ],
        from: { email: "alerts@gesclinic.com" },
        content: [
          {
            type: "text/html",
            value: html,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`SendGrid error: ${response.status} - ${error}`)
      return false
    }

    console.log(`✅ Email sent via SendGrid`)
    return true
  } catch (error) {
    console.error("SendGrid send error:", error)
    return false
  }
}

/**
 * Constrói HTML do email com template e branding
 */
function buildEmailHTML(req: SendEmailRequest): string {
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
  const subject = escapeHtml(req.subject)
  const body = escapeHtml(req.body).replace(/\n/g, '<br>')
  const clinic_name = escapeHtml(req.clinic_name)
  const { severity } = req
  const severityColors: Record<string, string> = {
    CRITICAL: "#dc2626",
    HIGH: "#f97316",
    MEDIUM: "#eab308",
    LOW: "#22c55e",
  }

  const color = severityColors[severity] || "#6b7280"

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.5;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            border-bottom: 4px solid ${color};
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0 0 5px 0;
            color: ${color};
            font-size: 24px;
          }
          .clinic {
            color: #666;
            font-size: 13px;
          }
          .content {
            margin: 20px 0;
            padding: 15px;
            background: #f9fafb;
            border-left: 4px solid ${color};
          }
          .content h2 {
            margin-top: 0;
            color: #1f2937;
          }
          .content p {
            margin: 10px 0;
          }
          .footer {
            border-top: 1px solid #e5e7eb;
            margin-top: 30px;
            padding-top: 15px;
            font-size: 12px;
            color: #999;
          }
          .button {
            display: inline-block;
            background: ${color};
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            text-decoration: none;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Alerta do Sistema</h1>
            <div class="clinic">Clínica: ${clinic_name}</div>
          </div>

          <div class="content">
            ${body}
          </div>

          <p style="text-align: center;">
            <a href="${supabaseUrl}/clinica/financeiro/alerts" class="button">
              Ver Alerta no Painel
            </a>
          </p>

          <div class="footer">
            <p>Este é um email automático do Gesclinic. Por favor, não responda a este email.</p>
            <p>© 2026 Gesclinic. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Processa emails pendentes
 */
async function processPendingEmails(clinicId: string): Promise<void> {
  try {
    // Buscar emails pendentes
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("v_pending_emails")
      .select("*")
      .eq('clinic_id', clinicId)
      .limit(10)

    if (fetchError) {
      console.error("Error fetching pending emails:", fetchError)
      return
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log("No pending emails to process")
      return
    }

    // Processar cada email
    for (const email of pendingEmails as PendingEmail[]) {
      try {
        const success = await sendEmail({
          id: email.id,
          recipient: email.recipient_email,
          subject: email.subject,
          body: email.alert_message,
          clinic_name: email.brand_name,
          severity: email.severity,
        })

        if (success) {
          // Atualizar status para 'sent'
          await supabase
            .from("email_logs")
            .update({
              delivery_status: "sent",
              updated_at: new Date().toISOString(),
            })
            .eq("id", email.id).eq('clinic_id', clinicId)

          console.log(`✅ Email sent to ${email.recipient_email}`)
        } else {
          // Incrementar retry count
          const newRetryCount = email.retry_count + 1
          const nextRetry = new Date(Date.now() + 5 * 60 * 1000) // 5 minutos

          if (newRetryCount < email.max_retries) {
            await supabase
              .from("email_logs")
              .update({
                delivery_status: "failed",
                retry_count: newRetryCount,
                next_retry_at: nextRetry.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", email.id).eq('clinic_id', clinicId)

            console.log(`⚠️ Email failed, will retry. Attempt ${newRetryCount}/${email.max_retries}`)
          } else {
            // Max retries reached
            await supabase
              .from("email_logs")
              .update({
                delivery_status: "failed",
                error_message: "Max retries exceeded",
                updated_at: new Date().toISOString(),
              })
              .eq("id", email.id).eq('clinic_id', clinicId)

            console.log(`❌ Email failed permanently after ${email.max_retries} attempts`)
          }
        }
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error)
      }
    }
  } catch (error) {
    console.error("Error in processPendingEmails:", error)
  }
}

/**
 * Manipulador de requisição HTTP
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  // Verificar se é GET (health check) ou POST (trigger processing)
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", message: "Email processor running" }),
      { status: 200, headers: corsHeaders }
    )
  }

  if (req.method === "POST") {
    try {
      const body = await req.json()
      const clinicId = String(body?.clinic_id || '')
      if (!/^[0-9a-f-]{36}$/i.test(clinicId)) {
        return new Response(JSON.stringify({ error: 'Dados inválidos.' }), { status: 400, headers: corsHeaders })
      }
      const access = await authorizeClinic(req, clinicId, ['admin', 'gestor', 'financeiro'])
      if (access.status !== 200) {
        return new Response(JSON.stringify({ error: 'Acesso negado.' }), { status: access.status, headers: corsHeaders })
      }
      await processPendingEmails(clinicId)

      return new Response(
        JSON.stringify({ success: true, message: "Emails processed" }),
        { status: 200, headers: corsHeaders }
      )
    } catch (error) {
      console.error("Error:", error)
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao processar e-mails.' }),
        { status: 500, headers: corsHeaders }
      )
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders })
})
