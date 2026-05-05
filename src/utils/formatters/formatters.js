/**
 * Utilitários de formatação de dados
 */

/**
 * Normaliza código CBHPM/TUSS para padrão consistente
 * - Converte para maiúsculas
 * - Remove espaços extras (início, fim, múltiplos espaços)
 * - Preserva números, letras, pontos e hífens
 * @param {string|number} code - Código a normalizar
 * @returns {string} Código normalizado
 */
export function normalizeCodeCBHPM(code) {
  // Se não houver código, retornar vazio
  if (code === null || code === undefined || code === '') {
    return '';
  }

  // Converter para string
  const str = String(code);

  // Remover espaços extras e converter para maiúsculas
  const normalized = str
    .trim() // Remove espaços início/fim
    .replace(/\s+/g, ' ') // Remove múltiplos espaços internos
    .toUpperCase(); // Converte para maiúsculas

  // Retornar valor vazio se result for vazio após trim, senão retornar normalizado
  return normalized.trim() || '';
}

/**
 * Formata CPF para padrão XXX.XXX.XXX-XX
 * @param {string} cpf - CPF sem formatação
 * @returns {string} CPF formatado
 */
export function formatCPF(cpf) {
  if (!cpf) {
    return '—';
  }

  const clean = String(cpf).replace(/\D/g, '');
  if (clean.length !== 11) {
    return cpf;
  }

  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

/**
 * Formata telefone para padrão (XX) XXXXX-XXXX
 * @param {string} phone - Telefone sem formatação
 * @returns {string} Telefone formatado
 */
export function formatPhone(phone) {
  if (!phone) {
    return '—';
  }

  const clean = String(phone).replace(/\D/g, '');

  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }

  return phone;
}

/**
 * Formata valor monetário em BRL
 * @param {number} value - Valor em centavos ou reais
 * @param {boolean} isCents - True se o valor está em centavos
 * @returns {string} Valor formatado
 */
export function formatCurrency(value, isCents = false) {
  if (value === null || value === undefined) {
    return '—';
  }

  const numValue = isCents ? value / 100 : value;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Formata percentual
 * @param {number} value - Valor entre 0 e 100
 * @param {number} decimals - Número de casas decimais
 * @returns {string} Percentual formatado
 */
export function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined) {
    return '—';
  }

  return `${parseFloat(value).toFixed(decimals)}%`;
}
