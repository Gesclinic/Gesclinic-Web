import React from 'react';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DREComparison } from '@/lib/dreEnterpriseEngine';

type Props = {
  comparison: DREComparison | null;
  loading?: boolean;
  projectedScenarioLabel?: string;
  projectedHorizonDays?: number;
  titleOverride?: string;
  descriptionOverride?: string;
};

const isPctUnavailable = (value: number | undefined | null) => (
  value === null || value === undefined || Number.isNaN(Number(value))
);

const metric = (label: string, value: number | undefined | null) => (
  <div className="p-3 rounded border bg-gray-50">
    <p className="text-xs uppercase tracking-wide text-gray-600">{label}</p>
    <p className={`text-lg font-semibold flex items-center gap-2 ${value && value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
      {isPctUnavailable(value) ? 'N/A' : `${Number(value).toFixed(2)}%`}
      {isPctUnavailable(value) ? (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-700 cursor-help"
                aria-label="Informação sobre base anterior"
              >
                <Info className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Base anterior muito baixa para percentual.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </p>
  </div>
);

const money = (value: number | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const periodLabel = (start?: string, end?: string) => {
  if (!start || !end) return '';
  return `${start} a ${end}`;
};

export default function DREComparisonCard({
  comparison,
  loading = false,
  projectedScenarioLabel,
  projectedHorizonDays,
  titleOverride,
  descriptionOverride,
}: Props) {
  const title = titleOverride || (projectedScenarioLabel
    ? `Comparacao de Periodos - Projetada (${projectedScenarioLabel}${projectedHorizonDays ? ` • ${projectedHorizonDays} dias` : ''})`
    : 'Comparacao de Periodos');

  if (loading) {
    return <Card className="p-4 animate-pulse h-28 bg-gray-100" />;
  }

  if (!comparison) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500">Clique em "Comparar" para carregar os deltas.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {descriptionOverride ? (
        <p className="text-sm text-slate-600 mb-3">{descriptionOverride}</p>
      ) : null}
      <p className="text-sm text-gray-500 mb-3">
        Atual: {periodLabel(comparison.current.period.start, comparison.current.period.end)}
        {' | '}
        Anterior: {periodLabel(comparison.previous.period.start, comparison.previous.period.end)}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {metric('Receita Bruta', comparison.deltaPercent.receitaBruta)}
        {metric('Margem Bruta', comparison.deltaPercent.margemBrutaPercent)}
        {metric('Lucro Liquido', comparison.deltaPercent.lucroLiquidoPercent)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-sm">
        <div className="rounded border p-3 bg-white">
          <p className="text-gray-500">Delta Receita Bruta</p>
          <p className="font-semibold text-gray-900">{money(comparison.delta.receitaBruta)}</p>
        </div>
        <div className="rounded border p-3 bg-white">
          <p className="text-gray-500">Delta EBITDA</p>
          <p className="font-semibold text-gray-900">{money(comparison.delta.ebitda)}</p>
        </div>
        <div className="rounded border p-3 bg-white">
          <p className="text-gray-500">Delta Lucro Liquido</p>
          <p className="font-semibold text-gray-900">{money(comparison.delta.lucroLiquido)}</p>
        </div>
      </div>

      {comparison.highlights.length > 0 && (
        <ul className="text-sm text-gray-700 space-y-1">
          {comparison.highlights.map((item, index) => (
            <li key={index}>- {item}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
