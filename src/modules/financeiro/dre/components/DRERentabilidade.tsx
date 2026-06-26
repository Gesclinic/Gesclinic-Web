import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DRESummary } from '@/lib/dreEnterpriseEngine';

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
};

/**
 * ETAPA 15: Rentabilidade TOP/BOTTOM 10
 * Análise de rentabilidade com rankings de convênios, médicos, procedimentos, especialidades e centros
 */
export default function DRERentabilidade({ summary, variant, loading = false }: Props) {
  const [category, setCategory] = useState<RentabilityCategory>('convenios');
  const [rentabilityData, setRentabilityData] = useState<{ top: RentabilityItem[]; bottom: RentabilityItem[] }>({
    top: [],
    bottom: [],
  });

  // Simular dados de rentabilidade baseado no tipo
  useEffect(() => {
    if (!summary || loading) return;

    // Mock data - Em produção, isso viria de uma API específica
    const mockData: Record<RentabilityCategory, { top: RentabilityItem[]; bottom: RentabilityItem[] }> = {
      convenios: {
        top: [
          { id: '1', name: 'Unimed SP', receita: 150000, margem: 45, glosa: 5, ticketMedio: 800, ebitda: 65000 },
          { id: '2', name: 'HAPVIDA', receita: 120000, margem: 42, glosa: 8, ticketMedio: 750, ebitda: 48000 },
          { id: '3', name: 'Bradesco Saúde', receita: 95000, margem: 40, glosa: 10, ticketMedio: 700, ebitda: 36000 },
        ],
        bottom: [
          { id: '10', name: 'Convênio X', receita: 15000, margem: 8, glosa: 35, ticketMedio: 150, ebitda: 1500 },
          { id: '11', name: 'Convênio Y', receita: 12000, margem: 5, glosa: 40, ticketMedio: 100, ebitda: 600 },
          { id: '12', name: 'Convênio Z', receita: 8000, margem: -5, glosa: 50, ticketMedio: 80, ebitda: -500 },
        ],
      },
      medicos: {
        top: [
          { id: 'm1', name: 'Dr. Silva', receita: 200000, margem: 35, glosa: 5, ticketMedio: 1200, ebitda: 70000 },
          { id: 'm2', name: 'Dra. Santos', receita: 180000, margem: 32, glosa: 6, ticketMedio: 1100, ebitda: 58000 },
          { id: 'm3', name: 'Dr. Costa', receita: 150000, margem: 28, glosa: 8, ticketMedio: 950, ebitda: 42000 },
        ],
        bottom: [
          { id: 'm10', name: 'Dr. Novo', receita: 20000, margem: 2, glosa: 20, ticketMedio: 400, ebitda: 600 },
          { id: 'm11', name: 'Dra. Teste', receita: 15000, margem: -5, glosa: 30, ticketMedio: 300, ebitda: -800 },
          { id: 'm12', name: 'Dr. Saída', receita: 10000, margem: -15, glosa: 40, ticketMedio: 200, ebitda: -2000 },
        ],
      },
      procedimentos: {
        top: [
          { id: 'p1', name: 'Ressonância Magnética', receita: 250000, margem: 55, glosa: 3, ticketMedio: 2500, ebitda: 140000 },
          { id: 'p2', name: 'Internação', receita: 200000, margem: 48, glosa: 5, ticketMedio: 4000, ebitda: 96000 },
          { id: 'p3', name: 'Cirurgia Eletiva', receita: 180000, margem: 45, glosa: 7, ticketMedio: 3600, ebitda: 81000 },
        ],
        bottom: [
          { id: 'p10', name: 'Teste Não-usual', receita: 5000, margem: 2, glosa: 25, ticketMedio: 100, ebitda: 100 },
          { id: 'p11', name: 'Procedimento Novo', receita: 3000, margem: -10, glosa: 50, ticketMedio: 150, ebitda: -400 },
          { id: 'p12', name: 'Serviço Descontinuado', receita: 1000, margem: -20, glosa: 60, ticketMedio: 100, ebitda: -300 },
        ],
      },
      especialidades: {
        top: [
          { id: 'e1', name: 'Cardiologia', receita: 180000, margem: 42, glosa: 6, ticketMedio: 1500, ebitda: 75600 },
          { id: 'e2', name: 'Oncologia', receita: 150000, margem: 38, glosa: 8, ticketMedio: 2000, ebitda: 57000 },
          { id: 'e3', name: 'Cirurgia', receita: 140000, margem: 35, glosa: 10, ticketMedio: 1800, ebitda: 49000 },
        ],
        bottom: [
          { id: 'e10', name: 'Oftalmologia', receita: 25000, margem: 5, glosa: 22, ticketMedio: 300, ebitda: 1500 },
          { id: 'e11', name: 'Dermatologia', receita: 15000, margem: -3, glosa: 35, ticketMedio: 200, ebitda: -600 },
          { id: 'e12', name: 'Fisioterapia', receita: 8000, margem: -18, glosa: 50, ticketMedio: 150, ebitda: -1600 },
        ],
      },
      centros: {
        top: [
          { id: 'c1', name: 'Centro Cirúrgico', receita: 300000, margem: 50, glosa: 4, ticketMedio: 3000, ebitda: 150000 },
          { id: 'c2', name: 'UTI', receita: 250000, margem: 45, glosa: 5, ticketMedio: 5000, ebitda: 112500 },
          { id: 'c3', name: 'Diagnóstico', receita: 180000, margem: 52, glosa: 3, ticketMedio: 1800, ebitda: 93600 },
        ],
        bottom: [
          { id: 'c10', name: 'Administração', receita: 0, margem: -40, glosa: 0, ticketMedio: 0, ebitda: -80000 },
          { id: 'c11', name: 'Infraestrutura', receita: 0, margem: -35, glosa: 0, ticketMedio: 0, ebitda: -60000 },
          { id: 'c12', name: 'RH e Pessoal', receita: 0, margem: -30, glosa: 0, ticketMedio: 0, ebitda: -45000 },
        ],
      },
    };

    setRentabilityData(mockData[category]);
  }, [category, summary, loading]);

  const categoryLabels: Record<RentabilityCategory, string> = {
    convenios: 'Convênios',
    medicos: 'Médicos/Profissionais',
    procedimentos: 'Procedimentos/Serviços',
    especialidades: 'Especialidades',
    centros: 'Centros de Custo',
  };

  if (loading) {
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
            {rentabilityData.top.map((item, idx) => (
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
            {rentabilityData.bottom.map((item, idx) => (
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
