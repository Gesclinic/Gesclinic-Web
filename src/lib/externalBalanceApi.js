/**
 * External Balance Integration API
 * Integra saldos de APIs de bancos e processadores de cartão
 * com o sistema de caixa
 */

import { supabase } from './customSupabaseClient';

/**
 * Configurações de integração com APIs externas
 */
const BANK_API_CONFIG = {
  C6_BANK: {
    name: 'C6 Bank',
    baseUrl: process.env.VITE_C6_BANK_API_URL || 'https://api.c6bank.com.br',
    apiKey: process.env.VITE_C6_BANK_API_KEY,
    enabled: !!process.env.VITE_C6_BANK_API_KEY,
  },
  ITAU: {
    name: 'Itaú',
    baseUrl: process.env.VITE_ITAU_API_URL || 'https://api.itau.com.br',
    apiKey: process.env.VITE_ITAU_API_KEY,
    enabled: !!process.env.VITE_ITAU_API_KEY,
  },
  BRADESCO: {
    name: 'Bradesco',
    baseUrl: process.env.VITE_BRADESCO_API_URL || 'https://api.bradesco.com.br',
    apiKey: process.env.VITE_BRADESCO_API_KEY,
    enabled: !!process.env.VITE_BRADESCO_API_KEY,
  },
};

const CARD_PROCESSOR_CONFIG = {
  GETNET: {
    name: 'GetNet',
    baseUrl: process.env.VITE_GETNET_API_URL || 'https://api.getnet.com.br',
    apiKey: process.env.VITE_GETNET_API_KEY,
    enabled: !!process.env.VITE_GETNET_API_KEY,
  },
  PAGSEGURO: {
    name: 'PagSeguro',
    baseUrl: process.env.VITE_PAGSEGURO_API_URL || 'https://api.pagseguro.com.br',
    apiKey: process.env.VITE_PAGSEGURO_API_KEY,
    enabled: !!process.env.VITE_PAGSEGURO_API_KEY,
  },
  STONE: {
    name: 'Stone',
    baseUrl: process.env.VITE_STONE_API_URL || 'https://api.stone.com.br',
    apiKey: process.env.VITE_STONE_API_KEY,
    enabled: !!process.env.VITE_STONE_API_KEY,
  },
};

/**
 * Obtém saldo de conta bancária via API externa
 */
export async function getBankAccountBalance(accountId, bankCode, credentials) {
  try {
    const bank = Object.values(BANK_API_CONFIG).find((b) => b.enabled && b.name.toLowerCase().includes(bankCode.toLowerCase()));

    if (!bank || !bank.enabled) {
      console.warn(`⚠️ Integração com ${bankCode} não configurada`);
      return null;
    }

    // Simular chamada à API (em produção, chamar a API real)
    const response = await fetch(`${bank.baseUrl}/accounts/${accountId}/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bank.apiKey}`,
        'Content-Type': 'application/json',
        'X-Credentials': JSON.stringify(credentials),
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API do banco: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      bankCode,
      accountId,
      balance: Number(data.balance || data.saldo || 0),
      lastUpdate: new Date().toISOString(),
      currency: data.currency || 'BRL',
    };
  } catch (error) {
    console.error(`Erro ao obter saldo do banco ${bankCode}:`, error);
    return null;
  }
}

/**
 * Obtém saldo de processador de cartão via API externa
 */
export async function getCardProcessorBalance(processorId, processorType, credentials) {
  try {
    const processor = Object.values(CARD_PROCESSOR_CONFIG).find(
      (p) => p.enabled && p.name.toLowerCase().includes(processorType.toLowerCase()),
    );

    if (!processor || !processor.enabled) {
      console.warn(`⚠️ Integração com ${processorType} não configurada`);
      return null;
    }

    // Simular chamada à API (em produção, chamar a API real)
    const response = await fetch(`${processor.baseUrl}/merchants/${processorId}/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${processor.apiKey}`,
        'Content-Type': 'application/json',
        'X-Credentials': JSON.stringify(credentials),
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API do processador: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      processorType,
      processorId,
      balance: Number(data.balance || data.saldo || 0),
      available: Number(data.available || data.disponivel || 0),
      pending: Number(data.pending || data.pendente || 0),
      lastUpdate: new Date().toISOString(),
      currency: data.currency || 'BRL',
    };
  } catch (error) {
    console.error(`Erro ao obter saldo do processador ${processorType}:`, error);
    return null;
  }
}

/**
 * Sincroniza saldos bancários e de cartão com base de dados
 */
export async function syncExternalBalances(clinicId) {
  try {
    // Buscar contas bancárias da clínica
    const { data: bankAccounts } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('account_type', 'BANCO');

    // Buscar processadores de cartão da clínica
    const { data: cardProcessors } = await supabase.from('card_processors').select('*').eq('clinic_id', clinicId).eq('is_active', true);

    const results = {
      bankBalances: [],
      cardBalances: [],
      errors: [],
    };

    // Sincronizar saldos bancários
    if (bankAccounts && bankAccounts.length > 0) {
      for (const account of bankAccounts) {
        try {
          const balance = await getBankAccountBalance(
            account.external_account_id,
            account.bank_code,
            JSON.parse(account.credentials || '{}'),
          );

          if (balance) {
            // Atualizar última sincronização na DB
            await supabase
              .from('finance_accounts')
              .update({
                last_balance_sync: new Date().toISOString(),
                external_balance: balance.balance,
              })
              .eq('id', account.id);

            results.bankBalances.push(balance);
          }
        } catch (err) {
          results.errors.push({
            type: 'bank',
            account: account.account_name,
            error: err.message,
          });
        }
      }
    }

    // Sincronizar saldos de cartão
    if (cardProcessors && cardProcessors.length > 0) {
      for (const processor of cardProcessors) {
        try {
          const balance = await getCardProcessorBalance(
            processor.external_processor_id,
            processor.processor_type,
            JSON.parse(processor.credentials || '{}'),
          );

          if (balance) {
            // Atualizar última sincronização na DB
            await supabase
              .from('card_processors')
              .update({
                last_balance_sync: new Date().toISOString(),
                external_balance: balance.balance,
                available_balance: balance.available,
                pending_balance: balance.pending,
              })
              .eq('id', processor.id);

            results.cardBalances.push(balance);
          }
        } catch (err) {
          results.errors.push({
            type: 'card_processor',
            processor: processor.name,
            error: err.message,
          });
        }
      }
    }

    console.log('✅ Sincronização de saldos externos concluída:', results);
    return results;
  } catch (error) {
    console.error('❌ Erro ao sincronizar saldos externos:', error);
    throw error;
  }
}

/**
 * Obtém últimos saldos sincronizados de contas bancárias
 */
export async function getLatestBankBalances(clinicId) {
  try {
    const { data } = await supabase
      .from('finance_accounts')
      .select('id, account_name, bank_code, external_balance, last_balance_sync')
      .eq('clinic_id', clinicId)
      .eq('account_type', 'BANCO')
      .order('last_balance_sync', { ascending: false });

    return (data || []).map((account) => ({
      accountId: account.id,
      accountName: account.account_name,
      bankCode: account.bank_code,
      balance: Number(account.external_balance || 0),
      lastSync: account.last_balance_sync,
    }));
  } catch (error) {
    console.error('Erro ao obter saldos bancários:', error);
    return [];
  }
}

/**
 * Obtém últimos saldos sincronizados de processadores de cartão
 */
export async function getLatestCardBalances(clinicId) {
  try {
    const { data } = await supabase
      .from('card_processors')
      .select('id, name, processor_type, external_balance, available_balance, pending_balance, last_balance_sync')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('last_balance_sync', { ascending: false });

    return (data || []).map((processor) => ({
      processorId: processor.id,
      processorName: processor.name,
      processorType: processor.processor_type,
      balance: Number(processor.external_balance || 0),
      available: Number(processor.available_balance || 0),
      pending: Number(processor.pending_balance || 0),
      lastSync: processor.last_balance_sync,
    }));
  } catch (error) {
    console.error('Erro ao obter saldos de cartão:', error);
    return [];
  }
}

/**
 * Registra erro de sincronização para auditoria
 */
export async function logSyncError(clinicId, errorData) {
  try {
    await supabase.from('sync_error_logs').insert([
      {
        clinic_id: clinicId,
        error_type: errorData.type,
        error_source: errorData.source,
        error_message: errorData.message,
        error_details: JSON.stringify(errorData.details),
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error('Erro ao registrar erro de sincronização:', err);
  }
}

export default {
  getBankAccountBalance,
  getCardProcessorBalance,
  syncExternalBalances,
  getLatestBankBalances,
  getLatestCardBalances,
  logSyncError,
};
