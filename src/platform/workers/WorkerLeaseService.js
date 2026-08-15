import { createPlatformSupabaseClient } from '../services/supabaseService.js'

class WorkerLeaseService {
  constructor(supabase = null) {
    this.supabase = supabase || createPlatformSupabaseClient()
  }

  async register(workerName, leaseSeconds = 30) {
    try {
      const platform = typeof this.supabase.schema === 'function' ? this.supabase.schema('platform') : this.supabase
      const rpcName = typeof this.supabase.schema === 'function' ? 'register_worker' : 'platform.register_worker'
      const { data, error } = await platform.rpc(rpcName, { p_worker_name: workerName, p_lease_seconds: leaseSeconds })
      if (error) return { ok: false, error }
      return { ok: true, workerId: Array.isArray(data) ? data[0] : data }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async renew(workerId, leaseSeconds = 30) {
    try {
      const platform = typeof this.supabase.schema === 'function' ? this.supabase.schema('platform') : this.supabase
      const rpcName = typeof this.supabase.schema === 'function' ? 'renew_worker_lease' : 'platform.renew_worker_lease'
      const { data, error } = await platform.rpc(rpcName, { p_worker_id: workerId, p_lease_seconds: leaseSeconds })
      if (error) return { ok: false, error }
      return { ok: true, renewed: data }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async release(workerId) {
    try {
      const platform = typeof this.supabase.schema === 'function' ? this.supabase.schema('platform') : this.supabase
      const rpcName = typeof this.supabase.schema === 'function' ? 'release_worker' : 'platform.release_worker'
      const { data, error } = await platform.rpc(rpcName, { p_worker_id: workerId })
      if (error) return { ok: false, error }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
}

export const workerLeaseService = new WorkerLeaseService()
export default WorkerLeaseService
