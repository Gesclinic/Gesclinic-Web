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
import {
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Eye,
} from 'lucide-react';
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
    icon: 'text-red-500',
  },
  [PRIORITY_LEVELS.MEDIA]: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: 'text-yellow-500',
  },
  [PRIORITY_LEVELS.BAIXA]: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
    icon: 'text-blue-500',
  },
};

const SERVICE_TYPE_LABELS = {
  [SERVICE_TYPES.CONSULTA]: '📋 Consulta',
  [SERVICE_TYPES.EXAME]: '🔬 Exame',
  [SERVICE_TYPES.PROCEDIMENTO]: '🏥 Procedimento',
  [SERVICE_TYPES.RETORNO]: '↩️ Retorno',
};

// ============================================================================
// COMPONENT: Financial Suggestion Card
// ============================================================================

function FinancialSuggestionCard({
  suggestion,
  onCreateAppointment,
  onIgnore,
  userRole,
  compact = false,
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
    return (
      <div className={`p-3 border rounded-lg ${colors.bg} ${colors.border} mb-2`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm text-gray-900 truncate">
                {suggestion.patient_name}
              </h4>
              <span className={`text-xs font-bold px-2 py-1 rounded ${colors.badge}`}>
                {suggestion.prioridade}
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-1">{suggestion.service_name}</p>
            <p className="text-xs text-gray-500">R$ {suggestion.valor_estimado.toFixed(2)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-lg font-bold ${colors.icon}`}>{suggestion.score_financeiro}</div>
            <p className="text-xs text-gray-500">score</p>
          </div>
        </div>
        {canExecute && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreateAppointment}
              disabled={loading}
              className="flex-1 px-2 py-1 text-xs font-medium bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? '⏳' : '✓'} Encaixe
            </button>
            <button
              onClick={handleIgnore}
              disabled={loading}
              className="flex-1 px-2 py-1 text-xs font-medium bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
            >
              ✕ Ignorar
            </button>
          </div>
        )}
      </div>
    );
  }

  // Layout expandido
  return (
    <div className={`border rounded-lg ${colors.bg} ${colors.border} mb-3 overflow-hidden`}>
      {/* Header - Sempre visível */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Ranking + Prioridade */}
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}
              >
                <TrendingUp className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{suggestion.patient_name}</h3>
                <p className="text-sm text-gray-600">{suggestion.service_name}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-600">
                  R$ {suggestion.valor_estimado.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">{suggestion.duracao_minutos}min</span>
              </div>
              <div className="flex items-center gap-1">
                {showFullScore ? (
                  <>
                    <AlertCircle className={`w-4 h-4 ${colors.icon}`} />
                    <span className={`font-bold ${colors.text}`}>
                      {suggestion.score_financeiro}
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className={`w-4 h-4 ${colors.icon}`} />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                      {suggestion.prioridade}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Justificativa */}
            <p className="text-xs text-gray-600 mt-2">💡 {suggestion.justificativa}</p>
          </div>

          {/* Expandir/Colapsar */}
          <div className="flex-shrink-0 pt-2">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </div>
        </div>
      </div>

      {/* Detalhes - Expandido */}
      {expanded && (
        <div className={`border-t ${colors.border} px-4 py-3 bg-white bg-opacity-50`}>
          {/* Score Detalhado (apenas para gestor/admin) */}
          {showFullScore && (
            <div className="mb-3 pb-3 border-b border-gray-200">
              <h4 className="text-xs font-bold text-gray-700 mb-2">SCORE FINANCEIRO</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Score:</span>
                  <span className="font-bold">{suggestion.score_financeiro}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor:</span>
                  <span className="font-bold">R$ {suggestion.valor_estimado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Margem:</span>
                  <span className="font-bold">R$ {suggestion.margem_estimada.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duração:</span>
                  <span className="font-bold">{suggestion.duracao_minutos} min</span>
                </div>
              </div>
            </div>
          )}

          {/* Detalhes do Serviço */}
          <div className="mb-3 pb-3 border-b border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 mb-2">DETALHES DO SERVIÇO</h4>
            <div className="space-y-1 text-xs">
              <p>
                <span className="text-gray-600">Tipo:</span>{' '}
                {SERVICE_TYPE_LABELS[suggestion.service_type] || suggestion.service_type}
              </p>
              <p>
                <span className="text-gray-600">Paciente:</span> {suggestion.patient_name}
              </p>
              <p>
                <span className="text-gray-600">No-shows histórico:</span>{' '}
                {suggestion.no_show_historico}
              </p>
            </div>
          </div>

          {/* Análise Financeira */}
          <div className="mb-3 pb-3 border-b border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 mb-2">ANÁLISE FINANCEIRA</h4>
            <div className="space-y-1 text-xs">
              <p>
                <span className="text-gray-600">Receita/hora:</span> R${' '}
                {(suggestion.valor_estimado / (suggestion.duracao_minutos / 60)).toFixed(2)}
              </p>
              <p>
                <span className="text-gray-600">Margem %:</span>{' '}
                {((suggestion.margem_estimada / suggestion.valor_estimado) * 100).toFixed(0)}%
              </p>
              <p>
                <span className="text-gray-600">Confiabilidade:</span>{' '}
                {suggestion.no_show_historico === 0 ? '✅ Excelente' : '⚠️ Com histórico'}
              </p>
            </div>
          </div>

          {/* Ações */}
          {canExecute && (
            <div className="flex gap-2">
              <button
                onClick={handleCreateAppointment}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {loading ? 'Processando...' : 'Criar Encaixe'}
              </button>
              <button
                onClick={handleIgnore}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                {loading ? 'Processando...' : 'Ignorar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  className = '',
}) {
  const [ignoredIds, setIgnoredIds] = useState(new Set());

  // Filtrar sugestões ignoradas
  const visibleSuggestions = useMemo(() => {
    return suggestions.filter((s) => !ignoredIds.has(s.id));
  }, [suggestions, ignoredIds]);

  // Agrupar por prioridade
  const grouped = useMemo(() => {
    const result = {
      [PRIORITY_LEVELS.ALTA]: [],
      [PRIORITY_LEVELS.MEDIA]: [],
      [PRIORITY_LEVELS.BAIXA]: [],
    };

    visibleSuggestions.forEach((s) => {
      result[s.prioridade]?.push(s);
    });

    return result;
  }, [visibleSuggestions]);

  const handleIgnore = async (suggestion) => {
    setIgnoredIds((prev) => new Set([...prev, suggestion.id]));
    if (onIgnore) {
      await onIgnore(suggestion);
    }
  };

  // Estado vazio
  if (!loading && visibleSuggestions.length === 0) {
    return (
      <div className={`text-center py-8 px-4 ${className}`}>
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 font-medium">Nenhuma sugestão financeira disponível</p>
        <p className="text-gray-400 text-sm">
          Quando houver pacientes em lista de espera, as melhores oportunidades aparecerão aqui.
        </p>
      </div>
    );
  }

  // Estado carregando
  if (loading) {
    return (
      <div className={`text-center py-8 px-4 ${className}`}>
        <div className="inline-block">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 font-medium mt-2">Analisando oportunidades...</p>
      </div>
    );
  }

  // Erro
  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-300 rounded-lg ${className}`}>
        <p className="text-red-700 font-medium">❌ Erro ao carregar sugestões</p>
        <p className="text-red-600 text-sm">{error.message}</p>
      </div>
    );
  }

  // Layout compacto
  if (compact) {
    return (
      <div className={className}>
        <h3 className="font-bold text-gray-900 mb-3">💰 Top Oportunidades Financeiras</h3>
        <div className="space-y-0">
          {visibleSuggestions.slice(0, 5).map((suggestion) => (
            <FinancialSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onCreateAppointment={onCreateAppointment}
              onIgnore={handleIgnore}
              userRole={userRole}
              compact
            />
          ))}
          {visibleSuggestions.length > 5 && (
            <p className="text-xs text-gray-500 text-center py-2">
              +{visibleSuggestions.length - 5} mais
            </p>
          )}
        </div>
      </div>
    );
  }

  // Layout expandido com agrupamento
  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          💰 Sugestões Inteligentes por Prioridade Financeira
        </h2>
        <p className="text-sm text-gray-600">
          {visibleSuggestions.length} oportunidade{visibleSuggestions.length !== 1 ? 's' : ''}{' '}
          encontrada{visibleSuggestions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* PRIORIDADE ALTA */}
      {grouped[PRIORITY_LEVELS.ALTA].length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-red-700 mb-3">
            🔴 ALTA PRIORIDADE ({grouped[PRIORITY_LEVELS.ALTA].length})
          </h3>
          <div>
            {grouped[PRIORITY_LEVELS.ALTA].map((suggestion) => (
              <FinancialSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onCreateAppointment={onCreateAppointment}
                onIgnore={handleIgnore}
                userRole={userRole}
              />
            ))}
          </div>
        </div>
      )}

      {/* PRIORIDADE MÉDIA */}
      {grouped[PRIORITY_LEVELS.MEDIA].length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-yellow-700 mb-3">
            🟡 MÉDIA PRIORIDADE ({grouped[PRIORITY_LEVELS.MEDIA].length})
          </h3>
          <div>
            {grouped[PRIORITY_LEVELS.MEDIA].map((suggestion) => (
              <FinancialSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onCreateAppointment={onCreateAppointment}
                onIgnore={handleIgnore}
                userRole={userRole}
              />
            ))}
          </div>
        </div>
      )}

      {/* PRIORIDADE BAIXA */}
      {grouped[PRIORITY_LEVELS.BAIXA].length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-blue-700 mb-3">
            🔵 BAIXA PRIORIDADE ({grouped[PRIORITY_LEVELS.BAIXA].length})
          </h3>
          <div>
            {grouped[PRIORITY_LEVELS.BAIXA].map((suggestion) => (
              <FinancialSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onCreateAppointment={onCreateAppointment}
                onIgnore={handleIgnore}
                userRole={userRole}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialPrioritySuggestions;
