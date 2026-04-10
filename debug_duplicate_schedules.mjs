import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kkgxdqmkxqghsvmlgxrr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ3hkcW1reHFnaHN2bWxneFJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc3MDExMDAsImV4cCI6MjA0MzI3NzEwMH0.XywQNKwbE8vWLQz-w1MvDvG-G-ZKfTfjy_6cXe18CX0';

const supabase = createClient(supabaseUrl, supabaseKey);

// Talvany ID
const TALVANY_ID = '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1';
const CLINIC_ID = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

async function main() {
  try {
    console.log('\n🔍 === VERIFICANDO DUPLICATAS DE SCHEDULES ===\n');

    // Get all schedules for Talvany
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

    // Group by day_of_week
    const byDay = {};
    data.forEach(schedule => {
      if (!byDay[schedule.day_of_week]) {
        byDay[schedule.day_of_week] = [];
      }
      byDay[schedule.day_of_week].push(schedule);
    });

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

    // Show grouping
    Object.keys(byDay).sort().forEach(dayOfWeek => {
      const schedules = byDay[dayOfWeek];
      console.log(`\n📅 ${dayNames[dayOfWeek]} (day_of_week=${dayOfWeek}): ${schedules.length} registro(s)`);
      
      schedules.forEach((s, i) => {
        const breakStr = s.break_start && s.break_end ? ` (pausa: ${s.break_start}-${s.break_end})` : '';
        console.log(`   [${i}] ${s.start_time} - ${s.end_time}${breakStr}`);
        console.log(`       ID: ${s.id}`);
        console.log(`       Active: ${s.active}, Blocked: ${s.blocked}`);
      });
      
      if (schedules.length > 1) {
        console.log(`   ⚠️ DUPLICATA DETECTADA! Há ${schedules.length} registros para o mesmo dia.`);
      }
    });

    // Check for conflicting schedules (same day but different times)
    console.log('\n\n🔍 === VERIFICANDO CONFLITOS ===\n');
    let hasConflicts = false;

    Object.keys(byDay).forEach(dayOfWeek => {
      const schedules = byDay[dayOfWeek];
      if (schedules.length > 1) {
        console.log(`⚠️ ${dayNames[dayOfWeek]} tem múltiplos registros:`);
        schedules.forEach((s, i) => {
          console.log(`   [${i}] ${s.start_time}-${s.end_time}`);
        });
        hasConflicts = true;
      }
    });

    if (!hasConflicts) {
      console.log('✅ Nenhum conflito detectado. Cada dia tem apenas um registro.');
    }

    // Check if all records are active
    console.log('\n\n📌 === STATUS DOS REGISTROS ===\n');
    const activeCount = data.filter(s => s.active === true).length;
    const inactiveCount = data.filter(s => s.active === false).length;
    const blockedCount = data.filter(s => s.blocked === true).length;

    console.log(`✅ Ativos: ${activeCount}`);
    console.log(`❌ Inativos: ${inactiveCount}`);
    console.log(`🚫 Bloqueados: ${blockedCount}`);

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

main();
