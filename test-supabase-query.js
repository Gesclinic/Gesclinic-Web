#!/usr/bin/env node
// Test Supabase query for financial accounts

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Not authenticated');
      process.exit(1);
    }

    console.log('✅ Authenticated as:', user.email);

    // Get clinic roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_clinic_roles')
      .select('clinic_id')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      process.exit(1);
    }

    const clinicId = roles[0]?.clinic_id;
    if (!clinicId) {
      console.error('No clinic found');
      process.exit(1);
    }

    console.log('✅ Clinic ID:', clinicId);

    // Query financial accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('clinic_id', clinicId);

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError);
      console.error('Error code:', accountsError.code);
      console.error('Error status:', accountsError.status);
      process.exit(1);
    }

    console.log('✅ Accounts found:', accounts.length);
    if (accounts.length > 0) {
      console.log('\nAccounts:');
      accounts.forEach((acc, i) => {
        console.log(`  ${i + 1}. ${acc.account_name} (${acc.bank_name})`);
        console.log(`     Type: ${acc.account_type}, Balance: ${acc.current_balance}`);
      });
    } else {
      console.log('❌ No accounts found for this clinic');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testQuery();
