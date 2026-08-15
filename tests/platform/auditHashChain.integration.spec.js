import { describe, it, expect } from 'vitest'
import { createPlatformSupabaseClient } from '../../src/platform/services/supabaseService.js'
import canonicalizeJSON from '../../src/platform/crypto/canonicalize.js'
import crypto from 'crypto'
import { Client } from 'pg'

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

const hasSupabaseIntegration = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseIntegration)('Audit Hash Chain (integration)', () => {
  it('creates three events and validates previous_hash/hmac chain', async () => {
    const client = createPlatformSupabaseClient()
    const platform = client.schema('platform')
    const requestId = crypto.randomUUID()
    const clinicId = null
    const tenantId = crypto.randomUUID()

    const makeRecord = (i) => ({
      event_type: 'test.audit.chain',
      event_id: crypto.randomUUID(),
      payload: { idx: i },
      metadata: { test: 'chain' },
      tenant_id: tenantId,
      clinic_id: clinicId,
      actor_id: null,
      ip: null,
      user_agent: null,
      correlation_id: requestId,
      request_id: requestId,
      key_version: null,
    })

    // Append three events via RPC (prefer v2 if available)
    const r1 = await platform.rpc('append_audit_event', makeRecord(1))
    const r2 = await platform.rpc('append_audit_event', makeRecord(2))
    const r3 = await platform.rpc('append_audit_event', makeRecord(3))

    // ensure RPC returned ids/new_hash when available
    expect(r1.error).toBeNull()
    expect(r2.error).toBeNull()
    expect(r3.error).toBeNull()
    expect(r1.data).toBeDefined()
    expect(r2.data).toBeDefined()
    expect(r3.data).toBeDefined()

    // Fetch persisted audit rows for this request_id
    const { data: rows, error } = await platform.from('audit_events').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
    expect(error).toBeNull()
    expect(rows).toHaveLength(3)

    // Validate chain: prev_hash linking
    const row1 = rows[0]
    const row2 = rows[1]
    const row3 = rows[2]

    expect(row1.previous_hash).toBeNull()
    expect(row2.previous_hash).toBe(row1.hmac)
    expect(row3.previous_hash).toBe(row2.hmac)

    // Recompute hmacs locally and compare
    for (const r of rows) {
      const canonical = canonicalizeJSON({ payload: r.payload || {}, metadata: r.metadata || {}, event_type: r.event_type, event_id: r.event_id })
      const canonicalHex = sha256Hex(canonical)
      const prev = r.previous_hash || ''
      const expected = sha256Hex(prev + canonicalHex)
      expect(r.hmac).toBe(expected)
    }

    // If PG_CONNECTION_STRING available, validate function properties for append_audit_event
    if (process.env.PG_CONNECTION_STRING) {
      const pg = new Client({ connectionString: process.env.PG_CONNECTION_STRING })
      await pg.connect()
      try {
        const fnRes = await pg.query("SELECT p.oid, r.rolname as owner, p.prosecdef, pg_get_functiondef(p.oid) as def FROM pg_proc p JOIN pg_roles r ON p.proowner = r.oid WHERE p.proname = 'append_audit_event' LIMIT 1")
        expect(fnRes.rowCount).toBeGreaterThan(0)
        const fn = fnRes.rows[0]
        expect(fn.prosecdef).toBe(true)
        expect(fn.def).toContain('SET search_path')
        // owner check (postgres expected in migrations, but may vary)
        expect(fn.owner).toBeTruthy()
      } finally {
        await pg.end()
      }
    }
  })
})
