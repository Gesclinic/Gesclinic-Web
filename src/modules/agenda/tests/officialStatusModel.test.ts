/**
 * TESTE AUTOMATIZADO - Official Status Model v1.0.0
 * ================================================
 * 
 * Script de validação completa das 8 etapas
 * Testa compatibilidade, conversão de dados, validações
 */

import {
  OFFICIAL_STATUS_CONFIG,
  OPERATIONAL_FLOW_SEQUENCE,
  OPERATIONAL_STATUSES,
  FINALIZED_STATUSES,
  NON_BILLABLE_STATUSES,
  STATUS_TRANSITIONS,
  LEGACY_TO_OFFICIAL_STATUS_MAP,
  isValidTransition,
  getNextPossibleStatuses,
  getStatusConfig,
  generatesFinancialInStatus,
  receptionUnlockedInStatus,
  convertLegacyToOfficialStatus,
  validateStatusTransition,
  validateEditPermission,
  validateCancelPermission,
  validateFinancialGeneration,
  validateReceptionUnlock,
  QUICK_FILTERS,
  getQuickFilterSummary,
  filterByQuickFilter,
  countByStatus,
  generateChartData,
} from '@/modules/agenda';

// ============================================================================
// TESTE 1: Verificar que 8 status estão definidos
// ============================================================================

export function test1_OfficialStatusesExist(): boolean {
  console.log('\n✅ TESTE 1: 8 Status Oficiais Definidos');

  const expectedStatuses = [
    'scheduled',
    'confirmed',
    'checked_in',
    'waiting',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
  ];

  const allDefined = expectedStatuses.every((status) => {
    const config = getStatusConfig(status as any);
    return config && config.label;
  });

  console.log(`   Statuses esperados: ${expectedStatuses.length}`);
  console.log(`   Statuses encontrados: ${Object.keys(OFFICIAL_STATUS_CONFIG).length}`);
  console.log(`   ✅ Resultado: ${allDefined ? 'PASSOU' : 'FALHOU'}`);

  return allDefined;
}

// ============================================================================
// TESTE 2: Validar Fluxo Operacional
// ============================================================================

export function test2_OperationalFlow(): boolean {
  console.log('\n✅ TESTE 2: Fluxo Operacional Válido');

  const expectedFlow = [
    'scheduled',
    'confirmed',
    'checked_in',
    'waiting',
    'in_progress',
    'completed',
  ];

  const match =
    OPERATIONAL_FLOW_SEQUENCE.length === expectedFlow.length &&
    OPERATIONAL_FLOW_SEQUENCE.every((s, i) => s === expectedFlow[i]);

  console.log(`   Fluxo esperado: ${expectedFlow.join(' → ')}`);
  console.log(`   Fluxo obtido: ${OPERATIONAL_FLOW_SEQUENCE.join(' → ')}`);
  console.log(`   ✅ Resultado: ${match ? 'PASSOU' : 'FALHOU'}`);

  return match;
}

// ============================================================================
// TESTE 3: Transições Válidas
// ============================================================================

export function test3_ValidTransitions(): boolean {
  console.log('\n✅ TESTE 3: Transições Válidas');

  const testCases = [
    { from: 'scheduled', to: 'confirmed', expected: true },
    { from: 'scheduled', to: 'cancelled', expected: true },
    { from: 'confirmed', to: 'checked_in', expected: true },
    { from: 'confirmed', to: 'cancelled', expected: true },
    { from: 'checked_in', to: 'waiting', expected: true },
    { from: 'waiting', to: 'in_progress', expected: true },
    { from: 'in_progress', to: 'completed', expected: true },
    { from: 'completed', to: 'scheduled', expected: false }, // Inválida
    { from: 'cancelled', to: 'confirmed', expected: false }, // Inválida
    { from: 'no_show', to: 'completed', expected: false }, // Inválida
  ];

  let allPassed = true;

  testCases.forEach(({ from, to, expected }) => {
    const result = isValidTransition(from as any, to as any);
    const passed = result === expected;

    if (!passed) {
      console.log(
        `   ❌ ${from} → ${to}: esperado ${expected}, obteve ${result}`
      );
      allPassed = false;
    } else {
      console.log(`   ✅ ${from} → ${to}`);
    }
  });

  console.log(`   ✅ Resultado: ${allPassed ? 'PASSOU' : 'FALHOU'}`);

  return allPassed;
}

// ============================================================================
// TESTE 4: Faturamento Automático
// ============================================================================

export function test4_FinancialGeneration(): boolean {
  console.log('\n✅ TESTE 4: Faturamento Automático');

  const testCases = [
    { status: 'completed', shouldGenerate: true },
    { status: 'cancelled', shouldGenerate: false },
    { status: 'no_show', shouldGenerate: false },
    { status: 'scheduled', shouldGenerate: false },
    { status: 'confirmed', shouldGenerate: false },
    { status: 'checked_in', shouldGenerate: false },
    { status: 'waiting', shouldGenerate: false },
    { status: 'in_progress', shouldGenerate: false },
  ];

  let allPassed = true;

  testCases.forEach(({ status, shouldGenerate }) => {
    const result = generatesFinancialInStatus(status as any);
    const passed = result === shouldGenerate;

    if (!passed) {
      console.log(
        `   ❌ ${status}: esperado gera=${shouldGenerate}, obteve ${result}`
      );
      allPassed = false;
    } else {
      console.log(`   ✅ ${status}: gera faturamento=${shouldGenerate}`);
    }
  });

  console.log(`   ✅ Resultado: ${allPassed ? 'PASSOU' : 'FALHOU'}`);

  return allPassed;
}

// ============================================================================
// TESTE 5: Desbloqueio de Recepção
// ============================================================================

export function test5_ReceptionUnlock(): boolean {
  console.log('\n✅ TESTE 5: Desbloqueio de Recepção');

  const testCases = [
    { status: 'checked_in', shouldUnlock: true },
    { status: 'scheduled', shouldUnlock: false },
    { status: 'confirmed', shouldUnlock: false },
    { status: 'waiting', shouldUnlock: false },
    { status: 'in_progress', shouldUnlock: false },
    { status: 'completed', shouldUnlock: false },
  ];

  let allPassed = true;

  testCases.forEach(({ status, shouldUnlock }) => {
    const result = receptionUnlockedInStatus(status as any);
    const passed = result === shouldUnlock;

    if (!passed) {
      console.log(
        `   ❌ ${status}: esperado unlock=${shouldUnlock}, obteve ${result}`
      );
      allPassed = false;
    } else {
      console.log(`   ✅ ${status}: recepção desbloqueada=${shouldUnlock}`);
    }
  });

  console.log(`   ✅ Resultado: ${allPassed ? 'PASSOU' : 'FALHOU'}`);

  return allPassed;
}

// ============================================================================
// TESTE 6: Conversão de Status Legados
// ============================================================================

export function test6_LegacyConversion(): boolean {
  console.log('\n✅ TESTE 6: Conversão de Status Legados');

  const testCases = [
    { legacy: 'agendado', expected: 'scheduled' },
    { legacy: 'confirmado', expected: 'confirmed' },
    { legacy: 'confirmed_phone', expected: 'confirmed' },
    { legacy: 'at_reception', expected: 'checked_in' },
    { legacy: 'aguardando_profissional', expected: 'waiting' },
    { legacy: 'em_atendimento', expected: 'in_progress' },
    { legacy: 'atendido', expected: 'completed' },
    { legacy: 'cancelado', expected: 'cancelled' },
    { legacy: 'faltou', expected: 'no_show' },
  ];

  let allPassed = true;

  testCases.forEach(({ legacy, expected }) => {
    const result = convertLegacyToOfficialStatus(legacy as any);
    const passed = result === expected;

    if (!passed) {
      console.log(
        `   ❌ ${legacy} → esperado ${expected}, obteve ${result}`
      );
      allPassed = false;
    } else {
      console.log(`   ✅ ${legacy} → ${result}`);
    }
  });

  console.log(`   ✅ Resultado: ${allPassed ? 'PASSOU' : 'FALHOU'}`);

  return allPassed;
}

// ============================================================================
// TESTE 7: Validações de Permissão
// ============================================================================

export function test7_PermissionValidation(): boolean {
  console.log('\n✅ TESTE 7: Validações de Permissão');

  let allPassed = true;

  // Teste cancelamento
  console.log('   Testes de cancelamento:');
  const cancelTests = [
    { status: 'scheduled', canCancel: true },
    { status: 'confirmed', canCancel: true },
    { status: 'checked_in', canCancel: true },
    { status: 'waiting', canCancel: false },
    { status: 'in_progress', canCancel: false },
    { status: 'completed', canCancel: false },
  ];

  cancelTests.forEach(({ status, canCancel }) => {
    const result = validateCancelPermission(status as any);
    const passed = result.canEdit === canCancel;

    if (!passed) {
      console.log(`     ❌ ${status}: canCancel=${canCancel}, obteve ${result.canEdit}`);
      allPassed = false;
    } else {
      console.log(`     ✅ ${status}`);
    }
  });

  // Teste edição
  console.log('   Testes de edição:');
  const editTests = [
    { status: 'completed', field: 'duration_minutes', canEdit: false },
    { status: 'confirmed', field: 'duration_minutes', canEdit: true },
    { status: 'completed', field: 'notes', canEdit: true },
  ];

  editTests.forEach(({ status, field, canEdit }) => {
    const result = validateEditPermission(status as any, field);
    const passed = result.canEdit === canEdit;

    if (!passed) {
      console.log(`     ❌ ${status}.${field}: canEdit=${canEdit}, obteve ${result.canEdit}`);
      allPassed = false;
    } else {
      console.log(`     ✅ ${status}.${field}`);
    }
  });

  console.log(`   ✅ Resultado: ${allPassed ? 'PASSOU' : 'FALHOU'}`);

  return allPassed;
}

// ============================================================================
// TESTE 8: Filtros Rápidos
// ============================================================================

export function test8_QuickFilters(): boolean {
  console.log('\n✅ TESTE 8: Filtros Rápidos');

  const mockAppointments = [
    { status: 'scheduled' },
    { status: 'confirmed' },
    { status: 'completed' },
    { status: 'cancelled' },
    { status: 'no_show' },
    { status: 'in_progress' },
  ];

  const pendingFilter = filterByQuickFilter(mockAppointments as any, 'PENDING');
  const finalizedFilter = filterByQuickFilter(mockAppointments as any, 'FINALIZED');
  const summary = getQuickFilterSummary(mockAppointments as any);

  console.log(`   PENDING (em processamento): ${pendingFilter.length} agendamentos`);
  console.log(`   FINALIZED (finalizados): ${finalizedFilter.length} agendamentos`);
  console.log(`   Resumo: ${JSON.stringify(summary)}`);

  const passed =
    pendingFilter.length > 0 &&
    finalizedFilter.length > 0 &&
    summary.total === mockAppointments.length;

  console.log(`   ✅ Resultado: ${passed ? 'PASSOU' : 'FALHOU'}`);

  return passed;
}

// ============================================================================
// TESTE EXECUTAR TUDO
// ============================================================================

export function runAllTests(): void {
  console.log(
    '╔════════════════════════════════════════════════════════════════════════════╗'
  );
  console.log(
    '║             TESTE AUTOMATIZADO - Official Status Model v1.0.0             ║'
  );
  console.log(
    '╚════════════════════════════════════════════════════════════════════════════╝'
  );

  const results = [
    { name: 'Teste 1: 8 Status Oficiais', result: test1_OfficialStatusesExist() },
    { name: 'Teste 2: Fluxo Operacional', result: test2_OperationalFlow() },
    { name: 'Teste 3: Transições Válidas', result: test3_ValidTransitions() },
    { name: 'Teste 4: Faturamento Automático', result: test4_FinancialGeneration() },
    { name: 'Teste 5: Desbloqueio de Recepção', result: test5_ReceptionUnlock() },
    { name: 'Teste 6: Conversão de Legados', result: test6_LegacyConversion() },
    { name: 'Teste 7: Validações de Permissão', result: test7_PermissionValidation() },
    { name: 'Teste 8: Filtros Rápidos', result: test8_QuickFilters() },
  ];

  const passed = results.filter((r) => r.result).length;
  const total = results.length;

  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           RESULTADO FINAL                                  ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════╣');
  console.log(
    `║  ✅ PASSOU: ${passed}/${total}                                                         ║`
  );
  console.log(
    `║  ❌ FALHOU: ${total - passed}/${total}                                                         ║`
  );
  console.log('║                                                                            ║');

  if (passed === total) {
    console.log(
      '║  🎉 TODOS OS TESTES PASSARAM! PRONTO PARA PRODUÇÃO!                       ║'
    );
  } else {
    console.log(
      '║  ⚠️  Alguns testes falharam. Verifique os detalhes acima.                  ║'
    );
  }

  console.log('║                                                                            ║');
  console.log(
    '╚════════════════════════════════════════════════════════════════════════════╝\n'
  );
}

// Executar se importado direto
if (typeof window === 'undefined' && typeof module !== 'undefined') {
  runAllTests();
}

export default { runAllTests };
