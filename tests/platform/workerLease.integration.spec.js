import { describe, it, expect } from 'vitest'
import { createPlatformSupabaseClient } from '../../src/platform/services/supabaseService.js'
import { Client } from 'pg'
import crypto from 'crypto'

const hasWorkerIntegration = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.PG_CONNECTION_STRING,
)

describe.skipIf(!hasWorkerIntegration)('Worker lifecycle integration', () => {
  it('register -> renew -> release lifecycle works and updates lease', async () => {
    const client = createPlatformSupabaseClient()
    const platform = client.schema('platform')
    const workerName = `test-worker-${Date.now()}`
    const { data: reg, error: regErr } = await platform.rpc('register_worker', { p_worker_name: workerName, p_lease_seconds: 60 })
    expect(regErr).toBeNull()
    expect(reg).toBeTruthy()
    const workerId = Array.isArray(reg) ? reg[0] : reg

    // check table row exists
    const { data: row } = await platform.from('worker_leases').select('*').eq('worker_id', workerId)
    expect(row && row.length > 0).toBe(true)

    // renew
    const initialHeartbeat = row[0].last_heartbeat
    const initialExpiration = row[0].lease_expires_at
    const { error: renewErr } = await platform.rpc('renew_worker_lease', { p_worker_id: workerId, p_lease_seconds: 120 })
    expect(renewErr).toBeNull()
    const { data: renewedRows } = await platform.from('worker_leases').select('*').eq('worker_id', workerId)
    expect(new Date(renewedRows[0].last_heartbeat).getTime()).toBeGreaterThanOrEqual(new Date(initialHeartbeat).getTime())
    expect(new Date(renewedRows[0].lease_expires_at).getTime()).toBeGreaterThan(new Date(initialExpiration).getTime())

    const eventId = crypto.randomUUID()
    const { data: outboxRow, error: outboxError } = await platform.from('outbox_events').insert({
      event_id: eventId,
      event_type: 'test.worker.lifecycle',
      version: '1.0',
      payload: { workerId },
      status: 'pending',
    }).select().single()
    expect(outboxError).toBeNull()

    const { data: claimed, error: claimError } = await platform.rpc('claim_next_outbox_event', { partition_key: null })
    expect(claimError).toBeNull()
    const claimedRow = Array.isArray(claimed) ? claimed[0] : claimed
    expect(claimedRow.id).toBe(outboxRow.id)

    const pg = new Client({ connectionString: process.env.PG_CONNECTION_STRING })
    await pg.connect()
    try {
      const result = await pg.query(`
        SELECT p.proname, p.prosecdef, r.rolname AS owner, pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_roles r ON r.oid = p.proowner
        WHERE n.nspname = 'platform'
          AND p.proname = ANY($1::text[])
      `, [['register_worker', 'renew_worker_lease', 'release_worker', 'claim_next_outbox_event']])
      expect(result.rows).toHaveLength(4)
      for (const fn of result.rows) {
        expect(fn.prosecdef).toBe(true)
        expect(fn.owner).toBe('postgres')
        expect(fn.definition).toContain('SET search_path')
      }
    } finally {
      await pg.end()
    }

    // release
    const { error: relErr } = await platform.rpc('release_worker', { p_worker_id: workerId })
    expect(relErr).toBeNull()

    // ensure row removed
    const { data: after } = await platform.from('worker_leases').select('*').eq('worker_id', workerId)
    expect(after.length).toBe(0)
    await platform.from('outbox_events').delete().eq('id', outboxRow.id)
  })
})
