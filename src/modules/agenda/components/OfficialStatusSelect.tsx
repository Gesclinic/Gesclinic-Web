/**
 * STATUS SELECT - Seletor de status com validação
 * ============================================
 * 
 * Select inteligente que só mostra transições permitidas
 */

import React, { useCallback } from 'react';
import {
  OfficialAppointmentStatus,
  getNextPossibleStatuses,
  getStatusConfig,
} from '../constants/officialStatusModel';
import { validateStatusTransition } from '../constants/statusValidation';

interface StatusSelectProps {
  currentStatus: OfficialAppointmentStatus;
  onStatusChange: (newStatus: OfficialAppointmentStatus) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
  isLoading?: boolean;
  onError?: (error: string) => void;
}

/**
 * Select de status que valida transições
 */
export const OfficialStatusSelect = React.memo<StatusSelectProps>(
  ({
    currentStatus,
    onStatusChange,
    disabled = false,
    className = '',
    showLabel = true,
    isLoading = false,
    onError,
  }) => {
    const possibleNext = getNextPossibleStatuses(currentStatus);
    const currentConfig = getStatusConfig(currentStatus);

    const handleChange = useCallback(
      async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const targetStatus = e.target.value as OfficialAppointmentStatus;

        // Validar transição
        const validation = validateStatusTransition(currentStatus, targetStatus);
        if (!validation.valid) {
          onError?.(validation.error || 'Transição não permitida');
          return;
        }

        try {
          await onStatusChange(targetStatus);
        } catch (error) {
          onError?.(
            error instanceof Error
              ? error.message
              : 'Erro ao atualizar status'
          );
        }
      },
      [currentStatus, onStatusChange, onError]
    );

    if (possibleNext.length === 0) {
      return (
        <div className="text-sm text-gray-600">
          {currentConfig.label}
          <span className="text-xs ml-2">(sem transições disponíveis)</span>
        </div>
      );
    }

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {showLabel && (
          <label className="text-sm font-medium text-gray-700">
            Alterar Status
          </label>
        )}
        <select
          value={currentStatus}
          onChange={handleChange}
          disabled={disabled || isLoading}
          className={`
            px-3 py-2 border-2 rounded-lg font-medium
            transition-all focus:outline-none
            ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-gray-100'
                : 'cursor-pointer hover:border-blue-400'
            }
            ${isLoading ? 'opacity-75' : ''}
          `}
          style={{
            borderColor: currentConfig.borderColor,
            backgroundColor: currentConfig.backgroundColor,
            color: currentConfig.textColor,
          }}
        >
          <option value={currentStatus} disabled>
            {currentConfig.icon} {currentConfig.label} (atual)
          </option>

          {possibleNext.map((status) => {
            const config = getStatusConfig(status);
            return (
              <option
                key={status}
                value={status}
                style={{
                  backgroundColor: config.backgroundColor,
                  color: config.textColor,
                }}
              >
                {config.icon} {config.label}
              </option>
            );
          })}
        </select>

        <div className="text-xs text-gray-500 mt-1">
          Transições possíveis: {possibleNext.length}
        </div>
      </div>
    );
  }
);

OfficialStatusSelect.displayName = 'OfficialStatusSelect';

export default OfficialStatusSelect;
