// src/components/FeatureBlockedDialog.jsx
// ============================================================
// Diálogo que mostra quando uma funcionalidade está bloqueada
// ============================================================

import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export function FeatureBlockedDialog({ feature, blockReason, actionPath, isOpen, onDismiss }) {
  const navigate = useNavigate();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="app-modal-overlay">
      <Card className="app-modal-shell app-modal-shell--compact border-red-200 bg-white">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-red-100 rounded-full p-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Acesso Bloqueado</h2>
              <p className="text-sm text-gray-600">Funcionalidade não disponível</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-900 font-semibold mb-2">{feature}</p>
            <p className="text-sm text-red-700">{blockReason}</p>
          </div>

          <div className="space-y-2">
            {actionPath && (
              <Button
                onClick={() => {
                  navigate(`/clinica/${actionPath}`);
                  onDismiss();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Configurar Agora
              </Button>
            )}
            <Button onClick={onDismiss} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Configure os requisitos em <strong>Base do Sistema</strong> para desbloquear esta
            funcionalidade.
          </p>
        </div>
      </Card>
    </div>
  );
}
