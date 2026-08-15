import { createPublisherAdapter, defaultPublisher } from './publisherAdapter.js'
import { createPlatformSupabaseClient } from '../services/supabaseService.js'
import { metrics, tracer } from '../telemetry/index.js'

class ReplayService {
  constructor(supabaseClient = null) {
    this.client = supabaseClient || createPlatformSupabaseClient()
  }

  async _queryDelivered(whereClause, params = {}) {
    // Basic query builder using Supabase RPC or select
    const q = this.client.from('platform.outbox_events').select('*').eq('status', 'delivered')
    // apply filters passed via whereClause as a simple object
    Object.entries(params).forEach(([k, v]) => q.eq(k, v))
    const { data, error } = await q.order('created_at', { ascending: true })
    if (error) return { ok: false, error }
    return { ok: true, rows: data }
  }

  async replayByTenant(tenantId, publisher = null) {
    const span = tracer.startSpan('replayByTenant')
    metrics.increment('replay.executions')
    const pub = createPublisherAdapter(publisher)
    const res = await this._queryDelivered(null, { tenant_id: tenantId })
    if (!res.ok) return res
    let count = 0
    for (const row of res.rows) {
      const envelope = this._rowToEnvelope(row)
      await pub.publish(envelope)
      count += 1
      if (count % 100 === 0) metrics.increment('replay.events', 100)
    }
    metrics.increment('replay.events', count)
    span.end()
    return { ok: true }
  }

  async replayByClinic(clinicId, publisher = null) {
    const span = tracer.startSpan('replayByClinic')
    const pub = createPublisherAdapter(publisher)
    const res = await this._queryDelivered(null, { clinic_id: clinicId })
    if (!res.ok) return res
    let count = 0
    for (const row of res.rows) {
      const envelope = this._rowToEnvelope(row)
      await pub.publish(envelope)
      count += 1
    }
    metrics.increment('replay.events', count)
    span.end()
    return { ok: true }
  }

  async replayByRequestId(requestId, publisher = null) {
    const span = tracer.startSpan('replayByRequestId')
    const pub = createPublisherAdapter(publisher)
    const res = await this._queryDelivered(null, { request_id: requestId })
    if (!res.ok) return res
    let count = 0
    for (const row of res.rows) {
      const envelope = this._rowToEnvelope(row)
      await pub.publish(envelope)
      count += 1
    }
    metrics.increment('replay.events', count)
    span.end()
    return { ok: true }
  }

  async replayByCorrelationId(correlationId, publisher = null) {
    const span = tracer.startSpan('replayByCorrelationId')
    const pub = createPublisherAdapter(publisher)
    const res = await this._queryDelivered(null, { correlation_id: correlationId })
    if (!res.ok) return res
    let count = 0
    for (const row of res.rows) {
      const envelope = this._rowToEnvelope(row)
      await pub.publish(envelope)
      count += 1
    }
    metrics.increment('replay.events', count)
    span.end()
    return { ok: true }
  }

  _rowToEnvelope(row) {
    return {
      eventId: row.event_id,
      eventType: row.event_type,
      version: row.version,
      eventVersion: row.event_version,
      schemaVersion: row.schema_version,
      producerVersion: row.producer_version,
      timestamp: row.created_at,
      payload: row.payload,
      metadata: row.metadata,
      tenantId: row.tenant_id,
      clinicId: row.clinic_id,
      correlationId: row.correlation_id,
      requestId: row.request_id,
      actor: row.actor_id,
    }
  }
}

export const replayService = new ReplayService()
export default replayService
