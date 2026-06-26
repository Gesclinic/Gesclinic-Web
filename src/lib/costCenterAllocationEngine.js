import { supabase } from '@/lib/customSupabaseClient';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Number(toNumber(value).toFixed(2));
}

function rebalanceToTotal(items, targetTotal) {
  const total = round2(items.reduce((sum, item) => sum + toNumber(item.amount), 0));
  const expected = round2(targetTotal);
  const delta = round2(expected - total);

  if (Math.abs(delta) < 0.01 || items.length === 0) return items;

  const adjusted = [...items];
  adjusted[0] = {
    ...adjusted[0],
    amount: round2(toNumber(adjusted[0].amount) + delta),
  };

  return adjusted.filter((item) => toNumber(item.amount) > 0);
}

function distributeByPercent(items, baseAmount) {
  const rows = items
    .map((item) => ({
      target_cost_center_id: item.target_cost_center_id,
      amount: round2(baseAmount * (toNumber(item.percentage) / 100)),
      percentage: toNumber(item.percentage),
      fixed_amount: null,
    }))
    .filter((item) => item.target_cost_center_id && item.amount > 0);

  return rebalanceToTotal(rows, baseAmount);
}

function distributeByFixedValue(items, baseAmount) {
  const raw = items
    .map((item) => ({
      target_cost_center_id: item.target_cost_center_id,
      amount: round2(toNumber(item.fixed_amount)),
      percentage: null,
      fixed_amount: toNumber(item.fixed_amount),
    }))
    .filter((item) => item.target_cost_center_id && item.amount > 0);

  const totalFixed = round2(raw.reduce((sum, item) => sum + item.amount, 0));
  if (totalFixed <= 0) return [];

  // If configured total is greater than launch amount, scale proportionally.
  if (totalFixed > baseAmount) {
    const scaled = raw.map((item) => ({
      ...item,
      amount: round2((item.amount / totalFixed) * baseAmount),
    }));
    return rebalanceToTotal(scaled, baseAmount);
  }

  // If configured total is lower, keep values and caller handles residual.
  return raw;
}

function distributeMixed(items, baseAmount) {
  const prepared = items
    .map((item) => ({
      target_cost_center_id: item.target_cost_center_id,
      percentage: toNumber(item.percentage),
      fixed_amount: toNumber(item.fixed_amount),
    }))
    .filter((item) => item.target_cost_center_id);

  const fixedRows = prepared
    .filter((item) => item.fixed_amount > 0)
    .map((item) => ({
      target_cost_center_id: item.target_cost_center_id,
      amount: round2(item.fixed_amount),
      percentage: item.percentage || null,
      fixed_amount: item.fixed_amount,
    }));

  const fixedTotal = round2(fixedRows.reduce((sum, item) => sum + item.amount, 0));
  const remaining = round2(Math.max(0, baseAmount - fixedTotal));

  const percentItems = prepared.filter((item) => item.percentage > 0);
  const percentBase = percentItems.reduce((sum, item) => sum + item.percentage, 0);

  const percentRows = percentBase > 0
    ? percentItems.map((item) => ({
      target_cost_center_id: item.target_cost_center_id,
      amount: round2(remaining * (item.percentage / percentBase)),
      percentage: item.percentage,
      fixed_amount: item.fixed_amount || null,
    }))
    : [];

  const merged = [...fixedRows, ...percentRows]
    .filter((item) => item.amount > 0)
    .reduce((acc, item) => {
      const existing = acc.find((row) => row.target_cost_center_id === item.target_cost_center_id);
      if (existing) {
        existing.amount = round2(existing.amount + item.amount);
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, []);

  return rebalanceToTotal(merged, baseAmount);
}

function appendResidual(rows, sourceCostCenterId, baseAmount) {
  const current = round2(rows.reduce((sum, row) => sum + toNumber(row.amount), 0));
  const residual = round2(baseAmount - current);
  if (Math.abs(residual) < 0.01) return rows;

  if (!sourceCostCenterId) return rebalanceToTotal(rows, baseAmount);

  const existing = rows.find((row) => row.target_cost_center_id === sourceCostCenterId);
  if (existing) {
    existing.amount = round2(toNumber(existing.amount) + residual);
    return rows.filter((row) => toNumber(row.amount) > 0);
  }

  return [
    ...rows,
    {
      target_cost_center_id: sourceCostCenterId,
      amount: round2(Math.max(0, residual)),
      percentage: null,
      fixed_amount: null,
      residual: true,
    },
  ].filter((row) => toNumber(row.amount) > 0);
}

function normalizeRows(rows) {
  return rows
    .filter((row) => row.target_cost_center_id && toNumber(row.amount) > 0)
    .map((row) => ({
      ...row,
      amount: round2(row.amount),
    }));
}

export async function resolveCostCenterAllocation({ clinicId, sourceCostCenterId, amount }) {
  const baseAmount = round2(amount);
  if (!clinicId || !sourceCostCenterId || baseAmount <= 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('financial_cost_center_allocations')
    .select('id, source_cost_center_id, allocation_method, is_active, items:financial_cost_center_allocation_items(*)')
    .eq('clinic_id', clinicId)
    .eq('source_cost_center_id', sourceCostCenterId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return [
      {
        target_cost_center_id: sourceCostCenterId,
        amount: baseAmount,
        fallback: true,
      },
    ];
  }

  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    return [
      {
        target_cost_center_id: sourceCostCenterId,
        amount: baseAmount,
        fallback: true,
      },
    ];
  }

  const method = String(data.allocation_method || 'PERCENT').toUpperCase();
  let rows = [];

  if (method === 'VALUE') {
    rows = distributeByFixedValue(items, baseAmount);
  } else if (method === 'MIXED') {
    rows = distributeMixed(items, baseAmount);
  } else {
    rows = distributeByPercent(items, baseAmount);
  }

  rows = appendResidual(rows, sourceCostCenterId, baseAmount);
  rows = normalizeRows(rows);

  if (rows.length === 0) {
    return [
      {
        target_cost_center_id: sourceCostCenterId,
        amount: baseAmount,
        fallback: true,
      },
    ];
  }

  return rows;
}
