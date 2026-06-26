import React from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis, Tooltip } from 'recharts';
import type { BenchmarkMetrics } from '@/lib/dreEnterpriseEngine';

type Props = {
  benchmarks: BenchmarkMetrics[] | null;
  loading?: boolean;
  projectedScenarioLabel?: string;
  projectedHorizonDays?: number;
};

export default function DREBenchmark({ benchmarks, loading = false, projectedScenarioLabel, projectedHorizonDays }: Props) {
  const title = projectedScenarioLabel
    ? `Benchmark Hospitalar - Projetada (${projectedScenarioLabel}${projectedHorizonDays ? ` • ${projectedHorizonDays} dias` : ''})`
    : 'Benchmark Hospitalar';

  if (loading) {
    return <Card className="p-4 animate-pulse h-80 bg-gray-100" />;
  }

  if (!benchmarks || benchmarks.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500">Carregue benchmark para comparar com a media do setor.</p>
      </Card>
    );
  }

  const data = benchmarks.map((item) => ({
    metric: item.metric.replace('Percent', '').replace('margem', 'Margem ').replace('lucro', 'Lucro '),
    Clinica: Number(item.clinic || 0),
    Setor: Number(item.industryAvg || 0),
  }));

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4 text-sm">
        {benchmarks.map((item) => (
          <div key={item.metric} className="rounded border bg-gray-50 p-3">
            <p className="text-gray-500">{item.metric.replace('Percent', '').replace('margem', 'Margem ').replace('lucro', 'Lucro ')}</p>
            <p className="font-semibold text-gray-900">
              Clinica {Number(item.clinic || 0).toFixed(1)}% vs setor {Number(item.industryAvg || 0).toFixed(1)}%
            </p>
            <p className={item.trend === 'above' ? 'text-emerald-700' : item.trend === 'below' ? 'text-amber-700' : 'text-slate-600'}>
              {item.trend === 'above' ? 'Acima do benchmark' : item.trend === 'below' ? 'Abaixo do benchmark' : 'Em linha com o benchmark'}
            </p>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <PolarRadiusAxis />
          <Radar name="Clinica" dataKey="Clinica" stroke="#2563EB" fill="#2563EB" fillOpacity={0.35} />
          <Radar name="Setor" dataKey="Setor" stroke="#9333EA" fill="#9333EA" fillOpacity={0.2} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}
