import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * AgendaToolbarNew - Segmented control para mudar visão da agenda
 * 
 * Props:
 * - viewMode: 'geral' | 'profissional' | 'sala'
 * - onViewModeChange: (mode) => void
 * - userRole: string
 * - onProfileChange: (profile) => void
 * - agendaMode: 'recepcao' | 'profissional' | 'gestor'
 * - canAccessProfessionalMode: boolean
 * - canAccessGestorMode: boolean
 */
export default function AgendaToolbarNew({
  viewMode = 'geral',
  onViewModeChange,
  userRole,
  onProfileChange,
  agendaMode = 'recepcao',
  canAccessProfessionalMode = false,
  canAccessGestorMode = false
}) {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const getProfileLabel = () => {
    switch (agendaMode) {
      case 'recepcao':
        return '📞 Recepção';
      case 'profissional':
        return '👨‍⚕️ Profissional';
      case 'gestor':
        return '📊 Gestor';
      default:
        return 'Perfil';
    }
  };
  const viewModeOptions = [{
    id: 'geral',
    label: 'Geral',
    icon: '📋'
  }, {
    id: 'profissional',
    label: 'Profissional',
    icon: '👨‍⚕️'
  }, {
    id: 'sala',
    label: 'Sala',
    icon: '🏥'
  }];
  const availableProfiles = [{
    id: 'recepcao',
    label: '📞 Recepção',
    always: true
  }, {
    id: 'profissional',
    label: '👨‍⚕️ Profissional',
    access: canAccessProfessionalMode
  }, {
    id: 'gestor',
    label: '📊 Gestor',
    access: canAccessGestorMode
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-b border-gray-200 sticky top-16 z-20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full mx-auto px-4 py-3 flex items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-gray-100 rounded-lg p-1"
  }, viewModeOptions.map(option => /*#__PURE__*/React.createElement("button", {
    key: option.id,
    onClick: () => onViewModeChange?.(option.id),
    className: `px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${viewMode === option.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`,
    title: option.label
  }, /*#__PURE__*/React.createElement("span", null, option.icon), /*#__PURE__*/React.createElement("span", null, option.label)))), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setIsProfileDropdownOpen(!isProfileDropdownOpen),
    className: "flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
  }, /*#__PURE__*/React.createElement("span", null, getProfileLabel()), /*#__PURE__*/React.createElement(ChevronDown, {
    className: `w-4 h-4 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`
  })), isProfileDropdownOpen && /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30"
  }, availableProfiles.filter(p => p.always || p.access).map(profile => /*#__PURE__*/React.createElement("button", {
    key: profile.id,
    onClick: () => {
      onProfileChange?.(profile.id);
      setIsProfileDropdownOpen(false);
    },
    className: `w-full text-left px-4 py-2.5 text-sm transition-colors ${agendaMode === profile.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`
  }, profile.label))))));
}