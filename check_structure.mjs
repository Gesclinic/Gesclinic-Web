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
    console.log('🔍 Analisando estrutura do banco...\n');
    
    // 1. Checar campos da tabela plans
    console.log('📋 [1] Tentando ler algum registro de plans:');
    const { data: planSample, error: planError } = await supabase
      .from('plans')
      .select('*')
      .limit(1);
    
    if (!planError && planSample && planSample.length > 0) {
      console.log('✓ Colunas de plans:');
      Object.keys(planSample[0]).forEach(k => console.log(`  - ${k}`));
    } else if (planError) {
      console.error('❌ Erro:', planError.message);
    } else {
      console.log('Tabela vazia,  tentando inserção teste...');
    }
    
    // 2. Checar se health_insurances tem relacionamento com payers
    console.log('\n📋 [2] Relacionamento entre tabelas:');
    const { data: hi } = await supabase
      .from('health_insurances')
      .select('id, name, payer_id')
      .limit(1);
    
    if (hi && hi.length > 0) {
      console.log('✓ Health Insurance sample:');
      console.log(`  IDs: ${Object.keys(hi[0]).join(', ')}`);
    }
    
    // 3. Contar registros
    console.log('\n📊 [3] Contagem de registros:');
    const { count: hiCount } = await supabase
      .from('health_insurances')
      .select('*', { count: 'exact', head: true });
    
    const { count: payersCount } = await supabase
      .from('payers')
      .select('*', { count: 'exact', head: true });
    
    const { count: plansCount } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true });
    
    console.log(`health_insurances: ${hiCount}`);
    console.log(`payers: ${payersCount}`);
    console.log(`plans: ${plansCount}`);
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
})();
