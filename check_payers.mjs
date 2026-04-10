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
    // 1. Buscar TODOS os convênios (incluindo inativos e com nome NULL)
    const { data: payers, error: payersError } = await supabase
      .from('payers')
      .select('id, name, active, created_at')
      .order('created_at', { ascending: false });
    
    if (payersError) {
      console.error('\n❌ Erro ao buscar convênios:', payersError.message);
    } else {
      console.log('📋 Todos os Convênios (incluindo inativos):');
      payers?.forEach(p => {
        const status = p.active ? '✅ ATIVO' : '❌ INATIVO';
        const name = p.name || '[SEM NOME]';
        console.log(`  - ${name}: ${p.id} - ${status} - criado: ${p.created_at}`);
      });
      
      // Mostrar órfãos (sem nome)
      const orphans = payers?.filter(p => !p.name);
      if (orphans && orphans.length > 0) {
        console.log(`\n⚠️ Convênios órfãos encontrados: ${orphans.length}`);
        orphans.forEach(o => console.log(`  - ID: ${o.id} - Ativo: ${o.active}`));
      }
    }
    
    // 2. Buscar o agendamento do Bruno às 08:30
    const { data: apts, error: aptError } = await supabase
      .from('appointments')
      .select('id, patient_id, payer_id, scheduled_time, patients(name)')
      .eq('scheduled_time', '08:30')
      .limit(1);
    
    if (aptError) {
      console.error('\n❌ Erro ao buscar agendamentos:', aptError.message);
    } else if (apts && apts.length > 0) {
      const apt = apts[0];
      console.log('\n🎯 Agendamento encontrado:');
      console.log(`  - ID: ${apt.id}`);
      console.log(`  - Paciente: ${apt.patients?.name}`);
      console.log(`  - Horário: ${apt.scheduled_time}`);
      console.log(`  - Payer ID atual: ${apt.payer_id}`);
      
      // Encontrar o nome do convênio atual
      const currentPayer = payers.find(p => p.id === apt.payer_id);
      console.log(`  - Convênio atual: ${currentPayer?.name || 'NÃO ENCONTRADO'}`);
    } else {
      console.log('\n⚠️ Nenhum agendamento encontrado às 08:30');
    }
  } catch (err) {
    console.error('Erro:', err.message);
  }
})();
