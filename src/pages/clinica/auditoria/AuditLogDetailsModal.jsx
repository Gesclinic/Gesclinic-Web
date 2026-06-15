import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AUDIT_ACTION_LABELS, AUDIT_ROLE_LABELS } from '@/lib/auditApi';

/**
 * Modal para exibir detalhes de um log de auditoria
 * Mostra as alterações antes/depois e informações do contexto
 */
export function AuditLogDetailsModal({ log, isOpen, onOpenChange }) {
  if (!log) return null;

  const { context, action_type, performed_by_role, created_at } = log;

  // Extrair dados antes/depois
  const oldData = context?.old || {};
  const newData = context?.new || context || {};

  // Campos relevantes para mostrar
  const relevantFields = [
    'status',
    'patient_name',
    'professional_name',
    'scheduled_date',
    'scheduled_time',
    'notes',
  ];

  // Comparar alterações
  const getChanges = () => {
    const changes = [];

    relevantFields.forEach(field => {
      const oldValue = oldData[field];
      const newValue = newData[field];

      if (oldValue !== newValue) {
        changes.push({
          field: formatFieldName(field),
          before: oldValue || '(vazio)',
          after: newValue || '(vazio)',
        });
      }
    });

    return changes;
  };

  const formatFieldName = (field) => {
    const names = {
      status: 'Status',
      patient_name: 'Paciente',
      professional_name: 'Profissional',
      scheduled_date: 'Data Agendada',
      scheduled_time: 'Hora Agendada',
      notes: 'Observações',
    };
    return names[field] || field;
  };

  const changes = getChanges();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Auditoria</DialogTitle>
          <DialogDescription>
            Visualize as alterações realizadas neste agendamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Informações Gerais</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Ação</p>
                <Badge className="mt-1">
                  {AUDIT_ACTION_LABELS[action_type] || action_type}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">Realizado por Role</p>
                <Badge variant="outline" className="mt-1">
                  {AUDIT_ROLE_LABELS[performed_by_role] || performed_by_role}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">Data/Hora</p>
                <p className="font-mono">
                  {new Date(created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-gray-500">ID do Log</p>
                <p className="font-mono text-xs">{log.id.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          {/* Alterações */}
          {changes.length > 0 ? (
            <div>
              <h3 className="font-semibold mb-3">Alterações Realizadas</h3>
              <div className="space-y-3">
                {changes.map((change, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 bg-gradient-to-r from-red-50 to-green-50"
                  >
                    <p className="font-medium mb-2">{change.field}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">ANTES</p>
                        <p className="font-mono text-red-700 bg-red-100 p-2 rounded mt-1 break-words">
                          {change.before}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">DEPOIS</p>
                        <p className="font-mono text-green-700 bg-green-100 p-2 rounded mt-1 break-words">
                          {change.after}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                ℹ️ Nenhuma alteração detectada ou registro de criação
              </p>
            </div>
          )}

          {/* Contexto Completo */}
          <div>
            <h3 className="font-semibold mb-3">Contexto Completo (JSON)</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs font-mono">
                {JSON.stringify(context, null, 2).slice(0, 1000)}
                {JSON.stringify(context, null, 2).length > 1000 && '...'}
              </pre>
            </div>
          </div>

          {/* Informações do Paciente */}
          {log.patient?.name && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Paciente Afetado</h3>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Nome:</span>{' '}
                  <span className="font-medium">{log.patient.name}</span>
                </p>
              </div>
            </div>
          )}

          {/* Profissional */}
          {log.professional?.name && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Profissional Envolvido</h3>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Nome:</span>{' '}
                  <span className="font-medium">{log.professional.name}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
