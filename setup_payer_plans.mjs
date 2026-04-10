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
    console.log('📋 Configurando planos de convênios...\n');
    
    // 1. Buscar o Unimed Cascavel
    console.log('🔍 Buscando Unimed Cascavel...');
    const { data: payers } = await supabase
      .from('payers')
      .select('id, name')
      .eq('name', 'Unimed Cascavel - PR')
      .single();
    
    if (!payers) {
      console.error('❌ Unimed Cascavel não encontrada!');
      return;
    }
    
    console.log(`✓ Encontrado: ${payers.name} (ID: ${payers.id})\n`);
    
    // 2. Tentar inserir planos na tabela payer_plans
    console.log('📝 Inserindo planos do convênio...');
    
    const plans = [
      { name: 'Plano Local', description: 'Cobertura apenas na região de Cascavel' },
      { name: 'Plano Estadual', description: 'Cobertura em todo o Paraná' },
      { name: 'Plano Nacional', description: 'Cobertura em todo o Brasil' },
      { name: 'Plano Executivo', description: 'Plano com cobertura ampliada e serviços diferenciados' }
    ];
    
    const planData = plans.map(p => ({
      payer_id: payers.id,
      name: `Unimed - ${p.name}`,
      description: p.description,
      active: true
    }));
    
    console.log('Tentando inserir em payer_plans...');
    const { data: inserted, error: insertError } = await supabase
      .from('payer_plans')
      .insert(planData)
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir em payer_plans:', insertError.message);
      
      // Tentar outras tabelas possíveis
      console.log('\n🔍 Procurando tabela de planos alternativa...');
      
      const alternatives = ['plans', 'healthcare_plans', 'payment_plans'];
      
      for (const table of alternatives) {
        console.log(`\n  Tentando tabela: ${table}`);
        const { data: test, error: testErr } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!testErr) {
          console.log(`  ✓ Tabela ${table} encontrada!`);
          
          // Tentar inserir nesta tabela
          const planDataAlt = planData.map(p => ({
            ...p,
            payer_id: payers.id
          }));
          
          const { data: alt, error: altErr } = await supabase
            .from(table)
            .insert(planDataAlt)
            .select();
          
          if (!altErr) {
            console.log(`  ✅ Planos inseridos em ${table}!`);
            alt?.forEach(p => console.log(`    ✓ ${p.name}`));
            return;
          }
        }
      }
      
      // Se nenhuma tabela funcionou, criar na tabela payer_plans mesmo (pode precisar de migração)
      console.log('\n⚠️ Nenhuma tabela de planos encontrada.');
      console.log('Você precisará criar a tabela payer_plans no Supabase com esta estrutura:');
      console.log(`
CREATE TABLE payer_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
      `);
      
    } else {
      console.log('\n✅ Planos inseridos com sucesso!');
      inserted?.forEach(p => console.log(`  ✓ ${p.name}`));
      
      // Verificar final
      console.log('\n📊 Verificando planos cadastrados:');
      const { data: verify } = await supabase
        .from('payer_plans')
        .select('*')
        .eq('payer_id', payers.id);
      
      console.log(`Total de planos: ${verify?.length || 0}`);
      verify?.forEach(p => console.log(`  ✓ ${p.name} (Ativo: ${p.active})`));
    }
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
})();
