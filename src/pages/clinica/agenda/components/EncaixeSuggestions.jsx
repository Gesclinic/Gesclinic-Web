/**
 * EncaixeSuggestions - Componente visual para exibir sugestões de encaixe
 * Mostra top 3 sugestões com score visual e motivo da recomendação
 */

import React from 'react';

export default function EncaixeSuggestions({ suggestions = [], onSelect = null, loading = false }) {
  // Não renderizar se não houver sugestões
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">💡</span>
        <h4 className="font-semibold text-gray-900">Sugestões de Encaixe Inteligente</h4>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
          {suggestions.length} opção{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista de sugestões */}
      <div className="space-y-2">
        {suggestions.map((sugestao, index) => (
          <SuggestionCard
            key={index}
            sugestao={sugestao}
            index={index}
            onSelect={onSelect}
            disabled={loading}
          />
        ))}
      </div>

      {/* Rodapé com dica */}
      <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-gray-600">
        <p>✓ Sem conflitos • ✓ Baseado em disponibilidade real • ✓ Você escolhe</p>
      </div>
    </div>
  );
}

/**
 * Card individual de sugestão
 */
function SuggestionCard({ sugestao, index, onSelect, disabled }) {
  const { horario, profissional, sala, score, ocupacao, consecutivos, motivo } = sugestao;

  // Determinar cor baseada no score
  const getScoreColor = () => {
    if (score >= 75) {
      return 'text-green-600';
    }
    if (score >= 50) {
      return 'text-blue-600';
    }
    return 'text-gray-600';
  };

  const getScoreBg = () => {
    if (score >= 75) {
      return 'bg-green-100';
    }
    if (score >= 50) {
      return 'bg-blue-100';
    }
    return 'bg-gray-100';
  };

  // Determinad rótulo de qualidade
  const getLabel = () => {
    if (index === 0) {
      return '🏆 Ideal';
    }
    if (index === 1) {
      return '✓ Bom';
    }
    return '○ Alternativa';
  };

  return (
    <button
      onClick={() => onSelect?.(sugestao)}
      disabled={disabled}
      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Linha 1: Horário, Profissional, Sala + Score */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex-1">
          <span className="font-semibold text-gray-900">{horario}</span>
          <span className="text-gray-500 text-sm ml-2">
            • {profissional?.name || profissional?.nome || 'Prof.'} •{' '}
            {sala?.name || sala?.nome || 'Sala'}
          </span>
        </div>

        {/* Score visual (direita) */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getScoreBg()}`}>
          <span className={`font-bold text-sm ${getScoreColor()}`}>{Math.round(score)}%</span>
          <span className="text-xs text-gray-600">{getLabel()}</span>
        </div>
      </div>

      {/* Linha 2: Motivo + Ocupação + Slots */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="italic">{motivo}</span>
        <div className="flex gap-3 text-right">
          <span title="Ocupação do horário">📊 {ocupacao}% ocupado</span>
          <span title="Slots consecutivos livres" className="text-green-600">
            ✓ {consecutivos} slots
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Exportar componente carregando (skeleton)
 */
export function EncaixeSuggestionsLoading() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">💡</span>
        <h4 className="font-semibold text-gray-900">Analisando sugestões de encaixe...</h4>
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-blue-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
