import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Payable } from '../../types';
import { useCancelPayable } from '../../hooks/usePayables';

interface CancelPayableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable: Payable | null;
  onSuccess?: () => void;
}

export const CancelPayableModal: React.FC<CancelPayableModalProps> = ({
  open,
  onOpenChange,
  payable,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cancelMutation = useCancelPayable();

  if (!payable) return null;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!reason.trim()) {
      newErrors.reason = 'Motivo do cancelamento é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        id: payable.id,
        reason: reason,
      });

      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error canceling payable:', error);
      setErrors({ submit: 'Erro ao cancelar. Tente novamente.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar Conta a Pagar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Atenção: Esta ação não pode ser desfeita.</p>
              <p className="mt-1">A conta será marcada como cancelada e removida do fluxo de caixa.</p>
            </div>
          </div>

          {/* Payable Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fornecedor:</span>
              <span className="font-medium">{payable.supplier_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Descrição:</span>
              <span className="font-medium truncate">{payable.description}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Valor:</span>
              <span className="font-medium">R$ {payable.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Vencimento:</span>
              <span className="font-medium">
                {new Date(payable.due_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">{errors.submit}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo do Cancelamento *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errors.reason) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.reason;
                      return newErrors;
                    });
                  }
                }}
                placeholder="Descreva o motivo do cancelamento..."
                rows={4}
                className={errors.reason ? 'border-red-500' : ''}
              />
              {errors.reason && (
                <p className="text-xs text-red-600">{errors.reason}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={cancelMutation.isPending}
              >
                Manter
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cancelar Conta
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelPayableModal;
