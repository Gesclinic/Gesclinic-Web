import outboxService from '../events/outboxService.js'
import { defaultPublisher } from '../events/publisherAdapter.js'

import { processedEventsService } from '../events/ProcessedEventsService.js'
import { workerLeaseService } from './WorkerLeaseService.js'
import { retryPolicyProvider } from '../events/RetryPolicyProvider.js'
import crypto from 'crypto'
import { metrics } from '../telemetry/index.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function computeBackoff(attempts, base = 1000, cap = 30000) {
  const exp = Math.pow(2, attempts)
  const val = Math.min(base * exp, cap)
  const jitter = Math.floor(Math.random() * Math.floor(base))
  return val + jitter
}

export class Dispatcher {
  constructor({ publisher = null, maxAttempts = 5, pollIntervalMs = 500, outboxAdapter = null, workerName = null, leaseSeconds = 30 } = {}) {
    this.publisher = publisher || defaultPublisher
    this.maxAttempts = maxAttempts
    this.pollIntervalMs = pollIntervalMs
    this._running = false
    this.outbox = outboxAdapter || outboxService
    this.workerName = workerName || `dispatcher-${crypto.randomUUID()}`
    this.leaseSeconds = leaseSeconds
    this.workerId = null
    this._leaseTimer = null
  }

  async _processRow(row) {
    // idempotency check
    const consumer = this.workerName
    const already = await processedEventsService.isProcessed(row.event_id, consumer)
    if (already) {
      // mark delivered anyway to remove from pending queue
      await this.outbox.markDelivered(row.id)
      return { ok: true, skipped: true }
    }
    try {
      metrics.increment('dispatcher.processing')
      const envelope = {
        eventId: row.event_id,
        eventType: row.event_type,
        version: row.version,
        timestamp: row.created_at,
        payload: row.payload,
        metadata: row.metadata,
        tenantId: row.tenant_id,
        clinicId: row.clinic_id,
        correlationId: row.correlation_id,
        requestId: row.request_id,
        actor: row.actor_id,
      }
      const res = await this.publisher.publish(envelope)
      if (res && res.ok) {
        await this.outbox.markDelivered(row.id)
        await processedEventsService.markProcessed({ eventId: row.event_id, consumer, checksum: null, executionTimeMs: 0, status: 'processed' })
        metrics.increment('dispatcher.delivered')
        return { ok: true }
      }
      throw new Error('publish_failed')
    } catch (err) {
      // consult retry policy
      const attempts = (row.retry_count || 0) + 1
      const delay = retryPolicyProvider.getNextDelay(row.event_type, attempts)
      if (attempts >= this.maxAttempts || delay === null) {
        await this.outbox.moveToDLQ(row.id, String(err.message || err))
        await processedEventsService.markProcessed({ eventId: row.event_id, consumer, checksum: null, executionTimeMs: 0, status: 'dlq', details: { error: String(err) } })
        metrics.increment('dispatcher.dlq')
        return { ok: false, dlq: true }
      }
      // schedule next retry by marking failed (adapter may compute next_retry_at)
      await this.outbox.markFailed(row.id, String(err.message || err))
      metrics.increment('dispatcher.retries')
      // optionally set next_retry_at based on delay if adapter supports it
      // sleep small jitter before continuing loop
      await sleep((delay || 1) * 1000)
      metrics.increment('dispatcher.failed')
      return { ok: false, retry: true }
    }
  }

  async _startLeaseHeartbeat() {
    if (!this.workerId) {
      const reg = await workerLeaseService.register(this.workerName, this.leaseSeconds)
      if (reg.ok) this.workerId = reg.workerId
    }
    if (!this.workerId) return
    this._leaseTimer = setInterval(async () => {
      await workerLeaseService.renew(this.workerId, this.leaseSeconds)
    }, Math.max(5000, (this.leaseSeconds * 1000) / 2))
  }

  async _stopLeaseHeartbeat() {
    if (this._leaseTimer) clearInterval(this._leaseTimer)
    if (this.workerId) await workerLeaseService.release(this.workerId)
    this._leaseTimer = null
    this.workerId = null
  }

  async start() {
    if (this._running) return { ok: false, reason: 'already_running' }
    this._running = true
    await this._startLeaseHeartbeat()
    while (this._running) {
      const rowRes = await this.outbox.claimNext()
      const row = rowRes && rowRes.row ? rowRes.row : null
      if (!row) {
        await sleep(this.pollIntervalMs)
        continue
      }
      await this._processRow(row)
    }
    await this._stopLeaseHeartbeat()
    return { ok: true }
  }

  async stop() {
    this._running = false
    return { ok: true }
  }
}
