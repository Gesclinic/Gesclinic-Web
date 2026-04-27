// src/pages/clinica/agenda/components/AgendaFilters.jsx
import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * AgendaFilters - Filtros combinativos para a Agenda
 * 
 * Oculta:
 * - Filtro de profissional em modo 'profissional' OU quando currentRole é 'profissional'
 * - Filtro de sala em modo 'sala'
 * 
 * Props:
 * - viewMode: 'geral' | 'profissional' | 'sala'
 * - filters: { professional, room, status, payer, service, searchText }
 * - onFilterChange: (key, value) => void
 * - onMultipleFilterChange: (filters) => void
 * - onClearFilters: () => void
 * - metadata: { professionals, rooms, services, payers }
 * - currentRole: string - role do usuário para verificar permissões
 */
export default function AgendaFilters({
  viewMode,
  filters,
  onFilterChange,
  onMultipleFilterChange,
  onClearFilters,
  metadata = {
    professionals: [],
    rooms: [],
    services: [],
    payers: []
  },
  currentRole = null
}) {
  const [expandedFilter, setExpandedFilter] = useState(null);
  const statusOptions = [{
    id: 'confirmado',
    label: 'Confirmado',
    color: 'bg-green-100'
  }, {
    id: 'a_confirmar',
    label: 'A Confirmar',
    color: 'bg-yellow-100'
  }, {
    id: 'faltou',
    label: 'Faltou',
    color: 'bg-red-100'
  }, {
    id: 'encaixe',
    label: 'Encaixe',
    color: 'bg-blue-100'
  }];

  // Contar filtros ativos
  const activeFilterCount = Object.values(filters).filter(v => v !== null && v !== '').length;
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-gray-200 rounded-lg p-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 flex items-center gap-2"
  }, "\uD83D\uDD0D Filtros", activeFilterCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
  }, activeFilterCount, " ativo", activeFilterCount > 1 ? 's' : '')), activeFilterCount > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: onClearFilters,
    className: "text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(X, {
    className: "w-4 h-4"
  }), "Limpar")), /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Buscar por paciente ou servi\xE7o...",
    value: filters.searchText,
    onChange: e => onFilterChange('searchText', e.target.value),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3"
  }, viewMode !== 'sala' && currentRole?.toLowerCase?.() !== 'profissional' && /*#__PURE__*/React.createElement(FilterDropdown, {
    label: "Profissional",
    options: metadata.professionals?.map(p => ({
      id: p.id,
      label: p.name
    })),
    value: filters.professional,
    onChange: val => onFilterChange('professional', val),
    isExpanded: expandedFilter === 'professional',
    onToggleExpand: () => setExpandedFilter(expandedFilter === 'professional' ? null : 'professional')
  }), viewMode !== 'profissional' && /*#__PURE__*/React.createElement(FilterDropdown, {
    label: "Sala",
    options: metadata.rooms?.map(r => ({
      id: r.id,
      label: r.name
    })),
    value: filters.room,
    onChange: val => onFilterChange('room', val),
    isExpanded: expandedFilter === 'room',
    onToggleExpand: () => setExpandedFilter(expandedFilter === 'room' ? null : 'room')
  }), /*#__PURE__*/React.createElement(FilterDropdown, {
    label: "Status",
    options: statusOptions,
    value: filters.status,
    onChange: val => onFilterChange('status', val),
    isExpanded: expandedFilter === 'status',
    onToggleExpand: () => setExpandedFilter(expandedFilter === 'status' ? null : 'status')
  }), /*#__PURE__*/React.createElement(FilterDropdown, {
    label: "Conv\xEAnio",
    options: metadata.payers?.map(p => ({
      id: p.id,
      label: p.name
    })),
    value: filters.payer,
    onChange: val => onFilterChange('payer', val),
    isExpanded: expandedFilter === 'payer',
    onToggleExpand: () => setExpandedFilter(expandedFilter === 'payer' ? null : 'payer')
  }), /*#__PURE__*/React.createElement(FilterDropdown, {
    label: "Servi\xE7o",
    options: metadata.services?.map(s => ({
      id: s.id,
      label: s.name
    })),
    value: filters.service,
    onChange: val => onFilterChange('service', val),
    isExpanded: expandedFilter === 'service',
    onToggleExpand: () => setExpandedFilter(expandedFilter === 'service' ? null : 'service')
  })));
}

/**
 * FilterDropdown - Componente auxiliar para dropdown de filtro
 */
function FilterDropdown({
  label,
  options = [],
  value,
  onChange,
  isExpanded,
  onToggleExpand
}) {
  const selectedOption = options?.find(opt => opt.id === value);
  return /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggleExpand,
    className: `
          w-full px-3 py-2 text-sm border rounded-lg transition text-left flex items-center justify-between
          ${value ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}
        `
  }, /*#__PURE__*/React.createElement("span", {
    className: "truncate"
  }, selectedOption ? selectedOption.label : label), /*#__PURE__*/React.createElement(ChevronDown, {
    className: `w-4 h-4 transition-transform flex-shrink-0 ml-1 ${isExpanded ? 'rotate-180' : ''}`
  })), isExpanded && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onChange(null);
      onToggleExpand();
    },
    className: "w-full px-3 py-2 text-sm text-left hover:bg-gray-100 text-gray-700 border-b border-gray-200"
  }, "\u2715 Limpar filtro"), options?.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-sm text-gray-500 text-center"
  }, "Sem op\xE7\xF5es dispon\xEDveis") : options.map(option => /*#__PURE__*/React.createElement("button", {
    key: option.id,
    onClick: () => {
      onChange(option.id);
      onToggleExpand();
    },
    className: `
                  w-full px-3 py-2 text-sm text-left transition
                  ${value === option.id ? 'bg-blue-100 text-blue-900 font-medium' : 'hover:bg-gray-100 text-gray-700'}
                `
  }, option.color && /*#__PURE__*/React.createElement("span", {
    className: `inline-block w-2 h-2 rounded-full ${option.color} mr-2`
  }), option.label))));
}