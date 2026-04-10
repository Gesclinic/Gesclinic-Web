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
    console.log('🔄 Restaurando convênios...\n');
    
    // Inserir o convênio Unimed Cascavel (apenas campos que existem)
    const { data, error } = await supabase
      .from('payers')
      .insert([
        {
          code: 'CONV001',
          name: 'Unimed Cascavel - PR',
          active: true
        }
      ])
      .select();
    
    if (error) {
      console.error('❌ Erro ao inserir:', error.message);
    } else {
      console.log('✅ Convênio restaurado com sucesso!');
      console.log(data);
      
      // Verificar
      const { data: verify } = await supabase
        .from('payers')
        .select('*');
      
      console.log(`\n✓ Total na tabela agora: ${verify?.length || 0} registros`);
    }
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
})();
