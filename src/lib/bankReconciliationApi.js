// Bank Reconciliation API
import { customSupabaseClient } from './customSupabaseClient';

const client = customSupabaseClient;

export const bankReconciliationApi = {
  async createReconciliation(clinicId, accountId, bankStatementDate, bankBalance, systemBalance) {
    try {
      const { data, error } = await client
        .from('bank_reconciliation')
        .insert([
          {
            clinic_id: clinicId,
            account_id: accountId,
            bank_statement_date: bankStatementDate,
            bank_balance: parseFloat(bankBalance),
            system_balance: parseFloat(systemBalance),
            status:
              Math.abs(parseFloat(bankBalance) - parseFloat(systemBalance)) < 0.01
                ? 'reconciled'
                : 'needs_adjustment',
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao criar reconciliação: ${err.message}`);
    }
  },

  async updateReconciliation(reconciliationId, status, notes = '') {
    try {
      const { data, error } = await client
        .from('bank_reconciliation')
        .update({
          status,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reconciliationId)
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
      throw new Error(`Erro ao atualizar reconciliação: ${err.message}`);
    }
  },

  async listReconciliations(clinicId, filters = {}) {
    try {
      let query = client.from('bank_reconciliation').select('*').eq('clinic_id', clinicId);

      if (filters.account_id) {
        query = query.eq('account_id', filters.account_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.from_date) {
        query = query.gte('bank_statement_date', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('bank_statement_date', filters.to_date);
      }

      const { data, error } = await query.order('bank_statement_date', { ascending: false });
      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      throw new Error(`Erro ao listar reconciliações: ${err.message}`);
    }
  },

  async getReconciliationById(reconciliationId) {
    try {
      const { data, error } = await client
        .from('bank_reconciliation')
        .select('*')
        .eq('id', reconciliationId);

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao obter reconciliação: ${err.message}`);
    }
  },

  async getPendingReconciliations(clinicId) {
    try {
      const { data, error } = await client
        .from('bank_reconciliation')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('status', 'pending')
        .order('bank_statement_date', { ascending: true });

      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      throw new Error(`Erro ao listar reconciliações pendentes: ${err.message}`);
    }
  },
};

export default bankReconciliationApi;
