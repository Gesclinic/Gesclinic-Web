import React from 'react';
import { ClipboardList, DoorOpen, Stethoscope } from 'lucide-react';

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
    { id: 'geral', label: 'Geral', icon: ClipboardList },
    { id: 'profissional', label: 'Profissional', icon: Stethoscope, access: canAccessProfessionalMode },
    { id: 'sala', label: 'Sala', icon: DoorOpen, access: canAccessRoomMode },
  ];

  const visibleOptions = viewModeOptions.filter((option) => option.id === 'geral' || option.access);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-14 z-20">
      <div className="w-full mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Segmented Control */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {visibleOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => onViewModeChange?.(option.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                  viewMode === option.id
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'text-gray-600 hover:bg-white/70 hover:text-gray-900'
                }`}
                title={option.label}
              >
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Modo: {agendaMode === 'profissional' ? 'Profissional' : agendaMode === 'sala' ? 'Sala' : 'Geral'}
        </span>
      </div>
    </div>
  );
}
