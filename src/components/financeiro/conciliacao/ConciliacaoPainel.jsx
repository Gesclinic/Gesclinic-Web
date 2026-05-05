// src/components/financeiro/conciliacao/ConciliacaoPainel.jsx
// Painel de conciliação com sugestões

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  CONCILIATION_STATUS_VISUAL,
  TRANSACTION_TYPE,
  FINANCIAL_LINK_TYPE,
} from '@/lib/conciliationStatus';

export function ConciliacaoPainel({
  statement,
  suggestions,
  onConciliate,
  onCreateAndLink,
  onMarkDivergent,
  onIgnore,
  findSuggestions,
  loading,
}) {
  const [loading2, setLoading2] = useState(false);
  const [divergenceReason, setDivergenceReason] = useState('');
  const [ignoreReason, setIgnoreReason] = useState('');
  const [activeTab, setActiveTab] = useState('suggestions');
  const [creatingFinancial, setCreatingFinancial] = useState(false);
  const [financialForm, setFinancialForm] = useState({
    type:
      statement?.transaction_type === TRANSACTION_TYPE.CREDIT
        ? FINANCIAL_LINK_TYPE.RECEIVABLE
        : FINANCIAL_LINK_TYPE.PAYABLE,
    dueDate: formatDate(new Date()),
    categoryId: null,
    costCenterId: null,
    description: statement?.description || '',
  });

  useEffect(() => {
    if (statement && activeTab === 'suggestions') {
      handleFindSuggestions();
    }
  }, [statement, activeTab]);

  const handleFindSuggestions = async () => {
    if (!statement) {
      return;
    }
    setLoading2(true);
    try {
      await findSuggestions(statement);
    } catch (err) {
      console.error('Error finding suggestions:', err);
    } finally {
      setLoading2(false);
    }
  };

  const handleConciliate = (suggestion) => {
    if (window.confirm(`Conciliar com: ${suggestion.description}?`)) {
      onConciliate(statement.id, suggestion.id, suggestion.type);
    }
  };

  const handleCreateAndLink = async () => {
    if (!statement) {
      return;
    }
    try {
      await onCreateAndLink(statement.id, {
        type: financialForm.type,
        amount: Math.abs(statement.amount),
        description: financialForm.description,
        dueDate: financialForm.dueDate,
        categoryId: financialForm.categoryId,
        costCenterId: financialForm.costCenterId,
      });
      setCreatingFinancial(false);
    } catch (err) {
      console.error('Error creating financial:', err);
      alert('Erro ao criar lançamento: ' + err.message);
    }
  };

  const handleMarkDivergent = () => {
    if (!divergenceReason.trim()) {
      alert('Informe o motivo da divergência');
      return;
    }
    if (window.confirm('Marcar como divergente?')) {
      onMarkDivergent(statement.id, divergenceReason);
      setDivergenceReason('');
    }
  };

  const handleIgnore = () => {
    if (!ignoreReason.trim()) {
      alert('Informe o motivo de ignorar');
      return;
    }
    if (window.confirm('Ignorar este lançamento?')) {
      onIgnore(statement.id, ignoreReason);
      setIgnoreReason('');
    }
  };

  if (!statement) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Selecione um lançamento da lista para conciliar
      </Card>
    );
  }

  const isCredit = statement.transaction_type === TRANSACTION_TYPE.CREDIT;
  const visual = CONCILIATION_STATUS_VISUAL[statement.status];

  return (
    <Card className="p-6">
      <div className="border-b pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Conciliação de Lançamento</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Data:</span> {formatDate(statement.statement_date)}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Descrição:</span> {statement.description}
              </p>
              <p className={`text-lg font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                {isCredit ? '+' : '-'} {formatCurrency(statement.amount)}
              </p>
              <p className="text-gray-600">
                <span className={`px-2 py-1 rounded text-xs font-medium ${visual.className}`}>
                  {visual.icon} {visual.label}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'suggestions'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          💡 Sugestões ({suggestions[statement.id]?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'create'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          ➕ Criar Lançamento
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'actions'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          ⚙️ Ações
        </button>
      </div>

      {/* Sugestões */}
      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          {loading2 && <p className="text-center text-gray-500">Buscando sugestões...</p>}
          {!loading2 && suggestions[statement.id]?.length > 0
            ? suggestions[statement.id].map((sugg, idx) => (
              <div key={idx} className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{sugg.description}</p>
                    <p className="text-xs text-gray-500">
                      {sugg.type === FINANCIAL_LINK_TYPE.PAYABLE
                        ? 'Contas a Pagar'
                        : 'Contas a Receber'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(sugg.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDate(sugg.date)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Score: {(sugg.matchScore * 100).toFixed(0)}%
                    </span>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        Status: {sugg.status}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleConciliate(sugg)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                      ✓ Conciliar
                  </Button>
                </div>
              </div>
            ))
            : !loading2 && <p className="text-center text-gray-500">Nenhuma sugestão encontrada</p>}
        </div>
      )}

      {/* Criar Lançamento */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={financialForm.type}
              onChange={(e) => setFinancialForm({ ...financialForm, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={FINANCIAL_LINK_TYPE.PAYABLE}>Contas a Pagar</option>
              <option value={FINANCIAL_LINK_TYPE.RECEIVABLE}>Contas a Receber</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              type="text"
              value={financialForm.description}
              onChange={(e) => setFinancialForm({ ...financialForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Vencimento
            </label>
            <input
              type="date"
              value={financialForm.dueDate}
              onChange={(e) => setFinancialForm({ ...financialForm, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button
            onClick={handleCreateAndLink}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Criando...' : '✓ Criar e Vincular'}
          </Button>
        </div>
      )}

      {/* Ações */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          {/* Marcar como divergente */}
          <div className="p-3 border rounded-lg bg-red-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marcar como Divergente
            </label>
            <input
              type="text"
              placeholder="Motivo da divergência..."
              value={divergenceReason}
              onChange={(e) => setDivergenceReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <Button
              onClick={handleMarkDivergent}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              🔴 Marcar como Divergente
            </Button>
          </div>

          {/* Ignorar */}
          <div className="p-3 border rounded-lg bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ignorar Lançamento
            </label>
            <input
              type="text"
              placeholder="Motivo de ignorar..."
              value={ignoreReason}
              onChange={(e) => setIgnoreReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
            <Button onClick={handleIgnore} disabled={loading} variant="outline" className="w-full">
              ⚠️ Ignorar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
