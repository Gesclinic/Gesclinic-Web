import { supabase } from '@/lib/customSupabaseClient.js';
import { asUuidOrNull, asStringOrNull, asNumberOrNull } from '@/lib/selectUtils';
import { logReceivableCreated, logPaymentReceived } from '@/lib/auditFinancialIntegration.js';
import { classifyPayableForEnterprise } from '@/lib/enterpriseChartOfAccounts';
import { resolveEnterpriseCostCenterId } from '@/lib/enterpriseCostCenters';
import { resolveCostCenterAllocation } from '@/lib/costCenterAllocationEngine';

function invalidateFinanceCaches(clinicId) {
  if (!clinicId) return;
  import('@/services/dashboardDataService')
    .then(({ invalidateDashboardDataCache }) => invalidateDashboardDataCache(clinicId))
    .catch(() => {});
}

/** Normaliza status vindos da UI para o enum do banco */
function normalizeApStatus(s) {
  if (!s) {
    return null;
  }
  const v = String(s).toLowerCase();
  if (['open', 'em aberto', 'pendente', 'aberto'].includes(v)) {
    return 'OPEN';
  }
  if (['paid', 'pago', 'quitado'].includes(v)) {
    return 'PAID';
  }
  if (['canceled', 'cancelado', 'cancelada'].includes(v)) {
    return 'CANCELED';
  }
  if (['partial', 'parcial', 'parcialmente pago'].includes(v)) {
    return 'PARTIAL';
  }
  if (['scheduled', 'agendada', 'agendado', 'programada', 'approved', 'aprovado'].includes(v)) {
    return 'APPROVED';
  }
  if (['overdue', 'vencido', 'vencida'].includes(v)) return 'OVERDUE';
  if (['blocked', 'bloqueado', 'bloqueada'].includes(v)) return 'BLOCKED';
  if (['reversed', 'estornado', 'estornada'].includes(v)) return 'REVERSED';
  return null; // desconhecido -> não manda
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Enriquece registros de contas a pagar com guide_number extraído de XML e dados complementares.
 * Similar a attachLatestGlosas em receivablesApi.js, mantém consistência com Contas a Receber.
 * Extrai guide_number (NF) de metadata.document_extraction se disponível.
 * @param {string} clinicId - ID da clínica
 * @param {array} rows - Registros de ap_bills a enriquecer
 * @returns {array} Registros enriquecidos
 */
async function attachGuideNumberToPayables(clinicId, rows = []) {
  if (!rows?.length) return rows;

  try {
    // Enriquecer cada linha com informações de XML se disponível
    return rows.map((row) => {
      // Extrair guide_number do XML ou usar campo existente
      const extractionFields = row.metadata?.document_extraction?.fields || {};
      return {
        ...row,
        guide_number:
          row.guide_number
          || extractionFields.guide_number
          || extractionFields.invoice_number
          || extractionFields.nf_number
          || extractionFields.numero_nota
          || null,
      };
    });
  } catch (error) {
    console.error('Error enriching payables with guide_number:', error);
    return rows; // Retorna dados originais sem enriquecimento em caso de erro
  }
}

async function resolveAPFinancialAccountId(clinicId, row = {}) {
  if (row.financial_account_id) return row.financial_account_id;
  if (row.account_id) return row.account_id;

  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('id')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) throw error;
    return data?.[0]?.id || null;
  } catch {
    return null;
  }
}

async function insertAPFinancialTransactionVariants(rows) {
  if (!rows.length) return;

  const tryInsert = async (candidateRows) => {
    if (!candidateRows?.length) return { error: new Error('empty rows') };
    return supabase.from('financial_transactions').insert(candidateRows);
  };

  const fullInsert = await tryInsert(rows);
  if (!fullInsert.error) return;

  // Common compatibility path: some schemas do not have metadata/centro_custo_id,
  // but still support cost_center_id and other modern columns.
  const noMetadataRows = rows.map((row) => {
    const { metadata, centro_custo_id, ...rest } = row;
    return rest;
  });
  const noMetadataInsert = await tryInsert(noMetadataRows);
  if (!noMetadataInsert.error) return;

  const oldSchemaRows = rows.map((row) => ({
    clinic_id: row.clinic_id,
    created_by: row.created_by,
    account_id: row.account_id,
    type: row.type,
    status: row.status,
    category: row.category,
    description: row.description,
    amount: row.amount,
    scheduled_date: row.scheduled_date,
    due_date: row.due_date,
    reference_document: row.reference_document,
    notes: row.notes,
    professional_id: row.professional_id,
    origin_module: row.origin_module,
    origin_id: row.origin_id,
    cost_center_id: row.cost_center_id,
  }));

  const { error: oldError } = await supabase.from('financial_transactions').insert(oldSchemaRows);
  if (!oldError) return;

  const newSchemaRows = rows.map((row) => ({
    clinic_id: row.clinic_id,
    financial_account_id: row.financial_account_id,
    created_by: row.created_by,
    updated_by: row.updated_by,
    transaction_type: row.transaction_type,
    movement_type: row.movement_type,
    description: row.description,
    amount: row.amount,
    status: String(row.status || '').toUpperCase(),
    transaction_date: row.transaction_date,
    due_date: row.due_date,
    competency_date: row.competency_date,
    document_number: row.document_number,
    origin_module: row.origin_module,
    origin_id: row.origin_id,
    cost_center_id: row.cost_center_id,
    is_reconciled: false,
    notes: row.notes,
  }));

  const { error: newError } = await supabase.from('financial_transactions').insert(newSchemaRows);
  if (newError) throw fullInsert.error;
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getAPMovementMeta(row = {}) {
  const normalizedStatus = String(normalizeApStatus(row.status) || row.status || '').toUpperCase();
  if (normalizedStatus === 'PAID' || normalizedStatus === 'PARTIAL') {
    return { status: normalizedStatus === 'PAID' ? 'paid' : 'partial', movementType: 'REALIZED' };
  }
  if (normalizedStatus === 'CANCELED' || normalizedStatus === 'REVERSED') {
    return { status: 'canceled', movementType: 'REALIZED' };
  }
  return { status: 'scheduled', movementType: 'PREDICTED' };
}

export async function syncAPFinancialTransactions(row) {
  if (!row?.clinic_id || !row?.id) return;

  try {
    const accountId = await resolveAPFinancialAccountId(row.clinic_id, row);
    const userId = await getCurrentUserId();
    if (!userId) return;

    await supabase
      .from('financial_transactions')
      .delete()
      .in('origin_module', ['accounts_payable', 'contas_pagar', 'ap_bills'])
      .eq('origin_id', row.id);

    const amount = round2(Number(row.amount || 0));
    if (amount <= 0) return;

    const sourceCostCenterId = row.cost_center_id || row.centro_custo_id || null;
    const allocation = sourceCostCenterId
      ? await resolveCostCenterAllocation({
        clinicId: row.clinic_id,
        sourceCostCenterId,
        amount,
      })
      : [];

    const effectiveAllocation = allocation.length > 0
      ? allocation
      : [{ target_cost_center_id: sourceCostCenterId, amount }];

    const movement = getAPMovementMeta(row);
    const transactionDate = String(
      row.paid_at || row.due_date || row.issue_date || new Date().toISOString(),
    ).split('T')[0];
    const competencyDate = String(row.competency_date || row.issue_date || row.due_date || transactionDate).split('T')[0];
    const documentNumber = row.document_number || null;
    const description = row.description || row.vendor_name || 'Conta a pagar';

    const rows = effectiveAllocation
      .filter((item) => item?.target_cost_center_id && Number(item.amount || 0) > 0)
      .map((item) => ({
        clinic_id: row.clinic_id,
        ...(accountId ? { financial_account_id: accountId, account_id: accountId } : {}),
        created_by: userId,
        updated_by: userId,
        type: 'expense',
        category: 'operational_expense',
        transaction_type: 'EXPENSE',
        movement_type: movement.movementType,
        status: movement.status,
        description: `Conta a pagar - ${description}`,
        amount: round2(item.amount),
        transaction_date: transactionDate,
        scheduled_date: row.due_date || transactionDate,
        due_date: row.due_date || transactionDate,
        competency_date: competencyDate,
        reference_document: documentNumber,
        document_number: documentNumber,
        origin_module: 'accounts_payable',
        origin_id: row.id,
        cost_center_id: item.target_cost_center_id,
        centro_custo_id: item.target_cost_center_id,
        is_reconciled: false,
        notes: 'Despesa originada em contas a pagar com rateio de centro de custo',
        metadata: {
          allocation: {
            applied: true,
            target_cost_center_id: item.target_cost_center_id,
            source: 'cost_center_allocation_rule',
          },
        },
      }));

    await insertAPFinancialTransactionVariants(rows);
  } catch (error) {
    console.warn('syncAPFinancialTransactions failed:', error?.message || error);
  }
}

/* =========================
   AP (Contas a Pagar)
   ========================= */

export async function listAP({ clinicId, statusText = null, limit = 50, offset = 0 }) {
  const { data, error } = await supabase.rpc('list_ap_bills', {
    p_clinic_id: clinicId,
    // null ou "" = sem filtro; se vier 'pago' etc, normalizamos
    p_status_text: normalizeApStatus(statusText) ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error('listAP error:', error);
    throw error;
  }
  return data ?? [];
}

// Consulta direta na tabela com filtros opcionais
export async function listAPQuery({
  clinicId,
  statusText = null,
  statusList = null,
  vendor = null,
  paymentMethod = null,
  start = null,
  end = null,
  search = null,
  searchAmountEq = null,
  searchDateIso = null,
  amountMin = null,
  amountMax = null,
  categoryId = null,
  orderBy = 'due_date',
  orderDir = 'asc',
  limit = 100,
  offset = 0,
} = {}) {
  const useCategoryView = orderBy === 'category_name';
  let query = supabase
    .from(useCategoryView ? 'ap_bills_with_category' : 'ap_bills')
    .select('*')
    .eq('clinic_id', clinicId)
    .order(orderBy || 'due_date', { ascending: String(orderDir).toLowerCase() !== 'desc' })
    .range(offset, offset + limit - 1);

  if (Array.isArray(statusList) && statusList.length > 0) {
    const normalized = Array.from(new Set(statusList.map(normalizeApStatus).filter(Boolean)));
    if (normalized.length > 0) {
      query = query.in('status', normalized);
    }
  } else {
    const normStatus = normalizeApStatus(statusText);
    if (normStatus) {
      query = query.eq('status', normStatus);
    }
  }
  if (vendor && vendor.trim()) {
    query = query.ilike('vendor_name', `%${vendor.trim()}%`);
  }
  if (paymentMethod && paymentMethod.trim()) {
    query = query.ilike('payment_method', `%${paymentMethod.trim()}%`);
  }
  if (start) {
    query = query.gte('due_date', start);
  }
  if (end) {
    query = query.lte('due_date', end);
  }
  if (search && search.trim()) {
    const pat = `%${search.trim()}%`;
    // Filtra por descrição OU fornecedor OU notas OU método de pagamento
    query = query.or(
      `description.ilike.${pat},vendor_name.ilike.${pat},notes.ilike.${pat},payment_method.ilike.${pat}`,
    );
  }
  if (searchDateIso) {
    // Match exato por data em due_date OU issue_date
    query = query.or(`due_date.eq.${searchDateIso},issue_date.eq.${searchDateIso}`);
  }
  if (searchAmountEq !== null && searchAmountEq !== undefined && searchAmountEq !== '') {
    const num = Number(searchAmountEq);
    if (!Number.isNaN(num)) {
      query = query.eq('amount', num);
    }
  }
  if (amountMin !== null && amountMin !== undefined && amountMin !== '') {
    query = query.gte('amount', Number(amountMin));
  }
  if (amountMax !== null && amountMax !== undefined && amountMax !== '') {
    query = query.lte('amount', Number(amountMax));
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('listAPQuery error:', error);
    throw new Error(error.message);
  }
  
  // Enriquecer dados com guide_number e informações de XML
  return attachGuideNumberToPayables(clinicId, data ?? []);
}

export async function createAP(clinicId, payload) {
  const classification = await classifyPayableForEnterprise(clinicId, payload, { strict: true });
  const resolvedCostCenterId = await resolveEnterpriseCostCenterId(clinicId, payload, 'payable');
  const status = normalizeApStatus(payload.status) || 'open';

  // Construir base obrigatória
  const baseInsert = {
    clinic_id: clinicId,
    category_id: asUuidOrNull(payload.category_id || classification.categoryId),
    method_id: asUuidOrNull(payload.method_id),
    vendor_name: asStringOrNull(payload.vendor_name),
    description: asStringOrNull(payload.description),
    due_date: payload.due_date,
    issue_date: payload.issue_date ?? null,
    amount: asNumberOrNull(payload.amount) ?? 0,
    notes: asStringOrNull(payload.notes),
    status,
    document_url: asStringOrNull(payload.document_url),
  };

  if (!baseInsert.category_id) {
    throw new Error('Conta a pagar sem vínculo de conta contábil no plano ERP.');
  }

  if (!resolvedCostCenterId) {
    throw new Error('Conta a pagar sem centro de custo. Configure o Centro de Custos ERP e tente novamente.');
  }

  // Tentar com campos opcionais (installments, payment_method)
  const toInsert = {
    ...baseInsert,
    installments: payload.installments ? parseInt(payload.installments, 10) : 1,
    payment_method: payload.payment_method,
    document_number: payload.document_number,
    ir_pct: typeof payload.ir_pct !== 'undefined' ? Number(payload.ir_pct) : null,
    csll_pct: typeof payload.csll_pct !== 'undefined' ? Number(payload.csll_pct) : null,
    pis_cofins_pct:
      typeof payload.pis_cofins_pct !== 'undefined' ? Number(payload.pis_cofins_pct) : null,
    iss_pct: typeof payload.iss_pct !== 'undefined' ? Number(payload.iss_pct) : null,
    icms_pct: typeof payload.icms_pct !== 'undefined' ? Number(payload.icms_pct) : null,
    taxes_retained: typeof payload.taxes_retained !== 'undefined' ? !!payload.taxes_retained : null,
    // Campos de vínculo para repasse médico (opcionais)
    repasse_doctor_name: payload.repasse_doctor_name || null,
    linked_invoice_id: payload.linked_invoice_id || null,
    linked_service: payload.linked_service || null,
    linked_revenue:
      typeof payload.linked_revenue !== 'undefined' ? Number(payload.linked_revenue) : null,
    cost_center_id: asUuidOrNull(payload.cost_center_id || payload.centro_custo_id || resolvedCostCenterId),
    centro_custo_id: asUuidOrNull(payload.centro_custo_id || payload.cost_center_id || resolvedCostCenterId),
  };

  console.log('Tentando criar AP com:', toInsert);

  // Validar categoria: somente contas de nível 2 (com parent_id) são lançáveis
  try {
    if (baseInsert.category_id) {
      const plans = await listAccountPlans(clinicId);
      const cat = (plans || []).find((p) => p.id === baseInsert.category_id);
      if (cat && !cat?.parent_id) {
        baseInsert.category_id = null; // não lançável, ignora
      }
    }
  } catch {}
  // Aplicar eventual correção também no objeto com campos opcionais
  toInsert.category_id = baseInsert.category_id;

  const { data, error } = await supabase.from('ap_bills').insert(toInsert).select().single();

  // Se houver erro de coluna faltante, tenta novamente com apenas campos base
  if (error) {
    const errorStr = String(error?.message || error?.details || '').toLowerCase();
    const isMissingColumn =
      error.code === '42703' ||
      errorStr.includes('could not find') ||
      errorStr.includes('column does not exist') ||
      errorStr.includes('installments') ||
      errorStr.includes('payment_method') ||
      errorStr.includes('document_number') ||
      errorStr.includes('document_url');

    if (isMissingColumn) {
      console.warn(
        'Coluna opcional não existe, tentando sem installments/payment_method:',
        error.message,
      );

      const { data: data2, error: error2 } = await supabase
        .from('ap_bills')
        .insert(
          (() => {
            const { document_url, ...rest } = baseInsert;
            return rest;
          })(),
        )
        .select()
        .single();

      if (error2) {
        console.error('createAP fallback error:', error2);
        throw new Error(error2.message);
      }
      console.log('AP criada com fallback:', data2);
      await syncAPFinancialTransactions(data2);
      invalidateFinanceCaches(clinicId);
      return data2;
    }

    // Se não é erro de coluna, é outro erro
    console.error('createAP error:', error);
    throw new Error(error.message);
  }

  console.log('AP criada com sucesso:', data);
  // Se houver itens estruturados, cria registros em ap_items
  try {
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length > 0) {
      const shaped = items.map((it) => ({
        ap_bill_id: data.id,
        clinic_id: clinicId,
        stock_item_id: it.productId || it.stock_item_id || null,
        name: it.name || it.product_name || 'Produto',
        qty: Number(it.qty || 0),
        unit_value: Number(it.unit || it.unit_value || 0),
        total_value: Number(
          (Number(it.qty || 0) * Number(it.unit || it.unit_value || 0)).toFixed(2),
        ),
      }));
      // Remove itens anteriores (em caso de reexecução), então insere
      await supabase.from('ap_items').delete().eq('ap_bill_id', data.id);
      if (shaped.length > 0) {
        const ins = await supabase.from('ap_items').insert(shaped).select();
        if (ins.error) {
          console.warn('Falha ao inserir ap_items:', ins.error.message);
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao criar ap_items:', e?.message || e);
  }
  await syncAPFinancialTransactions(data);
  invalidateFinanceCaches(clinicId);
  return data;
}

export async function updateAP(id, patch) {
  const upd = { ...patch };

  // Normalize qualquer status vindo da UI (ex.: 'pago' -> 'paid')
  if (typeof upd.status !== 'undefined') {
    const norm = normalizeApStatus(upd.status);
    if (norm) {
      upd.status = norm;
    } else {
      delete upd.status;
    }
  }

  // Garante tipos numéricos/datas se vierem do formulário
  if ('amount' in upd) {
    upd.amount = asNumberOrNull(upd.amount);
  }
  if ('paid_amount' in upd) {
    upd.paid_amount = asNumberOrNull(upd.paid_amount);
  }
  if ('due_date' in upd && upd.due_date === '') {
    delete upd.due_date;
  }
  if ('category_id' in upd) {
    upd.category_id = asUuidOrNull(upd.category_id);
  }
  if ('method_id' in upd) {
    upd.method_id = asUuidOrNull(upd.method_id);
  }
  if ('ir_pct' in upd) {
    upd.ir_pct = asNumberOrNull(upd.ir_pct);
  }
  if ('csll_pct' in upd) {
    upd.csll_pct = asNumberOrNull(upd.csll_pct);
  }
  if ('pis_cofins_pct' in upd) {
    upd.pis_cofins_pct = asNumberOrNull(upd.pis_cofins_pct);
  }
  if ('iss_pct' in upd) {
    upd.iss_pct = asNumberOrNull(upd.iss_pct);
  }
  if ('icms_pct' in upd) {
    upd.icms_pct = asNumberOrNull(upd.icms_pct);
  }

  const { data, error } = await supabase.from('ap_bills').update(upd).eq('id', id).select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  await syncAPFinancialTransactions(data[0]);
  invalidateFinanceCaches(data[0].clinic_id);
  return data[0];

  if (!error) {
    return data;
  }

  // Gracefully handle optional/missing columns across environments
  const errorStr = String(error?.message || error?.details || '').toLowerCase();
  const optionalCols = [
    'installments',
    'payment_method',
    'document_number',
    'document_url',
    'ir_pct',
    'csll_pct',
    'pis_cofins_pct',
    'iss_pct',
    'icms_pct',
    'taxes_retained',
    'method_id',
    // Repasse linkage optional columns
    'repasse_doctor_name',
    'linked_invoice_id',
    'linked_service',
    'linked_revenue',
    'cost_center_id',
    'centro_custo_id',
  ];
  const looksLikeMissingCol =
    error.code === '42703' ||
    errorStr.includes('column does not exist') ||
    errorStr.includes('could not find') ||
    optionalCols.some((c) => errorStr.includes(c));

  if (looksLikeMissingCol) {
    // Remove any optional columns from the patch and retry
    const fallback = { ...upd };
    for (const key of optionalCols) {
      if (key in fallback) {
        delete fallback[key];
      }
    }
    // If nothing changed, rethrow original error
    const changed = Object.keys(upd).length !== Object.keys(fallback).length;
    if (!changed) {
      console.error('updateAP error (no optional columns to strip):', error);
      throw new Error(error.message);
    }

    const res = await supabase.from('ap_bills').update(fallback).eq('id', id).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
    if (res.error) {
      console.error('updateAP fallback error:', res.error);
      throw new Error(res.error.message);
    }
    return res.data;
  }

  // Foreign key error on category_id: retry without updating it
  const isFkCategory =
    error.code === '23503' ||
    errorStr.includes('foreign key') ||
    errorStr.includes('ap_bills_category_id_fkey');
  if (isFkCategory && 'category_id' in upd) {
    const { category_id, ...fallback } = upd;
    const res = await supabase.from('ap_bills').update(fallback).eq('id', id).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
    if (res.error) {
      console.error('updateAP fk fallback error:', res.error);
      throw new Error(res.error.message);
    }
    return res.data;
  }

  console.error('updateAP error:', error);
  throw new Error(error.message);
}

export async function deleteAP(id) {
  const { data: existing } = await supabase.from('ap_bills').select('clinic_id').eq('id', id).maybeSingle();
  await supabase
    .from('financial_transactions')
    .delete()
    .in('origin_module', ['accounts_payable', 'contas_pagar', 'ap_bills'])
    .eq('origin_id', id);

  const { error } = await supabase.from('ap_bills').delete().eq('id', id);
  if (error) {
    console.error('deleteAP error:', error);
    throw new Error(error.message);
  }
  invalidateFinanceCaches(existing?.clinic_id);
}

// Atualização em lote por IDs
export async function updateAPBulk(ids, patch) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { updated: 0 };
  }
  const upd = { ...patch };
  if (typeof upd.status !== 'undefined') {
    const norm = normalizeApStatus(upd.status);
    if (norm) {
      upd.status = norm;
    } else {
      delete upd.status;
    }
  }
  if ('amount' in upd) {
    upd.amount = asNumberOrNull(upd.amount);
  }
  if ('paid_amount' in upd) {
    upd.paid_amount = asNumberOrNull(upd.paid_amount);
  }

  const { data, error } = await supabase.from('ap_bills').update(upd).in('id', ids).select();

  if (error) {
    console.error('updateAPBulk error:', error);
    throw new Error(error.message);
  }
  await Promise.all((data || []).map((row) => syncAPFinancialTransactions(row)));
  return { updated: (data || []).length };
}

export async function deleteAPBulk(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { deleted: 0 };
  }
  const { data: existing } = await supabase.from('ap_bills').select('clinic_id').in('id', ids).limit(1);
  await supabase
    .from('financial_transactions')
    .delete()
    .in('origin_module', ['accounts_payable', 'contas_pagar', 'ap_bills'])
    .in('origin_id', ids);

  const { error, count } = await supabase.from('ap_bills').delete({ count: 'exact' }).in('id', ids);
  if (error) {
    console.error('deleteAPBulk error:', error);
    throw new Error(error.message);
  }
  invalidateFinanceCaches(existing?.[0]?.clinic_id);
  return { deleted: count ?? ids.length };
}

// RPC: Batch payment via server function
export async function payAccountsPayableBatch(ids, paymentDateISO, paymentMethod) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: true, updated: 0 };
  }
  const { data, error } = await supabase.rpc('pay_accounts_payable_batch', {
    p_ids: ids,
    p_payment_date: paymentDateISO,
    p_payment_method: paymentMethod,
  });
  if (error) {
    console.error('payAccountsPayableBatch error:', error);
    throw new Error(error.message);
  }

  const { data: paidRows } = await supabase.from('ap_bills').select('*').in('id', ids);
  await Promise.all((paidRows || []).map((row) => syncAPFinancialTransactions(row)));

  return { ok: true };
}

function flattenChartOfAccountsTree(nodes = [], parentName = '') {
  return (nodes || []).flatMap((node) => {
    const { children = [], ...account } = node || {};
    return [
      { ...account, parentName },
      ...flattenChartOfAccountsTree(children, account.name || parentName),
    ];
  });
}

async function fetchStandardChartOfAccounts(clinicId) {
  if (!clinicId) return [];

  try {
    const { data, error } = await supabase.rpc('get_chart_of_accounts_tree', {
      p_clinic_id: clinicId,
    });

    if (error) throw error;

    const flattened = flattenChartOfAccountsTree(Array.isArray(data) ? data : []);
    if (flattened.length > 0) {
      return flattened;
    }
  } catch (error) {
    console.warn('fetchStandardChartOfAccounts rpc fallback:', error?.message || error);
  }

  const tableCandidates = ['financial_chart_of_accounts', 'chart_of_accounts'];

  for (const tableName of tableCandidates) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;

      if ((data || []).length > 0) {
        return data || [];
      }
    } catch (error) {
      console.warn(`fetchStandardChartOfAccounts ${tableName} fallback:`, error?.message || error);
    }
  }

  return [];
}

// Plano de Contas (source of truth: enterprise tree)
export async function listAccountPlans(clinicId) {
  return fetchStandardChartOfAccounts(clinicId);
}

function isRevenueAccount(account) {
  const rawType = String(account?.type || account?.account_type || '').toLowerCase();
  return ['revenue', 'income', 'receita', 'receitas', 'entrada', 'inflow'].includes(rawType);
}

function isPostableAccount(account) {
  if ('active' in account && account.active === false) {
    return false;
  }
  if ('is_active' in account && account.is_active === false) {
    return false;
  }
  if ('parent_id' in account) {
    return !!account.parent_id;
  }
  return true;
}

export async function listRevenueAccountPlans(clinicId) {
  try {
    const plans = await listAccountPlans(clinicId);
    const revenuePlans = (plans || []).filter((account) => isRevenueAccount(account) && isPostableAccount(account));
    if (revenuePlans.length > 0) {
      return revenuePlans;
    }
  } catch (error) {
    console.warn('listRevenueAccountPlans standard fallback:', error?.message || error);
  }

  return [];
}

// Optional helpers: Cost Centers and Finance Accounts (gracefully no-op if tables don't exist)
export async function listCostCenters(clinicId) {
  try {
    const { data, error } = await supabase
      .from('financial_cost_centers')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('code', { ascending: true });
    if (error) {
      throw error;
    }
    return data || [];
  } catch (e) {
    console.warn('listCostCenters unavailable:', e?.message || e);
    return [];
  }
}

export async function listFinanceAccounts(clinicId) {
  // Try finance_accounts; fallback to bank_accounts
  try {
    const { data, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');
    if (error) {
      throw error;
    }
    return data || [];
  } catch (e1) {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');
      if (error) {
        throw error;
      }
      return data || [];
    } catch (e2) {
      console.warn('listFinanceAccounts unavailable:', e2?.message || e1?.message || e2);
      return [];
    }
  }
}

// Criar nova conta bancária/financeira
export async function createFinanceAccount(clinicId, payload) {
  const { data, error } = await supabase
    .from('finance_accounts')
    .insert({
      clinic_id: clinicId,
      name: payload.name,
      description: payload.description || null,
      account_type: payload.account_type || 'bank',
    })
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];

  if (error) {
    throw error;
  }
  return data;
}

// Atualizar conta bancária/financeira
export async function updateFinanceAccount(accountId, payload) {
  const { data, error } = await supabase
    .from('finance_accounts')
    .update({
      name: payload.name,
      description: payload.description || null,
      account_type: payload.account_type || 'bank',
    })
    .eq('id', accountId)
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];

  if (error) {
    throw error;
  }
  return data;
}

// Deletar conta bancária/financeira
export async function deleteFinanceAccount(accountId) {
  const { error } = await supabase.from('finance_accounts').delete().eq('id', accountId);

  if (error) {
    throw error;
  }
  return true;
}

// Lista nomes de fornecedores distintos para a clínica
export async function listVendorNames(clinicId) {
  const { data, error } = await supabase
    .from('ap_bills')
    .select('vendor_name')
    .eq('clinic_id', clinicId)
    .order('vendor_name');
  if (error) {
    throw new Error(error.message);
  }
  const seen = new Set();
  const names = [];
  for (const row of data || []) {
    const name = (row.vendor_name || '').trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

// Lista métodos de pagamento distintos para a clínica
export async function listPaymentMethods(clinicId) {
  const { data, error } = await supabase
    .from('ap_bills')
    .select('payment_method')
    .eq('clinic_id', clinicId)
    .order('payment_method');
  if (error) {
    throw new Error(error.message);
  }
  const seen = new Set();
  const methods = [];
  for (const row of data || []) {
    const m = (row.payment_method || '').trim();
    if (m && !seen.has(m)) {
      seen.add(m);
      methods.push(m);
    }
  }
  return methods;
}

// Lista básica de faturas para vincular receita ao repasse
export async function listInvoicesBasic(clinicId, { limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, total, due_date, status, patient:patients(name)')
    .eq('clinic_id', clinicId)
    .order('due_date', { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(error.message);
  }
  return (data || []).map((r) => ({
    id: r.id,
    label: `${r.patient?.name || 'N/A'} • ${r.due_date || ''} • R$ ${Number(r.total || 0).toFixed(2)}`,
    total: r.total,
    due_date: r.due_date,
  }));
}

/* =========================
   AP Itens (Produtos da NF)
   ========================= */

export async function listAPItems(apBillId) {
  const { data, error } = await supabase
    .from('ap_items')
    .select('*')
    .eq('ap_bill_id', apBillId)
    .order('name');
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

// Busca uma única conta a pagar por ID
export async function getAPById(id) {
  const { data, error } = await supabase.from('ap_bills').select('*').eq('id', id);

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function replaceAPItems(apBillId, clinicId, items) {
  const rows = Array.isArray(items) ? items : [];
  // Delete then insert for simplicity
  const del = await supabase.from('ap_items').delete().eq('ap_bill_id', apBillId);
  if (del.error) {
    throw new Error(del.error.message);
  }
  if (rows.length === 0) {
    return { inserted: 0 };
  }
  const shaped = rows
    .map((it) => ({
      ap_bill_id: apBillId,
      clinic_id: clinicId,
      stock_item_id: it.productId || it.stock_item_id || null,
      name: it.name || it.product_name || 'Produto',
      qty: Number(it.qty || 0),
      unit_value: Number(it.unit || it.unit_value || 0),
      total_value: Number((Number(it.qty || 0) * Number(it.unit || it.unit_value || 0)).toFixed(2)),
    }))
    .filter((r) => r.qty > 0 && r.unit_value >= 0);
  const ins = await supabase.from('ap_items').insert(shaped).select();
  if (ins.error) {
    throw new Error(ins.error.message);
  }
  return { inserted: (ins.data || []).length };
}

/* =========================
   Recurring Accounts Payable
   ========================= */

export async function createRecurringAP(clinicId, payload) {
  const row = {
    supplier_id: payload.supplier_id || null,
    description: payload.description || null,
    value: typeof payload.value !== 'undefined' ? Number(payload.value) : null,
    frequency: payload.frequency || 'monthly',
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
    chart_account_id: payload.chart_account_id || null,
    cost_center: payload.cost_center || null,
    payment_method: payload.payment_method || null,
    active: typeof payload.active === 'boolean' ? payload.active : true,
    clinic_id: clinicId,
  };

  try {
    const { data, error } = await supabase.from('recurring_accounts_payable').insert(row).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    // Se a tabela ainda não existir, apenas loga e segue sem travar a criação da conta
    console.warn('createRecurringAP error:', error?.message || error);
    return null;
  }
}

/* =========================
   AR (Receber) – mantive seu código
   ========================= */

export async function listAR({ clinicId, start = null, end = null, status = null } = {}) {
  let query = supabase
    .from('invoices')
    .select('*, patient:patients(name)')
    .eq('clinic_id', clinicId);

  if (start) {
    query = query.gte('due_date', start);
  }
  if (end) {
    query = query.lte('due_date', end);
  }
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((inv) => ({
    id: inv.id,
    customer_name: inv.patient?.name || 'N/A',
    description: `Fatura #${inv.id.substring(0, 4)}`,
    due_date: inv.due_date,
    amount: inv.total,
    status: inv.status,
  }));
}

export async function createAR(clinicId, payload) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      clinic_id: clinicId,
      amount: asNumberOrNull(payload.amount) ?? 0,
      total: asNumberOrNull(payload.amount) ?? 0,
      due_date: payload.due_date,
      status: 'open',
    })
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw new Error(error.message);
  }
  return { ...data, customer_name: payload.customer_name };
}

export async function updateAR(id, patch) {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: patch.status === 'received' ? 'paid' : patch.status })
    .eq('id', id)
    .select('*, patient:patients(name)');

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw new Error(error.message);
  }
  return { ...data, customer_name: data.patient?.name || 'N/A' };
}

export async function deleteAR(id) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function cashflowSummary(clinicId, start, end) {
  const { data, error } = await supabase.rpc('cashflow_summary', {
    p_clinic_id: clinicId,
    p_start: start,
    p_end: end,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data?.[0] ?? { entradas: 0, saidas: 0, resultado_liquido: 0, saldo_final: 0 };
}

/* =========================
   Cash Flow (Fluxo de Caixa)
   ========================= */

export async function listCashFlow({
  clinicId,
  start = null,
  end = null,
  search = null,
  categoryId = null,
  costCenterId = null,
  accountId = null,
  type = null,
  orderBy = 'date',
  orderDir = 'desc',
  limit = 200,
  offset = 0,
} = {}) {
  let query = supabase
    .from('cash_flow')
    .select('*')
    .eq('clinic_id', clinicId)
    .order(orderBy || 'date', { ascending: String(orderDir).toLowerCase() !== 'desc' })
    .range(offset, offset + limit - 1);

  if (start) {
    query = query.gte('date', start);
  }
  if (end) {
    query = query.lte('date', end);
  }
  if (search && search.trim()) {
    const pat = `%${search.trim()}%`;
    query = query.ilike('description', pat);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (costCenterId) {
    query = query.eq('cost_center_id', costCenterId);
  }
  if (accountId) {
    query = query.eq('account_id', accountId);
  }
  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

export async function createCashFlowManual(clinicId, row) {
  const payload = {
    clinic_id: clinicId,
    date: row.date,
    description: row.description || '',
    type: row.type, // 'entrada' | 'saida' | 'transferencia'
    amount: Number(row.amount || 0),
    category_id: row.category_id || null,
    cost_center_id: row.cost_center_id || null,
    account_id: row.account_id || null,
    origin: 'manual',
  };
  const { data, error } = await supabase.from('cash_flow').insert(payload).select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  invalidateFinanceCaches(clinicId);
  return data[0];
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function transferCashFlow({
  clinicId,
  date,
  description,
  amount,
  accountFrom,
  accountTo,
  categoryId = null,
  costCenterId = null,
}) {
  const { error } = await supabase.rpc('cash_flow_transfer', {
    p_clinic_id: clinicId,
    p_date: date,
    p_description: description,
    p_amount: Number(amount || 0),
    p_account_from: accountFrom,
    p_account_to: accountTo,
    p_category_id: categoryId,
    p_cost_center_id: costCenterId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return { ok: true };
}

export async function deleteCashFlowManual(id) {
  // Only allow delete for origin = manual and not reconciled
  const { data, error } = await supabase
    .from('cash_flow')
    .select('id, origin, is_reconciled')
    .eq('id', id);

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.origin !== 'manual' || data.is_reconciled) {
    throw new Error('Somente lançamentos manuais não conciliados podem ser excluídos.');
  }
  const del = await supabase.from('cash_flow').delete().eq('id', id);
  if (del.error) {
    throw new Error(del.error.message);
  }
  return { ok: true };
}
