/**
 * Supabase Seed Script - Task 8: Cash Flow Test Data
 * 
 * This script inserts test data into the cash_flow_snapshots table
 * for the Neuroclínica Cascavel LTDA clinic to validate component display.
 * 
 * Usage:
 * 1. Add this script to src/lib/seeds/cashflow-seed.ts
 * 2. Import and call from a temporary page or API route
 * 3. Execute: await seedCashFlowData()
 * 4. Refresh browser to see data in components
 */

import { supabaseClient } from '../customSupabaseClient';

interface CashFlowSnapshot {
  clinic_id: string;
  snapshot_date: string;
  total_income: number;
  total_expense: number;
  closing_balance: number;
}

export async function seedCashFlowData(clinicId: string) {
  console.log('🌱 Starting cash flow seed for clinic:', clinicId);

  const snapshots: CashFlowSnapshot[] = [
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-01',
      total_income: 50000,
      total_expense: 30000,
      closing_balance: 20000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-03',
      total_income: 60000,
      total_expense: 35000,
      closing_balance: 45000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-05',
      total_income: 55000,
      total_expense: 40000,
      closing_balance: 60000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-07',
      total_income: 70000,
      total_expense: 45000,
      closing_balance: 85000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-09',
      total_income: 75000,
      total_expense: 50000,
      closing_balance: 110000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-11',
      total_income: 80000,
      total_expense: 55000,
      closing_balance: 135000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-13',
      total_income: 85000,
      total_expense: 60000,
      closing_balance: 160000,
    },
  ];

  try {
    // Insert all snapshots
    const { data, error } = await supabaseClient
      .from('cash_flow_snapshots')
      .insert(snapshots)
      .select();

    if (error) {
      console.error('❌ Error inserting snapshots:', error);
      throw new Error(error.message);
    }

    console.log('✅ Successfully inserted', data?.length || 0, 'snapshots');
    console.log('📊 Data inserted:', data);
    return data;
  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  }
}

export async function clearCashFlowData(clinicId: string) {
  console.log('🗑️ Clearing cash flow data for clinic:', clinicId);

  try {
    const { error } = await supabaseClient
      .from('cash_flow_snapshots')
      .delete()
      .eq('clinic_id', clinicId)
      .gte('snapshot_date', '2026-05-01')
      .lte('snapshot_date', '2026-05-31');

    if (error) {
      console.error('❌ Error clearing data:', error);
      throw new Error(error.message);
    }

    console.log('✅ Cash flow data cleared');
  } catch (err) {
    console.error('❌ Clear failed:', err);
    throw err;
  }
}

/**
 * BROWSER CONSOLE EXECUTION:
 * 
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Execute (get clinicId from context):
 * 
 * import { seedCashFlowData } from '/src/lib/seeds/cashflow-seed.ts';
 * const clinicId = '08f00f17-f33a-4410-ace0-001b64ae0e63';
 * await seedCashFlowData(clinicId);
 * 
 * 4. Refresh page (F5)
 * 5. Components should now display real data
 */
