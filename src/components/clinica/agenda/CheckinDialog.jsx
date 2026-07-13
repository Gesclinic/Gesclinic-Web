import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DollarSign, CreditCard, CheckCheck, Landmark } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { labelForStatus, statusToCanonical } from '@/lib/statusLabels';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import cashDrawerApi from '@/lib/cashDrawerApi';

const fmtHour = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
const fmtCurrency = (value) =>
  value == null || Number.isNaN(+value)
    ? null
    : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const padDatePart = (value) => String(value).padStart(2, '0');
const getTodayIsoLocal = () => {
  const today = new Date();
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`;
};

const statusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'confirmed') {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (s === 'present' || s === 'presente') {
    return 'bg-teal-100 text-teal-800 border-teal-200';
  }
  if (s === 'in_office' || s === 'em consultório') {
    return 'bg-cyan-100 text-cyan-800 border-cyan-200';
  }
  if (s === 'scheduled') {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  if (s === 'attended') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (s === 'no_show') {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
  if (s === 'cancelled') {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export default function CheckinDialog({
  open,
  onOpenChange,
  appointment,
  onStatusChange,
  onPayment,
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [openCashDrawer, setOpenCashDrawer] = useState(null);
  const [cashDrawerLoading, setCashDrawerLoading] = useState(false);
  const [cashDrawerError, setCashDrawerError] = useState('');

  const clinicId = appointment?.clinic_id;
  const hasOpenCashDrawer = Boolean(openCashDrawer?.id);

  const refreshOpenCashDrawer = async () => {
    if (!clinicId || !user?.id) {
      setOpenCashDrawer(null);
      return null;
    }

    setCashDrawerLoading(true);
    setCashDrawerError('');
    try {
      const drawer = await cashDrawerApi.getDrawerForDate(clinicId, user.id, getTodayIsoLocal());
      setOpenCashDrawer(drawer);
      return drawer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao verificar caixa aberto.';
      setCashDrawerError(message);
      setOpenCashDrawer(null);
      return null;
    } finally {
      setCashDrawerLoading(false);
    }
  };

  const handleOpenCashDrawerShortcut = async () => {
    if (!clinicId || !user?.id) {
      setCashDrawerError('Não foi possível identificar usuário ou clínica para abrir o caixa.');
      return;
    }

    setCashDrawerLoading(true);
    setCashDrawerError('');
    try {
      const drawer = await cashDrawerApi.getOrCreateDrawer(clinicId, user.id, getTodayIsoLocal());
      setOpenCashDrawer(drawer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao abrir caixa do dia.';
      setCashDrawerError(message);
    } finally {
      setCashDrawerLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      refreshOpenCashDrawer();
    }
  }, [open, clinicId, user?.id]);

  if (!appointment) {
    return null;
  }

  const handlePayment = (method) => {
    if (!hasOpenCashDrawer) {
      setCashDrawerError('Abra o caixa do dia antes de registrar pagamento do atendimento.');
      return;
    }

    toast({
      title: 'Pagamento Registrado',
      description: `Pagamento com ${method} registrado para ${appointment.patient_name}.`,
    });
    onPayment?.(method);
    onOpenChange(false);
  };

  const handleStatusChange = (newStatus) => {
    const realId = appointment.id || appointment.appointment_id;
    if (!realId || String(realId).startsWith('free-')) {
      return;
    }
    onStatusChange?.(realId, newStatus);
  };

  const currentStatusCanonical = statusToCanonical(appointment.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--compact">
        <DialogHeader>
          <DialogTitle>Check-in: {appointment.patient_name}</DialogTitle>
          <DialogDescription>Gerenciar o status e o pagamento do agendamento.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p>
                <span className="font-medium">Serviço:</span> {appointment.service_name || '—'}
              </p>
              <p>
                <span className="font-medium">Convênio:</span> {appointment.payer_name || '—'}
              </p>
              <p>
                <span className="font-medium">Valor:</span> {fmtCurrency(appointment.price) ?? '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p>
                <span className="font-medium">Status:</span>{' '}
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusBadge(appointment.status)}`}
                >
                  {labelForStatus(appointment.status) || '—'}
                </span>
              </p>
              <p>
                <span className="font-medium">Horário:</span> {fmtHour(appointment.start_time)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold">Alterar Status:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={currentStatusCanonical === 'present' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('present')}
              >
                Presente
              </Button>
              <Button
                variant={currentStatusCanonical === 'in_office' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('in_office')}
              >
                Em Consultório
              </Button>
              <Button
                variant={currentStatusCanonical === 'confirmed' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('confirmed')}
              >
                Confirmado
              </Button>
              <Button
                variant={currentStatusCanonical === 'cancelled' ? 'destructive' : 'outline'}
                onClick={() => handleStatusChange('cancelled')}
              >
                Cancelar
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 mt-4 space-y-2">
            <p className="font-semibold">Registrar Pagamento:</p>
            <div className={`rounded-md border p-3 text-sm ${hasOpenCashDrawer ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{hasOpenCashDrawer ? 'Caixa aberto' : 'Caixa fechado'}</p>
                  <p className="text-xs mt-1">
                    {hasOpenCashDrawer
                      ? 'Pagamento liberado para o caixa do dia.'
                      : 'Abra o caixa do dia antes de registrar pagamento.'}
                  </p>
                  {cashDrawerError && <p className="text-xs font-semibold mt-2">{cashDrawerError}</p>}
                </div>
                {!hasOpenCashDrawer && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenCashDrawerShortcut}
                    disabled={cashDrawerLoading}
                  >
                    {cashDrawerLoading ? 'Abrindo...' : 'Abrir caixa do dia'}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!hasOpenCashDrawer} onClick={() => handlePayment('Dinheiro')}>
                <DollarSign className="w-4 h-4 mr-2" />
                Dinheiro
              </Button>
              <Button variant="outline" disabled={!hasOpenCashDrawer} onClick={() => handlePayment('Cartão')}>
                <CreditCard className="w-4 h-4 mr-2" />
                Cartão
              </Button>
              <Button variant="outline" disabled={!hasOpenCashDrawer} onClick={() => handlePayment('Pix')}>
                <CheckCheck className="w-4 h-4 mr-2" />
                Pix
              </Button>
              <Button variant="outline" disabled={!hasOpenCashDrawer} onClick={() => handlePayment('TED')}>
                <Landmark className="w-4 h-4 mr-2" />
                TED
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
