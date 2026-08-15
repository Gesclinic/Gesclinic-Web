import { createPlatformSupabaseClient } from '../../services/supabaseService.js'

export class PostgresOutboxAdapter {
  constructor(supabaseClient = null) {
    this.supabase = supabaseClient || createPlatformSupabaseClient()
    this.platform = typeof this.supabase.schema === 'function' ? this.supabase.schema('platform') : this.supabase
    this.table = typeof this.supabase.schema === 'function' ? 'outbox_events' : 'platform.outbox_events'
    this.dlqTable = typeof this.supabase.schema === 'function' ? 'outbox_dlq' : 'platform.outbox_dlq'
  }

  async append(envelope, partitionKey = null, deliverAfter = null) {
    const row = {
      event_id: envelope.eventId,
      event_type: envelope.eventType,
      version: envelope.version,
      event_version: envelope.eventVersion || '1',
      schema_version: envelope.schemaVersion || '1',
      producer_version: envelope.producerVersion || '1',
      payload: envelope.payload,
      metadata: envelope.metadata || {},
      tenant_id: envelope.tenantId || null,
      clinic_id: envelope.clinicId || null,
      correlation_id: envelope.correlationId || envelope.requestId || null,
      request_id: envelope.requestId || null,
      actor_id: envelope.actor || null,
      next_retry_at: deliverAfter || null,
      status: 'pending',
    }
    const { data, error } = await this.platform.from(this.table).insert(row).select().single()
    if (error) return { ok: false, error }
    return { ok: true, row: data }
  }

  async claimNext(partitionKey = null) {
    // call SQL function platform.claim_next_outbox_event(partition_key)
    try {
      const funcName = typeof this.supabase.schema === 'function' ? 'claim_next_outbox_event' : 'platform.claim_next_outbox_event'
      const { data, error } = await this.platform.rpc(funcName, { partition_key: partitionKey })
      if (error) return { ok: false, error }
      if (!data || (Array.isArray(data) && data.length === 0)) return { ok: true, row: null }
      const row = Array.isArray(data) ? data[0] : data
      return { ok: true, row }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async markDelivered(id) {
    const { data, error } = await this.platform.from(this.table).update({ status: 'delivered', updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) return { ok: false, error }
    return { ok: true, row: data }
  }

  async markFailed(id, errorMessage) {
    const funcName = typeof this.supabase.schema === 'function' ? 'platform_mark_outbox_failed' : 'platform.platform_mark_outbox_failed'
    const { data, error } = await this.platform.rpc(funcName, { outbox_id: id, err_msg: errorMessage })
    if (error) return { ok: false, error }
    return { ok: true, row: data }
  }

  async moveToDLQ(id, errorMessage) {
    const funcName = typeof this.supabase.schema === 'function' ? 'move_outbox_to_dlq' : 'platform.move_outbox_to_dlq'
    const { data, error } = await this.platform.rpc(funcName, {
      p_outbox_id: id,
      p_error_message: errorMessage,
    })
    if (error) return { ok: false, error }
    return { ok: Boolean(data) }
  }

  async listPending(limit = 100) {
    const { data, error } = await this.platform.from(this.table).select().eq('status', 'pending').order('created_at', { ascending: true }).limit(limit)
    if (error) return { ok: false, error }
    return { ok: true, rows: data }
  }

  async listFailed(limit = 100) {
    const { data, error } = await this.platform.from(this.dlqTable).select().order('first_failed_at', { ascending: false }).limit(limit)
    if (error) return { ok: false, error }
    return { ok: true, rows: data }
  }

  async listByCorrelation(correlationId) {
    const { data, error } = await this.platform.from(this.table).select().eq('correlation_id', correlationId).order('created_at', { ascending: true })
    if (error) return { ok: false, error }
    return { ok: true, rows: data }
  }

  async purgeDelivered(olderThanDays = 30) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600 * 1000).toISOString()
    const { error } = await this.platform.from(this.table).delete().lt('delivered_at', cutoff).eq('status', 'delivered')
    if (error) return { ok: false, error }
    return { ok: true }
  }
}

export default PostgresOutboxAdapter
