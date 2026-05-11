import React from 'react';
import {
  getStatusIcon,
  getStatusLabelOnly,
  getStatusBadgeClass,
  getStatusConfig,
  normalizeToOfficialStatus,
} from '@/lib/appointmentStatusOfficialModel';

/**
 * StatusBadgeOfficial
 *
 * Componente reutilizável para exibir badge de status da agenda
 * Usa o novo modelo oficial de 8 status
 * Compatível com status legados (normaliza automaticamente)
 *
 * @param {string} status - Status do agendamento (antigo ou novo)
 * @param {boolean} showLabel - Se deve exibir o label (padrão: true)
 * @param {boolean} showIcon - Se deve exibir o ícone (padrão: true)
 * @param {string} size - Tamanho do badge: 'sm' | 'md' | 'lg' (padrão: 'md')
 * @param {boolean} clickable - Se deve ter interação de hover (padrão: false)
 * @param {function} onClick - Callback ao clicar
 * @param {string} className - Classes adicionais
 *
 * @example
 * // Uso básico
 * <StatusBadgeOfficial status="completed" />
 *
 * // Com label e ícone
 * <StatusBadgeOfficial status="in_progress" showLabel showIcon />
 *
 * // Grande e clicável
 * <StatusBadgeOfficial
 *   status="waiting"
 *   size="lg"
 *   clickable
 *   onClick={() => handleOpenStatusPicker()}
 * />
 *
 * // Com compatibilidade legada
 * <StatusBadgeOfficial status="em_atendimento" /> {/* Normaliza para in_progress */}
 */
export default function StatusBadgeOfficial({
  status,
  showLabel = true,
  showIcon = true,
  size = 'md',
  clickable = false,
  onClick = null,
  className = '',
}) {
  // Normaliza status legados para o novo modelo
  const normalizedStatus = normalizeToOfficialStatus(status);
  const config = getStatusConfig(normalizedStatus);
  const icon = getStatusIcon(normalizedStatus);
  const label = getStatusLabelOnly(normalizedStatus);
  const badgeClass = getStatusBadgeClass(normalizedStatus);

  // Tamanhos
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Classe base
  const baseClass = `
    inline-flex items-center font-medium rounded-full
    transition-all duration-200
    ${sizeClass}
    ${badgeClass}
    ${clickable ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}
    ${className}
  `.trim();

  return (
    <div
      className={baseClass}
      onClick={onClick}
      title={config.description}
      role={clickable ? 'button' : 'status'}
      tabIndex={clickable ? 0 : -1}
      onKeyDown={clickable && onClick ? (e) => e.key === 'Enter' && onClick(e) : null}
    >
      {showIcon && <span className="flex-shrink-0">{icon}</span>}
      {showLabel && <span className="flex-shrink-0">{label}</span>}
    </div>
  );
}

// ============================================================================
// Variantes Pré-configuradas
// ============================================================================

/**
 * StatusBadgeCompact - Versão compacta do badge (apenas ícone ou label)
 */
export function StatusBadgeCompact({ status, showLabel = true, onClick = null }) {
  return (
    <StatusBadgeOfficial
      status={status}
      size="sm"
      showLabel={showLabel}
      showIcon={!showLabel}
      clickable={!!onClick}
      onClick={onClick}
    />
  );
}

/**
 * StatusBadgeLarge - Versão grande com todos os detalhes
 */
export function StatusBadgeLarge({ status, onClick = null }) {
  return (
    <StatusBadgeOfficial
      status={status}
      size="lg"
      showLabel
      showIcon
      clickable={!!onClick}
      onClick={onClick}
    />
  );
}

/**
 * StatusBadgeWithTooltip - Badge com tooltip explicativo
 */
export function StatusBadgeWithTooltip({ status, className = '' }) {
  const config = getStatusConfig(normalizeToOfficialStatus(status));

  return (
    <div className="relative group">
      <StatusBadgeOfficial status={status} className={className} />

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
        <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap shadow-lg">
          {config.description}
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

/**
 * StatusBadgeAnimated - Badge com animação de transição
 */
export function StatusBadgeAnimated({ status, animate = true, className = '' }) {
  return (
    <StatusBadgeOfficial
      status={status}
      className={`
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
    />
  );
}

/**
 * StatusTimeline - Linha visual do progresso de status
 * Mostra o fluxo: scheduled → confirmed → checked_in → waiting → in_progress → completed
 */
export function StatusTimeline({ currentStatus, size = 'md' }) {
  const FLOW_STATUSES = [
    'scheduled',
    'confirmed',
    'checked_in',
    'waiting',
    'in_progress',
    'completed',
  ];

  const normalizedStatus = normalizeToOfficialStatus(currentStatus);
  const currentIndex = FLOW_STATUSES.findIndex((s) => s === normalizedStatus);

  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  const lineHeight = size === 'sm' ? 'h-0.5' : size === 'lg' ? 'h-1' : 'h-0.5';

  return (
    <div className="flex items-center gap-1">
      {FLOW_STATUSES.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const config = getStatusConfig(status);

        return (
          <React.Fragment key={status}>
            {/* Dot */}
            <div
              className={`
                rounded-full transition-all
                ${dotSize}
                ${isCurrent ? `${getStatusBadgeClass(status)} scale-150` : ''}
                ${isCompleted ? 'bg-green-500' : ''}
                ${!isCompleted && !isCurrent ? 'bg-gray-300' : ''}
              `}
              title={config.label}
            />

            {/* Connector line */}
            {index < FLOW_STATUSES.length - 1 && (
              <div
                className={`
                  ${lineHeight}
                  transition-all
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                `}
                style={{ width: size === 'lg' ? '20px' : '12px' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * StatusSelect - Select dropdown para mudar status
 * Apenas permite transições válidas
 */
export function StatusSelect({ currentStatus, onStatusChange, size = 'md' }) {
  import { getPossibleTransitions } from '@/lib/appointmentStatusOfficialModel';

  const transitions = getPossibleTransitions(currentStatus);

  if (transitions.length === 0) {
    // Status final, não permite mudança
    return (
      <div className="text-sm text-gray-500">
        Status final: não pode ser alterado
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Mudar para:</label>
      <div className="flex gap-2 flex-wrap">
        {transitions.map((transition) => (
          <button
            key={transition.to}
            onClick={() => onStatusChange(transition.to)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all hover:shadow-md
              ${getStatusBadgeClass(transition.to)}
              border border-current
            `}
          >
            {transition.icon} {transition.label}
          </button>
        ))}
      </div>
    </div>
  );
}
