// Cash Drawer Management API
import { customSupabaseClient } from './customSupabaseClient';

const client = customSupabaseClient;

export const cashDrawerApi = {
  // ==================== CASH DRAWERS ====================

  // Abrir/Obter caixa do dia
  async getOrCreateDrawer(clinicId, operatorId, date = new Date().toISOString().split('T')[0]) {
    try {
      // Verificar se existe caixa aberta para o operador neste dia
      const { data, error } = await client
        .from('cash_drawers')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('operator_id', operatorId)
        .eq('date_opened', date)
        .single();

      if (!error && data) {
        return data;
      }

      // Criar novo caixa
      return await this.openDrawer(clinicId, operatorId, date);
    } catch (err) {
      throw new Error(`Erro ao obter/criar caixa: ${err.message}`);
    }
  },

  async openDrawer(
    clinicId,
    operatorId,
    date = new Date().toISOString().split('T')[0],
    openingBalance = 0,
  ) {
    try {
      const { data, error } = await client
        .from('cash_drawers')
        .insert([
          {
            clinic_id: clinicId,
            operator_id: operatorId,
            date_opened: date,
            opening_balance: parseFloat(openingBalance),
            status: 'open',
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao abrir caixa: ${err.message}`);
    }
  },

  async closeDrawer(drawerId, closingBalance, expectedBalance = null, notes = '') {
    try {
      const { data, error } = await client
        .from('cash_drawers')
        .update({
          closing_balance: parseFloat(closingBalance),
          expected_balance: expectedBalance ? parseFloat(expectedBalance) : null,
          status: expectedBalance === parseFloat(closingBalance) ? 'closed_full' : 'closed_partial',
          closed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', drawerId)
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
      throw new Error(`Erro ao fechar caixa: ${err.message}`);
    }
  },

  async getDrawerById(drawerId) {
    try {
      const { data, error } = await client.from('cash_drawers').select('*').eq('id', drawerId);

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao buscar caixa: ${err.message}`);
    }
  },

  async listDrawers(clinicId, filters = {}) {
    try {
      let query = client.from('cash_drawers').select('*').eq('clinic_id', clinicId);

      if (filters.operator_id) {
        query = query.eq('operator_id', filters.operator_id);
      }
      if (filters.date) {
        query = query.eq('date_opened', filters.date);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('date_opened', { ascending: false });

      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      throw new Error(`Erro ao listar caixas: ${err.message}`);
    }
  },

  // ==================== DRAWER MOVEMENTS ====================

  async addMovement(
    drawerId,
    clinicId,
    paymentMethod,
    paymentType,
    amount,
    description = '',
    appointmentId = null,
  ) {
    try {
      const { data, error } = await client
        .from('drawer_movements')
        .insert([
          {
            drawer_id: drawerId,
            clinic_id: clinicId,
            appointment_id: appointmentId,
            payment_method: paymentMethod,
            payment_type: paymentType,
            amount: parseFloat(amount),
            description,
          },
        ])
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
      throw new Error(`Erro ao registrar movimento: ${err.message}`);
    }
  },

  async getMovements(drawerId) {
    try {
      const { data, error } = await client
        .from('drawer_movements')
        .select('*')
        .eq('drawer_id', drawerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      throw new Error(`Erro ao listar movimentos: ${err.message}`);
    }
  },

  async getMovementSummary(drawerId) {
    try {
      const movements = await this.getMovements(drawerId);

      const summary = {
        totalEntrada: 0,
        totalSaida: 0,
        byMethod: {},
      };

      movements.forEach((mov) => {
        if (mov.payment_type === 'entrada') {
          summary.totalEntrada += parseFloat(mov.amount);
        } else {
          summary.totalSaida += parseFloat(mov.amount);
        }

        if (!summary.byMethod[mov.payment_method]) {
          summary.byMethod[mov.payment_method] = { entrada: 0, saida: 0 };
        }

        if (mov.payment_type === 'entrada') {
          summary.byMethod[mov.payment_method].entrada += parseFloat(mov.amount);
        } else {
          summary.byMethod[mov.payment_method].saida += parseFloat(mov.amount);
        }
      });

      summary.balance = summary.totalEntrada - summary.totalSaida;
      return summary;
    } catch (err) {
      throw new Error(`Erro ao calcular resumo: ${err.message}`);
    }
  },

  async deleteMovement(movementId) {
    try {
      const { error } = await client.from('drawer_movements').delete().eq('id', movementId);

      if (error) {
        throw error;
      }
      return true;
    } catch (err) {
      throw new Error(`Erro ao deletar movimento: ${err.message}`);
    }
  },

  // ==================== FINANCE ACCOUNTS ====================

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

  // ==================== CASH TRANSFERS ====================

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
        .update({ status: 'confirmed' })
        .eq('id', transferId)
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
      throw new Error(`Erro ao confirmar transferência: ${err.message}`);
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
};

export default cashDrawerApi;
