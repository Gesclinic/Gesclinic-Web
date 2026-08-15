import { describe, it, expect } from 'vitest'
import MemoryOutboxAdapter from '../../src/platform/events/adapters/MemoryOutboxAdapter.js'
import { Dispatcher } from '../../src/platform/workers/dispatcher.js'

describe('Dispatcher scale concurrency', () => {
  const workerCounts = [2, 4, 8, 16]
  for (const wc of workerCounts) {
    it(`process events with ${wc} workers without duplication`, async () => {
      const adapter = new MemoryOutboxAdapter()
      const total = 200
      for (let i = 0; i < total; i++) await adapter.append({ eventId: `e-${i}`, eventType: 'Scale.Test', version: '1.0', eventVersion: '1', schemaVersion: '1', producerVersion: '1', causationId: null, occurredAt: new Date().toISOString(), payload: { i }, metadata: {} })

      const processed = new Set()
      const pub = { publish: async (envelope) => { processed.add(envelope.eventId); return { ok: true } } }

      const workers = []
      for (let i = 0; i < wc; i++) {
        const d = new Dispatcher({ publisher: pub, outboxAdapter: adapter, workerName: `w-${i}`, leaseSeconds: 5 })
        workers.push(d)
        d.start()
      }

      // wait until processed size == total or timeout
      const deadline = Date.now() + 20000
      while (Date.now() < deadline && processed.size < total) await new Promise(r => setTimeout(r, 100))

      for (const d of workers) await d.stop()
      expect(processed.size).toEqual(total)
    }, 30000)
  }
})
