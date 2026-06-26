import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3, DollarSign } from 'lucide-react';
import type { DRESummary, DREVariantType } from '@/lib/dreEnterpriseEngine';

type Props = {
  summary: DRESummary | null;
  loading?: boolean;
  variant?: DREVariantType;
  projectedScenarioLabel?: string;
};

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPct = (value: number) => `${value.toFixed(2)}%`;

const formatDays = (value: number) => `${Math.round(value)} dias`;

export default function DREKpis({ summary, loading = false, variant = 'gerencial', projectedScenarioLabel }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse h-24 bg-gray-100" />
        ))}
      </div>
    );
  }

  const cardsByVariant: Record<DREVariantType, Array<{ label: string; value: string; icon: React.ElementType }>> = {
    gerencial: [
      { label: 'Receita Bruta', value: formatMoney(summary.receitaBruta), icon: DollarSign },
      { label: 'Receita Liquida', value: formatMoney(summary.receitaLiquida), icon: DollarSign },
      { label: 'Margem Bruta', value: formatPct(summary.margemBrutaPercent), icon: BarChart3 },
      { label: 'EBITDA', value: formatMoney(summary.ebitda), icon: TrendingUp },
      { label: 'EBIT', value: formatMoney(summary.ebit), icon: BarChart3 },
      { label: 'Lucro Liquido', value: formatMoney(summary.lucroLiquido), icon: summary.lucroLiquido >= 0 ? TrendingUp : TrendingDown },
      { label: 'Margem Liquida', value: formatPct(summary.lucroLiquidoPercent), icon: summary.lucroLiquidoPercent >= 0 ? TrendingUp : TrendingDown },
      { label: 'Custos Totais', value: formatMoney(summary.custosFixos + summary.custosVariaveis + summary.despesasOperacionais), icon: TrendingDown },
    ],
    contabil: [
      { label: 'Receita Bruta', value: formatMoney(summary.receitaBruta), icon: DollarSign },
      { label: 'Deducoes', value: formatMoney(summary.deducoes), icon: TrendingDown },
      { label: 'Despesas Operacionais', value: formatMoney(summary.despesasOperacionais), icon: TrendingDown },
      { label: 'Impostos', value: formatMoney(summary.impostos), icon: TrendingDown },
      { label: 'EBIT', value: formatMoney(summary.ebit), icon: BarChart3 },
      { label: 'Lucro Liquido', value: formatMoney(summary.lucroLiquido), icon: summary.lucroLiquido >= 0 ? TrendingUp : TrendingDown },
      { label: 'Margem Liquida', value: formatPct(summary.lucroLiquidoPercent), icon: summary.lucroLiquidoPercent >= 0 ? TrendingUp : TrendingDown },
      { label: 'Receita Liquida', value: formatMoney(summary.receitaLiquida), icon: DollarSign },
    ],
    centro: [
      { label: 'Receita Bruta', value: formatMoney(summary.receitaBruta), icon: DollarSign },
      { label: 'Custos Variaveis', value: formatMoney(summary.custosVariaveis), icon: TrendingDown },
      { label: 'Custos Fixos', value: formatMoney(summary.custosFixos), icon: TrendingDown },
      { label: 'EBITDA', value: formatMoney(summary.ebitda), icon: TrendingUp },
      { label: 'EBIT', value: formatMoney(summary.ebit), icon: BarChart3 },
      { label: 'Lucro Liquido', value: formatMoney(summary.lucroLiquido), icon: summary.lucroLiquido >= 0 ? TrendingUp : TrendingDown },
      { label: 'Margem Bruta', value: formatPct(summary.margemBrutaPercent), icon: BarChart3 },
      { label: 'Margem Liquida', value: formatPct(summary.lucroLiquidoPercent), icon: summary.lucroLiquidoPercent >= 0 ? TrendingUp : TrendingDown },
    ],
    medico: [
      { label: 'Receita Bruta', value: formatMoney(summary.receitaBruta), icon: DollarSign },
      { label: 'Receita Liquida', value: formatMoney(summary.receitaLiquida), icon: DollarSign },
      { label: 'Margem Bruta', value: formatPct(summary.margemBrutaPercent), icon: BarChart3 },
      { label: 'EBITDA', value: formatMoney(summary.ebitda), icon: TrendingUp },
      { label: 'Lucro Liquido', value: formatMoney(summary.lucroLiquido), icon: summary.lucroLiquido >= 0 ? TrendingUp : TrendingDown },
      { label: 'Margem Liquida', value: formatPct(summary.lucroLiquidoPercent), icon: summary.lucroLiquidoPercent >= 0 ? TrendingUp : TrendingDown },
    ],
    convenio: [
      { label: 'Receita Bruta', value: formatMoney(summary.receitaBruta), icon: DollarSign },
      { label: 'Deducoes', value: formatMoney(summary.deducoes), icon: TrendingDown },
      { label: 'Receita Liquida', value: formatMoney(summary.receitaLiquida), icon: DollarSign },
      { label: 'Margem Bruta', value: formatPct(summary.margemBrutaPercent), icon: BarChart3 },
      { label: 'EBITDA', value: formatMoney(summary.ebitda), icon: TrendingUp },
      { label: 'Lucro Liquido', value: formatMoney(summary.lucroLiquido), icon: summary.lucroLiquido >= 0 ? TrendingUp : TrendingDown },
      { label: 'Margem Liquida', value: formatPct(summary.lucroLiquidoPercent), icon: summary.lucroLiquidoPercent >= 0 ? TrendingUp : TrendingDown },
    ],
    unidade: [
      { label: 'Receita Bruta', value: formatMoney(summary.receitaBruta), icon: DollarSign },
      { label: 'Custos Totais', value: formatMoney(summary.custosFixos + summary.custosVariaveis + summary.despesasOperacionais), icon: TrendingDown },
      { label: 'EBITDA', value: formatMoney(summary.ebitda), icon: TrendingUp },
      { label: 'EBIT', value: formatMoney(summary.ebit), icon: BarChart3 },
      { label: 'Lucro Liquido', value: formatMoney(summary.lucroLiquido), icon: summary.lucroLiquido >= 0 ? TrendingUp : TrendingDown },
      { label: 'Margem Liquida', value: formatPct(summary.lucroLiquidoPercent), icon: summary.lucroLiquidoPercent >= 0 ? TrendingUp : TrendingDown },
    ],
    especialidade: [
      { label: 'Receita Bruta', value: formatMoney(summary.receitaBruta), icon: DollarSign },
      { label: 'Receita Liquida', value: formatMoney(summary.receitaLiquida), icon: DollarSign },
      { label: 'Margem Bruta', value: formatPct(summary.margemBrutaPercent), icon: BarChart3 },
      { label: 'EBITDA', value: formatMoney(summary.ebitda), icon: TrendingUp },
      { label: 'Lucro Liquido', value: formatMoney(summary.lucroLiquido), icon: summary.lucroLiquido >= 0 ? TrendingUp : TrendingDown },
      { label: 'Margem Liquida', value: formatPct(summary.lucroLiquidoPercent), icon: summary.lucroLiquidoPercent >= 0 ? TrendingUp : TrendingDown },
    ],
    projetada: [
      { label: 'Receita Bruta', value: formatMoney(summary.receitaBruta), icon: DollarSign },
      { label: 'Receita Liquida', value: formatMoney(summary.receitaLiquida), icon: DollarSign },
      { label: 'Margem Bruta', value: formatPct(summary.margemBrutaPercent), icon: BarChart3 },
      { label: 'EBITDA', value: formatMoney(summary.ebitda), icon: TrendingUp },
      { label: 'EBIT', value: formatMoney(summary.ebit), icon: BarChart3 },
      { label: 'Lucro Liquido', value: formatMoney(summary.lucroLiquido), icon: summary.lucroLiquido >= 0 ? TrendingUp : TrendingDown },
      { label: 'Margem Liquida', value: formatPct(summary.lucroLiquidoPercent), icon: summary.lucroLiquidoPercent >= 0 ? TrendingUp : TrendingDown },
      { label: 'Custos Totais', value: formatMoney(summary.custosFixos + summary.custosVariaveis + summary.despesasOperacionais), icon: TrendingDown },
    ],
  };

  const projectedCards = summary.runwayDays !== undefined || summary.burnRate !== undefined
    ? [
        { label: 'Burn Rate / Dia', value: formatMoney(summary.burnRate || 0), icon: TrendingDown },
        { label: 'Runway', value: formatDays(summary.runwayDays || 0), icon: BarChart3 },
        { label: 'Saldo Inicial Caixa', value: formatMoney(summary.projectedStartBalance || 0), icon: DollarSign },
        { label: 'Saldo Final Projetado', value: formatMoney(summary.projectedEndBalance || 0), icon: (summary.projectedEndBalance || 0) >= 0 ? TrendingUp : TrendingDown },
      ]
    : [];

  const visibleCards = [...cardsByVariant[variant] || cardsByVariant.gerencial, ...projectedCards];

  return (
    <div className="space-y-3">
      {projectedScenarioLabel ? (
        <div className="flex items-center">
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
            Cenario ativo: {projectedScenarioLabel}
          </span>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Visao: {variant}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4 border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600 uppercase tracking-wide">{card.label}</p>
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <p className="text-lg font-semibold text-gray-900">{card.value}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
