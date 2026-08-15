import { createEventEnvelope } from './envelope.js'
import { validateEventEnvelope } from './validator.js'
import { createPublisherAdapter, defaultPublisher } from './publisherAdapter.js'

import outboxService from './outboxService.js'
import registryLoader from './registryLoader.js'

const outbox = outboxService

export async function enqueueEvent({ eventType, version = '1.0', actor = null, tenantId = null, clinicId = null, requestId = null, correlationId = null, payload = {}, metadata = {} }, options = {}) {
  const envelope = createEventEnvelope({ eventType, version, actor, tenantId, clinicId, requestId, correlationId, payload, metadata })
  await registryLoader.load()
  const v = validateEventEnvelope(envelope)
  if (!v.ok) return { ok: false, error: v }
  const partitionKey = options.partitionKey || tenantId || clinicId || null
  const deliverAfter = options.deliverAfter || null
  const res = await outbox.append(envelope, partitionKey, deliverAfter)
  if (!res || !res.ok) return { ok: false, error: res && res.error }
  return { ok: true, envelope }
}

export async function publishEvent(envelope, publisher = null) {
  if (!envelope) return { ok: false, error: 'missing_envelope' }
  await registryLoader.load()
  const v = validateEventEnvelope(envelope)
  if (!v.ok) return { ok: false, error: v }
  const adapter = createPublisherAdapter(publisher)
  const published = await adapter.publish(envelope)
  return published
}

export { defaultPublisher }
// Event contract registry and simple emitter stub
export const EventContracts = {
  ClinicCreated: {
    version: '1.0',
    payload: ['clinic_id', 'tenant_id', 'created_by']
  },
  UserCreated: { version: '1.0', payload: ['user_id', 'clinic_id'] },
}

export function emitEvent(name, payload) {
  // Validate contract if exists
  const c = EventContracts[name]
  if (!c) {
    // unknown event; allow for forward compatibility
    return { ok: true, emitted: false }
  }
  // TODO: push to event bus (Kafka, Redis Streams, Postgres NOTIFY, etc.)
  const ev = { name, version: c.version, payload, timestamp: new Date().toISOString() }
  // console.debug('[EVENT EMIT]', ev)
  return { ok: true, event: ev }
}
