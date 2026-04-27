/**
 * Componente: PaymentMethodFields
 * Renderiza campos dinâmicos baseado na forma de pagamento selecionada
 * Com validações e máscaras automáticas
 */

import React, { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAYMENT_METHOD_CONFIG, getPaymentMethodKey, PAYMENT_METHODS } from '@/lib/paymentMethodsConfig';
export function PaymentMethodFields({
  paymentMethod,
  paymentData,
  bankAccounts = [],
  onFieldChange,
  onCalculateChange = null
}) {
  const config = PAYMENT_METHOD_CONFIG[paymentMethod];
  const methodKey = getPaymentMethodKey(paymentMethod);
  const methodData = paymentData[methodKey] || {};
  const handleFieldChange = useCallback((fieldId, value) => {
    // Aplicar máscaras
    let finalValue = value;
    const field = config.fields.find(f => f.id === fieldId);
    if (field?.mask === 'numeric') {
      finalValue = value.replace(/\D/g, '');
    }
    if (field?.maxLength) {
      finalValue = finalValue.substring(0, field.maxLength);
    }

    // Calcular troco para dinheiro
    if (paymentMethod === PAYMENT_METHODS.DINHEIRO && fieldId === 'value_received' && onCalculateChange) {
      onCalculateChange(finalValue);
    }

    // Chamar handler com field name e value
    onFieldChange(fieldId, finalValue);
  }, [paymentMethod, config.fields, onFieldChange, onCalculateChange]);
  if (!config) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-red-500"
    }, "Forma de pagamento n\xE3o reconhecida");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: `bg-${config.color}-50 border border-${config.color}-300 rounded-lg p-4 space-y-4`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 pb-3 border-b border-${config.color}-200"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, config.icon), /*#__PURE__*/React.createElement("h3", {
    className: `font-bold text-${config.color}-900`
  }, "Dados do ", config.label.split(' ')[1])), config.warning && /*#__PURE__*/React.createElement("div", {
    className: `bg-${config.color === 'yellow' ? 'orange' : config.color}-100 border-l-4 border-${config.color === 'yellow' ? 'orange' : config.color}-500 p-3 text-sm`
  }, /*#__PURE__*/React.createElement("p", {
    className: `font-semibold text-${config.color === 'yellow' ? 'orange' : config.color}-900`
  }, "\u26A0\uFE0F ", config.warning)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, config.fields.map(field => /*#__PURE__*/React.createElement("div", {
    key: field.id,
    className: field.type === 'textarea' ? 'md:col-span-2' : ''
  }, /*#__PURE__*/React.createElement(Label, {
    className: "text-sm font-semibold"
  }, field.label, field.required && /*#__PURE__*/React.createElement("span", {
    className: "text-red-500 ml-1"
  }, "*")), field.type === 'text' && /*#__PURE__*/React.createElement(Input, {
    type: "text",
    placeholder: field.placeholder || '',
    value: methodData[field.id] || '',
    onChange: e => handleFieldChange(field.id, e.target.value),
    maxLength: field.maxLength,
    className: "mt-1"
  }), field.type === 'number' && /*#__PURE__*/React.createElement(Input, {
    type: "number",
    step: "0.01",
    min: "0",
    placeholder: field.placeholder || '0.00',
    value: methodData[field.id] || '',
    onChange: e => handleFieldChange(field.id, e.target.value),
    disabled: field.disabled,
    className: `mt-1 ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`
  }), field.type === 'date' && /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: methodData[field.id] || '',
    onChange: e => handleFieldChange(field.id, e.target.value),
    className: "mt-1"
  }), field.type === 'datetime-local' && /*#__PURE__*/React.createElement(Input, {
    type: "datetime-local",
    value: methodData[field.id] || '',
    onChange: e => handleFieldChange(field.id, e.target.value),
    className: "mt-1"
  }), field.type === 'textarea' && /*#__PURE__*/React.createElement("textarea", {
    placeholder: field.placeholder || '',
    value: methodData[field.id] || '',
    onChange: e => handleFieldChange(field.id, e.target.value),
    rows: 3,
    className: "mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  }), field.type === 'select' && /*#__PURE__*/React.createElement(Select, {
    value: methodData[field.id] || '',
    onValueChange: value => handleFieldChange(field.id, value)
  }, /*#__PURE__*/React.createElement(SelectTrigger, {
    className: "mt-1"
  }, /*#__PURE__*/React.createElement(SelectValue, {
    placeholder: `Selecione ${field.label.toLowerCase()}`
  })), /*#__PURE__*/React.createElement(SelectContent, null, field.options && field.options.map(option => /*#__PURE__*/React.createElement(SelectItem, {
    key: option.id,
    value: option.id
  }, option.label)), field.id === 'bank_account' && bankAccounts.map(account => /*#__PURE__*/React.createElement(SelectItem, {
    key: account.id,
    value: account.id
  }, account.account_name, " - ", account.bank_name))))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded border border-gray-200 p-3 mt-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Valor da Transa\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-green-600"
  }, paymentData.amount)));
}
export default PaymentMethodFields;