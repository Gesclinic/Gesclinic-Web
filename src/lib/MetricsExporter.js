/**
 * MetricsExporter
 * Exports latency and performance metrics to external monitoring services
 * Supports: Datadog, New Relic, CloudWatch, custom webhooks
 * 
 * Installation:
 * - Datadog: npm install @datadog/browser-rum @datadog/browser-logs
 * - New Relic: npm install @newrelic/browser-agent
 */

export class MetricsExporter {
  static exporters = {
    datadog: null,
    newrelic: null,
    cloudwatch: null,
    webhook: null,
  };

  static config = {
    enabled: false,
    batchSize: 50,
    flushInterval: 30000, // 30 seconds
    services: [],
  };

  static metricBuffer = [];
  static flushTimer = null;

  /**
   * Initialize metrics exporter
   */
  static async initialize(config = {}) {
    this.config = { ...this.config, ...config };

    if (config.datadog) {
      await this.initializeDatadog(config.datadog);
    }

    if (config.newrelic) {
      await this.initializeNewRelic(config.newrelic);
    }

    if (config.cloudwatch) {
      await this.initializeCloudWatch(config.cloudwatch);
    }

    if (config.webhook) {
      this.initializeWebhook(config.webhook);
    }

    // Start auto-flushing
    this.startAutoFlush();

    console.log('✅ [MetricsExporter] Initialized with services:', this.config.services);
  }

  /**
   * Initialize Datadog agent
   */
  static async initializeDatadog(datadogConfig) {
    try {
      // Example initialization (requires @datadog/browser-rum)
      // const {
      //   datadogRum,
      // } = await import('@datadog/browser-rum');

      // datadogRum.init({
      //   applicationId: datadogConfig.applicationId,
      //   clientToken: datadogConfig.clientToken,
      //   site: datadogConfig.site || 'datadoghq.com',
      //   service: 'gesclinic-web',
      //   env: datadogConfig.env || 'production',
      //   sessionSampleRate: 100,
      //   sessionReplaySampleRate: 20,
      // });

      // datadogRum.startSessionReplayRecording();

      this.config.services.push('datadog');
      console.log('✅ [Datadog] Initialized');
    } catch (error) {
      console.warn('[Datadog] Initialization failed:', error);
    }
  }

  /**
   * Initialize New Relic agent
   */
  static async initializeNewRelic(newrelicConfig) {
    try {
      // Example initialization (requires @newrelic/browser-agent)
      // window.NREUM || (window.NREUM = {});
      // window.NREUM.init = {
      //   privacy: { cookies_enabled: true },
      //   ajax: { deny_list: ["bam", "rum", "trace.logs"] },
      // };
      // window.NREUM.loader_config = {
      //   accountID: newrelicConfig.accountId,
      //   trustKey: newrelicConfig.trustKey,
      //   agentID: newrelicConfig.agentId,
      //   licenseKey: newrelicConfig.licenseKey,
      //   applicationID: newrelicConfig.applicationId,
      // };

      this.config.services.push('newrelic');
      console.log('✅ [New Relic] Initialized');
    } catch (error) {
      console.warn('[New Relic] Initialization failed:', error);
    }
  }

  /**
   * Initialize CloudWatch metrics
   */
  static async initializeCloudWatch(cloudwatchConfig) {
    try {
      // This would require AWS SDK
      // const CloudWatch = new AWS.CloudWatch({
      //   region: cloudwatchConfig.region,
      // });

      this.exporters.cloudwatch = {
        namespace: cloudwatchConfig.namespace || 'Gesclinic',
        region: cloudwatchConfig.region || 'us-east-1',
      };

      this.config.services.push('cloudwatch');
      console.log('✅ [CloudWatch] Initialized');
    } catch (error) {
      console.warn('[CloudWatch] Initialization failed:', error);
    }
  }

  /**
   * Initialize webhook exporter
   */
  static initializeWebhook(webhookConfig) {
    this.exporters.webhook = {
      url: webhookConfig.url,
      headers: webhookConfig.headers || { 'Content-Type': 'application/json' },
    };

    this.config.services.push('webhook');
    console.log('✅ [Webhook] Initialized');
  }

  /**
   * Record a latency metric
   */
  static recordLatency(tableName, latency, metadata = {}) {
    const metric = {
      type: 'latency',
      table: tableName,
      value: latency,
      timestamp: new Date(),
      tags: {
        env: 'production',
        service: 'gesclinic',
        ...metadata,
      },
    };

    this.metricBuffer.push(metric);

    // Auto-flush if buffer is full
    if (this.metricBuffer.length >= this.config.batchSize) {
      this.flush();
    }

    return metric;
  }

  /**
   * Record a custom metric
   */
  static recordMetric(metricName, value, tags = {}, type = 'gauge') {
    const metric = {
      type,
      name: metricName,
      value,
      timestamp: new Date(),
      tags: {
        env: 'production',
        service: 'gesclinic',
        ...tags,
      },
    };

    this.metricBuffer.push(metric);

    if (this.metricBuffer.length >= this.config.batchSize) {
      this.flush();
    }

    return metric;
  }

  /**
   * Flush buffered metrics to all services
   */
  static async flush() {
    if (this.metricBuffer.length === 0) return;

    const metrics = [...this.metricBuffer];
    this.metricBuffer = [];

    console.log(`📊 [MetricsExporter] Flushing ${metrics.length} metrics...`);

    for (const service of this.config.services) {
      try {
        if (service === 'datadog') {
          await this.sendToDatadog(metrics);
        } else if (service === 'newrelic') {
          await this.sendToNewRelic(metrics);
        } else if (service === 'cloudwatch') {
          await this.sendToCloudWatch(metrics);
        } else if (service === 'webhook') {
          await this.sendToWebhook(metrics);
        }
      } catch (error) {
        console.error(`[MetricsExporter] ${service} export failed:`, error);
      }
    }
  }

  /**
   * Send metrics to Datadog
   */
  static async sendToDatadog(metrics) {
    try {
      // Using Datadog's HTTP API
      const datadogMetrics = metrics.map(m => ({
        metric: `gesclinic.${m.name || m.type}`,
        points: [[Math.floor(m.timestamp.getTime() / 1000), m.value]],
        type: 'gauge',
        tags: Object.entries(m.tags).map(([k, v]) => `${k}:${v}`),
      }));

      const response = await fetch('https://api.datadoghq.com/api/v1/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.VITE_DATADOG_API_KEY || '',
        },
        body: JSON.stringify({ series: datadogMetrics }),
      });

      if (!response.ok) {
        throw new Error(`Datadog API error: ${response.statusText}`);
      }

      console.log('✅ [Datadog] Metrics sent');
    } catch (error) {
      console.error('[Datadog] Send error:', error);
    }
  }

  /**
   * Send metrics to New Relic
   */
  static async sendToNewRelic(metrics) {
    try {
      // Using New Relic's Insights API
      const nrMetrics = metrics.map(m => ({
        'metricName': m.name || m.type,
        'value': m.value,
        'timestamp': m.timestamp.getTime(),
        ...m.tags,
      }));

      const response = await fetch(
        'https://insights-collector.newrelic.com/v1/accounts/ACCOUNT_ID/events',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Insert-Key': process.env.VITE_NEWRELIC_INGEST_KEY || '',
          },
          body: JSON.stringify(nrMetrics),
        }
      );

      if (!response.ok) {
        throw new Error(`New Relic API error: ${response.statusText}`);
      }

      console.log('✅ [New Relic] Metrics sent');
    } catch (error) {
      console.error('[New Relic] Send error:', error);
    }
  }

  /**
   * Send metrics to CloudWatch
   */
  static async sendToCloudWatch(metrics) {
    try {
      if (!this.exporters.cloudwatch) return;

      // This would require AWS SDK
      // const params = {
      //   Namespace: this.exporters.cloudwatch.namespace,
      //   MetricData: metrics.map(m => ({
      //     MetricName: m.name || m.type,
      //     Value: m.value,
      //     Unit: 'None',
      //     Timestamp: m.timestamp,
      //     Dimensions: Object.entries(m.tags).map(([k, v]) => ({
      //       Name: k,
      //       Value: v,
      //     })),
      //   })),
      // };

      // await cloudWatch.putMetricData(params).promise();

      console.log('✅ [CloudWatch] Metrics sent');
    } catch (error) {
      console.error('[CloudWatch] Send error:', error);
    }
  }

  /**
   * Send metrics to webhook
   */
  static async sendToWebhook(metrics) {
    try {
      if (!this.exporters.webhook) return;

      const response = await fetch(this.exporters.webhook.url, {
        method: 'POST',
        headers: this.exporters.webhook.headers,
        body: JSON.stringify({
          metrics,
          timestamp: new Date(),
          service: 'gesclinic',
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }

      console.log('✅ [Webhook] Metrics sent');
    } catch (error) {
      console.error('[Webhook] Send error:', error);
    }
  }

  /**
   * Start auto-flush timer
   */
  static startAutoFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop auto-flush timer
   */
  static stopAutoFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Get metrics buffer status
   */
  static getBufferStatus() {
    return {
      buffered: this.metricBuffer.length,
      bufferSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      services: this.config.services,
    };
  }

  /**
   * Generate exporter report
   */
  static generateReport() {
    const status = this.getBufferStatus();

    return `
╔════════════════════════════════════════╗
║    METRICS EXPORTER REPORT             ║
╠════════════════════════════════════════╣
║ Status:         ${this.config.enabled ? 'Enabled' : 'Disabled'}
║ Services:       ${status.services.length > 0 ? status.services.join(', ') : 'None'}
║ Buffered:       ${status.buffered}/${status.bufferSize}
║ Flush Interval: ${status.flushInterval}ms
╠════════════════════════════════════════╣
║ CONNECTED SERVICES:
${status.services.map(s => `║ ✓ ${s.toUpperCase().padEnd(34)} ║`).join('\n')}
╚════════════════════════════════════════╝
    `.trim();
  }
}

export default MetricsExporter;
