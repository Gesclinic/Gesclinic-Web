/**
 * Supabase Client Factory
 * Singleton que gerencia a conexão com Supabase
 */

import { createBrowserClient } from '@supabase/ssr';
import { env, validateEnv } from '@/config/environment';

let supabaseInstance = null;

/**
 * Inicializa o cliente Supabase
 */
const initializeSupabaseClient = () => {
  // Validar variáveis de ambiente
  validateEnv();

  const client = createBrowserClient(env.supabase.url, env.supabase.anonKey, {
    auth: {
      persistSession: env.auth.persistSession,
      autoRefreshToken: env.auth.autoRefreshToken,
      detectSessionInUrl: env.auth.detectSessionInUrl,
      storageKey: env.auth.storageKey,
      flowType: 'pkce',
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'gesclinic-web/1.0.0',
      },
    },
  });

  return client;
};

/**
 * Obtém a instância do cliente Supabase (singleton)
 */
export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = initializeSupabaseClient();
  }

  return supabaseInstance;
};

/**
 * Exporta como padrão
 */
export const supabase = new Proxy(
  {},
  {
    get: (target, prop) => {
      return getSupabaseClient()[prop];
    },
  },
);

export default supabase;
