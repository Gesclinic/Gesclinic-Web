/**
 * Financial Account Form Component
 * Handles creation and editing of financial accounts
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, DollarSign, Settings, Zap, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FinancialAccount,
  FinancialAccountCreateInput,
  FinancialAccountUpdateInput,
  AccountType,
  ACCOUNT_TYPE_LABELS,
} from '../types';

interface FinancialAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: FinancialAccount;
  onSubmit: (data: FinancialAccountCreateInput | FinancialAccountUpdateInput) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export const FinancialAccountForm = React.memo<FinancialAccountFormProps>(({
  open,
  onOpenChange,
  account,
  onSubmit,
  loading = false,
  error = null,
}) => {
  const isEdit = !!account;

  // Form state
  const [formData, setFormData] = useState<
    FinancialAccountCreateInput & { is_active?: boolean; is_default?: boolean; bank_code?: string; account_chart_code?: string; participates_cashflow?: boolean; allows_reconciliation?: boolean; balance_date?: string; credit_limit?: number }
  >({
    bank_name: '',
    account_name: '',
    account_type: AccountType.CHECKING,
    agency: '',
    account_number: '',
    pix_key: '',
    initial_balance: 0,
    currency: 'BRL',
    bank_code: '',
    account_chart_code: '',
    participates_cashflow: true,
    allows_reconciliation: true,
    balance_date: new Date().toISOString().split('T')[0],
    credit_limit: 0,
  });

  const [localError, setLocalError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form with existing account data
  useEffect(() => {
    if (account && isEdit) {
      setFormData({
        bank_name: account.bank_name,
        account_name: account.account_name,
        account_type: account.account_type,
        agency: account.agency || '',
        account_number: account.account_number,
        pix_key: account.pix_key || '',
        initial_balance: account.initial_balance,
        currency: account.currency,
        is_default: account.is_default,
        is_active: account.is_active,
        bank_code: (account as any).bank_code || '',
        account_chart_code: (account as any).account_chart_code || '',
        participates_cashflow: (account as any).participates_cashflow !== false,
        allows_reconciliation: (account as any).allows_reconciliation !== false,
        balance_date: (account as any).balance_date || new Date().toISOString().split('T')[0],
        credit_limit: (account as any).credit_limit || 0,
      });
    } else {
      setFormData({
        bank_name: '',
        account_name: '',
        account_type: AccountType.CHECKING,
        agency: '',
        account_number: '',
        pix_key: '',
        initial_balance: 0,
        currency: 'BRL',
        bank_code: '',
        account_chart_code: '',
        participates_cashflow: true,
        allows_reconciliation: true,
        balance_date: new Date().toISOString().split('T')[0],
        credit_limit: 0,
      });
    }
    setLocalError(null);
    setValidationErrors({});
  }, [account, isEdit, open]);

  // Validate form
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.bank_name?.trim()) {
      errors.bank_name = 'Nome do banco é obrigatório';
    }

    if (!formData.account_name?.trim()) {
      errors.account_name = 'Nome da conta é obrigatório';
    }

    if (!formData.account_number?.trim()) {
      errors.account_number = 'Número da conta é obrigatório';
    }

    if (!formData.account_type) {
      errors.account_type = 'Tipo de conta é obrigatório';
    }

    if (formData.initial_balance < 0) {
      errors.initial_balance = 'Saldo inicial não pode ser negativo';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setLocalError('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      setLocalError(null);

      // Prepare submission data
      const submitData = isEdit
        ? {
            bank_name: formData.bank_name,
            account_name: formData.account_name,
            account_type: formData.account_type,
            agency: formData.agency || undefined,
            account_number: formData.account_number,
            pix_key: formData.pix_key || undefined,
            initial_balance: formData.initial_balance,
            is_default: (formData as any).is_default,
            is_active: (formData as any).is_active,
            bank_code: formData.bank_code || undefined,
            account_chart_code: formData.account_chart_code || undefined,
            participates_cashflow: formData.participates_cashflow,
            allows_reconciliation: formData.allows_reconciliation,
            balance_date: formData.balance_date || undefined,
            credit_limit: formData.credit_limit || 0,
          }
        : {
            bank_name: formData.bank_name,
            account_name: formData.account_name,
            account_type: formData.account_type,
            agency: formData.agency || undefined,
            account_number: formData.account_number,
            pix_key: formData.pix_key || undefined,
            initial_balance: formData.initial_balance,
            currency: formData.currency,
            bank_code: formData.bank_code || undefined,
            account_chart_code: formData.account_chart_code || undefined,
            participates_cashflow: formData.participates_cashflow,
            allows_reconciliation: formData.allows_reconciliation,
            balance_date: formData.balance_date || undefined,
            credit_limit: formData.credit_limit || 0,
          };

      await onSubmit(submitData);
      onOpenChange(false);
    } catch (err: any) {
      setLocalError(err?.message || 'Erro ao salvar conta financeira');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Conta' : 'Nova Conta Financeira'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados da conta financeira'
              : 'Crie uma nova conta financeira (banco, caixa, carteira digital, etc.)'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Alert */}
          {(localError || error) && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{localError || error}</p>
            </div>
          )}

          {/* ===== SEÇÃO 1: DADOS BANCÁRIOS ===== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-blue-200">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-900">Dados Bancários</h3>
            </div>

            {/* Bank Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">
                  Nome do Banco <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bank_name"
                  placeholder="ex: Banco do Brasil, Nubank..."
                  value={formData.bank_name}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_name: e.target.value })
                  }
                  className={validationErrors.bank_name ? 'border-red-500' : ''}
                />
                {validationErrors.bank_name && (
                  <p className="text-xs text-red-500">{validationErrors.bank_name}</p>
                )}
              </div>

              {/* Account Name */}
              <div className="space-y-2">
                <Label htmlFor="account_name">
                  Nome da Conta <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="account_name"
                  placeholder="ex: Conta Principal, Caixa Clínica..."
                  value={formData.account_name}
                  onChange={(e) =>
                    setFormData({ ...formData, account_name: e.target.value })
                  }
                  className={validationErrors.account_name ? 'border-red-500' : ''}
                />
                {validationErrors.account_name && (
                  <p className="text-xs text-red-500">{validationErrors.account_name}</p>
                )}
              </div>
            </div>

            {/* Type and Agency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_type">
                  Tipo de Conta <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.account_type} onValueChange={(value) =>
                  setFormData({ ...formData, account_type: value as AccountType })
                }>
                  <SelectTrigger className={validationErrors.account_type ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.account_type && (
                  <p className="text-xs text-red-500">{validationErrors.account_type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="agency">Agência</Label>
                <Input
                  id="agency"
                  placeholder="ex: 0001"
                  value={formData.agency}
                  onChange={(e) =>
                    setFormData({ ...formData, agency: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Account Number and PIX */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">
                  Número da Conta <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="account_number"
                  placeholder="ex: 12345678"
                  value={formData.account_number}
                  onChange={(e) =>
                    setFormData({ ...formData, account_number: e.target.value })
                  }
                  className={validationErrors.account_number ? 'border-red-500' : ''}
                />
                {validationErrors.account_number && (
                  <p className="text-xs text-red-500">{validationErrors.account_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pix_key">Chave PIX</Label>
                <Input
                  id="pix_key"
                  placeholder="ex: CPF, Email, Telefone..."
                  value={formData.pix_key}
                  onChange={(e) =>
                    setFormData({ ...formData, pix_key: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* ===== SEÇÃO 2: CONFIGURAÇÕES FINANCEIRAS ===== */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-green-200">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-semibold text-green-900">Configurações Financeiras</h3>
            </div>

            {/* Initial Balance and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial_balance">
                  Saldo Inicial <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="initial_balance"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.initial_balance}
                  onChange={(e) =>
                    setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })
                  }
                  className={validationErrors.initial_balance ? 'border-red-500' : ''}
                />
                {validationErrors.initial_balance && (
                  <p className="text-xs text-red-500">{validationErrors.initial_balance}</p>
                )}
              </div>

              {!isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Select value={formData.currency} onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (BRL) - R$</SelectItem>
                      <SelectItem value="USD">Dólar (USD) - $</SelectItem>
                      <SelectItem value="EUR">Euro (EUR) - €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Balance Date and Credit Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="balance_date">Data Saldo Inicial</Label>
                <Input
                  id="balance_date"
                  type="date"
                  lang="pt-BR"
                  value={formData.balance_date || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, balance_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit_limit">Limite Crédito (R$)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.credit_limit || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          {/* ===== SEÇÃO 3: INTEGRAÇÃO CONTÁBIL ===== */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-purple-200">
              <Settings className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-purple-900">Integração Contábil</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_code">Código Banco</Label>
                <Input
                  id="bank_code"
                  placeholder="ex: 001, 237, 341"
                  value={formData.bank_code || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_code: e.target.value })
                  }
                  maxLength={4}
                />
                <p className="text-xs text-gray-500">Código BACEN do banco</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_chart_code">Conta Contábil</Label>
                <Input
                  id="account_chart_code"
                  placeholder="ex: 1.1.2.010"
                  value={formData.account_chart_code || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, account_chart_code: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">Código do plano de contas</p>
              </div>
            </div>
          </div>

          {/* ===== SEÇÃO 4: CONFIGURAÇÕES OPERACIONAIS ===== */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-orange-200">
              <Zap className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-semibold text-orange-900">Configurações Operacionais</h3>
            </div>

            {/* Main operational checkboxes - always visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                <Checkbox
                  id="participates_cashflow"
                  checked={formData.participates_cashflow !== false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, participates_cashflow: !!checked })
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="participates_cashflow" className="font-medium cursor-pointer block">
                    Fluxo de Caixa
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">Incluir em previsões de fluxo</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                <Checkbox
                  id="allows_reconciliation"
                  checked={formData.allows_reconciliation !== false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allows_reconciliation: !!checked })
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="allows_reconciliation" className="font-medium cursor-pointer block">
                    Conciliação
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">Permitir reconciliação bancária</p>
                </div>
              </div>
            </div>

            {/* Edit-only operational checkboxes */}
            {isEdit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors">
                  <Checkbox
                    id="is_default"
                    checked={(formData as any).is_default || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_default: !!checked } as any)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="is_default" className="font-medium cursor-pointer block">
                      ⭐ Conta Padrão
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">Será a principal da clínica</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  <Checkbox
                    id="is_active"
                    checked={(formData as any).is_active !== false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: !!checked } as any)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="is_active" className="font-medium cursor-pointer block">
                      ✓ Ativa
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">Conta operacional ativa</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Atualizar' : 'Criar Conta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
