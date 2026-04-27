import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

/**
 * AgendaProfessionalFilters - Filtros para Modo Profissional
 * Aparece apenas para Admin/Gestor, não aparece para profissional puro
 */
export default function AgendaProfessionalFilters({
  agenda,
  isGestor,
  canAccessGestorMode,
  isProfissional
}) {
  const [expandFilters, setExpandFilters] = useState(window.innerWidth > 768);

  // Mostrar filtros apenas se for admin/gestor E não for profissional puro
  const shouldShowFilters = (isGestor || canAccessGestorMode) && !isProfissional;
  if (!shouldShowFilters) {
    return null;
  }

  // Contar filtros ativos
  const activeFilterCount = Object.values(agenda.filters || {}).filter(v => v !== null && v !== '').length;
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-gray-200 rounded-lg mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 flex items-center gap-2"
  }, "\uD83D\uDD0D Filtrar Atendimentos:", activeFilterCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
  }, activeFilterCount, " ativo", activeFilterCount > 1 ? 's' : ''))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, activeFilterCount > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      agenda.updateFilter('professional', null);
      agenda.updateFilter('room', null);
      agenda.updateFilter('status', null);
      agenda.updateFilter('payer', null);
      agenda.updateFilter('service', null);
    },
    className: "text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(X, {
    className: "w-4 h-4"
  }), "Limpar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpandFilters(!expandFilters),
    className: "md:hidden inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
  }, /*#__PURE__*/React.createElement(ChevronDown, {
    className: `w-4 h-4 transition-transform ${expandFilters ? 'rotate-180' : ''}`
  })))), (expandFilters || window.innerWidth > 768) && /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Buscar por paciente ou servi\xE7o...",
    value: agenda.filters?.searchText || '',
    onChange: e => agenda.updateFilter('searchText', e.target.value),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-gray-600 mb-2"
  }, "Profissional"), /*#__PURE__*/React.createElement("select", {
    value: agenda.filters.professional || '',
    onChange: e => agenda.updateFilter('professional', e.target.value || null),
    className: "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), agenda.metadata.professionals?.map(prof => /*#__PURE__*/React.createElement("option", {
    key: prof.id,
    value: prof.id
  }, prof.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-gray-600 mb-2"
  }, "Sala"), /*#__PURE__*/React.createElement("select", {
    value: agenda.filters.room || '',
    onChange: e => agenda.updateFilter('room', e.target.value || null),
    className: "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todas"), agenda.metadata.rooms?.map(room => /*#__PURE__*/React.createElement("option", {
    key: room.id,
    value: room.id
  }, room.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-gray-600 mb-2"
  }, "Status"), /*#__PURE__*/React.createElement("select", {
    value: agenda.filters.status || '',
    onChange: e => agenda.updateFilter('status', e.target.value || null),
    className: "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), /*#__PURE__*/React.createElement("option", {
    value: "confirmado"
  }, "\u2705 Confirmado"), /*#__PURE__*/React.createElement("option", {
    value: "pendente"
  }, "\u23F3 Pendente"), /*#__PURE__*/React.createElement("option", {
    value: "cancelado"
  }, "\u274C Cancelado"), /*#__PURE__*/React.createElement("option", {
    value: "falta"
  }, "\uD83D\uDEAB Falta"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-gray-600 mb-2"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("select", {
    value: agenda.filters.payer || '',
    onChange: e => agenda.updateFilter('payer', e.target.value || null),
    className: "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), agenda.metadata.payers?.map(payer => /*#__PURE__*/React.createElement("option", {
    key: payer.id,
    value: payer.id
  }, payer.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-gray-600 mb-2"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("select", {
    value: agenda.filters.service || '',
    onChange: e => agenda.updateFilter('service', e.target.value || null),
    className: "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), agenda.metadata.services?.map(service => /*#__PURE__*/React.createElement("option", {
    key: service.id,
    value: service.id
  }, service.name)))))));
}