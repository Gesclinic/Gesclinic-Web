// Small wrapper to centralize supabase client usage for platform services.
import { createClient } from '@supabase/supabase-js'
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

export function createPlatformSupabaseClient() {
  if (!url || !key) {
    // return a lightweight mock client to keep tests working without env
    return { rpc: async () => ({ data: null, error: null }) }
  }
  return createClient(url, key)
}
