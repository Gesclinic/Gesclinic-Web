import React, { useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useAgendaFilters } from '../hooks/useAgendaFilters';

/**
 * AgendaFiltersNew - Componente colapsável (accordion) para refinamento de filtros
 * 
 * Props:
 * - filters: { professional?, room?, status?, payer?, service?, searchText? }
 * - onFilterChange: (key, value) => void
 * - onClearFilters: () => void
 * - metadata: { professionals, rooms, services, payers }
 * - viewMode: 'geral' | 'profissional' | 'sala'
 */
export default function AgendaFiltersNew({
  filters = {},
  onFilterChange,
  onClearFilters,
  metadata = {},
  viewMode = 'geral'
}) {
  const {
    isOpen,
    toggleOpen,
    closeFilters,
    updateActiveFiltersCount
  } = useAgendaFilters();
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.professional_id) count++;
    if (filters.room_id) count++;
    if (filters.status) count++;
    if (filters.payer_id) count++;
    if (filters.service_id) count++;
    return count;
  }, [filters]);
  React.useEffect(() => {
    updateActiveFiltersCount(activeFiltersCount);
  }, [activeFiltersCount, updateActiveFiltersCount]);
  const handleClearFilters = () => {
    onClearFilters?.();
    closeFilters();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-b border-gray-200 sticky top-32 z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full mx-auto px-4 py-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 relative"
  }, /*#__PURE__*/React.createElement(Search, {
    className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Buscar paciente ou servi\xE7o...",
    value: filters.search || '',
    onChange: e => onFilterChange?.('search', e.target.value),
    className: "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: toggleOpen,
    className: `flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${isOpen ? 'bg-blue-100 text-blue-600 border border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD0D Filtros"), activeFiltersCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full"
  }, activeFiltersCount), /*#__PURE__*/React.createElement(ChevronDown, {
    className: `w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`
  }))), isOpen && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-gray-200 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-2"
  }, "Profissional"), /*#__PURE__*/React.createElement("select", {
    value: filters.professional_id || '',
    onChange: e => onFilterChange?.('professional_id', e.target.value || ''),
    className: "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), metadata.professionals?.map(prof => /*#__PURE__*/React.createElement("option", {
    key: prof.id,
    value: prof.id
  }, prof.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-2"
  }, "Sala"), /*#__PURE__*/React.createElement("select", {
    value: filters.room_id || '',
    onChange: e => onFilterChange?.('room_id', e.target.value || ''),
    className: "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todas"), metadata.rooms?.map(room => /*#__PURE__*/React.createElement("option", {
    key: room.id,
    value: room.id
  }, room.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-2"
  }, "Status"), /*#__PURE__*/React.createElement("select", {
    value: filters.status || '',
    onChange: e => onFilterChange?.('status', e.target.value || ''),
    className: "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), /*#__PURE__*/React.createElement("option", {
    value: "scheduled"
  }, "\uD83D\uDDD3\uFE0F Agendado"), /*#__PURE__*/React.createElement("option", {
    value: "confirmed"
  }, "\u2705 Confirmado"), /*#__PURE__*/React.createElement("option", {
    value: "in_service"
  }, "\u23F3 Em Atendimento"), /*#__PURE__*/React.createElement("option", {
    value: "attended"
  }, "\u2714\uFE0F Compareceu"), /*#__PURE__*/React.createElement("option", {
    value: "no_show"
  }, "\u274C Faltou"), /*#__PURE__*/React.createElement("option", {
    value: "canceled"
  }, "\uD83D\uDEAB Cancelado"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-2"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("select", {
    value: filters.payer_id || '',
    onChange: e => onFilterChange?.('payer_id', e.target.value || ''),
    className: "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), metadata.payers?.map(payer => /*#__PURE__*/React.createElement("option", {
    key: payer.id,
    value: payer.id
  }, payer.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-2"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("select", {
    value: filters.service_id || '',
    onChange: e => onFilterChange?.('service_id', e.target.value || ''),
    className: "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), metadata.services?.map(service => /*#__PURE__*/React.createElement("option", {
    key: service.id,
    value: service.id
  }, service.name))))), activeFiltersCount > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleClearFilters,
    className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
  }, /*#__PURE__*/React.createElement(X, {
    className: "w-4 h-4"
  }), "Limpar Filtros")))));
}