import { useQuery } from "@tanstack/react-query";
import { listarProfissionais } from "@/modules/agenda/services";

export function useProfissionais({ clinicId }) {
  return useQuery({
    queryKey: ["profissionais", clinicId],
    queryFn: () => listarProfissionais({ clinicId }),
    enabled: !!clinicId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
    retry: (failureCount) => failureCount < 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
    select: (data) => data || [],
  });
}
