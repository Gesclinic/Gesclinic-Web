import RealtimeLatencyMonitor from './RealtimeLatencyMonitor';

/**
 * AlertManager
 * Manages automatic alerts for performance degradation, anomalies, etc.
 * Features:
 * - Latency threshold alerts
 * - Anomaly detection
 * - Alert deduplication
 * - Custom alert callbacks
 * - Persistence to localStorage and Supabase
 */
export class AlertManager {
  static alerts = [];
  static callbacks = [];
  static activeMonitoring = false;
  static lastAlertTime = {};
  static alertHistory = [];
  static MAX_ALERTS = 100; // Keep last 100 alerts in memory
  static DEDUP_WINDOW = 5000; // 5 seconds deduplication window

  /**
   * Initialize alert monitoring
   */
  static startMonitoring() {
    if (this.activeMonitoring) return;

    this.activeMonitoring = true;
    this.loadAlertHistory();

    // Check every 5 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 5000);

    console.log('✅ [AlertManager] Monitoring started');
  }

  /**
   * Perform health checks on latency metrics
   */
  static performHealthCheck() {
    const stats = RealtimeLatencyMonitor.getStats();
    if (!stats) return;

    // Check for high latency
    if (stats.avg > 1000) {
      this.createAlert({
        type: 'CRITICAL_LATENCY',
        severity: 'critical',
        message: `Critical latency detected: ${stats.avg.toFixed(2)}ms`,
        details: {
          avg: stats.avg,
          p95: stats.p95,
          p99: stats.p99,
          threshold: 1000,
        },
        timestamp: new Date(),
      });
    } else if (stats.avg > 500) {
      this.createAlert({
        type: 'HIGH_LATENCY',
        severity: 'warning',
        message: `High latency detected: ${stats.avg.toFixed(2)}ms`,
        details: {
          avg: stats.avg,
          p95: stats.p95,
          p99: stats.p99,
          threshold: 500,
        },
        timestamp: new Date(),
      });
    }

    // Check for latency spikes (max > avg * 3)
    if (stats.max > stats.avg * 3) {
      this.createAlert({
        type: 'LATENCY_SPIKE',
        severity: 'warning',
        message: `Latency spike detected: ${stats.max.toFixed(2)}ms`,
        details: {
          max: stats.max,
          avg: stats.avg,
          spike_ratio: (stats.max / stats.avg).toFixed(2),
        },
        timestamp: new Date(),
      });
    }

    // Check for high variance (p99 > p95 * 1.5)
    if (stats.p99 > stats.p95 * 1.5) {
      this.createAlert({
        type: 'HIGH_VARIANCE',
        severity: 'info',
        message: `High latency variance detected`,
        details: {
          p95: stats.p95,
          p99: stats.p99,
          variance_ratio: (stats.p99 / stats.p95).toFixed(2),
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Create an alert with deduplication
   */
  static createAlert(alert) {
    const alertKey = `${alert.type}`;
    const now = Date.now();

    // Deduplication: skip if same alert was created recently
    if (this.lastAlertTime[alertKey]) {
      const timeSinceLastAlert = now - this.lastAlertTime[alertKey];
      if (timeSinceLastAlert < this.DEDUP_WINDOW) {
        return; // Skip duplicate alert
      }
    }

    this.lastAlertTime[alertKey] = now;

    // Add metadata
    const fullAlert = {
      id: this.generateAlertId(),
      ...alert,
      resolved: false,
    };

    // Add to alerts
    this.alerts.push(fullAlert);
    this.alertHistory.push(fullAlert);

    // Keep only last MAX_ALERTS
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.shift();
    }

    console.log(
      `${this.getSeverityEmoji(fullAlert.severity)} [AlertManager] ${fullAlert.message}`
    );

    // Trigger callbacks
    this.triggerCallbacks(fullAlert);

    // Persist to localStorage
    this.persistAlert(fullAlert);
  }

  /**
   * Register callback for alerts
   */
  static onAlert(callback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Trigger all registered callbacks
   */
  static triggerCallbacks(alert) {
    this.callbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('[AlertManager] Callback error:', error);
      }
    });
  }

  /**
   * Get severity emoji
   */
  static getSeverityEmoji(severity) {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '🟡';
      case 'info':
        return '🔵';
      default:
        return '⭕';
    }
  }

  /**
   * Get all alerts
   */
  static getAlerts() {
    return [...this.alerts];
  }

  /**
   * Get alerts by severity
   */
  static getAlertsBySeverity(severity) {
    return this.alerts.filter(a => a.severity === severity);
  }

  /**
   * Resolve an alert
   */
  static resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`✅ [AlertManager] Alert ${alertId} resolved`);
    }
  }

  /**
   * Clear all alerts
   */
  static clearAlerts() {
    this.alerts = [];
    localStorage.removeItem('gesclinic_alerts');
    console.log('🧹 [AlertManager] All alerts cleared');
  }

  /**
   * Persist alert to localStorage
   */
  static persistAlert(alert) {
    try {
      const key = 'gesclinic_alerts';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(alert);

      // Keep only last 50 in localStorage
      if (existing.length > 50) {
        existing.shift();
      }

      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('[AlertManager] Persist error:', error);
    }
  }

  /**
   * Load alert history from localStorage
   */
  static loadAlertHistory() {
    try {
      const key = 'gesclinic_alerts';
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      this.alertHistory = stored;
      console.log(`📋 [AlertManager] Loaded ${stored.length} alerts from history`);
    } catch (error) {
      console.error('[AlertManager] Load error:', error);
    }
  }

  /**
   * Get alert statistics
   */
  static getStatistics() {
    const total = this.alertHistory.length;
    const critical = this.alertHistory.filter(a => a.severity === 'critical').length;
    const warnings = this.alertHistory.filter(a => a.severity === 'warning').length;
    const info = this.alertHistory.filter(a => a.severity === 'info').length;

    return {
      total,
      critical,
      warnings,
      info,
      active: this.alerts.length,
      criticalPercentage: total > 0 ? ((critical / total) * 100).toFixed(1) : 0,
    };
  }

  /**
   * Export alerts to CSV
   */
  static exportToCSV() {
    const headers = ['ID', 'Type', 'Severity', 'Message', 'Timestamp', 'Details'];
    const rows = this.alertHistory.map(alert => [
      alert.id,
      alert.type,
      alert.severity,
      alert.message,
      new Date(alert.timestamp).toLocaleString(),
      JSON.stringify(alert.details),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alerts_${new Date().toISOString()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    console.log('📥 [AlertManager] Alerts exported to CSV');
  }

  /**
   * Generate unique alert ID
   */
  static generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get alert report
   */
  static generateReport() {
    const stats = this.getStatistics();
    const recentAlerts = this.alerts.slice(-10);

    return `
╔════════════════════════════════════════╗
║      ALERT MANAGER REPORT              ║
╠════════════════════════════════════════╣
║ Total Alerts:     ${stats.total.toString().padEnd(20)} ║
║ Critical:         ${stats.critical.toString().padEnd(20)} ║
║ Warnings:         ${stats.warnings.toString().padEnd(20)} ║
║ Info:             ${stats.info.toString().padEnd(20)} ║
║ Active:           ${stats.active.toString().padEnd(20)} ║
╠════════════════════════════════════════╣
║ RECENT ALERTS (Last 10):               ║
╠════════════════════════════════════════╣
${recentAlerts
  .map(
    alert =>
      `║ ${this.getSeverityEmoji(alert.severity)} ${alert.type.padEnd(20)} ${alert.message.substring(0, 40).padEnd(40)} ║`
  )
  .join('\n')}
║                                        ║
╚════════════════════════════════════════╝
    `.trim();
  }
}

export default AlertManager;
