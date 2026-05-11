/**
 * 🎣 HOOKS PARA INTEGRAÇÃO FINANCEIRA - AGENDA
 * ============================================
 *
 * Hooks React para gerenciar dados financeiros sem ativar automações
 * Preparado para integração futura com módulo Financeiro
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AppointmentWithFinancial,
  FinancialValidationResult,
  AppointmentEvent,
} from '../types/financial';
import {
  validateAppointmentForFinancial,
  prepareAppointmentForBilling,
} from '../services/financialIntegration.service';
import { appointmentEventBus } from '../services/appointmentEvents.service';

// ============================================================================
// 1. HOOK PARA VALIDAÇÃO FINANCEIRA
// ============================================================================

/**
 * useAppointmentFinancialValidation
 *
 * Valida agendamento para integração financeira
 * Apenas validação - sem efeitos colaterais
 */
export function useAppointmentFinancialValidation(
  appointment?: AppointmentWithFinancial
) {
  const [validation, setValidation] = useState<FinancialValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async () => {
    if (!appointment) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await validateAppointmentForFinancial(appointment);
      setValidation(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setError(message);
      console.error('Financial validation error:', err);
    } finally {
      setIsValidating(false);
    }
  }, [appointment]);

  // Auto-validate quando appointment muda
  useEffect(() => {
    validate();
  }, [appointment?.id, appointment?.status, appointment?.payer_id, validate]);

  return {
    validation,
    isValidating,
    error,
    refresh: validate,
  };
}

// ============================================================================
// 2. HOOK PARA PREPARAÇÃO DE BILLING
// ============================================================================

/**
 * useAppointmentBillingPreparation
 *
 * Prepara dados para envio ao Financeiro
 * Apenas prepara - não envia nada
 */
export function useAppointmentBillingPreparation(
  appointment?: AppointmentWithFinancial
) {
  const [billingData, setBillingData] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prepare = useCallback(async () => {
    if (!appointment) {
      setBillingData(null);
      return;
    }

    setIsPreparing(true);
    setError(null);

    try {
      const data = await prepareAppointmentForBilling(appointment);
      setBillingData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preparation failed';
      setError(message);
      console.error('Billing preparation error:', err);
    } finally {
      setIsPreparing(false);
    }
  }, [appointment?.id, appointment?.status]);

  // Auto-prepare quando appointment muda
  useEffect(() => {
    prepare();
  }, [appointment?.id, prepare]);

  return {
    billingData,
    isPreparing,
    error,
    refresh: prepare,
  };
}

// ============================================================================
// 3. HOOK PARA INSCRIÇÃO EM EVENTOS
// ============================================================================

/**
 * useAppointmentEvents
 *
 * Inscrever-se em eventos de agendamento
 * Read-only, apenas observa eventos
 */
export function useAppointmentEvents(
  eventTypes: any[],
  options?: {
    onEvent?: (event: AppointmentEvent) => void;
    enabled?: boolean;
  }
) {
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [isListening, setIsListening] = useState(false);
  const listenerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!options?.enabled) {
      return;
    }

    const handleEvent = async (event: AppointmentEvent) => {
      setEvents(prev => [...prev.slice(-99), event]); // Manter últimos 100

      if (options?.onEvent) {
        options.onEvent(event);
      }
    };

    try {
      const id = appointmentEventBus.subscribe(eventTypes, handleEvent, {
        priority: -1, // Baixa prioridade (observador apenas)
      });

      listenerIdRef.current = id;
      setIsListening(true);

      return () => {
        if (listenerIdRef.current) {
          appointmentEventBus.unsubscribe(listenerIdRef.current);
          setIsListening(false);
        }
      };
    } catch (error) {
      console.error('Error subscribing to events:', error);
      setIsListening(false);
    }
  }, [eventTypes, options?.enabled, options?.onEvent]);

  return {
    events,
    isListening,
    eventCount: events.length,
    clearEvents: () => setEvents([]),
  };
}

// ============================================================================
// 4. HOOK PARA STATUS FINANCEIRO
// ============================================================================

/**
 * useAppointmentFinancialStatus
 *
 * Gerenciar status financeiro do agendamento
 */
export function useAppointmentFinancialStatus(
  appointment?: AppointmentWithFinancial
) {
  const [status, setStatus] = useState<string | null>(
    appointment?.financial_status || null
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setStatus(appointment?.financial_status || null);
  }, [appointment?.financial_status]);

  const updateStatus = useCallback(
    async (newStatus: string) => {
      // Apenas para UI - não atualiza BD
      setIsUpdating(true);
      try {
        console.log(
          `📊 [PREVIEW] Would update financial status to: ${newStatus}`
        );
        setStatus(newStatus);
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return {
    status,
    isUpdating,
    updateStatus,
  };
}

// ============================================================================
// 5. HOOK PARA CAMPOS FINANCEIROS
// ============================================================================

/**
 * useAppointmentFinancialFields
 *
 * Gerenciar campos financeiros do agendamento
 */
export function useAppointmentFinancialFields(
  appointment?: AppointmentWithFinancial
) {
  const [fields, setFields] = useState({
    estimated_value: appointment?.estimated_value,
    payer_type: appointment?.payer_type,
    payer_id: appointment?.payer_id,
    authorization_code: appointment?.authorization_code,
    guide_number: appointment?.guide_number,
    attendance_type: appointment?.attendance_type,
    procedure_code: appointment?.procedure_code,
  });

  useEffect(() => {
    setFields({
      estimated_value: appointment?.estimated_value,
      payer_type: appointment?.payer_type,
      payer_id: appointment?.payer_id,
      authorization_code: appointment?.authorization_code,
      guide_number: appointment?.guide_number,
      attendance_type: appointment?.attendance_type,
      procedure_code: appointment?.procedure_code,
    });
  }, [appointment]);

  const updateField = useCallback(
    (field: string, value: any) => {
      setFields(prev => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  return {
    fields,
    updateField,
    hasChanges: JSON.stringify(fields) !== JSON.stringify({
      estimated_value: appointment?.estimated_value,
      payer_type: appointment?.payer_type,
      payer_id: appointment?.payer_id,
      authorization_code: appointment?.authorization_code,
      guide_number: appointment?.guide_number,
      attendance_type: appointment?.attendance_type,
      procedure_code: appointment?.procedure_code,
    }),
  };
}

// ============================================================================
// 6. HOOK PARA INTEGRAÇÃO FINANCEIRA COMPLETA
// ============================================================================

/**
 * useAppointmentFinancial
 *
 * Hook completo para integração financeira
 * Combina validação, preparação, status e campos
 */
export function useAppointmentFinancial(
  appointment?: AppointmentWithFinancial,
  options?: {
    autoValidate?: boolean;
    autoPrepareBilling?: boolean;
    listenToEvents?: boolean;
  }
) {
  const {
    validation,
    isValidating: validating,
    error: validationError,
    refresh: revalidate,
  } = useAppointmentFinancialValidation(
    options?.autoValidate !== false ? appointment : undefined
  );

  const {
    billingData,
    isPreparing,
    error: billingError,
    refresh: reprepreBilling,
  } = useAppointmentBillingPreparation(
    options?.autoPrepareBilling !== false ? appointment : undefined
  );

  const { status, isUpdating, updateStatus } = useAppointmentFinancialStatus(
    appointment
  );

  const { fields, updateField, hasChanges } = useAppointmentFinancialFields(
    appointment
  );

  const { events } = useAppointmentEvents(
    [
      'appointment.created',
      'appointment.checked_in',
      'appointment.completed',
      'appointment.cancelled',
    ],
    { enabled: options?.listenToEvents !== false }
  );

  return {
    // Validação
    validation,
    isValidating: validating,
    validationError,
    revalidate,

    // Billing
    billingData,
    isPreparing,
    billingError,
    rePrepare: reprepreBilling,

    // Status
    status,
    isUpdating,
    updateStatus,

    // Campos
    fields,
    updateField,
    hasChanges,

    // Eventos
    events,

    // Helpers
    isReadyForBilling: validation?.is_billable && !validating,
    hasErrors: !!(validationError || billingError),
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  useAppointmentFinancialValidation,
  useAppointmentBillingPreparation,
  useAppointmentEvents,
  useAppointmentFinancialStatus,
  useAppointmentFinancialFields,
  useAppointmentFinancial,
};
