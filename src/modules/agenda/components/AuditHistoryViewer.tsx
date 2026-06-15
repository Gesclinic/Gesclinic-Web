/**
 * Appointment Audit History Component
 * Displays timeline of all changes to an appointment
 */

import React, { useMemo } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAppointmentAuditHistory } from '@/modules/agenda/hooks/useAudit';
import { getChangedFieldDetails, formatAuditEntry, AuditLogEntry } from '@/modules/agenda/services/appointmentAuditApi';
import { cn } from '@/lib/utils';

interface AuditHistoryViewerProps {
  appointmentId: string;
  className?: string;
  limit?: number;
}

/**
 * Timeline entry component
 */
function TimelineEntry({ entry, isExpanded, onToggle }: { entry: AuditLogEntry; isExpanded: boolean; onToggle: () => void }) {
  const formatted = formatAuditEntry(entry);
  const changes = getChangedFieldDetails(entry);

  // Icons by operation type
  const OperationIcon = {
    CREATE: Plus,
    UPDATE: Edit,
    DELETE: Trash2,
  }[entry.operation];

  const operationColor = {
    CREATE: 'text-green-600 bg-green-50',
    UPDATE: 'text-blue-600 bg-blue-50',
    DELETE: 'text-red-600 bg-red-50',
  }[entry.operation];

  return (
    <div className="relative pb-6">
      {/* Timeline dot */}
      <div className={cn('absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-gray-300', operationColor)} />

      {/* Entry card */}
      <div className="ml-8 bg-white border border-gray-200 rounded-lg">
        {/* Header */}
        <button
          onClick={onToggle}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className={cn('p-2 rounded-lg', operationColor)}>
              <OperationIcon size={16} />
            </div>
            <div className="text-left">
              <div className="font-medium text-sm">{formatted.type}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={12} />
                {formatted.timestamp}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {entry.operation === 'UPDATE' && changes.length > 0 && (
              <span className="text-xs font-medium text-gray-500">{changes.length} field{changes.length !== 1 ? 's' : ''}</span>
            )}
            <span className="text-xs text-gray-500">By: {formatted.user}</span>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            {entry.operation === 'CREATE' && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">Initial Values</div>
                <div className="space-y-1">
                  {entry.after_snapshot && Object.entries(entry.after_snapshot).map(([key, value]) => (
                    <div key={key} className="text-xs text-gray-700">
                      <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entry.operation === 'UPDATE' && changes.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">Changes</div>
                <div className="space-y-2">
                  {changes.map((change) => (
                    <div key={change.field} className="text-xs">
                      <span className="font-medium text-gray-800">{change.field}</span>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="text-red-600 font-medium">Before:</span>
                          <span className="text-red-700 break-words">{JSON.stringify(change.oldValue)}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 font-medium">After:</span>
                          <span className="text-green-700 break-words">{JSON.stringify(change.newValue)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entry.operation === 'DELETE' && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">Deleted Values</div>
                <div className="space-y-1 text-red-700">
                  {entry.before_snapshot && Object.entries(entry.before_snapshot).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!changes || changes.length === 0 && entry.operation === 'UPDATE' && (
              <div className="text-xs text-gray-500 italic">No field changes tracked</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main audit history viewer component
 */
export function AuditHistoryViewer({ appointmentId, className, limit = 100 }: AuditHistoryViewerProps) {
  const { data: history, isLoading, error } = useAppointmentAuditHistory(appointmentId, limit);
  const [expandedIndices, setExpandedIndices] = React.useState<Set<number>>(new Set([0])); // Expand first by default

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedIndices);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIndices(newExpanded);
  };

  // Group by date for better organization
  const groupedHistory = useMemo(() => {
    if (!history) return {};

    return history.reduce(
      (acc, entry) => {
        const date = new Date(entry.changed_at).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(entry);
        return acc;
      },
      {} as Record<string, AuditLogEntry[]>
    );
  }, [history]);

  if (isLoading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4', className)}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <h3 className="font-medium text-red-900">Failed to load audit history</h3>
            <p className="text-sm text-red-700 mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className={cn('p-4', className)}>
        <div className="text-center py-8 text-gray-500">
          <Clock size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No changes recorded for this appointment yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold mb-4 text-gray-900">Change History ({history.length})</h3>

      {/* Timeline */}
      <div className="relative pl-4 border-l-2 border-gray-300">
        {Object.entries(groupedHistory).map(([date, entries]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="mb-4 sticky top-0 bg-white z-10">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{date}</div>
            </div>

            {/* Entries for this date */}
            {entries.map((entry, idx) => (
              <TimelineEntry
                key={`${date}-${idx}`}
                entry={entry}
                isExpanded={expandedIndices.has(idx)}
                onToggle={() => toggleExpanded(idx)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuditHistoryViewer;
