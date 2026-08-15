// Simple retry policy provider to map event types to retry schedules (in seconds)
export class RetryPolicyProvider {
  constructor(config = null) {
    // default policy in seconds
    this.defaultPolicy = [1, 5, 30, 120, 600]
    this.policies = config || {}
  }

  getPolicyFor(eventType) {
    return this.policies[eventType] || this.defaultPolicy
  }

  getNextDelay(eventType, attempt) {
    const policy = this.getPolicyFor(eventType)
    if (attempt <= 0) return 0
    if (attempt > policy.length) return null // signal DLQ
    return policy[attempt - 1]
  }
}

export const retryPolicyProvider = new RetryPolicyProvider()
export default retryPolicyProvider
