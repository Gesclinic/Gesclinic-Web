/**
 * Reconciliation Panel Component
 * Manages account reconciliation status and history
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AccountReconciliation, ReconciliationStatus, RECONCILIATION_STATUS_LABELS, RECONCILIATION_STATUS_COLORS } from '../types';

interface ReconciliationPanelProps {
  accountName: string;
  currentBalance: number;
  reconciliationRecords: AccountReconciliation[];
  onReconcile?: (statementBalance: number, notes?: string) => Promise<void>;
  loading?: boolean;
}

/**
 * Memoized Reconciliation Panel Component
 */
export const ReconciliationPanel = React.memo<ReconciliationPanelProps>(
  ({ accountName, currentBalance, reconciliationRecords, onReconcile, loading = false }) => {
    const [statementBalance, setStatementBalance] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isReconciling, setIsReconciling] = useState(false);

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    const formatDate = (dateString: string) => {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(dateString));
    };

    const handleReconcile = async () => {
      if (!statementBalance || !onReconcile) return;

      setIsReconciling(true);
      try {
        await onReconcile(parseFloat(statementBalance), notes);
        setStatementBalance('');
        setNotes('');
      } finally {
        setIsReconciling(false);
      }
    };

    const difference = statementBalance
      ? parseFloat(statementBalance) - currentBalance
      : 0;

    const latestReconciliation = reconciliationRecords[0];

    return (
      <div className="space-y-4">
        {/* Reconciliation Form */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Conciliar {accountName}</h3>

          <div className="space-y-3">
            {/* Current Balance Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium mb-1">Saldo do Sistema</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(currentBalance)}
                </p>
              </div>

              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium mb-1">Saldo do Extrato</p>
                <input
                  type="number"
                  step="0.01"
                  value={statementBalance}
                  onChange={(e) => setStatementBalance(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-0 text-lg font-bold border-0 focus:ring-0 focus:outline-none text-blue-600 bg-transparent"
                />
              </div>
            </div>

            {/* Difference Alert */}
            {statementBalance && (
              <div
                className={`p-3 rounded-lg flex items-start gap-2 ${
                  difference === 0
                    ? 'bg-green-100 border border-green-300'
                    : 'bg-yellow-100 border border-yellow-300'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {difference === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {difference === 0
                      ? 'Saldos conferem!'
                      : `Diferença: ${formatCurrency(Math.abs(difference))}`}
                  </p>
                  <p className={`text-xs ${difference === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                    {difference === 0
                      ? 'Sua conciliação está correta.'
                      : difference > 0
                      ? 'Saldo do extrato é maior.'
                      : 'Saldo do sistema é maior.'}
                  </p>
                </div>
              </div>
            )}

            {/* Notes Field */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicionar informações sobre a conciliação..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleReconcile}
                disabled={!statementBalance || isReconciling || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isReconciling ? 'Conciliando...' : 'Conciliar Agora'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStatementBalance('');
                  setNotes('');
                }}
                disabled={!statementBalance}
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Reconciliation History */}
        {reconciliationRecords.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-900">Histórico de Conciliações</h4>

            <div className="space-y-2">
              {reconciliationRecords.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className={`p-3 rounded-lg border ${
                    record.status === ReconciliationStatus.RECONCILED
                      ? 'bg-green-50 border-green-200'
                      : record.status === ReconciliationStatus.DIVERGENT
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={`p-1 rounded-full ${
                          record.status === ReconciliationStatus.RECONCILED
                            ? 'bg-green-100'
                            : record.status === ReconciliationStatus.DIVERGENT
                            ? 'bg-red-100'
                            : 'bg-yellow-100'
                        }`}
                      >
                        {record.status === ReconciliationStatus.RECONCILED ? (
                          <CheckCircle2 className={`w-4 h-4 text-green-600`} />
                        ) : record.status === ReconciliationStatus.DIVERGENT ? (
                          <AlertCircle className={`w-4 h-4 text-red-600`} />
                        ) : (
                          <Clock className={`w-4 h-4 text-yellow-600`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {RECONCILIATION_STATUS_LABELS[record.status]}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(record.reconciliation_date)}
                        </p>
                      </div>
                    </div>

                    {record.difference !== 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Diferença:</p>
                        <p className={`text-sm font-bold ${
                          record.difference > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {record.difference > 0 ? '+' : ''}{formatCurrency(record.difference)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Balances Comparison */}
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                      <p className="text-gray-600">Extrato:</p>
                      <p className="font-semibold">{formatCurrency(record.balance_statement)}</p>
                    </div>
                    <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                      <p className="text-gray-600">Sistema:</p>
                      <p className="font-semibold">{formatCurrency(record.balance_system)}</p>
                    </div>
                    <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                      <p className="text-gray-600">Diferença:</p>
                      <p className={`font-semibold ${record.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(record.difference))}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {record.notes && (
                    <p className="text-xs text-gray-600 italic border-t pt-2">
                      {record.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {reconciliationRecords.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todas ({reconciliationRecords.length})
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {reconciliationRecords.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conciliação registrada</p>
            <p className="text-xs mt-1">Concilie esta conta para rastrear seu saldo</p>
          </div>
        )}
      </div>
    );
  }
);

ReconciliationPanel.displayName = 'ReconciliationPanel';
