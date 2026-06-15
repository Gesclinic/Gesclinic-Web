/**
 * Profitability Heatmap Component
 * Visualiza margens e lucratividade por centro de custo, período ou departamento
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HeatmapCell {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface ProfitabilityHeatmapProps {
  data: any;
}

const ProfitabilityHeatmap: React.FC<ProfitabilityHeatmapProps> = ({ data }) => {
  const heatmapData = useMemo(() => {
    if (!data?.costCenterBreakdown) return [];

    return data.costCenterBreakdown.map((cc: any) => {
      const margin = cc.revenue > 0 ? ((cc.revenue - cc.costs) / cc.revenue) * 100 : 0;
      return {
        label: cc.name,
        value: margin,
        revenue: cc.revenue,
        costs: cc.costs,
        profit: cc.revenue - cc.costs,
        color: getHeatmapColor(margin)
      };
    });
  }, [data]);

  const getHeatmapColor = (value: number) => {
    if (value >= 40) return 'bg-green-500';
    if (value >= 30) return 'bg-green-400';
    if (value >= 20) return 'bg-yellow-400';
    if (value >= 10) return 'bg-orange-400';
    if (value >= 0) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heatmap de Profitabilidade</CardTitle>
        <p className="text-sm text-gray-500 mt-1">Margem de lucro por centro de custo</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {heatmapData.map((item: any, idx: number) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{item.label}</span>
                <span className={`px-3 py-1 rounded text-white text-sm font-bold ${item.color}`}>
                  {item.value.toFixed(1)}%
                </span>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Receita:</span>
                  <span>R$ {(item.revenue / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between">
                  <span>Custos:</span>
                  <span>R$ {(item.costs / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Lucro:</span>
                  <span className={item.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    R$ {(item.profit / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${item.color}`}
                  style={{ width: `${Math.min(100, Math.max(0, item.value * 2.5))}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-sm font-semibold mb-3">Legenda de Margem</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>≥40%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              <span>30-40%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span>20-30%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-400 rounded"></div>
              <span>10-20%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>&lt;0%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitabilityHeatmap;
