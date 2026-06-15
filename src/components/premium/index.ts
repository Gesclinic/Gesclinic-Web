/**
 * 🎨 DESIGN SYSTEM FINANCEIRO PREMIUM
 * 
 * Versão: 2026-05-19
 * Padrões e componentes reutilizáveis para módulo financeiro
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CORES E TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export const FinancialColors = {
  // Positivo
  positive: {
    light: '#ecfdf5',
    main: '#10b981',
    dark: '#065f46',
  },
  
  // Negativo
  negative: {
    light: '#fef2f2',
    main: '#ef4444',
    dark: '#7f1d1d',
  },
  
  // Neutro
  neutral: {
    light: '#f8fafc',
    main: '#64748b',
    dark: '#1e293b',
  },
  
  // Aviso
  warning: {
    light: '#fffbeb',
    main: '#f59e0b',
    dark: '#78350f',
  },
  
  // Info / Principal
  info: {
    light: '#eff6ff',
    main: '#3b82f6',
    dark: '#1e40af',
  },
  
  // Destaque
  highlight: {
    light: '#faf5ff',
    main: '#a855f7',
    dark: '#581c87',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. COMPONENTES PREMIUM - EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export { PremiumKPICard, PremiumKPIGrid } from './PremiumKPICard';
export { PremiumDataTable } from './PremiumDataTable';

// Componentes a serem criados:
// - PremiumChart (multi-type: line, bar, pie, area)
// - PremiumModal (multi-step com sidebar)
// - PremiumSidebar (compact/expanded mode)
// - FinancialBadges (status colorido)
// - FinancialSkeleton (loading state)

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TIPOS FINANCEIROS COMUNS
// ═══════════════════════════════════════════════════════════════════════════════

export enum FinancialStatus {
  // Contas a Pagar
  OPEN = 'open',
  OVERDUE = 'overdue',
  PARTIAL = 'partial',
  PAID = 'paid',
  CANCELED = 'canceled',
  NEGOTIATED = 'negotiated',
  
  // Contas a Receber
  ISSUED = 'issued',
  RECEIVED = 'received',
  LATE = 'late',
  DEFAULT = 'default',
}

export enum FinancialTransactionType {
  ENTRADA = 'entrada',
  SAIDA = 'saida',
  TRANSFERENCIA = 'transferencia',
}

export const StatusColors = {
  [FinancialStatus.OPEN]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200' },
  [FinancialStatus.OVERDUE]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
  [FinancialStatus.PARTIAL]: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200' },
  [FinancialStatus.PAID]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
  [FinancialStatus.CANCELED]: { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200' },
  [FinancialStatus.NEGOTIATED]: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200' },
  [FinancialStatus.ISSUED]: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-800 dark:text-indigo-200' },
  [FinancialStatus.RECEIVED]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
  [FinancialStatus.LATE]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
  [FinancialStatus.DEFAULT]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. UTILITIES FINANCEIRAS
// ═══════════════════════════════════════════════════════════════════════════════

export const formatCurrency = (value: number, locale = 'pt-BR'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatDate = (date: Date | string, locale = 'pt-BR'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

export const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. HOOKS PREMIUM
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback } from 'react';

/**
 * Hook: Validação de formulário financeiro
 */
export const useFinancialFormValidation = () => {
  const validate = useCallback((field: string, value: any) => {
    switch (field) {
      case 'amount':
        if (!value || typeof value !== 'number') return 'Valor obrigatório';
        if (value <= 0) return 'Valor deve ser maior que 0';
        return null;
      
      case 'email':
        if (!value) return 'Email obrigatório';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email inválido';
        return null;
      
      case 'document':
        if (!value) return 'Documento obrigatório';
        // CPF/CNPJ básico
        return null;
      
      default:
        return null;
    }
  }, []);

  return { validate };
};

/**
 * Hook: Formatação de valores financeiros
 */
export const useFinancialFormat = () => {
  const currency = useCallback((value: number) => formatCurrency(value), []);
  const percentage = useCallback((value: number, decimals?: number) => formatPercentage(value, decimals), []);
  const date = useCallback((date: Date | string) => formatDate(date), []);
  const trend = useCallback((current: number, previous: number) => calculateTrend(current, previous), []);

  return { currency, percentage, date, trend };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

export const FINANCIAL_CONFIG = {
  // Paginação padrão
  defaultPageSize: 20,
  maxPageSize: 100,
  
  // Refresh rates
  autoRefreshInterval: 5 * 60 * 1000, // 5 minutos
  realtimeRefreshInterval: 30 * 1000, // 30 segundos
  
  // Limites
  maxUploadSize: 10 * 1024 * 1024, // 10 MB
  maxAttachments: 10,
  
  // Períodos
  periods: [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mês' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este ano' },
    { value: 'custom', label: 'Personalizado' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. FEEDBACK & NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const FinancialNotifications = {
  success: (message: string) => ({
    type: 'success',
    title: '✓ Sucesso',
    message,
  }),
  
  error: (message: string) => ({
    type: 'error',
    title: '✗ Erro',
    message,
  }),
  
  warning: (message: string) => ({
    type: 'warning',
    title: '⚠ Aviso',
    message,
  }),
  
  info: (message: string) => ({
    type: 'info',
    title: 'ℹ Informação',
    message,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. EXPORT PADRÃO
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  FinancialColors,
  StatusColors,
  FinancialStatus,
  FinancialTransactionType,
  FINANCIAL_CONFIG,
  FinancialNotifications,
  formatCurrency,
  formatPercentage,
  formatDate,
  calculateTrend,
};
