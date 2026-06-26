import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DRELineItem, DrillDownCriteria } from '@/lib/dreEnterpriseEngine';

type Props = {
  lines: DRELineItem[];
  loading?: boolean;
  onDrillDown?: (by: DrillDownCriteria) => void;
  projectedScenarioLabel?: string;
};

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const levelPadding = (level: number) => {
  if (level <= 1) return 'pl-1';
  if (level === 2) return 'pl-6';
  if (level === 3) return 'pl-10';
  if (level === 4) return 'pl-14';
  return 'pl-16';
};

const getDrillAction = (line: DRELineItem): DrillDownCriteria | null => {
  if (line.id === 'receita_bruta') return 'convenio';
  if (line.id.startsWith('receita_')) return 'guia';
  if (line.id.startsWith('deducao_')) return 'paciente';
  return null;
};

export default function DRETable({ lines, loading = false, onDrillDown, projectedScenarioLabel }: Props) {
  const title = projectedScenarioLabel
    ? `Demonstracao de Resultado (Enterprise) - Projetada (${projectedScenarioLabel})`
    : 'Demonstracao de Resultado (Enterprise)';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-8 text-center">Carregando DRE...</div>
      ) : lines.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">Nenhuma linha de DRE para o periodo selecionado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Conta</th>
                <th className="text-right py-2">Valor</th>
                <th className="text-right py-2">% Receita</th>
                <th className="text-right py-2">Acao</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const drillAction = getDrillAction(line);
                return (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className={`py-2 ${levelPadding(line.level)} ${line.level === 1 ? 'font-semibold' : 'text-gray-700'}`}>
                      {line.name}
                    </td>
                    <td className="py-2 text-right font-medium">{formatMoney(line.value || 0)}</td>
                    <td className="py-2 text-right text-gray-600">
                      {line.percentOfRevenue !== undefined ? `${line.percentOfRevenue.toFixed(2)}%` : '-'}
                    </td>
                    <td className="py-2 text-right">
                      {line.drillAvailable && drillAction && onDrillDown ? (
                        <Button size="sm" variant="outline" onClick={() => onDrillDown(drillAction)}>
                          Drill-down
                        </Button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
