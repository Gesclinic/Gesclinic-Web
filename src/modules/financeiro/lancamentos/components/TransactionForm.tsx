/**
 * TransactionForm Component
 * Formulário para criar e editar transações financeiras
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  FinancialTransaction,
  FinancialTransactionCreateInput,
  FinancialTransactionUpdateInput,
  TransactionType,
  MovementType,
  TransactionStatus,
  TRANSACTION_TYPE_LABELS,
  MOVEMENT_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
} from '../types';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: FinancialTransaction;
  accounts: any[];
  categories: any[];
  costCenters: any[];
  onSubmit: (
    data: FinancialTransactionCreateInput | FinancialTransactionUpdateInput
  ) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export const TransactionForm = React.memo<TransactionFormProps>(({
  open,
  onOpenChange,
  transaction,
  accounts,
  categories,
  costCenters,
  onSubmit,
  loading = false,
  error: externalError = null,
}) => {
  const isEdit = !!transaction;

  const [formData, setFormData] = useState<
    FinancialTransactionCreateInput & { status?: TransactionStatus }
  >({
    financial_account_id: '',
    transaction_type: TransactionType.EXPENSE,
    movement_type: MovementType.REALIZED,
    description: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const [localError, setLocalError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Inicializar com transação existente
  useEffect(() => {
    if (transaction && isEdit) {
      setFormData({
        financial_account_id: transaction.financial_account_id,
        transaction_type: transaction.transaction_type,
        movement_type: transaction.movement_type,
        category_id: transaction.category_id,
        cost_center_id: transaction.cost_center_id,
        description: transaction.description,
        document_number: transaction.document_number,
        amount: transaction.amount,
        transaction_date: transaction.transaction_date,
        due_date: transaction.due_date,
        competency_date: transaction.competency_date,
        notes: transaction.notes,
        status: transaction.status,
      });
    } else {
      setFormData({
        financial_account_id: '',
        transaction_type: TransactionType.EXPENSE,
        movement_type: MovementType.REALIZED,
        description: '',
        amount: 0,
        transaction_date: new Date().toISOString().split('T')[0],
      });
    }
    setLocalError(null);
    setValidationErrors({});
  }, [transaction, isEdit, open]);

  // Validação
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.financial_account_id?.trim()) {
      errors.financial_account_id = 'Conta financeira é obrigatória';
    }
    if (!formData.description?.trim()) {
      errors.description = 'Descrição é obrigatória';
    }
    if (formData.amount <= 0) {
      errors.amount = 'Valor deve ser maior que zero';
    }
    if (!formData.transaction_date) {
      errors.transaction_date = 'Data da transação é obrigatória';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enviar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLocalError(null);
      await onSubmit(formData);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar transação';
      setLocalError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Transação' : 'Nova Transação Financeira'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados da transação'
              : 'Crie um novo lançamento financeiro'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Erro */}
          {(localError || externalError) && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{localError || externalError}</p>
            </div>
          )}

          {/* Row 1: Conta e Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account">
                Conta Financeira <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.financial_account_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, financial_account_id: value })
                }
              >
                <SelectTrigger
                  className={validationErrors.financial_account_id ? 'border-red-500' : ''}
                >
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.financial_account_id && (
                <p className="text-xs text-red-500">{validationErrors.financial_account_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Tipo de Transação <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, transaction_type: value as TransactionType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSACTION_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Movimento e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="movement">Tipo de Movimento</Label>
              <Select
                value={formData.movement_type || MovementType.REALIZED}
                onValueChange={(value) =>
                  setFormData({ ...formData, movement_type: value as MovementType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MOVEMENT_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || TransactionStatus.PENDING}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as TransactionStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRANSACTION_STATUS_LABELS).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Descrição e Documento */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição <span className="text-red-500">*</span>
            </Label>
            <Input
              id="description"
              placeholder="ex: Pagamento de fornecedor, Entrada de consulta..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={validationErrors.description ? 'border-red-500' : ''}
            />
            {validationErrors.description && (
              <p className="text-xs text-red-500">{validationErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document">Número do Documento</Label>
              <Input
                id="document"
                placeholder="ex: NF123456"
                value={formData.document_number || ''}
                onChange={(e) =>
                  setFormData({ ...formData, document_number: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Valor (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
                className={validationErrors.amount ? 'border-red-500' : ''}
              />
              {validationErrors.amount && (
                <p className="text-xs text-red-500">{validationErrors.amount}</p>
              )}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">
                Data da Transação <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                placeholder="dd/mm/yyyy"
                lang="pt-BR"
                value={formData.transaction_date}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_date: e.target.value })
                }
                className={validationErrors.transaction_date ? 'border-red-500' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                placeholder="dd/mm/yyyy"
                lang="pt-BR"
                value={formData.due_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competency">Data de Competência</Label>
              <Input
                id="competency"
                type="date"
                placeholder="dd/mm/yyyy"
                lang="pt-BR"
                value={formData.competency_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, competency_date: e.target.value })
                }
              />
            </div>
          </div>

          {/* Categoria e Centro de Custo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_center">Centro de Custo</Label>
              <Select
                value={formData.cost_center_id || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, cost_center_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o centro" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre esta transação..."
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Atualizar' : 'Criar'} Transação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

TransactionForm.displayName = 'TransactionForm';
