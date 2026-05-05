/**
 * AgendaSuggestions.jsx
 * 
 * 💡 COMPONENTE DE SUGESTÕES INTELIGENTES
 * 
 * Exibe sugestões de encaixe com ações contextuais:
 * - Cards com ícones por tipo
 * - Destaque visual por prioridade
 * - Botões de ação (Ver espera, Criar encaixe, Ignorar)
 * - Integração com lista de espera
 */

import React, { useState, useEffect } from "react";
import { AlertCircle, Clock, Users, TrendingDown, ChevronRight, X, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { generateEncaixeSuggestions, logSuggestionAction } from "@/lib/agendaSuggestionsApi";
const SUGGESTION_TYPE_ICONS = {
  SLOT_LIVRE: Clock,
  NO_SHOW: AlertTriangle,
  PROFISSIONAL_OCIOSO: Users,
  AGENDA_CRITICA: TrendingDown
};
const PRIORITY_COLORS = {
  ALTA: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
    button: "bg-red-500 hover:bg-red-600"
  },
  MEDIA: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    button: "bg-yellow-500 hover:bg-yellow-600"
  },
  BAIXA: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    button: "bg-blue-500 hover:bg-blue-600"
  }
};
export default function AgendaSuggestions({
  clinicId,
  date,
  onSuggestionAction,
  userRole,
  compact = false
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ignoredSuggestions, setIgnoredSuggestions] = useState(new Set());
  const [expandedCard, setExpandedCard] = useState(null);

  // Carregar sugestões quando data ou clinicId mudam
  useEffect(() => {
    if (!clinicId || !date) return;
    const loadSuggestions = async () => {
      setLoading(true);
      try {
        const data = await generateEncaixeSuggestions(clinicId, date);
        setSuggestions(data);
      } catch (err) {
        console.error("Erro ao carregar sugestões:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSuggestions();
  }, [clinicId, date]);

  // Verificar permissões
  const canViewSuggestions = userRole === "recepcion" || userRole === "gestor" || userRole === "admin";
  if (!canViewSuggestions) return null;
  const visibleSuggestions = suggestions.filter((_, idx) => !ignoredSuggestions.has(idx));
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-4 bg-gray-100 rounded-lg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "animate-pulse flex gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-8 w-8 bg-gray-300 rounded"
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 space-y-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-4 bg-gray-300 rounded w-3/4"
    }), /*#__PURE__*/React.createElement("div", {
      className: "h-3 bg-gray-300 rounded w-1/2"
    }))));
  }
  if (visibleSuggestions.length === 0) {
    return null;
  }
  return /*#__PURE__*/React.createElement("div", {
    className: `space-y-3 ${compact ? "max-h-96 overflow-y-auto" : ""}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-4"
  }, /*#__PURE__*/React.createElement(Zap, {
    className: "w-5 h-5 text-amber-500"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900"
  }, "Sugest\xF5es Inteligentes"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-500"
  }, visibleSuggestions.length, " oportunidade", visibleSuggestions.length !== 1 ? "s" : "")), visibleSuggestions.map((suggestion, idx) => /*#__PURE__*/React.createElement(SuggestionCard, {
    key: idx,
    suggestion: suggestion,
    index: idx,
    colors: PRIORITY_COLORS[suggestion.prioridade],
    icon: SUGGESTION_TYPE_ICONS[suggestion.type],
    onAction: action => handleSuggestionAction(suggestion, action, idx),
    onIgnore: () => handleIgnoreSuggestion(idx),
    expanded: expandedCard === idx,
    onToggleExpand: () => setExpandedCard(expandedCard === idx ? null : idx),
    canExecute: userRole === "recepcion" || userRole === "gestor"
  })));
  async function handleSuggestionAction(suggestion, action, idx) {
    try {
      // Log de auditoria
      await logSuggestionAction({
        suggestionType: suggestion.type,
        clinicId,
        action
      });

      // Callback para página pai executar ação
      if (onSuggestionAction) {
        onSuggestionAction({
          suggestion,
          action,
          timestamp: new Date().toISOString()
        });
      }

      // Remover sugestão
      const newIgnored = new Set(ignoredSuggestions);
      newIgnored.add(idx);
      setIgnoredSuggestions(newIgnored);
    } catch (err) {
      console.error("Erro ao executar ação de sugestão:", err);
    }
  }
  function handleIgnoreSuggestion(idx) {
    const newIgnored = new Set(ignoredSuggestions);
    newIgnored.add(idx);
    setIgnoredSuggestions(newIgnored);

    // Log que foi ignorada
    const suggestion = suggestions[idx];
    logSuggestionAction({
      suggestionType: suggestion.type,
      clinicId,
      action: "IGNORADA"
    }).catch(console.error);
  }
}

/**
 * Componente individual de card de sugestão
 */
function SuggestionCard({
  suggestion,
  colors,
  icon: IconComponent,
  onAction,
  onIgnore,
  expanded,
  onToggleExpand,
  canExecute,
  index
}) {
  const priorityLabel = {
    ALTA: "🔴 Alta",
    MEDIA: "🟡 Média",
    BAIXA: "🔵 Baixa"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: `
        border-l-4 rounded-lg p-4 transition-all cursor-pointer
        ${colors.bg} ${colors.border} border
        ${expanded ? "ring-2 ring-offset-2 ring-gray-400" : ""}
      `,
    onClick: onToggleExpand
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement(IconComponent, {
    className: "w-5 h-5 mt-0.5 flex-shrink-0",
    style: {
      color: getColorByPriority(suggestion.prioridade)
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-900 text-sm"
  }, getTitleByType(suggestion.type)), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-medium px-2 py-0.5 rounded ${colors.badge}`
  }, priorityLabel[suggestion.prioridade])), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700 leading-relaxed"
  }, suggestion.mensagem), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4 mt-2 text-xs text-gray-600"
  }, suggestion.horario && suggestion.horario !== "Dia inteiro" && /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Clock, {
    className: "w-3.5 h-3.5"
  }), suggestion.horario), suggestion.profissional_nome && /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Users, {
    className: "w-3.5 h-3.5"
  }), suggestion.profissional_nome))), /*#__PURE__*/React.createElement("button", {
    className: "text-gray-400 hover:text-gray-600 flex-shrink-0",
    onClick: e => {
      e.stopPropagation();
      onToggleExpand();
    }
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    className: `w-5 h-5 transition-transform ${expanded ? "rotate-90" : ""}`
  }))), expanded && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-gray-200 space-y-3"
  }, suggestion.metadata && /*#__PURE__*/React.createElement("div", {
    className: "bg-white bg-opacity-50 rounded p-2 text-xs text-gray-600 space-y-1"
  }, suggestion.metadata.waitlistSize && /*#__PURE__*/React.createElement("p", null, "\uD83D\uDC65 ", /*#__PURE__*/React.createElement("strong", null, suggestion.metadata.waitlistSize), " pacientes na fila"), suggestion.metadata.occupancyRate !== undefined && /*#__PURE__*/React.createElement("p", null, "\uD83D\uDCCA Taxa de ocupa\xE7\xE3o: ", /*#__PURE__*/React.createElement("strong", null, (suggestion.metadata.occupancyRate * 100).toFixed(0), "%")), suggestion.metadata.estimatedRevenue && /*#__PURE__*/React.createElement("p", null, "\uD83D\uDCB0 Receita estimada: ", /*#__PURE__*/React.createElement("strong", null, "R$ ", suggestion.metadata.estimatedRevenue.toFixed(2))), suggestion.metadata.appointmentsToday !== undefined && /*#__PURE__*/React.createElement("p", null, "\uD83D\uDCC5 Atendimentos hoje: ", /*#__PURE__*/React.createElement("strong", null, suggestion.metadata.appointmentsToday))), canExecute && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onAction(suggestion.acao);
    },
    className: `
                  flex-1 px-3 py-2 rounded text-white text-sm font-medium
                  transition-colors ${colors.button}
                  flex items-center justify-center gap-2
                `
  }, /*#__PURE__*/React.createElement(CheckCircle, {
    className: "w-4 h-4"
  }), getLabelByAction(suggestion.acao)), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onIgnore();
    },
    className: "\r px-3 py-2 rounded bg-white border border-gray-300\r text-gray-700 text-sm font-medium hover:bg-gray-50\r transition-colors flex items-center justify-center gap-2\r "
  }, /*#__PURE__*/React.createElement(X, {
    className: "w-4 h-4"
  }), "Ignorar"))));
}

/**
 * Mapear tipo de sugestão para título amigável
 */
function getTitleByType(type) {
  const titles = {
    SLOT_LIVRE: "💫 Horário Nobre Disponível",
    NO_SHOW: "⚠️ Falta Confirmada",
    PROFISSIONAL_OCIOSO: "😴 Profissional Ocioso",
    AGENDA_CRITICA: "🚨 Agenda Crítica"
  };
  return titles[type] || "Sugestão";
}

/**
 * Mapear ação sugerida para label do botão
 */
function getLabelByAction(action) {
  const labels = {
    VER_LISTA_ESPERA: "Ver Lista de Espera",
    CRIAR_ENCAIXE: "Criar Encaixe",
    CONTATAR_PACIENTE: "Contatar Paciente",
    OTIMIZAR_AGENDA: "Otimizar Agenda",
    IGNORAR: "Ignorar"
  };
  return labels[action] || "Executar";
}

/**
 * Obter cor por prioridade
 */
function getColorByPriority(priority) {
  const colors = {
    ALTA: "#dc2626",
    MEDIA: "#ea8c2f",
    BAIXA: "#2563eb"
  };
  return colors[priority] || "#6b7280";
}