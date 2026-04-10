// 🔧 Debug Sexta-feira Santa - Execute no console do navegador
// Este script verifica se Sexta-feira Santa está no banco e insere se necessário

(async () => {
  const SUPABASE_URL = 'https://xpyxvjvqtlfpsqfwomne.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXh2anZxdGxmcHNxZndvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0NzIyMzAsImV4cCI6MjA0OTA0ODIzMH0.2sLLHg2dXm5CG3Lf_2KXhLvZWLx0MnpWMhgLJItzz8M';

  console.log('🔍 [Debug] Verificando Sexta-feira Santa (2026-04-03)...');

  // Step 1: Buscar Sexta-feira Santa
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/holidays?date=eq.2026-04-03&scope=eq.NACIONAL`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        }
      }
    );

    const data = await response.json();
    console.log('📊 [Debug] Resultado:', data);

    if (data.length === 0) {
      console.log('❌ [Debug] Sexta-feira Santa NÃO encontrada! Inserindo...');

      // Step 2: Inserir Sexta-feira Santa
      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/holidays`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            date: '2026-04-03',
            name: 'Sexta-feira Santa',
            scope: 'NACIONAL',
            is_blocked: true,
            is_mandatory: true,
            clinic_id: null
          })
        }
      );

      if (insertResponse.ok) {
        console.log('✅ [Debug] Sexta-feira Santa inserida com sucesso!');
        console.log('🔄 [Debug] Recarregando página...');
        setTimeout(() => window.location.reload(), 500);
      } else {
        const err = await insertResponse.json();
        console.error('❌ [Debug] Erro ao inserir:', err);
      }
    } else {
      const holiday = data[0];
      console.log(`✅ [Debug] Sexta-feira Santa encontrada:`, {
        date: holiday.date,
        name: holiday.name,
        is_blocked: holiday.is_blocked,
        is_mandatory: holiday.is_mandatory,
      });

      // Verificar se is_mandatory está correto
      if (holiday.is_mandatory === false) {
        console.log('⚠️ [Debug] is_mandatory está FALSE - corrigindo...');
        
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/holidays?id=eq.${holiday.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              is_mandatory: true
            })
          }
        );

        if (updateResponse.ok) {
          console.log('✅ [Debug] Corrigido! Recarregando...');
          setTimeout(() => window.location.reload(), 500);
        } else {
          const err = await updateResponse.json();
          console.error('❌ [Debug] Erro ao atualizar:', err);
        }
      } else {
        console.log('✅ [Debug] Tudo correto! Se não está aparecendo, pode ser problema de cache.');
        console.log('💡 [Debug] Tente recarregar a página com Ctrl+Shift+R (hard refresh)');
      }
    }
  } catch (error) {
    console.error('❌ [Debug] Erro:', error);
  }
})();
