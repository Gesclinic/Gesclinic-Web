import { supabase } from './customSupabaseClient';

/**
 * MetricsTrendsManager
 * Manages historical metrics trends and analysis
 */
export class MetricsTrendsManager {
  /**
   * Record a metric
   */
  static async recordMetric(clinicId, metricType, metricName, value, tags = {}) {
    try {
      const { data, error } = await supabase
        .from('metrics_trends')
        .insert({
          clinic_id: clinicId,
          metric_type: metricType,
          metric_name: metricName,
          metric_value: value,
          tags,
          recorded_at: new Date(),
        });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('[MetricsTrendsManager] Record error:', error);
      throw error;
    }
  }

  /**
   * Get aggregated metrics for a time period
   */
  static async getAggregatedMetrics(clinicId, interval = '1 hour') {
    try {
      const { data, error } = await supabase.rpc('aggregate_metrics_trends', {
        p_clinic_id: clinicId,
        p_interval: interval,
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[MetricsTrendsManager] Aggregation error:', error);
      return [];
    }
  }

  /**
   * Analyze trends (increasing/decreasing/stable)
   */
  static async analyzeTrends(clinicId, metricType, days = 7) {
    try {
      const { data, error } = await supabase.rpc('analyze_metric_trends', {
        p_clinic_id: clinicId,
        p_metric_type: metricType,
        p_days: days,
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[MetricsTrendsManager] Analysis error:', error);
      return [];
    }
  }

  /**
   * Calculate SLA compliance percentiles
   */
  static async getSLACompliance(clinicId, metricType, hours = 24) {
    try {
      const { data, error } = await supabase.rpc(
        'calculate_metric_percentiles',
        {
          p_clinic_id: clinicId,
          p_metric_type: metricType,
          p_hours: hours,
        }
      );

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[MetricsTrendsManager] SLA error:', error);
      return [];
    }
  }

  /**
   * Get metrics for date range
   */
  static async getMetricsByDateRange(
    clinicId,
    metricType,
    startDate,
    endDate
  ) {
    try {
      const { data, error } = await supabase
        .from('metrics_trends')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('metric_type', metricType)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[MetricsTrendsManager] Date range error:', error);
      return [];
    }
  }

  /**
   * Get daily summary
   */
  static async getDailySummary(clinicId, metricType, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('metrics_trends')
        .select('recorded_at, metric_value')
        .eq('clinic_id', clinicId)
        .eq('metric_type', metricType)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      // Group by day
      const daily = {};
      data.forEach(metric => {
        const date = new Date(metric.recorded_at).toDateString();
        if (!daily[date]) {
          daily[date] = [];
        }
        daily[date].push(metric.metric_value);
      });

      // Calculate statistics
      const summary = Object.entries(daily).map(([date, values]) => ({
        date,
        avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        min: Math.min(...values).toFixed(2),
        max: Math.max(...values).toFixed(2),
        count: values.length,
      }));

      return summary;
    } catch (error) {
      console.error('[MetricsTrendsManager] Daily summary error:', error);
      return [];
    }
  }

  /**
   * Export metrics report
   */
  static async generateMetricsReport(clinicId, metricType, days = 7) {
    try {
      const trends = await this.analyzeTrends(clinicId, metricType, days);
      const sla = await this.getSLACompliance(clinicId, metricType, days * 24);
      const summary = await this.getDailySummary(clinicId, metricType, days);

      return {
        clinicId,
        metricType,
        period: `Last ${days} days`,
        generatedAt: new Date(),
        trends,
        sla_compliance: sla,
        daily_summary: summary,
      };
    } catch (error) {
      console.error('[MetricsTrendsManager] Report generation error:', error);
      return null;
    }
  }

  /**
   * Export report to JSON
   */
  static async exportReport(clinicId, metricType, days = 7) {
    try {
      const report = await this.generateMetricsReport(clinicId, metricType, days);

      const dataStr = JSON.stringify(report, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `metrics_report_${metricType}_${days}d_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      console.log('📥 [MetricsTrendsManager] Report exported');
    } catch (error) {
      console.error('[MetricsTrendsManager] Export error:', error);
    }
  }

  /**
   * Check SLA compliance
   */
  static async checkSLACompliance(clinicId, metricType, threshold = 500) {
    try {
      const metrics = await this.getMetricsByDateRange(
        clinicId,
        metricType,
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date()
      );

      const total = metrics.length;
      const compliant = metrics.filter(m => m.metric_value <= threshold).length;
      const percentage = (compliant / total) * 100;

      return {
        threshold,
        total_measurements: total,
        compliant: compliant,
        noncompliant: total - compliant,
        sla_percentage: percentage.toFixed(2),
        is_compliant: percentage >= 95,
      };
    } catch (error) {
      console.error('[MetricsTrendsManager] SLA compliance check error:', error);
      return null;
    }
  }
}

export default MetricsTrendsManager;
