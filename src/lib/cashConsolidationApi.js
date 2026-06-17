/**
 * Cash Consolidation API
 * Integra dados de caixas individuais, contas financeiras e cartões
 * para fornecer visão consolidada do caixa da clínica
 */

import { supabase } from './customSupabaseClient';
import cashDrawerApi from './cashDrawerApi';
import financeAccountsApi from './financeAccountsApi';

/**
 * Obtém consolidação completa de caixa
 * Retorna: dinheiro em espécie, bancos, cartões, PIX/TED
 */
export async function getCashConsolidation(clinicId) {
  try {
    const [drawers, accounts, transfers] = await Promise.all([
      cashDrawerApi.listDrawers(clinicId),
      financeAccountsApi.listAccounts(clinicId),
      supabase
        .from('cash_transfers')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('status', 'confirmed')
        .order('transfer_date', { ascending: false }),
    ]);

    const transfers_data = transfers.data || [];

    // Dinheiro em espécie: soma de caixas individuais com status closed
    const cashInDrawers = drawers
      .filter((d) => d.status === 'closed_full' || d.status === 'closed_partial')
      .reduce((sum, d) => sum + Number(d.expected_balance ?? d.closing_balance ?? 0), 0);

    // Banco: conta financeira com tipo BANCO + transferências confirmadas para BANCO
    const bankAccounts = accounts.filter((a) => a.account_type === 'BANCO');
    const bankTransfers = transfers_data
      .filter((t) => t.payment_method === 'BANCO')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const bankBalance = bankTransfers; // Saldo é a soma das transferências confirmadas

    // Cartão: conta financeira com tipo CARTAO + transferências confirmadas
    const cardAccounts = accounts.filter((a) => a.account_type === 'CARTAO');
    const cardTransfers = transfers_data
      .filter((t) => t.payment_method === 'CARTAO')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const cardBalance = cardTransfers;

    // PIX/TED: conta financeira com tipo PIX + transferências confirmadas
    const pixAccounts = accounts.filter((a) => a.account_type === 'PIX');
    const pixTransfers = transfers_data
      .filter((t) => t.payment_method === 'PIX')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pixBalance = pixTransfers;

    // Cheque: conta financeira com tipo CHEQUE
    const checkAccounts = accounts.filter((a) => a.account_type === 'CHEQUE');
    const checkTransfers = transfers_data
      .filter((t) => t.payment_method === 'CHEQUE')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Caixa Geral: soma de dinheiro em espécie + contas gerais
    const generalCashAccounts = accounts.filter(
      (a) => a.account_type === 'DINHEIRO' && a.account_name.toLowerCase().includes('geral'),
    );
    const generalCashTransfers = transfers_data
      .filter((t) => t.payment_method === 'DINHEIRO')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      summary: {
        cashInDrawers: Number(cashInDrawers.toFixed(2)),
        generalCash: Number(generalCashTransfers.toFixed(2)),
        bank: Number(bankBalance.toFixed(2)),
        card: Number(cardBalance.toFixed(2)),
        pix: Number(pixBalance.toFixed(2)),
        check: Number(checkTransfers.toFixed(2)),
        total: Number(
          (cashInDrawers + generalCashTransfers + bankBalance + cardBalance + pixBalance + checkTransfers).toFixed(2),
        ),
      },
      details: {
        drawers,
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
      const method = movement.payment_method || 'OUTROS';

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

export default {
  getCashConsolidation,
  getOpenDrawers,
  getCashDiscrepancies,
  getPaymentMethodSummary,
};
