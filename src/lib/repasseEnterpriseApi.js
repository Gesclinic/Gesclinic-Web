import { supabase } from './customSupabaseClient';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toDateOnly(value) {
  if (!value) {
    return null;
  }
  return String(value).split('T')[0];
}

export function getPeriodDates(referenceMonth, referenceYear) {
  const month = String(referenceMonth).padStart(2, '0');
  const periodStart = `${referenceYear}-${month}-01`;
  const periodEndDate = new Date(Number(referenceYear), Number(referenceMonth), 0);
  const periodEnd = `${referenceYear}-${month}-${String(periodEndDate.getDate()).padStart(2, '0')}`;
  return { periodStart, periodEnd };
}

function inPeriod(dateValue, periodStart, periodEnd) {
  const date = toDateOnly(dateValue);
  if (!date) {
    return false;
  }
  return date >= periodStart && date <= periodEnd;
}

function extractAppointmentDate(row) {
  return (
    row?.appointment_date ||
    row?.scheduled_start ||
    row?.start_time ||
    row?.scheduled_at ||
    row?.performed_at ||
    row?.created_at ||
    null
  );
}

async function selectSafe(table, builder) {
  try {
    const query = builder(supabase.from(table));
    const { data, error } = await query;
    if (error) {
      return [];
    }
    return data || [];
  } catch (_err) {
    return [];
  }
}

export async function listRepasseRules(clinicId, ruleType = null) {
  if (!clinicId) {
    return [];
  }

  const rows = await selectSafe('medical_repasse_rules', (q) => {
    let query = q.select('*').eq('clinic_id', clinicId).order('priority', { ascending: true });
    if (ruleType) {
      query = query.eq('rule_type', ruleType);
    }
    return query;
  });

  return rows;
}

export async function upsertRepasseRule(clinicId, payload, actorId = null) {
  const row = {
    clinic_id: clinicId,
    name: payload.name,
    rule_type: payload.rule_type,
    scope_value: payload.scope_value || null,
    professional_id: payload.professional_id || null,
    specialty: payload.specialty || null,
    convenio_id: payload.convenio_id || null,
    procedure_id: payload.procedure_id || null,
    percentage: payload.percentage ?? null,
    fixed_value: payload.fixed_value ?? null,
    progressive_ranges: payload.progressive_ranges || [],
    applies_to: payload.applies_to || 'recebido',
    ceiling_value: payload.ceiling_value ?? null,
    floor_value: payload.floor_value ?? null,
    valid_from: payload.valid_from,
    valid_to: payload.valid_to || null,
    priority: payload.priority ?? 100,
    is_active: payload.is_active !== false,
    notes: payload.notes || null,
    updated_by: actorId,
  };

  if (payload.id) {
    const { data, error } = await supabase
      .from('medical_repasse_rules')
      .update(row)
      .eq('id', payload.id)
      .eq('clinic_id', clinicId)
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data;
  }

  row.created_by = actorId;
  const { data, error } = await supabase.from('medical_repasse_rules').insert(row).select().single();
  if (error) {
    throw error;
  }
  return data;
}

export async function listMedicalProduction({
  clinicId,
  periodStart,
  periodEnd,
  professionalId,
  convenioId,
  specialty,
  unitId,
  procedureId,
  status,
} = {}) {
  if (!clinicId || !periodStart || !periodEnd) {
    return [];
  }

  const appointments = await selectSafe('appointments', (q) =>
    q.select('*').eq('clinic_id', clinicId).limit(5000),
  );

  const filteredAppointments = appointments
    .filter((row) => inPeriod(extractAppointmentDate(row), periodStart, periodEnd))
    .filter((row) => (professionalId ? row.professional_id === professionalId : true))
    .filter((row) => (convenioId ? row.health_insurance_id === convenioId : true));

  const appointmentIds = filteredAppointments.map((row) => row.id).filter(Boolean);

  const services = appointmentIds.length
    ? await selectSafe('appointment_services', (q) =>
        q.select('*').in('appointment_id', appointmentIds).limit(10000),
      )
    : [];

  const invoices = await selectSafe('ar_invoices', (q) =>
    q.select('*').eq('clinic_id', clinicId).limit(5000),
  );

  const receivableMap = new Map();
  for (const inv of invoices) {
    const dateRef = inv.competency_date || inv.invoice_date || inv.due_date || inv.created_at;
    if (!inPeriod(dateRef, periodStart, periodEnd)) {
      continue;
    }
    const key = inv.appointment_id || inv.reference_id || inv.id;
    const prev = receivableMap.get(key) || {
      billed: 0,
      received: 0,
      glosa: 0,
    };
    prev.billed += toNumber(inv.gross_amount ?? inv.amount ?? inv.net_amount);
    prev.received += toNumber(inv.paid_amount ?? inv.received_amount ?? 0);
    prev.glosa += toNumber(inv.glosa_amount ?? inv.denied_amount ?? 0);
    receivableMap.set(key, prev);
  }

  const serviceByAppointment = new Map();
  for (const svc of services) {
    const list = serviceByAppointment.get(svc.appointment_id) || [];
    list.push(svc);
    serviceByAppointment.set(svc.appointment_id, list);
  }

  const rows = [];
  for (const appointment of filteredAppointments) {
    const appointmentServices = serviceByAppointment.get(appointment.id) || [null];

    for (const svc of appointmentServices) {
      const qty = toNumber(svc?.quantity || 1);
      const unitPrice = toNumber(
        svc?.unit_price ?? svc?.price ?? appointment?.amount ?? appointment?.value ?? 0,
      );
      const produced = toNumber(svc?.total_price ?? qty * unitPrice);

      const receivable =
        receivableMap.get(appointment.id) ||
        receivableMap.get(appointment.invoice_id) ||
        receivableMap.get(appointment.id);

      const billed = receivable ? toNumber(receivable.billed) : produced;
      const received = receivable ? toNumber(receivable.received) : 0;
      const glosa = receivable ? toNumber(receivable.glosa) : 0;
      const eligible = Math.max(0, received - glosa);

      rows.push({
        appointment_id: appointment.id,
        professional_id: appointment.professional_id,
        professional_name: appointment.professional_name || appointment.doctor_name || 'N/A',
        patient_name: appointment.patient_name || 'N/A',
        convenio_name: appointment.health_insurance_name || appointment.payer_name || 'Particular',
        procedure_name: svc?.service_name || svc?.description || appointment.service_name || 'Atendimento',
        date: toDateOnly(extractAppointmentDate(appointment)),
        quantity: qty,
        produced_amount: produced,
        billed_amount: billed,
        received_amount: received,
        glosa_amount: glosa,
        eligible_amount: eligible,
        status: appointment.status || 'atendido',
        unit_id: appointment.unit_id || null,
        specialty: appointment.specialty || appointment.professional_specialty || null,
        convenio_id: appointment.health_insurance_id || null,
        procedure_id: svc?.service_id || appointment.service_id || null,
      });
    }
  }

  return rows
    .filter((row) => (specialty ? String(row.specialty || '').toLowerCase() === String(specialty).toLowerCase() : true))
    .filter((row) => (unitId ? row.unit_id === unitId : true))
    .filter((row) => (procedureId ? row.procedure_id === procedureId : true))
    .filter((row) => (status ? String(row.status || '').toLowerCase() === String(status).toLowerCase() : true));
}

function resolveRule(rules, line) {
  const active = (rules || []).filter((rule) => {
    if (!rule.is_active) {
      return false;
    }

    const lineDate = line.date;
    const validFrom = rule.valid_from || '1900-01-01';
    const validTo = rule.valid_to || '2999-12-31';
    if (lineDate && (lineDate < validFrom || lineDate > validTo)) {
      return false;
    }

    if (rule.rule_type === 'individual') {
      return rule.professional_id && rule.professional_id === line.professional_id;
    }
    if (rule.rule_type === 'especialidade') {
      return rule.specialty && rule.specialty === line.specialty;
    }
    if (rule.rule_type === 'convenio') {
      return rule.convenio_id && rule.convenio_id === line.convenio_id;
    }
    if (rule.rule_type === 'procedimento') {
      return rule.procedure_id && rule.procedure_id === line.procedure_id;
    }
    return false;
  });

  if (!active.length) {
    return null;
  }

  active.sort((a, b) => toNumber(a.priority) - toNumber(b.priority));
  return active[0];
}

function ruleBaseAmount(rule, line) {
  const appliesTo = rule?.applies_to || 'recebido';
  // bruto = valor produzido/gerado antes de qualquer desconto
  if (appliesTo === 'produzido' || appliesTo === 'bruto') {
    return toNumber(line.produced_amount);
  }
  if (appliesTo === 'faturado') {
    return toNumber(line.billed_amount);
  }
  // liquido e recebido = valor efetivamente recebido (após glosas/deduções)
  return toNumber(line.received_amount);
}

function calculateLineRepasse(rule, line) {
  const base = ruleBaseAmount(rule, line);
  let gross = 0;
  if (rule?.fixed_value != null) {
    gross = toNumber(rule.fixed_value);
  } else {
    gross = base * (toNumber(rule?.percentage ?? 70) / 100);
  }

  if (rule?.ceiling_value != null) {
    gross = Math.min(gross, toNumber(rule.ceiling_value));
  }
  if (rule?.floor_value != null) {
    gross = Math.max(gross, toNumber(rule.floor_value));
  }

  const discounts = Math.max(0, toNumber(line.glosa_amount));
  const net = Math.max(0, gross - discounts);

  return {
    base,
    gross,
    discounts,
    net,
    percentageApplied:
      rule?.fixed_value != null || base <= 0 ? 0 : (gross / base) * 100,
  };
}

export async function recalculateRepasse({
  clinicId,
  referenceMonth,
  referenceYear,
  actorId = null,
} = {}) {
  if (!clinicId || !referenceMonth || !referenceYear) {
    throw new Error('clinicId, referenceMonth and referenceYear are required');
  }

  const { periodStart, periodEnd } = getPeriodDates(referenceMonth, referenceYear);
  const [rules, lines] = await Promise.all([
    listRepasseRules(clinicId),
    listMedicalProduction({ clinicId, periodStart, periodEnd }),
  ]);

  const grouped = new Map();
  for (const line of lines) {
    const key = `${line.professional_id || 'unknown'}`;
    const current =
      grouped.get(key) || {
        professional_id: line.professional_id,
        specialty: line.specialty || null,
        unit_id: line.unit_id || null,
        convenio_id: line.convenio_id || null,
        procedure_id: line.procedure_id || null,
        production_amount: 0,
        billed_amount: 0,
        received_amount: 0,
        glosa_amount: 0,
        eligible_amount: 0,
        base_amount: 0,
        gross_repasse_amount: 0,
        discounts_amount: 0,
        net_repasse_amount: 0,
        percentage_applied: 0,
        rule_id: null,
        lines: 0,
      };

    const rule = resolveRule(rules, line);
    const calc = calculateLineRepasse(rule, line);

    current.production_amount += toNumber(line.produced_amount);
    current.billed_amount += toNumber(line.billed_amount);
    current.received_amount += toNumber(line.received_amount);
    current.glosa_amount += toNumber(line.glosa_amount);
    current.eligible_amount += toNumber(line.eligible_amount);
    current.base_amount += calc.base;
    current.gross_repasse_amount += calc.gross;
    current.discounts_amount += calc.discounts;
    current.net_repasse_amount += calc.net;
    current.rule_id = current.rule_id || rule?.id || null;
    current.lines += 1;

    grouped.set(key, current);
  }

  const rows = [];
  for (const item of grouped.values()) {
    const percentage = item.base_amount > 0 ? (item.gross_repasse_amount / item.base_amount) * 100 : 0;
    const profitability =
      toNumber(item.received_amount) -
      toNumber(item.net_repasse_amount) -
      toNumber(item.direct_costs_amount) -
      toNumber(item.assistential_costs_amount);

    rows.push({
      clinic_id: clinicId,
      reference_month: Number(referenceMonth),
      reference_year: Number(referenceYear),
      period_start: periodStart,
      period_end: periodEnd,
      professional_id: item.professional_id,
      specialty: item.specialty,
      unit_id: item.unit_id,
      convenio_id: item.convenio_id,
      procedure_id: item.procedure_id,
      rule_id: item.rule_id,
      production_amount: Number(item.production_amount.toFixed(2)),
      billed_amount: Number(item.billed_amount.toFixed(2)),
      received_amount: Number(item.received_amount.toFixed(2)),
      glosa_amount: Number(item.glosa_amount.toFixed(2)),
      eligible_amount: Number(item.eligible_amount.toFixed(2)),
      base_amount: Number(item.base_amount.toFixed(2)),
      percentage_applied: Number(percentage.toFixed(4)),
      gross_repasse_amount: Number(item.gross_repasse_amount.toFixed(2)),
      discounts_amount: Number(item.discounts_amount.toFixed(2)),
      net_repasse_amount: Number(item.net_repasse_amount.toFixed(2)),
      profitability_amount: Number(profitability.toFixed(2)),
      status: 'calculado',
      calculated_by: actorId,
      calculated_at: new Date().toISOString(),
      metadata: { source: 'enterprise_recalc', line_count: item.lines },
    });
  }

  if (!rows.length) {
    return { rows: [], message: 'Sem producao para o periodo' };
  }

  const { data, error } = await supabase
    .from('medical_repasse_calculations')
    .upsert(rows, {
      onConflict: 'clinic_id,professional_id,reference_month,reference_year',
    })
    .select('*');

  if (error) {
    throw error;
  }

  return { rows: data || [] };
}

export async function listRepasseCalculations(clinicId, referenceMonth, referenceYear) {
  if (!clinicId || !referenceMonth || !referenceYear) {
    return [];
  }

  const { data, error } = await supabase
    .from('medical_repasse_calculations')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('reference_month', Number(referenceMonth))
    .eq('reference_year', Number(referenceYear))
    .order('net_repasse_amount', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function transitionRepasseCalculationStatus({
  clinicId,
  calculationId,
  newStatus,
  actorId = null,
  observation = null,
} = {}) {
  if (!clinicId || !calculationId || !newStatus) {
    throw new Error('clinicId, calculationId and newStatus are required');
  }

  const { data, error } = await supabase.rpc('fn_medical_repasse_transition', {
    p_clinic_id: clinicId,
    p_calculation_id: calculationId,
    p_new_status: newStatus,
    p_actor_id: actorId,
    p_observation: observation,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function listMedicalPayables(clinicId, referenceMonth, referenceYear) {
  const rows = await selectSafe('ap_bills', (q) =>
    q
      .select('*')
      .eq('clinic_id', clinicId)
      .or('category.eq.medical_repass,origin_module.eq.medical_repasse,subcategory.eq.repasse_medico')
      .limit(3000),
  );

  const month = Number(referenceMonth);
  const year = Number(referenceYear);

  const filtered = rows.filter((row) => {
    const comp = toDateOnly(row.competency_date || row.due_date || row.created_at);
    if (!comp) {
      return true;
    }
    const [y, m] = comp.split('-').map(Number);
    return y === year && m === month;
  });

  const apBillIds = filtered.map((row) => row.id).filter(Boolean);
  if (!apBillIds.length) {
    return filtered;
  }

  const relatedCalculations = await selectSafe('medical_repasse_calculations', (q) =>
    q
      .select('id, ap_bill_id, professional_id, reference_month, reference_year, status, cost_center_id')
      .eq('clinic_id', clinicId)
      .in('ap_bill_id', apBillIds),
  );

  const calcMap = new Map();
  for (const calc of relatedCalculations) {
    if (calc?.ap_bill_id) {
      calcMap.set(calc.ap_bill_id, calc);
    }
  }

  return filtered.map((row) => {
    const calc = calcMap.get(row.id);
    return {
      ...row,
      professional_id: calc?.professional_id || row.supplier_id || row.vendor_id || null,
      repasse_status: calc?.status || null,
      reference_month: calc?.reference_month || null,
      reference_year: calc?.reference_year || null,
      repasse_cost_center_id: calc?.cost_center_id || row.cost_center_id || null,
      financial_account_id: row.financial_account_id || row.account_id || null,
      pix_key: row.pix_key || row.metadata?.pix_key || null,
    };
  });
}

export async function generateMedicalPayables({
  clinicId,
  referenceMonth,
  referenceYear,
  actorId = null,
} = {}) {
  const calculations = await listRepasseCalculations(clinicId, referenceMonth, referenceYear);
  const pending = calculations.filter((row) => !row.ap_bill_id && toNumber(row.net_repasse_amount) > 0);

  let created = 0;
  const createdItems = [];

  for (const calc of pending) {
    const dueDate = `${referenceYear}-${String(referenceMonth).padStart(2, '0')}-28`;
    const description = `Repasse medico ${String(referenceMonth).padStart(2, '0')}/${referenceYear}`;

    const payload = {
      clinic_id: clinicId,
      supplier_id: calc.professional_id,
      vendor_id: calc.professional_id,
      description,
      amount: calc.net_repasse_amount,
      net_amount: calc.net_repasse_amount,
      balance_amount: calc.net_repasse_amount,
      due_date: dueDate,
      competency_date: `${referenceYear}-${String(referenceMonth).padStart(2, '0')}-01`,
      status: 'OPEN',
      category: 'medical_repass',
      subcategory: 'repasse_medico',
      dre_classification: 'MEDICAL_REPASS',
      cost_center_id: calc.cost_center_id || null,
      metadata: {
        origin_module: 'medical_repasse',
        calculation_id: calc.id,
      },
      created_by: actorId,
    };

    const { data: payable, error } = await supabase.from('ap_bills').insert(payload).select().single();
    if (error) {
      continue;
    }

    await supabase
      .from('medical_repasse_calculations')
      .update({ ap_bill_id: payable.id, status: 'provisionado' })
      .eq('id', calc.id)
      .eq('clinic_id', clinicId);

    created += 1;
    createdItems.push(payable);
  }

  return {
    created,
    totalPending: pending.length,
    payables: createdItems,
  };
}

export async function listApprovalWorkflow(clinicId, referenceMonth, referenceYear) {
  const calculations = await listRepasseCalculations(clinicId, referenceMonth, referenceYear);
  const calcIds = calculations.map((row) => row.id);

  if (!calcIds.length) {
    return [];
  }

  const approvals = await selectSafe('medical_repasse_approvals', (q) =>
    q
      .select('*')
      .eq('clinic_id', clinicId)
      .in('calculation_id', calcIds)
      .order('created_at', { ascending: false }),
  );

  return approvals;
}

export async function approveCalculationStage({ clinicId, calculationId, stage, status, observation, actorId }) {
  const payload = {
    clinic_id: clinicId,
    calculation_id: calculationId,
    stage,
    status,
    approved_by: actorId,
    approved_at: new Date().toISOString(),
    observation: observation || null,
  };

  const { data, error } = await supabase
    .from('medical_repasse_approvals')
    .upsert(payload, { onConflict: 'calculation_id,stage' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listGlosaImpact({ clinicId, periodStart, periodEnd } = {}) {
  const rows = await selectSafe('medical_repasse_glosas', (q) =>
    q.select('*').eq('clinic_id', clinicId).gte('glosa_date', periodStart).lte('glosa_date', periodEnd),
  );

  return rows;
}

export async function getExecutiveDashboard({ clinicId, referenceMonth, referenceYear } = {}) {
  const { periodStart, periodEnd } = getPeriodDates(referenceMonth, referenceYear);

  const [production, calculations, glosas, commissions, payables] = await Promise.all([
    listMedicalProduction({ clinicId, periodStart, periodEnd }),
    listRepasseCalculations(clinicId, referenceMonth, referenceYear),
    listGlosaImpact({ clinicId, periodStart, periodEnd }),
    selectSafe('doctor_commissions', (q) =>
      q
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('reference_month', Number(referenceMonth))
        .eq('reference_year', Number(referenceYear)),
    ),
    listMedicalPayables(clinicId, referenceMonth, referenceYear),
  ]);

  const productionAmount = production.reduce((sum, row) => sum + toNumber(row.produced_amount), 0);
  const revenueProduced = productionAmount;
  const revenueBilled = production.reduce((sum, row) => sum + toNumber(row.billed_amount), 0);
  const revenueReceived = production.reduce((sum, row) => sum + toNumber(row.received_amount), 0);
  const glosaAmount = production.reduce((sum, row) => sum + toNumber(row.glosa_amount), 0);
  const repasseCalculated = calculations.reduce((sum, row) => sum + toNumber(row.gross_repasse_amount), 0);
  const repasseProvisioned = calculations
    .filter((row) => ['provisionado', 'aprovado', 'liberado', 'pago'].includes(row.status))
    .reduce((sum, row) => sum + toNumber(row.net_repasse_amount), 0);
  const repassePaid = payables
    .filter((row) => String(row.status || '').toUpperCase() === 'PAID')
    .reduce((sum, row) => sum + toNumber(row.paid_value || row.net_amount || row.amount), 0);
  const repassePending = Math.max(0, repasseProvisioned - repassePaid);

  const activeDoctors = new Set(production.map((row) => row.professional_id).filter(Boolean)).size;
  const ticketAvg = production.length ? revenueProduced / production.length : 0;
  const marginAmount = revenueReceived - repasseCalculated;
  const avgProfitability = calculations.length
    ? calculations.reduce((sum, row) => sum + toNumber(row.profitability_amount), 0) / calculations.length
    : marginAmount;

  const byDoctor = new Map();
  for (const row of calculations) {
    const key = row.professional_id || 'N/A';
    const item = byDoctor.get(key) || {
      professional_id: row.professional_id,
      produced: 0,
      repasse: 0,
      profitability: 0,
    };
    item.produced += toNumber(row.production_amount);
    item.repasse += toNumber(row.net_repasse_amount);
    item.profitability += toNumber(row.profitability_amount);
    byDoctor.set(key, item);
  }

  const topDoctors = Array.from(byDoctor.values()).sort((a, b) => b.produced - a.produced).slice(0, 10);
  const bottomDoctors = Array.from(byDoctor.values())
    .sort((a, b) => a.profitability - b.profitability)
    .slice(0, 10);

  const bySpecialty = new Map();
  for (const row of production) {
    const key = row.specialty || 'Sem especialidade';
    bySpecialty.set(key, (bySpecialty.get(key) || 0) + toNumber(row.produced_amount));
  }

  const topSpecialties = Array.from(bySpecialty.entries())
    .map(([specialty, amount]) => ({ specialty, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const byConvenio = new Map();
  for (const row of production) {
    const key = row.convenio_name || 'Particular';
    const item = byConvenio.get(key) || { convenio: key, produced: 0, glosa: 0 };
    item.produced += toNumber(row.produced_amount);
    item.glosa += toNumber(row.glosa_amount);
    byConvenio.set(key, item);
  }

  const topConvenios = Array.from(byConvenio.values()).sort((a, b) => b.produced - a.produced).slice(0, 10);

  const topProceduresMap = new Map();
  for (const row of production) {
    const key = row.procedure_name || 'Procedimento';
    topProceduresMap.set(key, (topProceduresMap.get(key) || 0) + toNumber(row.produced_amount));
  }

  const topProcedures = Array.from(topProceduresMap.entries())
    .map(([procedure, amount]) => ({ procedure, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const monthCompare = {
    current: revenueReceived,
    previous: commissions.reduce((sum, row) => sum + toNumber(row.total_paid || row.net_amount), 0),
  };

  const monthlyCalcRows = await selectSafe('medical_repasse_calculations', (q) =>
    q
      .select('reference_year, reference_month, received_amount, net_repasse_amount, gross_repasse_amount')
      .eq('clinic_id', clinicId)
      .gte('reference_year', Number(referenceYear) - 1)
      .order('reference_year', { ascending: true })
      .order('reference_month', { ascending: true })
      .limit(2000),
  );

  const evolutionMap = new Map();
  for (const row of monthlyCalcRows) {
    const key = `${row.reference_year}-${String(row.reference_month).padStart(2, '0')}`;
    const item = evolutionMap.get(key) || {
      period: key,
      received: 0,
      repasse: 0,
      gross_repasse: 0,
    };
    item.received += toNumber(row.received_amount);
    item.repasse += toNumber(row.net_repasse_amount);
    item.gross_repasse += toNumber(row.gross_repasse_amount);
    evolutionMap.set(key, item);
  }

  const evolutionMonthly = Array.from(evolutionMap.values()).slice(-12);

  const repassePaidByPeriodMap = new Map();
  for (const row of payables) {
    const refDate = toDateOnly(row.paid_at || row.payment_date || row.due_date || row.created_at);
    if (!refDate) continue;
    const period = refDate.slice(0, 7);
    repassePaidByPeriodMap.set(
      period,
      (repassePaidByPeriodMap.get(period) || 0) + toNumber(row.paid_value || row.net_amount || row.amount),
    );
  }

  const repassePaidByPeriod = Array.from(repassePaidByPeriodMap.entries())
    .map(([period, amount]) => ({ period, amount }))
    .sort((a, b) => (a.period > b.period ? 1 : -1))
    .slice(-12);

  return {
    kpis: {
      production_month: productionAmount,
      revenue_produced: revenueProduced,
      revenue_billed: revenueBilled,
      revenue_received: revenueReceived,
      repasse_calculated: repasseCalculated,
      repasse_provisioned: repasseProvisioned,
      repasse_paid: repassePaid,
      repasse_pending: repassePending,
      glosa_amount: glosaAmount,
      glosa_percentage: revenueBilled > 0 ? (glosaAmount / revenueBilled) * 100 : 0,
      active_doctors: activeDoctors,
      avg_ticket: ticketAvg,
      medical_margin: marginAmount,
      avg_profitability: avgProfitability,
    },
    charts: {
      evolution_monthly: evolutionMonthly,
      top_doctors: topDoctors,
      top_specialties: topSpecialties,
      top_convenios: topConvenios,
      top_procedures: topProcedures,
      glosa_by_convenio: topConvenios,
      glosa_by_doctor: bottomDoctors,
      repasse_paid_by_period: repassePaidByPeriod,
      month_compare: monthCompare,
    },
  };
}

export async function listRepasseForecasts(clinicId, referenceMonth, referenceYear) {
  if (!clinicId || !referenceMonth || !referenceYear) {
    return [];
  }

  const { periodStart } = getPeriodDates(referenceMonth, referenceYear);
  const start = periodStart;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 365);
  const end = endDate.toISOString().split('T')[0];

  return selectSafe('medical_repasse_forecasts', (q) =>
    q
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('forecast_date', start)
      .lte('forecast_date', end)
      .order('forecast_date', { ascending: true })
      .limit(5000),
  );
}

export async function getMedicalRentability(clinicId, referenceMonth, referenceYear) {
  const rows = await listRepasseCalculations(clinicId, referenceMonth, referenceYear);
  const enriched = rows.map((row) => ({
    ...row,
    margin: toNumber(row.received_amount) - toNumber(row.net_repasse_amount) - toNumber(row.direct_costs_amount) - toNumber(row.assistential_costs_amount),
  }));

  const sortedDesc = [...enriched].sort((a, b) => b.margin - a.margin);
  const sortedAsc = [...enriched].sort((a, b) => a.margin - b.margin);

  return {
    top20: sortedDesc.slice(0, 20),
    bottom20: sortedAsc.slice(0, 20),
    by_professional: enriched,
  };
}

export async function runRepasseSimulation({
  clinicId,
  referenceMonth,
  referenceYear,
  percentage,
  actorId = null,
} = {}) {
  const rows = await listRepasseCalculations(clinicId, referenceMonth, referenceYear);
  const revenueBase = rows.reduce((sum, row) => sum + toNumber(row.received_amount), 0);
  const simulatedRepasse = revenueBase * (toNumber(percentage) / 100);
  const dreImpact = -simulatedRepasse;
  const ebitdaImpact = -simulatedRepasse;
  const netImpact = -simulatedRepasse;
  const cashflowImpact = -simulatedRepasse;

  const payload = {
    clinic_id: clinicId,
    reference_month: Number(referenceMonth),
    reference_year: Number(referenceYear),
    scenario_name: `Simulacao ${percentage}%`,
    repasse_percentage: Number(percentage),
    revenue_base: Number(revenueBase.toFixed(2)),
    simulated_repasse: Number(simulatedRepasse.toFixed(2)),
    dre_impact: Number(dreImpact.toFixed(2)),
    ebitda_impact: Number(ebitdaImpact.toFixed(2)),
    net_income_impact: Number(netImpact.toFixed(2)),
    cashflow_impact: Number(cashflowImpact.toFixed(2)),
    projected_cashflow_impact: Number(cashflowImpact.toFixed(2)),
    created_by: actorId,
    metadata: {
      horizons: [30, 60, 90, 180, 365],
    },
  };

  const { data: rpcData, error: rpcError } = await supabase.rpc('fn_medical_repasse_create_simulation', {
    p_clinic_id: clinicId,
    p_reference_month: Number(referenceMonth),
    p_reference_year: Number(referenceYear),
    p_scenario_name: payload.scenario_name,
    p_repasse_percentage: Number(payload.repasse_percentage),
    p_revenue_base: Number(payload.revenue_base),
    p_simulated_repasse: Number(payload.simulated_repasse),
    p_dre_impact: Number(payload.dre_impact),
    p_ebitda_impact: Number(payload.ebitda_impact),
    p_net_income_impact: Number(payload.net_income_impact),
    p_cashflow_impact: Number(payload.cashflow_impact),
    p_projected_cashflow_impact: Number(payload.projected_cashflow_impact),
    p_actor_id: actorId,
    p_metadata: payload.metadata,
  });

  if (!rpcError && rpcData) {
    return rpcData;
  }

  const { data, error } = await supabase
    .from('medical_repasse_simulations')
    .insert(payload)
    .select()
    .single();

  if (error) {
    const errorText = `${error.code || ''} ${error.message || ''}`.toLowerCase();
    const isRlsError = errorText.includes('row-level security') || error.code === '42501';

    if (isRlsError) {
      return {
        id: `ephemeral-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
        metadata: {
          ...(payload.metadata || {}),
          persisted: false,
          fallback_reason: 'rls_blocked_insert',
        },
      };
    }

    throw error;
  }

  return data;
}

export async function listSimulationHistory(clinicId, referenceMonth, referenceYear) {
  return selectSafe('medical_repasse_simulations', (q) =>
    q
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('reference_month', Number(referenceMonth))
      .eq('reference_year', Number(referenceYear))
      .order('created_at', { ascending: false })
      .limit(20),
  );
}

export async function listMedicalRepasseBankAccounts(clinicId) {
  const custom = await selectSafe('medical_repasse_bank_accounts', (q) =>
    q.select('*').eq('clinic_id', clinicId).order('is_primary', { ascending: false }),
  );

  if (custom.length) {
    return custom;
  }

  const fallback = await selectSafe('bank_accounts', (q) =>
    q.select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
  );

  return fallback.map((row) => ({
    id: row.id,
    clinic_id: row.clinic_id,
    bank_name: row.bank_name || row.bank || 'Banco',
    agency: row.agency || row.branch || '-',
    account_number: row.account_number || row.account || '-',
    account_type: row.account_type || 'conta_corrente',
    pix_key: row.pix_key || null,
    holder_name: row.holder_name || row.account_holder || '-',
    is_active: row.is_active !== false,
    source: 'bank_accounts',
  }));
}

export async function listRepasseAudit(clinicId, limit = 200) {
  return selectSafe('medical_repasse_audit', (q) =>
    q
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(limit),
  );
}
