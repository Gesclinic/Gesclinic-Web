import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const { to, clinic_id, clinic_name, report_type } = body;

    if (!to || !clinic_id) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "relatorios@gesclinic.com";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: `Relatorio Financeiro - ${clinic_name}`,
        html: `<h1>Relatorio Financeiro</h1><p>Seu relatorio foi gerado com sucesso!</p>`,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error("Resend error:", error);
      let message = "Failed to send email";
      try {
        message = JSON.parse(error)?.message || message;
      } catch (_) {
        message = error || message;
      }
      return jsonResponse({ error: message }, 500);
    }

    const resendData = await resendResponse.json();
    return jsonResponse({ success: true, email_id: resendData.id }, 200);
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});