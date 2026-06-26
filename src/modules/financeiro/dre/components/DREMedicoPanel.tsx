import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import type { DRESummary } from '@/lib/dreEnterpriseEngine';
import { listReceivables } from '@/lib/receivablesApi';
import { listAPQuery } from '@/lib/financeApi';
import { useClinicContext } from '@/contexts/useClinicContext';

type MedicoMetrics = {
  id: string;
  name: string;
  receitaProduzida: number;
  repasseMedico: number;
  margemMedica: number;
  glosas: number;
  receitaLiquida: number;
  rentabilidade: number;
  ticketMedio: number;
};

type Props = {
  summary: DRESummary | null;
  variant: string;
  loading?: boolean;
  period?: { start: string; end: string };
};

const money = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getReceivableValue = (row: any): number => money(
  row?.valor_liquido
  ?? row?.net_value
  ?? row?.net_amount
  ?? row?.valor_bruto
  ?? row?.gross_value
  ?? row?.gross_amount
  ?? row?.amount
  ?? row?.value
  ?? row?.total_amount
  ?? row?.valor
);

const getPayableValue = (row: any): number => money(
  row?.valor_liquido
  ?? row?.net_value
  ?? row?.net_amount
  ?? row?.valor_bruto
  ?? row?.gross_value
  ?? row?.gross_amount
  ?? row?.amount
  ?? row?.value
  ?? row?.total_amount
  ?? row?.valor
);

const getDeductionValue = (row: any): number => money(
  row?.glosa_value
  ?? row?.glosa_amount
  ?? row?.chargeback_amount
  ?? row?.desconto
  ?? row?.discount_value
);

/**
 * ETAPA 7: DRE por Médico
 * Painel dedicado com análise de rentabilidade por profissional
 */
export default function DREMedicoPanel({ summary, variant, loading = false, period }: Props) {
  const { clinicId } = useClinicContext();
  const [selectedMedico, setSelectedMedico] = useState<string>('todos');
  const [medicosList, setMedicosList] = useState<MedicoMetrics[]>([]);
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

        const byMedico = new Map<string, {
          id: string;
          name: string;
          receitaProduzida: number;
          glosas: number;
          count: number;
        }>();

        (receivables || []).forEach((row: any) => {
          const id = String(row.professional_id || row.medico_id || row.doctor_id || row.professional_name || row.medico_name || 'sem-profissional');
          const name = row.professional_name || row.doctor_name || row.medico_name || 'Sem profissional';
          const receita = getReceivableValue(row);
          const glosa = getDeductionValue(row);

          if (!byMedico.has(id)) {
            byMedico.set(id, { id, name, receitaProduzida: 0, glosas: 0, count: 0 });
          }

          const current = byMedico.get(id)!;
          current.receitaProduzida += receita;
          current.glosas += glosa;
          current.count += 1;
        });

        const repasseByKey = new Map<string, number>();
        (payables || []).forEach((row: any) => {
          const doctorName = String(row.repasse_doctor_name || '').trim();
          const description = String(row.description || '').toLowerCase();
          if (!doctorName && !description.includes('repasse')) return;

          const amount = getPayableValue(row);
          const key = doctorName ? doctorName.toLowerCase() : 'sem-profissional';
          repasseByKey.set(key, (repasseByKey.get(key) || 0) + amount);
        });

        const metrics: MedicoMetrics[] = Array.from(byMedico.values()).map((item) => {
          const key = item.name.toLowerCase();
          const repasse = repasseByKey.get(key) || 0;
          const receitaLiquida = Math.max(0, item.receitaProduzida - item.glosas);
          const margemMedica = item.receitaProduzida > 0
            ? ((item.receitaProduzida - repasse) / item.receitaProduzida) * 100
            : 0;
          const rentabilidade = receitaLiquida > 0
            ? ((receitaLiquida - repasse) / receitaLiquida) * 100
            : 0;

          return {
            id: item.id,
            name: item.name,
            receitaProduzida: item.receitaProduzida,
            repasseMedico: repasse,
            margemMedica,
            glosas: item.glosas,
            receitaLiquida,
            rentabilidade,
            ticketMedio: item.count > 0 ? item.receitaProduzida / item.count : 0,
          };
        })
          .filter((item) => item.receitaProduzida > 0)
          .sort((a, b) => b.receitaProduzida - a.receitaProduzida)
          .slice(0, 20);

        if (active) {
          setMedicosList(metrics);
        }
      } catch (error) {
        if (active) {
          setLoadError('Não foi possível carregar os dados de médico neste período.');
          setMedicosList([]);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [summary, loading, clinicId, period?.start, period?.end]);

  const showMedicoPanel = variant === 'medico' || variant === 'gerencial';

  if (!showMedicoPanel) return null;
  if (loading) return <Card className="p-6 animate-pulse h-96 bg-gray-100" />;
  if (!summary) return null;
  if (!medicosList.length) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-600">{loadError || 'Sem dados de produtividade por médico para o período selecionado.'}</p>
      </Card>
    );
  }

  const selectedData = selectedMedico === 'todos'
    ? {
        name: 'Todos os Médicos',
        receitaProduzida: medicosList.reduce((sum, m) => sum + m.receitaProduzida, 0),
        repasseMedico: medicosList.reduce((sum, m) => sum + m.repasseMedico, 0),
        margemMedica: medicosList.length ? medicosList.reduce((sum, m) => sum + m.margemMedica, 0) / medicosList.length : 0,
        glosas: medicosList.reduce((sum, m) => sum + m.glosas, 0),
        receitaLiquida: medicosList.reduce((sum, m) => sum + m.receitaLiquida, 0),
        rentabilidade: medicosList.length ? medicosList.reduce((sum, m) => sum + m.rentabilidade, 0) / medicosList.length : 0,
        ticketMedio: medicosList.length ? medicosList.reduce((sum, m) => sum + m.ticketMedio, 0) / medicosList.length : 0,
      }
    : medicosList.find(m => m.id === selectedMedico) || medicosList[0];

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">👨‍⚕️ DRE por Médico/Profissional</h3>
            <p className="text-sm text-gray-500 mt-1">Análise de rentabilidade e produtividade por profissional</p>
          </div>
          <Select value={selectedMedico} onValueChange={setSelectedMedico}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecionar médico..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Médicos</SelectItem>
              {medicosList.map(medico => (
                <SelectItem key={medico.id} value={medico.id}>
                  {medico.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* MÉTRICAS PRINCIPAIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg bg-white p-4 border border-blue-100">
            <p className="text-xs text-gray-600 font-semibold">RECEITA PRODUZIDA</p>
            <p className="text-2xl font-bold text-blue-900 mt-2">
              R$ {(selectedData.receitaProduzida / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-blue-600 mt-1">Total faturado</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-indigo-100">
            <p className="text-xs text-gray-600 font-semibold">REPASSE MÉDICO</p>
            <p className="text-2xl font-bold text-indigo-900 mt-2">
              R$ {(selectedData.repasseMedico / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-indigo-600 mt-1">{((selectedData.repasseMedico / selectedData.receitaProduzida) * 100).toFixed(1)}% da receita</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-green-100">
            <p className="text-xs text-gray-600 font-semibold">MARGEM MÉDICA</p>
            <p className="text-2xl font-bold text-green-900 mt-2">
              {selectedData.margemMedica.toFixed(0)}%
            </p>
            <p className="text-xs text-green-600 mt-1">Rentabilidade bruta</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-amber-100">
            <p className="text-xs text-gray-600 font-semibold">GLOSAS</p>
            <p className="text-2xl font-bold text-amber-900 mt-2">
              R$ {(selectedData.glosas / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-amber-600 mt-1">{((selectedData.glosas / selectedData.receitaProduzida) * 100).toFixed(1)}% taxa</p>
          </div>
        </div>

        {/* INDICADORES DETALHADOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Receita Líquida</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  R$ {(selectedData.receitaLiquida / 1000).toFixed(1)}k
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rentabilidade</p>
                <p className={`text-xl font-bold mt-1 ${selectedData.rentabilidade >= 20 ? 'text-green-900' : 'text-orange-900'}`}>
                  {selectedData.rentabilidade.toFixed(1)}%
                </p>
              </div>
              {selectedData.rentabilidade >= 20 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-orange-500" />
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ticket Médio</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  R$ {selectedData.ticketMedio.toFixed(0)}
                </p>
              </div>
              <Percent className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      </Card>

      {/* RANKING DE MÉDICOS */}
      <Card className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">📊 Ranking de Produtividade</h4>
        <div className="space-y-3">
          {medicosList
            .sort((a, b) => b.receitaProduzida - a.receitaProduzida)
            .map((medico, idx) => (
              <div
                key={medico.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  selectedMedico === medico.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-600 w-6">{idx + 1}º</span>
                  <div>
                    <p className="font-semibold text-gray-900">{medico.name}</p>
                    <p className="text-xs text-gray-500">
                      Receita: R$ {(medico.receitaProduzida / 1000).toFixed(0)}k • Margem: {medico.margemMedica.toFixed(0)}% • Ticket: R$ {medico.ticketMedio.toFixed(0)}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${medico.rentabilidade >= 20 ? 'text-green-600' : 'text-orange-600'}`}>
                  {medico.rentabilidade.toFixed(0)}%
                </span>
              </div>
            ))}
        </div>
      </Card>

      {/* RECOMENDAÇÕES */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-2">💡 Recomendações:</p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Profissionais com margem &gt; 30%: Aumentar especialidades premium</li>
          <li>Profissionais com glosa &gt; 10%: Revisar documentação e justificativas</li>
          <li>Ticket médio baixo: Considerar capacitação ou redistribuição de casos</li>
        </ul>
      </Card>
    </div>
  );
}
