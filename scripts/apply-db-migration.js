#!/usr/bin/env node
/**
 * Apply Supabase Migration via REST API + RPC
 * 
 * This script uses the Supabase SQL endpoint to execute migrations
 * by creating a temporary RPC function that runs the SQL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://gvdkdjyupktlflwurike.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mjc1NzcsImV4cCI6MTc2ODIwMzU3N30.e0D4b0MWdCE0E8Z1rSfJN3G3HG5P0rX0M0Y0Z0A0Z0A';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║                   Stock Balance Migration                     ║');
console.log('║                    Supabase REST API                          ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

// Read migration SQL
const sqlPath = path.join(__dirname, '../supabase/migrations/2026-01-07_create_stock_balance_function.sql');
let sqlContent;

try {
  sqlContent = fs.readFileSync(sqlPath, 'utf-8');
} catch (error) {
  console.error('❌ Could not read migration file:', sqlPath);
  console.error(error.message);
  process.exit(1);
}

console.log('✅ Migration SQL loaded');
console.log('');

// Unfortunately, Supabase REST API does not provide a way to execute raw SQL
// We need to use the SQL Editor directly or the service role key with direct DB connection

console.log('⚠️  Note: Supabase REST API does not support executing raw SQL.');
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║              APPLY MIGRATION MANUALLY (3 STEPS)               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

console.log('📍 Step 1: Open Supabase Dashboard');
console.log(`   🔗 ${SUPABASE_URL}`);
console.log('');

console.log('📍 Step 2: Go to SQL Editor');
console.log('   • Click "SQL Editor" in the left sidebar');
console.log('   • Click "+ New Query" button');
console.log('');

console.log('📍 Step 3: Execute the SQL below');
console.log('   • Copy all SQL below');
console.log('   • Paste into the SQL editor');  
console.log('   • Click "Run" button (or Ctrl+Enter)');
console.log('');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ SQL TO EXECUTE:                                             │');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log('');

// Display SQL with line numbers for easier reference
const lines = sqlContent.split('\n');
const maxLineNum = lines.length.toString().length;
lines.forEach((line, i) => {
  const lineNum = (i + 1).toString().padStart(maxLineNum, ' ');
  console.log(`${lineNum} │ ${line}`);
});

console.log('');
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ END OF SQL                                                   │');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log('');

console.log('✅ After executing the SQL:');
console.log('   1. You should see "Query executed successfully" message');
console.log('   2. No error messages should appear');
console.log('   3. Refresh your browser');
console.log('   4. Go to Produtos page - should load without errors');
console.log('');

console.log('💡 Troubleshooting:');
console.log('   • If you see "Function already exists" - this is fine, it means');
console.log('     the migration was already applied or partially applied');
console.log('   • Clear your browser cache (Ctrl+Shift+Delete)');
console.log('   • Check browser console (F12) for any JavaScript errors');
console.log('');

console.log('═'.repeat(65));
console.log('');
