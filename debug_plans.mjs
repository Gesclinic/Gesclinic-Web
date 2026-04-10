import { supabase } from './src/lib/customSupabaseClient.js';

async function debugPlans() {
  console.log('🔍 Iniciando debug de planos...\n');

  try {
    // 1. Verificar se a tabela 'plans' existe
    console.log('1️⃣ Buscando todos os planos da tabela...');
    const { data: allPlans, error: allPlansError } = await supabase
      .from('plans')
      .select('id, payer_id, name, code, clinic_id')
      .limit(20);

    if (allPlansError) {
      console.error('❌ Erro ao buscar planos:', allPlansError);
    } else {
      console.log('✅ Total de planos encontrados:', allPlans?.length || 0);
      if (allPlans && allPlans.length > 0) {
        console.log('Planos:');
        allPlans.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} (ID: ${p.id}, Payer: ${p.payer_id}, Code: ${p.code})`);
        });
      }
    }

    // 2. Verificar se há convênios (payers)
    console.log('\n2️⃣ Buscando todos os convênios (payers)...');
    const { data: allPayers, error: allPayersError } = await supabase
      .from('payers')
      .select('id, name, clinic_id')
      .limit(20);

    if (allPayersError) {
      console.error('❌ Erro ao buscar payers:', allPayersError);
    } else {
      console.log('✅ Total de convênios encontrados:', allPayers?.length || 0);
      if (allPayers && allPayers.length > 0) {
        console.log('Convênios:');
        allPayers.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} (ID: ${p.id})`);
        });

        // 3. Para cada payer, verificar quantos planos tem
        console.log('\n3️⃣ Testando listPlans para cada convênio...');
        for (const payer of allPayers) {
          const { data: payerPlans, error: payerPlansError } = await supabase
            .from('plans')
            .select('id, name')
            .eq('payer_id', payer.id);

          if (payerPlansError) {
            console.log(`  ❌ ${payer.name} (${payer.id}): Erro - ${payerPlansError.message}`);
          } else {
            console.log(`  ✅ ${payer.name} (${payer.id}): ${payerPlansError ? 'Erro' : payerPlans?.length || 0} planos`);
            if (payerPlans && payerPlans.length > 0) {
              payerPlans.forEach((plan) => {
                console.log(`      - ${plan.name}`);
              });
            }
          }
        }
      }
    }

    // 4. Verificar estrutura da tabela 'plans'
    console.log('\n4️⃣ Verificando estrutura da tabela plans...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('plans')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ Erro ao acessar tabela plans:', tableError);
    } else {
      console.log('✅ Tabela planes acessível');
    }

  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }

  console.log('\n✅ Debug concluído!');
}

debugPlans();
