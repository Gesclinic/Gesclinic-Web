/**
 * Forecast Chart Component
 * Projeção de fluxo de caixa para os próximos 90 dias
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ForecastChartProps {
  data: any[];
}

const ForecastChart: React.FC<ForecastChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Projeção de Fluxo de Caixa
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">Próximos 90 dias</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0088FE" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorBest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C49F" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
            />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              formatter={(value: any) => `R$ ${(value / 1000).toFixed(1)}k`}
              labelStyle={{ color: '#000' }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="expectedBalance" 
              stroke="#0088FE" 
              fillOpacity={1} 
              fill="url(#colorExpected)"
              name="Saldo Esperado"
            />
            <Area 
              type="monotone" 
              dataKey="bestCaseBalance" 
              stroke="#00C49F" 
              fillOpacity={1} 
              fill="url(#colorBest)"
              name="Cenário Otimista"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Forecast Summary */}
        {data.length > 0 && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Saldo Hoje</p>
              <p className="text-lg font-bold text-blue-600">
                R$ {(data[0]?.expectedBalance / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Saldo em 30 dias</p>
              <p className={`text-lg font-bold ${
                data[Math.min(30, data.length - 1)]?.expectedBalance > 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                R$ {(data[Math.min(30, data.length - 1)]?.expectedBalance / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Saldo em 90 dias</p>
              <p className={`text-lg font-bold ${
                data[data.length - 1]?.expectedBalance > 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                R$ {(data[data.length - 1]?.expectedBalance / 1000).toFixed(1)}k
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ForecastChart;
