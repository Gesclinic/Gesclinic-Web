import { describe, it, expect } from 'vitest'
import MemoryOutboxAdapter from '../../src/platform/events/adapters/MemoryOutboxAdapter.js'

describe('MemoryOutboxAdapter', () => {
  it('append -> claimNext -> markDelivered flow', async () => {
    const adapter = new MemoryOutboxAdapter()
    const env = { eventId: 'e1', eventType: 'Test', version: '1.0', payload: { a: 1 }, metadata: {} }
    const res = await adapter.append(env)
    expect(res.ok).toBe(true)
    const claim = await adapter.claimNext()
    expect(claim.ok).toBe(true)
    expect(claim.row).toBeTruthy()
    const id = claim.row.id
    const del = await adapter.markDelivered(id)
    expect(del.ok).toBe(true)
    const list = await adapter.listPending()
    expect(list.ok).toBe(true)
    expect(list.rows.length).toBe(0)
  })

  it('markFailed and moveToDLQ', async () => {
    const adapter = new MemoryOutboxAdapter()
    const env = { eventId: 'e2', eventType: 'Test2', version: '1.0', payload: { b: 2 }, metadata: {} }
    const res = await adapter.append(env)
    const claim = await adapter.claimNext()
    const id = claim.row.id
    const m = await adapter.markFailed(id, 'boom')
    expect(m.ok).toBe(true)
    // now push to dlq
    const dlq = await adapter.moveToDLQ(id, 'boom')
    expect(dlq.ok).toBe(true)
  })
})
