// src/pages/clinica/financeiro/ConciliacaoBancaria.jsx
// Página principal de Conciliação Bancária

import React, { useState } from 'react';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useConciliation } from '@/hooks/useConciliation';
import { ConciliaoIndicadores } from '@/components/financeiro/conciliacao/ConciliaoIndicadores';
import { ConciliacaoImportacao } from '@/components/financeiro/conciliacao/ConciliacaoImportacao';
import { ConciliacaoLista } from '@/components/financeiro/conciliacao/ConciliacaoLista';
import { ConciliacaoPainel } from '@/components/financeiro/conciliacao/ConciliacaoPainel';
import { Card } from '@/components/ui/Card';

export default function ConciliacaoBancaria() {
  const { clinicId } = useClinicContext();
  const [selectedStatements, setSelectedStatements] = useState([]);

  const {
    statements,
    loading,
    error,
    indicators,
    bankAccounts,
    suggestions,
    selectedStatement,
    filters,
    importExtract,
    findSuggestionsForStatement,
    handleConciliate,
    handleCreateAndLink,
    handleMarkDivergent,
    handleIgnore,
    handleBulkConciliate,
    setSelectedStatement,
    updateFilters,
    clearFilters,
    loadStatements,
    loadIndicators
  } = useConciliation(clinicId);

  const handleToggleSelect = (statementId) => {
    setSelectedStatements(prev =>
      prev.includes(statementId)
        ? prev.filter(id => id !== statementId)
        : [...prev, statementId]
    );
  };

  const handleBulkConciliateClick = async (ids) => {
    // Para bulk conciliation, vamos obter a melhor sugestão de cada um
    try {
      const promises = ids.map(async (id) => {
        const stmt = statements.find(s => s.id === id);
        if (!stmt || !suggestions[id] || suggestions[id].length === 0) return null;
        
        const bestSuggestion = suggestions[id][0]; // Melhor score
        return {
          id,
          suggestion: bestSuggestion
        };
      });

      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null);

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Conciliação Bancária e Projeções</h1>
        <p className="text-gray-600 mt-1">
          Importe extratos, concilie com lançamentos e alinhe saldos do banco com o sistema
        </p>
      </div>

      {/* Indicadores */}
      <ConciliaoIndicadores indicators={indicators} loading={loading} />

      {/* Importação */}
      <ConciliacaoImportacao
        bankAccounts={bankAccounts}
        onImportSuccess={async (statements, accountId) => {
          await importExtract(statements, accountId);
        }}
      />

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista (2/3) */}
        <div className="lg:col-span-2">
          <ConciliacaoLista
            statements={statements}
            loading={loading}
            onSelectStatement={setSelectedStatement}
            onBulkConciliate={handleBulkConciliateClick}
            selectedStatements={selectedStatements}
            onToggleSelect={handleToggleSelect}
          />
        </div>

        {/* Painel de Conciliação (1/3) */}
        <div>
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
      </div>

      {/* Erro */}
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-red-700 font-medium">Erro: {error}</p>
        </Card>
      )}

      {/* Info */}
      <Card className="p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>💡 Dica:</strong> Selecione lançamentos pendentes e procure por sugestões automáticas baseadas em valor e data. 
          Se não encontrar uma correspondência, crie um novo lançamento vinculado.
        </p>
      </Card>
    </div>
  );
}

