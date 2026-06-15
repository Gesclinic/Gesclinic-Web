import React, { useMemo } from 'react';

/**
 * BillingReportTable - Tabela de Relatório de Faturamento (FASE 11 + FASE 13 Performance)
 * Mostra: Convênio, Atendimentos, Faturamento, Recebidos
 * 
 * Otimizações (FASE 13):
 * - React.memo: Evita re-renders quando props não mudaram
 * - useMemo: Memoiza cálculos de totalizações
 * - useMemo: Memoiza formatCurrency function
 * 
 * Props:
 * - reports: Array de objects {plan_name, total_appointments, gross_amount, received_count}
 * - loading: Boolean
 */
function BillingReportTable({ reports = [], loading = false }) {
  // Memoizar formatCurrency para evitar recalcular a cada render
  const formatCurrency = useMemo(() => {
    return (value) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0);
    };
  }, []);

  // Memoizar cálculos de totalização (executados apenas quando reports muda)
  const totals = useMemo(() => {
    return {
      totalAppointments: reports.reduce((sum, r) => sum + (r.total_appointments || 0), 0),
      totalGross: reports.reduce((sum, r) => sum + (r.gross_amount || 0), 0),
      totalDiscount: reports.reduce((sum, r) => sum + (r.total_discount || 0), 0),
      totalNet: reports.reduce((sum, r) => sum + (r.net_amount || 0), 0),
      totalReceived: reports.reduce((sum, r) => sum + (r.received_count || 0), 0)
    };
  }, [reports]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
          Carregando relatório de faturamento...
        </div>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500 text-sm">
          Nenhum faturamento encontrado no período
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
              Convênio / Particular
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
              Atendimentos
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">
              Bruto
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">
              Desconto
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">
              Líquido
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
              Recebidos
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, index) => (
            <tr
              key={index}
              className={`border-b border-gray-200 ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              } hover:bg-blue-50 transition`}
            >
              <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                {report.plan_name || 'Particular'}
              </td>
              <td className="px-4 py-3 text-sm text-center text-gray-600">
                {report.total_appointments || 0}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-600">
                {formatCurrency(report.gross_amount)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-red-600">
                {formatCurrency(report.total_discount)}
              </td>
              <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                {formatCurrency(report.net_amount)}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                  {report.received_count || 0}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totalizações */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="grid grid-cols-5 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Total de Atendimentos</div>
            <div className="font-semibold text-gray-800">
              {totals.totalAppointments}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Bruto</div>
            <div className="font-semibold text-gray-800">
              {formatCurrency(totals.totalGross)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Desconto</div>
            <div className="font-semibold text-red-600">
              {formatCurrency(totals.totalDiscount)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Líquido</div>
            <div className="font-semibold text-green-700">
              {formatCurrency(totals.totalNet)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Recebidos</div>
            <div className="font-semibold text-blue-700">
              {totals.totalReceived}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// React.memo: Evita re-renders quando props não mudaram (FASE 13)
export default React.memo(BillingReportTable);
