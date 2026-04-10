import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCarnivalHolidays() {
  try {
    console.log('🎭 Deletando feriados de Carnaval antigos...');

    // Deletar registros de Carnaval de 2026
    const carnivalDates = ['2026-02-13', '2026-02-14', '2026-02-17'];
    
    const { error: deleteError, count } = await supabase
      .from('holidays')
      .delete()
      .in('date', carnivalDates);

    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
      return false;
    }

    console.log('✅ Feriados de Carnaval deletados');
    
    // Reinserir com is_mandatory: false
    const carnivalHolidays = [
      { date: '2026-02-13', name: 'Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false, clinic_id: null, state: null, city: null },
      { date: '2026-02-14', name: 'Sexta-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false, clinic_id: null, state: null, city: null },
      { date: '2026-02-17', name: 'Terça-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false, clinic_id: null, state: null, city: null },
    ];

    const { error: insertError } = await supabase
      .from('holidays')
      .insert(carnivalHolidays);

    if (insertError) {
      console.error('❌ Erro ao reinserir:', insertError);
      return false;
    }

    console.log('✅ Carnaval agora como feriado OPCIONAL!');
    console.log('Atualize a página para ver as mudanças.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

fixCarnivalHolidays();
