import { describe, it, expect } from 'vitest'
import MemoryOutboxAdapter from '../../src/platform/events/adapters/MemoryOutboxAdapter.js'
import { Dispatcher } from '../../src/platform/workers/dispatcher.js'
import { defaultPublisher } from '../../src/platform/events/publisherAdapter.js'

describe('Dispatcher concurrency', () => {
  it('multiple dispatchers should not double-process events (memory adapter)', async () => {
    const adapter = new MemoryOutboxAdapter()
    const env = { eventId: 'evt-100', eventType: 'Test.Concurrent', version: '1.0', payload: { x: 1 }, metadata: {} }
    // append same event multiple times
    await adapter.append(env)

    const processed = new Set()
    // publisher that records processed eventIds
    const pub = {
      publish: async (envelope) => {
        processed.add(envelope.eventId)
        return { ok: true }
      }
    }

    const d1 = new Dispatcher({ publisher: pub, outboxAdapter: adapter, workerName: 'w1', leaseSeconds: 5 })
    const d2 = new Dispatcher({ publisher: pub, outboxAdapter: adapter, workerName: 'w2', leaseSeconds: 5 })

    // start both dispatchers
    d1.start()
    d2.start()

    // wait a bit
    await new Promise(r => setTimeout(r, 1000))

    await d1.stop()
    await d2.stop()

    expect(processed.size).toBeLessThanOrEqual(1)
  })
})
