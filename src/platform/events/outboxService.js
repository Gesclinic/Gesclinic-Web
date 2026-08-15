import MemoryOutboxAdapter from './adapters/MemoryOutboxAdapter.js'
import PostgresOutboxAdapter from './adapters/PostgresOutboxAdapter.js'
import { createPlatformSupabaseClient } from '../services/supabaseService.js'

class OutboxService {
  constructor() {
    this.adapter = null
    this._initDefault()
  }

  _initDefault() {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    if (url) {
      const client = createPlatformSupabaseClient()
      this.adapter = new PostgresOutboxAdapter(client)
    } else {
      this.adapter = new MemoryOutboxAdapter()
    }
  }

  setAdapter(adapter) {
    this.adapter = adapter
  }

  getAdapter() {
    return this.adapter
  }

  async append(...args) {
    return this.adapter.append(...args)
  }

  async claimNext(...args) {
    return this.adapter.claimNext(...args)
  }

  async markDelivered(...args) {
    return this.adapter.markDelivered(...args)
  }

  async markFailed(...args) {
    return this.adapter.markFailed(...args)
  }

  async moveToDLQ(...args) {
    return this.adapter.moveToDLQ(...args)
  }

  async listPending(...args) {
    return this.adapter.listPending(...args)
  }

  async purgeDelivered(...args) {
    return this.adapter.purgeDelivered(...args)
  }
}

export const outboxService = new OutboxService()
export default outboxService
