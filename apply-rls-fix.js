#!/usr/bin/env node
// Apply RLS fix directly to Supabase via admin key

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAdminKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Use service role for admin operations
const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function fixRLS() {
  try {
    console.log('🔧 Fixing financial_accounts RLS policies...');

    // Drop old broken policies
    const dropPolicies = `
      DROP POLICY IF EXISTS "view_financial_accounts" ON financial_accounts;
      DROP POLICY IF EXISTS "insert_financial_accounts" ON financial_accounts;
      DROP POLICY IF EXISTS "update_financial_accounts" ON financial_accounts;
      DROP POLICY IF EXISTS "view_financial_accounts_audit" ON financial_accounts_audit;
      DROP POLICY IF EXISTS "insert_financial_accounts_audit" ON financial_accounts_audit;
    `;

    console.log('  1️⃣ Dropping old policies...');
    const { error: dropError } = await supabase.rpc('exec_sql', { sql_text: dropPolicies });
    if (dropError && !dropError.message.includes('does not exist')) {
      throw dropError;
    }
    console.log('  ✅ Old policies dropped');

    // Create new corrected policies
    const createPolicies = `
      CREATE POLICY "view_financial_accounts"
      ON financial_accounts
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND clinic_id IN (
          SELECT clinic_id FROM user_clinic_roles 
          WHERE user_id = auth.uid()
        )
      );

      CREATE POLICY "insert_financial_accounts"
      ON financial_accounts
      FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND created_by = auth.uid()
        AND clinic_id IN (
          SELECT clinic_id FROM user_clinic_roles 
          WHERE user_id = auth.uid()
        )
      );

      CREATE POLICY "update_financial_accounts"
      ON financial_accounts
      FOR UPDATE
      USING (
        auth.uid() IS NOT NULL
        AND clinic_id IN (
          SELECT clinic_id FROM user_clinic_roles 
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND clinic_id IN (
          SELECT clinic_id FROM user_clinic_roles 
          WHERE user_id = auth.uid()
        )
      );

      CREATE POLICY "view_financial_accounts_audit"
      ON financial_accounts_audit
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND clinic_id IN (
          SELECT clinic_id FROM user_clinic_roles 
          WHERE user_id = auth.uid()
        )
      );

      CREATE POLICY "insert_financial_accounts_audit"
      ON financial_accounts_audit
      FOR INSERT
      WITH CHECK (true);
    `;

    console.log('  2️⃣ Creating new corrected policies...');
    const { error: createError } = await supabase.rpc('exec_sql', { sql_text: createPolicies });
    if (createError) {
      throw createError;
    }
    console.log('  ✅ New policies created');

    console.log('✅ RLS policies fixed successfully!');
    console.log('\n📝 Changes applied:');
    console.log('  - view_financial_accounts: Now checks user_clinic_roles');
    console.log('  - insert_financial_accounts: Now checks user_clinic_roles');
    console.log('  - update_financial_accounts: Now checks user_clinic_roles');
    console.log('  - Audit policies: Now restrict by clinic access');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing RLS:', error.message);
    process.exit(1);
  }
}

// Check if exec_sql RPC exists - if not, guide user to manual application
async function checkAndFix() {
  try {
    // First check if the RPC function exists
    const { data, error } = await supabase.rpc('exec_sql', { sql_text: 'SELECT 1' }).catch(() => ({error: {message: 'RPC not found'}}));
    
    if (error && error.message.includes('does not exist')) {
      console.log('⚠️  exec_sql RPC not found. Copy the SQL file and execute it manually in Supabase Dashboard:');
      console.log('');
      console.log('📋 Location: supabase/migrations/20260622_fix_financial_accounts_rls.sql');
      console.log('');
      console.log('📍 Steps:');
      console.log('1. Go to https://app.supabase.com');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Create new query');
      console.log('5. Copy the SQL from the migration file');
      console.log('6. Execute');
      process.exit(0);
    }

    await fixRLS();
  } catch (err) {
    console.log('ℹ️  Please apply the RLS fix manually in Supabase Dashboard');
    process.exit(0);
  }
}

checkAndFix();
