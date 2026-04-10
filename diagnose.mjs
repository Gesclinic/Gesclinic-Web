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
    console.log('🔍 Diagnosticando banco de dados...\n');
    
    // 1. Verificar tabela payers
    console.log('📊 [1] TABELA PAYERS:');
    const { data: payers, error: payersError } = await supabase
      .from('payers')
      .select('*');
    
    if (payersError) {
      console.error('❌ Erro ao buscar:', payersError.message);
    } else {
      console.log(`    Total: ${payers?.length || 0} registros`);
      if (payers && payers.length > 0) {
        payers.forEach(p => console.log(`    - ${p.name} (ID: ${p.id})`));
      }
    }
    
    // 2. Verificar appointments com payer_id
    console.log('\n📋 [2] APPOINTMENTS COM PAYER_ID:');
    const { data: apts } = await supabase
      .from('appointments')
      .select('id, payer_id')
      .not('payer_id', 'is', null)
      .limit(10);
    
    if (apts && apts.length > 0) {
      const uniquePayerIds = new Set(apts.map(a => a.payer_id));
      console.log(`    Encontrou ${apts.length} agendamentos com payer_id`);
      console.log(`    Payer IDs únicos: ${Array.from(uniquePayerIds).join(', ')}`);
      
      // Tentar buscar esses payers
      console.log('\n🔎 [3] BUSCANDO PAYERS ÓRFÃOS (referenciados mas não na tabela):');
      const orphanIds = Array.from(uniquePayerIds);
      for (const id of orphanIds) {
        const { data: p } = await supabase
          .from('payers')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!p) {
          console.log(`    ❌ ID ${id} está referenciado mas NÃO EXISTE na tabela payers`);
        }
      }
    } else {
      console.log(`    Nenhum agendamento com payer_id encontrado`);
    }
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
})();
