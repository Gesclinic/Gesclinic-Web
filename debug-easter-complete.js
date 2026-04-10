// 🔧 Debug COMPLETO Sexta-feira Santa
// Cole isto no console em localhost:3000/clinica/agenda

(async () => {
  const SUPABASE_URL = 'https://xpyxvjvqtlfpsqfwomne.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXh2anZxdGxmcHNxZndvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0NzIyMzAsImV4cCI6MjA0OTA0ODIzMH0.2sLLHg2dXm5CG3Lf_2KXhLvZWLx0MnpWMhgLJItzz8M';

  console.clear();
  console.log('=' * 80);
  console.log('🔍 [DEBUG] Verificando Sexta-feira Santa (2026-04-03)');
  console.log('=' * 80);

  try {
    // 1️⃣ Buscar NO BANCO
    console.log('\n📊 PASSO 1: Buscando no banco de dados...');
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/holidays?date=eq.2026-04-03&scope=eq.NACIONAL`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        }
      }
    );

    const bankData = await response.json();
    console.log('Resultado no banco:', bankData);

    if (bankData.length === 0) {
      console.log('❌ NÃO ENCONTRADO NO BANCO! Inserindo agora...\n');
      
      // Inserir
      const insertRes = await fetch(
        `${SUPABASE_URL}/rest/v1/holidays`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
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

      const insertResult = await insertRes.json();
      console.log('✅ Inserido:', insertResult[0] || insertResult);
      
    } else {
      const holiday = bankData[0];
      console.log('✅ ENCONTRADO no banco:');
      console.log('   - date:', holiday.date);
      console.log('   - name:', holiday.name);
      console.log('   - is_blocked:', holiday.is_blocked);
      console.log('   - is_mandatory:', holiday.is_mandatory);
      console.log('   - id:', holiday.id);

      // Se é_mandatory estiver errado, corrigir
      if (holiday.is_mandatory !== true) {
        console.log('\n⚠️  is_mandatory está ERRADO! Corrigindo...');
        const updateRes = await fetch(
          `${SUPABASE_URL}/rest/v1/holidays?id=eq.${holiday.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              is_mandatory: true,
              is_blocked: true
            })
          }
        );
        
        if (updateRes.ok) {
          console.log('✅ Corrigido! Agora é_mandatory = true');
        } else {
          console.error('❌ Erro ao corrigir:', await updateRes.json());
        }
      }
    }

    // 2️⃣ Chamar checkMultipleDates() se disponível via app
    console.log('\n📊 PASSO 2: Testando checkMultipleDates()...');
    try {
      // Tenta acessar via window se app exporta
      if (window.__checkMultipleDates) {
        const result = await window.__checkMultipleDates(['2026-04-03'], null);
        console.log('checkMultipleDates retornou:', result);
      } else {
        console.log('⚠️  checkMultipleDates não acessível via window');
      }
    } catch (e) {
      console.log('⚠️  Não conseguiu chamar checkMultipleDates:', e.message);
    }

    // 3️⃣ Buscar TODOS os feriados de 2026
    console.log('\n📊 PASSO 3: Buscando TODOS os feriados nacionais de 2026...');
    const allRes = await fetch(
      `${SUPABASE_URL}/rest/v1/holidays?scope=eq.NACIONAL&date=gte.2026-01-01&date=lte.2026-12-31`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        }
      }
    );

    const allHolidays = await allRes.json();
    console.log(`Total de feriados em 2026: ${allHolidays.length}`);
    allHolidays.forEach(h => {
      console.log(`  - ${h.date}: ${h.name} (mandatory: ${h.is_mandatory})`);
    });

    console.log('\n✅ DEBUG CONCLUÍDO');
    console.log('Se Sexta-feira Santa não aparecer após isso:');
    console.log('  1. Tente recarregar com Ctrl+Shift+R (hard refresh)');
    console.log('  2. Limpe cache do navegador');
    console.log('  3. Abra DevTools e veja a aba Network/Console');

  } catch (error) {
    console.error('❌ ERRO:', error);
  }
})();
