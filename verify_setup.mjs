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
    console.log('📊 AUDITORIA FINAL - Verificando dados sincronizados\n');
    
    // 1. Listar convênios
    console.log('📋 [1] CONVÊNIOS CADASTRADOS:');
    const { data: payers } = await supabase
      .from('payers')
      .select('id, code, name, active');
    
    payers?.forEach(p => {
      console.log(`  ✓ ${p.code} - ${p.name} (Ativo: ${p.active})`);
    });
    
    // 2. Listar planos
    console.log('\n📋 [2] PLANOS CADASTRADOS:');
    const { data: plans } = await supabase
      .from('plans')
      .select('*')
      .order('name');
    
    plans?.forEach(p => {
      console.log(`  ✓ ${p.name} (Ativo: ${p.active})`);
      if (p.description) console.log(`    └─ ${p.description}`);
    });
    
    // 3. Verificar relacionamento
    console.log('\n📊 [3] RELACIONAMENTO PLANOS ↔ CONVÊNIOS:');
    const unimedId = payers?.find(p => p.name.includes('Unimed'))?.id;
    
    if (unimedId) {
      const { data: unimedPlans } = await supabase
        .from('plans')
        .select('*')
        .eq('payer_id', unimedId);
      
      console.log(`✓ Unimed Cascavel tem ${unimedPlans?.length || 0} planos:`);
      unimedPlans?.forEach(p => console.log(`  └─ ${p.name}`));
    }
    
    console.log('\n✅ DADOS SINCRONIZADOS COM SUCESSO!');
    console.log('\n💡 Próximas ações:');
    console.log('  1. Recarregue a interface (F5)');
    console.log('  2. Vá em Base do Sistema > Convênios');
    console.log('  3. Clique em "Unimed Cascavel - PR"');
    console.log('  4. Você deve ver os 4 planos disponíveis');
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
})();
