import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'

import outboxService from '../../src/platform/events/outboxService.js'
import MemoryOutboxAdapter from '../../src/platform/events/adapters/MemoryOutboxAdapter.js'
import { defaultPublisher } from '../../src/platform/events/publisherAdapter.js'
import { Dispatcher } from '../../src/platform/workers/dispatcher.js'
import { dlqStore } from '../../src/platform/events/dlqStore.js'

const OUTBOX_PATH = path.resolve(process.cwd(), 'docs', 'tmp', 'outbox.json')
const DLQ_PATH = path.resolve(process.cwd(), 'docs', 'tmp', 'outbox_dlq.jsonl')

beforeEach(() => {
  if (fs.existsSync(OUTBOX_PATH)) fs.unlinkSync(OUTBOX_PATH)
  if (fs.existsSync(DLQ_PATH)) fs.unlinkSync(DLQ_PATH)
  outboxService.setAdapter(new MemoryOutboxAdapter())
  defaultPublisher.published = []
  dlqStore._count = 0
})

describe('dispatcher', () => {
  it('processes an enqueued event successfully', async () => {
    const enq = await import('../../src/platform/events/index.js')
    await enq.enqueueEvent({ eventType: 'UserCreated', payload: { userId: 'u2', clinicId: 'c2' } })
    const adapter = outboxService.getAdapter()
    const d = new Dispatcher({ pollIntervalMs: 10, outboxAdapter: adapter })
    // run dispatcher in background and stop after some ms
    setTimeout(() => d.stop(), 200)
    await d.start()
    expect(defaultPublisher.published.length).toBeGreaterThan(0)
    expect(adapter._items[0].delivered_at).toBeDefined()
  })

  it('moves failed event to DLQ after max attempts', async () => {
    // create publisher that fails
    const failingPublisher = { publish: async () => ({ ok: false }) }
    const enq = await import('../../src/platform/events/index.js')
    await enq.enqueueEvent({ eventType: 'AppointmentCreated', payload: { appointmentId: 'a2', clinicId: 'c3', start: '2026-01-02T10:00:00Z' } })
    const adapter = outboxService.getAdapter()
    const d = new Dispatcher({ publisher: failingPublisher, maxAttempts: 1, pollIntervalMs: 10, outboxAdapter: adapter })
    setTimeout(() => d.stop(), 200)
    await d.start()
    const failed = await adapter.listFailed()
    expect(failed.rows).toHaveLength(1)
  })
})
