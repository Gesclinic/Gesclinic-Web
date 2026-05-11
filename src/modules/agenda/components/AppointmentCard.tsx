/**
 * 🎨 AppointmentCard COMPONENT
 * ============================
 *
 * Componente para exibir informações de um agendamento em formato de card
 * Uso em listas, calendários, etc.
 */

import React, { memo } from 'react';
import { Appointment, AppointmentUI } from '../types';
import { StatusBadge } from './StatusBadgeModule';
import {
  formatAppointmentPeriod,
  formatCurrency,
} from '../services/appointments.service';

interface AppointmentCardProps {
  appointment: Appointment | AppointmentUI;
  onClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Card para exibir agendamento
 */
export const AppointmentCard = memo(
  ({
    appointment,
    onClick,
    onEditClick,
    onDeleteClick,
    showActions = false,
    compact = false,
    className = '',
  }: AppointmentCardProps) => {
    // Extrai dados do appointment (compatível com snake_case e camelCase)
    const getField = (key: string) => {
      return appointment[key as keyof (Appointment | AppointmentUI)];
    };

    const patientName = appointment.patient?.name || 'Paciente Desconhecido';
    const professionalName = appointment.professional?.name || 'Profissional';
    const roomName = appointment.room?.name;
    const status = appointment.status;
    const value = getField('value') as number | undefined;
    const period = formatAppointmentPeriod(appointment);

    if (compact) {
      return (
        <div
          onClick={onClick}
          className={`p-2 border rounded-md cursor-pointer hover:bg-gray-50 transition ${className}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{patientName}</p>
              <p className="text-xs text-gray-500">{period}</p>
            </div>
            <StatusBadge status={status} size="sm" />
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={onClick}
        className={`p-4 border rounded-lg hover:shadow-md transition cursor-pointer bg-white ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-base text-gray-900">
              {patientName}
            </h3>
            <p className="text-sm text-gray-500">{period}</p>
          </div>
          <StatusBadge status={status} size="md" />
        </div>

        {/* Body */}
        <div className="space-y-2 mb-3">
          {/* Professional */}
          <div className="flex items-center text-sm">
            <span className="text-gray-600 w-24">Profissional:</span>
            <span className="font-medium">{professionalName}</span>
          </div>

          {/* Room */}
          {roomName && (
            <div className="flex items-center text-sm">
              <span className="text-gray-600 w-24">Sala:</span>
              <span className="font-medium">{roomName}</span>
            </div>
          )}

          {/* Value */}
          {value !== undefined && (
            <div className="flex items-center text-sm">
              <span className="text-gray-600 w-24">Valor:</span>
              <span className="font-medium">{formatCurrency(value)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (onEditClick || onDeleteClick) && (
          <div className="flex gap-2 pt-3 border-t">
            {onEditClick && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onEditClick();
                }}
                className="flex-1 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition"
              >
                Editar
              </button>
            )}

            {onDeleteClick && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDeleteClick();
                }}
                className="flex-1 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition"
              >
                Deletar
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

AppointmentCard.displayName = 'AppointmentCard';

/**
 * Grid de Cards
 */
interface AppointmentCardGridProps {
  appointments: (Appointment | AppointmentUI)[];
  onCardClick?: (appointment: Appointment | AppointmentUI) => void;
  onEditClick?: (appointment: Appointment | AppointmentUI) => void;
  onDeleteClick?: (appointment: Appointment | AppointmentUI) => void;
  compact?: boolean;
  emptyMessage?: string;
}

export const AppointmentCardGrid = memo(
  ({
    appointments,
    onCardClick,
    onEditClick,
    onDeleteClick,
    compact = false,
    emptyMessage = 'Nenhum agendamento',
  }: AppointmentCardGridProps) => {
    if (appointments.length === 0) {
      return (
        <div className="flex items-center justify-center p-8 text-gray-500">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div
        className={`grid gap-3 ${
          compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {appointments.map(apt => (
          <AppointmentCard
            key={apt.id}
            appointment={apt}
            onClick={() => onCardClick?.(apt)}
            onEditClick={() => onEditClick?.(apt)}
            onDeleteClick={() => onDeleteClick?.(apt)}
            compact={compact}
            showActions={!!(onEditClick || onDeleteClick)}
          />
        ))}
      </div>
    );
  }
);

AppointmentCardGrid.displayName = 'AppointmentCardGrid';

// ============================================================================
// EXPORT
// ============================================================================

export default {
  AppointmentCard,
  AppointmentCardGrid,
};
