/**
 * RealtimeLatencyMonitor - Measures Realtime event latency
 * Tracks time between database change and Realtime notification arrival
 */
export class RealtimeLatencyMonitor {
  static measurements = [];
  static enabled = true;

  static recordMeasurement({ table = 'client', eventType = 'sample', latency, recordId = 'manual' }) {
    if (!this.enabled) return null;

    const numericLatency = Number(latency);
    if (!Number.isFinite(numericLatency)) {
      return null;
    }

    const measurement = {
      timestamp: new Date().toISOString(),
      table,
      eventType,
      latency: numericLatency,
      recordId,
    };

    this.measurements.push(measurement);

    if (this.measurements.length > 100) {
      this.measurements = this.measurements.slice(-100);
    }

    return measurement;
  }

  /**
   * Initialize monitoring on a subscription
   * @param {RealtimeChannel} channel - Supabase Realtime channel
   * @param {string} tableName - Name of table being monitored
   */
  static initMonitoring(channel, tableName) {
    if (!this.enabled) return;

    const startTime = performance.now();

    channel.on('*', (payload) => {
      const endTime = performance.now();
      const latency = endTime - startTime;

      this.recordMeasurement({
        table: tableName,
        eventType: payload.eventType,
        latency,
        recordId: payload.new?.id || payload.old?.id || 'unknown',
      });

      // Console logging with emoji
      if (latency > 1000) {
        console.warn(`⚠️ [Realtime] High latency on ${tableName}: ${latency.toFixed(2)}ms`);
      } else if (latency > 500) {
        console.log(`🟡 [Realtime] Moderate latency on ${tableName}: ${latency.toFixed(2)}ms`);
      } else {
        console.log(`✅ [Realtime] Fast latency on ${tableName}: ${latency.toFixed(2)}ms`);
      }

    });
  }

  /**
   * Get latency statistics
   * @returns {object} Stats object with min, max, avg, p95, p99
   */
  static getStats() {
    if (this.measurements.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        p95: 0,
        p99: 0,
        measurements: [],
      };
    }

    const latencies = this.measurements.map(m => m.latency).sort((a, b) => a - b);
    const count = latencies.length;

    return {
      count: count,
      min: latencies[0],
      max: latencies[count - 1],
      avg: latencies.reduce((a, b) => a + b, 0) / count,
      median: latencies[Math.floor(count / 2)],
      p95: latencies[Math.floor(count * 0.95)],
      p99: latencies[Math.floor(count * 0.99)],
      measurements: this.measurements
    };
  }

  /**
   * Insert test record to measure latency
   * @param {SupabaseClient} supabase - Supabase client
   * @param {string} tableName - Table to test
   * @param {object} testData - Data to insert
   */
  static async insertTestRecord(supabase, tableName, testData) {
    console.log(`📊 [Realtime] Inserting test record to ${tableName}...`);
    const testStartTime = performance.now();

    try {
      const { error } = await supabase.from(tableName).insert([testData]);
      const testEndTime = performance.now();
      const insertTime = testEndTime - testStartTime;

      if (error) {
        console.error(`❌ [Realtime] Insert failed:`, error);
        return { success: false, error };
      }

      console.log(`✅ [Realtime] Insert completed in ${insertTime.toFixed(2)}ms`);

      // Wait for Realtime notification
      await new Promise(resolve => setTimeout(resolve, 2000));

      return { success: true, insertTime };
    } catch (err) {
      console.error(`❌ [Realtime] Test error:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generate performance report
   */
  static generateReport() {
    const stats = this.getStats();

    if (!stats.count) {
      return `
📊 REALTIME LATENCY REPORT
==========================
Generated: ${new Date().toISOString()}

No measurements available yet.
      `;
    }

    return `
📊 REALTIME LATENCY REPORT
==========================
Generated: ${new Date().toISOString()}

STATISTICS:
- Count: ${stats.count} events
- Min: ${stats.min.toFixed(2)}ms
- Max: ${stats.max.toFixed(2)}ms
- Avg: ${stats.avg}ms
- Median: ${stats.median.toFixed(2)}ms
- P95: ${stats.p95.toFixed(2)}ms (95th percentile)
- P99: ${stats.p99.toFixed(2)}ms (99th percentile)

HEALTH:
${stats.avg > 1000 ? '🔴 POOR - High average latency' :
  stats.avg > 500 ? '🟡 FAIR - Moderate latency' :
  '✅ GOOD - Low latency'}

ANALYSIS:
- Events analyzed: ${stats.count}
- Time window: ${this.measurements[0]?.timestamp} to ${this.measurements[stats.count-1]?.timestamp}
- Critical threshold: > 1000ms
- Warning threshold: > 500ms
    `;
  }

  /**
   * Reset measurements
   */
  static reset() {
    this.measurements = [];
    console.log('🔄 [Realtime] Measurements reset');
  }

  /**
   * Disable monitoring
   */
  static disable() {
    this.enabled = false;
    console.log('⛔ [Realtime] Monitoring disabled');
  }

  /**
   * Enable monitoring
   */
  static enable() {
    this.enabled = true;
    console.log('✅ [Realtime] Monitoring enabled');
  }
}

export default RealtimeLatencyMonitor;
