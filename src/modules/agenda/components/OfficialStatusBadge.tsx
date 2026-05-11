/**
 * OFFICIAL STATUS BADGE - Componente padronizado para exibição de status
 * ==================================================================== 
 * 
 * Componente memoizado para exibição consistente de status oficiais
 */

import React from 'react';
import { OfficialAppointmentStatus, getStatusConfig } from '../constants/officialStatusModel';

interface StatusBadgeProps {
  status: OfficialAppointmentStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}

/**
 * Badge de status com ícone, label e cores consistentes
 */
export const OfficialStatusBadge = React.memo<StatusBadgeProps>(
  ({
    status,
    size = 'md',
    showIcon = true,
    showLabel = true,
    onClick,
    className = '',
    title,
  }) => {
    const config = getStatusConfig(status);

    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base',
    };

    const baseClass = `
      inline-flex items-center gap-1.5 rounded-full border
      font-medium transition-all
      ${sizeClasses[size]}
      ${className}
      ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
    `.trim();

    const style = {
      backgroundColor: config.backgroundColor,
      color: config.textColor,
      borderColor: config.borderColor,
    };

    return (
      <div
        className={baseClass}
        style={style}
        onClick={onClick}
        title={title || config.description}
        role={onClick ? 'button' : 'status'}
        tabIndex={onClick ? 0 : -1}
      >
        {showIcon && <span className="flex-shrink-0">{config.icon}</span>}
        {showLabel && <span className="flex-shrink-0 font-semibold">{config.label}</span>}
      </div>
    );
  }
);

OfficialStatusBadge.displayName = 'OfficialStatusBadge';

interface StatusBadgeCompactProps {
  status: OfficialAppointmentStatus;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Badge compacto (apenas ícone) com tooltip
 */
export const OfficialStatusBadgeCompact = React.memo<StatusBadgeCompactProps>(
  ({ status, tooltipPosition = 'top' }) => {
    const config = getStatusConfig(status);

    return (
      <div
        className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all hover:shadow-md"
        style={{
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        }}
        title={config.label}
      >
        <span className="text-lg">{config.icon}</span>
      </div>
    );
  }
);

OfficialStatusBadgeCompact.displayName = 'OfficialStatusBadgeCompact';

interface StatusDotProps {
  status: OfficialAppointmentStatus;
  animated?: boolean;
}

/**
 * Ponto colorido indicador de status (minimal)
 */
export const OfficialStatusDot = React.memo<StatusDotProps>(({ status, animated = false }) => {
  const config = getStatusConfig(status);

  return (
    <div
      className={`inline-block w-3 h-3 rounded-full border-2 ${
        animated && !config.isFinalized ? 'animate-pulse' : ''
      }`}
      style={{
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor,
      }}
      title={config.label}
    />
  );
});

OfficialStatusDot.displayName = 'OfficialStatusDot';

export default {
  OfficialStatusBadge,
  OfficialStatusBadgeCompact,
  OfficialStatusDot,
};
