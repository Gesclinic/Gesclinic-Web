/**
 * Trends Chart Component
 * Gráfico de evolução de receitas e resultados nos últimos períodos
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface TrendsChartProps {
  data: any[];
}

const TrendsChart: React.FC<TrendsChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Tendência de Receitas
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">Últimos 6 períodos</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="period" 
              stroke="#9CA3AF"
            />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              formatter={(value: any) => `R$ ${(value / 1000).toFixed(1)}k`}
              labelStyle={{ color: '#000' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#0088FE" 
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Receita Bruta"
            />
            <Line 
              type="monotone" 
              dataKey="netIncome" 
              stroke="#00C49F" 
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Resultado Líquido"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Growth Rate */}
        {data.length > 1 && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Crescimento Receita</p>
              <p className={`text-lg font-bold ${
                ((data[data.length - 1].revenue - data[0].revenue) / data[0].revenue) * 100 > 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {(((data[data.length - 1].revenue - data[0].revenue) / data[0].revenue) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Crescimento Resultado</p>
              <p className={`text-lg font-bold ${
                ((data[data.length - 1].netIncome - data[0].netIncome) / Math.abs(data[0].netIncome)) * 100 > 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {(((data[data.length - 1].netIncome - data[0].netIncome) / Math.abs(data[0].netIncome)) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendsChart;
