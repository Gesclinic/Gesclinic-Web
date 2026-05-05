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

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Clock,
  Users,
  TrendingDown,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { generateEncaixeSuggestions, logSuggestionAction } from '@/lib/agendaSuggestionsApi';

const SUGGESTION_TYPE_ICONS = {
  SLOT_LIVRE: Clock,
  NO_SHOW: AlertTriangle,
  PROFISSIONAL_OCIOSO: Users,
  AGENDA_CRITICA: TrendingDown,
};

const PRIORITY_COLORS = {
  ALTA: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    button: 'bg-red-500 hover:bg-red-600',
  },
  MEDIA: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800',
    button: 'bg-yellow-500 hover:bg-yellow-600',
  },
  BAIXA: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    button: 'bg-blue-500 hover:bg-blue-600',
  },
};

export default function AgendaSuggestions({
  clinicId,
  date,
  onSuggestionAction,
  userRole,
  compact = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ignoredSuggestions, setIgnoredSuggestions] = useState(new Set());
  const [expandedCard, setExpandedCard] = useState(null);

  // Carregar sugestões quando data ou clinicId mudam
  useEffect(() => {
    if (!clinicId || !date) {
      return;
    }

    const loadSuggestions = async () => {
      setLoading(true);
      try {
        const data = await generateEncaixeSuggestions(clinicId, date);
        setSuggestions(data);
      } catch (err) {
        console.error('Erro ao carregar sugestões:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [clinicId, date]);

  // Verificar permissões
  const canViewSuggestions =
    userRole === 'recepcion' || userRole === 'gestor' || userRole === 'admin';

  if (!canViewSuggestions) {
    return null;
  }

  const visibleSuggestions = suggestions.filter((_, idx) => !ignoredSuggestions.has(idx));

  if (loading) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <div className="animate-pulse flex gap-3">
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${compact ? 'max-h-96 overflow-y-auto' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-gray-900">Sugestões Inteligentes</h3>
        <span className="text-sm font-medium text-gray-500">
          {visibleSuggestions.length} oportunidade{visibleSuggestions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {visibleSuggestions.map((suggestion, idx) => (
        <SuggestionCard
          key={idx}
          suggestion={suggestion}
          index={idx}
          colors={PRIORITY_COLORS[suggestion.prioridade]}
          icon={SUGGESTION_TYPE_ICONS[suggestion.type]}
          onAction={(action) => handleSuggestionAction(suggestion, action, idx)}
          onIgnore={() => handleIgnoreSuggestion(idx)}
          expanded={expandedCard === idx}
          onToggleExpand={() => setExpandedCard(expandedCard === idx ? null : idx)}
          canExecute={userRole === 'recepcion' || userRole === 'gestor'}
        />
      ))}
    </div>
  );

  async function handleSuggestionAction(suggestion, action, idx) {
    try {
      // Log de auditoria
      await logSuggestionAction({
        suggestionType: suggestion.type,
        clinicId,
        action,
      });

      // Callback para página pai executar ação
      if (onSuggestionAction) {
        onSuggestionAction({
          suggestion,
          action,
          timestamp: new Date().toISOString(),
        });
      }

      // Remover sugestão
      const newIgnored = new Set(ignoredSuggestions);
      newIgnored.add(idx);
      setIgnoredSuggestions(newIgnored);
    } catch (err) {
      console.error('Erro ao executar ação de sugestão:', err);
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
      action: 'IGNORADA',
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
  index,
}) {
  const priorityLabel = {
    ALTA: '🔴 Alta',
    MEDIA: '🟡 Média',
    BAIXA: '🔵 Baixa',
  };

  return (
    <div
      className={`
        border-l-4 rounded-lg p-4 transition-all cursor-pointer
        ${colors.bg} ${colors.border} border
        ${expanded ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
      `}
      onClick={onToggleExpand}
    >
      {/* Header do card */}
      <div className="flex items-start gap-3">
        <IconComponent
          className="w-5 h-5 mt-0.5 flex-shrink-0"
          style={{ color: getColorByPriority(suggestion.prioridade) }}
        />

        <div className="flex-1 min-w-0">
          {/* Título e Prioridade */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 text-sm">
              {getTitleByType(suggestion.type)}
            </h4>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.badge}`}>
              {priorityLabel[suggestion.prioridade]}
            </span>
          </div>

          {/* Mensagem principal */}
          <p className="text-sm text-gray-700 leading-relaxed">{suggestion.mensagem}</p>

          {/* Horário e Profissional */}
          <div className="flex gap-4 mt-2 text-xs text-gray-600">
            {suggestion.horario && suggestion.horario !== 'Dia inteiro' && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {suggestion.horario}
              </span>
            )}
            {suggestion.profissional_nome && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {suggestion.profissional_nome}
              </span>
            )}
          </div>
        </div>

        {/* Botão expandir */}
        <button
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          <ChevronRight className={`w-5 h-5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {/* Metadados */}
          {suggestion.metadata && (
            <div className="bg-white bg-opacity-50 rounded p-2 text-xs text-gray-600 space-y-1">
              {suggestion.metadata.waitlistSize && (
                <p>
                  👥 <strong>{suggestion.metadata.waitlistSize}</strong> pacientes na fila
                </p>
              )}
              {suggestion.metadata.occupancyRate !== undefined && (
                <p>
                  📊 Taxa de ocupação:{' '}
                  <strong>{(suggestion.metadata.occupancyRate * 100).toFixed(0)}%</strong>
                </p>
              )}
              {suggestion.metadata.estimatedRevenue && (
                <p>
                  💰 Receita estimada:{' '}
                  <strong>R$ {suggestion.metadata.estimatedRevenue.toFixed(2)}</strong>
                </p>
              )}
              {suggestion.metadata.appointmentsToday !== undefined && (
                <p>
                  📅 Atendimentos hoje: <strong>{suggestion.metadata.appointmentsToday}</strong>
                </p>
              )}
            </div>
          )}

          {/* Botões de ação */}
          {canExecute && (
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(suggestion.acao);
                }}
                className={`
                  flex-1 px-3 py-2 rounded text-white text-sm font-medium
                  transition-colors ${colors.button}
                  flex items-center justify-center gap-2
                `}
              >
                <CheckCircle className="w-4 h-4" />
                {getLabelByAction(suggestion.acao)}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIgnore();
                }}
                className="
                  px-3 py-2 rounded bg-white border border-gray-300
                  text-gray-700 text-sm font-medium hover:bg-gray-50
                  transition-colors flex items-center justify-center gap-2
                "
              >
                <X className="w-4 h-4" />
                Ignorar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Mapear tipo de sugestão para título amigável
 */
function getTitleByType(type) {
  const titles = {
    SLOT_LIVRE: '💫 Horário Nobre Disponível',
    NO_SHOW: '⚠️ Falta Confirmada',
    PROFISSIONAL_OCIOSO: '😴 Profissional Ocioso',
    AGENDA_CRITICA: '🚨 Agenda Crítica',
  };
  return titles[type] || 'Sugestão';
}

/**
 * Mapear ação sugerida para label do botão
 */
function getLabelByAction(action) {
  const labels = {
    VER_LISTA_ESPERA: 'Ver Lista de Espera',
    CRIAR_ENCAIXE: 'Criar Encaixe',
    CONTATAR_PACIENTE: 'Contatar Paciente',
    OTIMIZAR_AGENDA: 'Otimizar Agenda',
    IGNORAR: 'Ignorar',
  };
  return labels[action] || 'Executar';
}

/**
 * Obter cor por prioridade
 */
function getColorByPriority(priority) {
  const colors = {
    ALTA: '#dc2626',
    MEDIA: '#ea8c2f',
    BAIXA: '#2563eb',
  };
  return colors[priority] || '#6b7280';
}
