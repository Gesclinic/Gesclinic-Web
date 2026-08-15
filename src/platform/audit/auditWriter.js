import { auditRepo } from './auditRepository.js'

export function createAuditRecord({ type, actor = null, clinicId = null, tenantId = null, meta = {}, requestId = null, correlationId = null }) {
  return {
    event_type: type,
    event_id: crypto.randomUUID(),
    payload: { type, actor, clinicId, tenantId, meta, requestId, correlationId },
    metadata: { meta },
    tenant_id: tenantId,
    clinic_id: clinicId,
    actor_id: actor,
    ip: null,
    user_agent: null,
    correlation_id: correlationId,
    request_id: requestId,
    key_version: 'v1',
  }
}

export async function writeAudit(record) {
  if (!record?.event_type) return { ok: false, error: 'invalid_record' }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await auditRepo.append(record)
    if (result?.ok) return { ok: true, out: result.data }
  }
  return { ok: false, error: 'write_failed' }
}