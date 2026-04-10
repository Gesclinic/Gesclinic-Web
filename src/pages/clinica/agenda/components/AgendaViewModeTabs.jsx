/**
 * AgendaViewModeTabs - Componente padrão para abas Dia/Semana/Mês
 * 
 * Garante consistency visual em todo o projeto
 * 
 * Props:
 * - currentViewMode: string - 'dia' | 'semana' | 'mes'
 * - onViewModeChange: (mode: string) => void
 * - accessibleTabs?: string[] - array de tabs disponíveis (padrão: todas)
 */

import React from 'react';
import { AGENDA_TABS_COLORS } from '../config/agendaTabsColors.config';

const VIEW_MODE_TABS = [
  {
    id: 'dia',
    label: 'Dia',
    icon: '📅',
  },
  {
    id: 'semana',
    label: 'Semana',
    icon: '🗓️',
  },
  {
    id: 'mes',
    label: 'Mês',
    icon: '📆',
  },
];

export default function AgendaViewModeTabs({
  currentViewMode = 'dia',
  onViewModeChange,
  accessibleTabs = ['dia', 'semana', 'mes'],
}) {
  // Filtrar apenas tabs acessíveis
  const visibleTabs = VIEW_MODE_TABS.filter(tab => accessibleTabs.includes(tab.id));

  if (visibleTabs.length === 0) {
    return null; // Não renderizar se nenhuma aba estiver acessível
  }

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      borderRadius: 4,
      background: '#f0f0f0',
      padding: 4,
    }}>
      {visibleTabs.map((tab) => {
        const isActive = currentViewMode === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onViewModeChange(tab.id)}
            style={{
              padding: '8px 12px',
              background: isActive 
                ? AGENDA_TABS_COLORS.active.backgroundColor 
                : AGENDA_TABS_COLORS.inactive.backgroundColor,
              color: isActive 
                ? AGENDA_TABS_COLORS.active.color 
                : AGENDA_TABS_COLORS.inactive.color,
              border: 0,
              borderRadius: 4,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px !important',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
            title={`Visualizar por ${tab.label}`}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.target.style.background = '#e8e8e8';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.target.style.background = AGENDA_TABS_COLORS.inactive.backgroundColor;
              }
            }}
          >
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
