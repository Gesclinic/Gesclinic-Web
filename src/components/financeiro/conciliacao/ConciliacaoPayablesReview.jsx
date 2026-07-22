import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { labelReconciliationMatchType, labelReconciliationStatus } from '@/modules/financeiro/contas-pagar/utils/labels';

function getAmount(payable) {
  return Number(payable?.net_amount || payable?.balance_amount || payable?.amount || 0);
}

function getPayableName(payable) {
  return payable?.supplier_name || payable?.vendor_name || 'Fornecedor não informado';
}

function openPayable(payable) {
  if (!payable?.id) return;
  window.open(`/clinica/financeiro/contas-pagar/${payable.id}/editar?from=conciliacao-bancaria`, '_blank', 'noopener,noreferrer');
}

function showStatementDetails(item) {
  const statement = item.statement || {};
  const transaction = item.transaction || {};
  alert([
    'Título do banco',
    `Data: ${statement.statement_date || transaction.transaction_date || '-'}`,
    `Descrição: ${statement.description || transaction.description || '-'}`,
    `Valor: ${formatCurrency(Math.abs(Number(statement.amount ?? transaction.amount ?? 0)))}`,
    `Referência: ${statement.bank_id || transaction.reference_number || '-'}`,
    `ID do extrato: ${statement.id || transaction.id || '-'}`,
  ].join('\n'));
}

function uniqueOptions(values = []) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

function MultiValueFilter({ label, value = [], options = [], onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const toggleOption = (option) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
      return;
    }

    onChange([...value, option]);
  };

  const labelText = value.length === 0
    ? `Todos (${options.length})`
    : value.length === 1
      ? value[0]
      : `${value.length} selecionados`;

  return (
    <div ref={containerRef} className="relative min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">
        {label}{value.length ? ` (${value.length})` : ''}
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate">{labelText}</span>
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[240px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-auto p-2">
            {options.length === 0 ? (
              <p className="px-2 py-2 text-xs text-gray-500">Sem valores</p>
            ) : options.map((option) => (
              <label key={option} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="mt-0.5 rounded border-gray-300"
                />
                <span className="line-clamp-2 text-gray-700" title={option}>{option}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConciliacaoPayablesReview({
  reviews = [],
  reviewCounts = { review: 0, matched: 0, rejected: 0, all: 0 },
  status,
  loading,
  onStatusChange,
  onRunMatching,
  onApprove,
  onReject,
}) {
  const [columnFilters, setColumnFilters] = useState({
    transaction: [],
    payable: [],
    amount: [],
    confidence: [],
    status: [],
  });
  const [selectedReviewIds, setSelectedReviewIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const updateColumnFilter = (key, value) => {
    setColumnFilters((current) => ({ ...current, [key]: value }));
  };

  const clearColumnFilters = () => {
    setColumnFilters({
      transaction: [],
      payable: [],
      amount: [],
      confidence: [],
      status: [],
    });
  };

  const getTransactionFilterValue = (item) => {
    const transaction = item.transaction || {};
    const statement = item.statement || {};
    return `${formatDate(statement.statement_date || transaction.transaction_date)} - ${statement.description || transaction.description || 'Sem descrição'}`;
  };

  const getPayableFilterValue = (item) => {
    const payable = item.payable || {};
    return `${getPayableName(payable)} - ${payable.description || payable.document_number || payable.invoice_number || 'Conta sem descrição'}`;
  };

  const getAmountFilterValue = (item) => {
    const transaction = item.transaction || {};
    const payable = item.payable || {};
    return `Banco: ${formatCurrency(Math.abs(Number(transaction.amount || 0)))} | AP: ${formatCurrency(getAmount(payable))}`;
  };

  const getConfidenceFilterValue = (item) => `${Number(item.transaction?.match_confidence || 0).toFixed(0)}%`;

  const getStatusFilterValue = (item) => {
    const transaction = item.transaction || {};
    const statusLabel = labelReconciliationStatus(transaction.status || 'review') || transaction.status || 'Sem status';
    const matchLabel = labelReconciliationMatchType(transaction.match_type) || transaction.match_type || 'Sem tipo';
    return `${statusLabel} - ${matchLabel}`;
  };

  const filterOptions = useMemo(() => ({
    transaction: uniqueOptions(reviews.map(getTransactionFilterValue)),
    payable: uniqueOptions(reviews.map(getPayableFilterValue)),
    amount: uniqueOptions(reviews.map(getAmountFilterValue)),
    confidence: uniqueOptions(reviews.map(getConfidenceFilterValue)),
    status: uniqueOptions(reviews.map(getStatusFilterValue)),
  }), [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((item) => {
      if (columnFilters.transaction.length && !columnFilters.transaction.includes(getTransactionFilterValue(item))) return false;
      if (columnFilters.payable.length && !columnFilters.payable.includes(getPayableFilterValue(item))) return false;
      if (columnFilters.amount.length && !columnFilters.amount.includes(getAmountFilterValue(item))) return false;
      if (columnFilters.confidence.length && !columnFilters.confidence.includes(getConfidenceFilterValue(item))) return false;
      if (columnFilters.status.length && !columnFilters.status.includes(getStatusFilterValue(item))) return false;
      return true;
    });
  }, [columnFilters, reviews]);

  const actionableFilteredReviews = useMemo(() => (
    filteredReviews.filter((item) => item.transaction?.status === 'review')
  ), [filteredReviews]);

  const selectedReviews = useMemo(() => (
    filteredReviews.filter((item) => selectedReviewIds.includes(item.transaction?.id))
  ), [filteredReviews, selectedReviewIds]);

  const selectedActionableReviews = selectedReviews.filter((item) => item.transaction?.status === 'review');
  const allFilteredSelected = actionableFilteredReviews.length > 0
    && actionableFilteredReviews.every((item) => selectedReviewIds.includes(item.transaction.id));

  useEffect(() => {
    setSelectedReviewIds((current) => current.filter((id) => reviews.some((item) => item.transaction?.id === id)));
  }, [reviews]);

  const handleReject = (item) => {
    const reason = window.prompt('Motivo da rejeição da correspondência:');
    if (reason === null) return;
    onReject(item.transaction.id, item.payable?.id, reason || 'Rejeitado na revisão manual');
  };

  const handleApprove = async (item) => {
    try {
      await onApprove(item.transaction.id, item.payable?.id);
    } catch (error) {
      alert(`Não foi possível aprovar: ${error?.message || 'erro desconhecido'}`);
    }
  };

  const handleChangeLink = async (item) => {
    const nextPayableId = window.prompt(
      'Informe o ID da Conta a Pagar correta para vincular este título do banco:',
      item.payable?.id || '',
    );

    if (nextPayableId === null) return;
    const trimmedId = nextPayableId.trim();
    if (!trimmedId) {
      alert('Informe um ID de Conta a Pagar válido.');
      return;
    }

    try {
      await onApprove(item.transaction.id, trimmedId);
    } catch (error) {
      alert(`Não foi possível trocar a vinculação: ${error?.message || 'erro desconhecido'}`);
    }
  };

  const toggleReviewSelection = (transactionId) => {
    setSelectedReviewIds((current) => (
      current.includes(transactionId)
        ? current.filter((id) => id !== transactionId)
        : [...current, transactionId]
    ));
  };

  const selectAllFiltered = () => {
    setSelectedReviewIds((current) => Array.from(new Set([
      ...current,
      ...actionableFilteredReviews.map((item) => item.transaction.id),
    ])));
  };

  const clearSelected = () => {
    setSelectedReviewIds([]);
  };

  const handleBulkApprove = async () => {
    const items = selectedActionableReviews.length ? selectedActionableReviews : actionableFilteredReviews;
    const approvable = items.filter((item) => item.payable?.id);

    if (approvable.length === 0) {
      alert('Nenhuma correspondência selecionada possui Conta a Pagar vinculada para aprovação.');
      return;
    }

    if (!window.confirm(`Aprovar ${approvable.length} correspondência(s)?`)) return;

    setBulkProcessing(true);
    const failures = [];
    try {
      for (const item of approvable) {
        try {
          await onApprove(item.transaction.id, item.payable.id);
        } catch (error) {
          failures.push(`${item.transaction.description || item.transaction.id}: ${error?.message || 'erro desconhecido'}`);
        }
      }
      setSelectedReviewIds([]);
      alert(failures.length
        ? `Aprovação em lote concluída com ${approvable.length - failures.length} sucesso(s) e ${failures.length} falha(s).\n\n${failures.slice(0, 5).join('\n')}`
        : `${approvable.length} correspondência(s) aprovada(s) com sucesso.`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    const items = selectedActionableReviews.length ? selectedActionableReviews : actionableFilteredReviews;
    if (items.length === 0) {
      alert('Nenhuma correspondência selecionada para rejeitar.');
      return;
    }

    const reason = window.prompt(`Motivo da rejeição para ${items.length} correspondência(s):`);
    if (reason === null) return;

    setBulkProcessing(true);
    const failures = [];
    try {
      for (const item of items) {
        try {
          await onReject(item.transaction.id, item.payable?.id, reason || 'Rejeitado em lote na revisão manual');
        } catch (error) {
          failures.push(`${item.transaction.description || item.transaction.id}: ${error?.message || 'erro desconhecido'}`);
        }
      }
      setSelectedReviewIds([]);
      alert(failures.length
        ? `Rejeição em lote concluída com ${items.length - failures.length} sucesso(s) e ${failures.length} falha(s).\n\n${failures.slice(0, 5).join('\n')}`
        : `${items.length} correspondência(s) rejeitada(s) com sucesso.`);
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Revisão de Correspondências de Contas a Pagar</h2>
          <p className="mt-1 text-sm text-gray-600">
            Aprove ou rejeite sugestões geradas pela conciliação inteligente entre AP e transações bancárias.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="review">Em revisão ({reviewCounts.review || 0})</option>
            <option value="matched">Aprovados ({reviewCounts.matched || 0})</option>
            <option value="rejected">Rejeitados ({reviewCounts.rejected || 0})</option>
            <option value="all">Todos ({reviewCounts.all || 0})</option>
          </select>
          <Button onClick={onRunMatching} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Processando...' : 'Rodar conciliação AP'}
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-700">
            Filtros da tabela ({filteredReviews.length} de {reviews.length})
          </p>
          <Button size="sm" variant="outline" onClick={clearColumnFilters}>
            Limpar filtros
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          <MultiValueFilter
            label="Transação"
            value={columnFilters.transaction}
            options={filterOptions.transaction}
            onChange={(value) => updateColumnFilter('transaction', value)}
          />
          <MultiValueFilter
            label="Conta a pagar"
            value={columnFilters.payable}
            options={filterOptions.payable}
            onChange={(value) => updateColumnFilter('payable', value)}
          />
          <MultiValueFilter
            label="Valores"
            value={columnFilters.amount}
            options={filterOptions.amount}
            onChange={(value) => updateColumnFilter('amount', value)}
          />
          <MultiValueFilter
            label="Confiança"
            value={columnFilters.confidence}
            options={filterOptions.confidence}
            onChange={(value) => updateColumnFilter('confidence', value)}
          />
          <MultiValueFilter
            label="Status"
            value={columnFilters.status}
            options={filterOptions.status}
            onChange={(value) => updateColumnFilter('status', value)}
          />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{selectedActionableReviews.length} selecionada(s)</span>
            <span>•</span>
            <span>{actionableFilteredReviews.length} em revisão nos filtros atuais</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={selectAllFiltered} disabled={bulkProcessing || actionableFilteredReviews.length === 0 || allFilteredSelected}>
              Selecionar filtrados
            </Button>
            <Button size="sm" variant="outline" onClick={clearSelected} disabled={bulkProcessing || selectedReviewIds.length === 0}>
              Limpar seleção
            </Button>
            <Button size="sm" onClick={handleBulkApprove} disabled={bulkProcessing || (selectedActionableReviews.length === 0 && actionableFilteredReviews.length === 0)} className="bg-green-600 hover:bg-green-700">
              {bulkProcessing ? 'Processando...' : 'Aprovar lote'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkReject} disabled={bulkProcessing || (selectedActionableReviews.length === 0 && actionableFilteredReviews.length === 0)}>
              Rejeitar lote
            </Button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-3 text-left font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(event) => {
                    if (event.target.checked) selectAllFiltered();
                    else setSelectedReviewIds((current) => current.filter((id) => !actionableFilteredReviews.some((item) => item.transaction.id === id)));
                  }}
                  disabled={actionableFilteredReviews.length === 0}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-3 text-left font-medium text-gray-700">Transação</th>
              <th className="px-3 py-3 text-left font-medium text-gray-700">Conta a Pagar</th>
              <th className="px-3 py-3 text-right font-medium text-gray-700">Valores</th>
              <th className="px-3 py-3 text-center font-medium text-gray-700">Confiança</th>
              <th className="px-3 py-3 text-center font-medium text-gray-700">Status</th>
              <th className="px-3 py-3 text-right font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-3 py-8 text-center text-gray-500">
                  Nenhuma correspondência de AP encontrada para os filtros atuais.
                </td>
              </tr>
            ) : (
              filteredReviews.map((item) => {
                const transaction = item.transaction;
                const payable = item.payable;
                const confidence = Number(transaction.match_confidence || 0);
                const payableAmount = getAmount(payable);

                return (
                  <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={selectedReviewIds.includes(transaction.id)}
                        onChange={() => toggleReviewSelection(transaction.id)}
                        disabled={transaction.status !== 'review'}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-gray-900">{formatDate(transaction.transaction_date)}</p>
                      <p className="max-w-xs truncate text-gray-600" title={transaction.description || ''}>
                        {transaction.description || 'Sem descrição'}
                      </p>
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => showStatementDetails(item)}>
                        Extrato
                      </Button>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-gray-900">{getPayableName(payable)}</p>
                      <p className="max-w-xs truncate text-gray-600" title={payable?.description || ''}>
                        {payable?.description || 'Conta sem descrição'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Vencimento: {payable?.due_date ? formatDate(payable.due_date) : '-'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openPayable(payable)} disabled={!payable?.id}>
                          Abrir AP
                        </Button>
                        {payable?.id ? <span className="self-center text-[10px] text-gray-400">ID: {String(payable.id).slice(0, 8)}</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      <p className="font-medium text-red-600">Banco: {formatCurrency(Math.abs(Number(transaction.amount || 0)))}</p>
                      <p className="text-gray-700">AP: {formatCurrency(payableAmount)}</p>
                    </td>
                    <td className="px-3 py-3 text-center align-top">
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {confidence.toFixed(0)}%
                      </span>
                      <p className="mt-1 text-xs text-gray-500">{labelReconciliationMatchType(transaction.match_type) || '-'}</p>
                    </td>
                    <td className="px-3 py-3 text-center align-top">
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                        {labelReconciliationStatus(transaction.status || 'review')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      {transaction.status === 'review' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(item)}
                            disabled={loading || !payable?.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Aprovar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleChangeLink(item)} disabled={loading}>
                            Trocar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(item)} disabled={loading}>
                            Rejeitar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Decidido</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}