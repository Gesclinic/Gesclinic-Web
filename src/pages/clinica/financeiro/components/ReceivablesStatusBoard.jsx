import React, { useMemo } from 'react';

/**
 * ReceivablesStatusBoard - Painel de Status de Recebíveis (FASE 11 + FASE 13 Performance)
 * Mostra: Status, Vencimentos, Dias atrasados
 * 
 * Otimizações (FASE 13):
 * - React.memo: Evita re-renders quando props não mudaram
 * - useMemo: Memoiza cálculos de estatísticas
 * - useMemo: Memoiza funções de formatação e mapeamento de status
 * 
 * Props:
 * - receivables: Array de objects {id, appointment_id, amount, status, due_date, days_overdue}
 * - loading: Boolean
 */
function ReceivablesStatusBoard({ receivables = [], loading = false }) {
  // Memoizar funções de formatação
  const formatCurrency = useMemo(() => {
    return (value) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0);
    };
  }, []);

  const formatDate = useMemo(() => {
    return (date) => {
      if (!date) return 'N/A';
      return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
    };
  }, []);

  // Memoizar mapeamentos de status
  const statusColors = useMemo(() => ({
    'paid': 'bg-green-100 text-green-800 border-green-300',
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'overdue': 'bg-red-100 text-red-800 border-red-300',
    'cancelled': 'bg-gray-100 text-gray-800 border-gray-300'
  }), []);

  const statusLabels = useMemo(() => ({
    'paid': '✓ Recebido',
    'pending': '⏳ Pendente',
    'overdue': '⚠️ Atrasado',
    'cancelled': '✕ Cancelado'
  }), []);

  const getStatusColor = useMemo(() => {
    return (status) => statusColors[status] || statusColors['pending'];
  }, [statusColors]);

  const getStatusLabel = useMemo(() => {
    return (status) => statusLabels[status] || status;
  }, [statusLabels]);

  // Memoizar cálculos de estatísticas (executados apenas quando receivables muda)
  const stats = useMemo(() => ({
    total: receivables.length,
    paid: receivables.filter(r => r.status === 'paid').length,
    pending: receivables.filter(r => r.status === 'pending').length,
    overdue: receivables.filter(r => r.status === 'overdue' || (r.days_overdue > 0 && r.status === 'pending')).length,
    total_amount: receivables.reduce((sum, r) => sum + (r.amount || 0), 0),
    paid_amount: receivables
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    pending_amount: receivables
      .filter(r => r.status !== 'paid')
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    overdue_amount: receivables
      .filter(r => r.days_overdue > 0 && r.status !== 'paid')
      .reduce((sum, r) => sum + (r.amount || 0), 0)
  }), [receivables]);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
          >
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Total */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-2">📊 Total</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-2">{formatCurrency(stats.total_amount)}</div>
        </div>

        {/* Recebidos */}
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <div className="text-xs text-green-600 mb-2">✓ Recebidos</div>
          <div className="text-2xl font-bold text-green-700">{stats.paid}</div>
          <div className="text-xs text-green-600 mt-2">{formatCurrency(stats.paid_amount)}</div>
        </div>

        {/* Pendentes */}
        <div className="bg-white border border-yellow-200 rounded-lg p-4">
          <div className="text-xs text-yellow-600 mb-2">⏳ Pendentes</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-xs text-yellow-600 mt-2">{formatCurrency(stats.pending_amount)}</div>
        </div>

        {/* Atrasados */}
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <div className="text-xs text-red-600 mb-2">⚠️ Atrasados</div>
          <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
          <div className="text-xs text-red-600 mt-2">
            {formatCurrency(stats.overdue_amount)}
          </div>
        </div>
      </div>

      {/* Tabela de Recebíveis */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {receivables.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            Nenhum recebível encontrado
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  ID
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">
                  Valor
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Vencimento
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
                  Dias
                </th>
              </tr>
            </thead>
            <tbody>
              {receivables.map((receivable, index) => {
                const daysOverdue = receivable.days_overdue || 0;
                const isOverdue = daysOverdue > 0 && receivable.status !== 'paid';

                return (
                  <tr
                    key={receivable.id}
                    className={`border-b border-gray-200 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition ${
                      isOverdue ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">
                      {receivable.id?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">
                      {formatCurrency(receivable.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(
                          receivable.status
                        )}`}
                      >
                        {getStatusLabel(receivable.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(receivable.due_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {daysOverdue === 0 ? (
                        <span className="text-xs text-gray-500">−</span>
                      ) : (
                        <span
                          className={`text-xs font-semibold ${
                            isOverdue ? 'text-red-700' : 'text-gray-600'
                          }`}
                        >
                          {daysOverdue > 0 ? '+' : ''}{daysOverdue}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// React.memo: Evita re-renders quando props não mudaram (FASE 13)
export default React.memo(ReceivablesStatusBoard);
