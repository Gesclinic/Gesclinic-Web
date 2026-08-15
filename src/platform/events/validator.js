import registryLoader from './registryLoader.js'

export function validateEventEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') return { ok: false, reason: 'invalid_envelope' }

  const baseFields = ['eventId', 'eventType', 'version', 'timestamp', 'payload', 'eventVersion', 'schemaVersion', 'producerVersion', 'causationId']
  for (const f of baseFields) {
    if (!(f in envelope)) return { ok: false, reason: 'missing_field', field: f }
  }

  // ensure registry is loaded
  registryLoader.load()
  const v = registryLoader.validate(envelope.eventType, String(envelope.schemaVersion || '1'), envelope.payload || {})
  if (!v.ok) return { ok: false, reason: 'schema_validation_failed', errors: v.errors }
  return { ok: true }
}
