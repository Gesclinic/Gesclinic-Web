// Simple DLQ store persisted to JSON lines
import fs from 'fs'
import path from 'path'

const DLQ_PATH = path.resolve(process.cwd(), 'docs', 'tmp', 'outbox_dlq.jsonl')
fs.mkdirSync(path.dirname(DLQ_PATH), { recursive: true })

class DLQStore {
  constructor() {
    this._count = 0
  }

  add(item) {
    try {
      fs.appendFileSync(DLQ_PATH, JSON.stringify({ addedAt: new Date().toISOString(), item }) + '\n')
      this._count += 1
    } catch (err) {
      // best-effort
    }
  }

  count() {
    return this._count
  }
}

export const dlqStore = new DLQStore()
