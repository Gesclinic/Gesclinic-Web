import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const failure = () => new Response(JSON.stringify({ error: 'Credenciais inválidas.' }), {
  status: 401, headers,
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return failure(); }
  const clinicCode = String(body.clinicCode || '').trim().toUpperCase();
  const username = String(body.username || '').trim().toLowerCase();
  const password = body.password;
  if (!clinicCode || clinicCode.length > 64 || !username || username.length > 128 ||
      typeof password !== 'string' || !password || password.length > 1024) return failure();

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'Serviço indisponível.' }), { status: 503, headers });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const throttleKey = new TextEncoder().encode(`${clinicCode}:${username}`);
    const digest = await crypto.subtle.digest('SHA-256', throttleKey);
    const keyHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0')).join('');
    const { data: allowed, error: throttleError } = await admin.rpc(
      'gesclinic_consume_login_attempt', { p_key_hash: keyHash },
    );
    if (throttleError) {
      return new Response(JSON.stringify({ error: 'Serviço indisponível.' }), {
        status: 503, headers,
      });
    }
    if (!allowed) return failure();

    const { data: clinic } = await admin.from('clinics').select('id')
      .eq('clinic_code', clinicCode).maybeSingle();
    if (!clinic) return failure();

    const { data: profile } = await admin.from('users')
      .select('id, email, status, clinic_id')
      .eq('clinic_id', clinic.id).ilike('username', username).maybeSingle();
    if (!profile || (profile.status && !['ativo', 'active'].includes(profile.status))) {
      return failure();
    }
    const { data: company } = await admin.from('companies').select('id')
      .eq('clinic_id', clinic.id).maybeSingle();
    if (company) {
      const { data: membership } = await admin.from('user_companies')
        .select('is_active').eq('user_id', profile.id)
        .eq('company_id', company.id).maybeSingle();
      if (membership && !membership.is_active) return failure();
    }

    // Supabase Auth verifies a salted password hash and applies its configured rate limits.
    const { data, error } = await auth.auth.signInWithPassword({
      email: profile.email, password,
    });
    if (error || !data.session || data.user?.id !== profile.id) return failure();

    return new Response(JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }), { status: 200, headers });
  } catch {
    return failure();
  }
});
