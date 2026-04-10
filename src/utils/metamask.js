/**
 * Conecta à carteira MetaMask
 * @returns {Promise<Object>} Objeto com success (boolean), account (string) ou error (string)
 */
export async function connectMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            return {
                success: true,
                account: accounts[0]
            };
        } catch (error) {
            console.error('Erro ao conectar MetaMask:', error);
            return {
                success: false,
                error: error.message
            };
        }
    } else {
        alert('MetaMask não encontrada. Por favor, instale a extensão MetaMask para continuar.');
        return {
            success: false,
            error: 'MetaMask não instalada'
        };
    }
}

/**
 * Verifica se MetaMask está instalada
 * @returns {boolean}
 */
export function isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined';
}

/**
 * Obtém a conta conectada atual
 * @returns {Promise<string|null>}
 */
export async function getCurrentAccount() {
    if (!isMetaMaskInstalled()) return null;
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        return accounts[0] || null;
    } catch (error) {
        console.error('Erro ao obter conta:', error);
        return null;
    }
}
