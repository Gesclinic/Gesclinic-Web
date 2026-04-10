// src/lib/formatters.js
// Funções auxiliares de formatação

/**
 * Formatar valor para moeda brasileira
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formatar data
 */
export function formatDate(date) {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date + 'T00:00:00');
  }
  
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Formatar data com hora
 */
export function formatDateTime(date) {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Formatar percentual
 */
export function formatPercent(value) {
  if (value === null || value === undefined) return '0%';
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Formatar número com casas decimais
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '0';
  return Number(value).toFixed(decimals);
}
