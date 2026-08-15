import { describe, it, expect } from 'vitest'
import { createPlatformSupabaseClient } from '../../src/platform/services/supabaseService.js'
import crypto from 'crypto'

const hasWorkerIntegration = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

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

    // release
    const { error: relErr } = await platform.rpc('release_worker', { p_worker_id: workerId })
    expect(relErr).toBeNull()

    // ensure row removed
    const { data: after } = await platform.from('worker_leases').select('*').eq('worker_id', workerId)
    expect(after.length).toBe(0)
  })
})
