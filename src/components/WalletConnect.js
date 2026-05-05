import { connectMetaMask, isMetaMaskInstalled } from '../utils/metamask.js';

export function WalletConnect() {
  async function handleConnect() {
    const result = await connectMetaMask();

    if (result.success) {
      console.log('Conectado com sucesso!');
      console.log('Endereço:', result.account);
      // Atualize sua UI aqui
    } else {
      console.error('Falha na conexão:', result.error);
    }
  }

  return `
        <button onclick="handleConnect()" ${!isMetaMaskInstalled() ? 'disabled' : ''}>
            ${isMetaMaskInstalled() ? 'Conectar MetaMask' : 'Instale MetaMask'}
        </button>
    `;
}
