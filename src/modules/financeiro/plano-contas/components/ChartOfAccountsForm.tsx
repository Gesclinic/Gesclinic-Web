/**
 * Component: ChartOfAccountsForm
 * Form for creating and editing accounts
 */

import React, { useState, useEffect } from 'react';
import {
  ChartOfAccount,
  ChartOfAccountCreateInput,
  ChartOfAccountUpdateInput,
  AccountType,
  AccountNature,
} from '../types';
import { Plus, X } from 'lucide-react';

interface ChartOfAccountsFormProps {
  account?: ChartOfAccount;
  parentAccount?: ChartOfAccount;
  availableParents?: ChartOfAccount[];
  onSubmit: (data: ChartOfAccountCreateInput | ChartOfAccountUpdateInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const ACCOUNT_TYPES: AccountType[] = ['RECEITA', 'DESPESA', 'ATIVO', 'PASSIVO', 'PATRIMONIO'];
const ACCOUNT_NATURES: AccountNature[] = ['CREDORA', 'DEVEDORA'];

export const ChartOfAccountsForm: React.FC<ChartOfAccountsFormProps> = ({
  account,
  parentAccount,
  availableParents = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
}) => {
  const isEdit = !!account;

  const getDescriptionValue = (value?: string | null, fallbackName?: string) => {
    const trimmed = (value || '').trim();
    if (trimmed) return value as string;
    return (fallbackName || '').trim();
  };

  const [formData, setFormData] = useState({
    code: account?.code || '',
    name: account?.name || '',
    description: getDescriptionValue(account?.description, account?.name),
    type: (account?.type as AccountType) || ('RECEITA' as AccountType),
    nature: (account?.nature as AccountNature) || ('CREDORA' as AccountNature),
    parent_id: account?.parent_id || parentAccount?.id || null,
    is_active: account?.is_active ?? true,
    accepts_entries: account?.accepts_entries ?? false,
  });

  useEffect(() => {
    setFormData({
      code: account?.code || '',
      name: account?.name || '',
      description: getDescriptionValue(account?.description, account?.name),
      type: (account?.type as AccountType) || ('RECEITA' as AccountType),
      nature: (account?.nature as AccountNature) || ('CREDORA' as AccountNature),
      parent_id: account?.parent_id || parentAccount?.id || null,
      is_active: account?.is_active ?? true,
      accepts_entries: account?.accepts_entries ?? false,
    });
  }, [account, parentAccount]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.code.trim()) {
      errors.code = 'Código é obrigatório';
    } else if (!/^[\d.]+$/.test(formData.code)) {
      errors.code = 'Código deve conter apenas números e pontos';
    }

    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }

    if (!formData.type) {
      errors.type = 'Tipo é obrigatório';
    }

    if (!formData.nature) {
      errors.nature = 'Natureza é obrigatória';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData = isEdit
        ? {
            code: formData.code,
            name: formData.name,
            description: formData.description || undefined,
            type: formData.type,
            nature: formData.nature,
            parent_id: formData.parent_id,
            is_active: formData.is_active,
            accepts_entries: formData.accepts_entries,
          }
        : {
            code: formData.code,
            name: formData.name,
            description: formData.description || undefined,
            type: formData.type,
            nature: formData.nature,
            parent_id: formData.parent_id,
          };

      await onSubmit(submitData);
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Code and Name Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código *
          </label>
          <input
            type="text"
            placeholder="1.1.01"
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg font-mono ${
              validationErrors.code
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            disabled={isLoading}
          />
          {validationErrors.code && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.code}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome *
          </label>
          <input
            type="text"
            placeholder="Nome da conta"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg ${
              validationErrors.name
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            disabled={isLoading}
          />
          {validationErrors.name && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.name}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrição
        </label>
        <textarea
          placeholder="Descrição ou observações sobre esta conta"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={isLoading}
        />
      </div>

      {/* Type and Nature Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo *
          </label>
          <select
            aria-label="Tipo da conta"
            title="Tipo da conta"
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value as AccountType)}
            className={`w-full px-3 py-2 border rounded-lg ${
              validationErrors.type
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            disabled={isLoading}
          >
            <option value="">Selecione um tipo</option>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {validationErrors.type && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.type}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Natureza *
          </label>
          <select
            aria-label="Natureza da conta"
            title="Natureza da conta"
            value={formData.nature}
            onChange={(e) => handleChange('nature', e.target.value as AccountNature)}
            className={`w-full px-3 py-2 border rounded-lg ${
              validationErrors.nature
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            disabled={isLoading}
          >
            <option value="">Selecione uma natureza</option>
            {ACCOUNT_NATURES.map((nature) => (
              <option key={nature} value={nature}>
                {nature}
              </option>
            ))}
          </select>
          {validationErrors.nature && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.nature}</p>
          )}
        </div>
      </div>

      {/* Parent Account */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Conta Pai
        </label>
        <select
          aria-label="Conta pai"
          title="Conta pai"
          value={formData.parent_id || ''}
          onChange={(e) => handleChange('parent_id', e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          <option value="">Sem conta pai (Nível superior)</option>
          {availableParents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.code} - {parent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Checkboxes Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => handleChange('is_active', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
            disabled={isLoading}
          />
          <span className="text-sm font-medium text-gray-700">Ativa</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.accepts_entries}
            onChange={(e) => handleChange('accepts_entries', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
            disabled={isLoading}
          />
          <span className="text-sm font-medium text-gray-700">Aceita Lançamentos</span>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          <X className="w-4 h-4 inline mr-2" />
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border border-transparent border-t-white" />
              Salvando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              {isEdit ? 'Atualizar' : 'Criar'} Conta
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ChartOfAccountsForm;
