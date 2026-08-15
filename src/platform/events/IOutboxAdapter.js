// Interface / abstract class for Outbox adapters.
export class IOutboxAdapter {
  async append(envelope, partitionKey = null, deliverAfter = null) {
    throw new Error('NotImplemented')
  }

  async claimNext(partitionKey = null) {
    throw new Error('NotImplemented')
  }

  async markDelivered(id) {
    throw new Error('NotImplemented')
  }

  async markFailed(id, errorMessage) {
    throw new Error('NotImplemented')
  }

  async moveToDLQ(id, errorMessage) {
    throw new Error('NotImplemented')
  }

  async listPending(limit = 100) {
    throw new Error('NotImplemented')
  }

  async purgeDelivered(olderThanDays = 30) {
    throw new Error('NotImplemented')
  }
}

export default IOutboxAdapter
