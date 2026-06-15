/**
 * 🔀 InstallmentModal - Split into Installments
 *
 * Modal para parcelar uma conta a pagar em múltiplas parcelas.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Info } from 'lucide-react';
import { Payable } from '../../types';
import { useSplitPayableIntoInstallments } from '../../hooks/usePayables';
import { useClinicContext } from '@/contexts/ClinicContext';
import { formatCurrency } from '@/utils/formatters';

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: { installments: number }) => Promise<void>;
  payable?: Payable;
  isLoading?: boolean;
  error?: string;
}

export function InstallmentModal({
  isOpen,
  onClose,
  onSubmit,
  payable,
  isLoading = false,
  error,
}: InstallmentModalProps) {
  const { clinicId } = useClinicContext();
  const splitMutation = useSplitPayableIntoInstallments();
  const [installments, setInstallments] = useState<number>(payable?.installments || 2);

  const totalAmount = payable?.net_amount || 0;
  const valuePerInstallment = installments > 0 ? totalAmount / installments : 0;

  const handleSubmit = async () => {
    try {
      if (installments < 2) {
        alert('O número de parcelas deve ser no mínimo 2');
        return;
      }

      if (!payable || !clinicId) {
        alert('Dados inválidos');
        return;
      }

      // Usar mutation para split
      await splitMutation.mutateAsync({
        clinicId,
        payableId: payable.id,
        installmentsCount: installments,
      });

      // Callback do onSubmit se fornecido
      if (onSubmit) {
        await onSubmit({ installments });
      }

      onClose();
    } catch (err) {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Parcelar Conta</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {splitMutation.error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              {splitMutation.error instanceof Error ? splitMutation.error.message : 'Erro ao parcelar'}
            </span>
          </div>
        )}

        {payable && (
          <div className="space-y-4">
            {/* Informações da Conta */}
            <div className="p-3 bg-gray-50 rounded-md space-y-2">
              <div>
                <p className="text-xs text-gray-500">Fornecedor</p>
                <p className="text-sm font-semibold">{payable.supplier_name}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">Valor Total</p>
                <p className="text-lg font-bold text-blue-600">
                  R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Número de Parcelas */}
            <div>
              <Label htmlFor="installments">Número de Parcelas *</Label>
              <Input
                id="installments"
                type="number"
                min="2"
                max="120"
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Resumo de Parcelas */}
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200 space-y-2">
              <div className="text-sm">
                <p className="text-blue-700">
                  <strong>Prévia do parcelamento:</strong>
                </p>
                <p className="text-blue-600 mt-1">
                  {installments}x de{' '}
                  <span className="font-semibold">
                    R$ {valuePerInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </p>
                <p className="text-xs text-blue-500 mt-2">
                  Total: R$ {(valuePerInstallment * installments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Informações sobre as parcelas */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-md text-sm text-amber-700">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Nota:</strong> Ao parcelar, serão criadas {installments} contas a pagar independentes,
                uma para cada parcela. A primeira vencerá na data original, e as demais em intervalos mensais.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading || splitMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || splitMutation.isPending || !payable || installments < 2}>
            {isLoading || splitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Parcelar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InstallmentModal;
