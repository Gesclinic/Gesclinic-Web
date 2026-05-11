/**
 * 🪝 useAppointmentForm HOOK
 * =========================
 *
 * Hook para gerenciar estado e validação do formulário de agendamento
 * Encapsula lógica de form state, validation, dirty tracking
 */

import { useState, useCallback } from 'react';
import {
  AppointmentUI,
  AppointmentFormState,
  AppointmentModalMode,
  ValidationResult,
} from '../types';
import {
  validateAppointmentPayload,
  appointmentToUI,
} from '../services/appointments.service';

export interface UseAppointmentFormOptions {
  initialData?: AppointmentUI;
  mode?: AppointmentModalMode;
}

export interface UseAppointmentFormReturn {
  // Estado
  state: AppointmentFormState;

  // Getters
  formData: Partial<AppointmentUI>;
  errors: Record<string, string>;
  isDirty: boolean;
  isLoading: boolean;

  // Setters
  setFormData: (data: Partial<AppointmentUI>) => void;
  setFieldValue: (field: keyof AppointmentUI, value: any) => void;
  setErrors: (errors: Record<string, string>) => void;
  setIsLoading: (loading: boolean) => void;

  // Validação
  validate: () => ValidationResult;
  validateField: (field: keyof AppointmentUI) => string | null;

  // Operações
  reset: () => void;
  resetErrors: () => void;
  markClean: () => void;
}

export function useAppointmentForm(
  options?: UseAppointmentFormOptions
): UseAppointmentFormReturn {
  const { initialData, mode = 'create' } = options || {};

  // Estado inicial
  const initialFormState: AppointmentFormState = {
    mode,
    appointmentId: initialData?.id,
    formData: initialData || {},
    errors: {},
    isLoading: false,
    isDirty: false,
  };

  const [state, setState] = useState<AppointmentFormState>(initialFormState);

  // Setters
  const setFormData = useCallback((data: Partial<AppointmentUI>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data },
      isDirty: true,
    }));
  }, []);

  const setFieldValue = useCallback(
    (field: keyof AppointmentUI, value: any) => {
      setFormData({ [field]: value });
    },
    [setFormData]
  );

  const setErrors = useCallback((errors: Record<string, string>) => {
    setState(prev => ({
      ...prev,
      errors,
    }));
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  // Validação completa
  const validate = useCallback((): ValidationResult => {
    const result = validateAppointmentPayload(state.formData);

    if (!result.valid) {
      setErrors(result.errors);
    } else {
      setErrors({});
    }

    return result;
  }, [state.formData, setErrors]);

  // Validação de campo individual
  const validateField = useCallback(
    (field: keyof AppointmentUI): string | null => {
      const value = state.formData[field];

      // Campos obrigatórios
      const required = [
        'patientId',
        'professionalId',
        'scheduledDate',
        'scheduledTime',
      ];

      if (required.includes(field) && !value) {
        return `${field} é obrigatório`;
      }

      return null;
    },
    [state.formData]
  );

  // Reset
  const reset = useCallback(() => {
    setState(initialFormState);
  }, [initialFormState]);

  const resetErrors = useCallback(() => {
    setErrors({});
  }, [setErrors]);

  const markClean = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDirty: false,
    }));
  }, []);

  return {
    state,
    formData: state.formData,
    errors: state.errors,
    isDirty: state.isDirty,
    isLoading: state.isLoading,
    setFormData,
    setFieldValue,
    setErrors,
    setIsLoading,
    validate,
    validateField,
    reset,
    resetErrors,
    markClean,
  };
}

export default useAppointmentForm;
