import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * Campo de formulário com validação em tempo real
 * Suporta input, select, textarea com feedback visual
 */
export function ValidatedFormField({
  label,
  name,
  type = 'text',
  value,
  error,
  touched,
  validating,
  onChange,
  onBlur,
  placeholder,
  required,
  disabled,
  options, // Para selects
  help, // Texto de ajuda
  icon: Icon, // Ícone no label
  maxLength,
  pattern,
  min,
  max,
  step,
  autoComplete,
  className = '',
  containerClassName = '',
  inputClassName = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);

  const showError = touched && error;
  const showSuccess = touched && !error && value && !validating;

  // Classes base
  const baseInputClass = `
    w-full px-3 py-2 border rounded-md text-sm
    transition-all duration-200
    focus:outline-none focus:ring-2
    disabled:bg-gray-50 disabled:cursor-not-allowed
    ${showError ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'}
    ${showSuccess ? 'border-green-300 focus:ring-green-200' : ''}
    ${inputClassName}
  `.trim();

  const containerClasses = `space-y-1.5 ${containerClassName}`.trim();

  const handleChange = (e) => {
    const newValue = e.target ? e.target.value : e;
    onChange(name, newValue);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(name);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  // Renderizar input baseado no type
  const renderInput = () => {
    if (type === 'select' && options) {
      // Ensure value is never an empty string - use undefined instead for unselected state
      const selectValue = (value && String(value).trim()) || undefined;

      return (
        <Select value={selectValue} onValueChange={handleChange} disabled={disabled}>
          <SelectTrigger className={baseInputClass}>
            <SelectValue placeholder={placeholder || 'Selecione...'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          name={name}
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={props.rows || 3}
          className={`${baseInputClass} resize-none`}
        />
      );
    }

    return (
      <Input
        type={type}
        name={name}
        value={value || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        pattern={pattern}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
        className={baseInputClass}
      />
    );
  };

  return (
    <div className={containerClasses}>
      {/* LABEL */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {Icon && <Icon className="w-4 h-4 text-gray-500" />}
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
        {validating && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            Validando...
          </div>
        )}
        {showSuccess && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            Válido
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="relative">
        {renderInput()}

        {/* STATUS ICON */}
        {!validating && (showError || showSuccess) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {showError ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </div>
        )}
      </div>

      {/* MENSAGENS */}
      <div className="text-xs">
        {showError && (
          <p className="text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
        {help && !showError && <p className="text-gray-500">{help}</p>}
        {type === 'textarea' && maxLength && (
          <p className="text-gray-400 text-right">
            {(value || '').length} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Versão simplificada para grids
 */
export function ValidatedFormFieldCompact({
  label,
  name,
  type = 'text',
  value,
  error,
  touched,
  validating,
  onChange,
  onBlur,
  placeholder,
  required,
  disabled,
  options,
  help,
  ...props
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <ValidatedFormField
        label=""
        name={name}
        type={type}
        value={value}
        error={error}
        touched={touched}
        validating={validating}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        options={options}
        help={help}
        containerClassName="space-y-0"
        inputClassName="text-sm"
        {...props}
      />
    </div>
  );
}

/**
 * Grupo de campos validados em grid
 */
export function ValidatedFormFieldGroup({
  fields,
  values,
  errors,
  touched,
  validating,
  onChange,
  onBlur,
  columns = 2,
  compact = false,
}) {
  const Component = compact ? ValidatedFormFieldCompact : ValidatedFormField;

  return (
    <div className={`grid grid-cols-${columns} gap-4`}>
      {fields.map((field) => (
        <Component
          key={field.name}
          {...field}
          value={values[field.name]}
          error={errors[field.name]}
          touched={touched[field.name]}
          validating={validating[field.name]}
          onChange={onChange}
          onBlur={onBlur}
        />
      ))}
    </div>
  );
}
