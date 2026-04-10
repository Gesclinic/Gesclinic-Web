/**
 * Formata um número de telefone brasileiro
 * Padrão: (XX) 9 XXXX-XXXX ou (XX) XXXX-XXX durante entrada
 * @param {string} value - Valor a ser formatado
 * @returns {string} - Telefone formatado
 */
export const formatPhone = (value) => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');

  // Limita a 11 dígitos
  if (numbers.length > 11) return value;

  // Formata progressivamente
  if (numbers.length === 0) {
    return '';
  } else if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else {
    // Celular (9 dígitos + DDD = 11): (XX) 9 XXXX-XXXX
    // Fixo (8 dígitos + DDD = 10): (XX) XXXX-XXXX
    const isCell = numbers.length >= 11 || (numbers.length > 7 && numbers[2] === '9');
    
    if (isCell && numbers.length === 11) {
      // Formato celular: (XX) 9 XXXX-XXXX
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else if (isCell && numbers.length > 7) {
      // Celular incompleto: (XX) 9 XXXX-XXX
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      // Formato fixo: (XX) XXXX-XXXX
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
  }
};

/**
 * Remove formatação de telefone
 * @param {string} value - Telefone formatado
 * @returns {string} - Apenas os números
 */
export const unformatPhone = (value) => {
  return value.replace(/\D/g, '');
};
