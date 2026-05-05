import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import discountApprovalsApi from '@/lib/discountApprovalsApi';

const DiscountApprovalsPage = () => {
  const { user } = useAuth();
  const { clinic, clinicId } = useClinicContext();

  const [authorizations, setAuthorizations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, [clinicId, dateRange]);

  const loadData = async () => {
    if (!clinicId) {
      return;
    }

    setLoading(true);
    try {
      const [auths, summ] = await Promise.all([
        discountApprovalsApi.listDiscountAuthorizations(clinicId, {
          from_date: dateRange.from,
          to_date: dateRange.to,
        }),
        discountApprovalsApi.getDiscountSummary(clinicId, dateRange.from, dateRange.to),
      ]);

      setAuthorizations(auths);
      setSummary(summ);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDiscount = async (appointmentId) => {
    if (!confirm('Remover este desconto?')) {
      return;
    }

    try {
      await discountApprovalsApi.removeDiscount(appointmentId);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveDiscount = async (auth) => {
    if (!confirm(`Aprovar desconto de R$ ${auth.discount_amount.toFixed(2)}?`)) {
      return;
    }

    try {
      await discountApprovalsApi.approveDiscount(auth.appointment_id, user?.id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectDiscount = async (auth) => {
    if (!confirm(`Rejeitar desconto de R$ ${auth.discount_amount.toFixed(2)}?`)) {
      return;
    }

    try {
      await discountApprovalsApi.rejectDiscount(auth.appointment_id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelDiscount = async (auth) => {
    if (!confirm(`Cancelar desconto de R$ ${auth.discount_amount.toFixed(2)}?`)) {
      return;
    }

    try {
      await discountApprovalsApi.cancelDiscount(auth.appointment_id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestão Administrativa - Autorizações de Desconto
          </h1>
          <p className="text-gray-600">
            Visualize e gerencie todas as autorizações de desconto concedidas
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total de Descontos</div>
              <div className="text-2xl font-bold text-blue-600">
                R$ {summary.totalDiscounts.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Quantidade</div>
              <div className="text-2xl font-bold text-green-600">{summary.countDiscounts}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Desconto Médio</div>
              <div className="text-2xl font-bold text-purple-600">
                R$ {summary.averageDiscount.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Motivo Mais Comum</div>
              <div className="text-lg font-bold text-gray-800">
                {summary.topReasons[0]?.reason || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Top Reasons Chart */}
        {summary?.topReasons && summary.topReasons.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Motivos Mais Frequentes</h2>
            <div className="space-y-3">
              {summary.topReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium text-gray-700">{reason.reason}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${(reason.total / summary.totalDiscounts) * 100}%`,
                        minWidth: '40px',
                      }}
                    >
                      <span className="text-white text-xs font-bold">
                        {((reason.total / summary.totalDiscounts) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right w-28">
                    <div className="text-sm font-semibold">R$ {reason.total.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{reason.count} autorizações</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Authorizations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Data</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Paciente
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Profissional
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Serviço</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Convênio
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Motivo</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  Desconto
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  Decisão
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {authorizations.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    Nenhuma autorização de desconto encontrada no período
                  </td>
                </tr>
              ) : (
                authorizations.map((auth) => (
                  <tr key={auth.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {new Date(auth.approved_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 font-medium">
                      {auth.patient_name || 'Paciente'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {auth.professional_name || '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{auth.service_name || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{auth.payer_name || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {auth.discount_reason || 'Sem motivo'}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-green-600">
                      R$ {auth.discount_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${discountApprovalsApi.getStatusColor(auth.status)}`}
                      >
                        {discountApprovalsApi.getStatusLabel(auth.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-sm space-x-2 flex justify-center gap-2">
                      {auth.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveDiscount(auth)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition"
                          >
                            ✓ Aprovar
                          </button>
                          <button
                            onClick={() => handleRejectDiscount(auth)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition"
                          >
                            ✕ Rejeitar
                          </button>
                        </>
                      )}
                      {auth.status === 'approved' && (
                        <button
                          onClick={() => handleCancelDiscount(auth)}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 transition"
                        >
                          🚫 Cancelar
                        </button>
                      )}
                      {auth.status === 'rejected' && (
                        <span className="text-gray-500 text-xs italic">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Todos os descontos são registrados automaticamente quando criados
            na modal de agendamento. Esta página oferece uma visão consolidada para auditoria e
            análise de tendências.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiscountApprovalsPage;
