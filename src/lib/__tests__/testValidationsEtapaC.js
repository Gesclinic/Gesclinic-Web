/**
 * ====================================================================
 * TESTES: Validações de Processador de Cartão - ETAPA C
 * ====================================================================
 * Validação de que o sistema previne dados inválidos, duplicatas e inconsistências
 * Execute em: browser console OU Node.js environment
 */

import {
  validateProcessorFee,
  checkDuplicateFee,
  validateFeeRateReasonableness,
} from '@/lib/processorFeeValidations';

/**
 * Teste 1: Validar que valores fora do range (0-100%) são rejeitados
 */
export async function testFeeRangeValidation() {
  console.log('\n✅ TESTE 1: Validação de Range (0-100%)');
  console.log('─'.repeat(60));

  // Taxa válida
  const valid = validateProcessorFee({
    processorId: '123e4567-e89b-12d3-a456-426614174000',
    cardBrand: 'Visa',
    settlementType: 'D+1',
    feePercent: 2.5,
  });
  console.log('  Taxa válida (2.5%):', valid.isValid ? '✅ PASS' : '❌ FAIL');
  if (!valid.isValid) console.log('    Erros:', valid.errors);

  // Taxa negativa (inválida)
  const negative = validateProcessorFee({
    processorId: '123e4567-e89b-12d3-a456-426614174000',
    cardBrand: 'Visa',
    settlementType: 'D+1',
    feePercent: -1,
  });
  console.log('  Taxa negativa (-1%):', !negative.isValid ? '✅ PASS' : '❌ FAIL');
  if (!negative.isValid) console.log('    Erros:', negative.errors[0]);

  // Taxa acima de 100% (inválida)
  const tooHigh = validateProcessorFee({
    processorId: '123e4567-e89b-12d3-a456-426614174000',
    cardBrand: 'Visa',
    settlementType: 'D+1',
    feePercent: 150,
  });
  console.log('  Taxa muito alta (150%):', !tooHigh.isValid ? '✅ PASS' : '❌ FAIL');
  if (!tooHigh.isValid) console.log('    Erros:', tooHigh.errors[0]);

  // Taxa null (inválida)
  const nullFee = validateProcessorFee({
    processorId: '123e4567-e89b-12d3-a456-426614174000',
    cardBrand: 'Visa',
    settlementType: 'D+1',
    feePercent: null,
  });
  console.log('  Taxa null:', !nullFee.isValid ? '✅ PASS' : '❌ FAIL');
  if (!nullFee.isValid) console.log('    Erros:', nullFee.errors[0]);
}

/**
 * Teste 2: Validar que taxa suspeita gera aviso (>5% ou <0.1%)
 */
export async function testSuspiciousFeeWarning() {
  console.log('\n✅ TESTE 2: Aviso de Taxa Suspeita');
  console.log('─'.repeat(60));

  // Taxa normal (2.5%)
  const normal = validateFeeRateReasonableness(2.5);
  console.log('  Taxa normal (2.5%):', normal.length === 0 ? '✅ PASS' : '❌ FAIL');

  // Taxa alta (7%)
  const high = validateFeeRateReasonableness(7);
  console.log('  Taxa alta (7%):', high.length > 0 ? '✅ PASS (aviso gerado)' : '❌ FAIL');
  if (high.length > 0) console.log('    Aviso:', high[0]);

  // Taxa muito alta (12%)
  const veryHigh = validateFeeRateReasonableness(12);
  console.log('  Taxa muito alta (12%):', veryHigh.length > 0 ? '✅ PASS (aviso gerado)' : '❌ FAIL');
  if (veryHigh.length > 0) console.log('    Aviso:', veryHigh[0]);

  // Taxa muito baixa (0.05%)
  const veryLow = validateFeeRateReasonableness(0.05);
  console.log('  Taxa muito baixa (0.05%):', veryLow.length > 0 ? '✅ PASS (aviso gerado)' : '❌ FAIL');
  if (veryLow.length > 0) console.log('    Aviso:', veryLow[0]);
}

/**
 * Teste 3: Validar que combinação duplicada é detectada
 * Nota: Este teste precisa de dados reais no banco
 */
export async function testDuplicateDetection() {
  console.log('\n✅ TESTE 3: Detecção de Duplicatas');
  console.log('─'.repeat(60));

  // Este teste verifica que checkDuplicateFee funciona
  // Mas precisa de IDs reais de clínica e processador
  console.log('  ℹ️  Teste de duplicata requer dados reais no banco');
  console.log('  Para testar: use valores reais de clinicId e processorId');

  // Exemplo:
  // const duplicate = await checkDuplicateFee(
  //   'CLINICA_ID_REAL',
  //   'PROCESSOR_ID_REAL',
  //   'Visa',
  //   'D+1'
  // );
  // console.log('Duplicata detectada:', duplicate ? '✅ PASS' : 'Nenhuma duplicata');
}

/**
 * Teste 4: Validar que campos obrigatórios são verificados
 */
export async function testRequiredFields() {
  console.log('\n✅ TESTE 4: Validação de Campos Obrigatórios');
  console.log('─'.repeat(60));

  // Sem processorId
  const noProcessor = validateProcessorFee({
    processorId: null,
    cardBrand: 'Visa',
    settlementType: 'D+1',
    feePercent: 2.5,
  });
  console.log('  Sem processorId:', !noProcessor.isValid ? '✅ PASS' : '❌ FAIL');
  if (!noProcessor.isValid) console.log('    Erro:', noProcessor.errors[0]);

  // Sem cardBrand
  const noBrand = validateProcessorFee({
    processorId: '123e4567-e89b-12d3-a456-426614174000',
    cardBrand: null,
    settlementType: 'D+1',
    feePercent: 2.5,
  });
  console.log('  Sem cardBrand:', !noBrand.isValid ? '✅ PASS' : '❌ FAIL');
  if (!noBrand.isValid) console.log('    Erro:', noBrand.errors[0]);

  // Sem settlementType
  const noSettlement = validateProcessorFee({
    processorId: '123e4567-e89b-12d3-a456-426614174000',
    cardBrand: 'Visa',
    settlementType: null,
    feePercent: 2.5,
  });
  console.log('  Sem settlementType:', !noSettlement.isValid ? '✅ PASS' : '❌ FAIL');
  if (!noSettlement.isValid) console.log('    Erro:', noSettlement.errors[0]);
}

/**
 * Teste 5: Validar que valores não-numéricos são rejeitados
 */
export async function testTypeValidation() {
  console.log('\n✅ TESTE 5: Validação de Tipos');
  console.log('─'.repeat(60));

  // Fee percent como string não-numérica
  const invalidString = validateProcessorFee({
    processorId: '123e4567-e89b-12d3-a456-426614174000',
    cardBrand: 'Visa',
    settlementType: 'D+1',
    feePercent: 'abc',
  });
  console.log('  Fee percent "abc":', !invalidString.isValid ? '✅ PASS' : '❌ FAIL');
  if (!invalidString.isValid) console.log('    Erro:', invalidString.errors[0]);

  // Fee percent como string numérica válida
  const validString = validateProcessorFee({
    processorId: '123e4567-e89b-12d3-a456-426614174000',
    cardBrand: 'Visa',
    settlementType: 'D+1',
    feePercent: '2.5',
  });
  console.log('  Fee percent "2.5" (string):', validString.isValid ? '✅ PASS' : '❌ FAIL');
}

/**
 * Teste 6: Validar que marcas de cartão inválidas são rejeitadas
 */
export async function testCardBrandValidation() {
  console.log('\n✅ TESTE 6: Validação de Marca de Cartão');
  console.log('─'.repeat(60));

  const validBrands = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Discover'];

  // Marca válida
  for (const brand of validBrands.slice(0, 2)) {
    const result = validateProcessorFee({
      processorId: '123e4567-e89b-12d3-a456-426614174000',
      cardBrand: brand,
      settlementType: 'D+1',
      feePercent: 2.5,
    });
    console.log(`  Marca "${brand}":`, result.isValid ? '✅ PASS' : '❌ FAIL');
  }

  // Marca inválida
  const invalidBrand = validateProcessorFee({
    processorId: '123e4567-e89b-12d3-a456-426614174000',
    cardBrand: 'InvalidCard',
    settlementType: 'D+1',
    feePercent: 2.5,
  });
  console.log('  Marca "InvalidCard":', !invalidBrand.isValid ? '✅ PASS' : '❌ FAIL');
  if (!invalidBrand.isValid) console.log('    Erro:', invalidBrand.errors[0]);
}

/**
 * Executar todos os testes
 */
export async function runAllValidationTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║ 🧪 ETAPA C: TESTES DE VALIDAÇÕES ROBUSTAS                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    await testFeeRangeValidation();
    await testSuspiciousFeeWarning();
    await testRequiredFields();
    await testTypeValidation();
    await testCardBrandValidation();
    await testDuplicateDetection();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║ ✅ TODOS OS TESTES DE VALIDAÇÃO CONCLUÍDOS                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ Erro ao executar testes:', error);
  }
}

// Export para uso em Node.js ou browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testFeeRangeValidation,
    testSuspiciousFeeWarning,
    testRequiredFields,
    testTypeValidation,
    testCardBrandValidation,
    testDuplicateDetection,
    runAllValidationTests,
  };
}
