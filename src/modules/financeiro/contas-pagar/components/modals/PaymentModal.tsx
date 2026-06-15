/**
 * 💳 PaymentModal - Register Payment
 *
 * Modal para registrar pagamento de uma conta a pagar.
 * Suporta pagamento parcial e total.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Payable, PaymentMethodType } from '../../types';
import { labelPaymentMethod } from '../../utils/labels';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    paidValue: number;
    paymentMethod: string;
    paymentDate: string;
  }) => Promise<void>;
  payable?: Payable;
  isLoading?: boolean;
  error?: string;
}

const PAYMENT_METHODS = Object.values(PaymentMethodType).map((value) => ({
  value,
  label: labelPaymentMethod(value),
}));

export function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  payable,
  isLoading = false,
  error,
}: PaymentModalProps) {
  const [paidValue, setPaidValue] = useState<number>(payable?.balance_amount || 0);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const balanceAmount = payable?.balance_amount || 0;
  const isFullPayment = paidValue >= balanceAmount;
  const remainingBalance = balanceAmount - paidValue;

  const handleSubmit = async () => {
    try {
      if (paidValue <= 0) {
        alert('O valor do pagamento deve ser maior que zero');
        return;
      }

      if (paidValue > balanceAmount) {
        alert(`O valor não pode exceder o saldo devedor de R$ ${balanceAmount.toFixed(2)}`);
        return;
      }

      await onSubmit({
        paidValue,
        paymentMethod,
        paymentDate,
      });
      onClose();
    } catch (err) {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
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
              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-gray-500">Valor Total</p>
                  <p className="text-sm font-semibold">
                    R$ {(payable.net_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pago</p>
                  <p className="text-sm font-semibold">
                    R$ {(payable.paid_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Saldo</p>
                  <p className="text-sm font-semibold text-red-600">
                    R$ {balanceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Valor a Pagar */}
            <div>
              <Label htmlFor="paidValue">Valor a Pagar *</Label>
              <Input
                id="paidValue"
                type="number"
                step="0.01"
                value={paidValue}
                onChange={(e) => setPaidValue(parseFloat(e.target.value) || 0)}
                max={balanceAmount}
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">
                Máximo disponível: R$ {balanceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Status do Pagamento */}
            {paidValue > 0 && (
              <div
                className={`p-3 rounded-md border flex items-center gap-2 ${
                  isFullPayment
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <CheckCircle2
                  className={`w-4 h-4 ${isFullPayment ? 'text-green-600' : 'text-amber-600'}`}
                />
                <div className="text-sm">
                  {isFullPayment ? (
                    <p className="text-green-700">
                      <strong>Pagamento Completo</strong> - Saldo zerado
                    </p>
                  ) : (
                    <p className="text-amber-700">
                      <strong>Pagamento Parcial</strong> - Saldo restante:
                      <span className="ml-2 font-semibold">
                        R$ {remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Método de Pagamento */}
            <div>
              <Label htmlFor="paymentMethod">Método de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data do Pagamento */}
            <div>
              <Label htmlFor="paymentDate">Data do Pagamento *</Label>
              <Input
                id="paymentDate"
                type="date"
                lang="pt-BR"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !payable || paidValue <= 0}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Registrar Pagamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentModal;
