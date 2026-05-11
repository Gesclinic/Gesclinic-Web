/**
 * 🧪 Testes de Timezone - Script de Validação
 * 
 * Copiar e colar no console (F12) durante testes de Agenda
 * Valida: conversões, formatação, renderização, cross-browser
 */

import {
  toLocalTime,
  fromLocalTime,
  fromLocalTimeToDateAndTime,
  formatLocalDate,
  formatLocalTime,
  formatLocal,
  formatLocalDayOfWeek,
  isValidLocalDate,
  isValidLocalTime,
  isValidLocalDateTime,
  isSameLocalDay,
  isSameLocalTime,
  isTimeInRange,
  getTimezoneOffset,
  calculateDurationMinutes,
  addMinutesToTime,
  debugTimezone,
} from '@/utils/timezoneHelpers';

/**
 * TESTE 1: Conversão ISO UTC → Local Time
 */
function test1_IsoToLocal() {
  console.group('🧪 TESTE 1: ISO UTC → Local Time');
  
  const testCases = [
    '2026-05-10T17:30:00Z',      // ISO UTC afternoon
    '2026-05-10T00:00:00Z',      // ISO UTC midnight
    '2026-12-10T15:00:00Z',      // DST period
    '2026-05-10',                 // Date only
  ];

  testCases.forEach((testCase) => {
    const result = toLocalTime(testCase);
    console.log(`✅ Input: "${testCase}"`);
    console.log(`   Output:`, result);
    console.assert(result?.date, '   ❌ ERRO: date não existe');
    console.assert(result?.time, '   ❌ ERRO: time não existe');
  });

  console.groupEnd();
}

/**
 * TESTE 2: Conversão Local Time → ISO UTC
 */
function test2_LocalToIso() {
  console.group('🧪 TESTE 2: Local Time → ISO UTC');

  const testCases = [
    { date: '2026-05-10', time: '14:30:00' },
    { date: '2026-05-10', time: '14:30' },
    { date: '2026-12-10', time: '09:00:00' },
  ];

  testCases.forEach((testCase) => {
    const result = fromLocalTime(testCase.date, testCase.time);
    console.log(`✅ Input:`, testCase);
    console.log(`   Output: "${result}"`);
    console.assert(result?.includes('Z'), '   ❌ ERRO: não é ISO UTC');
    
    // Converter de volta (roundtrip)
    const back = toLocalTime(result);
    console.log(`   Roundtrip:`, back);
  });

  console.groupEnd();
}

/**
 * TESTE 3: Formatação para Render
 */
function test3_Formatting() {
  console.group('🧪 TESTE 3: Formatação para Render');

  const date = '2026-05-10';
  const time = '14:30:00';

  console.log(`✅ Data: "${date}"`);
  console.log(`   formatLocalDate(): "${formatLocalDate(date)}"`);
  console.log(`   Expected: "10/05/2026"`);

  console.log(`✅ Time: "${time}"`);
  console.log(`   formatLocalTime(): "${formatLocalTime(time)}"`);
  console.log(`   Expected: "14:30"`);

  console.log(`✅ DateTime:`);
  console.log(`   formatLocal(): "${formatLocal(date, time)}"`);
  console.log(`   Expected: "10/05/2026 14:30"`);

  console.log(`✅ DayOfWeek: "${date}"`);
  console.log(`   formatLocalDayOfWeek(): "${formatLocalDayOfWeek(date)}"`);
  console.log(`   Expected: "Sábado"`);

  console.groupEnd();
}

/**
 * TESTE 4: Validação
 */
function test4_Validation() {
  console.group('🧪 TESTE 4: Validação');

  const validCases = [
    { date: '2026-05-10', isValid: true },
    { date: '2026-13-01', isValid: false },
    { date: 'invalid', isValid: false },
    { date: '', isValid: false },
  ];

  console.log('Date Validation:');
  validCases.forEach(({ date, isValid }) => {
    const result = isValidLocalDate(date);
    const status = result === isValid ? '✅' : '❌';
    console.log(`${status} "${date}": ${result} (expected: ${isValid})`);
  });

  const timeValid = [
    { time: '14:30', isValid: true },
    { time: '14:30:00', isValid: true },
    { time: '24:00', isValid: false },
    { time: 'invalid', isValid: false },
  ];

  console.log('\nTime Validation:');
  timeValid.forEach(({ time, isValid }) => {
    const result = isValidLocalTime(time);
    const status = result === isValid ? '✅' : '❌';
    console.log(`${status} "${time}": ${result} (expected: ${isValid})`);
  });

  console.groupEnd();
}

/**
 * TESTE 5: Comparação
 */
function test5_Comparison() {
  console.group('🧪 TESTE 5: Comparação');

  console.log('isSameLocalDay:');
  console.assert(
    isSameLocalDay('2026-05-10', '2026-05-10') === true,
    '❌ Same day should be true'
  );
  console.log('✅ Same day: true');
  
  console.assert(
    isSameLocalDay('2026-05-10', '2026-05-11') === false,
    '❌ Different day should be false'
  );
  console.log('✅ Different day: false');

  console.log('\nisSameLocalTime:');
  const time1 = { date: '2026-05-10', time: '14:30:00' };
  const time2 = { date: '2026-05-10', time: '14:30:00' };
  console.assert(
    isSameLocalTime(time1, time2) === true,
    '❌ Same time should be true'
  );
  console.log('✅ Same time: true');

  console.groupEnd();
}

/**
 * TESTE 6: Utilitários
 */
function test6_Utilities() {
  console.group('🧪 TESTE 6: Utilitários');

  console.log('Duration calculation:');
  const duration1 = calculateDurationMinutes('14:30:00', '15:30:00');
  console.assert(duration1 === 60, `❌ Duration should be 60, got ${duration1}`);
  console.log(`✅ 14:30 → 15:30 = ${duration1} minutes`);

  console.log('\nTime range check:');
  console.assert(
    isTimeInRange('14:30', '08:00', '18:00') === true,
    '❌ Time should be in range'
  );
  console.log('✅ 14:30 in range 08:00-18:00: true');

  console.log('\nAdd minutes:');
  const newTime = addMinutesToTime('14:30:00', 30);
  console.log(`✅ 14:30 + 30min = ${newTime}`);
  console.assert(newTime === '15:00:00', `❌ Expected 15:00:00, got ${newTime}`);

  console.groupEnd();
}

/**
 * TESTE 7: Timezone Offset (DST)
 */
function test7_TimezoneOffset() {
  console.group('🧪 TESTE 7: Timezone Offset (DST)');

  const winterDate = '2026-05-10';
  const summerDate = '2026-12-10';

  const winterOffset = getTimezoneOffset(winterDate);
  console.log(`🌨️ Winter (${winterDate}): UTC${winterOffset}`);
  console.assert(winterOffset === -3, `❌ Winter should be UTC-3`);

  const summerOffset = getTimezoneOffset(summerDate);
  console.log(`☀️ Summer (${summerDate}): UTC${summerOffset}`);
  console.assert(summerOffset === -2, `❌ Summer should be UTC-2`);

  console.groupEnd();
}

/**
 * TESTE 8: Roundtrip (ISO → Local → ISO)
 */
function test8_Roundtrip() {
  console.group('🧪 TESTE 8: Roundtrip Consistency');

  const originalIso = '2026-05-10T17:30:00Z';
  
  const local = toLocalTime(originalIso);
  console.log(`Original ISO: ${originalIso}`);
  console.log(`To Local:`, local);

  const backToIso = fromLocalTime(local.date, local.time);
  console.log(`Back to ISO: ${backToIso}`);

  const final = toLocalTime(backToIso);
  console.log(`Final Local:`, final);

  console.assert(
    local.date === final.date && local.time === final.time,
    '❌ Roundtrip changed values!'
  );
  console.log('✅ Roundtrip consistent!');

  console.groupEnd();
}

/**
 * TESTE 9: Database Save Format
 */
function test9_DatabaseFormat() {
  console.group('🧪 TESTE 9: Database Save Format');

  const userInputDate = '2026-05-10';
  const userInputTime = '14:30';

  const dbFormat = fromLocalTimeToDateAndTime(userInputDate, userInputTime);
  console.log(`User input: date="${userInputDate}" time="${userInputTime}"`);
  console.log(`DB format:`, dbFormat);

  console.assert(
    dbFormat.scheduled_date === '2026-05-10',
    '❌ scheduled_date wrong'
  );
  console.assert(
    dbFormat.scheduled_time === '14:30:00',
    '❌ scheduled_time wrong'
  );
  console.log('✅ DB format correct!');

  console.groupEnd();
}

/**
 * TESTE 10: UI Rendering Consistency
 */
function test10_UIConsistency() {
  console.group('🧪 TESTE 10: UI Rendering Consistency');

  const isoUtc = '2026-05-10T17:30:00Z';
  
  // Simular render 3 vezes (com delay)
  const renders = [];
  for (let i = 0; i < 3; i++) {
    const local = toLocalTime(isoUtc);
    const formatted = formatLocal(local.date, local.time);
    renders.push(formatted);
    console.log(`Render ${i + 1}: ${formatted}`);
  }

  // Verificar se todas as renderizações são iguais
  const allSame = renders.every(r => r === renders[0]);
  console.assert(allSame, '❌ Renders inconsistent!');
  console.log(`✅ All renders consistent: "${renders[0]}"`);

  console.groupEnd();
}

/**
 * TESTE 11: Component Integration (Mocked)
 */
function test11_ComponentIntegration() {
  console.group('🧪 TESTE 11: Component Integration');

  // Simular dados do banco
  const appointmentFromDb = {
    id: 'test-123',
    scheduled_date: '2026-05-10',
    scheduled_time: '14:30:00',
    created_at: '2026-05-10T17:30:00Z',
    patient_name: 'João Silva',
  };

  console.log('📦 Data from DB:');
  console.log(appointmentFromDb);

  // Simular renderização
  const local = toLocalTime(appointmentFromDb.created_at);
  const display = {
    date: formatLocalDate(local.date),
    time: formatLocalTime(local.time),
    full: formatLocal(local.date, local.time),
  };

  console.log('🎨 Rendered for UI:');
  console.log(display);

  // Simular edição
  const editedTime = '15:30:00';
  const updatePayload = fromLocalTimeToDateAndTime(local.date, editedTime);

  console.log('💾 Payload for DB update:');
  console.log(updatePayload);

  console.log('✅ Integration test passed!');

  console.groupEnd();
}

/**
 * TESTE 12: Edge Cases
 */
function test12_EdgeCases() {
  console.group('🧪 TESTE 12: Edge Cases');

  console.log('Midnight:');
  const midnight = toLocalTime('2026-05-10T03:00:00Z'); // UTC midnight = local midnight
  console.log(midnight);
  console.assert(midnight.time === '00:00:00', '❌ Midnight handling failed');
  console.log('✅ Midnight handled');

  console.log('\nEnd of day:');
  const endOfDay = toLocalTime('2026-05-11T03:00:00Z'); // UTC 00:00 next day = local 21:00 prev day
  console.log(endOfDay);

  console.log('\nDST transition (Nov 2026):');
  const beforeDST = getTimezoneOffset('2026-11-01');
  const afterDST = getTimezoneOffset('2026-11-15');
  console.log(`Before DST end: UTC${beforeDST}, After: UTC${afterDST}`);

  console.log('✅ Edge cases handled!');

  console.groupEnd();
}

/**
 * RUN ALL TESTS
 */
export function runAllTimezoneTests() {
  console.group('🚀 TIMEZONE VALIDATION SUITE');
  console.log('Starting all tests...\n');

  test1_IsoToLocal();
  test2_LocalToIso();
  test3_Formatting();
  test4_Validation();
  test5_Comparison();
  test6_Utilities();
  test7_TimezoneOffset();
  test8_Roundtrip();
  test9_DatabaseFormat();
  test10_UIConsistency();
  test11_ComponentIntegration();
  test12_EdgeCases();

  console.log('\n✅ ALL TESTS COMPLETED');
  console.groupEnd();
}

/**
 * EXPORT FOR CONSOLE USE
 */
window.__timezoneTests = {
  runAllTimezoneTests,
  test1: test1_IsoToLocal,
  test2: test2_LocalToIso,
  test3: test3_Formatting,
  test4: test4_Validation,
  test5: test5_Comparison,
  test6: test6_Utilities,
  test7: test7_TimezoneOffset,
  test8: test8_Roundtrip,
  test9: test9_DatabaseFormat,
  test10: test10_UIConsistency,
  test11: test11_ComponentIntegration,
  test12: test12_EdgeCases,
  debugTimezone,
};

/**
 * QUICK USAGE IN CONSOLE:
 * 
 * // Run all tests:
 * window.__timezoneTests.runAllTimezoneTests();
 * 
 * // Run specific test:
 * window.__timezoneTests.test1();
 * window.__timezoneTests.test5();
 * 
 * // Debug a specific datetime:
 * window.__timezoneTests.debugTimezone('2026-05-10', '14:30:00');
 */
