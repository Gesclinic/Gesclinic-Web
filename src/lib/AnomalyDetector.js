import { supabase } from './customSupabaseClient';

/**
 * AnomalyDetector
 * Detects suspicious patterns in DELETE operations
 * 
 * Anomalies detected:
 * - Bulk deletion spike (unusual volume)
 * - Deletion at unusual hours
 * - Deletion by unusual user
 * - Rapid repeated deletions (might be loop/bug)
 * - Deletion of critical data types
 * - Deletion outside normal clinic hours
 */
export class AnomalyDetector {
  static anomalies = [];
  static baselineStats = null;
  static activeMonitoring = false;
  static readonly MAX_ANOMALIES = 100;

  /**
   * Initialize anomaly detection
   */
  static async startMonitoring(clinicId) {
    if (this.activeMonitoring) return;

    this.activeMonitoring = true;
    this.clinicId = clinicId;

    // Calculate baseline stats
    await this.calculateBaseline(clinicId);

    // Monitor every minute
    setInterval(() => {
      this.checkForAnomalies(clinicId);
    }, 60000);

    console.log('✅ [AnomalyDetector] Monitoring started');
  }

  /**
   * Calculate baseline statistics for normal behavior
   */
  static async calculateBaseline(clinicId) {
    try {
      // Get last 7 days of delete logs
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: deleteLogs, error } = await supabase
        .from('audit_delete_log')
        .select('deleted_at, deleted_by, table_name')
        .eq('clinic_id', clinicId)
        .gte('deleted_at', sevenDaysAgo.toISOString())
        .order('deleted_at', { ascending: true });

      if (error) throw error;

      if (!deleteLogs || deleteLogs.length === 0) {
        this.baselineStats = {
          avg_daily_deletes: 0,
          max_daily_deletes: 0,
          common_hours: [9, 10, 11, 14, 15, 16], // Business hours
          common_users: [],
        };
        return;
      }

      // Calculate statistics
      const dailyDeletes = {};
      const userDeletes = {};
      const hourDeletes = {};

      deleteLogs.forEach(log => {
        const date = new Date(log.deleted_at).toDateString();
        const hour = new Date(log.deleted_at).getHours();
        const user = log.deleted_by;

        dailyDeletes[date] = (dailyDeletes[date] || 0) + 1;
        userDeletes[user] = (userDeletes[user] || 0) + 1;
        hourDeletes[hour] = (hourDeletes[hour] || 0) + 1;
      });

      const dailyValues = Object.values(dailyDeletes);
      const avgDaily = dailyValues.length > 0 
        ? dailyValues.reduce((a, b) => a + b) / dailyValues.length 
        : 0;

      // Get most common hours
      const sortedHours = Object.entries(hourDeletes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([hour]) => parseInt(hour));

      // Get most active users
      const commonUsers = Object.entries(userDeletes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([user]) => user);

      this.baselineStats = {
        avg_daily_deletes: Math.ceil(avgDaily),
        max_daily_deletes: Math.max(...dailyValues),
        common_hours: sortedHours.length > 0 ? sortedHours : [9, 10, 11, 14, 15, 16],
        common_users: commonUsers,
        sample_size: deleteLogs.length,
      };

      console.log('📊 [AnomalyDetector] Baseline calculated:', this.baselineStats);
    } catch (error) {
      console.error('[AnomalyDetector] Baseline calculation error:', error);
    }
  }

  /**
   * Check for anomalies in recent deletions
   */
  static async checkForAnomalies(clinicId) {
    try {
      // Get last hour of deletes
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: recentDeletes, error } = await supabase
        .from('audit_delete_log')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('deleted_at', oneHourAgo.toISOString())
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      if (!recentDeletes || recentDeletes.length === 0) return;

      // Analyze for anomalies
      await this.analyzeDeletePattern(recentDeletes, clinicId);
    } catch (error) {
      console.error('[AnomalyDetector] Check error:', error);
    }
  }

  /**
   * Analyze delete patterns for anomalies
   */
  static async analyzeDeletePattern(deletes, clinicId) {
    // Get deletes from today vs baseline
    const today = new Date().toDateString();
    const deletesToday = deletes.filter(
      d => new Date(d.deleted_at).toDateString() === today
    );

    // Anomaly 1: Bulk deletion spike
    if (
      this.baselineStats &&
      deletesToday.length > this.baselineStats.avg_daily_deletes * 3
    ) {
      this.createAnomaly({
        type: 'BULK_DELETION_SPIKE',
        severity: 'critical',
        message: `Bulk deletion spike detected: ${deletesToday.length} deletes (baseline: ${this.baselineStats.avg_daily_deletes})`,
        details: {
          count: deletesToday.length,
          baseline: this.baselineStats.avg_daily_deletes,
          deviation: ((deletesToday.length / this.baselineStats.avg_daily_deletes) * 100 - 100).toFixed(1),
        },
      });
    }

    // Anomaly 2: Deletion at unusual hour
    const currentHour = new Date().getHours();
    if (
      this.baselineStats &&
      !this.baselineStats.common_hours.includes(currentHour) &&
      deletesToday.length > 0
    ) {
      this.createAnomaly({
        type: 'UNUSUAL_HOUR_DELETION',
        severity: 'warning',
        message: `Deletion at unusual hour: ${currentHour}:00 (common hours: ${this.baselineStats.common_hours.join(', ')})`,
        details: {
          current_hour: currentHour,
          common_hours: this.baselineStats.common_hours,
          delete_count: deletesToday.length,
        },
      });
    }

    // Anomaly 3: Rapid repeated deletions (potential loop/bug)
    const deletesInLast5Min = deletes.filter(d => {
      const time = new Date(d.deleted_at).getTime();
      const now = new Date().getTime();
      return now - time < 5 * 60 * 1000; // Last 5 minutes
    });

    if (deletesInLast5Min.length > 10) {
      this.createAnomaly({
        type: 'RAPID_DELETION_SEQUENCE',
        severity: 'critical',
        message: `Rapid deletion sequence detected: ${deletesInLast5Min.length} deletes in 5 minutes`,
        details: {
          count: deletesInLast5Min.length,
          timeframe: '5 minutes',
          unique_tables: new Set(deletesInLast5Min.map(d => d.table_name)).size,
        },
      });
    }

    // Anomaly 4: Deletion by unusual user
    const userDeleteCounts = {};
    deletesToday.forEach(d => {
      userDeleteCounts[d.deleted_by] = (userDeleteCounts[d.deleted_by] || 0) + 1;
    });

    for (const [user, count] of Object.entries(userDeleteCounts)) {
      if (
        this.baselineStats &&
        !this.baselineStats.common_users.includes(user) &&
        count > 5
      ) {
        this.createAnomaly({
          type: 'UNUSUAL_USER_DELETION',
          severity: 'warning',
          message: `Deletions by unusual user: ${count} deletes`,
          details: {
            user_id: user,
            delete_count: count,
            is_common_user: false,
          },
        });
      }
    }

    // Anomaly 5: Critical table deletion
    const criticalTables = [
      'appointments',
      'patients',
      'financial_records',
      'audit_reports',
    ];
    const criticalDeletes = deletesToday.filter(d =>
      criticalTables.includes(d.table_name)
    );

    if (criticalDeletes.length > 0) {
      this.createAnomaly({
        type: 'CRITICAL_TABLE_DELETION',
        severity: 'critical',
        message: `Deletion from critical table: ${criticalDeletes[0].table_name}`,
        details: {
          tables: [...new Set(criticalDeletes.map(d => d.table_name))],
          count: criticalDeletes.length,
        },
      });
    }
  }

  /**
   * Create anomaly alert
   */
  static createAnomaly(anomaly) {
    const fullAnomaly = {
      id: this.generateAnomalyId(),
      ...anomaly,
      timestamp: new Date(),
      clinic_id: this.clinicId,
    };

    this.anomalies.push(fullAnomaly);

    // Keep only last MAX_ANOMALIES
    if (this.anomalies.length > this.MAX_ANOMALIES) {
      this.anomalies.shift();
    }

    console.log(`🚨 [AnomalyDetector] ${fullAnomaly.message}`);

    // Persist to localStorage
    this.persistAnomaly(fullAnomaly);
  }

  /**
   * Get anomalies
   */
  static getAnomalies(filter = null) {
    if (!filter) return [...this.anomalies];

    return this.anomalies.filter(a => {
      if (filter.severity && a.severity !== filter.severity) return false;
      if (filter.type && a.type !== filter.type) return false;
      if (filter.after && new Date(a.timestamp) < new Date(filter.after)) return false;
      return true;
    });
  }

  /**
   * Get anomaly statistics
   */
  static getStatistics() {
    const critical = this.anomalies.filter(a => a.severity === 'critical').length;
    const warning = this.anomalies.filter(a => a.severity === 'warning').length;
    const info = this.anomalies.filter(a => a.severity === 'info').length;

    return {
      total: this.anomalies.length,
      critical,
      warning,
      info,
      criticalPercentage: this.anomalies.length > 0 
        ? ((critical / this.anomalies.length) * 100).toFixed(1) 
        : 0,
    };
  }

  /**
   * Persist anomaly to localStorage
   */
  static persistAnomaly(anomaly) {
    try {
      const key = 'gesclinic_anomalies';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(anomaly);

      // Keep only last 50
      if (existing.length > 50) {
        existing.shift();
      }

      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('[AnomalyDetector] Persist error:', error);
    }
  }

  /**
   * Generate anomaly ID
   */
  static generateAnomalyId() {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export anomaly report to CSV
   */
  static exportAnomalyReport() {
    const headers = ['ID', 'Type', 'Severity', 'Message', 'Timestamp', 'Details'];
    const rows = this.anomalies.map(a => [
      a.id,
      a.type,
      a.severity,
      a.message,
      new Date(a.timestamp).toLocaleString(),
      JSON.stringify(a.details),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anomaly_report_${new Date().toISOString()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Generate anomaly report
   */
  static generateReport() {
    const stats = this.getStatistics();

    return `
╔════════════════════════════════════════╗
║    ANOMALY DETECTION REPORT            ║
╠════════════════════════════════════════╣
║ Total Anomalies: ${stats.total.toString().padEnd(20)} ║
║ Critical:        ${stats.critical.toString().padEnd(20)} ║
║ Warnings:        ${stats.warning.toString().padEnd(20)} ║
║ Info:            ${stats.info.toString().padEnd(20)} ║
╠════════════════════════════════════════╣
║ RECENT ANOMALIES:                      ║
╠════════════════════════════════════════╣
${this.anomalies
  .slice(-5)
  .map(a => `║ 🚨 ${a.type.padEnd(25)} ${a.message.substring(0, 35)} ║`)
  .join('\n')}
║                                        ║
╚════════════════════════════════════════╝
    `.trim();
  }
}

export default AnomalyDetector;
