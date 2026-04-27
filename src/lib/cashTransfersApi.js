// Cash Transfers API
import { customSupabaseClient } from './customSupabaseClient';

const client = customSupabaseClient;

export const cashTransfersApi = {
  async createTransfer(clinicId, fromAccountId, toAccountId, paymentMethod, amount, transferDate, notes = '', userId) {
    try {
      const { data, error } = await client
        .from('cash_transfers')
        .insert([
          {
            clinic_id: clinicId,
            from_account_id: fromAccountId,
            to_account_id: toAccountId,
            payment_method: paymentMethod,
            amount: parseFloat(amount),
            transfer_date: transferDate,
            status: 'pending',
            notes,
            created_by: userId
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao criar transferência: ${err.message}`);
    }
  },

  async confirmTransfer(transferId) {
    try {
      const { data, error } = await client
        .from('cash_transfers')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', transferId).select();

if (!data || data.length === 0) { throw new Error('Record not found'); }
return data[0];

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao confirmar transferência: ${err.message}`);
    }
  },

  async reverseTransfer(transferId) {
    try {
      const { data, error } = await client
        .from('cash_transfers')
        .update({ status: 'reversed' }).eq('id', transferId).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found'); 
    }
    return data[0];

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao reverter transferência: ${err.message}`);
    }
  },

  async listTransfers(clinicId, filters = {}) {
    try {
      let query = client
        .from('cash_transfers')
        .select('*')
        .eq('clinic_id', clinicId);

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.from_date) query = query.gte('transfer_date', filters.from_date);
      if (filters.to_date) query = query.lte('transfer_date', filters.to_date);

      const { data, error } = await query.order('transfer_date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      throw new Error(`Erro ao listar transferências: ${err.message}`);
    }
  },

  async getTransferById(transferId) {
    try {
      const { data, error } = await client
        .from('cash_transfers')
        .select('*')
        .eq('id', transferId);

if (!data || data.length === 0) { throw new Error('Record not found'); }
return data[0];

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao obter transferência: ${err.message}`);
    }
  }
};

export default cashTransfersApi;
