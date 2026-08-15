import { describe, it, expect } from 'vitest'
import { PostgresAuditRepository } from '../../src/platform/audit/auditRepository.js'
import MemorySigningProvider from '../../src/platform/audit/signing/MemorySigningProvider.js'

describe('audit repository RPC usage', () => {
  it('prefers v2 RPC and falls back to v1 when v2 errors', async () => {
    // mock supabase rpc: first call (v2) returns an error, second call (v1) succeeds
    const mockRpcFn = jestMockRpc()
    const mockSupabase = { rpc: mockRpcFn }
    const repo = new PostgresAuditRepository(mockSupabase, new MemorySigningProvider())

    const record = {
      event_type: 'appointment.created',
      event_id: 'e-1',
      payload: { foo: 'bar' },
      metadata: {},
      tenant_id: null,
      clinic_id: 'c1',
      actor_id: 'u1',
      ip: null,
      user_agent: null,
      correlation_id: null,
      request_id: null,
    }

    const res = await repo.append(record)
    expect(res.ok).toBe(true)
    // ensure our mock was called at least twice (v2 then fallback)
    expect(mockRpcFn.mock.calls.length).toBeGreaterThanOrEqual(2)
    const firstCall = mockRpcFn.mock.calls[0]
    expect(firstCall[0]).toBe('platform.append_audit_event_v2')
  })
})

function jestMockRpc() {
  // minimal mock compatible with PostgresAuditRepository usage
  const calls = []
  const fn = async (name, params) => {
    calls.push([name, params])
    // simulate v2 error on first call
    if (calls.length === 1) return { data: null, error: { message: 'not found' } }
    // simulate fallback success
    return { data: [{ id: 'uuid-1', hmac: 'abc' }], error: null }
  }
  fn.mock = { calls }
  return fn
}
