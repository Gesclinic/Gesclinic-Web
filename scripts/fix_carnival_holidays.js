import { supabase } from '../src/lib/customSupabaseClient.js';

/**
 * Script para deletar os feriados de Carnaval antigos e permitir o reinsert correto
 */
async function fixCarnivalHolidays() {
  try {
    console.log('🎭 Iniciando fixação de feriados de Carnaval...');

    // Deletar registros de Carnaval de 2026
    const carnivalDates = ['2026-02-13', '2026-02-14', '2026-02-17'];
    
    const { error: deleteError } = await supabase
      .from('holidays')
      .delete()
      .in('date', carnivalDates);

    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
      return false;
    }

    console.log('✅ Feriados de Carnaval deletados com sucesso');
    
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

    console.log('✅ Feriados de Carnaval reinseriidos como OPCIONAIS (is_mandatory: false)');
    return true;
  } catch (error) {
    console.error('❌ Erro geral:', error);
    return false;
  }
}

fixCarnivalHolidays();
