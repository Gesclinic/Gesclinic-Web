// Finance Accounts API
import { customSupabaseClient } from './customSupabaseClient';

const client = customSupabaseClient;

function normalizeFinancialAccount(account, sourceTable = null) {
  return {
    ...account,
    source_table: sourceTable || account.source_table || null,
    account_name: account.account_name || account.name || account.bank_name || 'Conta financeira',
    account_type: String(account.account_type || account.type || account.kind || 'CHECKING').toUpperCase(),
    agency_code: account.agency_code || account.agency || null,
    balance: Number(account.current_balance ?? account.balance ?? account.initial_balance ?? 0),
    external_balance: account.external_balance ?? account.current_balance ?? null,
    bank_name: account.bank_name || account.bank || null,
    account_number: account.account_number || account.number || null,
  };
}

function isGeneralCashAccount(account) {
  const type = String(account.account_type || account.type || '').toUpperCase();
  const name = String(account.account_name || account.name || '').toLowerCase();
  return ['DINHEIRO', 'CASH'].includes(type) && name.includes('caixa geral');
}

function toLegacyFinanceAccountType(type) {
  const normalized = String(type || '').trim().toUpperCase();

  if (['DINHEIRO', 'CASH', 'CAIXA'].includes(normalized)) return 'DINHEIRO';
  if (['PIX', 'DIGITAL_WALLET'].includes(normalized)) return 'PIX';
  if (['CARTAO', 'CARD', 'CREDIT_CARD', 'CARTAO_CREDITO'].includes(normalized)) return 'CARTAO';
  if (['CHEQUE'].includes(normalized)) return 'CHEQUE';
  return 'BANCO';
}

export const financeAccountsApi = {
  async createAccount(clinicId, accountType, accountName, details = {}) {
    try {
      const payload = {
        clinic_id: clinicId,
        account_type: toLegacyFinanceAccountType(accountType),
        account_name: accountName,
        account_number: details.accountNumber || null,
        bank_name: details.bankName || null,
        agency_code: details.agencyCode || null,
        account_holder: details.accountHolder || null,
        is_active: true,
      };

      const { data, error } = await client
        .from('finance_accounts')
        .insert([payload])
        .select()
        .limit(1);

      if (error) {
        const { data: minimalData, error: minimalError } = await client
          .from('finance_accounts')
          .insert([{
            clinic_id: clinicId,
            account_type: payload.account_type,
            account_name: accountName,
          }])
          .select()
          .limit(1);

        if (minimalError) throw minimalError;
        return minimalData?.[0] || payload;
      }
      return data?.[0] || payload;
    } catch (err) {
      throw new Error(`Erro ao criar conta: ${err.message}`);
    }
  },

  async updateAccount(accountId, updates) {
    try {
      const { data, error } = await client
        .from('finance_accounts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
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
    } catch (err) {
      throw new Error(`Erro ao atualizar conta: ${err.message}`);
    }
  },

  async listAccounts(clinicId, onlyActive = true) {
    try {
      const fetchAccounts = async (tableName) => {
        const filterActive = (rows) => (rows || [])
          .filter((account) => !onlyActive || account.is_active !== false)
          .map((account) => normalizeFinancialAccount(account, tableName));

        const { data, error } = await client.from(tableName).select('*').eq('clinic_id', clinicId);
        if (error) {
          console.warn(`financeAccountsApi.listAccounts ${tableName} skipped:`, error.message);
          return [];
        }

        const normalizedByClinic = filterActive(data);
        if (normalizedByClinic.length > 0 || tableName === 'financial_accounts') {
          return normalizedByClinic;
        }

        const visible = await client.from(tableName).select('*');
        if (visible.error) {
          return normalizedByClinic;
        }

        return filterActive(visible.data).filter((account) => {
          const accountClinicId = account.clinic_id || account.clinicId;
          return !accountClinicId || accountClinicId === clinicId;
        });
      };

      const [financialAccounts, legacyAccounts, bankAccounts, clinicBankAccounts] = await Promise.all([
        fetchAccounts('financial_accounts'),
        fetchAccounts('finance_accounts'),
        fetchAccounts('bank_accounts'),
        fetchAccounts('clinic_bank_accounts'),
      ]);

      const byId = new Map();
      [...financialAccounts, ...legacyAccounts, ...bankAccounts, ...clinicBankAccounts].forEach((account) => {
        byId.set(`${account.source_table}:${account.id}`, account);
      });
      return [...byId.values()].sort((a, b) => String(a.account_name).localeCompare(String(b.account_name)));
    } catch (err) {
      throw new Error(`Erro ao listar contas: ${err.message}`);
    }
  },

  async ensureTransferAccount(clinicId, account) {
    if (!account) {
      return null;
    }

    if (account.source_table === 'finance_accounts') {
      return account;
    }

    const accountName = account.account_name || account.name || 'Conta financeira';
    const accountType = toLegacyFinanceAccountType(account.account_type || account.type || 'CHECKING');

    const { data: existing, error: existingError } = await client
      .from('finance_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('account_name', accountName)
      .maybeSingle();

    if (!existingError && existing) {
      return normalizeFinancialAccount(existing, 'finance_accounts');
    }

    const created = await this.createAccount(clinicId, accountType, accountName, {
      bankName: account.bank_name || null,
      agencyCode: account.agency_code || account.agency || null,
      accountNumber: account.account_number || null,
      accountHolder: account.account_holder || null,
    });
    return normalizeFinancialAccount(created, 'finance_accounts');
  },

  async ensureGeneralCashAccount(clinicId) {
    const accounts = await this.listAccounts(clinicId, false);
    const existing = accounts.find(isGeneralCashAccount);
    if (existing) {
      return existing;
    }

    const created = await this.createAccount(clinicId, 'DINHEIRO', 'Caixa Geral', {
      accountHolder: 'Caixa interno',
    });
    return normalizeFinancialAccount(created, 'finance_accounts');
  },

  async getAccountById(accountId) {
    try {
      const { data, error } = await client.from('finance_accounts').select('*').eq('id', accountId);

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao obter conta: ${err.message}`);
    }
  },

  async deactivateAccount(accountId) {
    try {
      const { data, error } = await client
        .from('finance_accounts')
        .update({ is_active: false })
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
    } catch (err) {
      throw new Error(`Erro ao desativar conta: ${err.message}`);
    }
  },
};

export default financeAccountsApi;
