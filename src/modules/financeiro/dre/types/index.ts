/**
 * DRE Enterprise Types
 * 
 * Tipos compartilhados para toda a infraestrutura DRE
 * 
 * Data: 2026-06-20
 */

// Re-export main types from engine
export type {
  DREVariantType,
  DREPeriod,
  DREFilters,
  DRELineItem,
  DREResult,
  DRESummary,
  BenchmarkMetrics,
  DREComparison,
} from '@/lib/dreEnterpriseEngine';

// Re-export hook types
export type {
  UseFinancialDREState,
  UseFinancialDREActions,
} from '@/modules/financeiro/dre/hooks/useFinancialDRE';
