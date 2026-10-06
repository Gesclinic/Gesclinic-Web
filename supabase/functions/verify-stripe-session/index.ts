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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'Método inválido.' });
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!url || !serviceKey || !stripeKey) return reply(503, { error: 'Serviço indisponível.' });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'Não autenticado.' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return reply(401, { error: 'Não autenticado.' });

  let sessionId: string;
  try {
    const body = await req.json();
    sessionId = String(body.session_id || '');
  } catch { return reply(400, { error: 'Dados inválidos.' }); }
  if (!/^cs_(test_|live_)[a-zA-Z0-9]+$/.test(sessionId)) {
    return reply(400, { error: 'Sessão inválida.' });
  }
  const { data: profile } = await admin.from('users').select('clinic_id, status')
    .eq('id', user.id).maybeSingle();
  if (!profile?.clinic_id || (profile.status && !['ativo', 'active'].includes(profile.status))) {
    return reply(403, { error: 'Acesso negado.' });
  }

  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== profile.clinic_id ||
        session.metadata?.clinic_id !== profile.clinic_id) {
      return reply(403, { error: 'Acesso negado.' });
    }
    return reply(200, {
      paid: session.payment_status === 'paid' || session.payment_status === 'no_payment_required',
      status: session.status,
    });
  } catch {
    return reply(502, { error: 'Não foi possível verificar o pagamento.' });
  }
});
