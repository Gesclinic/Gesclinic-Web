import { createPlatformSupabaseClient } from '../services/supabaseService.js'
import canonicalizeJSON from '../crypto/canonicalize.js'
import crypto from 'crypto'
import MemorySigningProvider from './signing/MemorySigningProvider.js'

export class PostgresAuditRepository {
  constructor(supabase = null, signingProvider = null) {
    this.supabase = supabase || createPlatformSupabaseClient()
    this.signingProvider = signingProvider || new MemorySigningProvider()
  }

  async append(record) {
    try {
      const platform = typeof this.supabase.schema === 'function'
        ? this.supabase.schema('platform')
        : this.supabase
      const canonical = canonicalizeJSON({ payload: record.payload || {}, metadata: record.metadata || {}, event_type: record.event_type, event_id: record.event_id })
      const signRes = await this.signingProvider.sign(canonical)
      const params = {
        p_event_type: record.event_type,
        p_event_id: record.event_id,
        p_payload: record.payload || {},
        p_metadata: record.metadata || {},
        p_tenant_id: record.tenant_id || null,
        p_clinic_id: record.clinic_id || null,
        p_actor_id: record.actor_id || null,
        p_ip: record.ip || null,
        p_user_agent: record.user_agent || null,
        p_correlation_id: record.correlation_id || null,
        p_request_id: record.request_id || null,
        p_key_version: signRes.keyVersion || null,
        p_signature: signRes.signature || null,
        p_algorithm: signRes.algorithm || null,
        p_previous_signature: null,
      }
      // prefer server-side RPC v2 if available
      const rpcName = typeof this.supabase.schema === 'function' ? 'append_audit_event_v2' : 'platform.append_audit_event_v2'
      const { data, error } = await platform.rpc(rpcName, params)
      if (error) {
        // fallback to older RPC
        const fallbackName = typeof this.supabase.schema === 'function' ? 'append_audit_event' : 'platform.append_audit_event'
        const { data: d2, error: e2 } = await platform.rpc(fallbackName, { p_event_type: record.event_type, p_event_id: record.event_id, p_payload: record.payload || {}, p_metadata: record.metadata || {}, p_tenant_id: record.tenant_id || null, p_clinic_id: record.clinic_id || null, p_actor_id: record.actor_id || null, p_ip: record.ip || null, p_user_agent: record.user_agent || null, p_correlation_id: record.correlation_id || null, p_request_id: record.request_id || null, p_key_version: signRes.keyVersion || null })
        if (e2) return { ok: false, error: e2 }
        return { ok: true, data: d2 }
      }
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async readLatestByTenant(tenantId, limit = 100) {
    try {
      const platform = typeof this.supabase.schema === 'function' ? this.supabase.schema('platform') : this.supabase
      const table = typeof this.supabase.schema === 'function' ? 'audit_events' : 'platform.audit_events'
      const { data, error } = await platform.from(table).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(limit)
      if (error) return { ok: false, error }
      return { ok: true, rows: data }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
}

export function computeHmac(payload, key) {
  // Backward-compatible helper: simple HMAC using key over canonicalized payload
  const canonical = canonicalizeJSON(payload)
  const h = crypto.createHmac('sha256', key || 'default_key')
  h.update(canonical)
  return h.digest('hex')
}

export const auditRepo = new PostgresAuditRepository()
