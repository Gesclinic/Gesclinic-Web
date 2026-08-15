import { describe, it, expect } from 'vitest'
import { Client } from 'pg'
import crypto from 'crypto'

const hasPostgresIntegration = Boolean(process.env.PG_CONNECTION_STRING)

async function appendThenRollback(requestId) {
    const pg = new Client({ connectionString: process.env.PG_CONNECTION_STRING })
    await pg.connect()
    try {
      await pg.query('BEGIN')
      await pg.query(
        `SELECT * FROM platform.append_audit_event(
          'rollback.test', $1::uuid, $2::jsonb, '{}'::jsonb, $3::uuid,
          NULL::uuid, NULL::uuid, NULL::text, NULL::text, $4::text, $4::text, NULL::text
        )`,
        [crypto.randomUUID(), JSON.stringify({ requestId }), crypto.randomUUID(), requestId],
      )
      await pg.query('SELECT 1 / 0')
    } catch (err) {
      expect(err).toBeDefined()
      await pg.query('ROLLBACK')
      const result = await pg.query('SELECT id, hmac, previous_hash FROM platform.audit_events WHERE request_id = $1', [requestId])
      return result.rows
    } finally {
      await pg.end()
    }
    throw new Error('Expected forced transaction failure')
}

describe.skipIf(!hasPostgresIntegration)('Audit rollback (integration)', () => {
  it('does not persist rows when transaction fails', async () => {
    const rows = await appendThenRollback(crypto.randomUUID())
    expect(rows.length).toBe(0)
  })

  it('does not leave a partial event, hmac, or previous_hash after pre-commit failure', async () => {
    const rows = await appendThenRollback(crypto.randomUUID())
    expect(rows).toEqual([])
  })
})
