import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronDown } from 'lucide-react';
import { AdvancedAuditViewer } from '../AdvancedAuditViewer';
import { cn } from '@/lib/utils';

interface AdvancedAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string;
  clinicId: string;
  clinicName?: string;
  appointmentTitle?: string;
}

export const AdvancedAuditModal: React.FC<AdvancedAuditModalProps> = ({
  open,
  onOpenChange,
  appointmentId,
  clinicId,
  clinicName = 'Clínica',
  appointmentTitle = 'Auditoria de Agendamento',
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed z-50 grid gap-4 border bg-white shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg left-[50%] top-[50%] w-full translate-x-[-50%] translate-y-[-50%] max-w-4xl',
            expanded ? 'h-[90vh]' : 'h-[80vh]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between space-x-2 border-b px-6 py-4">
            <div className="flex-1">
              <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
                🔍 Auditoria Completa
              </Dialog.Title>
              {appointmentTitle && (
                <p className="text-sm text-gray-500 mt-1">{appointmentTitle}</p>
              )}
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title={expanded ? 'Minimizar' : 'Expandir'}
            >
              <ChevronDown
                size={20}
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            <Dialog.Close className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <AdvancedAuditViewer
              appointmentId={appointmentId}
              clinicId={clinicId}
              clinicName={clinicName}
            />
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-3 flex justify-end gap-2 bg-gray-50">
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AdvancedAuditModal;
