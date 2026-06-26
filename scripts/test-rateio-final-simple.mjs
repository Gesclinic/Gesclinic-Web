#!/usr/bin/env node
/**
 * test-rateio-final-simple.mjs
 * 
 * Teste functional final do rateio:
 * 1. Cria AP com centro origem 6
 * 2. Consulta financial_transactions com origin_id
 * 3. Valida split rows por percentual 70/30
 * 
 * Execução: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/test-rateio-final-simple.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('\n🧪 TESTE FINAL RATEIO - PERCENT 70/30\n');

  // Clinic hardcoded from session
  const clinicId = 'dcee437c-fd14-463c-b25e-a318f5da60b7';
  const testAmount = 1000.00;

  console.log(`📋 Clínica: ${clinicId}`);
  console.log(`💰 Valor teste: R$ ${testAmount.toFixed(2)}`);

  // Get cost center 6
  const { data: centers } = await supabase
    .from('financial_cost_centers')
    .select('id, code, name')
    .eq('clinic_id', clinicId)
    .eq('code', '6')
    .single();

  if (!centers) {
    console.error('❌ Centro de Custos 6 não encontrado');
    return;
  }
  console.log(`✓ Centro origem (6): ${centers.name} (${centers.id})`);

  // Get allocation for center 6
  const { data: allocation } = await supabase
    .from('financial_cost_center_allocations')
    .select('*, items:financial_cost_center_allocation_items(*)')
    .eq('clinic_id', clinicId)
    .eq('source_cost_center_id', centers.id)
    .eq('is_active', true)
    .single();

  if (!allocation || !allocation.items || allocation.items.length === 0) {
    console.error('❌ Nenhuma regra de rateio ativa para centro 6');
    return;
  }
  console.log(`✓ Regra rateio encontrada: ${allocation.allocation_method} com ${allocation.items.length} destinos`);
  allocation.items.forEach(item => {
    console.log(`  - ${item.target_cost_center_id}: ${item.percentage}%`);
  });

  // Get chart account (expense)
  const { data: accounts } = await supabase
    .from('account_plans')
    .select('id, code, name')
    .eq('clinic_id', clinicId)
    .eq('type', 'DESPESA')
    .eq('parent_id', null)
    .limit(1)
    .single();

  if (!accounts) {
    console.error('❌ Conta de despesa não encontrada');
    return;
  }
  console.log(`✓ Conta de despesa: ${accounts.name}`);

  // Create AP
  console.log('\n📝 Criando AP de teste...');
  const { data: apData, error: apError } = await supabase
    .from('ap_bills')
    .insert({
      clinic_id: clinicId,
      vendor_name: 'TESTE RATEIO FINAL',
      description: 'Teste de rateio PERCENT 70/30',
      amount: testAmount,
      due_date: new Date().toISOString().split('T')[0],
      issue_date: new Date().toISOString().split('T')[0],
      category_id: accounts.id,
      cost_center_id: centers.id,
      centro_custo_id: centers.id,
      status: 'open',
    })
    .select()
    .single();

  if (apError) {
    console.error('❌ Erro ao criar AP:', apError.message);
    return;
  }
  console.log(`✓ AP criada: ${apData.id}`);

  // Wait for sync
  console.log('\n⏳ Aguardando sincronização de lançamentos (3s)...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Query financial_transactions
  console.log('\n📊 Consultando financial_transactions...');
  const { data: transactions, error: txError } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('origin_module', 'accounts_payable')
    .eq('origin_id', apData.id);

  if (txError) {
    console.error('❌ Erro ao consultar lançamentos:', txError.message);
    return;
  }

  if (!transactions || transactions.length === 0) {
    console.error('❌ Nenhum lançamento encontrado para origin_id:', apData.id);
    return;
  }

  console.log(`✓ Encontrados ${transactions.length} lançamentos`);
  const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  console.log(`  Total: R$ ${totalAmount.toFixed(2)} (esperado: R$ ${testAmount.toFixed(2)})`);

  transactions.forEach((tx, idx) => {
    const center = allocation.items.find(item => item.target_cost_center_id === tx.cost_center_id);
    const expectedPercent = center?.percentage || 0;
    const actualPercent = totalAmount > 0 ? (Number(tx.amount || 0) / totalAmount * 100).toFixed(2) : 0;
    console.log(`  [${idx + 1}] ${tx.cost_center_id}: R$ ${Number(tx.amount || 0).toFixed(2)} (${actualPercent}% vs esperado ${expectedPercent}%)`);
  });

  // Validation
  console.log('\n🔍 VALIDAÇÃO FINAL:');
  const matched70 = transactions.find(tx => {
    const pct = totalAmount > 0 ? (Number(tx.amount || 0) / totalAmount * 100) : 0;
    return Math.abs(pct - 70) < 1; // within 1%
  });
  const matched30 = transactions.find(tx => {
    const pct = totalAmount > 0 ? (Number(tx.amount || 0) / totalAmount * 100) : 0;
    return Math.abs(pct - 30) < 1;
  });

  if (matched70 && matched30 && Math.abs(totalAmount - testAmount) < 0.01) {
    console.log('✅ SUCESSO: Rateio PERCENT 70/30 aplicado corretamente!');
  } else {
    console.error('❌ FALHA: Rateio não correspondeu ao esperado');
  }
}

main().catch(console.error);
