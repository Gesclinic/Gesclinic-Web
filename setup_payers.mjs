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
    console.log('� Restaurando dados de convênios...\n');
    
    // Tentar inserir com todos os campos possíveis
    const payerData = {
      code: 'CONV001',
      name: 'Unimed Cascavel - PR',
      active: true
    };
    
    console.log('📝 Inserindo convênio:', payerData);
    
    const { data: inserted, error: insertError } = await supabase
      .from('payers')
      .insert([payerData])
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError.message);
      console.error('Detalhes:', insertError);
    } else {
      console.log('✅ Convênio inserido com sucesso!');
      console.log('   ID:', inserted[0].id);
      console.log('   Name:', inserted[0].name);
      console.log('   Active:', inserted[0].active);
    }
    
    // Verificar final
    console.log('\n📊 Verificando tabela payers:');
    const { data: final } = await supabase
      .from('payers')
      .select('*');
    
    console.log(`✓ Total de registros: ${final?.length || 0}`);
    final?.forEach(p => console.log(`  - ${p.name} (ID: ${p.id}, Ativo: ${p.active})`));
    
  } catch (err) {
    console.error('Erro não capturado:', err.message);
    console.error(err);
  }
})();
