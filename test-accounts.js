#!/usr/bin/env node
// Quick test to insert financial accounts into Supabase

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestAccounts() {
  try {
    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Not authenticated:', userError?.message);
      process.exit(1);
    }

    console.log('Authenticated as:', user.email);

    // Get user's clinic_id from user_clinic_roles
    const { data: clinicRoles, error: clinicError } = await supabase
      .from('user_clinic_roles')
      .select('clinic_id')
      .eq('user_id', user.id)
      .limit(1);

    if (clinicError || !clinicRoles?.length) {
      console.error('No clinic found for user:', clinicError?.message);
      process.exit(1);
    }

    const clinicId = clinicRoles[0].clinic_id;
    console.log('Using clinic:', clinicId);

    // Insert test accounts
    const testAccounts = [
      {
        clinic_id: clinicId,
        account_name: 'Conta Corrente Principal',
        bank_name: 'Banco do Brasil',
        account_type: 'CHECKING',
        agency: '1234',
        account_number: '98765-4',
        balance: 10000.00,
        is_default: true,
        status: 'ACTIVE',
      },
      {
        clinic_id: clinicId,
        account_name: 'Conta Poupança',
        bank_name: 'Caixa Econômica Federal',
        account_type: 'SAVINGS',
        agency: '0001',
        account_number: '12345678-9',
        balance: 5000.00,
        is_default: false,
        status: 'ACTIVE',
      },
      {
        clinic_id: clinicId,
        account_name: 'Caixa Geral',
        bank_name: 'Dinheiro em Espécie',
        account_type: 'CASH',
        agency: 'N/A',
        account_number: 'N/A',
        balance: 2000.00,
        is_default: false,
        status: 'ACTIVE',
      },
    ];

    const { data, error } = await supabase
      .from('financial_accounts')
      .insert(testAccounts)
      .select();

    if (error) {
      console.error('Error inserting accounts:', error.message);
      process.exit(1);
    }

    console.log('✅ Inserted accounts:');
    data.forEach(acc => {
      console.log(`  - ${acc.account_name} (${acc.bank_name}) - R$ ${acc.balance}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

insertTestAccounts();
