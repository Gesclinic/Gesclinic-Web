/**
 * useAppointmentFinancialIntegration
 * 
 * React hook for managing appointment to receivable financial automation
 * Handles data fetching, mutations, caching, and real-time updates
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { customSupabaseClient } from '@/lib/customSupabaseClient';
import appointmentFinancialIntegrationApi, {
  AppointmentFinancialRule,
  AppointmentToReceivableMapping,
  FinancialCalculation,
  CreateReceivableResult,
  ValidationResult,
} from '@/lib/appointmentFinancialIntegrationApi';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Hook to fetch financial rules for clinic
 */
export function useAppointmentFinancialRules(clinicId?: string) {
  const { clinic } = useClinicContext();
  const currentClinicId = clinicId || clinic?.id;

  return useQuery({
    queryKey: ['appointment_financial_rules', currentClinicId],
    queryFn: async () => {
      if (!currentClinicId) return [];
      return appointmentFinancialIntegrationApi.getAppointmentFinancialRules(
        currentClinicId
      );
    },
    enabled: !!currentClinicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch mappings with optional filters
 */
export function useAppointmentReceivableMappings(
  filters?: {
    appointmentId?: string;
    receivableId?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }
) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['appointment_receivable_mappings', clinic?.id, filters],
    queryFn: async () => {
      if (!clinic?.id) return [];
      return appointmentFinancialIntegrationApi.getAppointmentReceivableMappings(
        clinic.id,
        filters
      );
    },
    enabled: !!clinic?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch single mapping by appointment
 */
export function useAppointmentReceivableMapping(appointmentId?: string) {
  return useQuery({
    queryKey: ['appointment_receivable_mapping', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      return appointmentFinancialIntegrationApi.getMappingByAppointmentId(
        appointmentId
      );
    },
    enabled: !!appointmentId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

/**
 * Hook to fetch financial stats
 */
export function useAppointmentFinancialStats(
  fromDate?: string,
  toDate?: string
) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['appointment_financial_stats', clinic?.id, fromDate, toDate],
    queryFn: async () => {
      if (!clinic?.id) return null;
      return appointmentFinancialIntegrationApi.getAppointmentFinancialStats(
        clinic.id,
        fromDate,
        toDate
      );
    },
    enabled: !!clinic?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Hook to create financial rule
 */
export function useCreateAppointmentFinancialRule() {
  const queryClient = useQueryClient();
  const { clinic } = useClinicContext();

  return useMutation({
    mutationFn: appointmentFinancialIntegrationApi.createAppointmentFinancialRule,
    onSuccess: (newRule) => {
      // Invalidate and refetch rules
      queryClient.invalidateQueries({
        queryKey: ['appointment_financial_rules', clinic?.id],
      });
    },
  });
}

/**
 * Hook to update financial rule
 */
export function useUpdateAppointmentFinancialRule() {
  const queryClient = useQueryClient();
  const { clinic } = useClinicContext();

  return useMutation({
    mutationFn: ({
      ruleId,
      updates,
    }: {
      ruleId: number;
      updates: any;
    }) =>
      appointmentFinancialIntegrationApi.updateAppointmentFinancialRule(
        ruleId,
        updates
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['appointment_financial_rules', clinic?.id],
      });
    },
  });
}

/**
 * Hook to create receivable from appointment
 */
export function useCreateReceivableFromAppointment() {
  const queryClient = useQueryClient();
  const { clinic } = useClinicContext();

  return useMutation({
    mutationFn: ({
      appointmentId,
      ruleId,
    }: {
      appointmentId: string;
      ruleId?: number;
    }) =>
      appointmentFinancialIntegrationApi.createReceivableFromAppointment(
        appointmentId,
        clinic?.id || '',
        ruleId
      ),
    onSuccess: (result, variables) => {
      // Invalidate multiple query keys to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['appointment_receivable_mapping', variables.appointmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['appointment_receivable_mappings'],
      });
      queryClient.invalidateQueries({
        queryKey: ['ar_invoices', clinic?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['cashflow'],
      });
      queryClient.invalidateQueries({
        queryKey: ['cash_flow'],
      });
      queryClient.invalidateQueries({
        queryKey: ['appointment_financial_stats'],
      });
    },
  });
}

/**
 * Hook to validate appointment
 */
export function useValidateAppointment() {
  return useMutation({
    mutationFn: appointmentFinancialIntegrationApi.validateAppointmentForReceivable,
  });
}

/**
 * Hook to calculate appointment receivable values
 */
export function useCalculateAppointmentReceivableValues() {
  return useMutation({
    mutationFn: ({
      appointmentId,
      clinicId,
    }: {
      appointmentId: string;
      clinicId: string;
    }) =>
      appointmentFinancialIntegrationApi.calculateAppointmentReceivableValues(
        appointmentId,
        clinicId
      ),
  });
}

/**
 * Hook to revert mapping
 */
export function useRevertAppointmentReceivableMapping() {
  const queryClient = useQueryClient();
  const { clinic } = useClinicContext();

  return useMutation({
    mutationFn: ({
      mappingId,
      cancelReceivable,
    }: {
      mappingId: number;
      cancelReceivable?: boolean;
    }) =>
      appointmentFinancialIntegrationApi.revertAppointmentReceivableMapping(
        mappingId,
        cancelReceivable
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['appointment_receivable_mappings'],
      });
      queryClient.invalidateQueries({
        queryKey: ['ar_invoices', clinic?.id],
      });
    },
  });
}

/**
 * Hook to toggle automation
 */
export function useToggleAppointmentFinancialAutomation() {
  const queryClient = useQueryClient();
  const { clinic } = useClinicContext();

  return useMutation({
    mutationFn: ({ enabled }: { enabled: boolean }) =>
      appointmentFinancialIntegrationApi.toggleAppointmentFinancialAutomation(
        clinic?.id || '',
        enabled
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['appointment_financial_rules', clinic?.id],
      });
    },
  });
}

// ============================================================================
// COMPOSITE HOOKS
// ============================================================================

/**
 * Hook for appointment financial status
 * Returns combined data about appointment's financial state
 */
export function useAppointmentFinancialStatus(appointmentId?: string) {
  const { data: mapping, isLoading: mappingLoading } =
    useAppointmentReceivableMapping(appointmentId);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [values, setValues] = useState<FinancialCalculation | null>(null);

  const validateMutation = useValidateAppointment();
  const calculateMutation = useCalculateAppointmentReceivableValues();
  const { clinic } = useClinicContext();

  const loadStatus = useCallback(async () => {
    if (!appointmentId || !clinic?.id) return;

    try {
      const [validationResult, valuesResult] = await Promise.all([
        appointmentFinancialIntegrationApi.validateAppointmentForReceivable(
          appointmentId
        ),
        appointmentFinancialIntegrationApi.calculateAppointmentReceivableValues(
          appointmentId,
          clinic.id
        ),
      ]);

      setValidation(validationResult);
      setValues(valuesResult);
    } catch (err) {
      console.error('Error loading financial status:', err);
    }
  }, [appointmentId, clinic?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return {
    mapping,
    validation,
    values,
    isLoading: mappingLoading,
    hasMapping: !!mapping,
    isValid: validation?.valid || false,
    reload: loadStatus,
  };
}

/**
 * Hook for financial automation settings
 * Returns rules and allows configuration
 */
export function useFinancialAutomationSettings(clinicId?: string) {
  const { clinic: contextClinic } = useClinicContext();
  const currentClinicId = clinicId || contextClinic?.id;

  const { data: rules, isLoading: rulesLoading } =
    useAppointmentFinancialRules(currentClinicId);

  const createRuleMutation = useCreateAppointmentFinancialRule();
  const updateRuleMutation = useUpdateAppointmentFinancialRule();
  const toggleMutation = useToggleAppointmentFinancialAutomation();

  return {
    rules: rules || [],
    isLoading: rulesLoading,
    isAutomationEnabled: (rules || []).some((r) => r.is_active),
    createRule: createRuleMutation.mutate,
    updateRule: updateRuleMutation.mutate,
    toggleAutomation: toggleMutation.mutate,
    isCreating: createRuleMutation.isPending,
    isUpdating: updateRuleMutation.isPending,
    isToggling: toggleMutation.isPending,
  };
}

/**
 * Hook for bulk operations and dashboard view
 */
export function useFinancialIntegrationDashboard(
  fromDate?: string,
  toDate?: string
) {
  const { data: stats, isLoading: statsLoading } =
    useAppointmentFinancialStats(fromDate, toDate);
  const { data: mappings, isLoading: mappingsLoading } =
    useAppointmentReceivableMappings({ fromDate, toDate });
  const { data: rules, isLoading: rulesLoading } =
    useAppointmentFinancialRules();

  return {
    stats,
    mappings: mappings || [],
    rules: rules || [],
    isLoading: statsLoading || mappingsLoading || rulesLoading,
    statsLoading,
    mappingsLoading,
    rulesLoading,
  };
}

export default {
  useAppointmentFinancialRules,
  useAppointmentReceivableMappings,
  useAppointmentReceivableMapping,
  useAppointmentFinancialStats,
  useCreateAppointmentFinancialRule,
  useUpdateAppointmentFinancialRule,
  useCreateReceivableFromAppointment,
  useValidateAppointment,
  useCalculateAppointmentReceivableValues,
  useRevertAppointmentReceivableMapping,
  useToggleAppointmentFinancialAutomation,
  useAppointmentFinancialStatus,
  useFinancialAutomationSettings,
  useFinancialIntegrationDashboard,
};
