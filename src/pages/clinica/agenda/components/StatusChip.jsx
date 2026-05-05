import React from 'react';

/**
 * StatusChip - Ultra-compacto com emojis semânticos + cores
 *
 * Versão otimizada para Agenda:
 * - Modo ultra-compacto (padrão): apenas emoji colorido (8x8px)
 * - Modo texto: emoji + label em chip pequeno
 *
 * Props:
 * - status: 'disponivel' | 'confirmado' | 'aguardando' | 'falta' | 'cancelado' | 'bloqueado' | 'concluído' | 'agendado'
 * - size: 'sm' (8px) | 'md' (12px) | 'lg' (16px) - padrão: 'sm'
 * - compact: boolean - se true, mostra apenas emoji sem texto
 */
export default function StatusChip({ status, size = 'sm', compact = true }) {
  const statusMap = {
    // Status em ordem de frequência (otimização visual)
    disponivel: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      emoji: '🟢',
      label: 'Livre',
    },
    livre: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      emoji: '🟢',
      label: 'Livre',
    },
    confirmado: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      emoji: '🔵',
      label: 'Confirmado',
    },
    agendado: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      emoji: '🔵',
      label: 'Agendado',
    },
    aguardando: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      emoji: '🟡',
      label: 'Aguardando',
    },
    falta: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      emoji: '🔴',
      label: 'Falta',
    },
    cancelado: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      emoji: '🟠',
      label: 'Cancelado',
    },
    bloqueado: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      emoji: '⚫',
      label: 'Bloqueado',
    },
    concluido: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      emoji: '✅',
      label: 'Concluído',
    },
  };

  const config = statusMap[status?.toLowerCase()] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    emoji: '❓',
    label: status || 'Desconhecido',
  };

  // Modo ultra-compacto: apenas emoji
  if (compact) {
    const sizeMap = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };
    return (
      <span className={sizeMap[size]} title={config.label}>
        {config.emoji}
      </span>
    );
  }

  // Modo com texto: chip pequeno estilo badge
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClasses[size]} ${config.bg} ${config.text}`}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
