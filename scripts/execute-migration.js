#!/usr/bin/env node
/**
 * Apply migration using Supabase PostgreSQL connection
 * 
 * USAGE:
 *   node scripts/execute-migration.js
 * 
 * REQUIREMENTS:
 *   - Set SUPABASE_DB_URL environment variable with PostgreSQL connection string
 *   - Or the script will show instructions for manual application
 */

const fs = require('fs');
const path = require('path');

// Try to load the postgres package
let Client;
try {
  const pkg = require('pg');
  Client = pkg.Client;
} catch (e) {
  console.log('⚠️  PostgreSQL client not installed.');
  console.log('To automatically apply migrations, install: npm install pg');
  console.log('');
  console.log('Or apply manually using the SQL Editor in Supabase Dashboard.');
  console.log('');
  showManualInstructions();
  process.exit(0);
}

const SUPABASE_URL = 'https://gvdkdjyupktlflwurike.supabase.co';

function showManualInstructions() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/2026-01-07_create_stock_balance_function.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
  
  console.log('╔' + '═'.repeat(70) + '╗');
  console.log('║' + ' '.repeat(70) + '║');
  console.log('║' + '  📋 MANUAL APPLICATION INSTRUCTIONS'.padEnd(70) + '║');
  console.log('║' + ' '.repeat(70) + '║');
  console.log('╚' + '═'.repeat(70) + '╝');
  console.log('');
  console.log('1️⃣  Open Supabase Dashboard:');
  console.log(`    ${SUPABASE_URL}`);
  console.log('');
  console.log('2️⃣  Click "SQL Editor" in the sidebar');
  console.log('');
  console.log('3️⃣  Click "New Query" button');
  console.log('');
  console.log('4️⃣  Copy and paste the SQL below:');
  console.log('');
  console.log('─'.repeat(72));
  console.log(sqlContent);
  console.log('─'.repeat(72));
  console.log('');
  console.log('5️⃣  Click "Run" button (or Ctrl+Enter)');
  console.log('');
  console.log('6️⃣  Verify: You should see "Query executed successfully"');
  console.log('');
  console.log('7️⃣  Refresh your browser and test the Produtos page');
  console.log('');
}

async function executeViaPostgres() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  
  if (!dbUrl) {
    console.log('ℹ️  SUPABASE_DB_URL environment variable not set.');
    console.log('');
    showManualInstructions();
    return;
  }
  
  console.log('🔗 Connecting to database...');
  const client = new Client(dbUrl);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    console.log('');
    
    const sqlPath = path.join(__dirname, '../supabase/migrations/2026-01-07_create_stock_balance_function.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📝 Executing migration...');
    console.log('');
    
    await client.query(sqlContent);
    
    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('━'.repeat(72));
    console.log('✨ Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Navigate to Produtos page');
    console.log('   3. Stock balances should load without errors');
    console.log('━'.repeat(72));
    
  } catch (error) {
    console.error('❌ Error applying migration:');
    console.error(error.message);
    console.log('');
    console.log('Try applying manually:');
    showManualInstructions();
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Main execution
if (require.main === module) {
  console.log('🚀 Stock Balance Migration Executor');
  console.log('');
  executeViaPostgres().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { showManualInstructions };
