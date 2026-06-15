/**
 * Aging Analysis Component
 * Análise visual de recebimentos atrasados/pendentes
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface AgingAnalysisProps {
  data: any;
}

const AgingAnalysis: React.FC<AgingAnalysisProps> = ({ data }) => {
  const agingBuckets = useMemo(() => {
    if (!data?.byDaysOverdue) return [];

    return [
      { label: 'Atual', days: '0-30', value: data.byDaysOverdue.current || 0, color: 'bg-green-100 text-green-900' },
      { label: '31-60 dias', days: '31-60', value: data.byDaysOverdue.days31to60 || 0, color: 'bg-yellow-100 text-yellow-900' },
      { label: '61-90 dias', days: '61-90', value: data.byDaysOverdue.days61to90 || 0, color: 'bg-orange-100 text-orange-900' },
      { label: '90+ dias', days: '90+', value: data.byDaysOverdue.over90 || 0, color: 'bg-red-100 text-red-900' }
    ];
  }, [data]);

  const totalValue = agingBuckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const overdueValue = agingBuckets
    .filter((_, idx) => idx > 0)
    .reduce((sum, bucket) => sum + bucket.value, 0);
  const overduePct = totalValue > 0 ? (overdueValue / totalValue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Análise de Atrasos
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">Contas a receber por vencimento</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Alert */}
        {overduePct > 20 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {overduePct.toFixed(0)}% dos recebimentos estão atrasados!
            </AlertDescription>
          </Alert>
        )}

        {/* Aging Buckets */}
        <div className="space-y-3">
          {agingBuckets.map((bucket, idx) => (
            <div key={idx}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{bucket.label}</span>
                <span className="text-sm font-semibold">
                  R$ {(bucket.value / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                <div
                  className={`h-2 ${bucket.color.split(' ')[0]} transition-all`}
                  style={{ width: `${totalValue > 0 ? (bucket.value / totalValue) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500">
                {totalValue > 0 ? ((bucket.value / totalValue) * 100).toFixed(1) : 0}%
              </span>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total a Receber:</span>
            <span className="font-semibold">R$ {(totalValue / 1000).toFixed(1)}k</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Atrasado:</span>
            <span className="font-semibold">R$ {(overdueValue / 1000).toFixed(1)}k</span>
          </div>
          <div className="flex justify-between">
            <span>Atraso %:</span>
            <span className="font-semibold">{overduePct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Days Overdue */}
        {data?.avgDaysOverdue && (
          <div className="mt-3 p-3 bg-blue-50 rounded">
            <p className="text-sm text-gray-600">Média de atraso:</p>
            <p className="text-lg font-bold text-blue-600">
              {data.avgDaysOverdue.toFixed(0)} dias
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgingAnalysis;
