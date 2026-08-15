import { createPlatformSupabaseClient } from '../services/supabaseService.js'

// Try to load Ajv optionally; if not available, validation will be disabled but loader still caches schemas
let Ajv
try {
  Ajv = (await import('ajv')).default
} catch (e) {
  Ajv = null
}

class RegistryLoader {
  constructor() {
    this.client = createPlatformSupabaseClient()
    this.schemaCache = new Map() // raw schema json by key
    this.validatorCache = new Map() // compiled ajv validators
    this._loaded = false
    this.ajv = Ajv ? new Ajv({ strict: false, coerceTypes: true }) : null
  }

  _key(eventType, version) {
    return `${eventType}::${version}`
  }

  async load() {
    if (this._loaded) return this
    try {
      const platform = typeof this.client.schema === 'function' ? this.client.schema('platform') : this.client
      const table = typeof this.client.schema === 'function' ? 'event_schemas' : 'platform.event_schemas'
      const { data, error } = await platform.from(table).select('*')
      if (error) return this
      for (const r of data || []) {
        const key = this._key(r.event_type, r.version || r.schema_version || '1')
        this.schemaCache.set(key, r.schema_json)
        if (this.ajv) {
          try {
            const validate = this.ajv.compile(r.schema_json)
            this.validatorCache.set(key, validate)
          } catch (err) {
            // skip invalid schema
          }
        }
      }
      this._loaded = true
    } catch (err) {}
    return this
  }

  get(eventType, version = '1') {
    const key = this._key(eventType, version)
    return this.schemaCache.get(key)
  }

  validate(eventType, version = '1', data) {
    const key = this._key(eventType, version)
    const v = this.validatorCache.get(key)
    if (!v) return { ok: true, note: 'no_validator' }
    const valid = v(data)
    if (valid) return { ok: true }
    return { ok: false, errors: v.errors }
  }
}

export const registryLoader = new RegistryLoader()
export default registryLoader
