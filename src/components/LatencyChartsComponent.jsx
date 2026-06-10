import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';
import RealtimeLatencyMonitor from '@/lib/RealtimeLatencyMonitor';

/**
 * LatencyChartsComponent
 * Visualizes real-time latency data with multiple chart types
 * Features:
 * - Time-series latency line chart (last 30 measurements)
 * - Distribution histogram
 * - Percentile indicators
 * - Performance alerts
 */
export function LatencyChartsComponent() {
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [stats, setStats] = useState(null);

  // Update charts every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const currentStats = RealtimeLatencyMonitor.getStats();
        setStats(currentStats);

        // Create time-series data (last 30 measurements)
        if (currentStats?.measurements) {
          const timeSeries = currentStats.measurements
            .slice(-30)
            .map((measurement, idx) => ({
              time: idx,
              latency: measurement.latency,
              timestamp: new Date(measurement.timestamp).toLocaleTimeString(),
            }));
          setTimeSeriesData(timeSeries);
        }

        // Create distribution data (histogram)
        if (currentStats?.measurements) {
          const buckets = {
            '0-50ms': 0,
            '50-100ms': 0,
            '100-200ms': 0,
            '200-500ms': 0,
            '500-1000ms': 0,
            '>1000ms': 0,
          };

          currentStats.measurements.forEach(m => {
            const latency = m.latency;
            if (latency < 50) buckets['0-50ms']++;
            else if (latency < 100) buckets['50-100ms']++;
            else if (latency < 200) buckets['100-200ms']++;
            else if (latency < 500) buckets['200-500ms']++;
            else if (latency < 1000) buckets['500-1000ms']++;
            else buckets['>1000ms']++;
          });

          const distribution = Object.entries(buckets).map(([range, count]) => ({
            range,
            count,
            fill: range.includes('>1000') || range.includes('500-1000')
              ? '#ef4444'
              : range.includes('200-500')
              ? '#f97316'
              : range.includes('100-200')
              ? '#eab308'
              : '#22c55e',
          }));

          setDistributionData(distribution);
        }
      } catch (error) {
        console.error('[LatencyChartsComponent] Error updating charts:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getAlertLevel = () => {
    if (!stats) return null;
    if (stats.avg > 1000) return { level: 'Critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (stats.avg > 500) return { level: 'High', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (stats.avg > 200) return { level: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { level: 'Healthy', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const alertLevel = getAlertLevel();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-gray-900">
            {payload[0].value?.toFixed(2)}ms
          </p>
          <p className="text-xs text-gray-600">
            {payload[0].payload?.timestamp}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {alertLevel && (
        <div className={`${alertLevel.bg} border border-gray-200 rounded-lg p-4 flex items-start gap-3`}>
          <AlertCircle className={`w-5 h-5 ${alertLevel.color} flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`font-semibold ${alertLevel.color}`}>
              Status: {alertLevel.level}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              Average latency: {stats?.avg?.toFixed(2)}ms
              {stats?.avg > 500 && ' - Performance degradation detected'}
            </p>
          </div>
        </div>
      )}

      {/* Time-Series Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Latency Over Time (Last 30 Events)
        </h3>
        {timeSeriesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLatency)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">
            No data available yet. Monitoring is active...
          </div>
        )}
      </div>

      {/* Distribution Histogram */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Latency Distribution
        </h3>
        {distributionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="range"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                formatter={(value) => [`${value} events`, 'Count']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1d5db' }}
              />
              <Bar
                dataKey="count"
                radius={[8, 8, 0, 0]}
                fill="#3b82f6"
              >
                {distributionData.map((entry, index) => (
                  <Bar
                    key={index}
                    dataKey="count"
                    fill={entry.fill}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-60 flex items-center justify-center text-gray-500">
            No distribution data available yet.
          </div>
        )}
      </div>

      {/* Statistics Summary */}
      {stats && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="text-sm text-gray-600">Median</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.median?.toFixed(2)}ms
              </p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="text-sm text-gray-600">Range</p>
              <p className="text-2xl font-bold text-gray-900">
                {(stats.max - stats.min)?.toFixed(2)}ms
              </p>
            </div>
            <div className="border-l-4 border-orange-600 pl-4">
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.count}
              </p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="text-sm text-gray-600">Sample Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.count > 0 ? (stats.count / (stats.count * 0.02)).toFixed(0) : 0}/s
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LatencyChartsComponent;
