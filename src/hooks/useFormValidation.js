import { useState, useCallback, useMemo } from 'react';

/**
 * Hook para validação avançada de formulários
 * Suporta validações síncronas e assincronas com feedback em tempo real
 */
export function useFormValidation(initialValues = {}, onValidate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [validating, setValidating] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Executa validações para um campo
  const validateField = useCallback(async (fieldName, fieldValue) => {
    if (!onValidate) return null;

    setValidating(prev => ({ ...prev, [fieldName]: true }));
    
    try {
      const result = await onValidate(fieldName, fieldValue, values);
      
      if (result.error) {
        setErrors(prev => ({ ...prev, [fieldName]: result.error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
      
      return result;
    } finally {
      setValidating(prev => ({ ...prev, [fieldName]: false }));
    }
  }, [onValidate, values]);

  // Valida todos os campos
  const validateAll = useCallback(async () => {
    if (!onValidate) return true;

    const allFields = Object.keys(values);
    const results = await Promise.all(
      allFields.map(field => validateField(field, values[field]))
    );

    return results.every(r => !r?.error);
  }, [values, validateField, onValidate]);

  // Atualiza um campo
  const setFieldValue = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    setIsDirty(true);
    
    // Validar o campo se foi tocado
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  }, [touched, validateField]);

  // Marca um campo como tocado
  const setFieldTouched = useCallback((fieldName, isTouched = true) => {
    setTouched(prev => ({ ...prev, [fieldName]: isTouched }));
    
    if (isTouched && values[fieldName] !== undefined) {
      validateField(fieldName, values[fieldName]);
    }
  }, [values, validateField]);

  // Reseta o formulário
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [initialValues]);

  // Status do formulário
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);
  const isValidating = useMemo(() => Object.values(validating).some(v => v), [validating]);

  return {
    values,
    errors,
    touched,
    validating,
    isDirty,
    isValid,
    isValidating,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateAll,
    resetForm,
  };
}

/**
 * Validadores pré-built para uso comum
 */
export const validators = {
  required: (label) => (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return { error: `${label} é obrigatório` };
    }
    return { error: null };
  },

  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return { error: 'Email inválido' };
    }
    return { error: null };
  },

  minLength: (min, label) => (value) => {
    if (value && value.length < min) {
      return { error: `${label} deve ter no mínimo ${min} caracteres` };
    }
    return { error: null };
  },

  maxLength: (max, label) => (value) => {
    if (value && value.length > max) {
      return { error: `${label} deve ter no máximo ${max} caracteres` };
    }
    return { error: null };
  },

  phone: (value) => {
    if (value) {
      const phoneRegex = /^(\(?\d{2}\)?|\d{2})?\s*\d{4,5}-?\d{4}$/;
      if (!phoneRegex.test(value.replace(/\D/g, ''))) {
        return { error: 'Telefone inválido (use formato: (11) 9999-9999)' };
      }
    }
    return { error: null };
  },

  date: (value) => {
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { error: 'Data inválida' };
      }
    }
    return { error: null };
  },

  timeRange: (startTime, endTime) => {
    if (startTime && endTime) {
      if (startTime >= endTime) {
        return { error: 'Hora final deve ser maior que a inicial' };
      }
    }
    return { error: null };
  },

  cpf: (value) => {
    if (value) {
      const cpf = value.replace(/\D/g, '');
      if (cpf.length !== 11) {
        return { error: 'CPF deve ter 11 dígitos' };
      }
      // Validar dígitos verificadores
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf[i]) * (10 - i);
      }
      let remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (parseInt(cpf[9]) !== remainder) {
        return { error: 'CPF inválido' };
      }
    }
    return { error: null };
  },

  number: (value) => {
    if (value !== null && value !== undefined && value !== '') {
      if (isNaN(value)) {
        return { error: 'Deve ser um número' };
      }
    }
    return { error: null };
  },

  min: (min, label) => (value) => {
    if (value !== null && value !== undefined && Number(value) < min) {
      return { error: `${label} deve ser no mínimo ${min}` };
    }
    return { error: null };
  },

  max: (max, label) => (value) => {
    if (value !== null && value !== undefined && Number(value) > max) {
      return { error: `${label} deve ser no máximo ${max}` };
    }
    return { error: null };
  },
};

/**
 * Validador composto que combina múltiplos validadores
 */
export function composeValidators(...validatorFns) {
  return (value) => {
    for (const validator of validatorFns) {
      const result = validator(value);
      if (result.error) return result;
    }
    return { error: null };
  };
}
