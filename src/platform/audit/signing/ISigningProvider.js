export class ISigningProvider {
  async sign(canonical) {
    throw new Error('NotImplemented')
  }

  async verify(canonical, signature) {
    throw new Error('NotImplemented')
  }
}

export default ISigningProvider
