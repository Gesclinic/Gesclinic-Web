import { supabase } from '@/lib/customSupabaseClient';

/**
 * Função para limpar feriados de Carnaval antigos
 * Execute no console do navegador: window._fixCarnival()
 */
export async function fixCarnivalHolidays() {
  try {
    console.log('🎭 Corrigindo feriados de Carnaval...');

    // Delete
    const { error: deleteError, count } = await supabase
      .from('holidays')
      .delete()
      .in('date', ['2026-02-13', '2026-02-14', '2026-02-17']);

    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
      return false;
    }

    console.log('✅ Deletados');

    // Insert
    const { error: insertError } = await supabase.from('holidays').insert([
      {
        date: '2026-02-13',
        name: 'Carnaval',
        scope: 'NACIONAL',
        is_blocked: false,
        is_mandatory: false,
        clinic_id: null,
      },
      {
        date: '2026-02-14',
        name: 'Sexta-feira de Carnaval',
        scope: 'NACIONAL',
        is_blocked: false,
        is_mandatory: false,
        clinic_id: null,
      },
      {
        date: '2026-02-17',
        name: 'Terça-feira de Carnaval',
        scope: 'NACIONAL',
        is_blocked: false,
        is_mandatory: false,
        clinic_id: null,
      },
    ]);

    if (insertError) {
      console.error('❌ Erro ao reinserir:', insertError);
      return false;
    }

    console.log('✅ Carnaval atualizado como OPCIONAL!');
    console.log('🔄 Recarregando página...');
    setTimeout(() => window.location.reload(), 1500);
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

// Expor globalmente para debug
if (typeof window !== 'undefined') {
  window._fixCarnival = fixCarnivalHolidays;
}
