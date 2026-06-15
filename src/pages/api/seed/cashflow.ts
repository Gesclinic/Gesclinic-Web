/**
 * Temporary API Handler - Task 8 Seed Execution
 * 
 * This creates a quick way to seed test data.
 * Add this to src/pages/api/seed/cashflow.ts
 * 
 * Access via: http://localhost:3000/api/seed/cashflow?clinic_id=XXXXX
 * 
 * SECURITY: Remove this file after testing!
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { supabaseClient } from '@/lib/customSupabaseClient';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  try {
    // Get clinic ID from query
    const url = new URL(`http://${req.headers.host}${req.url}`);
    const clinicId = url.searchParams.get('clinic_id');

    if (!clinicId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'clinic_id parameter required' }));
      return;
    }

    console.log('🌱 Seeding cash flow data for clinic:', clinicId);

    const snapshots = [
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

    const { data, error } = await supabaseClient
      .from('cash_flow_snapshots')
      .insert(snapshots)
      .select();

    if (error) {
      console.error('❌ Error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
      return;
    }

    console.log('✅ Success:', data?.length, 'records inserted');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        message: `Inserted ${data?.length || 0} cash flow snapshots`,
        data: data,
      })
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * SIMPLER APPROACH: Use in Browser Console
 * 
 * 1. Open http://localhost:3000/clinica/financeiro/fluxo-caixa
 * 2. Open DevTools Console (F12)
 * 3. Get clinic ID:
 *    const clinicId = localStorage.getItem('clinic_id');
 *    console.log('Clinic ID:', clinicId);
 * 
 * 4. Execute seed via fetch:
 *    fetch(`/api/seed/cashflow?clinic_id=${clinicId}`, { method: 'POST' })
 *      .then(r => r.json())
 *      .then(data => console.log('✅ Seed result:', data))
 *      .catch(e => console.error('❌ Error:', e));
 * 
 * 5. Refresh page and verify data appears
 */
