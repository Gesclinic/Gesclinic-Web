import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { authorizeClinic } from '../_shared/authorize-clinic.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface SendReportRequest {
  to: string;
  clinic_id: string;
  clinic_name: string;
  report_type: string;
  attach_pdf?: boolean;
  attach_excel?: boolean;
  dashboardData?: any;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as SendReportRequest;
    const { to, clinic_id } = body;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || '') ||
        !/^[0-9a-f-]{36}$/i.test(clinic_id || '')) {
      return jsonResponse({ error: "Dados inválidos." }, 400);
    }
    const access = await authorizeClinic(req, clinic_id, ['admin', 'gestor', 'financeiro']);
    if (access.status !== 200 || !access.admin) {
      return jsonResponse({ error: 'Acesso negado.' }, access.status);
    }
    const { data: clinic, error: clinicError } = await access.admin.from('clinics')
      .select('name').eq('id', clinic_id).maybeSingle();
    if (clinicError || !clinic) return jsonResponse({ error: 'Clínica indisponível.' }, 404);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    if (!fromEmail) return jsonResponse({ error: 'Envio indisponível.' }, 503);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: `Relatório Financeiro - ${clinic.name}`,
        html: `<h1>Relatorio Financeiro</h1><p>Seu relatorio foi gerado com sucesso!</p>`,
      }),
    });

    if (!resendResponse.ok) {
      console.error('Resend status:', resendResponse.status);
      return jsonResponse({ error: 'Falha ao enviar relatório.' }, 502);
    }

    const resendData = await resendResponse.json();
    return jsonResponse({ success: true, email_id: resendData.id }, 200);
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
