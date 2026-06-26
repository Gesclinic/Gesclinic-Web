import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DRESummary } from '@/lib/dreEnterpriseEngine';
import { listReceivables } from '@/lib/receivablesApi';
import { listAPQuery } from '@/lib/financeApi';
import { useClinicContext } from '@/contexts/useClinicContext';

type UnidadeMetrics = {
  id: string;
  name: string;
  receita: number;
  custos: number;
  ebitda: number;
  lucro: number;
  margemEbitda: number;
  margemLiquida: number;
  atendimentos: number;
  receita_atendimento: number;
};

type Props = {
  summary: DRESummary | null;
  variant: string;
  loading?: boolean;
  period?: { start: string; end: string };
};

/**
 * ETAPA 9: DRE por Unidade
 * Painel dedicado com comparativo entre unidades/filiais
 */
export default function DREUnidadePanel({ summary, variant, loading = false, period }: Props) {
  const { clinicId } = useClinicContext();
  const [selectedUnidade, setSelectedUnidade] = useState<string>('comparativo');
  const [unidadesList, setUnidadesList] = useState<UnidadeMetrics[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!summary || loading || !clinicId) return;

    let active = true;

    const loadData = async () => {
      try {
        setLoadError(null);

        const start = period?.start || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
        const end = period?.end || new Date().toISOString().split('T')[0];

        const [receivables, payables] = await Promise.all([
          listReceivables({ clinicId, dueStart: start, dueEnd: end, limit: 5000 }),
          listAPQuery({ clinicId, start, end, limit: 5000 }),
        ]);

        const byUnit = new Map<string, {
          id: string;
          name: string;
          receita: number;
          custos: number;
          atendimentos: number;
        }>();

        (receivables || []).forEach((row: any) => {
          const unitId = String(row.unit_id || row.branch_id || row.unit_name || row.branch_name || 'sem-unidade');
          const unitName = row.unit_name || row.branch_name || 'Sem unidade';
          const receita = Number(row.net_value ?? row.amount ?? row.valor ?? 0) || 0;

          if (!byUnit.has(unitId)) {
            byUnit.set(unitId, { id: unitId, name: unitName, receita: 0, custos: 0, atendimentos: 0 });
          }

          const current = byUnit.get(unitId)!;
          current.receita += receita;
          current.atendimentos += 1;
        });

        (payables || []).forEach((row: any) => {
          const unitId = String(row.unit_id || row.branch_id || row.unit_name || row.branch_name || 'sem-unidade');
          const unitName = row.unit_name || row.branch_name || 'Sem unidade';
          const custo = Number(row.amount ?? row.net_amount ?? row.valor ?? 0) || 0;

          if (!byUnit.has(unitId)) {
            byUnit.set(unitId, { id: unitId, name: unitName, receita: 0, custos: 0, atendimentos: 0 });
          }

          byUnit.get(unitId)!.custos += custo;
        });

        const units = Array.from(byUnit.values()).filter((item) => item.receita > 0);
        const totalReceita = units.reduce((sum, item) => sum + item.receita, 0);
        const hasCost = units.some((item) => item.custos > 0);

        // Se não há custo por unidade vindo dos dados, distribui custo consolidado proporcional à receita.
        const fallbackCustoTotal = Number(summary.custosVariaveis || 0) + Number(summary.custosFixos || 0);
        if (!hasCost && totalReceita > 0 && fallbackCustoTotal > 0) {
          units.forEach((item) => {
            item.custos = (item.receita / totalReceita) * fallbackCustoTotal;
          });
        }

        const metrics: UnidadeMetrics[] = units
          .map((item) => {
            const ebitda = item.receita - item.custos;
            const lucro = ebitda - item.receita * 0.08;
            const margemEbitda = item.receita > 0 ? (ebitda / item.receita) * 100 : 0;
            const margemLiquida = item.receita > 0 ? (lucro / item.receita) * 100 : 0;

            return {
              id: item.id,
              name: item.name,
              receita: item.receita,
              custos: item.custos,
              ebitda,
              lucro,
              margemEbitda,
              margemLiquida,
              atendimentos: item.atendimentos,
              receita_atendimento: item.atendimentos > 0 ? item.receita / item.atendimentos : 0,
            };
          })
          .sort((a, b) => b.receita - a.receita)
          .slice(0, 20);

        if (active) {
          setUnidadesList(metrics);
        }
      } catch (error) {
        if (active) {
          setLoadError('Não foi possível carregar os dados de unidade neste período.');
          setUnidadesList([]);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [summary, loading, clinicId, period?.start, period?.end]);

  const showUnidadePanel = variant === 'unidade' || variant === 'gerencial';

  if (!showUnidadePanel) return null;
  if (loading) return <Card className="p-6 animate-pulse h-96 bg-gray-100" />;
  if (!summary) return null;
  if (!unidadesList.length) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-600">{loadError || 'Sem dados de unidade para o período selecionado.'}</p>
      </Card>
    );
  }

  const selectedData = selectedUnidade === 'comparativo'
    ? {
        name: 'Consolidado',
        receita: unidadesList.reduce((sum, u) => sum + u.receita, 0),
        custos: unidadesList.reduce((sum, u) => sum + u.custos, 0),
        ebitda: unidadesList.reduce((sum, u) => sum + u.ebitda, 0),
        lucro: unidadesList.reduce((sum, u) => sum + u.lucro, 0),
        margemEbitda: unidadesList.length ? unidadesList.reduce((sum, u) => sum + u.margemEbitda, 0) / unidadesList.length : 0,
        margemLiquida: unidadesList.length ? unidadesList.reduce((sum, u) => sum + u.margemLiquida, 0) / unidadesList.length : 0,
        atendimentos: unidadesList.reduce((sum, u) => sum + u.atendimentos, 0),
        receita_atendimento: unidadesList.length ? unidadesList.reduce((sum, u) => sum + u.receita_atendimento, 0) / unidadesList.length : 0,
      }
    : unidadesList.find(u => u.id === selectedUnidade) || unidadesList[0];

  // Dados para gráfico comparativo
  const chartData = unidadesList.map(u => ({
    name: u.name.split(' - ')[0],
    receita: u.receita,
    ebitda: u.ebitda,
    lucro: u.lucro,
    margem: u.margemLiquida,
  }));

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              DRE por Unidade
            </h3>
            <p className="text-sm text-gray-500 mt-1">Análise comparativa entre unidades/filiais</p>
          </div>
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecionar unidade..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comparativo">Comparativo - Todas</SelectItem>
              {unidadesList.map(unidade => (
                <SelectItem key={unidade.id} value={unidade.id}>
                  {unidade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* MÉTRICAS PRINCIPAIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg bg-white p-4 border border-purple-100">
            <p className="text-xs text-gray-600 font-semibold">RECEITA</p>
            <p className="text-2xl font-bold text-purple-900 mt-2">
              R$ {(selectedData.receita / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-purple-600 mt-1">{selectedData.atendimentos} atendimentos</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-orange-100">
            <p className="text-xs text-gray-600 font-semibold">CUSTOS</p>
            <p className="text-2xl font-bold text-orange-900 mt-2">
              R$ {(selectedData.custos / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {((selectedData.custos / selectedData.receita) * 100).toFixed(0)}% da receita
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-emerald-100">
            <p className="text-xs text-gray-600 font-semibold">EBITDA</p>
            <p className="text-2xl font-bold text-emerald-900 mt-2">
              R$ {(selectedData.ebitda / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-emerald-600 mt-1">{selectedData.margemEbitda.toFixed(0)}% margem</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-green-100">
            <p className="text-xs text-gray-600 font-semibold">LUCRO LÍQUIDO</p>
            <p className="text-2xl font-bold text-green-900 mt-2">
              R$ {(selectedData.lucro / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-green-600 mt-1">{selectedData.margemLiquida.toFixed(0)}% margem</p>
          </div>
        </div>

        {/* INDICADORES DETALHADOS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-white p-4">
            <p className="text-sm text-gray-600">Receita/Atendimento</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              R$ {selectedData.receita_atendimento.toFixed(0)}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4">
            <p className="text-sm text-gray-600">Total Atendimentos</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {selectedData.atendimentos}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4">
            <p className="text-sm text-gray-600">Eficiência Operacional</p>
            <p className={`text-xl font-bold mt-1 ${selectedData.margemEbitda >= 25 ? 'text-green-900' : 'text-orange-900'}`}>
              {selectedData.margemEbitda >= 25 ? '✅ Excelente' : '⚠️ Revisar'}
            </p>
          </div>
        </div>
      </Card>

      {/* GRÁFICO COMPARATIVO */}
      {selectedUnidade === 'comparativo' && (
        <Card className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Comparativo entre Unidades
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
              <Legend />
              <Bar dataKey="receita" fill="#3b82f6" name="Receita" />
              <Bar dataKey="ebitda" fill="#10b981" name="EBITDA" />
              <Bar dataKey="lucro" fill="#f59e0b" name="Lucro" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* RANKING DE UNIDADES */}
      <Card className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">📊 Ranking de Unidades</h4>
        <div className="space-y-3">
          {unidadesList
            .sort((a, b) => b.receita - a.receita)
            .map((unidade, idx) => (
              <div
                key={unidade.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  selectedUnidade === unidade.id
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-bold text-gray-600 w-6">{idx + 1}º</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{unidade.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Receita: R$ {(unidade.receita / 1000).toFixed(0)}k • Atendimentos: {unidade.atendimentos} • Ticket: R$ {unidade.receita_atendimento.toFixed(0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Margem EBITDA</p>
                    <p className={`text-lg font-bold ${unidade.margemEbitda >= 25 ? 'text-green-600' : 'text-orange-600'}`}>
                      {unidade.margemEbitda.toFixed(0)}%
                    </p>
                  </div>
                  {unidade.margemEbitda >= 25 ? (
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-orange-500" />
                  )}
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* RECOMENDAÇÕES */}
      <Card className="p-4 bg-purple-50 border-purple-200">
        <p className="text-sm font-semibold text-purple-900 mb-2">💡 Recomendações Estratégicas:</p>
        <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
          <li>Unidades com EBITDA &lt; 20%: Otimizar custos operacionais ou revisar estrutura</li>
          <li>Ticket médio baixo: Aumentar procedimentos de valor agregado</li>
          <li>Comparar boas práticas entre unidades e replicar em outras filiais</li>
        </ul>
      </Card>
    </div>
  );
}
