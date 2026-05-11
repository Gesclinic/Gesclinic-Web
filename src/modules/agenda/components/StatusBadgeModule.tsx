/**
 * 🎨 StatusBadgeModule COMPONENT
 * =============================
 *
 * Componente para exibir status com cores, ícones e estilos
 * Integra com normalizeToOfficialStatus para backward compatibility
 */

import React from 'react';
import { AppointmentStatus } from '../types';
import { getStatusConfig } from '../constants';

interface StatusBadgeProps {
  status: AppointmentStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

/**
 * Status Badge - componente base
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
  showIcon = true,
  className = '',
  onClick,
  clickable = false,
}) => {
  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const baseClasses =
    'inline-flex items-center gap-1 rounded-full font-medium transition-all';

  const clickableClasses = clickable
    ? 'cursor-pointer hover:opacity-80'
    : '';

  return (
    <div
      className={`${baseClasses} ${sizeClasses[size]} ${config.badgeClass} ${clickableClasses} ${className}`}
      onClick={onClick}
      role={clickable ? 'button' : 'status'}
      tabIndex={clickable ? 0 : -1}
    >
      {showIcon && <span className="text-lg leading-none">{config.icon}</span>}
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

/**
 * Status Badge Compacto - apenas ícone ou label
 */
interface StatusBadgeCompactProps
  extends Omit<StatusBadgeProps, 'showLabel' | 'showIcon'> {
  variant?: 'icon' | 'label';
}

export const StatusBadgeCompact: React.FC<StatusBadgeCompactProps> = ({
  status,
  variant = 'icon',
  ...props
}) => {
  return (
    <StatusBadge
      status={status}
      showIcon={variant === 'icon'}
      showLabel={variant === 'label'}
      {...props}
    />
  );
};

/**
 * Status Badge Grande - com descrição
 */
interface StatusBadgeLargeProps extends StatusBadgeProps {
  description?: string;
}

export const StatusBadgeLarge: React.FC<StatusBadgeLargeProps> = ({
  status,
  description,
  ...props
}) => {
  const config = getStatusConfig(status);

  return (
    <div
      className={`${config.badgeClass} rounded-lg p-3 inline-block min-w-max`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{config.icon}</span>
        <span className="font-bold">{config.label}</span>
      </div>
      {description && (
        <p className="text-xs opacity-75">{description}</p>
      )}
    </div>
  );
};

/**
 * Status Badge com Tooltip
 */
interface StatusBadgeWithTooltipProps extends StatusBadgeProps {
  showTooltip?: boolean;
}

export const StatusBadgeWithTooltip: React.FC<
  StatusBadgeWithTooltipProps
> = ({ status, showTooltip = true, ...props }) => {
  const config = getStatusConfig(status);

  return (
    <div className="relative inline-block group">
      <StatusBadge status={status} {...props} />

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {config.description}
        </div>
      )}
    </div>
  );
};

/**
 * Status Badge Animado
 */
interface StatusBadgeAnimatedProps extends StatusBadgeProps {
  animated?: boolean;
  pulse?: boolean;
}

export const StatusBadgeAnimated: React.FC<StatusBadgeAnimatedProps> = ({
  status,
  animated = false,
  pulse = false,
  ...props
}) => {
  const animationClass = pulse ? 'animate-pulse' : animated ? 'animate-bounce' : '';

  return (
    <div className={animationClass}>
      <StatusBadge status={status} {...props} />
    </div>
  );
};

/**
 * Status Timeline - visualiza progresso
 */
interface StatusTimelineProps {
  currentStatus: AppointmentStatus;
  showAll?: boolean;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  currentStatus,
  showAll = false,
}) => {
  const operationalFlow: AppointmentStatus[] = [
    'scheduled',
    'confirmed',
    'checked_in',
    'waiting',
    'in_progress',
    'completed',
  ];

  const currentIndex = operationalFlow.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1">
      {operationalFlow.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        const config = getStatusConfig(status);

        return (
          <div key={status} className="flex items-center">
            {/* Ponto */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                isCompleted
                  ? 'bg-green-100 text-green-700'
                  : isCurrent
                  ? `${config.badgeClass}`
                  : 'bg-gray-100 text-gray-700'
              }`}
              title={config.label}
            >
              {isCompleted ? '✓' : config.icon}
            </div>

            {/* Linha conectora */}
            {index < operationalFlow.length - 1 && (
              <div
                className={`w-6 h-1 mx-1 ${
                  isCompleted ? 'bg-green-300' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Status Select - dropdown com transições válidas
 */
interface StatusSelectProps {
  currentStatus: AppointmentStatus;
  onStatusChange: (status: AppointmentStatus) => void;
  validTransitions?: AppointmentStatus[];
  disabled?: boolean;
}

export const StatusSelect: React.FC<StatusSelectProps> = ({
  currentStatus,
  onStatusChange,
  validTransitions,
  disabled = false,
}) => {
  const validOptions = validTransitions || [
    'confirmed',
    'checked_in',
    'cancelled',
  ];

  return (
    <select
      value={currentStatus}
      onChange={e => onStatusChange(e.target.value as AppointmentStatus)}
      disabled={disabled}
      className="px-3 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value={currentStatus}>
        {getStatusConfig(currentStatus).label} (atual)
      </option>

      {validOptions.map(status => (
        <option key={status} value={status}>
          {getStatusConfig(status).label}
        </option>
      ))}
    </select>
  );
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
  StatusBadge,
  StatusBadgeCompact,
  StatusBadgeLarge,
  StatusBadgeWithTooltip,
  StatusBadgeAnimated,
  StatusTimeline,
  StatusSelect,
};
