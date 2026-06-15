import { useQuery } from '@tanstack/react-query';
import * as appointmentsApi from '@/lib/appointmentsApi';

/**
 * useFinancialReports - Hook customizado para relatórios financeiros com caching (FASE 13)
 * Utiliza React Query para caching, refetching automático e otimização de performance
 * 
 * Recursos:
 * - Caching automático (staleTime configurável)
 * - Refetching em background
 * - Gerenciamento de loading/error
 * - Pagination support
 */

export function useProductionReport(clinicId, startDate, endDate, options = {}) {
  return useQuery({
    queryKey: ['production-report', clinicId, startDate, endDate],
    queryFn: () => appointmentsApi.getProductionReport(clinicId, startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos (anteriormente cacheTime)
    enabled: !!clinicId && !!startDate && !!endDate,
    ...options
  });
}

export function useBillingReport(clinicId, startDate, endDate, options = {}) {
  return useQuery({
    queryKey: ['billing-report', clinicId, startDate, endDate],
    queryFn: () => appointmentsApi.getBillingReport(clinicId, startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    enabled: !!clinicId && !!startDate && !!endDate,
    ...options
  });
}

export function useReceivablesReport(clinicId, status = null, options = {}) {
  return useQuery({
    queryKey: ['receivables-report', clinicId, status],
    queryFn: () => appointmentsApi.getReceivablesReport(clinicId, status),
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 20 * 60 * 1000, // 20 minutos
    enabled: !!clinicId,
    ...options
  });
}

/**
 * Hook para paginação com React Query
 * Gerencia estado de página e offset automático
 */
export function usePaginatedQuery(queryKey, queryFn, pageSize = 10, options = {}) {
  const [page, setPage] = React.useState(1);

  const query = useQuery({
    queryKey: [...queryKey, page],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      return queryFn({ offset, limit: pageSize });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options
  });

  return {
    ...query,
    page,
    setPage,
    pageSize,
    nextPage: () => setPage(p => p + 1),
    prevPage: () => setPage(p => Math.max(1, p - 1))
  };
}
