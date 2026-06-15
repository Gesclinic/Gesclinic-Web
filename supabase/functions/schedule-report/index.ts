import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    if (!to || !clinic_id) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Supabase not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
        .eq("id", schedule_id)
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