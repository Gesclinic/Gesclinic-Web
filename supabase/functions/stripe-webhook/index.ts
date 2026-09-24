import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno';

const response = (status: number) => new Response(JSON.stringify({ received: status === 200 }), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

serve(async (req: Request) => {
  if (req.method !== 'POST') return response(405);
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!stripeKey || !signingSecret || !url || !serviceKey) return response(503);
  const signature = req.headers.get('stripe-signature');
  if (!signature) return response(400);
  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, signingSecret);
  } catch {
    return response(400);
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: claimError } = await db.from('stripe_webhook_events').insert({
    event_id: event.id, event_type: event.type,
  });
  if (claimError) {
    if (claimError.code === '23505') {
      const { data, error } = await db.from('stripe_webhook_events')
        .select('processed_at').eq('event_id', event.id).maybeSingle();
      return !error && data?.processed_at ? response(200) : response(503);
    }
    console.error('Stripe event ledger unavailable:', claimError.code);
    return response(503);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const clinicId = session.metadata?.clinic_id;
      const planId = session.metadata?.plan_id;
      if (!clinicId || !planId || session.client_reference_id !== clinicId ||
          typeof session.customer !== 'string' || typeof session.subscription !== 'string') {
        throw new Error('checkout_metadata_invalid');
      }
      const { data, error } = await db.from('clinic_subscriptions').update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_session_id: session.id,
        payment_status: session.payment_status === 'paid' ? 'active' : 'pending',
        status: session.payment_status === 'paid' ? 'active' : 'trial',
        is_trial: session.payment_status !== 'paid',
      }).eq('clinic_id', clinicId).eq('plan_id', planId)
        .in('status', ['trial', 'active']).select('id');
      if (error || data?.length !== 1) throw new Error('checkout_subscription_not_unique');
    } else if (event.type === 'customer.subscription.updated' ||
               event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const paymentStatus = sub.status === 'active' ? 'active' :
        sub.status === 'past_due' ? 'past_due' :
        sub.status === 'canceled' ? 'canceled' : 'pending';
      const status = sub.status === 'active' ? 'active' :
        sub.status === 'canceled' ? 'canceled' : 'suspended';
      const { data, error } = await db.from('clinic_subscriptions').update({
        payment_status: paymentStatus, status,
        ...(event.type === 'customer.subscription.deleted' ? { canceled_at: new Date().toISOString() } : {}),
      }).eq('stripe_subscription_id', sub.id).select('id');
      if (error || data?.length !== 1) throw new Error('subscription_not_found');
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      if (!stripeSubId || !invoice.id) throw new Error('invoice_subscription_missing');
      const { data: sub, error: subError } = await db.from('clinic_subscriptions')
        .select('id, clinic_id').eq('stripe_subscription_id', stripeSubId).maybeSingle();
      if (subError || !sub) throw new Error('invoice_subscription_not_found');
      const paid = event.type === 'invoice.paid';
      const amount = (paid ? invoice.amount_paid : invoice.amount_due) / 100;
      const { error: paymentError } = await db.from('payment_history').upsert({
        clinic_id: sub.clinic_id, subscription_id: sub.id,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : null,
        amount, currency: invoice.currency.toUpperCase(),
        status: paid ? 'succeeded' : 'failed',
        paid_at: paid ? new Date().toISOString() : null,
      }, { onConflict: 'stripe_invoice_id' });
      if (paymentError) throw new Error('payment_record_failed');
      if (paid) {
        const { error: invoiceError } = await db.from('invoices').upsert({
          clinic_id: sub.clinic_id, subscription_id: sub.id,
          stripe_invoice_id: invoice.id, invoice_number: invoice.number,
          amount, currency: invoice.currency.toUpperCase(), status: 'paid',
          paid_at: new Date().toISOString(), invoice_url: invoice.hosted_invoice_url,
        }, { onConflict: 'stripe_invoice_id' });
        if (invoiceError) throw new Error('invoice_record_failed');
      } else {
        const { error } = await db.from('clinic_subscriptions').update({
          payment_status: 'past_due', status: 'suspended',
        }).eq('id', sub.id);
        if (error) throw new Error('payment_status_update_failed');
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (paymentIntent) {
        const { error } = await db.from('payment_history').update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', paymentIntent);
        if (error) throw new Error('refund_record_failed');
      }
    }
    const { error: doneError } = await db.from('stripe_webhook_events')
      .update({ processed_at: new Date().toISOString() }).eq('event_id', event.id);
    if (doneError) throw new Error('event_mark_failed');
    return response(200);
  } catch (error) {
    console.error('Stripe webhook processing failed:', event.id,
      error instanceof Error ? error.message : 'unknown');
    await db.from('stripe_webhook_events').delete().eq('event_id', event.id);
    return response(503);
  }
});
