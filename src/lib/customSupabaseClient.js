// src/lib/customSupabaseClient.js

// ===================================================================
// 🔐 PASSO 1: CRIAR CLIENTE SUPABASE CORRETO COM SESSION PERSISTENCE
// ===================================================================

import { createBrowserClient } from '@supabase/ssr';
import { getStoredSession } from '@/lib/tenantContext';

function getActiveTenantHeaders() {
  if (typeof localStorage === 'undefined') {
    return {};
  }

  const session = getStoredSession();
  const companyId =
    localStorage.getItem('gesclinic_active_company_id') ||
    session?.company_id ||
    session?.clinic_id;
  const tenantId = session?.tenant_id;
  const branchId = session?.branch_id;
  const clinicId = session?.clinic_id || companyId;
  const userId = session?.user_id;

  return Object.fromEntries(
    Object.entries({
      'x-gesclinic-user-id': userId,
      'x-gesclinic-tenant-id': tenantId,
      'x-gesclinic-company-id': companyId,
      'x-gesclinic-branch-id': branchId,
      'x-gesclinic-clinic-id': clinicId,
    }).filter(([, value]) => Boolean(value)),
  );
}

function tenantScopedFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  const tenantHeaders = getActiveTenantHeaders();

  Object.entries(tenantHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return fetch(input, { ...init, headers });
}

// DEBUG: Logar URL e chave do Supabase client ao inicializar
console.log('[DEBUG Supabase] URL:', import.meta.env.VITE_SUPABASE_URL);
console.log(
  '[DEBUG Supabase] ANON KEY (primeiros 10 chars):',
  (import.meta.env.VITE_SUPABASE_ANON_KEY || '').slice(0, 10),
);

// ===================================================================
// 🔐 CARREGA VARIÁVEIS DE AMBIENTE COM FALLBACK
// ===================================================================
// Tenta múltiplas formas de carregar as variáveis para garantir compatibilidade com Vite
const loadEnvVar = (varName) => {
  // Método 1: import.meta.env (Vite)
  const viteValue = import.meta.env[varName];
  if (viteValue) {
    console.log(`✓ ${varName} carregado via import.meta.env`);
    return viteValue;
  }

  // Método 2: window.__ENV__ (fallback para casos especiais)
  if (typeof window !== 'undefined' && window.__ENV__?.[varName]) {
    console.log(`✓ ${varName} carregado via window.__ENV__`);
    return window.__ENV__[varName];
  }

  console.warn(`⚠️ ${varName} não encontrado em nenhuma fonte`);
  return undefined;
};

const SUPABASE_URL = loadEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = loadEnvVar('VITE_SUPABASE_ANON_KEY');

// 🔍 DEBUG COMPLETO: Mostra estado das variáveis
console.log('🔍 [Supabase Client] Variáveis de Ambiente Carregadas:', {
  VITE_SUPABASE_URL: SUPABASE_URL ? '✓ Carregado' : '❌ Não carregado',
  VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '✓ Carregado' : '❌ Não carregado',
  URL_VALUE: SUPABASE_URL || 'undefined',
  KEY_PREFIX: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 50) + '...' : 'undefined',
});

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERRO CRÍTICO: Credenciais do Supabase não configuradas!');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✓ Configurado' : '✗ Não configurado');
  console.error(
    'VITE_SUPABASE_ANON_KEY:',
    SUPABASE_ANON_KEY ? '✓ Configurado' : '✗ Não configurado',
  );
  console.error('💡 Solução: Verifique o arquivo .env ou .env.local na raiz do projeto');
  throw new Error('Credenciais do Supabase não encontradas. Verifique o arquivo .env');
}

// ===================================================================
// 🧩 SINGLETON DO SUPABASE COM createBrowserClient
// ===================================================================
let supabaseClient = globalThis.__GESCLINIC_SUPABASE;

if (!supabaseClient) {
  console.log('🚀 Criando nova instância do Supabase Client com createBrowserClient...');
  console.log('📍 URL:', SUPABASE_URL);
  console.log('🔑 API Key (primeiros 50 chars):', SUPABASE_ANON_KEY.substring(0, 50) + '...');

  // PASSO 2: Usar createBrowserClient do @supabase/ssr com persistência de sessão
  supabaseClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // PASSO 2: Garantir persistência de sessão
    auth: {
      persistSession: true, // ✅ Persistir sessão no localStorage
      autoRefreshToken: true, // ✅ Auto-refresh de token expirado
      detectSessionInUrl: true, // ✅ Detectar sessão na URL
      storageKey: 'gesclinic-auth-token',
      flowType: 'pkce', // ✅ PKCE flow para segurança extra
    },
    db: { schema: 'public' },
    global: {
      headers: {
        'x-client-info': 'gesclinic-web@1.0.0',
      },
      fetch: tenantScopedFetch,
    },
  });

  console.log('✅ Supabase Client criado com sucesso usando createBrowserClient!');
  console.log('⚠️ Verificando se o cliente foi inicializado corretamente...');

  // Teste: Tenta fazer uma chamada simples para diagnosticar
  supabaseClient
    .from('clinics')
    .select('count', { count: 'exact' })
    .limit(1)
    .then(() => {
      console.log('✅ Teste de conexão passou - Client está funcionando!');
    })
    .catch((err) => {
      console.error('❌ Teste de conexão falhou:', err.message);
      console.error('Erro completo:', err);
    });

  globalThis.__GESCLINIC_SUPABASE = supabaseClient;
} else {
  console.log('♻️  Reutilizando instância existente do Supabase Client');
}

// ===================================================================
// 🔁 EXPORTA SEMPRE A MESMA INSTÂNCIA
// ===================================================================
export const supabase = supabaseClient;
export const customSupabaseClient = supabaseClient;

// Log de inicialização
console.log('✓ Supabase client inicializado com sucesso');
console.log('URL:', SUPABASE_URL);
console.log('🔍 localStorage disponível:', typeof localStorage !== 'undefined');
console.log('🔍 Tokens no localStorage:', {
  'gesclinic-auth-token': localStorage?.getItem('gesclinic-auth-token')
    ? '✓ Existe'
    : '❌ Não existe',
  'sb-gvdkdjyupktlflwurike-auth-token': localStorage?.getItem('sb-gvdkdjyupktlflwurike-auth-token')
    ? '✓ Existe'
    : '❌ Não existe',
});
