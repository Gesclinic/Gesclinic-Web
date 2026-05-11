import { createClient } from '@supabase/supabase-js'

async function testSupabaseConnection() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY

    console.log('Testing Supabase connection...')
    console.log('URL:', url)
    console.log('Key exists:', !!key)

    if (!url || !key) {
      return 'ERROR: Variáveis de ambiente não configuradas'
    }

    const supabase = createClient(url, key)

    // Test 1: Check health
    const { data: health, error: healthError } = await supabase
      .from('clinics')
      .select('id')
      .limit(1)

    if (healthError) {
      return `Supabase Error: ${healthError.message} (Code: ${healthError.code})`
    }

    return `✅ SUCCESS: Conectado ao Supabase! Dados: ${JSON.stringify(health)}`
  } catch (err) {
    return `Exception: ${err.message}`
  }
}

export default testSupabaseConnection
