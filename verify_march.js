// Script para verificar dados de março 2026 no Supabase
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gvdkdjyupktlflwurike.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('='.repeat(90))
  console.log('🔍 VERIFICAÇÃO DE DADOS MARÇO 2026 - GESCLINIC')
  console.log('='.repeat(90))

  const data_check = {}

  // 1. AGENDAMENTOS
  console.log('\n✅ 1. AGENDAMENTOS DE MARÇO 2026')
  console.log('-'.repeat(90))
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, scheduled_date, status, service_id')
      .gte('scheduled_date', '2026-03-01')
      .lt('scheduled_date', '2026-04-01')
    
    if (error) throw error
    
    const count = data ? data.length : 0
    data_check.appointments = count
    console.log(`   ✅ ${count} agendamentos encontrados em março`)
    if (data && data.length > 0) {
      data.slice(0, 3).forEach((apt, i) => {
        console.log(`      ${i+1}. ${apt.scheduled_date} - ${apt.status}`)
      })
    }
  } catch (e) {
    console.log(`   ❌ Erro: ${e.message}`)
    data_check.appointments = 0
  }

  // 2. PRODUÇÃO MÉDICA
  console.log('\n✅ 2. PRODUÇÃO MÉDICA (Repasse)')
  console.log('-'.repeat(90))
  try {
    const { data, error } = await supabase
      .from('medical_production')
      .select('id, valor_bruto, data_atendimento, tipo')
      .gte('data_atendimento', '2026-03-01')
      .lt('data_atendimento', '2026-04-01')
    
    if (error) throw error
    
    const count = data ? data.length : 0
    const total = data ? data.reduce((sum, p) => sum + (parseFloat(p.valor_bruto) || 0), 0) : 0
    data_check.production = count
    console.log(`   ✅ ${count} registros | Total: R$ ${total.toFixed(2)}`)
    if (data && data.length > 0) {
      data.slice(0, 3).forEach((prod, i) => {
        console.log(`      ${i+1}. ${prod.data_atendimento}: R$ ${prod.valor_bruto} (${prod.tipo})`)
      })
    }
  } catch (e) {
    console.log(`   ❌ Erro: ${e.message}`)
    data_check.production = 0
  }

  // 3. REPASSE MÉDICO
  console.log('\n✅ 3. REPASSE MÉDICO')
  console.log('-'.repeat(90))
  try {
    const { data, error } = await supabase
      .from('medical_repasse')
      .select('id, valor_profissional, valor_clinica, periodo_inicio')
      .gte('periodo_inicio', '2026-03-01')
      .lt('periodo_inicio', '2026-04-01')
    
    if (error) throw error
    
    const count = data ? data.length : 0
    const total_prof = data ? data.reduce((sum, r) => sum + (parseFloat(r.valor_profissional) || 0), 0) : 0
    const total_clinic = data ? data.reduce((sum, r) => sum + (parseFloat(r.valor_clinica) || 0), 0) : 0
    data_check.repasse = count
    console.log(`   ✅ ${count} repasses calculados`)
    console.log(`      Profissional: R$ ${total_prof.toFixed(2)}`)
    console.log(`      Clínica: R$ ${total_clinic.toFixed(2)}`)
  } catch (e) {
    console.log(`   ❌ Erro: ${e.message}`)
    data_check.repasse = 0
  }

  // 4. TRANSAÇÕES FINANCEIRAS
  console.log('\n✅ 4. TRANSAÇÕES FINANCEIRAS (DRE/Fluxo)')
  console.log('-'.repeat(90))
  try {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('id, amount, type, category')
      .gte('created_at', '2026-03-01T00:00:00')
      .lt('created_at', '2026-04-01T00:00:00')
    
    if (error) throw error
    
    const count = data ? data.length : 0
    const total = data ? data.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) : 0
    data_check.transactions = count
    console.log(`   ✅ ${count} transações | Total: R$ ${total.toFixed(2)}`)
  } catch (e) {
    console.log(`   ❌ Erro: ${e.message}`)
    data_check.transactions = 0
  }

  // 5. CONTAS A RECEBER
  console.log('\n✅ 5. CONTAS A RECEBER')
  console.log('-'.repeat(90))
  try {
    const { data, error } = await supabase
      .from('ar_receivables')
      .select('id, amount, status, due_date')
      .gte('due_date', '2026-03-01')
      .lt('due_date', '2026-04-01')
    
    if (error) throw error
    
    const count = data ? data.length : 0
    const total = data ? data.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0) : 0
    data_check.receivables = count
    console.log(`   ✅ ${count} contas a receber | Total: R$ ${total.toFixed(2)}`)
  } catch (e) {
    console.log(`   ❌ Erro: ${e.message}`)
    data_check.receivables = 0
  }

  // RESUMO FINAL
  console.log('\n' + '='.repeat(90))
  console.log('📊 RESUMO FINAL - CHECKLIST DE INTEGRAÇÃO')
  console.log('='.repeat(90))
  console.log(`\nItem`.padEnd(35) + `Status`.padEnd(15) + `Quantidade`)
  console.log('-'.repeat(90))

  const checks = [
    ['Fluxo de Caixa (Transações)', data_check.transactions || 0],
    ['Repasse Médico', data_check.repasse || 0],
    ['Produção Médica', data_check.production || 0],
    ['Contas a Receber', data_check.receivables || 0],
    ['Agendamentos', data_check.appointments || 0]
  ]

  let all_ok = true
  checks.forEach(([item, count]) => {
    const status = count > 0 ? '✅ OK' : '⚠️  VAZIO'
    if (count === 0) all_ok = false
    console.log(`${item.padEnd(35)} ${status.padEnd(15)} ${count}`)
  })

  console.log('-'.repeat(90))
  
  if (all_ok) {
    console.log('\n🎉 SUCESSO! A integração está funcionando corretamente!')
  } else {
    console.log('\n⚠️  Alguns itens não têm dados em março 2026')
  }

  console.log('='.repeat(90))
}

main().catch(console.error)
