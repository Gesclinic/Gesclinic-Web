/**
 * Financial Accounts Page
 * Main page for managing financial accounts (Enterprise)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, AlertCircle, Inbox, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  FinancialAccountForm,
  FinancialAccountsTable,
  FinancialBalanceSummary,
  FinancialAccountFilters,
  DashboardMetricsCards,
  FinancialAccountCard,
  RecentMovementsPanel,
  ReconciliationPanel,
  EmptyState,
  CardGridSkeleton,
  DashboardMetricsSkeleton,
  FinancialAccountsExportImport,
} from '../components';
import { useFinancialAccounts } from '../hooks';
import { FinancialAccount, FinancialAccountCreateInput, FinancialAccountUpdateInput } from '../types';

export const FinancialAccountsPage: React.FC = () => {
  // ✅ All context hooks at the top (MUST be in consistent order)
  const { user } = useAuth();
  
  // ✅ All custom hooks after context hooks
  const {
    accounts,
    balanceSummary,
    loading,
    loadingBalance,
    loadingMetrics,
    loadingMovements,
    loadingReconciliations,
    error: listError,
    metrics,
    movements,
    reconciliations,
    refetch,
    refetchBalance,
    refetchMovements,
    refetchMetrics,
    refetchReconciliations,
    create,
    update,
    deactivate,
    setDefault,
    addMovement,
    createReconcile,
    setFilters,
    filters,
  } = useFinancialAccounts();
  
  // ✅ All state hooks after custom hooks
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [selectedAccountForReconciliation, setSelectedAccountForReconciliation] = useState<string | null>(null);
  const [showCardView, setShowCardView] = useState(false);

  // Get unique bank names for filter
  const bankNames = Array.from(new Set(accounts.map((acc) => acc.bank_name))).sort();

  // ✅ All callbacks after state hooks
  const handleNewAccount = useCallback(() => {
    setEditingAccount(null);
    setFormError(null);
    setFormOpen(true);
  }, []);

  // Handle form close
  const handleFormClose = useCallback((open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingAccount(null);
      setFormError(null);
    }
  }, []);

  // Handle edit
  const handleEdit = useCallback((account: FinancialAccount) => {
    setEditingAccount(account);
    setFormError(null);
    setFormOpen(true);
  }, []);

  // Handle form submit
  const handleFormSubmit = async (
    data: FinancialAccountCreateInput | FinancialAccountUpdateInput
  ) => {
    try {
      setFormSubmitting(true);
      setFormError(null);

      if (editingAccount) {
        await update(editingAccount.id, data as FinancialAccountUpdateInput);
      } else {
        await create(data as FinancialAccountCreateInput);
      }

      handleFormClose(false);
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao salvar conta financeira');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle deactivate
  const handleDeactivate = async (account: FinancialAccount) => {
    try {
      setDeactivatingId(account.id);
      await deactivate(account.id);
    } catch (err: any) {
      console.error('Error deactivating account:', err);
    } finally {
      setDeactivatingId(null);
    }
  };

  // Handle set default
  const handleSetDefault = async (account: FinancialAccount) => {
    try {
      await setDefault(account.id);
    } catch (err: any) {
      console.error('Error setting default account:', err);
    }
  };

  // Handle view movements
  const handleViewMovements = useCallback((account: FinancialAccount) => {
    refetchMovements(account.id);
  }, [refetchMovements]);

  // Handle reconciliation
  const handleReconcile = useCallback(async (accountId: string, data: any) => {
    await createReconcile(accountId, data);
    setSelectedAccountForReconciliation(null);
  }, [createReconcile]);

  // Handle import accounts from CSV
  const handleImportAccounts = useCallback(async (importedAccounts: FinancialAccount[]) => {
    try {
      setFormSubmitting(true);
      let successCount = 0;
      const errors: string[] = [];

      for (const account of importedAccounts) {
        try {
          const createData: FinancialAccountCreateInput = {
            bank_name: account.bank_name,
            account_name: account.account_name,
            account_type: account.account_type,
            agency: account.agency,
            account_number: account.account_number,
            currency: account.currency,
            is_active: account.is_active,
            is_default: account.is_default,
          };
          await create(createData);
          successCount++;
        } catch (err: any) {
          errors.push(`${account.account_name}: ${err.message}`);
        }
      }

      // Show summary
      if (successCount > 0) {
        refetch(); // Reload accounts
      }

      // Show detailed feedback
      if (errors.length === 0) {
        console.log(`✅ Sucesso: ${successCount} contas importadas`);
      } else {
        console.warn(`✅ ${successCount} importadas, ⚠️ ${errors.length} erros:`, errors);
      }
    } catch (err: any) {
      console.error('Erro ao importar contas:', err);
    } finally {
      setFormSubmitting(false);
    }
  }, [create, refetch]);

  // ✅ Load metrics and movements on mount
  useEffect(() => {
    refetchMetrics();
    refetchMovements();
  }, [refetchMetrics, refetchMovements]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas Financeiras</h1>
          <p className="text-gray-600 mt-1">
            Gestão enterprise de contas, movimentações e conciliações
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showCardView ? "secondary" : "outline"}
            onClick={() => setShowCardView(!showCardView)}
            size="sm"
          >
            {showCardView ? "Tabela" : "Cards"}
          </Button>
          <Button onClick={handleNewAccount} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Dashboard Metrics */}
      {metrics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard</h2>
          <DashboardMetricsCards metrics={metrics} loading={loadingMetrics} />
        </div>
      )}

      {/* Balance Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Saldos</h2>
        <FinancialBalanceSummary summary={balanceSummary} loading={loadingBalance} />
      </div>

      {/* List Error Alert */}
      {listError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Erro ao carregar contas</p>
            <p className="text-sm text-red-700 mt-1">{listError}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-4">
          <FinancialAccountFilters
            onFilter={setFilters}
            onReset={refetch}
            loading={loading}
            banks={bankNames}
          />
          {/* Export/Import Options */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Importação e Exportação</p>
            <FinancialAccountsExportImport
              accounts={accounts}
              onImportSuccess={handleImportAccounts}
            />
          </div>
        </div>
      </div>

      {/* Card View or Table View */}
      {showCardView ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <CardGridSkeleton cards={3} />
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhuma conta financeira"
              description="Comece a gerenciar suas contas criando uma nova conta bancária"
              actionLabel="Criar Conta"
              onAction={handleNewAccount}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {accounts.map((account) => (
                <FinancialAccountCard
                  key={account.id}
                  account={{
                    ...account,
                    movements_count: movements.filter((m) => m.account_id === account.id).length,
                    last_movement: movements.find((m) => m.account_id === account.id),
                    reconciliation_info: reconciliations.find((r) => r.account_id === account.id),
                  }}
                  onEdit={handleEdit}
                  onSetDefault={handleSetDefault}
                  onDeactivate={handleDeactivate}
                  onViewMovements={handleViewMovements}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhuma conta financeira"
              description="Comece a gerenciar suas contas criando uma nova conta bancária"
              actionLabel="Criar Conta"
              onAction={handleNewAccount}
            />
          ) : (
            <FinancialAccountsTable
              accounts={accounts}
              loading={loading}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
              onSetDefault={handleSetDefault}
              deactivatingId={deactivatingId}
            />
          )}
        </div>
      )}

      {/* Recent Movements Panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimas Movimentações</h2>
        {movements.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Nenhuma movimentação registrada"
            description="As movimentações das suas contas aparecerão aqui"
          />
        ) : (
          <RecentMovementsPanel movements={movements} loading={loadingMovements} pageSize={10} />
        )}
      </div>

      {/* Reconciliation Panel */}
      {selectedAccountForReconciliation && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conciliação Bancária</h2>
          <ReconciliationPanel
            accountName={
              accounts.find((a) => a.id === selectedAccountForReconciliation)?.account_name || "Conta"
            }
            currentBalance={
              accounts.find((a) => a.id === selectedAccountForReconciliation)?.current_balance || 0
            }
            reconciliationRecords={reconciliations}
            loading={loadingReconciliations}
            onReconcile={(statementBalance, notes) =>
              handleReconcile(selectedAccountForReconciliation, {
                reconciliation_date: new Date().toISOString().split("T")[0],
                balance_statement: statementBalance,
                balance_system:
                  accounts.find((a) => a.id === selectedAccountForReconciliation)?.current_balance || 0,
                status: "pendente",
                notes,
              })
            }
          />
        </div>
      )}

      {/* Form Dialog */}
      <FinancialAccountForm
        open={formOpen}
        onOpenChange={handleFormClose}
        account={editingAccount || undefined}
        onSubmit={handleFormSubmit}
        loading={formSubmitting}
        error={formError}
      />
    </div>
  );
};
