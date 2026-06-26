#!/usr/bin/env node
/**
 * test-via-localStorage.mjs
 * 
 * Valida que a sessão autenticada está no browser localStorage
 * e cria um payload para AP baseado nela
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const clinicId = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📋 RESUMO DO TESTE E2E DE RATEIO');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('ETAPAS A EXECUTAR VIA BROWSER AUTENTICADO:\n');

  console.log('1️⃣  CRIAR REGRA PERCENT 70/30');
  console.log('   Navegue para: http://localhost:3000/clinica/financeiro/centro-custos');
  console.log('   Clique em: Botão "Rateio Automático"');
  console.log('   Preencha:\n');
  console.log('     • Centro origem: 6 - ADMINISTRATIVO');
  console.log('     • Método: Percentual (deve estar selecionado)');
  console.log('     • Destino 1: 7 - TECNOLOGIA, 70%');
  console.log('     • Destino 2: 8 - OPERACOES, 30%');
  console.log('   Clique: Salvar\n');

  console.log('2️⃣  CRIAR AP DE TESTE');
  console.log('   Navegue para: http://localhost:3000/clinica/financeiro/contas-pagar/nova');
  console.log('   Preencha:\n');
  console.log('     • Fornecedor: TESTE RATEIO PERCENT');
  console.log('     • Descrição: Teste 70/30 rateio automático');
  console.log('     • Valor: 1000');
  console.log('     • Centro Custo: 6 - ADMINISTRATIVO');
  console.log('     • Vencimento: hoje ou próximo dia útil');
  console.log('   Clique: Criar\n');

  console.log('3️⃣  VALIDAR NO SUBMENU LANÇAMENTOS');
  console.log('   Navegue para: http://localhost:3000/clinica/financeiro/lancamentos');
  console.log('   Procure pela AP "TESTE RATEIO PERCENT"');
  console.log('   Valide:\n');
  console.log('     ✓ 2 linhas criadas (não 1 inteira)');
  console.log('     ✓ Valores: R$ 700 (70%) e R$ 300 (30%)');
  console.log('     ✓ Centros: TECNOLOGIA e OPERACOES');
  console.log('     ✓ origin_id iguais (rastreabilidade)\n');

  // Check if rule might already exist
  const { data: existing } = await supabase
    .from('financial_cost_center_allocations')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('is_active', true);

  console.log('───────────────────────────────────────────────────────────');
  console.log('STATUS DO BANCO:');
  console.log('  Regras ativas encontradas: ' + (existing?.length || 0));

  if (existing && existing.length > 0) {
    existing.forEach((rule, idx) => {
      console.log(`  [${idx + 1}] Método: ${rule.allocation_method}, Origem: ${rule.source_cost_center_id}`);
    });
  }

  console.log('───────────────────────────────────────────────────────────');

  // Check for recent APs
  const { data: recentAPs } = await supabase
    .from('ap_bills')
    .select('id, vendor_name, amount')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (recentAPs && recentAPs.length > 0) {
    console.log('\nÚLTIMAS APs CRIADAS:');
    recentAPs.forEach((ap, idx) => {
      console.log(`  [${idx + 1}] ${ap.vendor_name}: R$ ${ap.amount}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('⚠️  LEMBRE-SE:');
  console.log('  • Regra DEVE ser salva com sucesso antes de criar AP');
  console.log('  • Após criar AP, aguarde 2-3 segundos para sync dos lançamentos');
  console.log('  • Se apenas 1 linha aparecer, a regra não foi encontrada');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main();
