/**
 * 🔄 RecurrenceModal - Setup Recurring Rule
 *
 * Modal para configurar recorrência de uma despesa.
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
import { AlertCircle, Loader2, Info } from 'lucide-react';
import { Payable } from '../../types';
import { useSetupRecurringPayable } from '../../hooks/usePayables';
import { useClinicContext } from '@/contexts/ClinicContext';

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    recurrenceType: string;
    recurrenceInterval: number;
    recurrenceEndDate?: string;
  }) => Promise<void>;
  payable?: Payable;
  isLoading?: boolean;
  error?: string;
}

const RECURRENCE_TYPES = [
  { value: 'DAILY', label: 'Diária', interval: 'cada dia' },
  { value: 'WEEKLY', label: 'Semanal', interval: 'cada semana' },
  { value: 'BIWEEKLY', label: 'Quinzenal', interval: 'cada 15 dias' },
  { value: 'MONTHLY', label: 'Mensal', interval: 'cada mês' },
  { value: 'QUARTERLY', label: 'Trimestral', interval: 'cada trimestre' },
  { value: 'SEMIANNUAL', label: 'Semestral', interval: 'cada semestre' },
  { value: 'ANNUAL', label: 'Anual', interval: 'cada ano' },
];

export function RecurrenceModal({
  isOpen,
  onClose,
  onSubmit,
  payable,
  isLoading = false,
  error,
}: RecurrenceModalProps) {
  const { clinicId } = useClinicContext();
  const recurrenceMutation = useSetupRecurringPayable();
  const [recurrenceType, setRecurrenceType] = useState<string>('MONTHLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');

  const selectedType = RECURRENCE_TYPES.find((t) => t.value === recurrenceType);

  const handleSubmit = async () => {
    try {
      if (recurrenceInterval < 1) {
        alert('O intervalo deve ser no mínimo 1');
        return;
      }

      if (!payable || !clinicId) {
        alert('Dados inválidos');
        return;
      }

      // Usar mutation para setup recurrence
      await recurrenceMutation.mutateAsync({
        clinicId,
        payableId: payable.id,
        recurrenceType,
        recurrenceInterval,
        recurrenceEndDate: recurrenceEndDate || undefined,
      });

      // Callback do onSubmit se fornecido
      if (onSubmit) {
        await onSubmit({
          recurrenceType,
          recurrenceInterval,
          recurrenceEndDate,
        });
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
          <DialogTitle>Configurar Recorrência</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {recurrenceMutation.error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              {recurrenceMutation.error instanceof Error ? recurrenceMutation.error.message : 'Erro ao configurar recorrência'}
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
                <p className="text-xs text-gray-500">Descrição</p>
                <p className="text-sm text-gray-700">{payable.description}</p>
              </div>
            </div>

            {/* Tipo de Recorrência */}
            <div>
              <Label htmlFor="recurrenceType">Tipo de Recorrência *</Label>
              <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                <SelectTrigger id="recurrenceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Intervalo */}
            <div>
              <Label htmlFor="recurrenceInterval">Intervalo *</Label>
              <Input
                id="recurrenceInterval"
                type="number"
                min="1"
                max="999"
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-gray-500 mt-1">
                A despesa será criada {recurrenceInterval}x {selectedType?.interval || ''}
              </p>
            </div>

            {/* Data de Fim (Opcional) */}
            <div>
              <Label htmlFor="recurrenceEndDate">Data de Término (Opcional)</Label>
              <Input
                id="recurrenceEndDate"
                type="date"
                lang="pt-BR"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para recorrência indefinida
              </p>
            </div>

            {/* Info sobre recorrência */}
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200 flex gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p>
                  <strong>Como funciona:</strong> Uma vez configurada, essa despesa será gerada automaticamente
                  seguindo a recorrência definida.
                </p>
              </div>
            </div>

            {/* Resumo */}
            <div className="p-3 bg-amber-50 rounded-md text-sm text-amber-700">
              <p>
                <strong>Próxima geração:</strong> A primeira ocorrência será criada na data de vencimento
                ({payable.due_date}), e as demais seguirão o padrão configurado.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading || recurrenceMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || recurrenceMutation.isPending || !payable}>
            {isLoading || recurrenceMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar Recorrência'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecurrenceModal;
