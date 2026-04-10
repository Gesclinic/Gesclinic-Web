// Quick test: Load Talvany's schedules and show in browser console
// Paste this in browser console while on the app

(async () => {
  const { supabase } = await import('/src/lib/customSupabaseClient.js');
  
  console.log('🔍 === CONSULTANDO TALVANY SCHEDULES ===\n');
  
  const TALVANY_ID = '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1';
  const CLINIC_ID = 'dcee437c-fd14-463c-b25e-a318f5da60b7';
  
  const { data, error } = await supabase
    .from('professional_schedules')
    .select('*')
    .eq('professional_id', TALVANY_ID)
    .eq('clinic_id', CLINIC_ID);
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.log(`📋 Total de registros: ${data.length}\n`);
  
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  
  data.forEach((s, i) => {
    console.log(`[${i}] ${dayNames[s.day_of_week]} (${s.day_of_week}): ${s.start_time}-${s.end_time}`);
    console.log(`    Pausa: ${s.break_start}-${s.break_end}`);
    console.log(`    Active: ${s.active}, Blocked: ${s.blocked}\n`);
  });
  
  // Count by day
  console.log('\n📊 RESUMO:\n');
  const byDay = {};
  data.forEach(s => {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = 0;
    byDay[s.day_of_week]++;
  });
  
  Object.keys(byDay).sort().forEach(day => {
    const name = dayNames[day];
    const count = byDay[day];
    console.log(`${name}: ${count} registro(s) ${count > 1 ? '⚠️ DUPLICATA!' : '✅'}`);
  });
})();
