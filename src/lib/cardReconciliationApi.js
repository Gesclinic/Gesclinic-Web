import { supabase } from '@/lib/customSupabaseClient';
import { listCardProcessors } from '@/lib/cardProcessorsApi';
import { listProcessorFees } from '@/lib/processorFeesApi';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isCardPayment(value) {
  const normalized = normalizeText(value);
  return normalized.includes('cartao') || normalized.includes('credito') || normalized.includes('debito') || normalized.includes('card');
}

function isMissingCardStatementTable(error) {
  const message = String(error?.message || '').toLowerCase();
  return ['42P01', 'PGRST205'].includes(error?.code) || message.includes('card_statement_entries') || message.includes('card_statement_import_batches');
}

function parseMoney(value) {
  if (typeof value === 'number') return value;
  const text = String(value || '').trim();
  if (!text) return 0;
  const normalized = text
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function generateCardReferenceHash(clinicId, processorId, row) {
  const key = [
    clinicId,
    processorId || '',
    row.sale_date || '',
    row.settlement_date || '',
    row.authorization_code || '',
    row.nsu || '',
    row.document_number || '',
    Number(row.gross_amount || 0).toFixed(2),
    Number(row.net_amount || 0).toFixed(2),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

function getCsvValue(row, names) {
  const normalized = Object.fromEntries(
    Object.entries(row || {}).map(([key, value]) => [normalizeText(key).replace(/[^a-z0-9]/g, ''), value]),
  );
  for (const name of names) {
    const key = normalizeText(name).replace(/[^a-z0-9]/g, '');
    if (normalized[key] !== undefined && normalized[key] !== '') return normalized[key];
  }
  return '';
}

export function parseCardStatementCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map((header) => header.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map((line, index) => {
    const values = line.split(separator).map((value) => value.trim().replace(/^"|"$/g, ''));
    const raw = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] || '']));
    const grossAmount = parseMoney(getCsvValue(raw, ['bruto', 'valor bruto', 'valor', 'amount', 'gross_amount']));
    const feeAmount = Math.abs(parseMoney(getCsvValue(raw, ['taxa', 'valor taxa', 'fee', 'fee_amount'])));
    const netAmount = parseMoney(getCsvValue(raw, ['liquido', 'valor liquido', 'net', 'net_amount'])) || Number((grossAmount - feeAmount).toFixed(2));

    return {
      sale_date: parseDate(getCsvValue(raw, ['data venda', 'data', 'sale_date', 'transaction_date'])),
      settlement_date: parseDate(getCsvValue(raw, ['data liquidacao', 'liquidacao', 'data pagamento', 'settlement_date', 'payment_date'])),
      description: getCsvValue(raw, ['descricao', 'descrição', 'historico', 'histórico', 'produto', 'description']) || 'Venda em cartão',
      authorization_code: String(getCsvValue(raw, ['autorizacao', 'autorização', 'authorization', 'codigo autorizacao']) || '').trim(),
      nsu: String(getCsvValue(raw, ['nsu', 'tid']) || '').trim(),
      document_number: String(getCsvValue(raw, ['documento', 'comprovante', 'document_number']) || '').trim(),
      card_brand: normalizeBrand(getCsvValue(raw, ['bandeira', 'brand', 'card_brand'])),
      settlement_type: String(getCsvValue(raw, ['forma recebimento', 'forma de recebimento', 'prazo', 'settlement_type']) || '').trim(),
      gross_amount: grossAmount,
      fee_amount: feeAmount,
      net_amount: netAmount,
      metadata: { raw, import_row_index: index + 1 },
    };
  }).filter((row) => row.sale_date || row.settlement_date || row.gross_amount || row.net_amount);
}

function normalizeBrand(value) {
  const normalized = normalizeText(value).replace(/[^a-z0-9]/g, '');
  if (normalized.includes('master')) return 'MASTERCARD';
  if (normalized.includes('visa')) return 'VISA';
  if (normalized.includes('elo')) return 'ELO';
  if (normalized.includes('amex') || normalized.includes('american')) return 'AMEX';
  if (normalized.includes('hiper')) return 'HIPERCARD';
  return String(value || '').toUpperCase();
}

function getMetadataValue(metadata = {}, keys = []) {
  for (const key of keys) {
    if (metadata?.[key] !== null && metadata?.[key] !== undefined && metadata?.[key] !== '') return metadata[key];
    if (metadata?.payment_data?.[key] !== null && metadata?.payment_data?.[key] !== undefined && metadata?.payment_data?.[key] !== '') return metadata.payment_data[key];
    if (metadata?.card?.[key] !== null && metadata?.card?.[key] !== undefined && metadata?.card?.[key] !== '') return metadata.card[key];
  }
  return null;
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().split('T')[0];
}

function resolveSettlementDate(baseDate, settlementType, processor) {
  if (!baseDate) return null;
  if (settlementType === 'D+0') return baseDate;
  if (settlementType === 'D+1') return addDays(baseDate, 1);
  if (settlementType === 'D+30') return addDays(baseDate, 30);

  const settlementDay = Number(processor?.settlement_day || 1);
  const base = new Date(`${baseDate}T00:00:00`);
  const candidate = new Date(base.getFullYear(), base.getMonth(), Math.min(31, Math.max(1, settlementDay)));
  if (candidate < base) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate.toISOString().split('T')[0];
}

function mapReceivable(row, fees, processors) {
  const metadata = row.metadata || {};
  const appointment = Array.isArray(row.appointments) ? row.appointments[0] : row.appointments;
  const paymentMethod = row.payment_method || appointment?.payment_method || metadata.payment_method || metadata.payment_data?.payment_method || row.description;
  const brand = normalizeBrand(getMetadataValue(metadata, ['card_brand', 'brand', 'bandeira']) || row.card_brand || '');
  const processorName = getMetadataValue(metadata, ['processor', 'card_processor', 'operadora', 'gateway']);
  const processor = processors.find((item) => normalizeText(item.name) === normalizeText(processorName)) || processors[0] || null;
  const settlementType = Number(getMetadataValue(metadata, ['card_installments', 'installments', 'parcelas']) || row.installments || 1) > 1 ? 'D+30' : 'D+1';
  const fee = fees.find((item) => {
    const sameProcessor = !processor || item.card_processor_id === processor.id;
    const sameBrand = !brand || normalizeBrand(item.card_brand) === brand;
    const sameSettlement = item.settlement_type === settlementType || item.settlement_type === 'Payment Day';
    return sameProcessor && sameBrand && sameSettlement;
  });
  const grossAmount = Number(row.amount ?? row.gross_amount ?? row.net_value ?? row.total ?? 0);
  const feePercent = Number(fee?.fee_percent || 0);
  const expectedFee = Number((grossAmount * (feePercent / 100)).toFixed(2));
  const expectedNet = Number((grossAmount - expectedFee).toFixed(2));
  const saleDate = String(row.due_date || row.received_at || row.created_at || '').split('T')[0];
  const settlementDate = resolveSettlementDate(saleDate, fee?.settlement_type || settlementType, processor);

  return {
    id: row.id,
    saleDate,
    settlementDate,
    payer: row.patient_name || row.description || 'Pagador nao informado',
    description: row.description || row.document_number || 'Recebimento por cartao',
    paymentMethod,
    brand: brand || 'NAO_INFORMADA',
    processorName: processor?.name || processorName || 'Sem operadora',
    settlementType: fee?.settlement_type || settlementType,
    grossAmount,
    feePercent,
    expectedFee,
    expectedNet,
    receivedAmount: Number(row.received_value || 0),
    status: fee ? 'parametrized' : 'missing_fee',
    sourceStatus: row.status,
  };
}

export async function listCardReconciliationItems({ clinicId, startDate = null, endDate = null, processorId = null } = {}) {
  if (!clinicId) return { rows: [], summary: {} };

  const [processors, feesResult] = await Promise.all([
    listCardProcessors(clinicId),
    listProcessorFees(clinicId),
  ]);

  let query = supabase
    .from('ar_invoices')
    .select('id,description,patient_name,payment_method,amount,received_value,due_date,received_at,created_at,status')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
  if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;

  const selectedProcessor = processorId ? processors.find((processor) => processor.id === processorId) : null;
  const rows = (data || [])
    .filter((row) => isCardPayment(row.payment_method || row.description))
    .map((row) => mapReceivable(row, feesResult || [], selectedProcessor ? [selectedProcessor] : processors))
    .filter((row) => !processorId || row.processorName === selectedProcessor?.name);

  const summary = rows.reduce((acc, row) => {
    acc.count += 1;
    acc.grossAmount += row.grossAmount;
    acc.expectedFee += row.expectedFee;
    acc.expectedNet += row.expectedNet;
    if (row.status === 'missing_fee') acc.missingFee += 1;
    return acc;
  }, { count: 0, grossAmount: 0, expectedFee: 0, expectedNet: 0, missingFee: 0 });

  return {
    rows,
    summary: {
      ...summary,
      grossAmount: Number(summary.grossAmount.toFixed(2)),
      expectedFee: Number(summary.expectedFee.toFixed(2)),
      expectedNet: Number(summary.expectedNet.toFixed(2)),
    },
    processors,
  };
}

export async function importCardStatementEntries({ clinicId, processorId = null, fileName = null, entries = [] } = {}) {
  if (!clinicId) throw new Error('Clinica nao informada');
  if (!entries.length) return { imported: 0, duplicates: 0, entries: [] };

  const { data: batch, error: batchError } = await supabase
    .from('card_statement_import_batches')
    .insert({ clinic_id: clinicId, processor_id: processorId, file_name: fileName })
    .select('id')
    .single();

  if (batchError) {
    if (isMissingCardStatementTable(batchError)) throw new Error('As tabelas de extrato de cartão ainda não foram reconhecidas pelo Supabase. Aguarde alguns instantes e recarregue a página.');
    throw batchError;
  }

  const records = entries.map((entry) => {
    const row = {
      clinic_id: clinicId,
      processor_id: processorId || null,
      import_batch_id: batch.id,
      sale_date: entry.sale_date,
      settlement_date: entry.settlement_date,
      description: entry.description || 'Venda em cartão',
      authorization_code: entry.authorization_code || null,
      nsu: entry.nsu || null,
      document_number: entry.document_number || null,
      card_brand: entry.card_brand || null,
      settlement_type: entry.settlement_type || null,
      gross_amount: Number(entry.gross_amount || 0),
      fee_amount: Number(entry.fee_amount || 0),
      net_amount: Number(entry.net_amount || 0),
      status: 'pending',
      metadata: entry.metadata || {},
    };
    return { ...row, reference_hash: generateCardReferenceHash(clinicId, processorId, row) };
  });

  const hashes = records.map((record) => record.reference_hash);
  const { data: existing, error: existingError } = await supabase
    .from('card_statement_entries')
    .select('reference_hash')
    .eq('clinic_id', clinicId)
    .in('reference_hash', hashes);

  if (existingError) {
    if (isMissingCardStatementTable(existingError)) throw new Error('As tabelas de extrato de cartão ainda não foram reconhecidas pelo Supabase. Aguarde alguns instantes e recarregue a página.');
    throw existingError;
  }

  const existingHashes = new Set((existing || []).map((row) => row.reference_hash));
  const newRecords = records.filter((record) => !existingHashes.has(record.reference_hash));

  let inserted = [];
  if (newRecords.length) {
    const { data, error } = await supabase
      .from('card_statement_entries')
      .insert(newRecords)
      .select('*');
    if (error) {
      if (isMissingCardStatementTable(error)) throw new Error('As tabelas de extrato de cartão ainda não foram reconhecidas pelo Supabase. Aguarde alguns instantes e recarregue a página.');
      throw error;
    }
    inserted = data || [];
  }

  await supabase
    .from('card_statement_import_batches')
    .update({ imported_count: inserted.length, duplicate_count: records.length - newRecords.length })
    .eq('id', batch.id);

  return {
    imported: inserted.length,
    duplicates: records.length - newRecords.length,
    entries: inserted,
  };
}

export async function listCardStatementEntries({ clinicId, startDate = null, endDate = null, processorId = null } = {}) {
  if (!clinicId) return [];

  let query = supabase
    .from('card_statement_entries')
    .select('*, card_processors(name)')
    .eq('clinic_id', clinicId)
    .order('sale_date', { ascending: false })
    .limit(5000);

  if (startDate) query = query.gte('sale_date', startDate);
  if (endDate) query = query.lte('sale_date', endDate);
  if (processorId) query = query.eq('processor_id', processorId);

  const { data, error } = await query;
  if (error) {
    if (isMissingCardStatementTable(error)) return [];
    throw error;
  }
  return data || [];
}
