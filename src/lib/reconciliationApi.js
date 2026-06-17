/**
 * Reconciliation API Module
 * ETAPA 6: Conciliação Inteligente
 * 
 * Funções para gerenciar reconciliação de extratos bancários
 */

import { supabase } from './customSupabaseClient';

export const reconciliationApi = {
  /**
   * Upload extrato bancário
   * @param {UUID} clinicId
   * @param {Object} statementData - { file, accountId, statementDate }
   * @returns {Promise<{id, status, transactionCount}>}
   */
  async uploadStatement(clinicId, statementData) {
    try {
      // Criar registro do statement
      const { data: statement, error: stmtError } = await supabase
        .from('bank_statements')
        .insert({
          clinic_id: clinicId,
          account_id: statementData.accountId,
          statement_date: statementData.statementDate,
          file_name: statementData.fileName,
          status: 'processing',
        })
        .select()
        .single();

      if (stmtError) throw stmtError;

      // Aqui viriam as transações parseadas do arquivo
      // Por ora, retornar statement criado
      return {
        id: statement.id,
        status: statement.status,
        fileName: statement.file_name,
        message: 'Extrato enviado para processamento',
      };
    } catch (error) {
      console.error('❌ Erro ao fazer upload do extrato:', error.message);
      throw error;
    }
  },

  /**
   * Executar matching automático
   * @param {UUID} statementId
   * @returns {Promise<{totalMatched, autoExact, autoFuzzy, autoPartial, unmatched}>}
   */
  async matchTransactions(statementId) {
    try {
      const { data, error } = await supabase.rpc('match_bank_transactions', {
        p_statement_id: statementId,
      });

      if (error) throw error;

      return {
        totalMatched: data[0].total_matched,
        autoExact: data[0].auto_exact,
        autoFuzzy: data[0].auto_fuzzy,
        autoPartial: data[0].auto_partial,
        unmatched: data[0].unmatched,
        message: `✅ Matching completo: ${data[0].total_matched} transações combinadas`,
      };
    } catch (error) {
      console.error('❌ Erro ao executar matching:', error.message);
      throw error;
    }
  },

  /**
   * Obter transações do extrato
   * @param {UUID} statementId
   * @returns {Promise<Array>}
   */
  async getTransactions(statementId) {
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select(`
          id,
          transaction_date,
          amount,
          description,
          reference_number,
          matched_to_id,
          match_type,
          match_confidence,
          status,
          notes
        `)
        .eq('statement_id', statementId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar transações:', error.message);
      throw error;
    }
  },

  /**
   * Atualizar match de transação (manual)
   * @param {UUID} transactionId
   * @param {UUID} invoiceId
   * @param {string} notes
   * @returns {Promise<Object>}
   */
  async updateTransactionMatch(transactionId, invoiceId, notes = '') {
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update({
          matched_to_id: invoiceId,
          match_type: 'manual',
          status: 'matched',
          notes,
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, message: 'Match atualizado' };
    } catch (error) {
      console.error('❌ Erro ao atualizar match:', error.message);
      throw error;
    }
  },

  /**
   * Rejeitar match de transação
   * @param {UUID} transactionId
   * @returns {Promise<Object>}
   */
  async rejectMatch(transactionId) {
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update({
          matched_to_id: null,
          match_type: null,
          match_confidence: 0,
          status: 'unmatched',
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, message: 'Match rejeitado' };
    } catch (error) {
      console.error('❌ Erro ao rejeitar match:', error.message);
      throw error;
    }
  },

  /**
   * Obter resumo de reconciliação
   * @param {UUID} clinicId
   * @returns {Promise<Object>}
   */
  async getReconciliationSummary(clinicId) {
    try {
      const { data, error } = await supabase
        .from('v_reconciliation_summary')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('statement_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar resumo:', error.message);
      throw error;
    }
  },

  /**
   * Gerar relatório de reconciliação
   * @param {UUID} clinicId
   * @param {UUID} statementId
   * @param {UUID} userId
   * @returns {Promise<{reportId, status}>}
   */
  async generateReport(clinicId, statementId, userId) {
    try {
      const { data, error } = await supabase.rpc(
        'generate_reconciliation_report',
        {
          p_clinic_id: clinicId,
          p_statement_id: statementId,
          p_created_by: userId,
        }
      );

      if (error) throw error;

      return {
        reportId: data,
        status: 'completed',
        message: '📊 Relatório gerado com sucesso',
      };
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error.message);
      throw error;
    }
  },

  /**
   * Detectar duplicatas
   * @param {UUID} clinicId
   * @param {number} daysRange
   * @returns {Promise<Array>}
   */
  async detectDuplicates(clinicId, daysRange = 7) {
    try {
      const { data, error } = await supabase.rpc('detect_bank_duplicates', {
        p_clinic_id: clinicId,
        p_date_range: daysRange,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao detectar duplicatas:', error.message);
      throw error;
    }
  },

  /**
   * Obter histórico de reconciliação
   * @param {UUID} clinicId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getReconciliationHistory(clinicId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('reconciliation_history')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('reconciliation_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error.message);
      throw error;
    }
  },

  // ===== WORKFLOW DE RECONCILIAÇÃO DE TRANSFERÊNCIAS DE CAIXA =====

  /**
   * Cria transferência pendente de aprovação
   */
  async createPendingApprovalTransfer(transferData) {
    try {
      const { data, error } = await supabase.from('cash_transfers').insert([
        {
          ...transferData,
          status: 'pending_approval',
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('❌ Erro ao criar transferência pendente:', error.message);
      throw error;
    }
  },

  /**
   * Lista transferências aguardando aprovação
   */
  async getTransfersAwaitingApproval(clinicId) {
    try {
      const { data, error } = await supabase
        .from('cash_transfers')
        .select(`
          *,
          from_drawer:cash_drawers(id, date_opened, operator:users(name, email)),
          to_account:finance_accounts(account_name, account_type)
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao listar transferências pendentes:', error.message);
      return [];
    }
  },

  /**
   * Aprova transferência e registra assinatura do gestor
   */
  async approveTransfer(transferId, approvalData) {
    try {
      const { data, error } = await supabase
        .from('cash_transfers')
        .update({
          status: 'confirmed',
          approved_by: approvalData.approvedBy,
          approval_timestamp: new Date().toISOString(),
          manager_signature: approvalData.signature,
          approval_notes: approvalData.notes,
        })
        .eq('id', transferId)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        await this.logApprovalAction({
          transferId,
          action: 'approved',
          approvedBy: approvalData.approvedBy,
          timestamp: new Date().toISOString(),
        });
      }

      return data?.[0];
    } catch (error) {
      console.error('❌ Erro ao aprovar transferência:', error.message);
      throw error;
    }
  },

  /**
   * Rejeita transferência e registra motivo
   */
  async rejectTransfer(transferId, rejectionData) {
    try {
      const { data, error } = await supabase
        .from('cash_transfers')
        .update({
          status: 'rejected',
          rejected_by: rejectionData.rejectedBy,
          rejection_timestamp: new Date().toISOString(),
          rejection_reason: rejectionData.reason,
        })
        .eq('id', transferId)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        await this.logApprovalAction({
          transferId,
          action: 'rejected',
          rejectedBy: rejectionData.rejectedBy,
          reason: rejectionData.reason,
          timestamp: new Date().toISOString(),
        });
      }

      return data?.[0];
    } catch (error) {
      console.error('❌ Erro ao rejeitar transferência:', error.message);
      throw error;
    }
  },

  /**
   * Obtém histórico de aprovações de uma transferência
   */
  async getTransferApprovalHistory(transferId) {
    try {
      const { data, error } = await supabase
        .from('cash_transfer_audit_logs')
        .select('*')
        .eq('transfer_id', transferId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error.message);
      return [];
    }
  },

  /**
   * Registra ação de aprovação/rejeição para auditoria
   */
  async logApprovalAction(actionData) {
    try {
      await supabase.from('cash_transfer_audit_logs').insert([
        {
          transfer_id: actionData.transferId,
          action: actionData.action,
          performed_by: actionData.approvedBy || actionData.rejectedBy,
          action_data: JSON.stringify(actionData),
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('❌ Erro ao registrar ação:', error.message);
    }
  },

  /**
   * Encerra reconciliação do caixa
   */
  async finalizeDrawerReconciliation(drawerId, reconciliationData) {
    try {
      const { data, error } = await supabase
        .from('cash_drawers')
        .update({
          status: reconciliationData.status,
          closing_balance: reconciliationData.closingBalance,
          reconciliation_notes: reconciliationData.notes,
          reconciled_by: reconciliationData.reconciledBy,
          reconciliation_timestamp: new Date().toISOString(),
        })
        .eq('id', drawerId)
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('❌ Erro ao finalizar reconciliação:', error.message);
      throw error;
    }
  },

  /**
   * Obtém resumo de reconciliações pendentes
   */
  async getPendingReconciliationsSummary(clinicId, dateRange = 'today') {
    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const { data, error } = await supabase
        .from('cash_drawers')
        .select(`
          *,
          operator:users(name, email),
          pending_transfers:cash_transfers(id, amount, status)
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'closed_partial')
        .gte('date_opened', startDate.toISOString())
        .order('date_opened', { ascending: false });

      if (error) throw error;

      return (data || []).map((drawer) => ({
        drawerId: drawer.id,
        operatorName: drawer.operator?.name || 'Desconhecido',
        operatorEmail: drawer.operator?.email,
        dateOpened: drawer.date_opened,
        closingBalance: drawer.closing_balance,
        discrepancy: drawer.closing_balance - drawer.expected_balance,
        pendingApprovals: drawer.pending_transfers?.filter((t) => t.status === 'pending_approval').length || 0,
        reconciliationNotes: drawer.reconciliation_notes,
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar resumo:', error.message);
      return [];
    }
  },
};

export default reconciliationApi;
