import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateClinicRequest {
  userId: string;
  clinicName: string;
  clinicCnpj: string;
  planId: string;
  adminName: string;
  adminEmail: string;
  termsAccepted: boolean;
  termsVersion?: string;
  termsUrl?: string;
  termsAcceptedAt?: string;
  userAgent?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const payload: CreateClinicRequest = await req.json();
    const {
      userId,
      clinicName,
      clinicCnpj,
      planId,
      adminName,
      adminEmail,
      termsAccepted,
      termsVersion,
      termsUrl,
      termsAcceptedAt,
      userAgent,
    } =
      payload;

    // Validate required fields
    if (!userId || !clinicName || !clinicCnpj || !planId || !adminName || !adminEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!termsAccepted) {
      return new Response(
        JSON.stringify({ error: "Terms acceptance is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const acceptedAt = termsAcceptedAt ? new Date(termsAcceptedAt) : new Date();
    if (Number.isNaN(acceptedAt.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid terms acceptance date" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // 1. Create clinic
    const { data: clinicData, error: clinicError } = await supabase
      .from("clinics")
      .insert({
        name: clinicName,
        cnpj: clinicCnpj,
        email: adminEmail,
      })
      .select()
      .single();

    if (clinicError) {
      console.error("Clinic creation error:", clinicError);
      return new Response(
        JSON.stringify({ error: "Failed to create clinic: " + clinicError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Create user in users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        id: userId,
        clinic_id: clinicData.id,
        email: adminEmail,
        name: adminName,
        role: "admin",
      })
      .select()
      .single();

    if (userError) {
      console.error("User creation error:", userError);
      // Delete clinic if user creation fails
      await supabase.from("clinics").delete().eq("id", clinicData.id);
      return new Response(
        JSON.stringify({ error: "Failed to create user: " + userError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Get plan details
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, trial_days")
      .eq("id", planId)
      .single();

    if (planError || !planData) {
      console.error("Plan error:", planError);
      // Clean up
      await supabase.from("users").delete().eq("id", userId);
      await supabase.from("clinics").delete().eq("id", clinicData.id);
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Create subscription with trial
    const trialDays = planData.trial_days || 30;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + trialDays);

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("clinic_subscriptions")
      .insert({
        clinic_id: clinicData.id,
        plan_id: planId,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        status: "trial",
        is_trial: true,
        billing_cycle: "monthly",
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error("Subscription creation error:", subscriptionError);
      // Clean up
      await supabase.from("users").delete().eq("id", userId);
      await supabase.from("clinics").delete().eq("id", clinicData.id);
      return new Response(
        JSON.stringify({
          error: "Failed to create subscription: " + subscriptionError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Record legal acceptance for the contracted terms
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const ipAddress = forwardedFor.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || null;
    const { error: acceptanceError } = await supabase
      .from("legal_acceptances")
      .insert({
        clinic_id: clinicData.id,
        user_id: userId,
        subscription_id: subscriptionData.id,
        accepted_by_name: adminName,
        accepted_by_email: adminEmail,
        document_type: "terms_of_use",
        document_version: termsVersion || "2026-07-15",
        document_url: termsUrl || "/termos-de-uso",
        accepted_at: acceptedAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent || req.headers.get("user-agent"),
        evidence: {
          plan_id: planId,
          clinic_name: clinicName,
          clinic_cnpj: clinicCnpj,
          source: "signup",
        },
      });

    if (acceptanceError) {
      console.error("Terms acceptance logging error:", acceptanceError);
      await supabase.from("clinic_subscriptions").delete().eq("id", subscriptionData.id);
      await supabase.from("users").delete().eq("id", userId);
      await supabase.from("clinics").delete().eq("id", clinicData.id);
      return new Response(
        JSON.stringify({
          error: "Failed to record terms acceptance: " + acceptanceError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        clinic_id: clinicData.id,
        user_id: userId,
        subscription_id: subscriptionData.id,
        trial_days: trialDays,
        message: "Clínica criada com sucesso! Sua conta está em período de teste.",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
