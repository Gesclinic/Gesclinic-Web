/**
 * Componente: CheckInDialog
 * 
 * Dialog de confirmação para check-in de paciente
 * Mostra dados do paciente e confirma horário
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCheckIn } from '../hooks/useCheckIn';

interface CheckInDialogProps {
  open: boolean;
  appointment_id: string;
  clinic_id: string;
  patient_name?: string;
  scheduled_time?: string;
  onClose: (success: boolean) => void;
  onError?: (error: string) => void;
}

/**
 * Dialog de check-in
 * 
 * Mostra confirmação visual e permite adicionar notas
 */
const CheckInDialog = ({
  open,
  appointment_id,
  clinic_id,
  patient_name = 'Paciente',
  scheduled_time = '--:--',
  onClose,
  onError,
}: CheckInDialogProps) => {
  const [notes, setNotes] = useState('');
  const { loading, error, success, perform_checkin, reset } = useCheckIn(clinic_id);

  const handleCheckIn = async () => {
    try {
      await perform_checkin({
        appointment_id,
        notes: notes || undefined,
      });

      // Sucesso será refletido no estado
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao fazer check-in';
      onError?.(errorMsg);
    }
  };

  React.useEffect(() => {
    if (success && open) {
      // Fechar dialog após sucesso
      const timer = setTimeout(() => {
        setNotes('');
        reset();
        onClose(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [success, open, reset, onClose]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Fechar
      if (!loading) {
        setNotes('');
        reset();
        onClose(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📍 Confirmar Check-in
          </DialogTitle>
          <DialogDescription>
            Paciente chegou na recepção. Confirme os dados.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-600 bg-green-50">
            <AlertDescription className="text-green-800">
              ✅ Check-in realizado com sucesso!
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          {/* Informações do Paciente */}
          <div className="rounded-lg bg-purple-50 p-4">
            <div className="mb-2 text-sm font-medium text-gray-600">Paciente</div>
            <div className="mb-4 text-lg font-bold text-purple-900">{patient_name}</div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-600">Horário Agendado</div>
                <div className="text-base font-semibold text-gray-900">{scheduled_time}</div>
              </div>

              <div>
                <div className="text-xs text-gray-600">Check-in</div>
                <div className="text-base font-semibold text-gray-900">
                  {new Date().toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Notas Opcionais */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Notas (Opcional)
            </label>
            <Textarea
              placeholder="Ex: Paciente chegou cedo, trouxe acompanhante..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading || success}
              className="mt-2 resize-none"
              rows={3}
            />
          </div>

          {/* Status */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <span className="text-sm text-gray-600">Registrando check-in...</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading || success}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCheckIn}
            disabled={loading || success}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? 'Processando...' : success ? '✅ Realizado' : '📍 Confirmar Check-in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInDialog;
