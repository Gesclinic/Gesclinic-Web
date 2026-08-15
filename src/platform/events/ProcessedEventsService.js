import { createPlatformSupabaseClient } from '../services/supabaseService.js'

class ProcessedEventsService {
  constructor(supabase = null) {
    this.supabase = supabase || createPlatformSupabaseClient()
  }

  async isProcessed(eventId, consumer) {
    if (!eventId || !consumer) return false
    try {
      const platform = typeof this.supabase.schema === 'function' ? this.supabase.schema('platform') : this.supabase
      const table = typeof this.supabase.schema === 'function' ? 'processed_events' : 'platform.processed_events'
      const { data, error } = await platform.from(table).select('id').eq('event_id', eventId).eq('consumer', consumer).limit(1).maybeSingle()
      if (error) return false
      return !!data
    } catch (err) {
      return false
    }
  }

  async markProcessed({ eventId, consumer, checksum = null, executionTimeMs = null, status = 'processed', details = null }) {
    try {
      const platform = typeof this.supabase.schema === 'function' ? this.supabase.schema('platform') : this.supabase
      const table = typeof this.supabase.schema === 'function' ? 'processed_events' : 'platform.processed_events'
      const row = {
        event_id: eventId,
        consumer,
        checksum,
        execution_time_ms: executionTimeMs,
        status,
        details,
      }
      const { data, error } = await platform.from(table).insert(row).select().single()
      if (error) return { ok: false, error }
      return { ok: true, row: data }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
}

export const processedEventsService = new ProcessedEventsService()
export default processedEventsService
