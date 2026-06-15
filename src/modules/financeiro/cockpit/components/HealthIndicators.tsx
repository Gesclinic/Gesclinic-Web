/**
 * Health Indicators Component
 * Indicadores KPI principais de saúde financeira
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface HealthIndicatorsProps {
  data: any;
}

const HealthIndicators: React.FC<HealthIndicatorsProps> = ({ data }) => {
  const indicators = [
    {
      label: 'Margem Operacional',
      value: data?.operatingMargin || 0,
      unit: '%',
      target: 25,
      status: (data?.operatingMargin || 0) >= 25 ? 'good' : (data?.operatingMargin || 0) >= 15 ? 'warning' : 'critical',
      icon: data?.operatingMargin >= 25 ? TrendingUp : TrendingDown
    },
    {
      label: 'Liquidez Corrente',
      value: data?.currentRatio || 0,
      unit: 'x',
      target: 1.5,
      status: (data?.currentRatio || 0) >= 1.5 ? 'good' : (data?.currentRatio || 0) >= 1 ? 'warning' : 'critical',
      icon: data?.currentRatio >= 1.5 ? TrendingUp : TrendingDown
    },
    {
      label: 'Dias de Caixa',
      value: data?.cashDaysAvailable || 0,
      unit: 'dias',
      target: 30,
      status: (data?.cashDaysAvailable || 0) >= 30 ? 'good' : (data?.cashDaysAvailable || 0) >= 15 ? 'warning' : 'critical',
      icon: data?.cashDaysAvailable >= 30 ? TrendingUp : AlertTriangle
    },
    {
      label: 'Índice de Inadimplência',
      value: data?.defaultRate || 0,
      unit: '%',
      target: 5,
      status: (data?.defaultRate || 0) <= 5 ? 'good' : (data?.defaultRate || 0) <= 10 ? 'warning' : 'critical',
      icon: (data?.defaultRate || 0) <= 5 ? CheckCircle : AlertTriangle
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-700';
      case 'warning':
        return 'text-yellow-700';
      case 'critical':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle>Indicadores Principais (KPIs)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {indicators.map((indicator, idx) => {
            const Icon = indicator.icon;
            return (
              <div 
                key={idx}
                className={`p-4 rounded-lg border-2 ${getStatusColor(indicator.status)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">{indicator.label}</span>
                  <Icon className={`w-5 h-5 ${getStatusTextColor(indicator.status)}`} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${getStatusTextColor(indicator.status)}`}>
                    {indicator.value.toFixed(1)}
                  </span>
                  <span className={`text-sm font-semibold ${getStatusTextColor(indicator.status)}`}>
                    {indicator.unit}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                  <p className="text-xs text-gray-500">
                    Meta: {indicator.target}{indicator.unit}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Health Status */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Status Geral de Saúde</span>
            <div className="flex items-center gap-2">
              {data?.status === 'healthy' && (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-bold text-green-600">Excelente</span>
                </>
              )}
              {data?.status === 'warning' && (
                <>
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  <span className="font-bold text-yellow-600">Atenção</span>
                </>
              )}
              {data?.status === 'critical' && (
                <>
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <span className="font-bold text-red-600">Crítica</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthIndicators;
