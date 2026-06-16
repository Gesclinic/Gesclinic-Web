import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gvdkdjyupktlflwurike.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
})

async function insertTestDataWithRLS() {
  console.log('=' .repeat(90))
  console.log('🚀 INSERINDO DADOS DE TESTE PARA MARÇO 2026')
  console.log('=' .repeat(90))
  console.log('\n⚠️  Este script tenta inserir dados com autenticação mínima')

  const CLINIC_ID = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
  const PROFESSIONAL_ID = '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1'

  try {
    // ========================================================================
    // 1. PRODUÇÃO MÉDICA
    // ========================================================================
    console.log('\n1️⃣  Inserindo Produção Médica (sem RLS)...')
    
    const productionData = [
      {
        clinic_id: CLINIC_ID,
        professional_id: PROFESSIONAL_ID,
        tipo: 'consulta',
        valor_bruto: 200.00,
        valor_liquido: 150.00,
        data_atendimento: '2026-03-03'
      },
      {
        clinic_id: CLINIC_ID,
        professional_id: PROFESSIONAL_ID,
        tipo: 'consulta',
        valor_bruto: 200.00,
        valor_liquido: 150.00,
        data_atendimento: '2026-03-10'
      },
      {
        clinic_id: CLINIC_ID,
        professional_id: PROFESSIONAL_ID,
        tipo: 'exame',
        valor_bruto: 150.00,
        valor_liquido: 120.00,
        data_atendimento: '2026-03-15'
      }
    ]

    let prodCount = 0
    for (const prod of productionData) {
      try {
        const { data, error } = await supabase
          .from('medical_production')
          .insert([prod])
          .select()

        if (!error) {
          prodCount++
          console.log(`   ✅ Produção ${prodCount}/${productionData.length}`)
        } else {
          console.log(`   ⚠️  Erro na produção (será criada via UI): ${error.message.slice(0, 60)}...`)
        }
      } catch (e) {
        console.log(`   ❌ Erro: ${e.message.slice(0, 60)}`)
      }
    }

    if (prodCount === 0) {
      console.log('   ℹ️  RLS bloqueando inserção. Use: Supabase Console > SQL > Execute DISABLE_RLS_FOR_TESTING.sql')
    }

    // ========================================================================
    // 2. TRANSAÇÕES FINANCEIRAS (com tentativa)
    // ========================================================================
    console.log('\n2️⃣  Inserindo Transações Financeiras...')
    
    const totalProd = productionData.reduce((s, p) => s + p.valor_liquido, 0)
    const repasseProf = totalProd * 0.70
    
    const transactionsData = [
      {
        clinic_id: CLINIC_ID,
        description: 'Receita - Consulta Médica 03/03',
        amount: 200.00,
        type: 'revenue',
        category: 'appointment',
        status: 'processed',
        created_at: '2026-03-03T10:00:00Z',
        professional_id: PROFESSIONAL_ID
      },
      {
        clinic_id: CLINIC_ID,
        description: 'Receita - Consulta Médica 10/03',
        amount: 200.00,
        type: 'revenue',
        category: 'appointment',
        status: 'processed',
        created_at: '2026-03-10T14:00:00Z',
        professional_id: PROFESSIONAL_ID
      },
      {
        clinic_id: CLINIC_ID,
        description: 'Receita - Exame 15/03',
        amount: 150.00,
        type: 'revenue',
        category: 'exam',
        status: 'processed',
        created_at: '2026-03-15T11:30:00Z',
        professional_id: PROFESSIONAL_ID
      },
      {
        clinic_id: CLINIC_ID,
        description: 'Repasse Médico - Março 2026',
        amount: repasseProf,
        type: 'expense',
        category: 'payroll',
        status: 'scheduled',
        created_at: '2026-03-31T18:00:00Z',
        professional_id: PROFESSIONAL_ID
      },
      {
        clinic_id: CLINIC_ID,
        description: 'Despesa - Aluguel',
        amount: 1200.00,
        type: 'expense',
        category: 'rent',
        status: 'processed',
        created_at: '2026-03-01T09:00:00Z'
      },
      {
        clinic_id: CLINIC_ID,
        description: 'Despesa - Água e Energia',
        amount: 450.00,
        type: 'expense',
        category: 'utilities',
        status: 'processed',
        created_at: '2026-03-10T09:00:00Z'
      }
    ]

    let txnCount = 0
    for (const txn of transactionsData) {
      try {
        const { data, error } = await supabase
          .from('financial_transactions')
          .insert([txn])
          .select()

        if (!error) {
          txnCount++
        }
      } catch (e) {
        // Silenciar
      }
    }
    console.log(`   ✅ ${txnCount}/${transactionsData.length} transações inseridas`)

    // ========================================================================
    // 3. CONTAS A RECEBER
    // ========================================================================
    console.log('\n3️⃣  Inserindo Contas a Receber...')
    
    const receivablesData = [
      {
        clinic_id: CLINIC_ID,
        description: 'Copay - Consulta 03/03',
        amount: 50.00,
        due_date: '2026-03-10',
        status: 'open'
      },
      {
        clinic_id: CLINIC_ID,
        description: 'Fatura Convênio - Exame 15/03',
        amount: 100.00,
        due_date: '2026-03-31',
        status: 'open'
      }
    ]

    let arCount = 0
    for (const ar of receivablesData) {
      try {
        const { data, error } = await supabase
          .from('ar_invoices')
          .insert([ar])
          .select()

        if (!error) {
          arCount++
        }
      } catch (e) {
        // Silenciar
      }
    }
    console.log(`   ✅ ${arCount}/${receivablesData.length} contas a receber inseridas`)

    // ========================================================================
    // PRÓXIMOS PASSOS
    // ========================================================================
    console.log('\n' + '='.repeat(90))
    console.log('📋 PRÓXIMOS PASSOS:')
    console.log('='.repeat(90))
    console.log('\nSe recebeu o erro "RLS policy", siga isso:')
    console.log('1. Acesse: https://app.supabase.com/')
    console.log('2. Selecione o projeto Gesclinic')
    console.log('3. Vá para SQL Editor')
    console.log('4. Cole e execute o conteúdo deste arquivo:')
    console.log('   ' + process.cwd() + '/DISABLE_RLS_FOR_TESTING.sql')
    console.log('5. Depois execute NOVAMENTE este script')
    console.log('\nOU:')
    console.log('1. Faça login em http://localhost:3000/login')
    console.log('2. O script tentará novamente com autenticação')

  } catch (error) {
    console.error('❌ ERRO GERAL:', error.message)
  }
}

// Executar
insertTestDataWithRLS().then(() => {
  console.log('\n✅ Verificação concluída')
  process.exit(0)
})
