import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Máscaras de Input para formatação automática
 * CPF, Telefone, Data, Valor monetário, etc
 */

/**
 * Aplica máscara de CPF
 * Entrada: "12345678901" → "123.456.789-01"
 */
export function maskCPF(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  }
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
}

/**
 * Aplica máscara de Telefone
 * Entrada: "11987654321" → "(11) 98765-4321"
 */
export function maskPhone(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

/**
 * Aplica máscara de CEP
 * Entrada: "01310100" → "01310-100"
 */
export function maskCEP(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '').slice(0, 8);
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
}

/**
 * Aplica máscara de Data
 * Entrada: "15012026" → "15/01/2026"
 */
export function maskDate(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '').slice(0, 8);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
}

/**
 * Aplica máscara de Valor Monetário
 * Entrada: "12345" → "R$ 123,45"
 */
export function maskCurrency(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  const number = parseInt(cleaned || '0', 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(number);
}

/**
 * Aplica máscara de CNPJ
 * Entrada: "12345678901234" → "12.345.678/0001-34"
 */
export function maskCNPJ(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  }
  if (cleaned.length <= 12) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(
      8
    )}`;
  }
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(
    8,
    12
  )}-${cleaned.slice(12)}`;
}

/**
 * Mapa de máscaras disponíveis
 */
export const masks = {
  cpf: maskCPF,
  phone: maskPhone,
  cep: maskCEP,
  date: maskDate,
  currency: maskCurrency,
  cnpj: maskCNPJ,
};

/**
 * Componente de Input com Máscara
 */
export function MaskedInput({
  label,
  maskType, // 'cpf', 'phone', 'cep', 'date', 'currency', 'cnpj', ou função custom
  value,
  onChange,
  onBlur,
  error,
  touched,
  required,
  placeholder,
  disabled,
  className = '',
  containerClassName = '',
  help,
  ...props
}) {
  const [isFocused, setIsFocused] = React.useState(false);

  // Resolver máscara
  const maskFn = typeof maskType === 'string' ? masks[maskType] : maskType;

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const maskedValue = maskFn ? maskFn(rawValue) : rawValue;
    onChange({
      target: {
        value: maskedValue,
        name: e.target.name,
      },
    });
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const showError = touched && error;
  const showSuccess = touched && !error && value;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Input
        value={value || ''}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`${
          showError
            ? 'border-red-300 focus:ring-red-200'
            : showSuccess
            ? 'border-green-300 focus:ring-green-200'
            : 'border-gray-300 focus:ring-blue-200'
        } ${className}`}
        {...props}
      />

      {help && <p className="text-xs text-gray-500">{help}</p>}
      {showError && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Grupo de Inputs Mascarados
 */
export function MaskedInputGroup({
  fields = [], // { name, label, maskType, ... }
  values,
  errors,
  touched,
  onChange,
  onBlur,
  columns = 2,
}) {
  return (
    <div className={`grid grid-cols-${columns} gap-4`}>
      {fields.map((field) => (
        <MaskedInput
          key={field.name}
          {...field}
          value={values[field.name]}
          error={errors[field.name]}
          touched={touched[field.name]}
          onChange={onChange}
          onBlur={onBlur}
        />
      ))}
    </div>
  );
}

/**
 * Exemplo de uso
 */
export function ExampleMaskedInputs() {
  const [values, setValues] = React.useState({
    cpf: '',
    phone: '',
    cep: '',
    date: '',
    value: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const fields = [
    {
      name: 'cpf',
      label: 'CPF',
      maskType: 'cpf',
      placeholder: '000.000.000-00',
      help: 'Apenas números',
    },
    {
      name: 'phone',
      label: 'Telefone',
      maskType: 'phone',
      placeholder: '(00) 00000-0000',
    },
    {
      name: 'cep',
      label: 'CEP',
      maskType: 'cep',
      placeholder: '00000-000',
    },
    {
      name: 'date',
      label: 'Data',
      maskType: 'date',
      placeholder: 'DD/MM/YYYY',
    },
    {
      name: 'value',
      label: 'Valor',
      maskType: 'currency',
      placeholder: 'R$ 0,00',
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-6">Exemplo: Inputs com Máscaras</h2>
      <MaskedInputGroup
        fields={fields}
        values={values}
        errors={{}}
        touched={{}}
        onChange={handleChange}
        onBlur={() => {}}
        columns={2}
      />
      <div className="mt-6 p-4 bg-gray-50 rounded text-sm">
        <pre>{JSON.stringify(values, null, 2)}</pre>
      </div>
    </div>
  );
}
