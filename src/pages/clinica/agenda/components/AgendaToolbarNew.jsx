import React from 'react';

/**
 * AgendaToolbarNew - Segmented control para mudar visão da agenda
 *
 * Props:
 * - viewMode: 'geral' | 'profissional' | 'sala'
 * - onViewModeChange: (mode) => void
 * - agendaMode: 'geral' | 'profissional' | 'sala'
 * - canAccessProfessionalMode: boolean
 * - canAccessRoomMode: boolean
 */
export default function AgendaToolbarNew({
  viewMode = 'geral',
  onViewModeChange,
  agendaMode = 'geral',
  canAccessProfessionalMode = false,
  canAccessRoomMode = true,
}) {
  const viewModeOptions = [
    { id: 'geral', label: 'Geral', icon: '📋' },
    { id: 'profissional', label: 'Profissional', icon: '👨‍⚕️', access: canAccessProfessionalMode },
    { id: 'sala', label: 'Sala', icon: '🚪', access: canAccessRoomMode },
  ];

  const visibleOptions = viewModeOptions.filter((option) => option.id === 'geral' || option.access);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
      <div className="w-full mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Segmented Control */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {visibleOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => onViewModeChange?.(option.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewMode === option.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={option.label}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">
          Modo: {agendaMode === 'profissional' ? 'Profissional' : agendaMode === 'sala' ? 'Sala' : 'Geral'}
        </span>
      </div>
    </div>
  );
}
