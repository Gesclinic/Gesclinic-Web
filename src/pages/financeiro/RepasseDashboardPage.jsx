import { useEffect, useState } from 'react';
import { dashboardRepasseMedico } from '@/lib/medicalRepasseApi';
import { useClinicContext } from '@/contexts/ClinicContext';

const RepasseDashboardPage = () => {
  const { clinicId } = useClinicContext();
  const [dashboard, setDashboard] = useState(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // Calcular datas do período
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

  useEffect(() => {
    carregarDashboard();
  }, [clinicId, mes, ano]);

  const carregarDashboard = async () => {
    if (!clinicId) {
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const dados = await dashboardRepasseMedico(clinicId, dataInicio, dataFim);
      setDashboard(dados);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0);
  };

  const formatarPercentual = (valor) => {
    return `${(valor || 0).toFixed(2)}%`;
  };

  const calcularMargemLucro = (total, repasse) => {
    if (!total || total === 0) {
      return 0;
    }
    return ((total - repasse) / total) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <p className="text-gray-600">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Repasse</h1>
          <p className="text-gray-600 mt-2">
            Análise de faturamento, repasses e lucro por profissional
          </p>
        </div>

        {/* Alertas */}
        {erro && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ❌ {erro}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2 w-24"
              />
            </div>
            <button
              onClick={carregarDashboard}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Atualizar
            </button>
          </div>
        </div>

        {/* Cards de Resumo Geral */}
        {dashboard && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 font-medium">Total Faturado</p>
                <p className="text-2xl font-bold text-blue-700 mt-2">
                  {formatarMoeda(dashboard.totais.totalBruto)}
                </p>
                <p className="text-xs text-gray-600 mt-1">Bruto</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 font-medium">Total Líquido</p>
                <p className="text-2xl font-bold text-green-700 mt-2">
                  {formatarMoeda(dashboard.totais.totalLiquido)}
                </p>
                <p className="text-xs text-gray-600 mt-1">Após deduções</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 font-medium">Repasse Profissionais</p>
                <p className="text-2xl font-bold text-orange-700 mt-2">
                  {formatarMoeda(dashboard.totais.totalProfissional)}
                </p>
                <p className="text-xs text-gray-600 mt-1">Total desembolsado</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 font-medium">Lucro Clínica</p>
                <p className="text-2xl font-bold text-purple-700 mt-2">
                  {formatarMoeda(dashboard.totais.totalClinica)}
                </p>
                <p className="text-xs text-gray-600 mt-1">Margem de lucro</p>
              </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold">Detalhamento por Profissional</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Profissional
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        Faturado (Bruto)
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        Faturado (Líquido)
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        Repasse
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        Lucro Clínica
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        % Profissional
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        Margem %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.porProfissional.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-gray-600 px-6">
                          Nenhuma produção neste período
                        </td>
                      </tr>
                    ) : (
                      dashboard.porProfissional.map((prof) => (
                        <tr
                          key={prof.profissional?.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {prof.profissional?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-600">
                            {formatarMoeda(prof.totalBruto)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-600">
                            {formatarMoeda(prof.totalLiquido)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-orange-600">
                            {formatarMoeda(prof.totalRepasse)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-purple-600">
                            {formatarMoeda(prof.totalClinica)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-600">
                            {formatarPercentual(prof.percentualProfissional)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                            {formatarPercentual(
                              calcularMargemLucro(prof.totalLiquido, prof.totalRepasse),
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumo Executivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Meta de Margem */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-4">Análise de Margem</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Ticket Médio:</span>
                    <span className="font-semibold">
                      {dashboard.porProfissional.length > 0
                        ? formatarMoeda(
                          dashboard.totais.totalLiquido / dashboard.porProfissional.length,
                        )
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Margem Média:</span>
                    <span className="font-semibold">
                      {dashboard.porProfissional.length > 0
                        ? formatarPercentual(
                          dashboard.porProfissional.reduce((sum, p) => {
                            return sum + calcularMargemLucro(p.totalLiquido, p.totalRepasse);
                          }, 0) / dashboard.porProfissional.length,
                        )
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-4">Estatísticas</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Profissionais:</span>
                    <span className="font-semibold">{dashboard.porProfissional.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Período:</span>
                    <span className="font-semibold">
                      {String(mes).padStart(2, '0')}/{ano}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RepasseDashboardPage;
