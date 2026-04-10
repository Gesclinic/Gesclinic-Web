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
    console.log('🔧 Restaurando dados de convênios...\n');
    
    // 1. Buscar todas as clínicas
    console.log('📍 Buscando clínicas...');
    const { data: clinics, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name');
    
    if (clinicError) {
      console.error('❌ Erro ao buscar clínicas:', clinicError.message);
      return;
    }
    
    console.log(`✓ Encontradas ${clinics?.length || 0} clínicas:`);
    clinics?.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));
    
    if (!clinics || clinics.length === 0) {
      console.error('❌ Nenhuma clínica encontrada!');
      return;
    }
    
    // 2. Usar a primeira clínica como padrão
    const clinicId = clinics[0].id;
    console.log(`\n💼 Usando clínica: ${clinics[0].name} (${clinicId})\n`);
    
    // 3. Inserir convênio com clinic_id
    const payerData = {
      clinic_id: clinicId,
      code: 'CONV001',
      name: 'Unimed Cascavel - PR',
      active: true
    };
    
    console.log('📝 Inserindo convênio...');
    const { data: inserted, error: insertError } = await supabase
      .from('payers')
      .insert([payerData])
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError.message);
      console.error('Detalhes:', insertError);
    } else {
      console.log('✅ Convênio inserido com sucesso!');
      console.log(`   ID: ${inserted[0].id}`);
      console.log(`   Name: ${inserted[0].name}`);
      console.log(`   Active: ${inserted[0].active}`);
      console.log(`   Clinic ID: ${inserted[0].clinic_id}`);
    }
    
    // 4. Verificar final
    console.log('\n📊 Verificando tabela payers na clínica:');
    const { data: final } = await supabase
      .from('payers')
      .select('*')
      .eq('clinic_id', clinicId);
    
    console.log(`✓ Total de convênios: ${final?.length || 0}`);
    final?.forEach(p => console.log(`  ✓ ${p.name} (ID: ${p.id}, Ativo: ${p.active})`));
    
  } catch (err) {
    console.error('Erro não capturado:', err.message);
  }
})();
