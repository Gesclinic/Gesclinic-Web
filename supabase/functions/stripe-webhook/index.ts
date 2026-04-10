import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import Stripe from "https://esm.sh/stripe@13.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

interface StripeEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    ) as StripeEvent;

    console.log("Processing event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Record<string, unknown>;
        console.log("Checkout completed:", session);

        // Handle subscription creation for new clinics
        if (session.metadata?.clinic_id === "new") {
          // This will be handled by the initial signup flow
          // Just update the subscription with Stripe IDs
        }

        // Update subscription with Stripe details
        if (session.customer && session.subscription) {
          await supabase
            .from("clinic_subscriptions")
            .update({
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              payment_status: "active",
              status: "active",
              is_trial: false,
            })
            .eq("stripe_customer_id", session.customer);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Record<string, unknown>;
        console.log("Subscription updated:", subscription);

        const status = subscription.status === "active" ? "active" : "suspended";

        await supabase
          .from("clinic_subscriptions")
          .update({
            stripe_subscription_id: subscription.id,
            payment_status: subscription.status,
            status: status,
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Record<string, unknown>;
        console.log("Subscription deleted:", subscription);

        await supabase
          .from("clinic_subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Record<string, unknown>;
        console.log("Invoice paid:", invoice);

        // Create payment history record
        const subscription = await supabase
          .from("clinic_subscriptions")
          .select("id")
          .eq("stripe_subscription_id", invoice.subscription)
          .single();

        if (subscription.data) {
          await supabase.from("payment_history").insert({
            clinic_subscription_id: subscription.data.id,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent,
            amount: (invoice.amount_paid as number) / 100,
            currency: invoice.currency?.toUpperCase(),
            status: "succeeded",
            paid_at: new Date().toISOString(),
          });
        }

        // Create invoice record
        if (subscription.data) {
          await supabase.from("invoices").insert({
            clinic_subscription_id: subscription.data.id,
            stripe_invoice_id: invoice.id,
            invoice_number: invoice.number,
            amount: (invoice.amount_paid as number) / 100,
            currency: invoice.currency?.toUpperCase(),
            status: "paid",
            paid_at: new Date().toISOString(),
            invoice_url: invoice.hosted_invoice_url,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Record<string, unknown>;
        console.log("Invoice payment failed:", invoice);

        // Update subscription status to past_due
        await supabase
          .from("clinic_subscriptions")
          .update({
            payment_status: "past_due",
            status: "suspended",
          })
          .eq("stripe_subscription_id", invoice.subscription);

        // Create payment history record for failed payment
        const subscription = await supabase
          .from("clinic_subscriptions")
          .select("id")
          .eq("stripe_subscription_id", invoice.subscription)
          .single();

        if (subscription.data) {
          await supabase.from("payment_history").insert({
            clinic_subscription_id: subscription.data.id,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent,
            amount: (invoice.amount_due as number) / 100,
            currency: invoice.currency?.toUpperCase(),
            status: "failed",
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Record<string, unknown>;
        console.log("Charge refunded:", charge);

        // Update payment history
        await supabase
          .from("payment_history")
          .update({
            status: "refunded",
          })
          .eq("stripe_payment_intent_id", charge.payment_intent);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
