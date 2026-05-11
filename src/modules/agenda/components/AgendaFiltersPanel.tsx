/**
 * 🎨 AgendaFiltersPanel COMPONENT
 * ===============================
 *
 * Componente para exibir filtros da agenda com inputs
 * Integra com useAgendaFilters hook
 */

import React, { memo, useCallback } from 'react';
import { AgendaFilters, AppointmentStatus } from '../types';
import { ACTIVE_STATUSES } from '../constants';
import { getStatusConfig } from '../constants';

interface AgendaFiltersPanelProps {
  filters: AgendaFilters;
  onFiltersChange: (filters: Partial<AgendaFilters>) => void;
  onReset?: () => void;
  
  // Dados para selects
  professionals?: Array<{ id: string; name: string }>;
  rooms?: Array<{ id: string; name: string }>;
  payers?: Array<{ id: string; name: string }>;
  
  // Opções de UI
  compact?: boolean;
  className?: string;
}

/**
 * Painel de filtros para agenda
 */
export const AgendaFiltersPanel = memo(
  ({
    filters,
    onFiltersChange,
    onReset,
    professionals = [],
    rooms = [],
    payers = [],
    compact = false,
    className = '',
  }: AgendaFiltersPanelProps) => {
    const handleDateFromChange = useCallback(
      (value: string) => {
        onFiltersChange({ dateFrom: value || undefined });
      },
      [onFiltersChange]
    );

    const handleDateToChange = useCallback(
      (value: string) => {
        onFiltersChange({ dateTo: value || undefined });
      },
      [onFiltersChange]
    );

    const handleProfessionalChange = useCallback(
      (value: string) => {
        onFiltersChange({ professionalId: value || undefined });
      },
      [onFiltersChange]
    );

    const handleRoomChange = useCallback(
      (value: string) => {
        onFiltersChange({ roomId: value || undefined });
      },
      [onFiltersChange]
    );

    const handlePayerChange = useCallback(
      (value: string) => {
        onFiltersChange({ payerId: value || undefined });
      },
      [onFiltersChange]
    );

    const handleStatusChange = useCallback(
      (status: AppointmentStatus, checked: boolean) => {
        const current = filters.status || [];
        const updated = checked
          ? [...current, status]
          : current.filter(s => s !== status);

        onFiltersChange({ status: updated.length > 0 ? updated : undefined });
      },
      [filters.status, onFiltersChange]
    );

    const handlePatientNameChange = useCallback(
      (value: string) => {
        onFiltersChange({ patientName: value || undefined });
      },
      [onFiltersChange]
    );

    const containerClass = compact
      ? 'flex flex-wrap gap-2 items-end'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

    const inputClass =
      'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

    return (
      <div
        className={`bg-white p-4 rounded-lg border border-gray-200 ${className}`}
      >
        <div className={containerClass}>
          {/* Data From */}
          <div className={compact ? 'flex-1 min-w-fit' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data De
            </label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={e => handleDateFromChange(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Data To */}
          <div className={compact ? 'flex-1 min-w-fit' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Até
            </label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={e => handleDateToChange(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Professional */}
          {professionals.length > 0 && (
            <div className={compact ? 'flex-1 min-w-fit' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profissional
              </label>
              <select
                value={filters.professionalId || ''}
                onChange={e => handleProfessionalChange(e.target.value)}
                className={inputClass}
              >
                <option value="">Todos</option>
                {professionals.map(prof => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Room */}
          {rooms.length > 0 && (
            <div className={compact ? 'flex-1 min-w-fit' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sala
              </label>
              <select
                value={filters.roomId || ''}
                onChange={e => handleRoomChange(e.target.value)}
                className={inputClass}
              >
                <option value="">Todas</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payer */}
          {payers.length > 0 && (
            <div className={compact ? 'flex-1 min-w-fit' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Convênio
              </label>
              <select
                value={filters.payerId || ''}
                onChange={e => handlePayerChange(e.target.value)}
                className={inputClass}
              >
                <option value="">Todos</option>
                {payers.map(payer => (
                  <option key={payer.id} value={payer.id}>
                    {payer.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Patient Name */}
          <div className={compact ? 'flex-1 min-w-fit' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paciente
            </label>
            <input
              type="text"
              placeholder="Nome do paciente..."
              value={filters.patientName || ''}
              onChange={e => handlePatientNameChange(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Status Checkboxes */}
        <div className="mt-4 pt-4 border-t">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-3">
            {ACTIVE_STATUSES.map(status => {
              const config = getStatusConfig(status);
              const isChecked = filters.status?.includes(status) || false;

              return (
                <label
                  key={status}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={e => handleStatusChange(status, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    {config.icon} {config.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        {onReset && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>
    );
  }
);

AgendaFiltersPanel.displayName = 'AgendaFiltersPanel';

// ============================================================================
// EXPORT
// ============================================================================

export default AgendaFiltersPanel;
