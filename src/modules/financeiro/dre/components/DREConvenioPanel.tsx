import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import type { DRESummary } from '@/lib/dreEnterpriseEngine';
import { listReceivables } from '@/lib/receivablesApi';
import { useClinicContext } from '@/contexts/useClinicContext';

type ConvenioMetrics = {
  id: string;
  name: string;
  receita: number;
  glosa: number;
  recebido: number;
  pendente: number;
  prazoMedio: number;
  rentabilidade: number;
  margem: number;
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

const getDeductionValue = (row: any): number => money(
  row?.glosa_value
  ?? row?.glosa_amount
  ?? row?.chargeback_amount
  ?? row?.desconto
  ?? row?.discount_value
);

/**
 * ETAPA 8: DRE por Convênio
 * Painel dedicado com análise de desempenho por plano de saúde
 */
export default function DREConvenioPanel({ summary, variant, loading = false, period }: Props) {
  const { clinicId } = useClinicContext();
  const [selectedConvenio, setSelectedConvenio] = useState<string>('todos');
  const [conveniosList, setConveniosList] = useState<ConvenioMetrics[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!summary || loading || !clinicId) return;

    let active = true;

    const loadData = async () => {
      try {
        setLoadError(null);

        const start = period?.start || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
        const end = period?.end || new Date().toISOString().split('T')[0];

        const receivables = await listReceivables({ clinicId, dueStart: start, dueEnd: end, limit: 5000 });

        const byConvenio = new Map<string, {
          id: string;
          name: string;
          receita: number;
          glosa: number;
          recebido: number;
          prazoTotal: number;
          count: number;
        }>();

        (receivables || []).forEach((row: any) => {
          const id = String(row.payer_id || row.convenio_id || row.health_insurance_id || row.payer_name || row.convenio_name || 'particular');
          const name = row.payer_name || row.convenio_name || row.insurance_name || 'Particular';
          const receita = getReceivableValue(row);
          const glosa = getDeductionValue(row);
          const recebido = money(row.received_amount ?? row.valor_recebido ?? row.paid_amount);

          if (!byConvenio.has(id)) {
            byConvenio.set(id, { id, name, receita: 0, glosa: 0, recebido: 0, prazoTotal: 0, count: 0 });
          }

          const current = byConvenio.get(id)!;
          current.receita += receita;
          current.glosa += glosa;
          current.recebido += recebido > 0 ? recebido : (String(row.status || '').toLowerCase() === 'paid' ? receita : 0);
          current.count += 1;

          const issueDate = row.issue_date ? new Date(`${row.issue_date}T00:00:00`) : null;
          const dueDate = row.due_date ? new Date(`${row.due_date}T00:00:00`) : null;
          if (issueDate && dueDate && !Number.isNaN(issueDate.getTime()) && !Number.isNaN(dueDate.getTime())) {
            current.prazoTotal += Math.max(0, Math.round((dueDate.getTime() - issueDate.getTime()) / (24 * 60 * 60 * 1000)));
          }
        });

        const metrics: ConvenioMetrics[] = Array.from(byConvenio.values()).map((item) => {
          const pendente = Math.max(0, item.receita - item.recebido);
          const margem = item.receita > 0 ? ((item.receita - item.glosa) / item.receita) * 100 : 0;
          const rentabilidade = item.receita > 0
            ? ((item.recebido - item.glosa) / item.receita) * 100
            : 0;

          return {
            id: item.id,
            name: item.name,
            receita: item.receita,
            glosa: item.glosa,
            recebido: item.recebido,
            pendente,
            prazoMedio: item.count > 0 ? item.prazoTotal / item.count : 0,
            rentabilidade,
            margem,
            ticketMedio: item.count > 0 ? item.receita / item.count : 0,
          };
        })
          .filter((item) => item.receita > 0)
          .sort((a, b) => b.receita - a.receita)
          .slice(0, 20);

        if (active) {
          setConveniosList(metrics);
        }
      } catch (error) {
        if (active) {
          setLoadError('Não foi possível carregar os dados de convênio neste período.');
          setConveniosList([]);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [summary, loading, clinicId, period?.start, period?.end]);

  const showConvenioPanel = variant === 'convenio' || variant === 'gerencial';

  if (!showConvenioPanel) return null;
  if (loading) return <Card className="p-6 animate-pulse h-96 bg-gray-100" />;
  if (!summary) return null;
  if (!conveniosList.length) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-600">{loadError || 'Sem dados de convênios para o período selecionado.'}</p>
      </Card>
    );
  }

  const selectedData = selectedConvenio === 'todos'
    ? {
        name: 'Todos os Convênios',
        receita: conveniosList.reduce((sum, c) => sum + c.receita, 0),
        glosa: conveniosList.reduce((sum, c) => sum + c.glosa, 0),
        recebido: conveniosList.reduce((sum, c) => sum + c.recebido, 0),
        pendente: conveniosList.reduce((sum, c) => sum + c.pendente, 0),
        prazoMedio: conveniosList.length ? conveniosList.reduce((sum, c) => sum + c.prazoMedio, 0) / conveniosList.length : 0,
        rentabilidade: conveniosList.length ? conveniosList.reduce((sum, c) => sum + c.rentabilidade, 0) / conveniosList.length : 0,
        margem: conveniosList.length ? conveniosList.reduce((sum, c) => sum + c.margem, 0) / conveniosList.length : 0,
        ticketMedio: conveniosList.length ? conveniosList.reduce((sum, c) => sum + c.ticketMedio, 0) / conveniosList.length : 0,
      }
    : conveniosList.find(c => c.id === selectedConvenio) || conveniosList[0];

  const glosaPercent = selectedData.receita > 0 ? (selectedData.glosa / selectedData.receita) * 100 : 0;
  const recebimentoPercent = selectedData.receita > 0 ? (selectedData.recebido / selectedData.receita) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">🏥 DRE por Convênio</h3>
            <p className="text-sm text-gray-500 mt-1">Análise de receita, glosa e recebimento por plano de saúde</p>
          </div>
          <Select value={selectedConvenio} onValueChange={setSelectedConvenio}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecionar convênio..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Convênios</SelectItem>
              {conveniosList.map(convenio => (
                <SelectItem key={convenio.id} value={convenio.id}>
                  {convenio.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* MÉTRICAS PRINCIPAIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg bg-white p-4 border border-emerald-100">
            <p className="text-xs text-gray-600 font-semibold">RECEITA</p>
            <p className="text-2xl font-bold text-emerald-900 mt-2">
              R$ {(selectedData.receita / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-emerald-600 mt-1">Total faturado</p>
          </div>

          <div className={`rounded-lg bg-white p-4 border ${glosaPercent > 15 ? 'border-red-200' : 'border-orange-100'}`}>
            <p className="text-xs text-gray-600 font-semibold">GLOSA</p>
            <p className={`text-2xl font-bold mt-2 ${glosaPercent > 15 ? 'text-red-900' : 'text-orange-900'}`}>
              {glosaPercent.toFixed(1)}%
            </p>
            <p className={`text-xs mt-1 ${glosaPercent > 15 ? 'text-red-600' : 'text-orange-600'}`}>
              R$ {(selectedData.glosa / 1000).toFixed(1)}k
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-green-100">
            <p className="text-xs text-gray-600 font-semibold">RECEBIDO</p>
            <p className="text-2xl font-bold text-green-900 mt-2">
              {recebimentoPercent.toFixed(0)}%
            </p>
            <p className="text-xs text-green-600 mt-1">R$ {(selectedData.recebido / 1000).toFixed(1)}k</p>
          </div>

          <div className={`rounded-lg bg-white p-4 border ${selectedData.pendente > 50000 ? 'border-amber-200' : 'border-blue-100'}`}>
            <p className="text-xs text-gray-600 font-semibold">PENDENTE</p>
            <p className={`text-2xl font-bold mt-2 ${selectedData.pendente > 50000 ? 'text-amber-900' : 'text-blue-900'}`}>
              R$ {(selectedData.pendente / 1000).toFixed(1)}k
            </p>
            <p className={`text-xs mt-1 ${selectedData.pendente > 50000 ? 'text-amber-600' : 'text-blue-600'}`}>
              {((selectedData.pendente / selectedData.receita) * 100).toFixed(1)}% a receber
            </p>
          </div>
        </div>

        {/* INDICADORES DETALHADOS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-white p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Prazo Médio</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {selectedData.prazoMedio.toFixed(0)}d
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rentabilidade</p>
                <p className={`text-xl font-bold mt-1 ${selectedData.rentabilidade >= 30 ? 'text-green-900' : 'text-orange-900'}`}>
                  {selectedData.rentabilidade.toFixed(0)}%
                </p>
              </div>
              {selectedData.rentabilidade >= 30 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-orange-500" />
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <p className="text-sm text-gray-600">Margem</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {selectedData.margem.toFixed(0)}%
            </p>
          </div>

          <div className="rounded-lg bg-white p-4">
            <p className="text-sm text-gray-600">Ticket Médio</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              R$ {selectedData.ticketMedio.toFixed(0)}
            </p>
          </div>
        </div>
      </Card>

      {/* RANKING DE CONVÊNIOS */}
      <Card className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">📊 Ranking de Desempenho</h4>
        <div className="space-y-3">
          {conveniosList
            .sort((a, b) => b.receita - a.receita)
            .map((convenio, idx) => (
              <div
                key={convenio.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  selectedConvenio === convenio.id
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-bold text-gray-600 w-6">{idx + 1}º</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{convenio.name}</p>
                    <p className="text-xs text-gray-500">
                      Receita: R$ {(convenio.receita / 1000).toFixed(0)}k • Glosa: {((convenio.glosa / convenio.receita) * 100).toFixed(1)}% • Prazo: {convenio.prazoMedio}d
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-xs font-semibold ${convenio.glosa / convenio.receita > 0.15 ? 'text-red-600' : 'text-green-600'}`}>
                      {((convenio.glosa / convenio.receita) * 100).toFixed(1)}% glosa
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {convenio.rentabilidade.toFixed(0)}%
                    </p>
                  </div>
                  {convenio.glosa / convenio.receita > 0.15 && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* RECOMENDAÇÕES */}
      <Card className="p-4 bg-emerald-50 border-emerald-200">
        <p className="text-sm font-semibold text-emerald-900 mb-2">💡 Ações Recomendadas:</p>
        <ul className="text-sm text-emerald-800 space-y-1 list-disc list-inside">
          <li>Convênios com glosa &gt; 15%: Renegociar termos ou melhorar documentação</li>
          <li>Prazo médio &gt; 45 dias: Acelerar cobrança ou otimizar fluxo</li>
          <li>Rentabilidade baixa: Avaliar mix de procedimentos ou desativar se não viável</li>
        </ul>
      </Card>
    </div>
  );
}
