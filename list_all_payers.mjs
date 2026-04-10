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
    console.log('🔍 Buscando TODOS os registros da tabela payers...\n');
    
    // Query SEM filtros para ver TUDO
    const { data, error, status } = await supabase
      .from('payers')
      .select('*');
    
    if (error) {
      console.error('❌ Erro:', error.message);
      console.error('Status:', status);
      return;
    }
    
    console.log(`✅ Total de registros na tabela: ${data?.length || 0}\n`);
    
    if (data && data.length > 0) {
      data.forEach((p, idx) => {
        console.log(`[${idx + 1}] ID: ${p.id}`);
        console.log(`    Name: ${p.name || '❌ NULL/VAZIO'}`);
        console.log(`    Code: ${p.code || 'NULL'}`);
        console.log(`    Active: ${p.active}`);
        console.log(`    Created: ${p.created_at}`);
        console.log('---');
      });
    } else {
      console.log('⚠️ Tabela payers está vazia!');
    }
    
  } catch (err) {
    console.error('Erro não tratado:', err);
  }
})();
