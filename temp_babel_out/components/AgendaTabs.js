// src/pages/clinica/agenda/components/AgendaTabs.jsx
import React from 'react';

/**
 * AgendaTabs - Tabs para alternar entre modos de visualização
 * ⭐ IMPORTANTE: Sem alterar rota, apenas controlando estado viewMode
 * A URL permanece /clinica/agenda ao trocar as abas
 * 
 * Props:
 * - viewMode: 'geral' | 'profissional' | 'sala'
 * - onViewModeChange: (mode) => void
 * - hasPermission: (permission) => boolean (opcional)
 */
export default function AgendaTabs({
  viewMode,
  onViewModeChange,
  hasPermission
}) {
  const tabs = [{
    id: 'geral',
    label: 'Agenda Geral',
    icon: '📋',
    activeIcon: '📋',
    description: 'Visualização geral de todos os agendamentos'
  }, {
    id: 'profissional',
    label: 'Por Profissional',
    icon: '👤',
    activeIcon: '👨‍⚕️',
    description: 'Agendamentos por coluna de profissional'
  }, {
    id: 'sala',
    label: 'Por Sala',
    icon: '🏢',
    activeIcon: '🏥',
    description: 'Agendamentos por coluna de sala'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "border-b-2 border-gray-200 bg-white overflow-x-auto sticky top-0 z-10"
  }, /*#__PURE__*/React.createElement("style", null, `
        @keyframes slideInUnderline {
          from { width: 0; opacity: 0; }
          to { width: 100%; opacity: 1; }
        }
        .tab-active-underline {
          animation: slideInUnderline 0.3s ease-out;
        }
      `), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-0 min-w-max"
  }, tabs.map(tab => {
    const isActive = viewMode === tab.id;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      onClick: () => onViewModeChange(tab.id),
      style: {
        padding: '16px 24px',
        fontWeight: 600,
        fontSize: '14px',
        transition: 'all 0.2s ease',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '3px solid',
        borderColor: isActive ? '#1976d2' : 'transparent',
        background: isActive ? '#f0f7ff' : 'white',
        color: isActive ? '#1976d2' : '#666',
        cursor: 'pointer',
        border: 'none'
      },
      onMouseEnter: e => !isActive && (e.target.style.background = '#f9f9f9'),
      onMouseLeave: e => !isActive && (e.target.style.background = 'white'),
      title: tab.description
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '20px',
        transition: 'transform 0.3s'
      }
    }, isActive ? tab.activeIcon : tab.icon), /*#__PURE__*/React.createElement("span", null, tab.label), isActive && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: '-2px',
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(to right, #1976d2, #1565c0)',
        animation: 'slideInUnderline 0.3s ease-out'
      }
    }));
  })));
}