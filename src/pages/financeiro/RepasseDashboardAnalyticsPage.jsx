import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { listProfessionals } from '@/lib/professionalsApi';
import { listRevenueRules } from '@/lib/revenueRulesApi';

export default function RepasseDashboardAnalyticsPage() {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [periodo, setPeriodo] = useState('mes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [regras, setRegras] = useState([]);

  // Mock data para demonstração (com dados realistas de cálculo)
  // TODO: Integrar com API para obter dados reais do banco de dados
  const mockLucroPorMedico = [];

  // TODO: Integrar com API para rankear médicos por produção
  const mockRankingMedicos = [];

  // TODO: Integrar com API para calcular margem por procedimento
  const mockMargemProcedimento = [];

  useEffect(() => {
    carregarDados();
  }, [clinicId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [profsList, regrasList] = await Promise.all([
        listProfessionals(clinicId),
        listRevenueRules(clinicId)
      ]);
      setProfissionais(profsList || []);
      setRegras(regrasList || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message);
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filtro de Período */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
        <select 
          value={periodo} 
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="semana">Última Semana</option>
          <option value="mes">Último Mês</option>
          <option value="trimestre">Último Trimestre</option>
          <option value="ano">Último Ano</option>
      </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Carregando analytics...</p>
        </div>
      ) : (
        <>

      {/* 1. Lucro por Médico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            💰 Lucro por Médico
          </CardTitle>
          <CardDescription>
            Comparativo de lucro gerado por cada profissional no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockLucroPorMedico.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.medico}</p>
                  <p className="text-sm text-gray-600">Produção: {formatarMoeda(item.producao)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatarMoeda(item.lucro)}</p>
                  <p className="text-xs text-gray-500">{item.percentual}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Ranking de Médicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            🏆 Ranking de Médicos
          </CardTitle>
          <CardDescription>
            Profissionais ordenados por produção total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Pos.</th>
                  <th className="px-4 py-2 text-left">Profissional</th>
                  <th className="px-4 py-2 text-right">Produção</th>
                  <th className="px-4 py-2 text-right">Repasse</th>
                  <th className="px-4 py-2 text-right">Lucro</th>
                  <th className="px-4 py-2 text-right">Pacientes</th>
                </tr>
              </thead>
              <tbody>
                {mockRankingMedicos.map((item) => (
                  <tr key={item.posicao} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                        {item.posicao}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{item.medico}</td>
                    <td className="px-4 py-3 text-right">{formatarMoeda(item.producao)}</td>
                    <td className="px-4 py-3 text-right text-orange-600 font-semibold">{formatarMoeda(item.repasse)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatarMoeda(item.lucro)}</td>
                    <td className="px-4 py-3 text-right">{item.pacientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 3. Margem por Procedimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            📊 Margem por Procedimento
          </CardTitle>
          <CardDescription>
            Análise de rentabilidade de cada tipo de procedimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Procedimento</th>
                  <th className="px-4 py-2 text-right">Faturado</th>
                  <th className="px-4 py-2 text-right">Repasse</th>
                  <th className="px-4 py-2 text-right">Margem</th>
                  <th className="px-4 py-2 text-right">% Margem</th>
                </tr>
              </thead>
              <tbody>
                {mockMargemProcedimento.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.procedimento}</td>
                    <td className="px-4 py-3 text-right">{formatarMoeda(item.total)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatarMoeda(item.repasse)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatarMoeda(item.margem)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        item.margem_pct >= 60 ? 'bg-green-100 text-green-800' :
                        item.margem_pct >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.margem_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
