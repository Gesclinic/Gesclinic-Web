import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * AgendaToolbarOptimized - Toolbar ultra-compacta com segmented control
 * 
 * Layout: [📋 Geral | 👨‍⚕️ Prof | 🚪 Sala]    [👤 Recepção ▾]
 * Altura: 40px (mínima)
 * 
 * Props:
 * - agendaMode: 'geral' | 'profissional' | 'sala'
 * - onAgendaModeChange: (mode) => void
 * - userProfile: 'recepcao' | 'profissional' | 'gestor'
 * - onProfileChange: (profile) => void
 * - canAccessProfessionalMode: boolean
 * - canAccessRoomMode: boolean
 */
export default function AgendaToolbarOptimized({
  agendaMode = 'geral',
  onAgendaModeChange,
  userProfile = 'recepcao',
  onProfileChange,
  canAccessProfessionalMode = true,
  canAccessRoomMode = true,
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const profileLabels = {
    'recepcao': '👤 Recepção',
    'profissional': '👨‍⚕️ Profissional',
    'gestor': '⚙️ Gestor',
  };

  const modeIcons = {
    'geral': '📋',
    'profissional': '👨‍⚕️',
    'sala': '🚪',
  };

  const modeLabels = {
    'geral': 'Geral',
    'profissional': 'Prof.',
    'sala': 'Sala',
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between gap-4">
      {/* Segmented Control - Modo de Agenda */}
      <div className="inline-flex border border-gray-300 rounded-lg p-0.5 bg-white">
        <button
          onClick={() => onAgendaModeChange('geral')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition whitespace-nowrap ${
            agendaMode === 'geral'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Visualização geral"
        >
          {modeIcons['geral']} Geral
        </button>
        {canAccessProfessionalMode && (
          <button
            onClick={() => onAgendaModeChange('profissional')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition whitespace-nowrap ${
              agendaMode === 'profissional'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            title="Visualização por profissional"
          >
            {modeIcons['profissional']} Prof.
          </button>
        )}
        {canAccessRoomMode && (
          <button
            onClick={() => onAgendaModeChange('sala')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition whitespace-nowrap ${
              agendaMode === 'sala'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            title="Visualização por sala"
          >
            {modeIcons['sala']} Sala
          </button>
        )}
      </div>

      {/* Dropdown de Perfil - Canto Direito */}
      <div className="relative ml-auto">
        <button
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition whitespace-nowrap"
        >
          {profileLabels[userProfile]}
          <ChevronDown className={`w-3.5 h-3.5 transition ${profileDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {profileDropdownOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-30">
            {['recepcao', 'profissional', 'gestor'].map((profile) => (
              <button
                key={profile}
                onClick={() => {
                  onProfileChange(profile);
                  setProfileDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition first:rounded-t-lg last:rounded-b-lg ${
                  userProfile === profile
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {profileLabels[profile]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

