/**
 * PHASE 4: Audit Trail Component
 * ═════════════════════════════════════════════════════════════════════════════
 * Purpose: Display recent changes to appointments with user-friendly UI
 * Features:
 *   - Shows operation type (CREATE, UPDATE, DELETE)
 *   - Displays changed fields
 *   - Shows timestamp and user who made change
 *   - Real-time updates with visual indicators
 * ═════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Clock,
  RefreshCw 
} from 'lucide-react';
import { useClinicAuditFeed } from '@/modules/agenda/hooks/useRealtimeAppointmentChanges';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Get operation icon and color
 */
function getOperationIcon(operation) {
  switch (operation) {
    case 'CREATE':
      return <CheckCircle2 size={16} className="text-green-600" />;
    case 'UPDATE':
      return <Edit3 size={16} className="text-blue-600" />;
    case 'DELETE':
      return <Trash2 size={16} className="text-red-600" />;
  }
}

/**
 * Get operation label
 */
function getOperationLabel(operation) {
  switch (operation) {
    case 'CREATE':
      return 'Criado';
    case 'UPDATE':
      return 'Atualizado';
    case 'DELETE':
      return 'Deletado';
  }
}

/**
 * Format changed fields for display
 */
function formatChangedFields(fields) {
  if (!fields || fields.length === 0) return 'N/A';
  if (fields.length === 1) return fields[0];
  if (fields.length <= 3) return fields.join(', ');
  return `${fields.slice(0, 3).join(', ')} +${fields.length - 3}`;
}

/**
 * AUDIT TRAIL COMPONENT
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const AuditTrail = ({
  clinicId,
  maxItems = 10,
  compact = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const changes = useClinicAuditFeed(clinicId, maxItems);

  // Show loading indicator briefly when new changes arrive
  useEffect(() => {
    if (changes.length > 0) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [changes]);

  if (compact) {
    // Compact view: just show summary
    return (
      <div className="text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          {changes.length > 0 ? (
            <>
              <span>Última alteração:</span>
              <span className="font-semibold">
                {formatDistanceToNow(new Date(changes[0].changed_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </>
          ) : (
            <span>Sem alterações recentes</span>
          )}
        </div>
      </div>
    );
  }

  // Full view: detailed list
  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">Histórico de Mudanças</h3>
        </div>
        {isLoading && <RefreshCw size={14} className="animate-spin text-blue-600" />}
      </div>

      {/* Changes list */}
      {changes.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle size={24} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">Nenhuma mudança recente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map((change, index) => (
            <div
              key={`${change.appointment_id}-${change.changed_at}-${index}`}
              className={`p-3 rounded-lg border transition-all ${
                change.source === 'realtime'
                  ? 'bg-blue-50 border-blue-200 animate-pulse'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-1">{getOperationIcon(change.operation)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {getOperationLabel(change.operation)}
                    </span>
                    <span className="text-xs text-gray-600">
                      {formatDistanceToNow(new Date(change.changed_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 mb-2">
                    <span className="font-mono bg-gray-100 px-1 rounded">
                      {change.appointment_id.substring(0, 8)}...
                    </span>
                  </div>

                  {change.changed_fields && change.changed_fields.length > 0 && (
                    <div className="text-xs">
                      <span className="text-gray-700">
                        Campos alterados: <span className="font-semibold text-gray-900">
                          {formatChangedFields(change.changed_fields)}
                        </span>
                      </span>
                    </div>
                  )}

                  {change.source === 'realtime' && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                      Atualização em tempo real
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {changes.length > 0 && (
        <div className="text-xs text-gray-500 mt-4 text-center">
          Mostrando {changes.length} de {maxItems} alterações recentes
        </div>
      )}
    </div>
  );
};

/**
 * MINI AUDIT INDICATOR
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact badge showing total changes today
 */

export const AuditIndicator = ({ clinicId }) => {
  const changes = useClinicAuditFeed(clinicId, 100);
  const changesCount = changes.length;

  if (changesCount === 0) return null;

  return (
    <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
      <RefreshCw size={12} className="text-blue-600 animate-spin" />
      <span className="text-xs font-medium text-blue-600">{changesCount} mudanças</span>
    </div>
  );
};

/**
 * APPOINTMENT CHANGE BANNER
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows when an appointment you're viewing has been updated by someone else
 */

export const ChangeNotification = ({
  appointmentId,
  clinicId,
  onRefresh,
}) => {
  const [showNotification, setShowNotification] = useState(false);
  const [lastChangeTime, setLastChangeTime] = useState(null);

  const changes = useClinicAuditFeed(clinicId, 50);

  // Check if there's a recent change to this appointment
  useEffect(() => {
    const recentChange = changes.find((c) => c.appointment_id === appointmentId);
    if (recentChange && recentChange.operation === 'UPDATE') {
      setLastChangeTime(recentChange.changed_at);
      setShowNotification(true);

      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setShowNotification(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [changes, appointmentId]);

  if (!showNotification || !lastChangeTime) return null;

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900">Este agendamento foi alterado</p>
          <p className="text-xs text-amber-700 mt-1">
            Última alteração {formatDistanceToNow(new Date(lastChangeTime), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors"
        >
          Atualizar
        </button>
      )}
    </div>
  );
};

export default AuditTrail;
