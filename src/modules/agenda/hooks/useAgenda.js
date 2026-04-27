import { useQuery } from "@tanstack/react-query";
import { listarAgenda } from "@/modules/agenda/services";

export function useAgenda({ clinicId, date, startDate, endDate }) {
  return useQuery({
    queryKey: ["agenda", clinicId, date, startDate, endDate],
    queryFn: () => listarAgenda({ clinicId, date, startDate, endDate }),
    enabled: !!clinicId && (!!date || !!startDate),
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 10,    // 10 minutes
    retry: (failureCount) => failureCount < 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
    select: (data) => data || [],
  });
}
