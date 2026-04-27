/**
 * Financial Priority Suggestions Component
 * 
 * Componente React que exibe sugestões ranqueadas por prioridade financeira
 * 
 * Features:
 * - Lista ordenada por score financeiro
 * - Exibe score, valor, tipo, justificativa
 * - Botões contextuais (Criar encaixe, Ignorar)
 * - Permissões baseadas em role (recepção/gestor/profissional)
 * - Responsivo (mobile/tablet/desktop)
 * - Integração com auditoria
 */

import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Clock, AlertCircle, ChevronDown, ChevronUp, Check, X, Eye } from 'lucide-react';
import { PRIORITY_LEVELS, SERVICE_TYPES } from '../../../lib/financialPriorityApi';

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_COLORS = {
  [PRIORITY_LEVELS.ALTA]: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    icon: 'text-red-500'
  },
  [PRIORITY_LEVELS.MEDIA]: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: 'text-yellow-500'
  },
  [PRIORITY_LEVELS.BAIXA]: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
    icon: 'text-blue-500'
  }
};
const SERVICE_TYPE_LABELS = {
  [SERVICE_TYPES.CONSULTA]: '📋 Consulta',
  [SERVICE_TYPES.EXAME]: '🔬 Exame',
  [SERVICE_TYPES.PROCEDIMENTO]: '🏥 Procedimento',
  [SERVICE_TYPES.RETORNO]: '↩️ Retorno'
};

// ============================================================================
// COMPONENT: Financial Suggestion Card
// ============================================================================

function FinancialSuggestionCard({
  suggestion,
  onCreateAppointment,
  onIgnore,
  userRole,
  compact = false
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const colors = PRIORITY_COLORS[suggestion.prioridade];
  const canExecute = ['recepcion', 'gestor', 'admin'].includes(userRole);
  const showFullScore = ['gestor', 'admin'].includes(userRole);
  const handleCreateAppointment = async () => {
    setLoading(true);
    try {
      await onCreateAppointment(suggestion);
    } finally {
      setLoading(false);
    }
  };
  const handleIgnore = async () => {
    setLoading(true);
    try {
      await onIgnore(suggestion);
    } finally {
      setLoading(false);
    }
  };

  // Layout compacto
  if (compact) {
    return /*#__PURE__*/React.createElement("div", {
      className: `p-3 border rounded-lg ${colors.bg} ${colors.border} mb-2`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-1"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-sm text-gray-900 truncate"
    }, suggestion.patient_name), /*#__PURE__*/React.createElement("span", {
      className: `text-xs font-bold px-2 py-1 rounded ${colors.badge}`
    }, suggestion.prioridade)), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-600 mb-1"
    }, suggestion.service_name), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-500"
    }, "R$ ", suggestion.valor_estimado.toFixed(2))), /*#__PURE__*/React.createElement("div", {
      className: "text-right flex-shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: `text-lg font-bold ${colors.icon}`
    }, suggestion.score_financeiro), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-500"
    }, "score"))), canExecute && /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 mt-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: handleCreateAppointment,
      disabled: loading,
      className: "flex-1 px-2 py-1 text-xs font-medium bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
    }, loading ? '⏳' : '✓', " Encaixe"), /*#__PURE__*/React.createElement("button", {
      onClick: handleIgnore,
      disabled: loading,
      className: "flex-1 px-2 py-1 text-xs font-medium bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
    }, "\u2715 Ignorar")));
  }

  // Layout expandido
  return /*#__PURE__*/React.createElement("div", {
    className: `border rounded-lg ${colors.bg} ${colors.border} mb-3 overflow-hidden`
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 cursor-pointer",
    onClick: () => setExpanded(!expanded)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`
  }, /*#__PURE__*/React.createElement(TrendingUp, {
    className: `w-5 h-5 ${colors.icon}`
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900"
  }, suggestion.patient_name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, suggestion.service_name))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(DollarSign, {
    className: "w-4 h-4 text-green-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-green-600"
  }, "R$ ", suggestion.valor_estimado.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Clock, {
    className: "w-4 h-4 text-blue-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700"
  }, suggestion.duracao_minutos, "min")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, showFullScore ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AlertCircle, {
    className: `w-4 h-4 ${colors.icon}`
  }), /*#__PURE__*/React.createElement("span", {
    className: `font-bold ${colors.text}`
  }, suggestion.score_financeiro)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Eye, {
    className: `w-4 h-4 ${colors.icon}`
  }), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold px-2 py-0.5 rounded ${colors.badge}`
  }, suggestion.prioridade)))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 mt-2"
  }, "\uD83D\uDCA1 ", suggestion.justificativa)), /*#__PURE__*/React.createElement("div", {
    className: "flex-shrink-0 pt-2"
  }, expanded ? /*#__PURE__*/React.createElement(ChevronUp, {
    className: "w-5 h-5 text-gray-600"
  }) : /*#__PURE__*/React.createElement(ChevronDown, {
    className: "w-5 h-5 text-gray-600"
  })))), expanded && /*#__PURE__*/React.createElement("div", {
    className: `border-t ${colors.border} px-4 py-3 bg-white bg-opacity-50`
  }, showFullScore && /*#__PURE__*/React.createElement("div", {
    className: "mb-3 pb-3 border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-gray-700 mb-2"
  }, "SCORE FINANCEIRO"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Score:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, suggestion.score_financeiro, "/100")), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Valor:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, "R$ ", suggestion.valor_estimado.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Margem:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, "R$ ", suggestion.margem_estimada.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Dura\xE7\xE3o:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, suggestion.duracao_minutos, " min")))), /*#__PURE__*/React.createElement("div", {
    className: "mb-3 pb-3 border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-gray-700 mb-2"
  }, "DETALHES DO SERVI\xC7O"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 text-xs"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Tipo:"), " ", SERVICE_TYPE_LABELS[suggestion.service_type] || suggestion.service_type), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Paciente:"), " ", suggestion.patient_name), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "No-shows hist\xF3rico:"), " ", suggestion.no_show_historico))), /*#__PURE__*/React.createElement("div", {
    className: "mb-3 pb-3 border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-gray-700 mb-2"
  }, "AN\xC1LISE FINANCEIRA"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 text-xs"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Receita/hora:"), " R$ ", (suggestion.valor_estimado / (suggestion.duracao_minutos / 60)).toFixed(2)), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Margem %:"), " ", (suggestion.margem_estimada / suggestion.valor_estimado * 100).toFixed(0), "%"), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Confiabilidade:"), " ", suggestion.no_show_historico === 0 ? '✅ Excelente' : '⚠️ Com histórico'))), canExecute && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleCreateAppointment,
    disabled: loading,
    className: "flex-1 px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Check, {
    className: "w-4 h-4"
  }), loading ? 'Processando...' : 'Criar Encaixe'), /*#__PURE__*/React.createElement("button", {
    onClick: handleIgnore,
    disabled: loading,
    className: "flex-1 px-4 py-2 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(X, {
    className: "w-4 h-4"
  }), loading ? 'Processando...' : 'Ignorar'))));
}

// ============================================================================
// COMPONENT: Financial Priority Suggestions List
// ============================================================================

export function FinancialPrioritySuggestions({
  suggestions = [],
  loading = false,
  error = null,
  onCreateAppointment,
  onIgnore,
  userRole = 'recepcion',
  compact = false,
  className = ''
}) {
  const [ignoredIds, setIgnoredIds] = useState(new Set());

  // Filtrar sugestões ignoradas
  const visibleSuggestions = useMemo(() => {
    return suggestions.filter(s => !ignoredIds.has(s.id));
  }, [suggestions, ignoredIds]);

  // Agrupar por prioridade
  const grouped = useMemo(() => {
    const result = {
      [PRIORITY_LEVELS.ALTA]: [],
      [PRIORITY_LEVELS.MEDIA]: [],
      [PRIORITY_LEVELS.BAIXA]: []
    };
    visibleSuggestions.forEach(s => {
      result[s.prioridade]?.push(s);
    });
    return result;
  }, [visibleSuggestions]);
  const handleIgnore = async suggestion => {
    setIgnoredIds(prev => new Set([...prev, suggestion.id]));
    if (onIgnore) {
      await onIgnore(suggestion);
    }
  };

  // Estado vazio
  if (!loading && visibleSuggestions.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: `text-center py-8 px-4 ${className}`
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      className: "w-12 h-12 text-gray-300 mx-auto mb-2"
    }), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-500 font-medium"
    }, "Nenhuma sugest\xE3o financeira dispon\xEDvel"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-400 text-sm"
    }, "Quando houver pacientes em lista de espera, as melhores oportunidades aparecer\xE3o aqui."));
  }

  // Estado carregando
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: `text-center py-8 px-4 ${className}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "inline-block"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"
    })), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 font-medium mt-2"
    }, "Analisando oportunidades..."));
  }

  // Erro
  if (error) {
    return /*#__PURE__*/React.createElement("div", {
      className: `p-4 bg-red-50 border border-red-300 rounded-lg ${className}`
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-red-700 font-medium"
    }, "\u274C Erro ao carregar sugest\xF5es"), /*#__PURE__*/React.createElement("p", {
      className: "text-red-600 text-sm"
    }, error.message));
  }

  // Layout compacto
  if (compact) {
    return /*#__PURE__*/React.createElement("div", {
      className: className
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-bold text-gray-900 mb-3"
    }, "\uD83D\uDCB0 Top Oportunidades Financeiras"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-0"
    }, visibleSuggestions.slice(0, 5).map(suggestion => /*#__PURE__*/React.createElement(FinancialSuggestionCard, {
      key: suggestion.id,
      suggestion: suggestion,
      onCreateAppointment: onCreateAppointment,
      onIgnore: handleIgnore,
      userRole: userRole,
      compact: true
    })), visibleSuggestions.length > 5 && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-500 text-center py-2"
    }, "+", visibleSuggestions.length - 5, " mais")));
  }

  // Layout expandido com agrupamento
  return /*#__PURE__*/React.createElement("div", {
    className: className
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-900 mb-2"
  }, "\uD83D\uDCB0 Sugest\xF5es Inteligentes por Prioridade Financeira"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, visibleSuggestions.length, " oportunidade", visibleSuggestions.length !== 1 ? 's' : '', " encontrada", visibleSuggestions.length !== 1 ? 's' : '')), grouped[PRIORITY_LEVELS.ALTA].length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-red-700 mb-3"
  }, "\uD83D\uDD34 ALTA PRIORIDADE (", grouped[PRIORITY_LEVELS.ALTA].length, ")"), /*#__PURE__*/React.createElement("div", null, grouped[PRIORITY_LEVELS.ALTA].map(suggestion => /*#__PURE__*/React.createElement(FinancialSuggestionCard, {
    key: suggestion.id,
    suggestion: suggestion,
    onCreateAppointment: onCreateAppointment,
    onIgnore: handleIgnore,
    userRole: userRole
  })))), grouped[PRIORITY_LEVELS.MEDIA].length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-yellow-700 mb-3"
  }, "\uD83D\uDFE1 M\xC9DIA PRIORIDADE (", grouped[PRIORITY_LEVELS.MEDIA].length, ")"), /*#__PURE__*/React.createElement("div", null, grouped[PRIORITY_LEVELS.MEDIA].map(suggestion => /*#__PURE__*/React.createElement(FinancialSuggestionCard, {
    key: suggestion.id,
    suggestion: suggestion,
    onCreateAppointment: onCreateAppointment,
    onIgnore: handleIgnore,
    userRole: userRole
  })))), grouped[PRIORITY_LEVELS.BAIXA].length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-blue-700 mb-3"
  }, "\uD83D\uDD35 BAIXA PRIORIDADE (", grouped[PRIORITY_LEVELS.BAIXA].length, ")"), /*#__PURE__*/React.createElement("div", null, grouped[PRIORITY_LEVELS.BAIXA].map(suggestion => /*#__PURE__*/React.createElement(FinancialSuggestionCard, {
    key: suggestion.id,
    suggestion: suggestion,
    onCreateAppointment: onCreateAppointment,
    onIgnore: handleIgnore,
    userRole: userRole
  })))));
}
export default FinancialPrioritySuggestions;