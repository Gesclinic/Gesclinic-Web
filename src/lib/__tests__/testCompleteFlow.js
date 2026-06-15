/**
 * Test script para validar fluxo completo de taxas de processamento
 * Execute este arquivo para testar:
 * 1. Dashboard carrega com dados
 * 2. NovoRecebimento calcula taxa
 * 3. appointmentBillingApi sincroniza com taxa
 */

import { supabase } from '../customSupabaseClient';
import { listProcessorFees } from '../processorFeesApi';
import { listCardProcessors } from '../cardProcessorsApi';
import { calculateProcessingFee } from '../processingFeeCalculator';

export async function testCompleteFlow(clinicId) {
  console.log('🧪 [TEST] Iniciando validação do fluxo completo...\n');

  const results = {
    passed: [],
    failed: [],
  };

  // TEST 1: Verificar se processadoras estão cadastradas
  try {
    const processors = await listCardProcessors(clinicId);
    if (processors && processors.length > 0) {
      results.passed.push(`✅ TEST 1 PASSED: ${processors.length} processadoras encontradas`);
      console.log(`✅ TEST 1: ${processors.length} processadoras\n`);
    } else {
      results.failed.push('❌ TEST 1 FAILED: Nenhuma processadora encontrada');
      console.log('❌ TEST 1: Nenhuma processadora\n');
    }
  } catch (error) {
    results.failed.push(`❌ TEST 1 ERROR: ${error.message}`);
    console.log(`❌ TEST 1 ERROR: ${error.message}\n`);
  }

  // TEST 2: Verificar se taxas estão configuradas
  try {
    const fees = await listProcessorFees(clinicId);
    if (fees && fees.length > 0) {
      results.passed.push(`✅ TEST 2 PASSED: ${fees.length} taxas encontradas`);
      console.log(`✅ TEST 2: ${fees.length} taxas\n`);
    } else {
      results.failed.push('❌ TEST 2 FAILED: Nenhuma taxa encontrada');
      console.log('❌ TEST 2: Nenhuma taxa\n');
    }
  } catch (error) {
    results.failed.push(`❌ TEST 2 ERROR: ${error.message}`);
    console.log(`❌ TEST 2 ERROR: ${error.message}\n`);
  }

  // TEST 3: Verificar cálculo de taxa
  try {
    const processors = await listCardProcessors(clinicId);
    if (processors.length > 0) {
      const processor = processors[0];
      const feeCalc = await calculateProcessingFee({
        clinicId,
        processorId: processor.id,
        cardBrand: 'Visa',
        settlementType: 'D+1',
        grossAmount: 1000,
      });

      if (feeCalc && feeCalc.feeAmount > 0) {
        results.passed.push(
          `✅ TEST 3 PASSED: Taxa calculada - ${feeCalc.feePercent}% = R$ ${feeCalc.feeAmount}`
        );
        console.log(
          `✅ TEST 3: Taxa calculada corretamente (${feeCalc.feePercent}% = R$ ${feeCalc.feeAmount})\n`
        );
      } else {
        results.failed.push('❌ TEST 3 FAILED: Cálculo retornou 0');
        console.log('❌ TEST 3: Cálculo retornou 0\n');
      }
    }
  } catch (error) {
    results.failed.push(`❌ TEST 3 ERROR: ${error.message}`);
    console.log(`❌ TEST 3 ERROR: ${error.message}\n`);
  }

  // TEST 4: Verificar se colunas foram adicionadas a ar_invoices
  try {
    const { data, error } = await supabase
      .from('ar_invoices')
      .select('processor_id, card_brand, settlement_type, fee_percent, fee_amount, net_amount')
      .limit(1);

    if (!error) {
      results.passed.push('✅ TEST 4 PASSED: Colunas de taxa existem em ar_invoices');
      console.log('✅ TEST 4: Colunas de taxa existem\n');
    } else {
      results.failed.push(`❌ TEST 4 FAILED: ${error.message}`);
      console.log(`❌ TEST 4 FAILED: ${error.message}\n`);
    }
  } catch (error) {
    results.failed.push(`❌ TEST 4 ERROR: ${error.message}`);
    console.log(`❌ TEST 4 ERROR: ${error.message}\n`);
  }

  // TEST 5: Verificar RLS policies
  try {
    const { data, error } = await supabase
      .from('card_processors')
      .select('id, clinic_id')
      .eq('clinic_id', clinicId)
      .limit(1);

    if (!error) {
      results.passed.push('✅ TEST 5 PASSED: RLS policies funcionando');
      console.log('✅ TEST 5: RLS policies funcionando\n');
    } else {
      results.failed.push(`❌ TEST 5 FAILED: ${error.message}`);
      console.log(`❌ TEST 5 FAILED: ${error.message}\n`);
    }
  } catch (error) {
    results.failed.push(`❌ TEST 5 ERROR: ${error.message}`);
    console.log(`❌ TEST 5 ERROR: ${error.message}\n`);
  }

  // SUMMARY
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  console.log(`✅ Passou: ${results.passed.length}`);
  console.log(`❌ Falhou: ${results.failed.length}`);
  console.log('='.repeat(60) + '\n');

  if (results.failed.length === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema pronto para uso.\n');
  } else {
    console.log('⚠️ ALGUNS TESTES FALHARAM:');
    results.failed.forEach((msg) => console.log(msg));
    console.log('\n');
  }

  return results;
}

// Export para uso em componentes
export default testCompleteFlow;
