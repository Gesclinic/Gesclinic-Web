import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

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

interface SyncCustomAuthRequest {
  clinicCode: string;
  username: string;
  password: string;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as SyncCustomAuthRequest;
    const clinicCode = normalizeText(body.clinicCode).toUpperCase();
    const username = normalizeText(body.username).toLowerCase();
    const password = normalizeText(body.password);

    if (!clinicCode || !username || !password) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase service role not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, clinic_code")
      .eq("clinic_code", clinicCode)
      .maybeSingle();

    if (clinicError || !clinic) {
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, username, password_hash, role, clinic_id, status")
      .eq("clinic_id", clinic.id)
      .ilike("username", username)
      .maybeSingle();

    if (userError || !user || user.status !== "ativo") {
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }

    if (user.password_hash !== btoa(password)) {
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }

    const email = normalizeText(user.email).toLowerCase();
    if (!email) {
      return jsonResponse({ error: "User email is required for Supabase Auth" }, 400);
    }

    const { data: existingById, error: getUserError } = await supabase.auth.admin.getUserById(user.id);

    if (!getUserError && existingById?.user) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          clinic_id: user.clinic_id,
          username: user.username,
          role: user.role,
        },
      });

      if (updateError) {
        console.error("Auth update error:", updateError);
        return jsonResponse({ error: "Failed to sync auth user" }, 500);
      }
    } else {
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          clinic_id: user.clinic_id,
          username: user.username,
          role: user.role,
          legacy_user_id: user.id,
        },
      });

      if (createError) {
        console.error("Auth create error:", createError);
        return jsonResponse({ error: "Failed to sync auth user" }, 500);
      }
    }

    return jsonResponse({ success: true, email, user_id: user.id, clinic_id: user.clinic_id });
  } catch (error) {
    console.error("sync-custom-auth error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});