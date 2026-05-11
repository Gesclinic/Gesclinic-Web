/**
 * Componente: QueueStatusBadge
 * 
 * Badge visual para status de tempo de espera
 * Com cores e ícones baseados em wait_priority
 */

import React from 'react';

interface QueueStatusBadgeProps {
  tempo_espera_minutos: number;
  wait_priority: 'normal' | 'warning' | 'critical';
  showTime?: boolean;
  animate?: boolean;
}

/**
 * Badge com status visual de espera
 * 
 * Uso:
 * ```
 * <QueueStatusBadge
 *   tempo_espera_minutos={8}
 *   wait_priority="normal"
 *   showTime
 *   animate
 * />
 * ```
 */
const QueueStatusBadge = React.memo(
  ({
    tempo_espera_minutos,
    wait_priority,
    showTime = true,
    animate = true,
  }: QueueStatusBadgeProps) => {
    // Configuração de cores e ícones por prioridade
    const config = {
      normal: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        icon: '✅',
        label: 'Normal',
      },
      warning: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        icon: '⚠️',
        label: 'Aviso',
      },
      critical: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        icon: '🔴',
        label: 'Crítico',
      },
    };

    const style = config[wait_priority];

    return (
      <div
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          border ${style.bg} ${style.border} ${style.text} text-sm font-medium
          ${animate && wait_priority === 'critical' ? 'animate-pulse' : ''}
        `}
        title={`${style.label}: ${tempo_espera_minutos}min de espera`}
      >
        {/* Ícone */}
        <span className="text-base">{style.icon}</span>

        {/* Tempo */}
        {showTime && <span>{tempo_espera_minutos}min</span>}

        {/* Label (apenas no critical) */}
        {wait_priority === 'critical' && !showTime && <span>{style.label}</span>}
      </div>
    );
  }
);

QueueStatusBadge.displayName = 'QueueStatusBadge';

export default QueueStatusBadge;
