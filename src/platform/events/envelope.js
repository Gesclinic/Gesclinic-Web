import crypto from 'crypto'

export function createEventEnvelope({ eventType, version = '1.0', eventVersion = '1', schemaVersion = '1', producerVersion = '1', causationId = null, actor = null, tenantId = null, clinicId = null, requestId = null, correlationId = null, payload = {}, metadata = {} }) {
  const eventId = crypto.randomUUID()
  const occurredAt = new Date().toISOString()
  return {
    eventId,
    eventType,
    version,
    eventVersion,
    schemaVersion,
    producerVersion,
    causationId,
    timestamp: occurredAt,
    occurredAt,
    actor,
    tenantId,
    clinicId,
    requestId,
    correlationId,
    payload,
    metadata,
  }
}
