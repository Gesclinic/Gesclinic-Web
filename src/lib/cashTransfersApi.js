// Cash Transfers API
import { customSupabaseClient } from './customSupabaseClient';

const client = customSupabaseClient;

export const cashTransfersApi = {
  async create(payloadOrClinicId, fromAccountId, toAccountId, paymentMethod, amount, transferDate, notes = '', userId) {
    if (typeof payloadOrClinicId === 'object') {
      return this.createTransferFromPayload(payloadOrClinicId);
    }

    return this.createTransfer(
      payloadOrClinicId,
      fromAccountId,
      toAccountId,
      paymentMethod,
      amount,
      transferDate,
      notes,
      userId,
    );
  },

  async createTransferFromPayload(payload) {
    try {
      const { data, error } = await client
        .from('cash_transfers')
        .insert([
          {
            clinic_id: payload.clinic_id,
            from_drawer_id: payload.from_drawer_id || null,
            from_account_id: payload.from_account_id || null,
            to_account_id: payload.to_account_id,
            payment_method: payload.payment_method,
            amount: parseFloat(payload.amount),
            transfer_date: payload.transfer_date,
            status: payload.status || 'pending',
            reference_document: payload.reference_document || null,
            notes: payload.notes || null,
            created_by: payload.created_by,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao criar transferência: ${err.message}`);
    }
  },

  async createTransfer(
    clinicId,
    fromAccountId,
    toAccountId,
    paymentMethod,
    amount,
    transferDate,
    notes = '',
    userId,
  ) {
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
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao criar transferência: ${err.message}`);
    }
  },

  async confirmTransfer(transferId) {
    try {
      const { data, error } = await client
        .from('cash_transfers')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', transferId)
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];
    } catch (err) {
      throw new Error(`Erro ao confirmar transferência: ${err.message}`);
    }
  },

  async reverseTransfer(transferId) {
    try {
      const { data, error } = await client
        .from('cash_transfers')
        .update({ status: 'reversed' })
        .eq('id', transferId)
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];
    } catch (err) {
      throw new Error(`Erro ao reverter transferência: ${err.message}`);
    }
  },

  async listTransfers(clinicId, filters = {}) {
    try {
      let query = client.from('cash_transfers').select('*').eq('clinic_id', clinicId);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.from_date) {
        query = query.gte('transfer_date', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('transfer_date', filters.to_date);
      }

      const { data, error } = await query.order('transfer_date', { ascending: false });
      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      throw new Error(`Erro ao listar transferências: ${err.message}`);
    }
  },

  async listByClinic(clinicId, filters = {}) {
    return this.listTransfers(clinicId, filters);
  },

  async getTransferById(transferId) {
    try {
      const { data, error } = await client.from('cash_transfers').select('*').eq('id', transferId);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];
    } catch (err) {
      throw new Error(`Erro ao obter transferência: ${err.message}`);
    }
  },
};

export default cashTransfersApi;
