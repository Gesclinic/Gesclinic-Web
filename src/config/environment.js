/**
 * Environment Configuration
 * Centraliza variáveis de ambiente com validação e fallbacks
 */

const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

// Carrega variáveis com validação
const getEnvVar = (key, defaultValue = undefined) => {
  const value = import.meta.env[key];

  if (!value && defaultValue === undefined) {
    console.warn(`⚠️ Environment variable ${key} not found`);
  }

  return value || defaultValue;
};

export const env = {
  // Supabase
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  },

  // App
  app: {
    name: 'Gesclinic Web',
    version: '1.0.0',
    isDevelopment,
    isProduction,
  },

  // API
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
  },

  // Auth
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'gesclinic-auth-token',
  },
};

// Validação crítica
export const validateEnv = () => {
  const errors = [];

  if (!env.supabase.url) {
    errors.push('VITE_SUPABASE_URL not configured');
  }

  if (!env.supabase.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY not configured');
  }

  if (errors.length > 0) {
    const message = `⚠️ Environment validation failed:\n${errors.join('\n')}`;
    console.error(message);
    if (isProduction) {
      throw new Error(message);
    }
  }

  return errors.length === 0;
};

export default env;
