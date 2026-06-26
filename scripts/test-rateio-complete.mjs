#!/usr/bin/env node
/**
 * test-rateio-complete.mjs
 * 
 * Teste funcional completo de rateio:
 * 1. Cria regra PERCENT 70/30 para centro 6
 * 2. Cria AP com centro origem 6 e valor 1000
 * 3. Valida split em financial_transactions (origem_id, percentuais, soma)
 * 4. Cria regra MIXED com residual
 * 5. Cria AP e valida residual + arredondamento
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const clinicId = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

function round2(v) {
  return Number(Number(v || 0).toFixed(2));
}

async function getOrCreateAllocation(sourceId, destIds, percentages, method) {
  try {
    // Find existing allocation
    const { data: existing } = await supabase
      .from('financial_cost_center_allocations')
      .select('id')
      .eq('source_cost_center_id', sourceId)
      .eq('clinic_id', clinicId)
      .limit(1);

    let allocId = null;

    if (existing && existing.length > 0) {
      allocId = existing[0].id;
      // Delete old items
      await supabase
        .from('financial_cost_center_allocation_items')
        .delete()
        .eq('allocation_id', allocId);
    } else {
      // Create new allocation
      const { data: created, error: createErr } = await supabase
        .from('financial_cost_center_allocations')
        .insert({
          clinic_id: clinicId,
          source_cost_center_id: sourceId,
          allocation_method: method,
          is_active: true,
          description: `Test ${method} allocation`,
        })
        .select()
        .single();
      if (createErr) throw createErr;
      allocId = created.id;
    }

    // Insert new items
    const items = destIds.map((destId, idx) => ({
      allocation_id: allocId,
      target_cost_center_id: destId,
      percentage: percentages?.[idx] || null,
      fixed_amount: (method === 'MIXED' && idx === 0) ? 100 : null,
    }));

    const { error: insertErr } = await supabase
      .from('financial_cost_center_allocation_items')
      .insert(items);
    if (insertErr) throw insertErr;

    return allocId;
  } catch (err) {
    console.error('Error in getOrCreateAllocation:', err.message);
    throw err;
  }
}

async function testPercentAllocation() {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 TESTE 1: RATEIO PERCENT 70/30                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Get centers
  const { data: centers } = await supabase
    .from('financial_cost_centers')
    .select('id, code, name')
    .eq('clinic_id', clinicId)
    .in('code', ['6', '7', '8']);

  const c6 = centers.find(c => c.code === '6');
  const c7 = centers.find(c => c.code === '7');
  const c8 = centers.find(c => c.code === '8');

  console.log(`✓ Centro 6 (origem): ${c6.name}`);
  console.log(`✓ Centro 7 (destino): ${c7.name}`);
  console.log(`✓ Centro 8 (destino): ${c8.name}`);

  // Create PERCENT allocation: 70% to 7, 30% to 8
  console.log('\n📋 Criando regra PERCENT 70% para 7, 30% para 8...');
  await getOrCreateAllocation(c6.id, [c7.id, c8.id], [70, 30], 'PERCENT');
  console.log('✓ Regra criada');

  // Get expense account
  const { data: acct } = await supabase
    .from('account_plans')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('type', 'DESPESA')
    .limit(1)
    .single();

  // Create AP with 1000
  const testAmount = 1000.00;
  console.log(`\n💰 Criando AP com valor R$ ${testAmount.toFixed(2)}...`);
  const { data: ap } = await supabase
    .from('ap_bills')
    .insert({
      clinic_id: clinicId,
      vendor_name: 'TESTE RATEIO PERCENT',
      description: 'Teste 70/30',
      amount: testAmount,
      due_date: new Date().toISOString().split('T')[0],
      issue_date: new Date().toISOString().split('T')[0],
      category_id: acct.id,
      cost_center_id: c6.id,
      centro_custo_id: c6.id,
      status: 'open',
    })
    .select()
    .single();
  console.log(`✓ AP criada: ${ap.id}`);

  // Wait for sync
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Query transactions
  console.log('\n📊 Consultando financial_transactions...');
  const { data: txns } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('origin_module', 'accounts_payable')
    .eq('origin_id', ap.id);

  console.log(`✓ Encontrados ${txns.length} lançamentos`);

  const total = txns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  console.log(`\n📈 Totais:`);
  console.log(`  Soma: R$ ${round2(total).toFixed(2)} (esperado R$ ${testAmount.toFixed(2)})`);

  let resultPercent = '✓';
  txns.forEach((t, i) => {
    const pct = total > 0 ? ((Number(t.amount || 0) / total) * 100) : 0;
    const expected = t.cost_center_id === c7.id ? 70 : 30;
    const match = Math.abs(pct - expected) < 1;
    console.log(`  [${i + 1}] Centro ${t.cost_center_id === c7.id ? '7' : '8'}: R$ ${round2(t.amount).toFixed(2)} (${pct.toFixed(1)}% vs ${expected}%) ${match ? '✓' : '❌'}`);
    if (!match) resultPercent = '❌';
  });

  const sumOk = Math.abs(total - testAmount) < 0.01;
  const lenOk = txns.length === 2;

  if (lenOk && sumOk && resultPercent === '✓') {
    console.log('\n✅ TESTE 1 PASSOU: Rateio PERCENT 70/30 funcionando!');
    return true;
  } else {
    console.log('\n❌ TESTE 1 FALHOU');
    return false;
  }
}

async function testMixedAllocation() {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 TESTE 2: RATEIO MIXED (Fixo + Residual)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Get centers
  const { data: centers } = await supabase
    .from('financial_cost_centers')
    .select('id, code')
    .eq('clinic_id', clinicId)
    .in('code', ['6', '7', '8']);

  const c6 = centers.find(c => c.code === '6');
  const c7 = centers.find(c => c.code === '7');
  const c8 = centers.find(c => c.code === '8');

  // Create MIXED: 100 fixo para 7, residual para 8
  console.log('\n📋 Criando regra MIXED (R$ 100 fixo para 7, residual para 8)...');
  await getOrCreateAllocation(c6.id, [c7.id, c8.id], [null, null], 'MIXED');
  console.log('✓ Regra criada');

  // Get expense account
  const { data: acct } = await supabase
    .from('account_plans')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('type', 'DESPESA')
    .limit(1)
    .single();

  // Create AP with 250 (100 fixo + 150 residual)
  const testAmount = 250.00;
  console.log(`\n💰 Criando AP com valor R$ ${testAmount.toFixed(2)}...`);
  const { data: ap } = await supabase
    .from('ap_bills')
    .insert({
      clinic_id: clinicId,
      vendor_name: 'TESTE RATEIO MIXED',
      description: 'Teste MIXED 100 fixo + residual',
      amount: testAmount,
      due_date: new Date().toISOString().split('T')[0],
      issue_date: new Date().toISOString().split('T')[0],
      category_id: acct.id,
      cost_center_id: c6.id,
      centro_custo_id: c6.id,
      status: 'open',
    })
    .select()
    .single();
  console.log(`✓ AP criada: ${ap.id}`);

  // Wait for sync
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Query transactions
  console.log('\n📊 Consultando financial_transactions...');
  const { data: txns } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('origin_module', 'accounts_payable')
    .eq('origin_id', ap.id);

  console.log(`✓ Encontrados ${txns.length} lançamentos`);

  const total = txns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  console.log(`\n📈 Totais:`);
  console.log(`  Soma: R$ ${round2(total).toFixed(2)} (esperado R$ ${testAmount.toFixed(2)})`);

  let resultMixed = '✓';
  txns.forEach((t, i) => {
    const expected = t.cost_center_id === c7.id ? 100 : 150;
    const match = Math.abs(Number(t.amount || 0) - expected) < 0.01;
    console.log(`  [${i + 1}] Centro ${t.cost_center_id === c7.id ? '7' : '8'}: R$ ${round2(t.amount).toFixed(2)} (esperado R$ ${expected}) ${match ? '✓' : '❌'}`);
    if (!match) resultMixed = '❌';
  });

  const sumOk = Math.abs(total - testAmount) < 0.01;
  const lenOk = txns.length === 2;

  if (lenOk && sumOk && resultMixed === '✓') {
    console.log('\n✅ TESTE 2 PASSOU: Rateio MIXED com residual funcionando!');
    return true;
  } else {
    console.log('\n❌ TESTE 2 FALHOU');
    return false;
  }
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 TESTE FUNCIONAL COMPLETO DE RATEIO AUTOMÁTICO');
    console.log('═══════════════════════════════════════════════════════════');

    const t1 = await testPercentAllocation();
    const t2 = await testMixedAllocation();

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 RESUMO FINAL                                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Teste PERCENT 70/30:  ${t1 ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log(`Teste MIXED Residual: ${t2 ? '✅ PASSOU' : '❌ FALHOU'}`);

    if (t1 && t2) {
      console.log('\n🎉 TODOS OS TESTES PASSARAM!\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  ALGUNS TESTES FALHARAM\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

main();
