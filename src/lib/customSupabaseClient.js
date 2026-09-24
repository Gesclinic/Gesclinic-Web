import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || window.__ENV__?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  window.__ENV__?.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Configuração pública do Supabase ausente.');
}

function tenantScopedFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  const companyId = localStorage.getItem('gesclinic_active_company_id');
  // This is a selection hint only. Server-side RLS must validate membership.
  if (companyId) headers.set('x-gesclinic-company-id', companyId);
  return fetch(input, { ...init, headers });
}

const supabaseClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'gesclinic-auth-token',
    flowType: 'pkce',
  },
  db: { schema: 'public' },
  global: {
    headers: { 'x-client-info': 'gesclinic-web@1.0.0' },
    fetch: tenantScopedFetch,
  },
});

export const supabase = supabaseClient;
export const customSupabaseClient = supabaseClient;
