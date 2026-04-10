/**
 * 🧾 TIMELINE DE AUDITORIA FINANCEIRA DO ATENDIMENTO
 * 
 * Componente React que exibe a jornada financeira completa de um atendimento
 * mostrando todos os eventos: faturamento, pagamento, glosa, repasse
 */

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CheckCircle, XCircle, FileText, DollarSign, AlertTriangle } from "lucide-react";
import {
  getAppointmentFinancialAuditTrail,
  getAppointmentFinancialSummary,
  checkFinancialDivergences,
  FINANCIAL_EVENT_TYPES,
} from "@/lib/auditFinancialApi";

// ============================================================
// MAPA DE CORES E ÍCONES
// ============================================================

const EVENT_CONFIG = {
  [FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED]: {
    label: "Conta a Receber Criada",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: FileText,
    severity: "info",
  },
  [FINANCIAL_EVENT_TYPES.BILLING_GUIDE_CREATED]: {
    label: "Guia de Convênio Gerada",
    color: "bg-cyan-100 text-cyan-800 border-cyan-300",
    icon: FileText,
    severity: "info",
  },
  [FINANCIAL_EVENT_TYPES.BILLING_SENT]: {
    label: "Guia Enviada para Operadora",
    color: "bg-green-100 text-green-800 border-green-300",
    icon: CheckCircle,
    severity: "success",
  },
  [FINANCIAL_EVENT_TYPES.PAYMENT_RECEIVED]: {
    label: "Pagamento Recebido",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: DollarSign,
    severity: "success",
  },
  [FINANCIAL_EVENT_TYPES.GLOSA_REGISTERED]: {
    label: "Glosa Registrada",
    color: "bg-red-100 text-red-800 border-red-300",
    icon: XCircle,
    severity: "error",
  },
  [FINANCIAL_EVENT_TYPES.GLOSA_REVERSED]: {
    label: "Glosa Revertida",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: AlertTriangle,
    severity: "warning",
  },
  [FINANCIAL_EVENT_TYPES.REPASSE_CALCULATED]: {
    label: "Repasse Médico Calculado",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    icon: DollarSign,
    severity: "info",
  },
  [FINANCIAL_EVENT_TYPES.REPASSE_PAID]: {
    label: "Repasse Pago",
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: CheckCircle,
    severity: "success",
  },
};

// ============================================================
// COMPONENTE DE CARD DE EVENTO
// ============================================================

function AuditEventCard({ event, index, totalEvents }) {
  const config = EVENT_CONFIG[event.financial_event_type] || {
    label: event.financial_event_type,
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: AlertCircle,
    severity: "default",
  };

  const Icon = config.icon;
  const isLast = index === totalEvents - 1;

  return (
    <div className="flex gap-4 relative">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center z-10">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        {!isLast && (
          <div className="w-1 flex-grow bg-gray-300 mt-2" style={{ minHeight: "80px" }}></div>
        )}
      </div>

      {/* Event content */}
      <div className="flex-1 pb-8">
        <div className={`rounded-lg border-l-4 p-4 ${config.color}`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-sm">{config.label}</h4>
              <p className="text-xs opacity-75 mt-1">
                {format(new Date(event.performed_at), "dd/MM/yyyy 'às' HH:mm:ss", {
                  locale: ptBR,
                })}
              </p>
            </div>
            {event.performed_by_role && (
              <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                {event.performed_by_role}
              </span>
            )}
          </div>

          {/* Valores */}
          {(event.amount || event.previous_amount) && (
            <div className="grid grid-cols-2 gap-2 text-xs mb-3 mt-3 opacity-90">
              {event.amount && (
                <div>
                  <span className="opacity-75">Valor: </span>
                  <strong>R$ {Number(event.amount).toFixed(2)}</strong>
                </div>
              )}
              {event.previous_amount && (
                <div>
                  <span className="opacity-75">Valor Anterior: </span>
                  <strong>R$ {Number(event.previous_amount).toFixed(2)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          {event.status && (
            <p className="text-xs mt-2">
              <span className="opacity-75">Status: </span>
              <strong>{event.status}</strong>
            </p>
          )}

          {/* Context */}
          {event.context && Object.keys(event.context).length > 0 && (
            <details className="text-xs mt-3 opacity-75">
              <summary className="cursor-pointer font-semibold hover:opacity-100">
                Detalhes adicionais
              </summary>
              <div className="mt-2 p-2 bg-white bg-opacity-30 rounded text-xs whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {JSON.stringify(event.context, null, 2)}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function AppointmentFinancialAuditTimeline({
  appointmentId,
  compact = false,
  userRole = null,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trail, setTrail] = useState([]);
  const [summary, setSummary] = useState(null);
  const [divergences, setDivergences] = useState([]);
  const [expandedDivergences, setExpandedDivergences] = useState(false);

  // Carregar auditoria financeira
  useEffect(() => {
    if (!appointmentId) return;

    const loadAudit = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar dados em paralelo
        const [auditTrail, financialSummary, divergencesList] = await Promise.all([
          getAppointmentFinancialAuditTrail(appointmentId),
          getAppointmentFinancialSummary(appointmentId),
          checkFinancialDivergences(appointmentId),
        ]);

        setTrail(auditTrail || []);
        setSummary(financialSummary);
        setDivergences(divergencesList || []);
      } catch (err) {
        console.error("Erro ao carregar auditoria:", err);
        setError("Erro ao carregar auditoria financeira");
      } finally {
        setLoading(false);
      }
    };

    loadAudit();
  }, [appointmentId]);

  // Verificar permissões
  const canViewFinancials =
    userRole && ["GESTOR", "FINANCEIRO", "ADMIN"].includes(userRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">Carregando auditoria financeira...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm text-red-900">{error}</h4>
            <p className="text-xs text-red-700 mt-1">
              Não foi possível carregar o histórico de auditoria financeira.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!canViewFinancials) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm text-yellow-900">Acesso Restrito</h4>
            <p className="text-xs text-yellow-700 mt-1">
              Você não tem permissão para visualizar a auditoria financeira.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se não há eventos, mostrar mensagem vazia
  if (trail.length === 0) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
        <p className="text-sm text-gray-600">
          Nenhum evento financeiro registrado para este atendimento.
        </p>
      </div>
    );
  }

  // Modo compacto
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-600 px-4 py-2 bg-gray-100 rounded">
          Resumo Financeiro
        </div>
        <div className="space-y-1 px-4">
          {trail.slice(-5).map((event, idx) => (
            <div key={event.id} className="text-xs py-1 border-b border-gray-200 last:border-0">
              <div className="flex justify-between items-start">
                <span className="text-gray-600">
                  {EVENT_CONFIG[event.financial_event_type]?.label || event.financial_event_type}
                </span>
                <span className="text-gray-400">
                  {format(new Date(event.performed_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
              {event.amount && (
                <div className="text-xs text-green-700 font-semibold">
                  R$ {Number(event.amount).toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Modo completo
  return (
    <div className="space-y-6">
      {/* Alertas de divergências */}
      {divergences.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <button
            onClick={() => setExpandedDivergences(!expandedDivergences)}
            className="flex items-center gap-2 w-full text-left"
          >
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-orange-900">
                ⚠️ {divergences.length} Divergência(s) Detectada(s)
              </h4>
              <p className="text-xs text-orange-700">
                Possíveis problemas na auditoria financeira
              </p>
            </div>
            <span className="text-xs text-orange-600">
              {expandedDivergences ? "▼" : "▶"}
            </span>
          </button>

          {expandedDivergences && (
            <div className="mt-3 space-y-2">
              {divergences.map((div, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded text-xs ${
                    div.severity === "HIGH"
                      ? "bg-red-100 text-red-800"
                      : div.severity === "MEDIUM"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <strong>{div.message}</strong>
                  {div.details && (
                    <details className="mt-1">
                      <summary className="cursor-pointer">Detalhes</summary>
                      <pre className="text-xs whitespace-pre-wrap break-words mt-1">
                        {JSON.stringify(div.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estatísticas */}
      {summary?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.stats.totalEvents}</div>
            <div className="text-xs text-blue-700 mt-1">Eventos Totais</div>
          </div>
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              R$ {summary.stats.totalAmount.toFixed(2)}
            </div>
            <div className="text-xs text-green-700 mt-1">Valor Total</div>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.stats.performedByCount}</div>
            <div className="text-xs text-purple-700 mt-1">Usuários</div>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-600">
              {Object.keys(summary.stats.eventsByType || {}).length}
            </div>
            <div className="text-xs text-gray-700 mt-1">Tipos de Evento</div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <h3 className="font-semibold text-gray-900 mb-6">Timeline Financeira</h3>
        <div className="space-y-4">
          {trail.map((event, index) => (
            <AuditEventCard
              key={event.id}
              event={event}
              index={index}
              totalEvents={trail.length}
            />
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <div className="text-xs text-gray-500 text-center py-4 border-t border-gray-200">
        <p>
          Primeiro evento: {summary?.stats?.firstEventAt ? format(new Date(summary.stats.firstEventAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
        </p>
        <p>
          Último evento: {summary?.stats?.lastEventAt ? format(new Date(summary.stats.lastEventAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
        </p>
      </div>
    </div>
  );
}

export default AppointmentFinancialAuditTimeline;

