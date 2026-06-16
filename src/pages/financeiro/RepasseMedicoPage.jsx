import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import {
  calcularRepasse,
  dashboardRepasseMedico,
  liberarComissoesPeriodoParaContasPagar,
  liberarComissaoParaContasPagar,
} from '@/lib/medicalRepasseApi';
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
  const pendingApCount =
    dashboard?.porProfissional?.filter(
      (prof) =>
        prof.commission_id &&
        prof.status !== 'scheduled' &&
        prof.paymentMethod !== 'AP' &&
        Number(prof.totalRepasse || 0) > 0,
    ).length || 0;

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

  const handleLiberarAP = async (commissionId) => {
    console.log('[REPASSE MEDICO] Liberando comissao para Contas a Pagar:', commissionId);
    setLoading(true);
    setErro(null);

    try {
      const result = await liberarComissaoParaContasPagar(commissionId, { actorId: user?.id });
      await carregarDados();
      alert(
        result.created
          ? `AP gerado: ${result.payable?.description || result.payable?.id}`
          : `AP ja existia para esta comissao: ${result.payable?.id}`,
      );
    } catch (err) {
      console.error('[REPASSE MEDICO] Erro ao liberar AP:', err);
      setErro(err.message || 'Erro ao gerar AP do repasse');
    } finally {
      setLoading(false);
    }
  };

  const handleLiberarAPLote = async () => {
    console.log('[REPASSE MEDICO] Liberando AP em lote para fechamento:', { clinicId, mes, ano });
    setLoading(true);
    setErro(null);

    try {
      const result = await liberarComissoesPeriodoParaContasPagar({
        clinicId,
        month: mes,
        year: ano,
        actorId: user?.id,
      });
      await carregarDados();
      alert(
        `AP em lote concluido: ${result.created} criado(s), ${result.existing} existente(s), ${result.skipped} ignorado(s), ${result.failed} erro(s).`,
      );
    } catch (err) {
      console.error('[REPASSE MEDICO] Erro ao liberar AP em lote:', err);
      setErro(err.message || 'Erro ao gerar AP em lote do repasse');
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
    <div className="w-full space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Visão geral</h2>
          <p className="mt-1 text-sm text-gray-600">Produção, repasses e geração de contas a pagar por profissional.</p>
        </div>

        {/* Alertas */}
        {erro && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Cabeçalho com filtros */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
                <select
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
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
                  className="h-10 w-24 rounded-md border border-gray-300 px-3 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <button
                  onClick={() => carregarDados()}
                  disabled={loading}
                  className="h-10 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Carregando...' : 'Atualizar'}
                </button>
                <button
                  onClick={handleGerarRepasse}
                  disabled={loading}
                  className="h-10 rounded-md bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  title="Gera/recalcula comissões para o período selecionado"
                >
                  {loading ? 'Gerando...' : 'Gerar Repasse'}
                </button>
                <button
                  onClick={handleLiberarAPLote}
                  disabled={loading || pendingApCount === 0}
                  className="h-10 rounded-md bg-orange-600 px-4 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  title="Gera contas a pagar para todos os repasses pendentes do período"
                >
                  {loading ? 'Processando...' : `Gerar AP em lote (${pendingApCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de resumo */}
        {dashboard && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 shadow-sm">
              <p className="text-sm text-gray-600 font-medium">Total Faturado</p>
              <p className="text-2xl font-bold text-blue-700 mt-2">
                {formatarMoeda(dashboard.totais?.totalBruto || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-5 shadow-sm">
              <p className="text-sm text-gray-600 font-medium">Total Líquido</p>
              <p className="text-2xl font-bold text-green-700 mt-2">
                {formatarMoeda(dashboard.totais?.totalLiquido || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-orange-100 bg-orange-50 p-5 shadow-sm">
              <p className="text-sm text-gray-600 font-medium">Repasse Médico</p>
              <p className="text-2xl font-bold text-orange-700 mt-2">
                {formatarMoeda(dashboard.totais?.totalProfissional || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-5 shadow-sm">
              <p className="text-sm text-gray-600 font-medium">Lucro da Clínica</p>
              <p className="text-2xl font-bold text-purple-700 mt-2">
                {formatarMoeda(dashboard.totais?.totalClinica || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Tabela por profissional */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Repasse por Profissional</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-600">Carregando dados...</div>
          ) : (
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full min-w-[1080px] table-fixed text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-[260px] px-6 py-3 text-left font-medium text-gray-700">
                      Profissional
                    </th>
                    <th className="w-[150px] px-6 py-3 text-right font-medium text-gray-700">
                      Faturado (Bruto)
                    </th>
                    <th className="w-[150px] px-6 py-3 text-right font-medium text-gray-700">
                      Faturado (Líquido)
                    </th>
                    <th className="w-[150px] px-6 py-3 text-right font-medium text-gray-700">
                      Repasse Médico
                    </th>
                    <th className="w-[150px] px-6 py-3 text-right font-medium text-gray-700">
                      Lucro Clínica
                    </th>
                    <th className="w-[90px] px-6 py-3 text-right font-medium text-gray-700">%</th>
                    <th className="w-[130px] px-6 py-3 text-center font-medium text-gray-700">
                      Status
                    </th>
                    <th className="w-[180px] px-6 py-3 text-center font-medium text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.porProfissional?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-gray-600">
                        Nenhuma produção neste período
                      </td>
                    </tr>
                  ) : (
                    dashboard?.porProfissional?.map((prof) => (
                      <tr
                        key={prof.professional_id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {prof.profissional || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {formatarMoeda(prof.totalBruto)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {formatarMoeda(prof.totalLiquido)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-orange-600">
                          {formatarMoeda(prof.totalRepasse)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-purple-600">
                          {formatarMoeda(prof.totalClinica)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {formatarPercentual(prof.percentualProfissional)}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600">
                          {prof.status === 'scheduled' || prof.paymentMethod === 'AP'
                            ? 'AP gerado'
                            : prof.status || 'pendente'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleCalcularRepasse(prof.professional_id)}
                              disabled={loading}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium disabled:opacity-50"
                            >
                              Recalcular
                            </button>
                            {prof.commission_id && prof.status !== 'scheduled' && (
                              <button
                                onClick={() => handleLiberarAP(prof.commission_id)}
                                disabled={loading}
                                className="text-green-700 hover:text-green-900 text-sm font-medium disabled:opacity-50"
                              >
                                Gerar AP
                              </button>
                            )}
                          </div>
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
  );
};

export default RepasseMedicoPage;
