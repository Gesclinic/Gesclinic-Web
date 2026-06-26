#!/usr/bin/env node
/**
 * test-rateio-ap-create.mjs
 * 
 * Teste simples: criar AP e validar lançamentos
 * (Regra de rateio deve ser criada manualmente via UI)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const clinicId = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

function round2(v) {
  return Number(Number(v || 0).toFixed(2));
}

async function main() {
  console.log('\n📊 TESTE: Criar AP com Centro 6 e validar lançamentos\n');

  // Get centers
  const { data: centers } = await supabase
    .from('financial_cost_centers')
    .select('id, code, name')
    .eq('clinic_id', clinicId)
    .in('code', ['6', '7', '8']);

  const c6 = centers.find(c => c.code === '6');
  const c7 = centers.find(c => c.code === '7');
  const c8 = centers.find(c => c.code === '8');

  console.log(`Centro 6: ${c6.name} (origem)`);
  console.log(`Centro 7: ${c7.name} (destino 1)`);
  console.log(`Centro 8: ${c8.name} (destino 2)\n`);

  // Get any account (category_id is often optional or can use first available)
  const { data: acctList } = await supabase
    .from('account_plans')
    .select('id, type')
    .eq('clinic_id', clinicId)
    .limit(1);

  if (!acctList || acctList.length === 0) {
    console.log('⚠️  Nenhuma conta encontrada, usando null para category_id');
    var acctId = null;
  } else {
    var acctId = acctList[0].id;
    console.log(`✓ Conta encontrada: ${acctList[0].type}`);
  }

  // Check if allocation exists
  const { data: allocCheck } = await supabase
    .from('financial_cost_center_allocations')
    .select('*, items:financial_cost_center_allocation_items(*)')
    .eq('clinic_id', clinicId)
    .eq('source_cost_center_id', c6.id)
    .eq('is_active', true);

  if (allocCheck && allocCheck.length > 0) {
    const alloc = allocCheck[0];
    console.log(`✓ Regra de rateio encontrada: ${alloc.allocation_method}`);
    alloc.items.forEach(item => {
      const destName = [c7, c8].find(c => c.id === item.target_cost_center_id)?.name || 'unknown';
      console.log(`  - ${destName}: ${item.percentage || 'fixo ' + item.fixed_amount}%`);
    });
  } else {
    console.log(`⚠️  Nenhuma regra de rateio ativa para centro 6`);
    console.log(`   → Por enquanto, AP será lançada integralmente sem split\n`);
  }

  // Create test AP
  const testAmount = 1000.00;
  const testId = 'AP-TEST-' + Date.now();
  
  console.log(`\n💰 Criando AP de teste: R$ ${testAmount.toFixed(2)}...`);
  
  const { data: ap, error: apErr } = await supabase
    .from('ap_bills')
    .insert({
      clinic_id: clinicId,
      vendor_name: testId,
      description: 'Teste de rateio automático - ' + testId,
      amount: testAmount,
      due_date: new Date().toISOString().split('T')[0],
      issue_date: new Date().toISOString().split('T')[0],
      category_id: acctId,
      cost_center_id: c6.id,
      status: 'open',
    })
    .select()
    .single();

  if (apErr) {
    console.error('❌ Erro ao criar AP:', apErr.message);
    process.exit(1);
  }

  console.log(`✓ AP criada com ID: ${ap.id}`);

  // Wait for sync
  console.log(`⏳ Aguardando sincronização (3s)...`);
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Query transactions
  console.log(`\n📊 Consultando financial_transactions...`);
  const { data: txns } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('origin_module', 'accounts_payable')
    .eq('origin_id', ap.id);

  if (!txns || txns.length === 0) {
    console.error(`❌ Nenhum lançamento encontrado!`);
    process.exit(1);
  }

  console.log(`✓ ${txns.length} lançamento(s) encontrado(s):\n`);

  const total = txns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  txns.forEach((t, idx) => {
    const destName = [c7, c8].find(c => c.id === t.cost_center_id)?.name || 'unknown';
    const pct = total > 0 ? ((Number(t.amount || 0) / total) * 100).toFixed(1) : 0;
    console.log(`  [${idx + 1}] ${destName}:`);
    console.log(`      • Valor: R$ ${round2(t.amount).toFixed(2)}`);
    console.log(`      • % do total: ${pct}%`);
    console.log(`      • origin_id: ${t.origin_id}`);
  });

  const sumOk = Math.abs(total - testAmount) < 0.01;
  console.log(`\n📈 Totais:`);
  console.log(`  Soma: R$ ${round2(total).toFixed(2)}`);
  console.log(`  Esperado: R$ ${testAmount.toFixed(2)}`);
  console.log(`  ✓ Validação: ${sumOk ? '✅ OK' : '❌ FALHA'}\n`);

  process.exit(sumOk ? 0 : 1);
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
