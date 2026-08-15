import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'

import { enqueueEvent, publishEvent, defaultPublisher } from '../../src/platform/events/index.js'
import outboxService from '../../src/platform/events/outboxService.js'
import MemoryOutboxAdapter from '../../src/platform/events/adapters/MemoryOutboxAdapter.js'
import { validateEventEnvelope } from '../../src/platform/events/validator.js'

const OUTBOX_PATH = path.resolve(process.cwd(), 'docs', 'tmp', 'outbox.json')

beforeEach(() => {
  // reset outbox persistence
  if (fs.existsSync(OUTBOX_PATH)) fs.unlinkSync(OUTBOX_PATH)
  outboxService.setAdapter(new MemoryOutboxAdapter())
  defaultPublisher.published = []
})

describe('events: enqueue and publish', () => {
  it('enqueueEvent validates and appends to outbox', async () => {
    const res = await enqueueEvent({ eventType: 'UserCreated', payload: { userId: 'u1', clinicId: 'c1' }, tenantId: 't1' })
    expect(res.ok).toBeTruthy()
    const pending = await outboxService.listPending()
    expect(pending.rows.length).toBeGreaterThan(0)
    const env = res.envelope
    expect(env.eventType).toBe('UserCreated')
    const v = validateEventEnvelope(env)
    expect(v.ok).toBeTruthy()
  })

  it('publishEvent sends via defaultPublisher', async () => {
    const res = await enqueueEvent({ eventType: 'AppointmentCreated', payload: { appointmentId: 'a1', clinicId: 'c1', start: '2026-01-01T10:00:00Z' } })
    expect(res.ok).toBeTruthy()
    const pub = await publishEvent(res.envelope)
    expect(pub.ok).toBeTruthy()
    expect(defaultPublisher.published.length).toBe(1)
  })
})
