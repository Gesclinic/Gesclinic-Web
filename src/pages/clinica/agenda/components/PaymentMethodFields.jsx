/**
 * Componente: PaymentMethodFields
 * Renderiza campos dinâmicos baseado na forma de pagamento selecionada
 * Com validações e máscaras automáticas
 */

import React, { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PAYMENT_METHOD_CONFIG,
  getPaymentMethodKey,
  PAYMENT_METHODS,
} from '@/lib/paymentMethodsConfig';

export function PaymentMethodFields({
  paymentMethod,
  paymentData,
  bankAccounts = [],
  onFieldChange,
  onCalculateChange = null,
}) {
  const config = PAYMENT_METHOD_CONFIG[paymentMethod];
  const methodKey = getPaymentMethodKey(paymentMethod);
  const methodData = paymentData[methodKey] || {};

  const handleFieldChange = useCallback(
    (fieldId, value) => {
      // Aplicar máscaras
      let finalValue = value;
      const field = config.fields.find((f) => f.id === fieldId);

      if (field?.mask === 'numeric') {
        finalValue = value.replace(/\D/g, '');
      }

      if (field?.maxLength) {
        finalValue = finalValue.substring(0, field.maxLength);
      }

      // Calcular troco para dinheiro
      if (
        paymentMethod === PAYMENT_METHODS.DINHEIRO &&
        fieldId === 'value_received' &&
        onCalculateChange
      ) {
        onCalculateChange(finalValue);
      }

      // Chamar handler com field name e value
      onFieldChange(fieldId, finalValue);
    },
    [paymentMethod, config.fields, onFieldChange, onCalculateChange],
  );

  if (!config) {
    return <div className="text-red-500">Forma de pagamento não reconhecida</div>;
  }

  return (
    <div
      className={`bg-${config.color}-50 border border-${config.color}-300 rounded-lg p-4 space-y-4`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-${config.color}-200">
        <span className="text-2xl">{config.icon}</span>
        <h3 className={`font-bold text-${config.color}-900`}>
          Dados do {config.label.split(' ')[1]}
        </h3>
      </div>

      {/* Warning se houver */}
      {config.warning && (
        <div
          className={`bg-${config.color === 'yellow' ? 'orange' : config.color}-100 border-l-4 border-${config.color === 'yellow' ? 'orange' : config.color}-500 p-3 text-sm`}
        >
          <p
            className={`font-semibold text-${config.color === 'yellow' ? 'orange' : config.color}-900`}
          >
            ⚠️ {config.warning}
          </p>
        </div>
      )}

      {/* Campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.fields.map((field) => (
          <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
            <Label className="text-sm font-semibold">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {field.type === 'text' && (
              <Input
                type="text"
                placeholder={field.placeholder || ''}
                value={methodData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                maxLength={field.maxLength}
                className="mt-1"
              />
            )}

            {field.type === 'number' && (
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={field.placeholder || '0.00'}
                value={methodData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                disabled={field.disabled}
                className={`mt-1 ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            )}

            {field.type === 'date' && (
              <Input
                type="date"
                value={methodData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="mt-1"
              />
            )}

            {field.type === 'datetime-local' && (
              <Input
                type="datetime-local"
                value={methodData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="mt-1"
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                placeholder={field.placeholder || ''}
                value={methodData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {field.type === 'select' && (
              <Select
                value={methodData[field.id] || ''}
                onValueChange={(value) => handleFieldChange(field.id, value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options &&
                    field.options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}

                  {/* Opções de contas bancárias para PIX */}
                  {field.id === 'bank_account' &&
                    bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} - {account.bank_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>

      {/* Valor (display only - vindo do appointment) */}
      <div className="bg-white rounded border border-gray-200 p-3 mt-4">
        <p className="text-xs text-gray-600">Valor da Transação</p>
        <p className="text-2xl font-bold text-green-600">{paymentData.amount}</p>
      </div>
    </div>
  );
}

export default PaymentMethodFields;
