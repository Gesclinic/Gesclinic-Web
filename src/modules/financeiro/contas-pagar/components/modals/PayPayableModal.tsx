import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { AlertCircle, Loader2 } from 'lucide-react';
import { Payable, PaymentMethodType } from '../../types';
import { usePayPayable } from '../../hooks/usePayables';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { labelPaymentMethod } from '../../utils/labels';

interface PayPayableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable: Payable | null;
  onSuccess?: () => void;
}

export const PayPayableModal: React.FC<PayPayableModalProps> = ({
  open,
  onOpenChange,
  payable,
  onSuccess,
}) => {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(PaymentMethodType.PIX);
  const [paymentBank, setPaymentBank] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const payMutation = usePayPayable();
  const { user } = useAuth();

  if (!payable) return null;

  const remainingBalance = payable.balance_amount || 0;
  const isFullPayment = paymentAmount === remainingBalance.toString();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPaymentAmount('');
      setPaymentMethod(PaymentMethodType.PIX);
      setPaymentBank('');
      setNotes('');
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const amount = parseFloat(paymentAmount);

    if (!paymentAmount || amount <= 0) {
      newErrors.paymentAmount = 'Valor deve ser maior que 0';
    }
    if (amount > remainingBalance) {
      newErrors.paymentAmount = `Valor não pode ser superior a R$ ${remainingBalance.toFixed(2)}`;
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
      await payMutation.mutateAsync({
        id: payable.id,
        paidValue: parseFloat(paymentAmount),
        paymentMethod,
        paidBy: user?.id,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentBank: paymentBank || undefined,
        notes: notes || undefined,
      });

      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error processing payment:', error);
      setErrors({ submit: 'Erro ao processar pagamento. Tente novamente.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payable Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fornecedor:</span>
              <span className="font-medium">{payable.supplier_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Descrição:</span>
              <span className="font-medium">{payable.description}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Vencimento:</span>
              <span className="font-medium">
                {new Date(payable.due_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-blue-200 pt-2 mt-2">
              <span>Saldo Pendente:</span>
              <span className="text-blue-700">R$ {remainingBalance.toFixed(2)}</span>
            </div>
          </div>

          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">{errors.submit}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Valor a Pagar *</Label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-gray-100 rounded border border-gray-300">
                  R$
                </span>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                    if (errors.paymentAmount) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.paymentAmount;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="0,00"
                  className={errors.paymentAmount ? 'border-red-500' : ''}
                />
              </div>
              {errors.paymentAmount && (
                <p className="text-xs text-red-600">{errors.paymentAmount}</p>
              )}
              <div className="flex justify-between text-xs text-gray-500">
                <button
                  type="button"
                  onClick={() => setPaymentAmount(remainingBalance.toString())}
                  className="text-blue-600 hover:underline"
                >
                  Pagar tudo ({remainingBalance.toFixed(2)})
                </button>
              </div>
            </div>

            {/* Payment Status Preview */}
            {paymentAmount && !errors.paymentAmount && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                {isFullPayment ? (
                  <p className="text-green-700">Status após pagamento: <span className="font-bold">PAGO</span></p>
                ) : (
                  <p className="text-green-700">
                    Status após pagamento: <span className="font-bold">PARCIAL</span> - Restará R$ {(remainingBalance - parseFloat(paymentAmount)).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentMethodType).map((method) => (
                    <SelectItem key={method} value={method}>
                      {labelPaymentMethod(method)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Bank */}
            <div className="space-y-2">
              <Label htmlFor="paymentBank">Banco/Instituição</Label>
              <Input
                id="paymentBank"
                value={paymentBank}
                onChange={(e) => setPaymentBank(e.target.value)}
                placeholder="Ex: Banco do Brasil"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ref. comprovante, protocolo, etc"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={payMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={payMutation.isPending || !paymentAmount}>
                {payMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrar Pagamento
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayPayableModal;
