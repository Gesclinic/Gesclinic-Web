import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    console.log('🔍 Checking if RPC returns description field...');
    
    // First, get a valid clinic
    const { data: clinics, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .limit(1);

    if (clinicError || !clinics || clinics.length === 0) {
      console.error('❌ Could not find a clinic');
      process.exit(1);
    }

    const clinicId = clinics[0].id;
    console.log(`📋 Using clinic: ${clinicId}`);
    
    // Get chart of accounts tree
    const { data, error } = await supabase
      .rpc('get_chart_of_accounts_tree', {
        p_clinic_id: clinicId
      });

    if (error) {
      console.error('❌ RPC Error:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No accounts found for this clinic');
      process.exit(0);
    }

    const firstAccount = data[0];
    console.log('\n✅ First account data:');
    console.log(JSON.stringify(firstAccount, null, 2));

    if ('description' in firstAccount) {
      console.log('\n✅ Description field EXISTS in RPC response!');
      console.log(`   Value: "${firstAccount.description}"`);
    } else {
      console.log('\n⚠️  Description field MISSING from RPC response');
      console.log('   Available fields:', Object.keys(firstAccount));
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
