// Simple pluggable publisher adapter interface and an in-memory implementation
class PublisherAdapter {
  async publish(envelope) {
    throw new Error('publish_adapter_not_implemented')
  }
}

class InMemoryPublisher extends PublisherAdapter {
  constructor() {
    super()
    this.published = []
  }

  async publish(envelope) {
    const record = { envelope, publishedAt: new Date().toISOString() }
    this.published.push(record)
    return { ok: true, record }
  }
}

export const defaultPublisher = new InMemoryPublisher()

export function createPublisherAdapter(adapter) {
  return adapter || defaultPublisher
}
