import React from 'react';
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
  const handleReject = (item) => {
    const reason = window.prompt('Motivo da rejeição da correspondência:');
    if (reason === null) return;
    onReject(item.transaction.id, item.payable?.id, reason || 'Rejeitado na revisão manual');
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

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-3 text-left font-medium text-gray-700">Transação</th>
              <th className="px-3 py-3 text-left font-medium text-gray-700">Conta a Pagar</th>
              <th className="px-3 py-3 text-right font-medium text-gray-700">Valores</th>
              <th className="px-3 py-3 text-center font-medium text-gray-700">Confiança</th>
              <th className="px-3 py-3 text-center font-medium text-gray-700">Status</th>
              <th className="px-3 py-3 text-right font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-3 py-8 text-center text-gray-500">
                  Nenhuma correspondência de AP encontrada para o filtro atual.
                </td>
              </tr>
            ) : (
              reviews.map((item) => {
                const transaction = item.transaction;
                const payable = item.payable;
                const confidence = Number(transaction.match_confidence || 0);
                const payableAmount = getAmount(payable);

                return (
                  <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-gray-900">{formatDate(transaction.transaction_date)}</p>
                      <p className="max-w-xs truncate text-gray-600" title={transaction.description || ''}>
                        {transaction.description || 'Sem descrição'}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-gray-900">{getPayableName(payable)}</p>
                      <p className="max-w-xs truncate text-gray-600" title={payable?.description || ''}>
                        {payable?.description || 'Conta sem descrição'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Vencimento: {payable?.due_date ? formatDate(payable.due_date) : '-'}
                      </p>
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
                            onClick={() => onApprove(transaction.id, payable?.id)}
                            disabled={loading || !payable?.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Aprovar
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