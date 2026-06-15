import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  format,
  parseISO,
  subDays,
  startOfDay,
  eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * F.3: Tendências de Mudanças
 * Visualiza tendências com moving averages
 * Identifica padrões, sazonalidade, anomalias
 */
export default function AuditTrendsPanel() {
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trendsData, setTrendsData] = useState([]);
  const [period, setPeriod] = useState(90); // dias
  const [movingAverage, setMovingAverage] = useState(7); // dias para MA
  const [stats, setStats] = useState({
    totalChanges: 0,
    avgPerDay: 0,
    trend: 'neutral',
    variance: 0,
  });

  useEffect(() => {
    loadTrendsData();
  }, [clinicId, period, movingAverage]);

  const loadTrendsData = async () => {
    if (!clinicId) return;

    try {
      setLoading(true);

      const startDate = subDays(new Date(), period);
      const { data: logs, error } = await supabase
        .from('fee_audit_log')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('changed_at', startDate.toISOString())
        .order('changed_at', { ascending: true });

      if (error) throw error;

      // Agrupar por dia
      const byDay = {};
      logs.forEach((log) => {
        const day = format(parseISO(log.changed_at), 'yyyy-MM-dd');
        byDay[day] = (byDay[day] || 0) + 1;
      });

      // Criar array de todos os dias
      const allDays = eachDayOfInterval({
        start: startDate,
        end: new Date(),
      });

      const dataWithMA = allDays.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = byDay[dayStr] || 0;

        return {
          date: dayStr,
          displayDate: format(day, 'dd/MM', { locale: ptBR }),
          count,
          day: day.getTime(),
        };
      });

      // Calcular moving averages
      const withMovingAverages = dataWithMA.map((item, idx) => {
        const start = Math.max(0, idx - movingAverage + 1);
        const subset = dataWithMA.slice(start, idx + 1);
        const ma = subset.reduce((sum, d) => sum + d.count, 0) / subset.length;

        return {
          ...item,
          [`ma${movingAverage}`]: parseFloat(ma.toFixed(2)),
        };
      });

      setTrendsData(withMovingAverages);

      // Calcular estatísticas
      calculateStats(logs, withMovingAverages);
    } catch (err) {
      console.error('Erro ao carregar tendências:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs, trends) => {
    const total = logs.length;
    const avgPerDay = (total / trends.length).toFixed(2);

    // Trend: comparar primeira metade com segunda metade
    const mid = Math.floor(trends.length / 2);
    const firstHalf = trends
      .slice(0, mid)
      .reduce((sum, d) => sum + d.count, 0);
    const secondHalf = trends
      .slice(mid)
      .reduce((sum, d) => sum + d.count, 0);

    let trend = 'neutral';
    const diff = secondHalf - firstHalf;
    const percentChange = (diff / (firstHalf || 1)) * 100;

    if (percentChange > 10) trend = 'upward';
    else if (percentChange < -10) trend = 'downward';

    // Variance
    const mean = total / trends.length;
    const variance =
      trends.reduce((sum, d) => sum + Math.pow(d.count - mean, 2), 0) /
      trends.length;

    setStats({
      totalChanges: total,
      avgPerDay: parseFloat(avgPerDay),
      trend,
      variance: parseFloat(Math.sqrt(variance).toFixed(2)),
      percentChange: parseFloat(percentChange.toFixed(1)),
    });
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando tendências...</div>
        </div>
      </div>
    );
  }

  const getTrendIcon = () => {
    if (stats.trend === 'upward')
      return '📈 Ascendente';
    if (stats.trend === 'downward')
      return '📉 Descendente';
    return '➡️ Estável';
  };

  const getTrendColor = () => {
    if (stats.trend === 'upward')
      return 'bg-red-50 border-red-200';
    if (stats.trend === 'downward')
      return 'bg-green-50 border-green-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Tendências de Mudanças
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Média Móvel: {movingAverage} dias
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex gap-2">
            <span className="text-sm text-gray-600">Período:</span>
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  period === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <span className="text-sm text-gray-600">MA:</span>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setMovingAverage(days)}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  movingAverage === days
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {days}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <p className="text-xs font-medium text-blue-600 uppercase">
            Total
          </p>
          <p className="text-3xl font-bold text-blue-900 mt-1">
            {stats.totalChanges}
          </p>
          <p className="text-xs text-blue-700 mt-2">mudanças registradas</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <p className="text-xs font-medium text-green-600 uppercase">
            Média/Dia
          </p>
          <p className="text-3xl font-bold text-green-900 mt-1">
            {stats.avgPerDay}
          </p>
          <p className="text-xs text-green-700 mt-2">mudanças por dia</p>
        </div>

        <div className={`p-4 rounded-lg border ${getTrendColor()}`}>
          <p className="text-xs font-medium text-gray-600 uppercase">
            Tendência
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {getTrendIcon()}
          </p>
          <p className="text-xs text-gray-700 mt-2">
            {stats.percentChange > 0 ? '+' : ''}{stats.percentChange}%
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <p className="text-xs font-medium text-purple-600 uppercase">
            Variância
          </p>
          <p className="text-3xl font-bold text-purple-900 mt-1">
            {stats.variance}
          </p>
          <p className="text-xs text-purple-700 mt-2">desvio padrão</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">
          Gráfico de Mudanças + Moving Average
        </h4>
        {trendsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={trendsData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="displayDate"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tick={{ angle: -45, textAnchor: 'end', height: 70 }}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                formatter={(value) => (typeof value === 'number' ? value.toFixed(2) : value)}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                }}
              />
              <Legend />

              {/* Linha de dados reais */}
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ef4444"
                strokeWidth={1}
                dot={false}
                name="Mudanças (Diárias)"
                isAnimationActive={true}
              />

              {/* Linha de moving average */}
              <Line
                type="monotone"
                dataKey={`ma${movingAverage}`}
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                name={`Média Móvel (${movingAverage}d)`}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Sem dados para o período
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Insights</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            • <span className="font-medium">Tendência:</span> {getTrendIcon()} ({stats.percentChange > 0 ? 'crescimento' : stats.percentChange < 0 ? 'redução' : 'estabilidade'})
          </li>
          <li>
            • <span className="font-medium">Variabilidade:</span> {stats.variance > 5 ? 'Alta' : stats.variance > 2 ? 'Média' : 'Baixa'} (σ={stats.variance})
          </li>
          <li>
            • <span className="font-medium">Consistência:</span> Média de {stats.avgPerDay} mudanças/dia
          </li>
          <li>
            • <span className="font-medium">Período:</span> {trendsData.length} dias analisados
          </li>
        </ul>
      </div>
    </div>
  );
}
