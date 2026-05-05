import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import { calcularRepasse, dashboardRepasseMedico } from '@/lib/medicalRepasseApi';
import { listProfessionals } from '@/lib/professionalsApi';

const RepasseMedicoPage = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  // Estados
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  const [dashboard, setDashboard] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  // Calcular datas do período
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, [clinicId, mes, ano]);

  const carregarDados = async () => {
    if (!clinicId) {
      return;
    }

    console.log('🔍 [REPASSE MÉDICO] Buscando dados com filtros:', {
      clinicId,
      mes,
      ano,
      dataInicio,
      dataFim,
    });

    setLoading(true);
    setErro(null);

    try {
      // Carregar profissionais
      const profs = await listProfessionals(clinicId);
      console.log('✅ [REPASSE MÉDICO] Profissionais carregados:', profs?.length || 0);
      setProfissionais(profs || []);

      // Carregar dashboard de produção
      const dash = await dashboardRepasseMedico(clinicId, dataInicio, dataFim);
      console.log('✅ [REPASSE MÉDICO] Dashboard carregado:', {
        totalBruto: dash?.totais?.totalBruto,
        totalLiquido: dash?.totais?.totalLiquido,
        totalProfissional: dash?.totais?.totalProfissional,
        totalClinica: dash?.totais?.totalClinica,
        porProfissionalCount: dash?.porProfissional?.length || 0,
        repassesCount: dash?.repasses?.length || 0,
      });
      console.log('📋 [REPASSE MÉDICO] Detalhes por profissional:', dash?.porProfissional);
      setDashboard(dash || {});
    } catch (err) {
      console.error('❌ [REPASSE MÉDICO] Erro ao carregar dados:', err);
      setErro(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarRepasse = async () => {
    console.log('🚀 [REPASSE MÉDICO] Iniciando geração de repasse com RPC:', {
      clinicId,
      mes,
      ano,
    });

    setLoading(true);
    setErro(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('generate_doctor_commissions_v2', {
        p_clinic_id: clinicId,
        p_month: mes,
        p_year: ano,
        p_mode: 'atendido',
      });

      if (rpcError) {
        console.error('❌ [REPASSE MÉDICO] Erro na RPC:', rpcError);
        setErro(rpcError.message || 'Erro ao gerar repasse');
      } else {
        console.log('✅ [REPASSE MÉDICO] RPC executada com sucesso:', data);

        // Recarregar dados após geração
        await carregarDados();

        // Mostrar mensagem de sucesso
        const resultado = data?.[0] || {};
        alert(`✅ Sucesso: ${resultado.message || 'Repasse gerado'}`);
      }
    } catch (err) {
      console.error('❌ [REPASSE MÉDICO] Erro ao gerar repasse:', err);
      setErro(err.message || 'Erro ao gerar repasse');
    } finally {
      setLoading(false);
    }
  };

  const handleCalcularRepasse = async (professionalId) => {
    console.log('🔄 [REPASSE MÉDICO] Recalculando repasse para profissional:', professionalId);
    setLoading(true);
    setErro(null);

    try {
      const repasse = await calcularRepasse(clinicId, professionalId, dataInicio, dataFim);
      console.log('✅ [REPASSE MÉDICO] Repasse recalculado:', repasse);

      if (repasse) {
        await carregarDados();
      } else {
        setErro('Nenhuma produção encontrada para este período');
      }
    } catch (err) {
      console.error('❌ [REPASSE MÉDICO] Erro ao recalcular repasse:', err);
      setErro(err.message || 'Erro ao calcular repasse');
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

  // ============================================
  // DASHBOARD: Visão geral de produção
  // ============================================
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Repasse Médico</h1>
          <p className="text-gray-600 mt-2">
            Visão geral de produção e valores a serem pagos aos profissionais
          </p>
        </div>

        {/* Alertas */}
        {erro && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ❌ {erro}
          </div>
        )}

        {/* Cabeçalho com filtros */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-end justify-between gap-4">
            <div className="flex gap-4">
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
              <div className="flex items-end">
                <button
                  onClick={() => carregarDados()}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Carregando...' : 'Atualizar'}
                </button>
                <button
                  onClick={handleGerarRepasse}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 ml-2"
                  title="Gera/recalcula comissões para o período selecionado"
                >
                  {loading ? 'Gerando...' : '⚡ Gerar Repasse'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de resumo */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600 font-medium">Total Faturado</p>
              <p className="text-2xl font-bold text-blue-700 mt-2">
                {formatarMoeda(dashboard.totais?.totalBruto || 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600 font-medium">Total Líquido</p>
              <p className="text-2xl font-bold text-green-700 mt-2">
                {formatarMoeda(dashboard.totais?.totalLiquido || 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600 font-medium">Repasse Médico</p>
              <p className="text-2xl font-bold text-orange-700 mt-2">
                {formatarMoeda(dashboard.totais?.totalProfissional || 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600 font-medium">Lucro da Clínica</p>
              <p className="text-2xl font-bold text-purple-700 mt-2">
                {formatarMoeda(dashboard.totais?.totalClinica || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Tabela por profissional */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold">Repasse por Profissional</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-600">Carregando dados...</div>
          ) : (
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
                      Repasse Médico
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                      Lucro Clínica
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">%</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.porProfissional?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-gray-600">
                        Nenhuma produção neste período
                      </td>
                    </tr>
                  ) : (
                    dashboard?.porProfissional?.map((prof) => (
                      <tr
                        key={prof.professional_id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {prof.profissional || 'N/A'}
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
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleCalcularRepasse(prof.professional_id)}
                            disabled={loading}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium disabled:opacity-50"
                          >
                            Recalcular
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepasseMedicoPage;
