// src/components/BlockingModal.jsx
// ============================================================
// BLOCKING MODAL - Modal que bloqueia acesso a features
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';

export function BlockingModal({ isOpen, feature, reason, issues = [] }) {
  const navigate = useNavigate();

  const featureLabels = {
    agenda: 'Agenda',
    scheduling: 'Agendamentos',
    financeiro: 'Financeiro',
    checkin: 'Check-in',
    invoices: 'Faturas',
  };

  const featureDescriptions = {
    agenda: 'Módulo de agendamentos',
    scheduling: 'Sistema de agendamentos',
    financeiro: 'Módulo financeiro',
    checkin: 'Sistema de check-in',
    invoices: 'Gestão de faturas',
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="app-dialog-shell app-dialog-shell--compact">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-100">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Configuração Incompleta</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {featureLabels[feature]} está bloqueado
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Main Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900 font-medium">
              {reason ||
                `Você precisa completar a configuração antes de acessar ${featureLabels[feature]}.`}
            </p>
          </div>

          {/* Issues List */}
          {issues && issues.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <div className="p-4 space-y-2">
                <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">
                  O que falta:
                </p>
                <ul className="space-y-2">
                  {issues.map((issue, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-red-800">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{issue.message || issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-900">
              <strong>Dica:</strong> Use o assistente de setup para configurar tudo passo a passo.
              Leva apenas alguns minutos!
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => navigate('/clinica/base-sistema')}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <span>Ir para Setup</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline" className="flex-1">
              Voltar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
