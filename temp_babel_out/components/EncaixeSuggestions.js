/**
 * EncaixeSuggestions - Componente visual para exibir sugestões de encaixe
 * Mostra top 3 sugestões com score visual e motivo da recomendação
 */

import React from 'react';
export default function EncaixeSuggestions({
  suggestions = [],
  onSelect = null,
  loading = false
}) {
  // Não renderizar se não houver sugestões
  if (!suggestions || suggestions.length === 0) {
    return null;
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\uD83D\uDCA1"), /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-900"
  }, "Sugest\xF5es de Encaixe Inteligente"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
  }, suggestions.length, " op\xE7\xE3o", suggestions.length !== 1 ? 's' : '')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, suggestions.map((sugestao, index) => /*#__PURE__*/React.createElement(SuggestionCard, {
    key: index,
    sugestao: sugestao,
    index: index,
    onSelect: onSelect,
    disabled: loading
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-blue-200 text-xs text-gray-600"
  }, /*#__PURE__*/React.createElement("p", null, "\u2713 Sem conflitos \u2022 \u2713 Baseado em disponibilidade real \u2022 \u2713 Voc\xEA escolhe")));
}

/**
 * Card individual de sugestão
 */
function SuggestionCard({
  sugestao,
  index,
  onSelect,
  disabled
}) {
  const {
    horario,
    profissional,
    sala,
    score,
    ocupacao,
    consecutivos,
    motivo
  } = sugestao;

  // Determinar cor baseada no score
  const getScoreColor = () => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-blue-600';
    return 'text-gray-600';
  };
  const getScoreBg = () => {
    if (score >= 75) return 'bg-green-100';
    if (score >= 50) return 'bg-blue-100';
    return 'bg-gray-100';
  };

  // Determinad rótulo de qualidade
  const getLabel = () => {
    if (index === 0) return '🏆 Ideal';
    if (index === 1) return '✓ Bom';
    return '○ Alternativa';
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onSelect?.(sugestao),
    disabled: disabled,
    className: "w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-gray-900"
  }, horario), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500 text-sm ml-2"
  }, "\u2022 ", profissional?.name || profissional?.nome || 'Prof.', " \u2022 ", sala?.name || sala?.nome || 'Sala')), /*#__PURE__*/React.createElement("div", {
    className: `flex items-center gap-2 px-3 py-1 rounded-full ${getScoreBg()}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `font-bold text-sm ${getScoreColor()}`
  }, Math.round(score), "%"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-600"
  }, getLabel()))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-xs text-gray-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "italic"
  }, motivo), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 text-right"
  }, /*#__PURE__*/React.createElement("span", {
    title: "Ocupa\xE7\xE3o do hor\xE1rio"
  }, "\uD83D\uDCCA ", ocupacao, "% ocupado"), /*#__PURE__*/React.createElement("span", {
    title: "Slots consecutivos livres",
    className: "text-green-600"
  }, "\u2713 ", consecutivos, " slots"))));
}

/**
 * Exportar componente carregando (skeleton)
 */
export function EncaixeSuggestionsLoading() {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\uD83D\uDCA1"), /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-900"
  }, "Analisando sugest\xF5es de encaixe...")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, [1, 2, 3].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "h-12 bg-blue-100 rounded-lg animate-pulse"
  }))));
}