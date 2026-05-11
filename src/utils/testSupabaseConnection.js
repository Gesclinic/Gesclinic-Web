import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    const { data, error } = await supabase.from('clinics').select('id').limit(1)
    
    if (error) {
      console.error('Supabase Error:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Connection successful:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Connection error:', err)
    return { success: false, error: err.message }
  }
}

export default testConnection
