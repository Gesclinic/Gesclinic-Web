import { describe, it, expect } from 'vitest'
import { createPlatformSupabaseClient } from '../../src/platform/services/supabaseService.js'
import crypto from 'crypto'

const hasAppointmentIntegration = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.TEST_CLINIC_ID,
)

describe.skipIf(!hasAppointmentIntegration)('Appointment transaction integration', () => {
  it('creates appointment, outbox event and audit event in same flow', async () => {
    const client = createPlatformSupabaseClient()
    const platform = client.schema('platform')
    const requestId = crypto.randomUUID()
    const correlationId = crypto.randomUUID()
    const payload = {
      clinic_id: process.env.TEST_CLINIC_ID,
      scheduled_date: '2099-01-01',
      scheduled_time: '09:00',
      end_time: '09:30',
      notes: 'integration test',
      price: '100.00',
      duration: '30',
      metadata: { test: 'appointment' }
    }

    const { data: appt, error: createErr } = await platform.rpc('appointment_create', {
      p_payload: payload,
      p_request_id: requestId,
      p_correlation_id: correlationId,
    })
    expect(createErr).toBeNull()
    expect(appt).toBeDefined()
    // attempt to locate outbox event by event_type and payload->>'id'
    const { data: outboxRows } = await platform.from('outbox_events').select('*').eq('event_type', 'appointment.created').eq('request_id', requestId).order('created_at', { ascending: false }).limit(1)
    expect(outboxRows && outboxRows.length > 0).toBe(true)
    const out = outboxRows[0]
    // find audit by request_id from outbox
    const { data: auditRows } = await platform.from('audit_events').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
    expect(auditRows && auditRows.length > 0).toBe(true)
    // validate fields
    expect(out.correlation_id).toBe(correlationId)
    expect(out.request_id).toBe(requestId)
    expect(auditRows[0].event_id).toBe(out.event_id)
    expect(auditRows[0].event_type).toBe('appointment.created')
  })
})
