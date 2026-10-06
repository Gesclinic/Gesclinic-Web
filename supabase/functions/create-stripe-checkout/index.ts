import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};
const reply = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers });

// Public Stripe IDs are pinned on the server; the browser cannot choose a different price.
const catalog = {
  basic: { product: 'prod_TmWgbE3Y7gn42C', monthly: 'price_1SoxdGLH381hB5ddad7o2vYa', annual: 'price_1Soxe1LH381hB5ddjFcjfm9H' },
  professional: { product: 'prod_TmWiy9Zc89RXN9', monthly: 'price_1SoxgCLH381hB5ddvwskr7Mx', annual: 'price_1SoxgkLH381hB5ddWPfsR6ry' },
  enterprise: { product: 'prod_TmWl9t75hHosdr', monthly: 'price_1Soxi2LH381hB5ddZUDZ2yXR', annual: 'price_1SoxiLLH381hB5ddLPG3yIt6' },
} as const;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'Método inválido.' });
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const appUrl = Deno.env.get('APP_URL');
  if (!url || !serviceKey || !stripeKey || !appUrl) return reply(503, { error: 'Checkout indisponível.' });
  let origin: URL;
  try {
    origin = new URL(appUrl);
    if (origin.protocol !== 'https:' && origin.hostname !== 'localhost') throw new Error();
  } catch { return reply(503, { error: 'Checkout indisponível.' }); }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'Não autenticado.' });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return reply(401, { error: 'Não autenticado.' });

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return reply(400, { error: 'Dados inválidos.' }); }
  const slug = String(payload.planSlug || '');
  const cycle = String(payload.billingCycle || '');
  if (!(slug in catalog) || !['monthly', 'annual'].includes(cycle)) {
    return reply(400, { error: 'Plano ou ciclo inválido.' });
  }
  const selected = catalog[slug as keyof typeof catalog];
  const priceId = Deno.env.get(`STRIPE_PRICE_${slug.toUpperCase()}_${cycle.toUpperCase()}`) ||
    selected[cycle as 'monthly' | 'annual'];
  const productId = Deno.env.get(`STRIPE_PRODUCT_${slug.toUpperCase()}`) || selected.product;

  const { data: profile, error: profileError } = await admin.from('users')
    .select('id, clinic_id, role, status').eq('id', user.id).maybeSingle();
  if (profileError || !profile?.clinic_id || profile.role !== 'admin' ||
      (profile.status && !['ativo', 'active'].includes(profile.status)) ||
      (payload.clinicId && payload.clinicId !== profile.clinic_id)) {
    return reply(403, { error: 'Acesso negado.' });
  }
  const { data: company, error: companyError } = await admin.from('companies').select('id')
    .eq('clinic_id', profile.clinic_id).maybeSingle();
  if (companyError) return reply(503, { error: 'Não foi possível validar o vínculo.' });
  if (company) {
    const { data: membership, error: membershipError } = await admin.from('user_companies')
      .select('role, is_active').eq('user_id', user.id).eq('company_id', company.id).maybeSingle();
    if (membershipError || !membership?.is_active || membership.role !== 'admin') {
      return reply(403, { error: 'Acesso negado.' });
    }
  }
  const { data: clinic } = await admin.from('clinics').select('id, name')
    .eq('id', profile.clinic_id).maybeSingle();
  const { data: plan } = await admin.from('subscription_plans').select('id, slug')
    .eq('slug', slug).eq('active', true).maybeSingle();
  if (!clinic || !plan || (payload.planId && payload.planId !== plan.id &&
      !(slug === 'enterprise' && payload.planId === 'enterprise-custom'))) {
    return reply(400, { error: 'Plano indisponível.' });
  }

  try {
    const stripe = new Stripe(stripeKey);
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || price.currency !== 'brl' || price.type !== 'recurring' ||
        price.recurring?.interval !== (cycle === 'annual' ? 'year' : 'month') ||
        price.product !== productId) {
      return reply(503, { error: 'Preço não configurado para este plano.' });
    }
    const customer = await stripe.customers.create({
      name: clinic.name, email: user.email,
      metadata: { clinic_id: clinic.id, plan_id: plan.id },
    });
    const successUrl = new URL('/checkout', origin);
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
    const cancelUrl = new URL('/checkout', origin);
    cancelUrl.searchParams.set('cancelled', 'true');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer: customer.id,
      line_items: [{ price: price.id, quantity: 1 }],
      client_reference_id: clinic.id,
      success_url: successUrl.toString(), cancel_url: cancelUrl.toString(),
      metadata: { clinic_id: clinic.id, plan_id: plan.id, plan_slug: slug, billing_cycle: cycle },
    });
    return reply(200, { success: true, session_id: session.id, checkout_url: session.url });
  } catch (error) {
    console.error('Stripe checkout failed:', error instanceof Error ? error.name : 'unknown');
    return reply(502, { error: 'Não foi possível iniciar o checkout.' });
  }
});
