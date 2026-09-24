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

interface ScheduleReportRequest {
  to: string;
  recipient_name?: string;
  clinic_id: string;
  clinic_name: string;
  frequency: string;
  attach_pdf?: boolean;
  attach_excel?: boolean;
  action: "create" | "update" | "delete";
  schedule_id?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as ScheduleReportRequest;
    const { to, clinic_id, action, schedule_id } = body;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || '') ||
        !/^[0-9a-f-]{36}$/i.test(clinic_id || '') ||
        !['create', 'update', 'delete'].includes(action) ||
        (action !== 'create' && !/^[0-9a-f-]{36}$/i.test(schedule_id || ''))) {
      return jsonResponse({ error: 'Dados inválidos.' }, 400);
    }
    if (action !== 'delete' && !['daily', 'weekly', 'monthly'].includes(body.frequency)) {
      return jsonResponse({ error: 'Frequência inválida.' }, 400);
    }
    const access = await authorizeClinic(req, clinic_id, ['admin', 'gestor', 'financeiro']);
    if (access.status !== 200 || !access.admin) {
      return jsonResponse({ error: 'Acesso negado.' }, access.status);
    }
    const supabase = access.admin;

    if (action === "delete" && schedule_id) {
      const { error } = await supabase.from("email_schedules").delete().eq("id", schedule_id).eq("clinic_id", clinic_id);
      if (error) throw error;
      return jsonResponse({ success: true }, 200);
    }

    const data = {
      clinic_id,
      recipient_email: to,
      recipient_name: body.recipient_name || to,
      frequency: body.frequency || "daily",
      attach_pdf: body.attach_pdf !== false,
      attach_excel: body.attach_excel !== false,
      status: "active",
      next_run: new Date().toISOString(),
    };

    if (action === "update" && schedule_id) {
      const { data: schedule, error } = await supabase
        .from("email_schedules")
        .update(data)
        .eq("id", schedule_id).eq('clinic_id', clinic_id)
        .select();
      if (error) throw error;
      return jsonResponse({ success: true, schedule }, 200);
    } else {
      const { data: schedule, error } = await supabase
        .from("email_schedules")
        .insert(data)
        .select();
      if (error) throw error;
      return jsonResponse({ success: true, schedule }, 200);
    }
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
