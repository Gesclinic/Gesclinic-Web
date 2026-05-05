/**
 * SuggestionsDrawer.jsx
 * 
 * 💡 DRAWER LATERAL COM SUGESTÕES
 * 
 * Exibe sugestões em painel deslizável ao lado da agenda
 * com mais espaço e detalhes
 */

import React, { useState, useEffect } from "react";
import { X, Menu, RefreshCw, Zap } from "lucide-react";
import { generateEncaixeSuggestions } from "@/lib/agendaSuggestionsApi";
import AgendaSuggestions from "./AgendaSuggestions";
export default function SuggestionsDrawer({
  clinicId,
  date,
  isOpen,
  onClose,
  onSuggestionAction,
  userRole
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger recarregamento das sugestões
      setLastUpdate(new Date());
    } finally {
      setRefreshing(false);
    }
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, isOpen && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: `
          fixed right-0 top-0 h-full bg-white border-l border-gray-200
          transform transition-transform duration-300 z-40
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          w-full sm:w-96 overflow-y-auto scrollbar-custom
        `
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Zap, {
    className: "w-5 h-5 text-amber-500"
  }), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-gray-900"
  }, "Sugest\xF5es Inteligentes")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleRefresh,
    disabled: refreshing,
    className: "p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50",
    title: "Atualizar sugest\xF5es"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    className: `w-4 h-4 text-gray-600 ${refreshing ? "animate-spin" : ""}`
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
  }, /*#__PURE__*/React.createElement(X, {
    className: "w-5 h-5 text-gray-600"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement(AgendaSuggestions, {
    clinicId: clinicId,
    date: date,
    onSuggestionAction: onSuggestionAction,
    userRole: userRole,
    compact: false
  })), lastUpdate && /*#__PURE__*/React.createElement("div", {
    className: "sticky bottom-0 bg-gray-50 border-t border-gray-200 p-3 text-xs text-gray-500 text-center"
  }, "Atualizado em ", lastUpdate.toLocaleTimeString("pt-BR"))));
}

/**
 * Hook para gerenciar estado do drawer
 */
export function useSuggestionsDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  return {
    isOpen,
    toggle,
    open,
    close
  };
}