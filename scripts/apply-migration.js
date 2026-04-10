#!/usr/bin/env node
/**
 * Script para aplicar a migration de stock_balance_function
 * Executa o SQL contra o Supabase usando o cliente oficial
 */

const fs = require('fs');
const path = require('path');

// Importar o cliente Supabase (deve estar instalado)
try {
  require.resolve('@supabase/supabase-js');
} catch (e) {
  console.error('❌ Supabase client not installed.');
  console.error('Run: npm install @supabase/supabase-js');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gvdkdjyupktlflwurike.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mjc1NzcsImV4cCI6MTc2ODIwMzU3N30.e0D4b0MWdCE0E8Z1rSfJN3G3HG5P0rX0M0Y0Z0A0Z0A';

// Get database URL from environment or use default
const DB_URL = process.env.DATABASE_URL || '';

console.log('🔧 Supabase Stock Balance Migration Script');
console.log('━'.repeat(60));

if (!DB_URL) {
  console.log('⚠️  DATABASE_URL not set in environment');
  console.log('');
  console.log('📋 To apply the migration manually:');
  console.log('');
  console.log('1. Open Supabase Dashboard:');
  console.log('   https://gvdkdjyupktlflwurike.supabase.co');
  console.log('');
  console.log('2. Go to SQL Editor');
  console.log('');
  console.log('3. Copy and execute the SQL from:');
  console.log('   supabase/migrations/2026-01-07_create_stock_balance_function.sql');
  console.log('');
  console.log('━'.repeat(60));
  
  // Display the SQL file for manual copy-paste
  const sqlPath = path.join(__dirname, '../supabase/migrations/2026-01-07_create_stock_balance_function.sql');
  if (fs.existsSync(sqlPath)) {
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    console.log('\n📝 SQL to execute:\n');
    console.log(sqlContent);
  }
  
  process.exit(0);
}

// If DATABASE_URL is provided, try to use psql directly
console.log('✅ DATABASE_URL found, attempting to apply migration...');
console.log('');

const { exec } = require('child_process');
const sqlPath = path.join(__dirname, '../supabase/migrations/2026-01-07_create_stock_balance_function.sql');

const cmd = `psql "${DB_URL}" < "${sqlPath}"`;

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error executing migration:');
    console.error(error.message);
    console.error(stderr);
    process.exit(1);
  }
  
  console.log('✅ Migration applied successfully!');
  console.log(stdout);
  
  console.log('');
  console.log('━'.repeat(60));
  console.log('📋 Next steps:');
  console.log('');
  console.log('1. Refresh your browser');
  console.log('2. Test the Produtos (Products) page');
  console.log('3. Verify that stock balances now load correctly');
  console.log('');
  console.log('━'.repeat(60));
});
