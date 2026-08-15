import { describe, it, expect, vi } from 'vitest'
import WorkerLeaseService from '../../src/platform/workers/WorkerLeaseService.js'

describe('WorkerLeaseService RPC usage', () => {
  it('calls platform.register_worker with correct params', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: ['worker-1'], error: null })
    const svc = new WorkerLeaseService({ rpc: mockRpc })
    const res = await svc.register('w1', 60)
    expect(mockRpc).toHaveBeenCalled()
    // verify RPC name and params
    const call = mockRpc.mock.calls[0]
    expect(call[0]).toBe('platform.register_worker')
    expect(call[1]).toEqual({ p_worker_name: 'w1', p_lease_seconds: 60 })
    expect(res.ok).toBe(true)
  })

  it('calls platform.renew_worker_lease with correct params', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: [true], error: null })
    const svc = new WorkerLeaseService({ rpc: mockRpc })
    const res = await svc.renew('wid-1', 30)
    expect(mockRpc).toHaveBeenCalled()
    const call = mockRpc.mock.calls[0]
    expect(call[0]).toBe('platform.renew_worker_lease')
    expect(call[1]).toEqual({ p_worker_id: 'wid-1', p_lease_seconds: 30 })
    expect(res.ok).toBe(true)
  })

  it('calls platform.release_worker with correct params', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: [true], error: null })
    const svc = new WorkerLeaseService({ rpc: mockRpc })
    const res = await svc.release('wid-1')
    expect(mockRpc).toHaveBeenCalled()
    const call = mockRpc.mock.calls[0]
    expect(call[0]).toBe('platform.release_worker')
    expect(call[1]).toEqual({ p_worker_id: 'wid-1' })
    expect(res.ok).toBe(true)
  })
})
