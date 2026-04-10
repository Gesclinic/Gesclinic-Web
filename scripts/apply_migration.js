#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Get environment variables
const SUPABASE_URL = 'https://gvdkdjyupktlflwurike.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mjc1NzcsImV4cCI6MTc2ODIwMzU3N30.e0D4b0MWdCE0E8Z1rSfJN3G3HG5P0rX0M0Y0Z0A0Z0A';

// Read the SQL migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/2026-01-07_create_stock_balance_function.sql');
const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

console.log('📝 Applying migration: 2026-01-07_create_stock_balance_function.sql');
console.log('🔗 Supabase URL:', SUPABASE_URL);

// Split SQL by semicolons and execute each statement
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Found ${statements.length} SQL statements to execute`);

// Execute using Supabase REST API
async function executeSQL() {
  try {
    // Use the Supabase SQL Editor endpoint
    // We need to call the RPC to execute SQL or use the raw query feature
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
      console.log(`${statement.substring(0, 60)}...`);
      
      // We can't directly execute raw SQL through the REST API
      // We would need to use the service role key and direct database connection
      // Or use psql command line
    }
    
    console.log('\n⚠️  NOTE: To apply this migration, please:');
    console.log('1. Open Supabase Dashboard at:', SUPABASE_URL);
    console.log('2. Go to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the contents of: supabase/migrations/2026-01-07_create_stock_balance_function.sql');
    console.log('5. Click "Run" to execute');
    console.log('\n📋 SQL Content ready to paste:');
    console.log('─'.repeat(80));
    console.log(sqlContent);
    console.log('─'.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeSQL();
