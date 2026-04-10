import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = 'https://gvdkdjyupktlflwurike.supabase.co';
const VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA';

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  }
});

(async () => {
  try {
    console.log('🧹 Limpando planso problemáticos...\n');
    
    // Deletar todos os planos
    const { count, error } = await supabase
      .from('plans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');  // Delete all
    
    if (error) {
      console.error('❌ Erro ao deletar:', error.message);
    } else {
      console.log(`✅ Deletados ${count} planos`);
    }
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
})();
