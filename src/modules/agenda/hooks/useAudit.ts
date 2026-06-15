/**
 * React Query Hooks for Appointment Audit Logging
 * Provides server state management for audit queries
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {
  getAppointmentAuditHistory,
  getAuditSummaryForClinic,
  queryAuditLogs,
  AuditLogEntry,
  AuditSummary,
} from '../services/appointmentAuditApi';

// ============================================================================
// Query Key Factory
// ============================================================================

export const auditQueryKeys = {
  all: ['appointmentAudit'] as const,
  history: (appointmentId: string) => [...auditQueryKeys.all, 'history', appointmentId] as const,
  summary: (clinicId: string, fromDate?: Date, toDate?: Date) =>
    [...auditQueryKeys.all, 'summary', clinicId, fromDate?.toISOString(), toDate?.toISOString()] as const,
  logs: (clinicId: string, filters?: any) =>
    [...auditQueryKeys.all, 'logs', clinicId, JSON.stringify(filters)] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch appointment change history
 * 
 * @param appointmentId - The appointment UUID
 * @param limit - Maximum number of entries to return (default: 100)
 * @param options - React Query options
 */
export function useAppointmentAuditHistory(
  appointmentId: string | undefined,
  limit: number = 100,
  options?: UseQueryOptions<AuditLogEntry[]>
) {
  return useQuery({
    queryKey: auditQueryKeys.history(appointmentId || ''),
    queryFn: () => {
      if (!appointmentId) throw new Error('Appointment ID is required');
      return getAppointmentAuditHistory(appointmentId, limit);
    },
    enabled: !!appointmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    ...options,
  });
}

/**
 * Fetch audit summary for clinic
 * 
 * @param clinicId - The clinic UUID
 * @param fromDate - Start date for summary (default: 30 days ago)
 * @param toDate - End date for summary (default: today)
 * @param options - React Query options
 */
export function useAuditSummary(
  clinicId: string | undefined,
  fromDate?: Date,
  toDate?: Date,
  options?: UseQueryOptions<AuditSummary[]>
) {
  return useQuery({
    queryKey: auditQueryKeys.summary(clinicId || '', fromDate, toDate),
    queryFn: () => {
      if (!clinicId) throw new Error('Clinic ID is required');
      return getAuditSummaryForClinic(clinicId, fromDate, toDate);
    },
    enabled: !!clinicId,
    staleTime: 15 * 60 * 1000, // 15 minutes (summary changes less frequently)
    gcTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

/**
 * Query audit logs with filters
 * 
 * @param clinicId - The clinic UUID
 * @param filters - Query filters (appointmentId, operation, dateRange, etc)
 * @param options - React Query options
 */
export function useAuditLogs(
  clinicId: string | undefined,
  filters?: {
    appointmentId?: string;
    operation?: 'CREATE' | 'UPDATE' | 'DELETE';
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  },
  options?: UseQueryOptions<any[]>
) {
  return useQuery({
    queryKey: auditQueryKeys.logs(clinicId || '', filters),
    queryFn: () => {
      if (!clinicId) throw new Error('Clinic ID is required');
      return queryAuditLogs(clinicId, filters);
    },
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}
