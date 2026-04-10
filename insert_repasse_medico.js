import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gvdkdjyupktlflwurike.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})

const CLINIC_ID = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
const PROFESSIONAL_ID = '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1'

async function insertRepasse() {
  console.log('🚀 INSERINDO REPASSE MÉDICO...\n')

  const repasseData = {
    clinic_id: CLINIC_ID,
    professional_id: PROFESSIONAL_ID,
    periodo_inicio: '2026-03-01',
    periodo_fim: '2026-03-31',
    total_bruto: 550.00,
    total_liquido: 420.00,
    valor_profissional: 294.00,   // 70%
    valor_clinica: 126.00,         // 30%
    status: 'pendente'
  }

  try {
    const { data, error } = await supabase
      .from('medical_repasse')
      .insert([repasseData])
      .select()

    if (error) throw error
    
    console.log('✅ Repasse Médico criado com sucesso!')
    console.log(`\n📊 Dados inseridos:`)
    console.log(`   Período: 01/03/2026 - 31/03/2026`)
    console.log(`   Produção Total: R$ 550,00`)
    console.log(`   Valor Líquido: R$ 420,00`)
    console.log(`   Valor Profissional (70%): R$ 294,00`)
    console.log(`   Valor Clínica (30%): R$ 126,00`)
    console.log(`   Status: Pendente`)
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

insertRepasse().then(() => {
  console.log('\n✅ Processo concluído!')
  process.exit(0)
})
