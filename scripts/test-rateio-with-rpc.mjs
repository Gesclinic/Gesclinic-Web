#!/usr/bin/env node
/**
 * test-rateio-with-rpc.mjs
 * 
 * Teste usando RPC para criar regra sem RLS
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
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🚀 TESTE COMPLETO DE RATEIO COM RPC');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get centers
  const { data: centers } = await supabase
    .from('financial_cost_centers')
    .select('id, code, name')
    .eq('clinic_id', clinicId)
    .in('code', ['6', '7', '8']);

  const c6 = centers.find(c => c.code === '6');
  const c7 = centers.find(c => c.code === '7');
  const c8 = centers.find(c => c.code === '8');

  console.log('Centro 6: ' + c6.name);
  console.log('Centro 7: ' + c7.name);
  console.log('Centro 8: ' + c8.name + '\n');

  // Call RPC to create allocation
  console.log('📋 Criando regra PERCENT 70/30 via RPC...');
  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_test_rateio_rule', {
    p_clinic_id: clinicId,
    p_source_center_id: c6.id,
    p_method: 'PERCENT',
    p_items: JSON.stringify([
      { target_cost_center_id: c7.id, percentage: 70, fixed_amount: null },
      { target_cost_center_id: c8.id, percentage: 30, fixed_amount: null }
    ])
  });

  if (rpcError) {
    console.log('⚠️  RPC falhou (funcao pode nao existir ainda):', rpcError.message);
    console.log('  → Tentando criar regra diretamente...\n');

    // Try direct insert
    const { data: existing } = await supabase
      .from('financial_cost_center_allocations')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('source_cost_center_id', c6.id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('✓ Regra existente encontrada');
    } else {
      console.log('❌ Impossível criar regra sem RPC e sem autenticação admin');
      console.log('   Próxima abordagem: Use UI browser autenticada\n');
      process.exit(1);
    }
  } else {
    console.log('✓ Regra criada com sucesso: ' + rpcResult[0].allocation_id);
  }

  // Now test create AP - this will also fail with RLS
  console.log('\n💰 Tentando criar AP (pode falhar com RLS)...');
  const { data: acctList } = await supabase
    .from('account_plans')
    .select('id')
    .eq('clinic_id', clinicId)
    .limit(1);

  const acctId = acctList?.[0]?.id || null;
  
  const testId = 'AP-RPC-TEST-' + Date.now();
  const { data: ap, error: apErr } = await supabase
    .from('ap_bills')
    .insert({
      clinic_id: clinicId,
      vendor_name: testId,
      description: 'Teste RPC',
      amount: 1000,
      due_date: new Date().toISOString().split('T')[0],
      issue_date: new Date().toISOString().split('T')[0],
      category_id: acctId,
      cost_center_id: c6.id,
      status: 'open',
    })
    .select()
    .single();

  if (apErr) {
    console.log('❌ RLS bloqueou criação de AP');
    console.log('   Solução: Use autenticação de admin ou call via UI\n');
    process.exit(1);
  }

  console.log('✓ AP criada: ' + ap.id);
  console.log('⏳ Aguardando sync...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Verify
  const { data: txns } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('origin_module', 'accounts_payable')
    .eq('origin_id', ap.id);

  console.log('\n📊 Resultado:');
  console.log('Lançamentos:', txns?.length || 0);
  if (txns && txns.length > 0) {
    const total = txns.reduce((s, t) => s + Number(t.amount || 0), 0);
    txns.forEach((t, i) => {
      const pct = total > 0 ? ((Number(t.amount || 0) / total) * 100).toFixed(1) : 0;
      console.log(`  [${i+1}] Centro: ${t.cost_center_id}, Valor: R$ ${round2(t.amount).toFixed(2)}, %: ${pct}%`);
    });
    console.log('Total: R$ ' + round2(total).toFixed(2));
  }

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
