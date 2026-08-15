import { describe, it, expect } from 'vitest'
import canonicalizeJSON from '../../src/platform/crypto/canonicalize.js'
import crypto from 'crypto'

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

describe('hash chain algorithm', () => {
  it('computes canonical and chain hash when no previous hash', () => {
    const payload = { a: 1 }
    const metadata = { m: 'x' }
    const event_type = 'test.event'
    const event_id = 'e1'

    const canonical = canonicalizeJSON({ payload, metadata, event_type, event_id })
    const canonicalHex = sha256Hex(canonical)
    const chained = sha256Hex((null || '') + canonicalHex)

    expect(typeof canonical).toBe('string')
    expect(canonicalHex).toHaveLength(64)
    expect(chained).toHaveLength(64)
  })

  it('changes when previous hash provided', () => {
    const payload = { a: 2 }
    const metadata = {}
    const event_type = 'test.event'
    const event_id = 'e2'
    const prev = 'deadbeef'

    const canonical = canonicalizeJSON({ payload, metadata, event_type, event_id })
    const canonicalHex = sha256Hex(canonical)
    const chained1 = sha256Hex(prev + canonicalHex)
    const chained2 = sha256Hex('' + canonicalHex)
    expect(chained1).not.toBe(chained2)
  })
})
