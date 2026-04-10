const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
  // 1. Buscar IDs dos convênios
  const { data: payers } = await supabase
    .from('payers')
    .select('id, name, active')
    .order('name');
  
  console.log('📋 Convênios:');
  payers?.forEach(p => console.log(`  - ${p.name}: ${p.id} (ativo: ${p.active})`));
  
  // 2. Buscar o agendamento do Bruno às 08:30
  const { data: apt } = await supabase
    .from('appointments')
    .select('id, patient_id, payer_id, scheduled_time, patients(name)')
    .eq('scheduled_time', '08:30')
    .single();
  
  if (apt) {
    console.log('\n🎯 Agendamento encontrado:');
    console.log(`  - ID: ${apt.id}`);
    console.log(`  - Paciente: ${apt.patients?.name}`);
    console.log(`  - Horário: ${apt.scheduled_time}`);
    console.log(`  - Payer ID atual: ${apt.payer_id}`);
    
    // Encontrar o nome do convênio atual
    const currentPayer = payers.find(p => p.id === apt.payer_id);
    console.log(`  - Convênio atual: ${currentPayer?.name || 'NÃO ENCONTRADO'}`);
  }
  
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
