import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Lock, RotateCcw, Send, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ApprovalStage, Payable, PayableApprovalAction, PayableStatus } from '../types';
import { labelApprovalAction, labelApprovalStage, labelPayableStatus } from '../utils/labels';

interface ApprovalWorkflowDrawerProps {
  open: boolean;
  payable: Payable | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: PayableApprovalAction, reason?: string) => Promise<void> | void;
}

const workflowSteps = [
  { stage: ApprovalStage.LAUNCHED, label: 'Lançada' },
  { stage: ApprovalStage.REVIEWED, label: 'Conferida' },
  { stage: ApprovalStage.APPROVED, label: 'Aprovada' },
  { stage: ApprovalStage.RELEASED, label: 'Liberada' },
  { stage: ApprovalStage.PAID, label: 'Paga' },
];

const stageOrder = workflowSteps.map((step) => step.stage);

const actionButtons = [
  { action: PayableApprovalAction.SEND_TO_APPROVAL, label: 'Enviar', icon: Send, variant: 'outline' as const },
  { action: PayableApprovalAction.CHECK, label: 'Conferir', icon: Clock, variant: 'outline' as const },
  { action: PayableApprovalAction.APPROVE, label: 'Aprovar', icon: ShieldCheck, variant: 'default' as const },
  { action: PayableApprovalAction.RELEASE, label: 'Liberar', icon: CheckCircle2, variant: 'default' as const },
  { action: PayableApprovalAction.BLOCK, label: 'Bloquear', icon: Lock, variant: 'outline' as const },
  { action: PayableApprovalAction.REVERSE, label: 'Estornar', icon: RotateCcw, variant: 'outline' as const },
];

function formatDateTime(value?: string) {
  if (!value) return 'Pendente';
  return new Date(value).toLocaleString('pt-BR');
}

export function ApprovalWorkflowDrawer({ open, payable, loading, onOpenChange, onAction }: ApprovalWorkflowDrawerProps) {
  const [reason, setReason] = useState('');
  const currentStage = payable?.approval_stage || ApprovalStage.LAUNCHED;
  const currentIndex = Math.max(0, stageOrder.indexOf(currentStage));
  const workflowEvents = useMemo(() => payable?.metadata?.enterprise?.workflow || [], [payable]);

  if (!open) {
    return null;
  }

  const handleAction = async (action: PayableApprovalAction) => {
    await onAction(action, reason.trim() || undefined);
    setReason('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent open={open} onOpenChange={onOpenChange} side="right">
        <div className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle>Fluxo de Aprovação</SheetTitle>
                <SheetDescription>{payable?.supplier_name || 'Conta a pagar'}</SheetDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} title="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {!payable ? (
            <div className="py-8 text-sm text-slate-500">Selecione uma conta para analisar.</div>
          ) : (
            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{payable.description}</p>
                    <p className="text-xs text-slate-500">Vencimento {payable.due_date}</p>
                  </div>
                  <Badge variant="outline">{labelPayableStatus(payable.status)}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>Valor: {Number(payable.net_amount || payable.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <span>Documento: {payable.document_number || '-'}</span>
                  <span>Conferida: {formatDateTime(payable.checked_at)}</span>
                  <span>Aprovada: {formatDateTime(payable.approved_at)}</span>
                  <span>Liberada: {formatDateTime(payable.released_at)}</span>
                  <span>Motivo: {payable.approval_reason || '-'}</span>
                </div>
              </div>

              <div className="space-y-3">
                {workflowSteps.map((step, index) => {
                  const done = index <= currentIndex || payable.status === PayableStatus.PAID;
                  return (
                    <div key={step.stage} className="flex items-center gap-3">
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border', done ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400')}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{step.label}</p>
                        <p className="text-xs text-slate-500">{labelApprovalStage(step.stage)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Justificativa</label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Registre motivo de aprovação, bloqueio ou estorno"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {actionButtons.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.action}
                      variant={item.variant}
                      disabled={loading}
                      onClick={() => handleAction(item.action)}
                      className={cn(item.action === PayableApprovalAction.BLOCK && 'text-slate-700', item.action === PayableApprovalAction.REVERSE && 'text-red-700')}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>

              <div className="rounded-lg border bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">Histórico</p>
                <div className="mt-2 space-y-2">
                  {workflowEvents.length ? workflowEvents.slice().reverse().map((event: any, index: number) => (
                    <div key={`${event.at}-${index}`} className="text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{labelApprovalAction(event.action)}</span> em {formatDateTime(event.at)}
                      {event.reason ? ` - ${event.reason}` : ''}
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500">Nenhum evento registrado.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}