/**
 * AgendaFinanceDashboard.jsx
 * Dashboard visual Agenda × Financeiro
 * 
 * Objetivo: Mostrar em 30 segundos a saúde financeira da agenda
 * Sem jargão contábil, apenas dados acionáveis
 */

import React from 'react';
import { TrendingUp, Users, DollarSign, Calendar, Target, AlertCircle } from 'lucide-react';
export default function AgendaFinanceDashboard({
  metrics,
  loading = false
}) {
  if (loading) {
    return /*#__PURE__*/React.createElement(AgendaFinanceDashboardLoading, null);
  }
  if (!metrics) {
    return null;
  }
  const {
    totalReceita,
    receitaPorHora,
    ocupacaoPercentual,
    agendamentos,
    servicosMais,
    receitaPorProfissional,
    indicadorSaude,
    statusAgenda,
    metaDia,
    data,
    profissionaisAtivos
  } = metrics;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement(DashboardCard, {
    icon: /*#__PURE__*/React.createElement(DollarSign, {
      className: "w-5 h-5"
    }),
    title: "Receita da Agenda",
    value: `R$ ${totalReceita.toFixed(2)}`,
    subtitle: `${agendamentos} agendamentos`,
    color: "bg-emerald-50",
    borderColor: "border-emerald-200"
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    icon: /*#__PURE__*/React.createElement(TrendingUp, {
      className: "w-5 h-5"
    }),
    title: "Receita por Hora",
    value: `R$ ${receitaPorHora.toFixed(2)}`,
    subtitle: "Produtividade do tempo",
    color: "bg-blue-50",
    borderColor: "border-blue-200"
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    icon: /*#__PURE__*/React.createElement(Calendar, {
      className: "w-5 h-5"
    }),
    title: "Ocupa\xE7\xE3o",
    value: `${ocupacaoPercentual}%`,
    subtitle: `${agendamentos} / ${Math.round(metaDia.ocupacaoMeta * 1.5)} slots`,
    color: "bg-purple-50",
    borderColor: "border-purple-200",
    progress: ocupacaoPercentual
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    icon: /*#__PURE__*/React.createElement(Target, {
      className: "w-5 h-5"
    }),
    title: "Indicador de Sa\xFAde",
    value: `${indicadorSaude}%`,
    subtitle: statusAgenda.label,
    color: "bg-amber-50",
    borderColor: "border-amber-200",
    progress: indicadorSaude
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement(StatusCard, {
    status: statusAgenda
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    icon: /*#__PURE__*/React.createElement(Users, {
      className: "w-5 h-5"
    }),
    title: "Profissionais Ativos",
    value: profissionaisAtivos,
    subtitle: profissionaisAtivos > 0 ? 'Em atividade' : 'Sem profissionais',
    color: "bg-indigo-50",
    borderColor: "border-indigo-200"
  }), /*#__PURE__*/React.createElement(MetaCard, {
    meta: metaDia,
    receitaAtual: totalReceita
  })), servicosMais.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-gray-200 p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-700 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(TrendingUp, {
    className: "w-4 h-4"
  }), "Top 3 Servi\xE7os"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, servicosMais.map((srv, idx) => /*#__PURE__*/React.createElement("div", {
    key: srv.id,
    className: "flex items-center justify-between p-2 hover:bg-gray-50 rounded"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-gray-500 w-5"
  }, idx + 1, "."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-gray-700"
  }, srv.nome), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, srv.quantidade, " agendamentos"))), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-emerald-600"
  }, "R$ ", (srv.valor * srv.quantidade).toFixed(2)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "R$ ", srv.valor.toFixed(2), " un.")))))), receitaPorProfissional.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-gray-200 p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-700 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Users, {
    className: "w-4 h-4"
  }), "Receita por Profissional"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, receitaPorProfissional.slice(0, 3).map((prof, idx) => /*#__PURE__*/React.createElement("div", {
    key: prof.id,
    className: "flex items-center justify-between p-2 hover:bg-gray-50 rounded"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-gray-500 w-5"
  }, idx + 1, "."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-gray-700"
  }, prof.nome), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, prof.agendamentos, " agendamentos"))), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-emerald-600"
  }, "R$ ", prof.receita.toFixed(2)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "M\xE9dia: R$ ", prof.receitaMedia.toFixed(2))))))));
}

/**
 * Card padrão para métrica
 */
function DashboardCard({
  icon,
  title,
  value,
  subtitle,
  color,
  borderColor,
  progress
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `${color} border ${borderColor} rounded-lg p-4 space-y-2`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-gray-600"
  }, title), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-gray-900 mt-1"
  }, value)), /*#__PURE__*/React.createElement("div", {
    className: "text-gray-400"
  }, icon)), subtitle && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, subtitle), progress !== undefined && /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-gray-200 rounded-full h-2 mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-2 rounded-full transition-all ${progress >= 80 ? 'bg-emerald-500' : progress >= 60 ? 'bg-blue-500' : progress >= 40 ? 'bg-amber-500' : 'bg-red-500'}`,
    style: {
      width: `${Math.min(progress, 100)}%`
    }
  })));
}

/**
 * Card de status qualitativo
 */
function StatusCard({
  status
}) {
  const bgColor = status.label.includes('Excelente') ? 'bg-emerald-50 border-emerald-200' : status.label.includes('Bom') ? 'bg-blue-50 border-blue-200' : status.label.includes('Atenção') ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const iconColor = status.label.includes('🔴') ? 'text-red-600' : 'text-gray-600';
  return /*#__PURE__*/React.createElement("div", {
    className: `border ${bgColor} rounded-lg p-4 space-y-2`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    className: `w-5 h-5 ${iconColor}`
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-700"
  }, status.label)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, status.descricao), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-gray-700 pt-2 border-t border-gray-200 mt-2"
  }, "\uD83D\uDCA1 ", status.acao));
}

/**
 * Card de meta do dia
 */
function MetaCard({
  meta,
  receitaAtual
}) {
  const percentualMeta = receitaAtual / meta.receitaMeta * 100;
  const cumpriu = percentualMeta >= 100;
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-gray-600"
  }, "Meta do Dia"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-gray-900 mt-1"
  }, "R$ ", receitaAtual.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "text-indigo-600 text-xl"
  }, cumpriu ? '✅' : '⏳')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Meta: R$ ", meta.receitaMeta.toFixed(2), " (", Math.round(percentualMeta), "%)"), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-gray-200 rounded-full h-2 mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-2 rounded-full transition-all ${cumpriu ? 'bg-emerald-500' : 'bg-amber-500'}`,
    style: {
      width: `${Math.min(percentualMeta, 100)}%`
    }
  })));
}

/**
 * Loading skeleton
 */
function AgendaFinanceDashboardLoading() {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-4"
  }, [...Array(4)].map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-gray-100 rounded-lg p-4 h-32 animate-pulse"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, [...Array(3)].map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-gray-100 rounded-lg p-4 h-32 animate-pulse"
  }))));
}