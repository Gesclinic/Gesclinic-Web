// Cash Transfers API
import { customSupabaseClient } from './customSupabaseClient';

const client = customSupabaseClient;

async function enrichTransfers(transfers, clinicId) {
  const rows = transfers || [];
  const drawerIds = [...new Set(rows.map((transfer) => transfer.from_drawer_id).filter(Boolean))];
  const accountIds = [
    ...new Set(rows.flatMap((transfer) => [transfer.from_account_id, transfer.to_account_id]).filter(Boolean)),
  ];

  const [drawersRes, financialAccountsRes, legacyAccountsRes] = await Promise.all([
    drawerIds.length > 0
      ? client.from('cash_drawers').select('*').eq('clinic_id', clinicId).in('id', drawerIds)
      : Promise.resolve({ data: [] }),
    accountIds.length > 0
      ? client.from('financial_accounts').select('*').eq('clinic_id', clinicId).in('id', accountIds)
      : Promise.resolve({ data: [] }),
    accountIds.length > 0
      ? client.from('finance_accounts').select('*').eq('clinic_id', clinicId).in('id', accountIds)
      : Promise.resolve({ data: [] }),
  ]);

  const drawers = drawersRes.data || [];
  const operatorIds = [...new Set(drawers.map((drawer) => drawer.operator_id).filter(Boolean))];
  const { data: users } = operatorIds.length > 0
    ? await client.from('users').select('id, name, full_name, email').eq('clinic_id', clinicId).in('id', operatorIds)
    : { data: [] };

  const usersById = new Map((users || []).map((user) => [user.id, user]));
  const drawersById = new Map(drawers.map((drawer) => {
    const operator = usersById.get(drawer.operator_id);
    return [
      drawer.id,
      {
        ...drawer,
        operator: operator
          ? {
              id: operator.id,
              name: operator.full_name || operator.name || operator.email || 'Operador',
              email: operator.email,
            }
          : null,
      },
    ];
  }));
  const accountsById = new Map([
    ...(financialAccountsRes.data || []),
    ...(legacyAccountsRes.data || []),
  ].map((account) => [account.id, account]));

  return rows.map((transfer) => ({
    ...transfer,
    from_drawer: drawersById.get(transfer.from_drawer_id) || null,
    from_account: accountsById.get(transfer.from_account_id) || null,
    to_account: accountsById.get(transfer.to_account_id) || null,
  }));
}

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
            status: payload.status || 'confirmed',
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
            status: 'confirmed',
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

  async cancelTransfer(transferId, notes = '') {
    try {
      const { data, error } = await client
        .from('cash_transfers')
        .update({
          status: 'canceled',
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transferId)
        .in('status', ['pending', 'pending_approval'])
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Transferência não encontrada ou já processada.');
      }
      return data[0];
    } catch (err) {
      throw new Error(`Erro ao cancelar transferência: ${err.message}`);
    }
  },

  async updatePendingTransfer(transferId, payload) {
    try {
      const { data, error } = await client
        .from('cash_transfers')
        .update({
          from_drawer_id: payload.from_drawer_id || null,
          from_account_id: payload.from_account_id || null,
          to_account_id: payload.to_account_id,
          payment_method: payload.payment_method,
          amount: parseFloat(payload.amount),
          transfer_date: payload.transfer_date,
          notes: payload.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transferId)
        .in('status', ['pending', 'pending_approval'])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao editar transferência: ${err.message}`);
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
      return enrichTransfers(data || [], clinicId);
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
