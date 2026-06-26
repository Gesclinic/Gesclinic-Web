import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DRESummary } from '@/lib/dreEnterpriseEngine';
import { useClinicContext } from '@/contexts/useClinicContext';
import { buildSegmentMetrics, loadDreActualData, type DrePeriod, type SegmentKey } from '@/modules/financeiro/dre/utils/dreActualData';

type RentabilityCategory = 'convenios' | 'medicos' | 'procedimentos' | 'especialidades' | 'centros';

type RentabilityItem = {
  id: string;
  name: string;
  receita: number;
  margem: number;
  glosa: number;
  ticketMedio: number;
  ebitda: number;
};

type Props = {
  summary: DRESummary | null;
  variant: string;
  loading?: boolean;
  period?: DrePeriod;
};

/**
 * ETAPA 15: Rentabilidade TOP/BOTTOM 10
 * Análise de rentabilidade com rankings de convênios, médicos, procedimentos, especialidades e centros
 */
export default function DRERentabilidade({ summary, variant, loading = false, period }: Props) {
  const { clinicId } = useClinicContext();
  const [category, setCategory] = useState<RentabilityCategory>('convenios');
  const [loadingData, setLoadingData] = useState(false);
  const [rentabilityData, setRentabilityData] = useState<{ top: RentabilityItem[]; bottom: RentabilityItem[] }>({
    top: [],
    bottom: [],
  });

  useEffect(() => {
    if (!summary || loading || !clinicId || !period) return;
    let active = true;

    const load = async () => {
      setLoadingData(true);
      try {
        const consolidation = await loadDreActualData(clinicId, period);
        const rows = buildSegmentMetrics(consolidation, category as SegmentKey).map((item) => ({
          id: item.id,
          name: item.name,
          receita: item.receita,
          margem: item.margem,
          glosa: item.receita > 0 ? (item.glosa / item.receita) * 100 : 0,
          ticketMedio: item.ticketMedio,
          ebitda: item.ebitda,
        }));
        const ranked = rows.sort((a, b) => b.margem - a.margem);
        if (active) {
          setRentabilityData({
            top: ranked.slice(0, 3),
            bottom: ranked.slice(-3).reverse(),
          });
        }
      } catch (error) {
        console.warn('[DRERentabilidade] Erro ao carregar dados reais:', error);
        if (active) setRentabilityData({ top: [], bottom: [] });
      } finally {
        if (active) setLoadingData(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [category, clinicId, loading, period?.end, period?.start, summary]);

  const categoryLabels: Record<RentabilityCategory, string> = {
    convenios: 'Convênios',
    medicos: 'Médicos/Profissionais',
    procedimentos: 'Procedimentos/Serviços',
    especialidades: 'Especialidades',
    centros: 'Centros de Custo',
  };

  if (loading || loadingData) {
    return <Card className="p-6 animate-pulse h-64 bg-gray-100" />;
  }

  if (!summary) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900">Rentabilidade TOP/BOTTOM 10</h3>
        <p className="text-sm text-gray-500">Carregando dados...</p>
      </Card>
    );
  }

  const showRentabilidade = variant !== 'projetada';

  if (!showRentabilidade) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 text-lg">📊 Rentabilidade TOP / BOTTOM 10</h3>
        <Select value={category} onValueChange={(val) => setCategory(val as RentabilityCategory)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Selecionar categoria..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="convenios">Convênios</SelectItem>
            <SelectItem value="medicos">Médicos/Profissionais</SelectItem>
            <SelectItem value="procedimentos">Procedimentos/Serviços</SelectItem>
            <SelectItem value="especialidades">Especialidades</SelectItem>
            <SelectItem value="centros">Centros de Custo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP 10 */}
        <div>
          <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            TOP 3 - Maior Rentabilidade
          </h4>
          <div className="space-y-3">
            {rentabilityData.top.length === 0 ? (
              <p className="text-sm text-gray-500">Sem dados reais para esta categoria no período.</p>
            ) : rentabilityData.top.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-lg border border-green-200 bg-green-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      #{idx + 1} - {item.name}
                    </p>
                  </div>
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded font-bold">
                    {item.margem.toFixed(0)}% margem
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <p className="text-gray-500">Receita:</p>
                    <p className="font-semibold">R$ {item.receita.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ticket Médio:</p>
                    <p className="font-semibold">R$ {item.ticketMedio.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Glosa:</p>
                    <p className="font-semibold">{item.glosa.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">EBITDA:</p>
                    <p className="font-semibold text-green-700">R$ {item.ebitda.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM 10 */}
        <div>
          <h4 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            BOTTOM 3 - Menor Rentabilidade
          </h4>
          <div className="space-y-3">
            {rentabilityData.bottom.length === 0 ? (
              <p className="text-sm text-gray-500">Sem dados reais para esta categoria no período.</p>
            ) : rentabilityData.bottom.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-lg border border-red-200 bg-red-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      #{10 + idx} - {item.name}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${item.margem < 0 ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>
                    {item.margem.toFixed(0)}% margem
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <p className="text-gray-500">Receita:</p>
                    <p className="font-semibold">{item.receita > 0 ? `R$ ${item.receita.toLocaleString('pt-BR')}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ticket Médio:</p>
                    <p className="font-semibold">{item.ticketMedio > 0 ? `R$ ${item.ticketMedio.toLocaleString('pt-BR')}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Glosa:</p>
                    <p className="font-semibold">{item.glosa.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">EBITDA:</p>
                    <p className={`font-semibold ${item.ebitda < 0 ? 'text-red-700' : 'text-green-700'}`}>
                      R$ {item.ebitda.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECOMENDAÇÕES */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-3">💡 Recomendações de Ação:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              <strong>✅ TOP performers:</strong> Expandir ofertas e potencializar a receita desses segmentos.
            </p>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">
              <strong>⚠️ BOTTOM deficitários:</strong> Renegociar condições, aumentar volume ou desativar se inviável.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
