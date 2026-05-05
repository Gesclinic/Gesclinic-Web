/**
 * 📋 EXEMPLO DE INTEGRAÇÃO - MODAL/DRAWER COM AUDITORIA FINANCEIRA
 *
 * Este componente mostra como integrar o AppointmentFinancialAuditTimeline
 * em um modal/drawer de detalhes do atendimento
 *
 * Use como referência para integrar em seus componentes existentes
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTabs,
  DialogTabsContent,
  DialogTabsList,
  DialogTabsTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, FileText, Clock, AlertCircle } from 'lucide-react';
import { AppointmentFinancialAuditTimeline } from '@/pages/clinica/agenda/components/AppointmentFinancialAuditTimeline';
import { useAppointmentFinancialAudit } from '@/pages/clinica/agenda/hooks/useAppointmentFinancialAudit';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Exemplo de Modal com Abas
 */
export function AppointmentDetailModalWithAudit({
  isOpen,
  onClose,
  appointmentId,
  appointmentData,
}) {
  const { currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState('details');

  const { hasDivergences, divergences } = useAppointmentFinancialAudit(
    appointmentId,
    { autoLoad: true, refreshInterval: 30000 }, // Atualiza a cada 30s
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-h-[90vh] overflow-y-auto modal-content-scroll\">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>Detalhes do Atendimento</DialogTitle>
              {hasDivergences && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                  <AlertCircle className="w-4 h-4" />
                  {divergences.length} divergência(s) detectada(s)
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <DialogTabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <DialogTabsList className="grid w-full grid-cols-3">
            <DialogTabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Detalhes
            </DialogTabsTrigger>

            {['GESTOR', 'FINANCEIRO', 'ADMIN'].includes(currentRole) && (
              <DialogTabsTrigger value="financial" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Auditoria Financeira
                {hasDivergences && (
                  <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                    !
                  </span>
                )}
              </DialogTabsTrigger>
            )}

            <DialogTabsTrigger value="notes">Observações</DialogTabsTrigger>
          </DialogTabsList>

          {/* TAB: Detalhes Básicos */}
          <DialogTabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Paciente</label>
                <p className="text-sm mt-1">{appointmentData?.patient_name || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Profissional</label>
                <p className="text-sm mt-1">{appointmentData?.professional_name || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Data/Hora</label>
                <p className="text-sm mt-1">{appointmentData?.scheduled_date || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Status</label>
                <p className="text-sm mt-1">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      appointmentData?.status === 'confirmado'
                        ? 'bg-green-100 text-green-800'
                        : appointmentData?.status === 'cancelado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {appointmentData?.status || '—'}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Convênio</label>
                <p className="text-sm mt-1">{appointmentData?.payer_name || 'Particular'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Valor</label>
                <p className="text-sm mt-1 font-semibold text-green-600">
                  R$ {appointmentData?.value ? Number(appointmentData.value).toFixed(2) : '—'}
                </p>
              </div>
            </div>
          </DialogTabsContent>

          {/* TAB: Auditoria Financeira */}
          {['GESTOR', 'FINANCEIRO', 'ADMIN'].includes(currentRole) && (
            <DialogTabsContent value="financial" className="space-y-4">
              <AppointmentFinancialAuditTimeline
                appointmentId={appointmentId}
                userRole={currentRole}
              />
            </DialogTabsContent>
          )}

          {/* TAB: Observações */}
          <DialogTabsContent value="notes" className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Observações Gerais</label>
              <p className="text-sm mt-2 text-gray-700 whitespace-pre-wrap">
                {appointmentData?.notes || 'Sem observações'}
              </p>
            </div>
          </DialogTabsContent>
        </DialogTabs>

        {/* Footer com ações */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button>Editar Atendimento</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Exemplo de Drawer Lateral com Auditoria
 */
export function AppointmentDetailDrawerWithAudit({
  isOpen,
  onClose,
  appointmentId,
  appointmentData,
}) {
  const { currentRole } = useAuth();

  return (
    <div
      className={`fixed right-0 top-0 h-full w-96 bg-white shadow-lg transform transition-transform duration-300 z-50 overflow-y-auto ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <h2 className="font-bold text-gray-900">Detalhes do Atendimento</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Seção: Informações Básicas */}
        <section>
          <h3 className="font-semibold text-gray-900 mb-3">Informações Básicas</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Paciente:</span>
              <p className="font-semibold">{appointmentData?.patient_name || '—'}</p>
            </div>
            <div>
              <span className="text-gray-600">Profissional:</span>
              <p className="font-semibold">{appointmentData?.professional_name || '—'}</p>
            </div>
            <div>
              <span className="text-gray-600">Data/Hora:</span>
              <p className="font-semibold">{appointmentData?.scheduled_date || '—'}</p>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <p className="font-semibold">{appointmentData?.status || '—'}</p>
            </div>
          </div>
        </section>

        {/* Seção: Informações Financeiras */}
        <section>
          <h3 className="font-semibold text-gray-900 mb-3">Informações Financeiras</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Convênio:</span>
              <p className="font-semibold">{appointmentData?.payer_name || 'Particular'}</p>
            </div>
            <div>
              <span className="text-gray-600">Valor:</span>
              <p className="font-semibold text-green-600">
                R$ {appointmentData?.value ? Number(appointmentData.value).toFixed(2) : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Seção: Auditoria Financeira (apenas para roles autorizadas) */}
        {['GESTOR', 'FINANCEIRO', 'ADMIN'].includes(currentRole) && (
          <section className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timeline Financeira
            </h3>
            <AppointmentFinancialAuditTimeline
              appointmentId={appointmentId}
              compact={true}
              userRole={currentRole}
            />
          </section>
        )}

        {/* Seção: Observações */}
        {appointmentData?.notes && (
          <section className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Observações</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{appointmentData.notes}</p>
          </section>
        )}
      </div>

      {/* Footer com ações */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Fechar
        </Button>
        <Button className="flex-1">Editar</Button>
      </div>
    </div>
  );
}

export default {
  AppointmentDetailModalWithAudit,
  AppointmentDetailDrawerWithAudit,
};
