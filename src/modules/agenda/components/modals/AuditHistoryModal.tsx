/**
 * Audit History Modal
 * Dialog wrapper for displaying audit history in a modal
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AuditHistoryViewer } from '../AuditHistoryViewer';

interface AuditHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  appointmentTitle?: string;
}

export function AuditHistoryModal({
  open,
  onOpenChange,
  appointmentId,
  appointmentTitle,
}: AuditHistoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Appointment Change History</DialogTitle>
          {appointmentTitle && (
            <DialogDescription>{appointmentTitle}</DialogDescription>
          )}
        </DialogHeader>

        {/* Audit history in scrollable container */}
        <div className="flex-1 overflow-y-auto">
          <AuditHistoryViewer appointmentId={appointmentId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuditHistoryModal;
