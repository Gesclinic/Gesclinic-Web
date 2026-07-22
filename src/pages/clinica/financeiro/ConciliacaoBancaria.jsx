// src/pages/clinica/financeiro/ConciliacaoBancaria.jsx
// Página principal de Conciliação Bancária

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useConciliation } from '@/hooks/useConciliation';
import { useFinancialAccounts } from '@/modules/financeiro/contas-financeiras';
import { ConciliaoIndicadores } from '@/components/financeiro/conciliacao/ConciliaoIndicadores';
import { ConciliacaoImportacao } from '@/components/financeiro/conciliacao/ConciliacaoImportacao';
import { ConciliacaoLista } from '@/components/financeiro/conciliacao/ConciliacaoLista';
import { ConciliacaoPainel } from '@/components/financeiro/conciliacao/ConciliacaoPainel';
import { ConciliacaoPayablesReview } from '@/components/financeiro/conciliacao/ConciliacaoPayablesReview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ConciliacaoBancaria() {
  const { clinicId } = useClinicContext();
  const navigate = useNavigate();
  const [selectedStatements, setSelectedStatements] = useState([]);

  const { accounts: financialAccounts } = useFinancialAccounts({
    limit: 500,
    is_active: true,
    sortBy: 'account_name',
    sortOrder: 'asc',
  });

  const {
    statements,
    statementsTotal,
    loading,
    payableLoading,
    error,
    indicators,
    bankAccounts,
    suggestions,
    payableReviews,
    payableReviewCounts,
    payableReviewStatus,
    selectedStatement,
    filters,
    importExtract,
    findSuggestionsForStatement,
    handleConciliate,
    handleCreateAndLink,
    handleMarkDivergent,
    handleIgnore,
    handleBulkConciliate,
    deleteStatement,
    deleteSelectedStatements,
    runPayableMatching,
    approvePayableMatch,
    rejectPayableMatch,
    setSelectedStatement,
    setPayableReviewStatus,
    updateFilters,
    clearFilters,
    loadStatements,
    loadIndicators,
    loadPayableReviews,
  } = useConciliation(clinicId);

  const importBankAccounts = useMemo(() => {
    const normalizeAccount = (account) => ({
      ...account,
      id: account?.id,
      account_name: account?.account_name || account?.name || account?.label || 'Conta sem nome',
      account_number: account?.account_number || account?.number || account?.accountNumber || '',
      bank_name: account?.bank_name || account?.bank || account?.bankLabel || '',
    });

    const merged = [...(bankAccounts || []), ...(financialAccounts || [])]
      .filter(Boolean)
      .map(normalizeAccount);

    const byId = new Map();
    merged.forEach((account) => {
      if (account.id && !byId.has(account.id)) {
        byId.set(account.id, account);
      }
    });

    return Array.from(byId.values());
  }, [bankAccounts, financialAccounts]);

  const handleToggleSelect = (statementId) => {
    setSelectedStatements((prev) =>
      prev.includes(statementId) ? prev.filter((id) => id !== statementId) : [...prev, statementId],
    );
  };

  const handleDeleteStatement = async (statementId) => {
    try {
      await deleteStatement(statementId);
    } catch (err) {
      console.error('Error deleting statement:', err);
      throw err;
    }
  };

  const handleBulkDelete = async (ids) => {
    const toDelete = [...ids];
    try {
      const result = await deleteSelectedStatements(toDelete);
      setSelectedStatements([]);
      setSelectedStatement(null);
      alert(`✓ ${result.deleted || toDelete.length} lançamento(s) deletado(s) com sucesso`);
    } catch (err) {
      console.error('Erro crítico em bulk delete:', err);
      alert('Erro ao deletar em lote: ' + err.message);
      setSelectedStatements([]);
      setSelectedStatement(null);
    }
  };

  const handleBulkConciliateClick = async (ids) => {
    try {
      const promises = ids.map(async (id) => {
        const stmt = statements.find((s) => s.id === id);
        if (!stmt || !suggestions[id] || suggestions[id].length === 0) {
          return null;
        }

        return {
          id,
          suggestion: suggestions[id][0],
        };
      });

      const results = await Promise.all(promises);
      const validResults = results.filter((r) => r !== null);

      if (validResults.length === 0) {
        alert('Nenhuma sugestão encontrada para os lançamentos selecionados');
        return;
      }

      const message = `Conciliar ${validResults.length} lançamento(s)?`;
      if (window.confirm(message)) {
        for (const result of validResults) {
          const { id, suggestion } = result;
          await handleConciliate(id, suggestion.id, suggestion.type);
        }
        setSelectedStatements([]);
        await loadStatements();
        await loadIndicators();
        alert(`${validResults.length} lançamento(s) conciliado(s) com sucesso!`);
      }
    } catch (err) {
      console.error('Error in bulk conciliation:', err);
      alert('Erro ao conciliar em lote: ' + err.message);
    }
  };

  if (!clinicId) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600">Carregando clínica...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conciliação Bancária e Projeções</h1>
          <p className="text-gray-600 mt-1">
            Importe extratos, concilie com lançamentos e alinhe saldos do banco com o sistema
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => navigate('/clinica/financeiro/lancamentos')}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            Novo Lançamento Manual
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/clinica/financeiro/receber/nova?from=conciliacao-bancaria')}
          >
            Nova Receita
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/clinica/financeiro/contas-pagar/nova?from=conciliacao-bancaria')}
          >
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Indicadores */}
      <ConciliaoIndicadores indicators={indicators} loading={loading} />

      {/* Importação */}
      <ConciliacaoImportacao
        bankAccounts={importBankAccounts}
        onImportSuccess={async (statements, accountId) => {
          const result = await importExtract(statements, accountId);
          if (result.imported > 0) {
            let message = `✓ ${result.imported} lançamento(ns) importado(s)`;
            if (result.duplicates > 0) {
              message += ` | ⚠️ ${result.duplicates} duplicata(s) ignorada(s)`;
            }
            alert(message);
          } else if (result.duplicates > 0) {
            alert(`⚠️ Todos os ${result.duplicates} lançamento(ns) já existem no sistema (duplicatas)`);
          }
        }}
      />

      <ConciliacaoPayablesReview
        reviews={payableReviews}
        reviewCounts={payableReviewCounts}
        status={payableReviewStatus}
        loading={payableLoading}
        onStatusChange={async (status) => {
          setPayableReviewStatus(status);
          await loadPayableReviews(status);
        }}
        onRunMatching={async () => {
          const matches = await runPayableMatching('review');
          window.setTimeout(() => {
            alert(`${matches.length} correspondência(s) de Contas a Pagar encontrada(s) para revisão.`);
          }, 0);
        }}
        onApprove={approvePayableMatch}
        onReject={rejectPayableMatch}
      />

      {/* Conteúdo Principal */}
      <div>
        <ConciliacaoLista
          statements={statements}
          statementsTotal={statementsTotal}
          loading={loading}
          onSelectStatement={setSelectedStatement}
          onBulkConciliate={handleBulkConciliateClick}
          onDeleteStatement={handleDeleteStatement}
          onBulkDelete={handleBulkDelete}
          selectedStatements={selectedStatements}
          onToggleSelect={handleToggleSelect}
        />
      </div>
      <Dialog open={Boolean(selectedStatement)} onOpenChange={(open) => !open && setSelectedStatement(null)}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Detalhes da conciliação</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <ConciliacaoPainel
              statement={selectedStatement}
              suggestions={suggestions}
              onConciliate={handleConciliate}
              onCreateAndLink={handleCreateAndLink}
              onMarkDivergent={handleMarkDivergent}
              onIgnore={handleIgnore}
              findSuggestions={findSuggestionsForStatement}
              loading={loading}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Erro */}
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-red-700 font-medium">Erro: {error}</p>
        </Card>
      )}

      {/* Info */}
      <Card className="p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>💡 Dica:</strong> Selecione lançamentos pendentes e procure por sugestões
          automáticas baseadas em valor e data. Se não encontrar uma correspondência, crie um novo
          lançamento vinculado.
        </p>
      </Card>
    </div>
  );
}
