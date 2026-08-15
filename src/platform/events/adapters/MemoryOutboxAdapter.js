import fs from 'fs'
import path from 'path'
import IOutboxAdapter from '../IOutboxAdapter.js'

const PERSIST_PATH = path.resolve(process.cwd(), 'docs', 'tmp', 'outbox.json')
fs.mkdirSync(path.dirname(PERSIST_PATH), { recursive: true })

export class MemoryOutboxAdapter extends IOutboxAdapter {
  constructor({ persistPath = null } = {}) {
    super()
    this._items = []
    this._dlq = []
    this._nextId = 1
    this.persistPath = persistPath
    if (this.persistPath) this._loadFromDisk()
  }

  _loadFromDisk() {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, 'utf8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this._items = parsed
          this._nextId = parsed.reduce((m, i) => Math.max(m, i.id || 0), 0) + 1
        }
      }
    } catch (err) {}
  }

  _persist() {
    if (!this.persistPath) return
    try {
      fs.mkdirSync(path.dirname(this.persistPath), { recursive: true })
      fs.writeFileSync(this.persistPath, JSON.stringify(this._items, null, 2))
    } catch (err) {}
  }

  async append(envelope, partitionKey = null, deliverAfter = null) {
    const row = {
      id: String(this._nextId++),
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
      retry_count: 0,
      next_retry_at: deliverAfter || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    this._items.push(row)
    this._persist()
    return { ok: true, row }
  }

  async claimNext(partitionKey = null) {
    const now = new Date().toISOString()
    for (const r of this._items) {
      if (r.status !== 'pending') continue
      if (r.next_retry_at && r.next_retry_at > now) continue
      if (partitionKey && r.clinic_id !== partitionKey) continue
      r.status = 'processing'
      this._persist()
      return { ok: true, row: r }
    }
    return { ok: true, row: null }
  }

  async markDelivered(id) {
    const r = this._items.find(i => String(i.id) === String(id))
    if (r) {
      r.status = 'delivered'
      r.delivered_at = new Date().toISOString()
      this._persist()
      return { ok: true, row: r }
    }
    return { ok: false, error: 'not_found' }
  }

  async markFailed(id, errorMessage) {
    const r = this._items.find(i => String(i.id) === String(id))
    if (r) {
      r.retry_count = (r.retry_count || 0) + 1
      r.last_error = String(errorMessage || '')
      r.status = 'pending'
      this._persist()
      return { ok: true, row: r }
    }
    return { ok: false, error: 'not_found' }
  }

  async moveToDLQ(id, errorMessage) {
    const idx = this._items.findIndex(i => String(i.id) === String(id))
    if (idx === -1) return { ok: false, error: 'not_found' }
    const [item] = this._items.splice(idx, 1)
    this._dlq.push({ ...item, dlq_error: String(errorMessage || '') })
    // append to dlq file for now
    const dlqPath = path.resolve(process.cwd(), 'docs', 'tmp', 'outbox_dlq.jsonl')
    try {
      fs.appendFileSync(dlqPath, JSON.stringify({ ...item, dlq_error: errorMessage }) + '\n')
    } catch (err) {}
    this._persist()
    return { ok: true }
  }

  async listFailed(limit = 100) {
    return { ok: true, rows: this._dlq.slice(0, limit) }
  }

  async listPending(limit = 100) {
    const rows = this._items.filter(i => i.status === 'pending').slice(0, limit)
    return { ok: true, rows }
  }

  async purgeDelivered(olderThanDays = 30) {
    const cutoff = Date.now() - olderThanDays * 24 * 3600 * 1000
    this._items = this._items.filter(i => !(i.status === 'delivered' && new Date(i.delivered_at).getTime() < cutoff))
    this._persist()
    return { ok: true }
  }
}

export default MemoryOutboxAdapter
