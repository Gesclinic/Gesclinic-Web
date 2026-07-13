/**
 * Cash Consolidation API
 * Integra dados de caixas individuais, contas financeiras e cartões
 * para fornecer visão consolidada do caixa da clínica
 */

import { supabase } from './customSupabaseClient';
import cashDrawerApi from './cashDrawerApi';
import financeAccountsApi from './financeAccountsApi';

function normalizePaymentMethod(method) {
  const normalized = String(method || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9_ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.includes('DINHEIRO') || normalized === 'CASH') {
    return 'DINHEIRO';
  }
  if (normalized.includes('PIX')) {
    return 'PIX';
  }
  if (normalized.includes('TED') || normalized.includes('TRANSFERENCIA') || normalized.includes('BANCO') || normalized.includes('DEPOSITO')) {
    return 'TED';
  }
  if (normalized.includes('DOC')) {
    return 'DOC';
  }
  if (normalized.includes('DEBITO')) {
    return 'CARTAO_DEBITO';
  }
  if (normalized.includes('CREDITO') || normalized.includes('CARTAO')) {
    return 'CARTAO_CREDITO';
  }
  if (normalized.includes('BOLETO')) {
    return 'BOLETO';
  }
  if (normalized.includes('CHEQUE')) {
    return 'CHEQUE';
  }

  return normalized || 'OUTROS';
}

function addPaymentAmount(summary, method, amount) {
  const key = normalizePaymentMethod(method);
  summary[key] = Number(((summary[key] || 0) + Number(amount || 0)).toFixed(2));
}

function getReceivablePaymentRows(receivable) {
  const split = Array.isArray(receivable.payment_split) ? receivable.payment_split : [];
  const validSplit = split
    .map((payment) => ({
      method: payment.method || payment.payment_method || receivable.received_payment_method || receivable.payment_method,
      amount: Number(payment.amount || payment.value || 0),
    }))
    .filter((payment) => payment.amount > 0);

  if (validSplit.length > 0) {
    return validSplit;
  }

  return [{
    method: receivable.received_payment_method || receivable.payment_method,
    amount: Number(receivable.received_value || receivable.paid_total || receivable.net_value || receivable.amount || 0),
  }];
}

function normalizeAccountType(type) {
  return String(type || '').trim().toUpperCase();
}

function getAccountBucket(account = {}) {
  const type = normalizeAccountType(account.account_type || account.type);
  const name = String(account.account_name || account.name || '').toLowerCase();

  if (['DINHEIRO', 'CASH'].includes(type) || name.includes('caixa geral')) {
    return 'generalCash';
  }
  if (['CARTAO', 'CARD', 'CREDIT_CARD', 'CARTAO_CREDITO'].includes(type)) {
    return 'card';
  }
  if (['PIX', 'DIGITAL_WALLET'].includes(type)) {
    return 'pix';
  }
  if (['CHEQUE'].includes(type)) {
    return 'check';
  }
  if (['BANCO', 'BANK', 'CHECKING', 'SAVINGS', 'CONTA_CORRENTE'].includes(type)) {
    return 'bank';
  }

  return 'bank';
}

const REPORT_PAYMENT_METHODS = [
  { key: 'DINHEIRO', label: 'Dinheiro' },
  { key: 'PIX', label: 'PIX' },
  { key: 'CARTAO_DEBITO', label: 'Débito' },
  { key: 'CARTAO_CREDITO', label: 'Crédito' },
  { key: 'TED', label: 'TED' },
  { key: 'DOC', label: 'DOC' },
  { key: 'CHEQUE', label: 'Cheque' },
];

function normalizeReportPaymentMethod(method) {
  const normalized = String(method || '').trim().toUpperCase();

  if (['DINHEIRO', 'CASH'].includes(normalized)) return 'DINHEIRO';
  if (normalized === 'PIX') return 'PIX';
  if (['CARTAO_DEBITO', 'CARTÃO_DÉBITO', 'DEBITO', 'DÉBITO'].includes(normalized)) return 'CARTAO_DEBITO';
  if (['CARTAO_CREDITO', 'CARTÃO_CRÉDITO', 'CREDITO', 'CRÉDITO', 'CARTAO'].includes(normalized)) return 'CARTAO_CREDITO';
  if (normalized === 'TED') return 'TED';
  if (normalized === 'DOC') return 'DOC';
  if (normalized === 'CHEQUE') return 'CHEQUE';
  if (['TRANSFERENCIA', 'TRANSFERÊNCIA', 'BANCO', 'DEPOSITO', 'DEPÓSITO'].includes(normalized)) return 'TED';

  return 'OUTROS';
}

function createReportBucket() {
  return REPORT_PAYMENT_METHODS.reduce((acc, method) => {
    acc[method.key] = 0;
    return acc;
  }, { OUTROS: 0 });
}

function addReportAmount(bucket, method, amount) {
  const key = normalizeReportPaymentMethod(method);
  bucket[key] = Number(((bucket[key] || 0) + Number(amount || 0)).toFixed(2));
}

function sumReportBucket(bucket) {
  return Object.values(bucket || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

/**
 * Obtém consolidação completa de caixa
 * Retorna: dinheiro em espécie, bancos, cartões, PIX/TED
 */
export async function getCashConsolidation(clinicId, filters = {}) {
  try {
    let receivablesQuery = supabase
      .from('ar_invoices')
      .select('id, appointment_id, amount, net_value, received_value, paid_total, payment_method, received_payment_method, payment_split, status, received_at, received_date, due_date, reversed_at, canceled_at, soft_deleted_at')
      .eq('clinic_id', clinicId)
      .in('status', ['received', 'paid']);

    if (filters.startDate) {
      receivablesQuery = receivablesQuery.gte('received_date', filters.startDate);
    }
    if (filters.endDate) {
      receivablesQuery = receivablesQuery.lte('received_date', filters.endDate);
    }

    const [drawers, accounts, transfers, receivables, drawerMovements] = await Promise.all([
      cashDrawerApi.listDrawers(clinicId),
      financeAccountsApi.listAccounts(clinicId),
      supabase
        .from('cash_transfers')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('status', 'confirmed')
        .order('transfer_date', { ascending: false }),
      receivablesQuery,
      supabase
        .from('drawer_movements')
        .select('appointment_id')
        .eq('clinic_id', clinicId)
        .not('appointment_id', 'is', null),
    ]);

    const transfers_data = transfers.data || [];
    const receivablesData = receivables.data || [];
    const accountIdsInTransfers = [...new Set(transfers_data.map((transfer) => transfer.to_account_id).filter(Boolean))];
    const [transferFinancialAccounts, transferLegacyAccounts] = await Promise.all([
      accountIdsInTransfers.length > 0
        ? supabase.from('financial_accounts').select('*').eq('clinic_id', clinicId).in('id', accountIdsInTransfers)
        : Promise.resolve({ data: [] }),
      accountIdsInTransfers.length > 0
        ? supabase.from('finance_accounts').select('*').eq('clinic_id', clinicId).in('id', accountIdsInTransfers)
        : Promise.resolve({ data: [] }),
    ]);
    const accountsById = new Map([
      ...accounts,
      ...(transferFinancialAccounts.data || []),
      ...(transferLegacyAccounts.data || []),
    ].map((account) => [account.id, account]));
    const appointmentIdsInDrawer = new Set(
      (drawerMovements.data || []).map((movement) => movement.appointment_id).filter(Boolean),
    );
    const receivedByMethod = {};

    receivablesData
      .filter((receivable) => !receivable.reversed_at && !receivable.canceled_at && !receivable.soft_deleted_at)
      .filter((receivable) => !receivable.appointment_id || !appointmentIdsInDrawer.has(receivable.appointment_id))
      .forEach((receivable) => {
        getReceivablePaymentRows(receivable).forEach((payment) => {
          if (filters.paymentMethod && normalizePaymentMethod(payment.method) !== normalizePaymentMethod(filters.paymentMethod)) {
            return;
          }
          addPaymentAmount(receivedByMethod, payment.method, payment.amount);
        });
      });

    const transferredByDrawerId = transfers_data.reduce((acc, transfer) => {
      if (!transfer.from_drawer_id) {
        return acc;
      }
      acc[transfer.from_drawer_id] = Number(((acc[transfer.from_drawer_id] || 0) + Number(transfer.amount || 0)).toFixed(2));
      return acc;
    }, {});

    // Dinheiro em espécie: saldo ainda retido nos caixas individuais fechados
    const cashInDrawers = drawers
      .filter((d) => d.status === 'closed_full' || d.status === 'closed_partial')
      .reduce((sum, d) => {
        const drawerBalance = Number(d.expected_balance ?? d.closing_balance ?? 0);
        const transferredOut = Number(transferredByDrawerId[d.id] || 0);
        return sum + Math.max(0, drawerBalance - transferredOut);
      }, 0);
    const drawerNetImpact = drawers
      .filter((d) => d.status === 'closed_full' || d.status === 'closed_partial')
      .reduce((sum, d) => {
        const drawerBalance = Number(d.expected_balance ?? d.closing_balance ?? 0);
        const openingBalance = Number(d.opening_balance || 0);
        const transferredOut = Number(transferredByDrawerId[d.id] || 0);
        return sum + drawerBalance - openingBalance - transferredOut;
      }, 0);
    const cashReceipts = Number(receivedByMethod.DINHEIRO || 0);

    const transferTotalsByDestination = transfers_data.reduce((acc, transfer) => {
      const account = accountsById.get(transfer.to_account_id);
      const bucket = getAccountBucket(account);
      acc[bucket] = Number(((acc[bucket] || 0) + Number(transfer.amount || 0)).toFixed(2));
      return acc;
    }, {});
    const transferTotalsFromGeneralCash = transfers_data.reduce((sum, transfer) => {
      const account = accountsById.get(transfer.from_account_id);
      return getAccountBucket(account) === 'generalCash'
        ? sum + Number(transfer.amount || 0)
        : sum;
    }, 0);

    // Banco: contas bancárias e valores transferidos para banco
    const bankAccounts = accounts.filter((a) => getAccountBucket(a) === 'bank');
    const bankTransfers = Number(transferTotalsByDestination.bank || 0);
    const bankBalance = bankTransfers + Number(receivedByMethod.TED || 0); // Saldo é a soma das transferências confirmadas e recebimentos

    // Cartão: processadoras/contas de cartão e transferências para elas
    const cardAccounts = accounts.filter((a) => getAccountBucket(a) === 'card');
    const cardTransfers = Number(transferTotalsByDestination.card || 0);
    const cardBalance = cardTransfers
      + Number(receivedByMethod.CARTAO_CREDITO || 0)
      + Number(receivedByMethod.CARTAO_DEBITO || 0);

    // PIX/TED: carteiras digitais e transferências para elas
    const pixAccounts = accounts.filter((a) => getAccountBucket(a) === 'pix');
    const pixTransfers = Number(transferTotalsByDestination.pix || 0);
    const pixBalance = pixTransfers + Number(receivedByMethod.PIX || 0);

    // Cheque: contas de compensação e transferências para elas
    const checkAccounts = accounts.filter((a) => getAccountBucket(a) === 'check');
    const checkTransfers = Number(transferTotalsByDestination.check || 0);
    const checkBalance = checkTransfers + Number(receivedByMethod.CHEQUE || 0) + Number(receivedByMethod.BOLETO || 0);

    // Caixa Geral: transferências com destino Caixa Geral
    const generalCashAccounts = accounts.filter((a) => getAccountBucket(a) === 'generalCash');
    const generalCashTransfers = Math.max(
      0,
      Number(transferTotalsByDestination.generalCash || 0) - transferTotalsFromGeneralCash,
    );

    return {
      summary: {
        cashInDrawers: Number((cashInDrawers + cashReceipts).toFixed(2)),
        generalCash: Number(generalCashTransfers.toFixed(2)),
        bank: Number(bankBalance.toFixed(2)),
        card: Number(cardBalance.toFixed(2)),
        pix: Number(pixBalance.toFixed(2)),
        check: Number(checkBalance.toFixed(2)),
        receivedByMethod,
        total: Number(
          (drawerNetImpact + cashReceipts + generalCashTransfers + bankBalance + cardBalance + pixBalance + checkBalance).toFixed(2),
        ),
      },
      details: {
        drawers,
        receivables: receivablesData,
        bankAccounts,
        cardAccounts,
        pixAccounts,
        checkAccounts,
        generalCashAccounts,
        transfers: transfers_data,
      },
    };
  } catch (error) {
    console.error('Erro ao obter consolidação de caixa:', error);
    throw error;
  }
}

/**
 * Obtém caixas individuais abertos de um operador ou todos
 */
export async function getOpenDrawers(clinicId, operatorId = null) {
  try {
    const query = supabase
      .from('cash_drawers')
      .select(
        `
        *,
        operator:operator_id(id, name, email)
      `,
      )
      .eq('clinic_id', clinicId)
      .eq('status', 'open');

    if (operatorId) {
      query.eq('operator_id', operatorId);
    }

    const { data, error } = await query.order('opened_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erro ao obter caixas abertos:', error);
    return [];
  }
}

/**
 * Obtém divergências de caixas (esperado vs realizado)
 */
export async function getCashDiscrepancies(clinicId) {
  try {
    const drawers = await cashDrawerApi.listDrawers(clinicId);

    const discrepancies = drawers
      .filter((d) => d.status !== 'open')
      .map((drawer) => {
        const expected = Number(drawer.expected_balance || 0);
        const actual = Number(drawer.closing_balance || 0);
        const difference = actual - expected;
        const percentDiff = expected > 0 ? (difference / expected) * 100 : 0;

        return {
          drawerId: drawer.id,
          date: drawer.date_opened,
          operatorId: drawer.operator_id,
          expected,
          actual,
          difference,
          percentDifference: Number(percentDiff.toFixed(2)),
          hasDiscrepancy: Math.abs(difference) > 0.01,
          status: drawer.status,
        };
      })
      .filter((d) => d.hasDiscrepancy)
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    return discrepancies;
  } catch (error) {
    console.error('Erro ao obter divergências:', error);
    return [];
  }
}

/**
 * Obtém resumo de movimentos por forma de pagamento
 */
export async function getPaymentMethodSummary(drawerId) {
  try {
    const { data, error } = await supabase
      .from('drawer_movements')
      .select('payment_method, payment_type, amount')
      .eq('drawer_id', drawerId);

    if (error) throw error;

    const summary = {};

    (data || []).forEach((movement) => {
      const method = normalizePaymentMethod(movement.payment_method || 'OUTROS');

      if (!summary[method]) {
        summary[method] = { entrada: 0, saida: 0 };
      }

      if (movement.payment_type === 'entrada') {
        summary[method].entrada += Number(movement.amount || 0);
      } else {
        summary[method].saida += Number(movement.amount || 0);
      }
    });

    return Object.entries(summary).map(([method, data]) => ({
      method,
      entrada: Number(data.entrada.toFixed(2)),
      saida: Number(data.saida.toFixed(2)),
      saldo: Number((data.entrada - data.saida).toFixed(2)),
    }));
  } catch (error) {
    console.error('Erro ao obter resumo de formas de pagamento:', error);
    return [];
  }
}

export async function getDailyCashReport(clinicId, filters = {}) {
  try {
    const drawers = await cashDrawerApi.listDrawers(clinicId);
    const filteredDrawers = drawers.filter((drawer) => {
      if (filters.startDate && drawer.date_opened < filters.startDate) return false;
      if (filters.endDate && drawer.date_opened > filters.endDate) return false;
      return drawer.status !== 'open';
    });

    const drawerIds = filteredDrawers.map((drawer) => drawer.id).filter(Boolean);
    if (drawerIds.length === 0) {
      return {
        methods: REPORT_PAYMENT_METHODS,
        totals: { received: createReportBucket(), transferred: createReportBucket(), pending: createReportBucket() },
        byOperator: [],
        byProfessional: [],
      };
    }

    const [movementsRes, transfersRes] = await Promise.all([
      supabase
        .from('drawer_movements')
        .select(`
          id,
          drawer_id,
          payment_method,
          payment_type,
          amount,
          appointment:appointments(
            id,
            professional_id,
            professionals:professional_id(name)
          )
        `)
        .eq('clinic_id', clinicId)
        .in('drawer_id', drawerIds),
      supabase
        .from('cash_transfers')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('status', 'confirmed')
        .in('from_drawer_id', drawerIds),
    ]);

    if (movementsRes.error) throw movementsRes.error;
    if (transfersRes.error) throw transfersRes.error;

    const drawersById = new Map(filteredDrawers.map((drawer) => [drawer.id, drawer]));
    const operatorRows = new Map();
    const professionalRows = new Map();
    const totals = {
      received: createReportBucket(),
      transferred: createReportBucket(),
      pending: createReportBucket(),
    };

    const ensureOperatorRow = (drawerId) => {
      const drawer = drawersById.get(drawerId) || {};
      const key = drawer.operator_id || drawerId || 'sem-operador';
      if (!operatorRows.has(key)) {
        operatorRows.set(key, {
          id: key,
          operatorName: drawer.operator?.name || 'Operador não informado',
          drawerDates: new Set(),
          received: createReportBucket(),
          transferred: createReportBucket(),
          pending: createReportBucket(),
        });
      }

      const row = operatorRows.get(key);
      if (drawer.date_opened) row.drawerDates.add(drawer.date_opened);
      return row;
    };

    (movementsRes.data || []).forEach((movement) => {
      if (movement.payment_type !== 'entrada') return;

      const amount = Number(movement.amount || 0);
      const operatorRow = ensureOperatorRow(movement.drawer_id);
      addReportAmount(operatorRow.received, movement.payment_method, amount);
      addReportAmount(operatorRow.pending, movement.payment_method, amount);
      addReportAmount(totals.received, movement.payment_method, amount);
      addReportAmount(totals.pending, movement.payment_method, amount);

      const professional = movement.appointment?.professionals;
      const professionalId = movement.appointment?.professional_id || 'sem-profissional';
      if (!professionalRows.has(professionalId)) {
        professionalRows.set(professionalId, {
          id: professionalId,
          professionalName: professional?.name || 'Profissional não informado',
          received: createReportBucket(),
        });
      }
      addReportAmount(professionalRows.get(professionalId).received, movement.payment_method, amount);
    });

    (transfersRes.data || []).forEach((transfer) => {
      const amount = Number(transfer.amount || 0);
      const operatorRow = ensureOperatorRow(transfer.from_drawer_id);
      addReportAmount(operatorRow.transferred, transfer.payment_method, amount);
      addReportAmount(operatorRow.pending, transfer.payment_method, -amount);
      addReportAmount(totals.transferred, transfer.payment_method, amount);
      addReportAmount(totals.pending, transfer.payment_method, -amount);
    });

    const normalizeOperatorRow = (row) => ({
      ...row,
      drawerDates: [...row.drawerDates].sort(),
      totalReceived: Number(sumReportBucket(row.received).toFixed(2)),
      totalTransferred: Number(sumReportBucket(row.transferred).toFixed(2)),
      totalPending: Number(sumReportBucket(row.pending).toFixed(2)),
    });

    return {
      methods: REPORT_PAYMENT_METHODS,
      totals: {
        received: totals.received,
        transferred: totals.transferred,
        pending: totals.pending,
        totalReceived: Number(sumReportBucket(totals.received).toFixed(2)),
        totalTransferred: Number(sumReportBucket(totals.transferred).toFixed(2)),
        totalPending: Number(sumReportBucket(totals.pending).toFixed(2)),
      },
      byOperator: [...operatorRows.values()].map(normalizeOperatorRow),
      byProfessional: [...professionalRows.values()].map((row) => ({
        ...row,
        totalReceived: Number(sumReportBucket(row.received).toFixed(2)),
      })),
    };
  } catch (error) {
    console.error('Erro ao gerar relatório diário de caixa:', error);
    return {
      methods: REPORT_PAYMENT_METHODS,
      totals: { received: createReportBucket(), transferred: createReportBucket(), pending: createReportBucket() },
      byOperator: [],
      byProfessional: [],
    };
  }
}

export default {
  getCashConsolidation,
  getOpenDrawers,
  getCashDiscrepancies,
  getPaymentMethodSummary,
  getDailyCashReport,
};
