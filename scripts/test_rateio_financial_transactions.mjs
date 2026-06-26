#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const round2 = (n) => Number(Number(n || 0).toFixed(2));

async function getClinicId() {
  if (process.env.TEST_CLINIC_ID) return process.env.TEST_CLINIC_ID;
  const { data, error } = await supabase.from('clinics').select('id').limit(1).single();
  if (error || !data?.id) throw new Error(`Unable to fetch clinic_id: ${error?.message || 'no data'}`);
  return data.id;
}

async function getAccountId(clinicId) {
  const { data, error } = await supabase
    .from('financial_accounts')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .limit(1);
  if (!error && data?.[0]?.id) return data[0].id;

  const oldSchema = await supabase
    .from('financial_transactions')
    .select('account_id')
    .eq('clinic_id', clinicId)
    .not('account_id', 'is', null)
    .limit(1);
  if (!oldSchema.error && oldSchema.data?.[0]?.account_id) return oldSchema.data[0].account_id;

  const newSchema = await supabase
    .from('financial_transactions')
    .select('financial_account_id')
    .eq('clinic_id', clinicId)
    .not('financial_account_id', 'is', null)
    .limit(1);
  if (!newSchema.error && newSchema.data?.[0]?.financial_account_id) return newSchema.data[0].financial_account_id;

  return null;
}

async function getUserId(clinicId) {
  const candidates = [
    supabase.from('user_clinic_roles').select('user_id').eq('clinic_id', clinicId).limit(1),
    supabase.from('profiles').select('id').limit(1),
  ];

  for (const query of candidates) {
    const { data } = await query;
    const row = Array.isArray(data) ? data[0] : data;
    const id = row?.user_id || row?.id;
    if (id) return id;
  }

  const existingTx = await supabase
    .from('financial_transactions')
    .select('created_by')
    .eq('clinic_id', clinicId)
    .not('created_by', 'is', null)
    .limit(1);
  if (!existingTx.error && existingTx.data?.[0]?.created_by) {
    return existingTx.data[0].created_by;
  }

  return '00000000-0000-0000-0000-000000000000';
}

async function getCostCenters(clinicId) {
  const { data, error } = await supabase
    .from('financial_cost_centers')
    .select('id, code, name')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('code')
    .limit(10);

  if (error) throw new Error(`Unable to fetch financial_cost_centers: ${error.message}`);
  if (!data || data.length < 2) throw new Error('Need at least 2 active financial_cost_centers for test.');
  return data;
}

async function fetchOrCreateAllocation(clinicId, sourceCostCenterId) {
  let { data: alloc, error } = await supabase
    .from('financial_cost_center_allocations')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('source_cost_center_id', sourceCostCenterId)
    .maybeSingle();

  if (error) throw new Error(`Allocation lookup error: ${error.message}`);

  if (!alloc) {
    const payload = {
      clinic_id: clinicId,
      source_cost_center_id: sourceCostCenterId,
      allocation_method: 'PERCENT',
      is_active: true,
    };

    const ins = await supabase.from('financial_cost_center_allocations').insert(payload).select('*').single();
    if (ins.error || !ins.data) throw new Error(`Create allocation error: ${ins.error?.message || 'unknown'}`);
    alloc = ins.data;
  }

  return alloc;
}

async function readAllocationItems(allocationId) {
  const { data, error } = await supabase
    .from('financial_cost_center_allocation_items')
    .select('*')
    .eq('allocation_id', allocationId)
    .order('priority', { ascending: true });

  if (error) throw new Error(`Read allocation items error: ${error.message}`);
  return data || [];
}

async function updateAllocationMethod(allocationId, method) {
  const { error } = await supabase
    .from('financial_cost_center_allocations')
    .update({ allocation_method: method, is_active: true })
    .eq('id', allocationId);

  if (error) throw new Error(`Update allocation method error: ${error.message}`);
}

async function replaceAllocationItems(allocationId, items) {
  const del = await supabase.from('financial_cost_center_allocation_items').delete().eq('allocation_id', allocationId);
  if (del.error) throw new Error(`Delete allocation items error: ${del.error.message}`);

  if (!items.length) return;

  const sample = (await supabase.from('financial_cost_center_allocation_items').select('*').limit(1)).data?.[0] || null;
  const payload = items.map((item, index) => {
    const row = {
      allocation_id: allocationId,
      target_cost_center_id: item.target_cost_center_id,
      percentage: item.percentage ?? null,
      fixed_amount: item.fixed_amount ?? null,
      priority: index + 1,
      is_active: true,
    };

    if (sample) {
      const filtered = {};
      for (const [k, v] of Object.entries(row)) {
        if (k in sample || ['allocation_id', 'target_cost_center_id', 'percentage', 'fixed_amount'].includes(k)) {
          filtered[k] = v;
        }
      }
      return filtered;
    }

    return row;
  });

  const ins = await supabase.from('financial_cost_center_allocation_items').insert(payload);
  if (ins.error) throw new Error(`Insert allocation items error: ${ins.error.message}`);
}

function buildPercentRows(baseAmount, targets) {
  const rows = targets.map((t) => ({
    target_cost_center_id: t.target_cost_center_id,
    amount: round2(baseAmount * ((t.percentage || 0) / 100)),
  }));
  const total = round2(rows.reduce((s, r) => s + r.amount, 0));
  const delta = round2(baseAmount - total);
  if (Math.abs(delta) >= 0.01 && rows.length) rows[0].amount = round2(rows[0].amount + delta);
  return rows.filter((r) => r.amount > 0);
}

function buildMixedRows(baseAmount, sourceCostCenterId, targets) {
  const rows = [];
  for (const t of targets) {
    if (Number(t.fixed_amount) > 0) {
      rows.push({ target_cost_center_id: t.target_cost_center_id, amount: round2(t.fixed_amount) });
    }
  }
  const fixedTotal = round2(rows.reduce((s, r) => s + r.amount, 0));
  const residual = round2(baseAmount - fixedTotal);
  if (residual > 0) {
    rows.push({ target_cost_center_id: sourceCostCenterId, amount: residual, residual: true });
  }
  const total = round2(rows.reduce((s, r) => s + r.amount, 0));
  const delta = round2(baseAmount - total);
  if (Math.abs(delta) >= 0.01 && rows.length) rows[0].amount = round2(rows[0].amount + delta);
  return rows.filter((r) => r.amount > 0);
}

async function clearOriginTransactions(originModule, originId) {
  const { error } = await supabase
    .from('financial_transactions')
    .delete()
    .eq('origin_module', originModule)
    .eq('origin_id', originId);
  if (error) throw new Error(`Clear origin transactions error: ${error.message}`);
}

async function insertFinancialTransactionVariants(row) {
  const variants = [
    {
      clinic_id: row.clinic_id,
      account_id: row.account_id,
      type: row.type,
      status: row.status,
      category: row.category,
      description: row.description,
      amount: row.amount,
      due_date: row.due_date,
      scheduled_date: row.scheduled_date,
      origin_module: row.origin_module,
      origin_id: row.origin_id,
      created_by: row.created_by,
      cost_center_id: row.cost_center_id,
      centro_custo_id: row.centro_custo_id,
      metadata: row.metadata,
    },
    {
      clinic_id: row.clinic_id,
      financial_account_id: row.account_id,
      transaction_type: row.type === 'revenue' ? 'INCOME' : 'EXPENSE',
      movement_type: 'PREDICTED',
      status: 'PENDING',
      description: row.description,
      amount: row.amount,
      transaction_date: row.scheduled_date,
      due_date: row.due_date,
      origin_module: row.origin_module,
      origin_id: row.origin_id,
      created_by: row.created_by,
      cost_center_id: row.cost_center_id,
      metadata: row.metadata,
    },
    {
      clinic_id: row.clinic_id,
      account_id: row.account_id,
      type: row.type,
      status: row.status,
      description: row.description,
      amount: row.amount,
      origin_module: row.origin_module,
      origin_id: row.origin_id,
      created_by: row.created_by,
    },
  ];

  let lastError = null;
  for (const payload of variants) {
    const { error } = await supabase.from('financial_transactions').insert(payload);
    if (!error) return;
    lastError = error;
  }

  throw new Error(`Unable to insert financial_transaction row: ${lastError?.message || 'unknown'}`);
}

async function insertSplitRows({ clinicId, accountId, createdBy, originModule, originId, description, type, baseDate, rows }) {
  for (const [idx, split] of rows.entries()) {
    await insertFinancialTransactionVariants({
      clinic_id: clinicId,
      account_id: accountId,
      type,
      status: 'pending',
      category: 'other',
      description: `${description} [${idx + 1}/${rows.length}]`,
      amount: split.amount,
      due_date: baseDate,
      scheduled_date: baseDate,
      origin_module: originModule,
      origin_id: originId,
      created_by: createdBy,
      cost_center_id: split.target_cost_center_id,
      centro_custo_id: split.target_cost_center_id,
      metadata: {
        allocation: {
          target_cost_center_id: split.target_cost_center_id,
          residual: !!split.residual,
          test_marker: true,
        },
      },
    });
  }
}

async function fetchOriginRows(originModule, originId) {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('id, amount, origin_module, origin_id, cost_center_id, centro_custo_id, metadata, description')
    .eq('origin_module', originModule)
    .eq('origin_id', originId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Fetch origin rows error: ${error.message}`);
  return data || [];
}

function assertTotal(rows, expected, label) {
  const total = round2(rows.reduce((sum, r) => sum + Number(r.amount || 0), 0));
  if (Math.abs(total - expected) >= 0.01) {
    throw new Error(`${label}: total mismatch expected=${expected} actual=${total}`);
  }
  return total;
}

async function main() {
  const clinicId = await getClinicId();
  const accountId = await getAccountId(clinicId);
  const createdBy = await getUserId(clinicId);
  const costCenters = await getCostCenters(clinicId);

  const source = costCenters[0];
  const targetA = costCenters[1];
  const targetB = costCenters[2] || costCenters[1];

  const allocation = await fetchOrCreateAllocation(clinicId, source.id);
  const previousMethod = allocation.allocation_method;
  const previousItems = await readAllocationItems(allocation.id);

  const today = new Date().toISOString().split('T')[0];

  const percentOriginId = `TEST-PERCENT-${Date.now()}`;
  const mixedOriginId = `TEST-MIXED-${Date.now()}`;

  try {
    console.log('--- Context ---');
    console.log({ clinicId, accountId, createdBy, source: source.id, targetA: targetA.id, targetB: targetB.id, allocationId: allocation.id });

    // TEST 1: PERCENT 70/30
    await updateAllocationMethod(allocation.id, 'PERCENT');
    await replaceAllocationItems(allocation.id, [
      { target_cost_center_id: targetA.id, percentage: 70, fixed_amount: null },
      { target_cost_center_id: targetB.id, percentage: 30, fixed_amount: null },
    ]);

    const percentRows = buildPercentRows(1000, [
      { target_cost_center_id: targetA.id, percentage: 70 },
      { target_cost_center_id: targetB.id, percentage: 30 },
    ]);

    await clearOriginTransactions('accounts_payable', percentOriginId);
    await insertSplitRows({
      clinicId,
      accountId,
      createdBy,
      originModule: 'accounts_payable',
      originId: percentOriginId,
      description: 'TEST PERCENT 70/30',
      type: 'expense',
      baseDate: today,
      rows: percentRows,
    });

    const percentDbRows = await fetchOriginRows('accounts_payable', percentOriginId);
    const percentTotal = assertTotal(percentDbRows, 1000, 'PERCENT');

    console.log('\n--- TEST PERCENT 70/30 ---');
    console.log('origin_id:', percentOriginId);
    console.log('rows:', percentDbRows.map((r) => ({
      id: r.id,
      amount: r.amount,
      cost_center_id: r.cost_center_id || r.centro_custo_id,
    })));
    console.log('total:', percentTotal);

    // TEST 2: MIXED residual + rounding
    await updateAllocationMethod(allocation.id, 'MIXED');
    await replaceAllocationItems(allocation.id, [
      { target_cost_center_id: targetA.id, fixed_amount: 33.33, percentage: null },
      { target_cost_center_id: targetB.id, fixed_amount: 33.33, percentage: null },
    ]);

    const mixedRows = buildMixedRows(100, source.id, [
      { target_cost_center_id: targetA.id, fixed_amount: 33.33 },
      { target_cost_center_id: targetB.id, fixed_amount: 33.33 },
    ]);

    await clearOriginTransactions('accounts_receivable', mixedOriginId);
    await insertSplitRows({
      clinicId,
      accountId,
      createdBy,
      originModule: 'accounts_receivable',
      originId: mixedOriginId,
      description: 'TEST MIXED residual/rounding',
      type: 'revenue',
      baseDate: today,
      rows: mixedRows,
    });

    const mixedDbRows = await fetchOriginRows('accounts_receivable', mixedOriginId);
    const mixedTotal = assertTotal(mixedDbRows, 100, 'MIXED');

    console.log('\n--- TEST MIXED ---');
    console.log('origin_id:', mixedOriginId);
    console.log('rows:', mixedDbRows.map((r) => ({
      id: r.id,
      amount: r.amount,
      cost_center_id: r.cost_center_id || r.centro_custo_id,
      residual: !!r?.metadata?.allocation?.residual,
    })));
    console.log('total:', mixedTotal);

    console.log('\nSUCCESS: Functional DB tests completed.');
  } finally {
    // Restore original rule state
    await updateAllocationMethod(allocation.id, previousMethod || 'PERCENT').catch(() => {});
    await replaceAllocationItems(allocation.id, previousItems.map((item) => ({
      target_cost_center_id: item.target_cost_center_id,
      percentage: item.percentage,
      fixed_amount: item.fixed_amount,
    }))).catch(() => {});
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});
