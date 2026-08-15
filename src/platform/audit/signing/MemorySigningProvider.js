import crypto from 'crypto'
import { ISigningProvider } from './ISigningProvider.js'

export class MemorySigningProvider extends ISigningProvider {
  constructor({ key = null, algorithm = 'sha256' } = {}) {
    super()
    this.key = key || 'memory_default_key'
    this.algorithm = algorithm
    this.keyVersion = 'memory-v1'
  }

  async sign(canonical) {
    const h = crypto.createHmac(this.algorithm, this.key)
    h.update(canonical)
    const signature = h.digest('hex')
    return { signature, keyVersion: this.keyVersion, algorithm: this.algorithm }
  }

  async verify(canonical, signature) {
    const candidate = (await this.sign(canonical)).signature
    return candidate === signature
  }
}

export default MemorySigningProvider
