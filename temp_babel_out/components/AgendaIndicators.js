/**
 * AgendaIndicators.jsx
 * 
 * 📊 INDICADORES DA AGENDA
 * 
 * Dashboard com cards de indicadores operacionais, financeiros e de tempo.
 * Atualiza em tempo real baseado em mudanças na agenda.
 * 
 * Props:
 * - clinicId: string (UUID)
 * - date: string (YYYY-MM-DD) - default: today
 * - professionalId: string (UUID) - opcional, para filtrar por profissional
 * - currentRole: string - para controle de permissões
 * - onAlertsChange: function - callback quando alertas mudam
 */

import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, AlertCircle, CheckCircle, XCircle, Clock, DollarSign, Users, Calendar, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { getAgendaIndicators, getProfessionalIndicators, generateAlerts, getHealthStatus, formatIndicators, getStatusColor } from "@/lib/indicatorsApi";
const AgendaIndicators = ({
  clinicId,
  date = new Date().toISOString().split("T")[0],
  professionalId = null,
  currentRole = "profissional",
  onAlertsChange = null
}) => {
  const [indicators, setIndicators] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Controle de permissões
  const canViewFullIndicators = ["admin", "gestor"].includes(currentRole?.toLowerCase?.());
  const canViewFinancialIndicators = ["admin", "gestor"].includes(currentRole?.toLowerCase?.());

  // Fetch indicadores
  const fetchIndicators = async () => {
    try {
      setLoading(true);
      setError(null);
      let data;
      if (professionalId && !canViewFullIndicators) {
        // Profissional vê apenas seus próprios indicadores
        data = await getProfessionalIndicators(clinicId, professionalId, date);
      } else {
        // Gestor/Admin vê indicadores completos
        data = await getAgendaIndicators(clinicId, date, professionalId);
      }
      if (data !== undefined && data !== null) {
        setIndicators(data);

        // Gerar alertas
        const generatedAlerts = generateAlerts(data);
        setAlerts(generatedAlerts);
        onAlertsChange?.(generatedAlerts);
        setLastUpdate(new Date());
      } else {
        // Se não houver dados, mostrar indicadores zerados em vez de erro
        const emptyIndicators = {
          total_slots: 0,
          slots_ocupados: 0,
          slots_pendentes: 0,
          slots_livres: 0,
          taxa_ocupacao_percent: 0,
          total_agendamentos: 0,
          confirmados: 0,
          faltas: 0,
          encaixes: 0,
          profissionais_ativos: 0,
          receita_estimada: 0,
          receita_por_hora: 0,
          meta_dia: 5000,
          percentual_meta_atingida: 0,
          tempo_medio_checkin_minutos: 0,
          status: 'normal'
        };
        setIndicators(emptyIndicators);
        setAlerts([]);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Erro ao buscar indicadores:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carregar indicadores ao montar
  useEffect(() => {
    fetchIndicators();
  }, [clinicId, date, professionalId]);

  // Função de refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIndicators();
    setRefreshing(false);
  };

  // Memoizar indicadores formatados
  const formatted = useMemo(() => {
    return indicators ? formatIndicators(indicators) : null;
  }, [indicators]);

  // Obter cor de status para métrica
  const getColor = (metric, value) => {
    const color = getStatusColor(metric, value);
    switch (color) {
      case "green":
        return "text-green-600 bg-green-50";
      case "yellow":
        return "text-yellow-600 bg-yellow-50";
      case "red":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };
  if (loading && !indicators) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "animate-spin"
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      className: "w-6 h-6 text-blue-600"
    })), /*#__PURE__*/React.createElement("span", {
      className: "ml-2 text-gray-600"
    }, "Carregando indicadores..."));
  }
  const healthStatus = indicators ? getHealthStatus(indicators) : "unknown";
  const statusColor = healthStatus === "critical" ? "border-red-200 bg-red-50" : healthStatus === "warning" ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50";
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-gray-900"
  }, "\uD83D\uDCCA Indicadores da Agenda"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "Data: ", new Date(date).toLocaleDateString("pt-BR"), lastUpdate && /*#__PURE__*/React.createElement("span", {
    className: "ml-2"
  }, "\u2022 Atualizado: ", lastUpdate.toLocaleTimeString("pt-BR")))), /*#__PURE__*/React.createElement("button", {
    onClick: handleRefresh,
    disabled: refreshing,
    className: "p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50",
    title: "Atualizar indicadores"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    className: `w-5 h-5 text-gray-600 ${refreshing ? "animate-spin" : ""}`
  }))), alerts.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, alerts.map((alert, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: `border-l-4 p-3 rounded cursor-pointer transition ${alert.severity === "high" ? "border-red-500 bg-red-50" : alert.severity === "medium" ? "border-yellow-500 bg-yellow-50" : "border-blue-500 bg-blue-50"}`,
    onClick: () => setExpandedAlert(expandedAlert === idx ? null : idx)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mt-0.5"
  }, alert.severity === "high" ? /*#__PURE__*/React.createElement(AlertCircle, {
    className: "w-4 h-4 text-red-600"
  }) : alert.severity === "medium" ? /*#__PURE__*/React.createElement(AlertCircle, {
    className: "w-4 h-4 text-yellow-600"
  }) : /*#__PURE__*/React.createElement(CheckCircle, {
    className: "w-4 h-4 text-blue-600"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-gray-900"
  }, alert.message), expandedAlert === idx && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 mt-1"
  }, "M\xE9trica: ", alert.metric, " | Valor: ", alert.value)), expandedAlert === idx ? /*#__PURE__*/React.createElement(ChevronUp, {
    className: "w-4 h-4"
  }) : /*#__PURE__*/React.createElement(ChevronDown, {
    className: "w-4 h-4"
  }))))), indicators && formatted && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: `border rounded-lg p-4 ${statusColor} flex items-center justify-between`
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-gray-700"
  }, "Status Geral da Agenda"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold mt-1"
  }, healthStatus === "healthy" ? "✅ Saudável" : healthStatus === "warning" ? "⚠️ Atenção" : "🚨 Crítico")), /*#__PURE__*/React.createElement(TrendingUp, {
    className: "w-8 h-8 opacity-50"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement(Card, {
    title: formatted.ocupacao.label,
    value: formatted.ocupacao.value,
    unit: "%",
    metric: "taxa_ocupacao_percent",
    icon: Calendar,
    color: getColor("taxa_ocupacao_percent", formatted.ocupacao.value)
  }), /*#__PURE__*/React.createElement(Card, {
    title: formatted.agendamentos.label,
    value: formatted.agendamentos.value,
    metric: "total_agendamentos",
    icon: CheckCircle,
    color: getColor("total_agendamentos", formatted.agendamentos.value)
  }), /*#__PURE__*/React.createElement(Card, {
    title: formatted.confirmados.label,
    value: formatted.confirmados.value,
    metric: "confirmados",
    icon: CheckCircle,
    color: "text-green-600 bg-green-50"
  }), /*#__PURE__*/React.createElement(Card, {
    title: formatted.faltas.label,
    value: formatted.faltas.value,
    metric: "faltas",
    icon: XCircle,
    color: getColor("faltas", formatted.faltas.value)
  }), /*#__PURE__*/React.createElement(Card, {
    title: formatted.encaixes.label,
    value: formatted.encaixes.value,
    metric: "encaixes",
    icon: TrendingUp,
    color: "text-blue-600 bg-blue-50"
  }), /*#__PURE__*/React.createElement(Card, {
    title: formatted.profissionais.label,
    value: formatted.profissionais.value,
    metric: "profissionais_ativos",
    icon: Users,
    color: "text-purple-600 bg-purple-50"
  }), /*#__PURE__*/React.createElement(Card, {
    title: formatted.slots_livres.label,
    value: formatted.slots_livres.value,
    metric: "slots_livres",
    icon: Calendar,
    color: "text-gray-600 bg-gray-50"
  }), formatted.tempo_checkin.value > 0 && /*#__PURE__*/React.createElement(Card, {
    title: formatted.tempo_checkin.label,
    value: formatted.tempo_checkin.value,
    unit: formatted.tempo_checkin.suffix,
    metric: "tempo_medio_checkin_minutos",
    icon: Clock,
    color: getColor("tempo_medio_checkin_minutos", formatted.tempo_checkin.value)
  })), canViewFinancialIndicators && /*#__PURE__*/React.createElement("div", {
    className: "border-t pt-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-semibold text-gray-700 mb-3"
  }, "\uD83D\uDCB0 Indicadores Financeiros"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement(Card, {
    title: formatted.receita_dia.label,
    value: `R$ ${formatted.receita_dia.value.toFixed(2)}`,
    metric: "receita_estimada",
    icon: DollarSign,
    color: getColor("receita_estimada", formatted.receita_dia.value),
    noBigFont: true
  }), /*#__PURE__*/React.createElement(Card, {
    title: formatted.receita_hora.label,
    value: `R$ ${formatted.receita_hora.value.toFixed(2)}`,
    metric: "receita_por_hora",
    icon: DollarSign,
    color: "text-green-600 bg-green-50",
    noBigFont: true
  }), /*#__PURE__*/React.createElement(Card, {
    title: formatted.meta.label,
    value: `R$ ${formatted.meta.value.toFixed(2)}`,
    metric: "meta_dia",
    icon: TrendingUp,
    color: "text-blue-600 bg-blue-50",
    noBigFont: true
  }), /*#__PURE__*/React.createElement(Card, {
    title: formatted.percentual_meta.label,
    value: formatted.percentual_meta.value,
    unit: "%",
    metric: "percentual_meta_atingida",
    icon: TrendingUp,
    color: getColor("percentual_meta_atingida", formatted.percentual_meta.value)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "border-t pt-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-semibold text-gray-700 mb-3"
  }, "\uD83D\uDCC5 Resumo de Slots"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Ocupa\xE7\xE3o"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, formatted.slots_ocupados.value, "/", formatted.total_slots.value)), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-gray-200 rounded-full h-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-green-600 h-2 rounded-full transition-all",
    style: {
      width: `${formatted.slots_ocupados.value / formatted.total_slots.value * 100}%`
    }
  })))))), error && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700"
  }, error));
};

/**
 * Card individual de indicador
 */
function Card({
  title,
  value,
  unit = "",
  metric,
  icon: Icon,
  color,
  noBigFont = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-lg p-3 border border-gray-200 ${color} transition-all`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium truncate"
  }, title), /*#__PURE__*/React.createElement("p", {
    className: `mt-1 font-semibold ${noBigFont ? "text-sm" : "text-2xl"} text-gray-900`
  }, value, unit && /*#__PURE__*/React.createElement("span", {
    className: "text-xs ml-1"
  }, unit))), /*#__PURE__*/React.createElement(Icon, {
    className: "w-5 h-5 opacity-50 flex-shrink-0"
  })));
}
export default AgendaIndicators;