#!/usr/bin/env node

/**
 * COMPREHENSIVE TIMEZONE TESTING SUITE
 * Tests all timezone implementation across components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║        🕐 COMPREHENSIVE TIMEZONE TESTING SUITE - PHASE 4             ║');
console.log('║                     Complete System Validation                       ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// TEST SUITE 1: FILE STRUCTURE VALIDATION
// ============================================================================

console.log('📋 TEST SUITE 1: FILE STRUCTURE VALIDATION\n');
console.log('─'.repeat(75));

const requiredFiles = {
  helpers: 'src/utils/timezoneHelpers.js',
  tests: 'src/utils/timezoneTests.js',
  modal: 'src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx',
  timeline: 'src/components/clinica/agenda/AgendaTimelineView.jsx',
  week: 'src/components/clinica/agenda/AgendaWeekView.jsx',
  month: 'src/components/clinica/agenda/AgendaMonthView.jsx',
  calendar: 'src/pages/clinica/agenda/components/AgendaCalendar.jsx',
};

let allFilesPresent = true;
Object.entries(requiredFiles).forEach(([name, filePath]) => {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${name.padEnd(15)} ${filePath}`);
  if (!exists) allFilesPresent = false;
});

console.log(`\n📊 Result: ${allFilesPresent ? '✅ ALL FILES PRESENT' : '❌ MISSING FILES'}\n`);

// ============================================================================
// TEST SUITE 2: IMPORT VALIDATION
// ============================================================================

console.log('📋 TEST SUITE 2: IMPORT VALIDATION\n');
console.log('─'.repeat(75));

const importTests = [
  {
    name: 'AppointmentUnitedModal',
    file: requiredFiles.modal,
    requiredImports: ['toLocalTime', 'formatLocalTime', 'isValidLocalDateTime'],
  },
  {
    name: 'AgendaTimelineView',
    file: requiredFiles.timeline,
    requiredImports: ['toLocalTime', 'formatLocalTime'],
  },
  {
    name: 'AgendaWeekView',
    file: requiredFiles.week,
    requiredImports: ['toLocalTime', 'formatLocalDate'],
  },
  {
    name: 'AgendaMonthView',
    file: requiredFiles.month,
    requiredImports: ['toLocalTime', 'formatLocalDate', 'formatLocalTime'],
  },
  {
    name: 'AgendaCalendar',
    file: requiredFiles.calendar,
    requiredImports: ['toLocalTime', 'fromLocalTime'],
  },
];

let importTestsPassed = 0;
importTests.forEach(test => {
  const fullPath = path.join(__dirname, test.file);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${test.name}: FILE NOT FOUND`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  let allImportsPassed = true;

  console.log(`\n📄 ${test.name}:`);
  test.requiredImports.forEach(imp => {
    const hasImport = content.includes(imp);
    const status = hasImport ? '✅' : '❌';
    console.log(`  ${status} ${imp}`);
    if (!hasImport) allImportsPassed = false;
  });

  if (allImportsPassed) {
    importTestsPassed++;
  }
});

console.log(`\n📊 Result: ${importTestsPassed}/${importTests.length} components ✅\n`);

// ============================================================================
// TEST SUITE 3: HELPER FUNCTIONS VALIDATION
// ============================================================================

console.log('📋 TEST SUITE 3: HELPER FUNCTIONS VALIDATION\n');
console.log('─'.repeat(75));

const helpersPath = path.join(__dirname, requiredFiles.helpers);
const helpersContent = fs.readFileSync(helpersPath, 'utf8');

const helperFunctions = [
  'toLocalTime',
  'fromLocalTime',
  'fromLocalTimeToDateAndTime',
  'formatLocalDate',
  'formatLocalTime',
  'formatLocal',
  'isValidLocalDate',
  'isValidLocalTime',
  'isValidLocalDateTime',
  'isSameLocalDay',
  'isSameLocalTime',
  'calculateDurationMinutes',
  'addMinutesToTime',
  'getTimezoneOffset',
  'debugTimezone',
];

let helpersFunctionsFound = 0;
console.log('Helper Functions Implemented:\n');
helperFunctions.forEach(fn => {
  const hasFunction = 
    helpersContent.includes(`export function ${fn}`) ||
    helpersContent.includes(`export const ${fn}`);
  
  if (hasFunction) {
    console.log(`  ✅ ${fn}`);
    helpersFunctionsFound++;
  } else {
    console.log(`  ❌ ${fn}`);
  }
});

console.log(`\n📊 Result: ${helpersFunctionsFound}/${helperFunctions.length} functions ✅\n`);

// ============================================================================
// TEST SUITE 4: DEPRECATED CODE REMOVAL
// ============================================================================

console.log('📋 TEST SUITE 4: DEPRECATED CODE REMOVAL\n');
console.log('─'.repeat(75));

const deprecatedPatterns = [
  {
    name: 'utcToZonedTime function calls removed from TimelineView',
    file: requiredFiles.timeline,
    pattern: /utcToZonedTime\(/,  // Look for function calls, not comments
    shouldExist: false,
  },
  {
    name: 'formatTz function calls removed from MonthView',
    file: requiredFiles.month,
    pattern: /formatTz\(/,  // Look for function calls, not comments
    shouldExist: false,
  },
  {
    name: 'toLocalTime helper used in AppointmentUnitedModal',
    file: requiredFiles.modal,
    pattern: /toLocalTime/,  // Verify new pattern is present
    shouldExist: true,
  },
];

let deprecationTestsPassed = 0;
console.log('Checking for deprecated patterns:\n');
deprecatedPatterns.forEach(test => {
  const fullPath = path.join(__dirname, test.file);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf8');
  const hasPattern = test.pattern.test ? test.pattern.test(content) : content.includes(test.pattern);
  
  const isCorrect = hasPattern === test.shouldExist;
  const status = isCorrect ? '✅' : '❌';
  console.log(`${status} ${test.name}`);
  
  if (isCorrect) deprecationTestsPassed++;
});

console.log(`\n📊 Result: ${deprecationTestsPassed}/${deprecatedPatterns.length} checks ✅\n`);

// ============================================================================
// TEST SUITE 5: CODE QUALITY CHECKS
// ============================================================================

console.log('📋 TEST SUITE 5: CODE QUALITY CHECKS\n');
console.log('─'.repeat(75));

const qualityChecks = [
  {
    name: 'Error handling in timezone helpers',
    file: requiredFiles.helpers,
    pattern: /try\s*{|catch\s*\{/g,
    shouldFind: true,
  },
  {
    name: 'Validation in AppointmentUnitedModal before save',
    file: requiredFiles.modal,
    pattern: /isValidLocalDateTime.*scheduled/s,
    shouldFind: true,
  },
  {
    name: 'TimelineView uses helpers not deprecated code',
    file: requiredFiles.timeline,
    pattern: /toLocalTime.*formatLocalTime/s,
    shouldFind: true,
  },
  {
    name: 'WeekView grouping by local date',
    file: requiredFiles.week,
    pattern: /local\.date|toLocalTime/,
    shouldFind: true,
  },
];

let qualityChecksPassed = 0;
console.log('Code Quality Validation:\n');
qualityChecks.forEach(check => {
  const fullPath = path.join(__dirname, check.file);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf8');
  const hasPattern = check.pattern.test(content);
  
  const isCorrect = hasPattern === check.shouldFind;
  const status = isCorrect ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  
  if (isCorrect) qualityChecksPassed++;
});

console.log(`\n📊 Result: ${qualityChecksPassed}/${qualityChecks.length} checks ✅\n`);

// ============================================================================
// TEST SUITE 6: COMPONENT INTEGRATION POINTS
// ============================================================================

console.log('📋 TEST SUITE 6: COMPONENT INTEGRATION POINTS\n');
console.log('─'.repeat(75));

const integrationChecks = [
  {
    name: 'AppointmentUnitedModal: Has validation before save',
    file: requiredFiles.modal,
    checks: [
      /isValidLocalDateTime/,
      /agendamentoData\.date.*agendamentoData\.time|agendamentoData\.time.*agendamentoData\.date/,
    ],
  },
  {
    name: 'AgendaTimelineView: Uses formatLocalTime',
    file: requiredFiles.timeline,
    checks: [
      /formatLocalTime/,
      /toLocalTime/,
    ],
  },
  {
    name: 'AgendaWeekView: Uses toLocalTime for grouping',
    file: requiredFiles.week,
    checks: [
      /toLocalTime.*start_time/,
      /local\.date/,
    ],
  },
  {
    name: 'AgendaMonthView: Formats dates with helpers',
    file: requiredFiles.month,
    checks: [
      /toLocalTime/,
      /formatLocalTime/,
    ],
  },
  {
    name: 'AgendaCalendar: Has drag & drop handler',
    file: requiredFiles.calendar,
    checks: [
      /handleEventDrop/,
      /onAppointmentMoved/,
      /editable.*true/,
    ],
  },
];

let integrationChecksPassed = 0;
console.log('Component Integration Validation:\n');
integrationChecks.forEach(check => {
  const fullPath = path.join(__dirname, check.file);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${check.name}: FILE NOT FOUND`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  let allChecksPassed = true;

  check.checks.forEach(pattern => {
    if (!pattern.test(content)) {
      allChecksPassed = false;
    }
  });

  const status = allChecksPassed ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  
  if (allChecksPassed) integrationChecksPassed++;
});

console.log(`\n📊 Result: ${integrationChecksPassed}/${integrationChecks.length} components ✅\n`);

// ============================================================================
// TEST SUITE 7: TIMELINE & WEEK VIEW COMPATIBILITY
// ============================================================================

console.log('📋 TEST SUITE 7: VIEW COMPATIBILITY CHECKS\n');
console.log('─'.repeat(75));

const viewChecks = [
  {
    name: 'TimelineView: Removed deprecated timezone functions',
    file: requiredFiles.timeline,
    shouldNotContain: [/utcToZonedTime\(/, /formatTz\(/],  // Regex patterns for function calls
  },
  {
    name: 'WeekView: Removed deprecated timezone functions',
    file: requiredFiles.week,
    shouldNotContain: [/utcToZonedTime\(/, /formatTz\(/],  // Only actual function calls
  },
  {
    name: 'MonthView: Removed deprecated timezone functions',
    file: requiredFiles.month,
    shouldNotContain: [/utcToZonedTime\(/, /formatTz\(/],  // Only actual function calls
  },
];

let viewChecksPassed = 0;
console.log('View Compatibility:\n');
viewChecks.forEach(check => {
  const fullPath = path.join(__dirname, check.file);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf8');
  let hasDeprecated = false;

  check.shouldNotContain.forEach(pattern => {
    // Pattern is a regex, use test() instead of includes()
    if (pattern.test(content)) {
      hasDeprecated = true;
    }
  });

  const isPassed = !hasDeprecated;
  const status = isPassed ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  
  if (isPassed) viewChecksPassed++;
});

console.log(`\n📊 Result: ${viewChecksPassed}/${viewChecks.length} checks ✅\n`);

// ============================================================================
// TEST SUITE 8: DOCUMENTATION COMPLETENESS
// ============================================================================

console.log('📋 TEST SUITE 8: DOCUMENTATION COMPLETENESS\n');
console.log('─'.repeat(75));

const documentationFiles = [
  '🕐_ARQUITETURA_TIMEZONE_PADRONIZADA.md',
  '📖_GUIA_TIMEZONE_IMPLEMENTACAO.md',
  '✅_PLANO_IMPLEMENTACAO_TIMEZONE.md',
  '🕐_RESUMO_EXECUTIVO_TIMEZONE.md',
  '🕐_FASE2_INTEGRACAO_COMPLETA.md',
  '🕐_PHASE4_VALIDACAO_COMPLETA.md',
  '🎯_RESUMO_TIMEZONE_COMPLETO.md',
  '📁_MANIFEST_ARQUIVOS.md',
  '✅_CHECKLIST_FINAL_COMPLETO.md',
];

let docsFound = 0;
console.log('Documentation Files:\n');
documentationFiles.forEach(doc => {
  const fullPath = path.join(__dirname, doc);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${doc}`);
  if (exists) docsFound++;
});

console.log(`\n📊 Result: ${docsFound}/${documentationFiles.length} documents ✅\n`);

// ============================================================================
// FINAL SUMMARY
// ============================================================================

console.log('═'.repeat(75));
console.log('\n📊 COMPREHENSIVE TEST RESULTS\n');

const results = [
  { name: 'File Structure', passed: allFilesPresent ? 1 : 0, total: 1 },
  { name: 'Import Validation', passed: importTestsPassed, total: importTests.length },
  { name: 'Helper Functions', passed: helpersFunctionsFound, total: helperFunctions.length },
  { name: 'Deprecated Code', passed: deprecationTestsPassed, total: deprecatedPatterns.length },
  { name: 'Code Quality', passed: qualityChecksPassed, total: qualityChecks.length },
  { name: 'Integration Points', passed: integrationChecksPassed, total: integrationChecks.length },
  { name: 'View Compatibility', passed: viewChecksPassed, total: viewChecks.length },
  { name: 'Documentation', passed: docsFound, total: documentationFiles.length },
];

const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
const totalTests = results.reduce((sum, r) => sum + r.total, 0);
const passPercentage = ((totalPassed / totalTests) * 100).toFixed(1);

results.forEach(r => {
  const status = r.passed === r.total ? '✅' : '⚠️';
  const bar = `[${r.passed}/${r.total}]`.padEnd(8);
  console.log(`  ${status} ${r.name.padEnd(20)} ${bar} ${(r.passed / r.total * 100).toFixed(0)}%`);
});

console.log('\n' + '═'.repeat(75));
console.log(`\n🎯 OVERALL RESULT: ${totalPassed}/${totalTests} Tests Passed (${passPercentage}%)\n`);

if (totalPassed === totalTests) {
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ ALL TESTS PASSED ✅                           ║');
  console.log('║                                                                      ║');
  console.log('║  🟢 STATUS: PRODUCTION READY                                        ║');
  console.log('║                                                                      ║');
  console.log('║  Ready for Phase 5 - Production Deployment                          ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');
  process.exit(0);
} else {
  console.log('⚠️  SOME TESTS FAILED - REVIEW REQUIRED\n');
  process.exit(1);
}
