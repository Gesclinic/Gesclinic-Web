import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gvdkdjyupktlflwurike.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// IDs de teste (você gostaria de verificar se existem na clínica)
const CLINIC_ID = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
const PROFESSIONAL_ID = '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1'

async function setupTestDataMarch2026() {
  console.log('=' .repeat(90))
  console.log('🚀 CRIANDO DADOS DE TESTE PARA MARÇO 2026')
  console.log('=' .repeat(90))

  try {
    // ========================================================================
    // 1. CRIAR PRODUÇÃO MÉDICA
    // ========================================================================
    console.log('\n1️⃣  Inserindo Produção Médica...')
    
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

    const { data: prodData, error: prodError } = await supabase
      .from('medical_production')
      .insert(productionData)
      .select()

    if (prodError) throw prodError
    console.log(`   ✅ ${prodData.length} registros de produção criados`)
    console.log(`   Total: R$ ${productionData.reduce((s, p) => s + p.valor_bruto, 0).toFixed(2)}`)

    // ========================================================================
    // 2. CRIAR REPASSE MÉDICO
    // ========================================================================
    console.log('\n2️⃣  Calculando Repasse Médico...')
    
    const totalProduction = productionData.reduce((s, p) => s + p.valor_liquido, 0)
    const repasseData = {
      clinic_id: CLINIC_ID,
      professional_id: PROFESSIONAL_ID,
      periodo_inicio: '2026-03-01',
      periodo_fim: '2026-03-31',
      total_bruto: productionData.reduce((s, p) => s + p.valor_bruto, 0),
      total_liquido: totalProduction,
      valor_profissional: totalProduction * 0.70,  // 70%
      valor_clinica: totalProduction * 0.30,        // 30%
      status: 'pendente'
    }

    const { data: repData, error: repError } = await supabase
      .from('medical_repasse')
      .insert([repasseData])
      .select()

    if (repError) throw repError
    console.log(`   ✅ Repasse calculado`)
    console.log(`   Profissional: R$ ${repasseData.valor_profissional.toFixed(2)} (70%)`)
    console.log(`   Clínica: R$ ${repasseData.valor_clinica.toFixed(2)} (30%)`)

    // ========================================================================
    // 3. CRIAR TRANSAÇÕES FINANCEIRAS (Fluxo de Caixa)
    // ========================================================================
    console.log('\n3️⃣  Registrando Transações Financeiras...')
    
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
        amount: repasseData.valor_profissional,
        type: 'expense',
        category: 'payroll',
        status: 'scheduled',
        created_at: '2026-03-31T18:00:00Z',
        professional_id: PROFESSIONAL_ID
      },
      {
        clinic_id: CLINIC_ID,
        description: 'Comissão Clínica - Março 2026',
        amount: repasseData.valor_clinica,
        type: 'revenue',
        category: 'commission',
        status: 'processed',
        created_at: '2026-03-31T18:00:00Z'
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

    const { data: txnData, error: txnError } = await supabase
      .from('financial_transactions')
      .insert(transactionsData)
      .select()

    if (txnError) throw txnError
    console.log(`   ✅ ${txnData.length} transações criadas`)
    
    const totalReceita = transactionsData
      .filter(t => t.type === 'revenue')
      .reduce((s, t) => s + t.amount, 0)
    const totalDespesa = transactionsData
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const saldo = totalReceita - totalDespesa
    
    console.log(`   Receita Total: R$ ${totalReceita.toFixed(2)}`)
    console.log(`   Despesa Total: R$ ${totalDespesa.toFixed(2)}`)
    console.log(`   Saldo Fluxo: R$ ${saldo.toFixed(2)}`)

    // ========================================================================
    // 4. CRIAR CONTAS A RECEBER
    // ========================================================================
    console.log('\n4️⃣  Registrando Contas a Receber...')
    
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
      },
      {
        clinic_id: CLINIC_ID,
        description: 'Consulta Particular 05/03 (débito)',
        amount: 80.00,
        due_date: '2026-03-20',
        status: 'open'
      }
    ]

    const { data: arData, error: arError } = await supabase
      .from('ar_invoices')
      .insert(receivablesData)
      .select()

    if (arError) throw arError
    console.log(`   ✅ ${arData.length} contas a receber criadas`)
    
    const totalAR = receivablesData.reduce((s, r) => s + r.amount, 0)
    console.log(`   Total a Receber: R$ ${totalAR.toFixed(2)}`)

    // ========================================================================
    // RESUMO FINAL
    // ========================================================================
    console.log('\n' + '='.repeat(90))
    console.log('✅ DADOS DE TESTE CRIADOS COM SUCESSO!')
    console.log('='.repeat(90))
    
    console.log('\n📊 RESUMO:')
    console.log(`  • Produção Médica: ${productionData.length} registros`)
    console.log(`  • Repasse Médico: 1 período (70/30 distribuição)`)
    console.log(`  • Transações Financeiras: ${transactionsData.length} transações`)
    console.log(`  • Contas a Receber: ${receivablesData.length} contas`)
    console.log(`\n💰 FLUXO DE CAIXA MARÇO 2026:`)
    console.log(`  Receitos: R$ ${totalReceita.toFixed(2)}`)
    console.log(`  Despesas: R$ ${totalDespesa.toFixed(2)}`)
    console.log(`  Saldo: R$ ${saldo.toFixed(2)}`)

  } catch (error) {
    console.error('❌ ERRO:', error.message)
    process.exit(1)
  }
}

// Executar
setupTestDataMarch2026().then(() => {
  console.log('\n🎉 Processo concluído!')
  process.exit(0)
})
