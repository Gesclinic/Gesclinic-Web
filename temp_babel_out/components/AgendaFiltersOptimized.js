import React, { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * AgendaFiltersOptimized - Filtros ultra-compactos e colapsáveis
 * 
 * Design:
 * - Padrão: Fechado (apenas barra com ícone de busca + badge de contagem)
 * - Expandido: Mostra 5 filtros selecionáveis
 * - Altura: 40px (fechado) → 280px (expandido)
 * - Sem espaço desperdiçado quando fechado
 * 
 * Props:
 * - searchText: string - filtro de busca/paciente
 * - onSearchChange: (text) => void
 * - selectedFilters: { profissionalId?, salaId?, statusList?, convênioId?, serviçoId? }
 * - onFiltersChange: (filters) => void
 * - professionals: array
 * - rooms: array
 * - agreements: array
 * - services: array
 */
export default function AgendaFiltersOptimized({
  searchText = '',
  onSearchChange = () => {},
  selectedFilters = {},
  onFiltersChange = () => {},
  professionals = [],
  rooms = [],
  agreements = [],
  services = []
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Contar filtros ativos
  const activeFilterCount = Object.values(selectedFilters).filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length;
  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);
  const handleSearchChange = useCallback(e => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);
  const handleFilterChange = useCallback((filterName, value) => {
    onFiltersChange({
      ...selectedFilters,
      [filterName]: value
    });
  }, [selectedFilters, onFiltersChange]);

  // Status de exemplo (em produção vem de props)
  const statuses = [{
    value: 'disponivel',
    label: '🟢 Livre'
  }, {
    value: 'confirmado',
    label: '🔵 Confirmado'
  }, {
    value: 'aguardando',
    label: '🟡 Aguardando'
  }, {
    value: 'falta',
    label: '🔴 Falta'
  }, {
    value: 'bloqueado',
    label: '⚫ Bloqueado'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg h-10"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "\uD83D\uDD0D"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Buscar paciente...",
    value: searchText,
    onChange: handleSearchChange,
    className: "flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
  }), activeFilterCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold text-white bg-blue-500 rounded-full"
  }, activeFilterCount), /*#__PURE__*/React.createElement("button", {
    onClick: handleToggle,
    className: `flex items-center justify-center w-6 h-6 rounded transition-transform ${isOpen ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`,
    title: isOpen ? 'Fechar filtros' : 'Abrir filtros'
  }, /*#__PURE__*/React.createElement(ChevronDown, {
    size: 16,
    className: `transition-transform ${isOpen ? 'rotate-180' : ''}`
  }))), isOpen && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg animate-in fade-in-50 duration-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600 w-24"
  }, "\uD83D\uDC68\u200D\u2695\uFE0F Prof."), /*#__PURE__*/React.createElement("select", {
    value: selectedFilters.profissionalId || '',
    onChange: e => handleFilterChange('profissionalId', e.target.value || null),
    className: "flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), professionals.map(prof => /*#__PURE__*/React.createElement("option", {
    key: prof.id,
    value: prof.id
  }, prof.name || prof.nome)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600 w-24"
  }, "\uD83D\uDEAA Sala"), /*#__PURE__*/React.createElement("select", {
    value: selectedFilters.salaId || '',
    onChange: e => handleFilterChange('salaId', e.target.value || null),
    className: "flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todas"), rooms.map(room => /*#__PURE__*/React.createElement("option", {
    key: room.id,
    value: room.id
  }, room.name || room.nome)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600 w-24"
  }, "\uD83C\uDFAF Status"), /*#__PURE__*/React.createElement("select", {
    value: selectedFilters.statusList?.[0] || '',
    onChange: e => handleFilterChange('statusList', e.target.value ? [e.target.value] : []),
    className: "flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), statuses.map(status => /*#__PURE__*/React.createElement("option", {
    key: status.value,
    value: status.value
  }, status.label)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600 w-24"
  }, "\uD83C\uDFE5 Conv\xEAnio"), /*#__PURE__*/React.createElement("select", {
    value: selectedFilters.convênioId || '',
    onChange: e => handleFilterChange('convênioId', e.target.value || null),
    className: "flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), agreements.map(agreement => /*#__PURE__*/React.createElement("option", {
    key: agreement.id,
    value: agreement.id
  }, agreement.name || agreement.nome)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600 w-24"
  }, "\uD83D\uDCCB Servi\xE7o"), /*#__PURE__*/React.createElement("select", {
    value: selectedFilters.serviçoId || '',
    onChange: e => handleFilterChange('serviçoId', e.target.value || null),
    className: "flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), services.map(service => /*#__PURE__*/React.createElement("option", {
    key: service.id,
    value: service.id
  }, service.name || service.nome)))), activeFilterCount > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onFiltersChange({});
      onSearchChange('');
    },
    className: "mt-1 w-full px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
  }, "\uD83D\uDDD1\uFE0F Limpar filtros")));
}