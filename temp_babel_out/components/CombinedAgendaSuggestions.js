/**
 * AgendaSuggestions - Extended with Financial Priority
 * 
 * Componente integrado que combina:
 * 1. Sugestões inteligentes de encaixe (SLOT_LIVRE, NO_SHOW, etc)
 * 2. Sugestões de prioridade financeira (score-based)
 * 
 * Mostra ambos os tipos de sugestão lado-a-lado ou em abas
 */

import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import AgendaSuggestions from './AgendaSuggestions';
import FinancialPrioritySuggestions from './FinancialPrioritySuggestions';
import { AlertCircle, TrendingUp } from 'lucide-react';

/**
 * Wrapper que integra sugestões normais + financeiras
 */
export function CombinedAgendaSuggestions({
  clinicId,
  date,
  normalSuggestions = [],
  financialSuggestions = [],
  loadingNormal = false,
  loadingFinancial = false,
  errorNormal = null,
  errorFinancial = null,
  onNormalSuggestionAction,
  onFinancialSuggestionAction,
  onFinancialIgnore,
  userRole = 'recepcion',
  layout = 'tabs' // 'tabs' ou 'combined'
}) {
  const [activeTab, setActiveTab] = useState('financial'); // Mostrar financeiro por padrão

  // Stats financeiros
  const financialStats = useMemo(() => {
    if (!financialSuggestions.length) return null;
    return {
      total: financialSuggestions.length,
      totalValue: financialSuggestions.reduce((sum, s) => sum + (s.valor_estimado || 0), 0),
      averageScore: Math.round(financialSuggestions.reduce((sum, s) => sum + s.score_financeiro, 0) / financialSuggestions.length),
      topScore: Math.max(...financialSuggestions.map(s => s.score_financeiro || 0))
    };
  }, [financialSuggestions]);

  // Layout em abas
  if (layout === 'tabs') {
    return /*#__PURE__*/React.createElement("div", {
      className: "w-full"
    }, /*#__PURE__*/React.createElement(Tabs, {
      value: activeTab,
      onValueChange: setActiveTab
    }, /*#__PURE__*/React.createElement(TabsList, {
      className: "grid w-full grid-cols-2 mb-4"
    }, /*#__PURE__*/React.createElement(TabsTrigger, {
      value: "financial",
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(TrendingUp, {
      className: "w-4 h-4"
    }), "Prioridade Financeira", financialSuggestions.length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded"
    }, financialSuggestions.length)), /*#__PURE__*/React.createElement(TabsTrigger, {
      value: "normal",
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      className: "w-4 h-4"
    }), "Encaixe Inteligente", normalSuggestions.length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded"
    }, normalSuggestions.length))), /*#__PURE__*/React.createElement(TabsContent, {
      value: "financial",
      className: "mt-4"
    }, financialStats && /*#__PURE__*/React.createElement("div", {
      className: "mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-4 gap-3"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-600"
    }, "Total"), /*#__PURE__*/React.createElement("p", {
      className: "text-lg font-bold text-blue-700"
    }, financialStats.total)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-600"
    }, "Valor Total"), /*#__PURE__*/React.createElement("p", {
      className: "text-lg font-bold text-green-700"
    }, "R$ ", financialStats.totalValue.toFixed(0))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-600"
    }, "Score M\xE9dio"), /*#__PURE__*/React.createElement("p", {
      className: "text-lg font-bold text-yellow-700"
    }, financialStats.averageScore)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-600"
    }, "Melhor Score"), /*#__PURE__*/React.createElement("p", {
      className: "text-lg font-bold text-red-700"
    }, financialStats.topScore)))), /*#__PURE__*/React.createElement(FinancialPrioritySuggestions, {
      suggestions: financialSuggestions,
      loading: loadingFinancial,
      error: errorFinancial,
      onCreateAppointment: onFinancialSuggestionAction,
      onIgnore: onFinancialIgnore,
      userRole: userRole
    })), /*#__PURE__*/React.createElement(TabsContent, {
      value: "normal",
      className: "mt-4"
    }, /*#__PURE__*/React.createElement(AgendaSuggestions, {
      clinicId: clinicId,
      date: date,
      suggestions: normalSuggestions,
      loading: loadingNormal,
      error: errorNormal,
      onSuggestionAction: onNormalSuggestionAction,
      userRole: userRole
    }))));
  }

  // Layout combinado (ambos visíveis)
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full space-y-8"
  }, /*#__PURE__*/React.createElement("div", null, financialStats && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-900 mb-3"
  }, "\uD83D\uDCCA Resumo Financeiro"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Oportunidades"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-blue-700"
  }, financialStats.total)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Valor Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-green-700"
  }, "R$ ", (financialStats.totalValue / 1000).toFixed(1), "k")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Score M\xE9dio"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-yellow-700"
  }, financialStats.averageScore)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Melhor"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-red-700"
  }, financialStats.topScore, "/100")))), /*#__PURE__*/React.createElement(FinancialPrioritySuggestions, {
    suggestions: financialSuggestions,
    loading: loadingFinancial,
    error: errorFinancial,
    onCreateAppointment: onFinancialSuggestionAction,
    onIgnore: onFinancialIgnore,
    userRole: userRole
  })), /*#__PURE__*/React.createElement("hr", {
    className: "border-gray-200"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(AgendaSuggestions, {
    clinicId: clinicId,
    date: date,
    suggestions: normalSuggestions,
    loading: loadingNormal,
    error: errorNormal,
    onSuggestionAction: onNormalSuggestionAction,
    userRole: userRole
  })));
}
export default CombinedAgendaSuggestions;