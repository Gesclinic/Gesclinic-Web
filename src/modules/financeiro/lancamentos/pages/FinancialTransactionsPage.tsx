/**
 * Financial Transactions Page
 * Página principal do motor financeiro enterprise
 */

import React, { useState, useCallback } from 'react';
import { Plus, AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import RelatoriosToolbar from '@/components/financeiro/RelatoriosToolbar';
import {
  TransactionForm,
  TransactionsTable,
  TransactionFilters,
  FinancialDashboard,
  TransactionExportImport,
} from '../components';
import { useFinancialTransactions } from '../hooks';
import {
  FinancialTransaction,
  FinancialTransactionCreateInput,
  FinancialTransactionUpdateInput,
} from '../types';

export const FinancialTransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const clinicContext = useClinicContext();
  const { clinicId } = clinicContext || {};
  const [pageSize, setPageSize] = useState(50);

  // Debug
  React.useEffect(() => {
    console.log('✅ FinancialTransactionsPage mounted', {
      clinicId,
      clinicContext: clinicContext ? { clinicId: clinicContext.clinicId, loadingClinic: clinicContext.loadingClinic } : null,
      user: user?.email
    });
  }, [clinicId, clinicContext, user]);

  const {
    transactions,
    categories,
    costCenters,
    loading,
    error: listError,
    metrics,
    page,
    totalPages,
    filters,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    cancelTransaction,
    revertTransaction,
    reconcileTransaction,
    importTransactions,
    setFilters,
    setPage,
  } = useFinancialTransactions({ pageSize });

  // Fetch financial accounts
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [accountsLoading, setAccountsLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setAccountsLoading(true);
        const { customSupabaseClient } = await import('@/lib/customSupabaseClient');
        const { data } = await customSupabaseClient
          .from('financial_accounts')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('is_active', true);
        setAccounts(data || []);
      } catch (err) {
        console.error('Error fetching accounts:', err);
      } finally {
        setAccountsLoading(false);
      }
    };

    if (clinicId) fetchAccounts();
  }, [clinicId]);

  // State
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Callbacks
  const handleNewTransaction = useCallback(() => {
    setEditingTransaction(null);
    setFormError(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setFormError(null);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = async (
    data: FinancialTransactionCreateInput | FinancialTransactionUpdateInput
  ) => {
    try {
      setFormSubmitting(true);
      setFormError(null);

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data as FinancialTransactionUpdateInput);
      } else {
        await createTransaction(data as FinancialTransactionCreateInput);
      }

      setFormOpen(false);
      setEditingTransaction(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar transação';
      setFormError(message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (transaction: FinancialTransaction) => {
    try {
      setDeletingId(transaction.id);
      await deleteTransaction(transaction.id);
    } catch (err) {
      console.error('Error deleting transaction:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRevert = async (transaction: FinancialTransaction) => {
    try {
      await revertTransaction(transaction.id);
    } catch (err) {
      console.error('Error reverting transaction:', err);
    }
  };

  const handleReconcile = async (transaction: FinancialTransaction) => {
    try {
      await reconcileTransaction(transaction.id);
    } catch (err) {
      console.error('Error reconciling transaction:', err);
    }
  };

  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters);
    fetchTransactions(newFilters, { page: 1 });
  };

  const handleReset = () => {
    setFilters({});
    fetchTransactions({}, { page: 1 });
  };

  const handlePageSizeChange = (value: string) => {
    const nextPageSize = Number(value);
    setPageSize(nextPageSize);
    setPage(1);
    fetchTransactions(filters, { page: 1, limit: nextPageSize });
  };

  const handleImport = async (data: any[]) => {
    try {
      const result = await importTransactions(data);
      alert(
        `Importação concluída!\n✓ ${result.success} transações criadas\n✗ ${result.failed} erros\n${
          result.errors.length > 0 ? '\nErros:\n' + result.errors.slice(0, 5).join('\n') : ''
        }`
      );
    } catch (err) {
      console.error('Erro ao importar:', err);
      alert('Erro ao processar importação');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lançamentos Financeiros</h1>
          <p className="text-gray-600 mt-1">Motor financeiro central - gestão integrada de movimentações</p>
        </div>
        <div className="flex gap-2">
          <TransactionExportImport
            transactions={transactions}
            onImport={handleImport}
          />
          <Button onClick={handleNewTransaction} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Dashboard */}
      {metrics && (
        <FinancialDashboard metrics={metrics} loading={loading} />
      )}

      {/* RELATÓRIOS TOOLBAR */}
      <RelatoriosToolbar
        title="Lançamentos Financeiros"
        data={transactions.map(t => ({
          data: t.transaction_date || t.competency_date || t.created_at,
          descricao: t.description,
          tipo: t.type === 'revenue' || t.transaction_type === 'INCOME' ? 'Entrada' : 'Saída',
          categoria: t.category,
          valor: t.amount,
          observacoes: t.notes || '-'
        }))}
        columns={[
          { key: 'data', label: 'Data', width: 12 },
          { key: 'descricao', label: 'Descrição', width: 25 },
          { key: 'tipo', label: 'Tipo (E/S)', width: 10 },
          { key: 'categoria', label: 'Categoria', width: 18 },
          { key: 'valor', label: 'Valor', width: 18, format: 'currency' },
          { key: 'observacoes', label: 'Observações', width: 17 }
        ]}
        templateFileName="lancamentos"
      />

      {/* Erro Geral */}
      {listError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Erro ao carregar transações</p>
            <p className="text-sm text-red-700 mt-1">{listError}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <TransactionFilters
        onFilter={handleApplyFilters}
        onReset={handleReset}
        loading={loading}
        accounts={accounts}
        categories={categories}
      />

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Transações</h2>
            <p className="text-sm text-gray-500">Selecione a quantidade exibida para marcar mais lançamentos de uma vez.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Itens por página
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
              value={pageSize}
              onChange={(event) => handlePageSizeChange(event.target.value)}
              aria-label="Itens por página"
              title="Itens por página"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </label>
        </div>
        <TransactionsTable
          transactions={transactions}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRevert={handleRevert}
          onReconcile={handleReconcile}
          deletingId={deletingId}
        />
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || loading}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Form Dialog */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editingTransaction || undefined}
        accounts={accounts}
        categories={categories}
        costCenters={costCenters}
        onSubmit={handleFormSubmit}
        loading={formSubmitting}
        error={formError}
      />
    </div>
  );
};
