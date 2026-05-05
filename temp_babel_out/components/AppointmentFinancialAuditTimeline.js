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
import { getAppointmentFinancialAuditTrail, getAppointmentFinancialSummary, checkFinancialDivergences, FINANCIAL_EVENT_TYPES } from "@/lib/auditFinancialApi";

// ============================================================
// MAPA DE CORES E ÍCONES
// ============================================================

const EVENT_CONFIG = {
  [FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED]: {
    label: "Conta a Receber Criada",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: FileText,
    severity: "info"
  },
  [FINANCIAL_EVENT_TYPES.BILLING_GUIDE_CREATED]: {
    label: "Guia de Convênio Gerada",
    color: "bg-cyan-100 text-cyan-800 border-cyan-300",
    icon: FileText,
    severity: "info"
  },
  [FINANCIAL_EVENT_TYPES.BILLING_SENT]: {
    label: "Guia Enviada para Operadora",
    color: "bg-green-100 text-green-800 border-green-300",
    icon: CheckCircle,
    severity: "success"
  },
  [FINANCIAL_EVENT_TYPES.PAYMENT_RECEIVED]: {
    label: "Pagamento Recebido",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: DollarSign,
    severity: "success"
  },
  [FINANCIAL_EVENT_TYPES.GLOSA_REGISTERED]: {
    label: "Glosa Registrada",
    color: "bg-red-100 text-red-800 border-red-300",
    icon: XCircle,
    severity: "error"
  },
  [FINANCIAL_EVENT_TYPES.GLOSA_REVERSED]: {
    label: "Glosa Revertida",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: AlertTriangle,
    severity: "warning"
  },
  [FINANCIAL_EVENT_TYPES.REPASSE_CALCULATED]: {
    label: "Repasse Médico Calculado",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    icon: DollarSign,
    severity: "info"
  },
  [FINANCIAL_EVENT_TYPES.REPASSE_PAID]: {
    label: "Repasse Pago",
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: CheckCircle,
    severity: "success"
  }
};

// ============================================================
// COMPONENTE DE CARD DE EVENTO
// ============================================================

function AuditEventCard({
  event,
  index,
  totalEvents
}) {
  const config = EVENT_CONFIG[event.financial_event_type] || {
    label: event.financial_event_type,
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: AlertCircle,
    severity: "default"
  };
  const Icon = config.icon;
  const isLast = index === totalEvents - 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center z-10"
  }, /*#__PURE__*/React.createElement(Icon, {
    className: "w-5 h-5 text-gray-600"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    className: "w-1 flex-grow bg-gray-300 mt-2",
    style: {
      minHeight: "80px"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 pb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: `rounded-lg border-l-4 p-4 ${config.color}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-sm"
  }, config.label), /*#__PURE__*/React.createElement("p", {
    className: "text-xs opacity-75 mt-1"
  }, format(new Date(event.performed_at), "dd/MM/yyyy 'às' HH:mm:ss", {
    locale: ptBR
  }))), event.performed_by_role && /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-white bg-opacity-50 px-2 py-1 rounded"
  }, event.performed_by_role)), (event.amount || event.previous_amount) && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 text-xs mb-3 mt-3 opacity-90"
  }, event.amount && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "opacity-75"
  }, "Valor: "), /*#__PURE__*/React.createElement("strong", null, "R$ ", Number(event.amount).toFixed(2))), event.previous_amount && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "opacity-75"
  }, "Valor Anterior: "), /*#__PURE__*/React.createElement("strong", null, "R$ ", Number(event.previous_amount).toFixed(2)))), event.status && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "opacity-75"
  }, "Status: "), /*#__PURE__*/React.createElement("strong", null, event.status)), event.context && Object.keys(event.context).length > 0 && /*#__PURE__*/React.createElement("details", {
    className: "text-xs mt-3 opacity-75"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer font-semibold hover:opacity-100"
  }, "Detalhes adicionais"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 p-2 bg-white bg-opacity-30 rounded text-xs whitespace-pre-wrap break-words max-h-40 overflow-y-auto"
  }, JSON.stringify(event.context, null, 2))))));
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function AppointmentFinancialAuditTimeline({
  appointmentId,
  compact = false,
  userRole = null
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
        const [auditTrail, financialSummary, divergencesList] = await Promise.all([getAppointmentFinancialAuditTrail(appointmentId), getAppointmentFinancialSummary(appointmentId), checkFinancialDivergences(appointmentId)]);
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
  const canViewFinancials = userRole && ["GESTOR", "FINANCEIRO", "ADMIN"].includes(userRole);
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center p-8 bg-gray-50 rounded-lg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"
    }), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600"
    }, "Carregando auditoria financeira...")));
  }
  if (error) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-4 bg-red-50 border border-red-200 rounded-lg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      className: "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-sm text-red-900"
    }, error), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-red-700 mt-1"
    }, "N\xE3o foi poss\xEDvel carregar o hist\xF3rico de auditoria financeira."))));
  }
  if (!canViewFinancials) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      className: "w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-sm text-yellow-900"
    }, "Acesso Restrito"), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-yellow-700 mt-1"
    }, "Voc\xEA n\xE3o tem permiss\xE3o para visualizar a auditoria financeira."))));
  }

  // Se não há eventos, mostrar mensagem vazia
  if (trail.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-8 bg-gray-50 rounded-lg text-center"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      className: "w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50"
    }), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600"
    }, "Nenhum evento financeiro registrado para este atendimento."));
  }

  // Modo compacto
  if (compact) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-semibold text-gray-600 px-4 py-2 bg-gray-100 rounded"
    }, "Resumo Financeiro"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1 px-4"
    }, trail.slice(-5).map((event, idx) => /*#__PURE__*/React.createElement("div", {
      key: event.id,
      className: "text-xs py-1 border-b border-gray-200 last:border-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between items-start"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-gray-600"
    }, EVENT_CONFIG[event.financial_event_type]?.label || event.financial_event_type), /*#__PURE__*/React.createElement("span", {
      className: "text-gray-400"
    }, format(new Date(event.performed_at), "dd/MM HH:mm", {
      locale: ptBR
    }))), event.amount && /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-green-700 font-semibold"
    }, "R$ ", Number(event.amount).toFixed(2))))));
  }

  // Modo completo
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, divergences.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-orange-50 border border-orange-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpandedDivergences(!expandedDivergences),
    className: "flex items-center gap-2 w-full text-left"
  }, /*#__PURE__*/React.createElement(AlertTriangle, {
    className: "w-5 h-5 text-orange-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-sm text-orange-900"
  }, "\u26A0\uFE0F ", divergences.length, " Diverg\xEAncia(s) Detectada(s)"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-orange-700"
  }, "Poss\xEDveis problemas na auditoria financeira")), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-orange-600"
  }, expandedDivergences ? "▼" : "▶")), expandedDivergences && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, divergences.map((div, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: `p-2 rounded text-xs ${div.severity === "HIGH" ? "bg-red-100 text-red-800" : div.severity === "MEDIUM" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`
  }, /*#__PURE__*/React.createElement("strong", null, div.message), div.details && /*#__PURE__*/React.createElement("details", {
    className: "mt-1"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer"
  }, "Detalhes"), /*#__PURE__*/React.createElement("pre", {
    className: "text-xs whitespace-pre-wrap break-words mt-1"
  }, JSON.stringify(div.details, null, 2))))))), summary?.stats && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-blue-50 border border-blue-200 rounded-lg text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-blue-600"
  }, summary.stats.totalEvents), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-blue-700 mt-1"
  }, "Eventos Totais")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-green-50 border border-green-200 rounded-lg text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-green-600"
  }, "R$ ", summary.stats.totalAmount.toFixed(2)), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-green-700 mt-1"
  }, "Valor Total")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-purple-50 border border-purple-200 rounded-lg text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-purple-600"
  }, summary.stats.performedByCount), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-purple-700 mt-1"
  }, "Usu\xE1rios")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-gray-50 border border-gray-200 rounded-lg text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-gray-600"
  }, Object.keys(summary.stats.eventsByType || {}).length), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-700 mt-1"
  }, "Tipos de Evento"))), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-6"
  }, "Timeline Financeira"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, trail.map((event, index) => /*#__PURE__*/React.createElement(AuditEventCard, {
    key: event.id,
    event: event,
    index: index,
    totalEvents: trail.length
  })))), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500 text-center py-4 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", null, "Primeiro evento: ", summary?.stats?.firstEventAt ? format(new Date(summary.stats.firstEventAt), "dd/MM/yyyy HH:mm", {
    locale: ptBR
  }) : "—"), /*#__PURE__*/React.createElement("p", null, "\xDAltimo evento: ", summary?.stats?.lastEventAt ? format(new Date(summary.stats.lastEventAt), "dd/MM/yyyy HH:mm", {
    locale: ptBR
  }) : "—")));
}
export default AppointmentFinancialAuditTimeline;