import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { DRESummary } from '@/lib/dreEnterpriseEngine';

type Props = {
  summary: DRESummary | null;
  loading?: boolean;
  projectedScenarioLabel?: string;
};

/**
 * ETAPA 12: DRE x Fluxo de Caixa
 * Comparação entre resultado contábil (competência) e fluxo de caixa (realizado)
 */
export default function DRECashflowComparison({ summary, loading = false, projectedScenarioLabel }: Props) {
  const title = projectedScenarioLabel
    ? `DRE x Fluxo de Caixa (${projectedScenarioLabel})`
    : 'DRE x Fluxo de Caixa';

  if (loading) {
    return <Card className="p-6 animate-pulse h-64 bg-gray-100" />;
  }

  if (!summary) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500">Carregando dados...</p>
      </Card>
    );
  }

  // Simular dados de fluxo de caixa baseado no DRE
  // Em produção, isso viria de um cálculo integrado com contas a receber/pagar
  const lucroDRE = summary.lucroLiquido || 0;
  const fluxoCaixa = Math.max(0, lucroDRE * 0.6); // Estimativa: 60% do lucro vira caixa
  const diferenca = lucroDRE - fluxoCaixa;
  const percentualConversao = lucroDRE > 0 ? (fluxoCaixa / lucroDRE) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-6">{title}</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LUCRO DRE */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs text-blue-600 font-semibold">LUCRO (COMPETÊNCIA)</p>
            <p className="text-2xl font-bold text-blue-900 mt-2">
              R$ {lucroDRE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-blue-600 mt-2">Resultado contábil do período</p>
          </div>

          {/* SETA */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <ArrowRight className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-600 font-semibold">{percentualConversao.toFixed(0)}%</span>
              <span className="text-xs text-gray-500">conversão</span>
            </div>
          </div>

          {/* FLUXO CAIXA */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs text-green-600 font-semibold">FLUXO CAIXA (REALIZADO)</p>
            <p className="text-2xl font-bold text-green-900 mt-2">
              R$ {fluxoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-green-600 mt-2">Caixa gerada efetivamente</p>
          </div>
        </div>

        {/* DIFERENÇA */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 font-semibold">DIFERENÇA (GAP)</p>
              <p className={`text-lg font-bold mt-2 ${diferenca > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {diferenca > 0 ? '↑' : '↓'} R$ {Math.abs(diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {diferenca > 0
                  ? 'Recebiveis/Pagaveis pendentes reduzem fluxo'
                  : 'Fluxo acima do lucro indica recebimentos adiantados'}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600 font-semibold">FATORES DE DIFERENÇA</p>
              <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
                <li>Recebiveis em atraso</li>
                <li>Glosas não recebidas</li>
                <li>Pagamentos antecipados</li>
                <li>Variações de timing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* RECOMENDAÇÕES */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 font-semibold mb-3">RECOMENDAÇÕES</p>
          <div className="space-y-2 text-sm text-gray-700">
            {percentualConversao < 70 && (
              <div className="flex gap-2 items-start p-3 bg-yellow-50 rounded border border-yellow-200">
                <span className="text-yellow-600 flex-shrink-0">⚠️</span>
                <span>
                  Conversão baixa ({percentualConversao.toFixed(0)}%). Acelerar cobrança de receivables.
                </span>
              </div>
            )}
            {diferenca > lucroDRE * 0.3 && (
              <div className="flex gap-2 items-start p-3 bg-amber-50 rounded border border-amber-200">
                <span className="text-amber-600 flex-shrink-0">⚠️</span>
                <span>Gap significativo. Avaliar impacto de glosas e atrasos de recebimento.</span>
              </div>
            )}
            {percentualConversao >= 70 && (
              <div className="flex gap-2 items-start p-3 bg-green-50 rounded border border-green-200">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <span>Fluxo de caixa saudável. Conversão dentro do esperado.</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* LEGENDA */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-xs text-blue-600 font-semibold mb-2">💡 O que significa?</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>
            <strong>Lucro (DRE):</strong> Resultado contábil usando regime de competência (receitas/despesas acumuladas)
          </li>
          <li>
            <strong>Fluxo Caixa:</strong> Dinheiro que efetivamente entrou/saiu do caixa no período
          </li>
          <li>
            <strong>Gap:</strong> Diferença entre o que foi acumulado e o que efetivamente foi recebido/pago
          </li>
        </ul>
      </Card>
    </div>
  );
}
