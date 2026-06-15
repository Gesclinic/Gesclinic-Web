/**
 * 🎨 Componente Premium: KPI Card com Sparkline
 * 
 * Nível Omie/Stripe/Mercury
 * Features:
 * - Sparkline mini gráfico
 * - Indicadores percentuais com trend
 * - Gradientes suaves
 * - Hover effects modernos
 * - Comparação mensal
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumKPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon?: React.ReactNode;
  trend?: number; // percentual de mudança
  comparison?: string; // ex: "vs mês anterior"
  data?: number[]; // dados para sparkline
  color?: 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  actionButton?: React.ReactNode;
  meta?: string;
}

type ColorConfig = {
  bg: string;
  border: string;
  icon: string;
  trend: string;
  sparkline: string;
  gradient: string;
};

const colorMap: Record<string, ColorConfig> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900',
    trend: 'text-blue-600 dark:text-blue-400',
    sparkline: 'stroke-blue-500',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900',
    trend: 'text-emerald-600 dark:text-emerald-400',
    sparkline: 'stroke-emerald-500',
    gradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900',
  },
  red: {
    bg: 'bg-rose-50 dark:bg-rose-950',
    border: 'border-rose-200 dark:border-rose-800',
    icon: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900',
    trend: 'text-rose-600 dark:text-rose-400',
    sparkline: 'stroke-rose-500',
    gradient: 'from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900',
    trend: 'text-purple-600 dark:text-purple-400',
    sparkline: 'stroke-purple-500',
    gradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900',
    trend: 'text-amber-600 dark:text-amber-400',
    sparkline: 'stroke-amber-500',
    gradient: 'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900',
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-950',
    border: 'border-slate-200 dark:border-slate-800',
    icon: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900',
    trend: 'text-slate-600 dark:text-slate-400',
    sparkline: 'stroke-slate-500',
    gradient: 'from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900',
  },
};

// Sparkline Mini Chart (SVG)
const Sparkline: React.FC<{ data?: number[]; className?: string; color?: string }> = ({
  data,
  className = 'w-20 h-8',
  color = 'stroke-blue-500',
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 32;
  const padding = 2;

  // Normalizar dados para SVG
  const points = data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return [x, y];
    });

  // Criar path
  const pathData = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');

  return (
    <svg width={width} height={height} className={className}>
      <path
        d={pathData}
        fill="none"
        className={cn(color, 'stroke-[2]')}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Card Premium KPI
 */
export const PremiumKPICard: React.FC<PremiumKPICardProps> = ({
  title,
  value,
  unit = '',
  icon,
  trend,
  comparison,
  data,
  color = 'slate',
  size = 'md',
  loading = false,
  onClick,
  actionButton,
  meta,
}) => {
  const colorConfig = colorMap[color];

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const valueSize = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  const trendColor = trend
    ? trend > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400'
    : '';

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-xl border-2 backdrop-blur-sm transition-all duration-300',
          colorConfig.bg,
          colorConfig.border,
          sizeClasses[size],
          'animate-pulse'
        )}
      >
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-4" />
        <div className="h-8 bg-gray-300 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-300 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 backdrop-blur-sm',
        'transition-all duration-300',
        'hover:shadow-lg hover:border-opacity-100',
        'hover:scale-105 hover:-translate-y-1',
        colorConfig.bg,
        colorConfig.border,
        sizeClasses[size],
        'group',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Header: Title + Icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {title}
          </p>
        </div>
        {icon && (
          <div
            className={cn(
              'p-3 rounded-lg transition-transform duration-300',
              'group-hover:scale-110 group-hover:rotate-6',
              colorConfig.icon
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={cn('font-bold text-gray-900 dark:text-white', valueSize[size])}>
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </span>
        {unit && <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{unit}</span>}
      </div>

      {/* Trend Badge + Comparison */}
      <div className="flex items-center justify-between mb-4">
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full', trendColor)}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="text-xs font-bold">{Math.abs(trend)}%</span>
          </div>
        )}
        {comparison && (
          <span className="text-xs text-gray-600 dark:text-gray-400">{comparison}</span>
        )}
      </div>

      {/* Sparkline */}
      {data && data.length > 1 && (
        <div className="mb-4 flex justify-between items-center">
          <Sparkline data={data} color={colorConfig.sparkline} />
          {meta && <span className="text-xs text-gray-600 dark:text-gray-400 ml-auto">{meta}</span>}
        </div>
      )}

      {/* Action Button */}
      {actionButton && <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">{actionButton}</div>}
    </div>
  );
};

/**
 * Grid de KPI Cards Premium
 */
export interface PremiumKPIGridProps {
  cards: PremiumKPICardProps[];
  columns?: 1 | 2 | 3 | 4 | 6;
}

export const PremiumKPIGrid: React.FC<PremiumKPIGridProps> = ({ cards, columns = 3 }) => {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-4', colsClass[columns])}>
      {cards.map((card, i) => (
        <PremiumKPICard key={i} {...card} />
      ))}
    </div>
  );
};

export default PremiumKPICard;
