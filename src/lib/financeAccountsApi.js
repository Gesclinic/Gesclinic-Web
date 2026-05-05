// Finance Accounts API
import { customSupabaseClient } from './customSupabaseClient';

const client = customSupabaseClient;

export const financeAccountsApi = {
  async createAccount(clinicId, accountType, accountName, details = {}) {
    try {
      const { data, error } = await client
        .from('finance_accounts')
        .insert([
          {
            clinic_id: clinicId,
            account_type: accountType,
            account_name: accountName,
            account_number: details.accountNumber || null,
            bank_name: details.bankName || null,
            agency_code: details.agencyCode || null,
            account_holder: details.accountHolder || null,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
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
      let query = client.from('finance_accounts').select('*').eq('clinic_id', clinicId);

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('account_type').order('account_name');
      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      throw new Error(`Erro ao listar contas: ${err.message}`);
    }
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
