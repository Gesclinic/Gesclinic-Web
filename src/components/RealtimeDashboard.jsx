import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import RealtimeLatencyMonitor from '@/lib/RealtimeLatencyMonitor';

/**
 * RealtimeDashboard Component
 * Displays real-time latency metrics and statistics
 * Features:
 * - Live statistics (min, max, avg, p95, p99)
 * - Auto-refresh every 2 seconds
 * - Color-coded performance indicators
 * - High latency alerts
 * - Measurement count display
 */
export function RealtimeDashboard({ refreshInterval = 2000 }) {
  const [stats, setStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [highLatencyAlert, setHighLatencyAlert] = useState(false);

  // Auto-refresh statistics
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const currentStats = RealtimeLatencyMonitor.getStats();
        setStats(currentStats);
        setLastUpdate(new Date());

        // Check for high latency (> 500ms)
        if (currentStats?.avg > 500) {
          setHighLatencyAlert(true);
          setTimeout(() => setHighLatencyAlert(false), 3000);
        }
      } catch (error) {
        console.error('[RealtimeDashboard] Error fetching stats:', error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    const currentStats = RealtimeLatencyMonitor.getStats();
    setStats(currentStats);
    setLastUpdate(new Date());
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const getPerformanceColor = (value) => {
    if (value < 100) return 'text-green-600';
    if (value < 500) return 'text-yellow-600';
    if (value < 1000) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceBg = (value) => {
    if (value < 100) return 'bg-green-50';
    if (value < 500) return 'bg-yellow-50';
    if (value < 1000) return 'bg-orange-50';
    return 'bg-red-50';
  };

  const getPerformanceBorder = (value) => {
    if (value < 100) return 'border-green-200';
    if (value < 500) return 'border-yellow-200';
    if (value < 1000) return 'border-orange-200';
    return 'border-red-200';
  };

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Realtime Metrics Monitor
        </h2>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* High Latency Alert */}
      {highLatencyAlert && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">High Latency Alert</p>
            <p className="text-sm text-red-700">
              Average latency exceeds 500ms. Investigate potential issues.
            </p>
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Measurement Count */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
            Measurements
          </p>
          <p className="text-2xl font-bold text-blue-900">{stats.count || 0}</p>
          <p className="text-xs text-blue-600 mt-1">total events</p>
        </div>

        {/* Min Latency */}
        <div className={`${getPerformanceBg(stats.min)} border ${getPerformanceBorder(stats.min)} rounded-lg p-4`}>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Min
          </p>
          <p className={`text-2xl font-bold ${getPerformanceColor(stats.min)}`}>
            {stats.min?.toFixed(2) || '0'}ms
          </p>
          <p className="text-xs text-gray-500 mt-1">best case</p>
        </div>

        {/* Max Latency */}
        <div className={`${getPerformanceBg(stats.max)} border ${getPerformanceBorder(stats.max)} rounded-lg p-4`}>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Max
          </p>
          <p className={`text-2xl font-bold ${getPerformanceColor(stats.max)}`}>
            {stats.max?.toFixed(2) || '0'}ms
          </p>
          <p className="text-xs text-gray-500 mt-1">worst case</p>
        </div>

        {/* Average Latency */}
        <div className={`${getPerformanceBg(stats.avg)} border ${getPerformanceBorder(stats.avg)} rounded-lg p-4`}>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Average
          </p>
          <p className={`text-2xl font-bold ${getPerformanceColor(stats.avg)}`}>
            {stats.avg?.toFixed(2) || '0'}ms
          </p>
          <p className="text-xs text-gray-500 mt-1">mean latency</p>
        </div>

        {/* P95 Latency */}
        <div className={`${getPerformanceBg(stats.p95)} border ${getPerformanceBorder(stats.p95)} rounded-lg p-4`}>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            P95
          </p>
          <p className={`text-2xl font-bold ${getPerformanceColor(stats.p95)}`}>
            {stats.p95?.toFixed(2) || '0'}ms
          </p>
          <p className="text-xs text-gray-500 mt-1">95th percentile</p>
        </div>

        {/* P99 Latency */}
        <div className={`${getPerformanceBg(stats.p99)} border ${getPerformanceBorder(stats.p99)} rounded-lg p-4`}>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            P99
          </p>
          <p className={`text-2xl font-bold ${getPerformanceColor(stats.p99)}`}>
            {stats.p99?.toFixed(2) || '0'}ms
          </p>
          <p className="text-xs text-gray-500 mt-1">99th percentile</p>
        </div>
      </div>

      {/* Performance Thresholds Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Performance Thresholds</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span className="text-gray-700">&lt; 100ms - Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
            <span className="text-gray-700">100-500ms - Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-600"></div>
            <span className="text-gray-700">500-1000ms - Poor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-gray-700">&gt; 1000ms - Critical</span>
          </div>
        </div>
      </div>

      {/* Last Update */}
      <div className="text-xs text-gray-500 text-right">
        Last update: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
}

export default RealtimeDashboard;
