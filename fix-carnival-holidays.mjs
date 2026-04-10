import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xpyxvjvqtlfpsqfwomne.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXh2anZxdGxmcHNxZndvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxNzcxODYsImV4cCI6MTc3MDcxMzE4Nn0.rn8Hg0U4eT3LXdPVK_8_6Uh-k8sOo_9K9LLQ9JfErMQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCarnivalHolidays() {
  try {
    console.log('🎭 Deletando feriados de Carnaval antigos...');

    // Deletar Carnaval de 2026
    const { error: deleteError } = await supabase
      .from('holidays')
      .delete()
      .in('date', ['2026-02-13', '2026-02-14', '2026-02-17']);

    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
      process.exit(1);
    }

    console.log('✅ Deletado');
    
    // Reinserir como opcional
    const { error: insertError } = await supabase
      .from('holidays')
      .insert([
        { date: '2026-02-13', name: 'Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false, clinic_id: null },
        { date: '2026-02-14', name: 'Sexta-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false, clinic_id: null },
        { date: '2026-02-17', name: 'Terça-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false, clinic_id: null },
      ]);

    if (insertError) {
      console.error('❌ Erro ao reinserir:', insertError);
      process.exit(1);
    }

    console.log('✅ Carnaval atualizado como feriado OPCIONAL!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

fixCarnivalHolidays();
