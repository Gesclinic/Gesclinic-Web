import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import Stripe from "https://esm.sh/stripe@13.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateCheckoutRequest {
  planId: string;
  planSlug: string;
  priceId: string; // Stripe Price ID from stripe-products.js
  productId: string; // Stripe Product ID
  billingCycle: "monthly" | "annual";
  clinicName: string;
  clinicId?: string; // For existing clinics
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
    const payload: CreateCheckoutRequest = await req.json();
    const { planId, planSlug, priceId, productId, billingCycle, clinicName, clinicId } = payload;

    // Validate required fields
    if (!planId || !planSlug || !priceId || !productId || !billingCycle || !clinicName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Get plan details (optional - for metadata/logging)
    const { data: planData } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    // Create Stripe customer
    const customer = await stripe.customers.create({
      name: clinicName,
      metadata: {
        clinic_id: clinicId || "new",
        plan_id: planId,
        plan_slug: planSlug,
      },
    });

    // Create checkout session using Stripe Price ID directly
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription", // Always use subscription mode for recurring billing
      customer: customer.id,
      line_items: [
        {
          price: priceId, // Use the actual Stripe Price ID
          quantity: 1,
        },
      ],
      success_url: `https://localhost:3001/payment-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://localhost:3001/checkout?cancelled=true`,
      metadata: {
        clinic_id: clinicId || "new",
        plan_id: planId,
        plan_slug: planSlug,
        billing_cycle: billingCycle,
      },
    });

    // Return checkout session
    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        stripe_customer_id: customer.id,
        checkout_url: session.url,
      }),
      {
        status: 200,
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
