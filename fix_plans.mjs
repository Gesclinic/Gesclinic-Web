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
    console.log('🔄 Limpando e reorganizando planos...\n');
    
    // 1. Deletar todos os planos existentes
    console.log('[1/3] Deletando planos existentes...');
    const { count: deletedCount, error: deleteError } = await supabase
      .from('plans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError.message);
      console.log('     (Pode ser que a tabela já esteja vazia - ok!')
    } else {
      console.log(`✅ Deletados ${deletedCount || 0} planos`);
    }
    
    // 2. Reunir dados necessários
    console.log('\n[2/3] Coletando dados...');
    const { data: payers } = await supabase
      .from('payers')
      .select('id, name');
    
    const { data: healthInsurances } = await supabase
      .from('health_insurances')
      .select('id, name');
    
    console.log(`✅ Payers encontrados: ${payers?.length || 0}`);
    console.log(`✅ Health Insurances encontrados: ${healthInsurances?.length || 0}`);
    
    // 3. Recriar os planos com o payer_id correto
    console.log('\n[3/3] Recriando planos...');
    
    if (payers && payers.length > 0) {
      for (const payer of payers) {
        const plans = [
          { name: `${payer.name} - Plano Local`, description: 'Cobertura apenas na região de Cascavel' },
          { name: `${payer.name} - Plano Estadual`, description: 'Cobertura em todo o Paraná' },
          { name: `${payer.name} - Plano Nacional`, description: 'Cobertura em todo o Brasil' },
          { name: `${payer.name} - Plano Executivo`, description: 'Cobertura ampliada com serviços diferenciados' }
        ];
        
        const planData = plans.map(p => ({
          payer_id: payer.id,
          name: p.name,
          description: p.description,
          active: true
        }));
        
        const { data: inserted, error: insertError } = await supabase
          .from('plans')
          .insert(planData)
          .select();
        
        if (insertError) {
          console.error(`❌ Erro ao criar planos para ${payer.name}:`, insertError.message);
        } else {
          console.log(`✅ ${inserted?.length || 0} planos criados para: ${payer.name}`);
        }
      }
    }
    
    console.log('\n🎉 Finalizado! Você pode fechar este terminal e recarregar a página.');
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
})();
