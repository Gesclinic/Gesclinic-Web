/**
 * AgendaGestorView.jsx
 * 
 * 👔 Tela do Gestor/Administrador
 * 
 * Responsabilidades:
 * - Visão completa do fluxo
 * - Todos os status visíveis
 * - Capacidade de gerenciar todo o fluxo
 * - Relatórios e KPIs
 * 
 * Acesso: Gestor, Admin, Gerente de Clínica
 */

import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useClinicContext } from "@/contexts/ClinicContext";
import { BOOKING_STATUSES, SERVICE_STATUSES, getStatusConfig, getStatusLabelOnly } from "@/lib/appointmentStatusConstants";
import { updateAppointment } from "@/lib/appointmentsApi";
import { BarChart3, TrendingUp, Users, Clock, AlertCircle, CheckCircle2, Zap } from "lucide-react";
export default function AgendaGestorView({
  appointments = [],
  onRefresh
}) {
  const {
    user,
    currentRole
  } = useAuth();
  const {
    clinicId
  } = useClinicContext();
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loadingId, setLoadingId] = useState(null);

  // ============================================
  // CÁLCULO DE KPIs
  // ============================================

  const kpis = useMemo(() => {
    if (!appointments) return {};
    const today = new Date().toISOString().split("T")[0];
    const todayAppointments = appointments.filter(apt => apt.scheduled_date?.split("T")[0] === today);
    const stats = {
      total: todayAppointments.length,
      agendado: todayAppointments.filter(apt => apt.status === APPOINTMENT_STATUS.AGENDADO).length,
      confirmado: todayAppointments.filter(apt => apt.status === APPOINTMENT_STATUS.CONFIRMADO).length,
      aguardando: todayAppointments.filter(apt => apt.status === APPOINTMENT_STATUS.AGUARDANDO).length,
      pendente: todayAppointments.filter(apt => apt.status === APPOINTMENT_STATUS.PENDENTE).length,
      financeiro_pendente: todayAppointments.filter(apt => apt.status === APPOINTMENT_STATUS.FINANCEIRO_PENDENTE).length,
      liberado: todayAppointments.filter(apt => apt.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL).length,
      em_atendimento: todayAppointments.filter(apt => apt.status === SERVICE_STATUSES.IN_SERVICE).length,
      finalizado: todayAppointments.filter(apt => apt.status === SERVICE_STATUSES.ATTENDED).length,
      falta: todayAppointments.filter(apt => apt.status === SERVICE_STATUSES.NO_SHOW).length,
      cancelado: todayAppointments.filter(apt => apt.status === APPOINTMENT_STATUS.CANCELADO).length
    };
    stats.aguardando_liberacao = stats.aguardando + stats.pendente + stats.financeiro_pendente;
    stats.em_progresso = stats.liberado + stats.em_atendimento;
    stats.completados = stats.finalizado + stats.falta + stats.cancelado;
    stats.taxa_conclusao = stats.total > 0 ? Math.round(stats.finalizado / stats.total * 100) : 0;
    return stats;
  }, [appointments]);

  // ============================================
  // FILTRO E AGRUPAMENTO
  // ============================================

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    const today = new Date().toISOString().split("T")[0];
    let filtered = appointments.filter(apt => apt.scheduled_date?.split("T")[0] === today);
    if (selectedStatus !== "all") {
      filtered = filtered.filter(apt => apt.status === selectedStatus);
    }
    return filtered.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [appointments, selectedStatus]);
  const groupedByProfessional = useMemo(() => {
    const groups = {};
    filteredAppointments.forEach(apt => {
      const prof = apt.professional_name || "Sem Profissional";
      if (!groups[prof]) {
        groups[prof] = [];
      }
      groups[prof].push(apt);
    });
    return groups;
  }, [filteredAppointments]);

  /**
   * Atualiza status (com menos confirmações)
   */
  const updateStatus = useCallback(async (appointmentId, newStatus) => {
    try {
      setLoadingId(appointmentId);
      await updateAppointment(appointmentId, {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      onRefresh?.();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar agendamento");
    } finally {
      setLoadingId(null);
    }
  }, [onRefresh]);

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-bold"
  }, "\uD83D\uDC54 Gest\xE3o Completa"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 mt-1"
  }, "Vis\xE3o end-to-end do fluxo de atendimento")), /*#__PURE__*/React.createElement("button", {
    onClick: onRefresh,
    className: "px-4 py-2 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition"
  }, "\uD83D\uDD04 Atualizar"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm"
  }, "Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-gray-900"
  }, kpis.total)), /*#__PURE__*/React.createElement(Users, {
    size: 32,
    className: "text-blue-500 opacity-20"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm"
  }, "Aguardando Libera\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-orange-600"
  }, kpis.aguardando_liberacao || 0)), /*#__PURE__*/React.createElement(Clock, {
    size: 32,
    className: "text-orange-500 opacity-20"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm"
  }, "Em Progresso"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-purple-600"
  }, kpis.em_progresso || 0)), /*#__PURE__*/React.createElement(Zap, {
    size: 32,
    className: "text-purple-500 opacity-20"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm"
  }, "Completados"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-green-600"
  }, kpis.completados || 0)), /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 32,
    className: "text-green-500 opacity-20"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm"
  }, "Taxa de Conclus\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-indigo-600"
  }, kpis.taxa_conclusao, "%")), /*#__PURE__*/React.createElement(TrendingUp, {
    size: 32,
    className: "text-indigo-500 opacity-20"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-900 mb-3"
  }, "\uD83D\uDD0D Filtrar por Status"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus("all"),
    className: `px-3 py-1 rounded text-sm font-medium transition ${selectedStatus === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
  }, "Todos (", kpis.total, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus(APPOINTMENT_STATUS.AGENDADO),
    className: `px-3 py-1 rounded text-sm font-medium transition ${selectedStatus === APPOINTMENT_STATUS.AGENDADO ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
  }, "Agendado (", kpis.agendado, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus(APPOINTMENT_STATUS.CONFIRMADO),
    className: `px-3 py-1 rounded text-sm font-medium transition ${selectedStatus === APPOINTMENT_STATUS.CONFIRMADO ? "bg-cyan-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
  }, "Confirmado (", kpis.confirmado, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus(APPOINTMENT_STATUS.AGUARDANDO),
    className: `px-3 py-1 rounded text-sm font-medium transition ${selectedStatus === APPOINTMENT_STATUS.AGUARDANDO ? "bg-yellow-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
  }, "Aguardando (", kpis.aguardando, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus(APPOINTMENT_STATUS.PENDENTE),
    className: `px-3 py-1 rounded text-sm font-medium transition ${selectedStatus === APPOINTMENT_STATUS.PENDENTE ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
  }, "Pend\xEAncia (", kpis.pendente, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus(APPOINTMENT_STATUS.FINANCEIRO_PENDENTE),
    className: `px-3 py-1 rounded text-sm font-medium transition ${selectedStatus === APPOINTMENT_STATUS.FINANCEIRO_PENDENTE ? "bg-rose-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
  }, "Financeiro (", kpis.financeiro_pendente, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus(SERVICE_STATUSES.AWAITING_PROFESSIONAL),
    className: `px-3 py-1 rounded text-sm font-medium transition ${selectedStatus === SERVICE_STATUSES.AWAITING_PROFESSIONAL ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
  }, "Liberado (", kpis.liberado, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus(APPOINTMENT_STATUS.EM_ATENDIMENTO),
    className: `px-3 py-1 rounded text-sm font-medium transition ${selectedStatus === APPOINTMENT_STATUS.EM_ATENDIMENTO ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
  }, "Em Atendimento (", kpis.em_atendimento, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus(APPOINTMENT_STATUS.FINALIZADO),
    className: `px-3 py-1 rounded text-sm font-medium transition ${selectedStatus === APPOINTMENT_STATUS.FINALIZADO ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
  }, "Finalizado (", kpis.finalizado, ")"))), filteredAppointments.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-8 text-center text-gray-500"
  }, "Nenhum agendamento com este filtro") : Object.entries(groupedByProfessional).map(([professional, apts]) => /*#__PURE__*/React.createElement("div", {
    key: professional,
    className: "bg-white rounded-lg shadow overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-900"
  }, "\uD83D\uDC68\u200D\u2695\uFE0F ", professional, " (", apts.length, ")")), /*#__PURE__*/React.createElement("div", {
    className: "divide-y"
  }, apts.map(apt => /*#__PURE__*/React.createElement("div", {
    key: apt.id,
    className: "p-4 hover:bg-gray-50 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-5 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 uppercase"
  }, "Hora"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-900"
  }, apt.start_time?.substring(0, 5))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 uppercase"
  }, "Paciente"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-gray-900"
  }, apt.patient_name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 uppercase"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-900"
  }, apt.service_name || "N/A")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 uppercase"
  }, "Status"), /*#__PURE__*/React.createElement("span", {
    className: `inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(apt.status)}`
  }, getStatusLabel(apt.status))), !isFinalStatus(apt.status) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 uppercase mb-1"
  }, "A\xE7\xF5es"), /*#__PURE__*/React.createElement("select", {
    value: apt.status,
    onChange: e => updateStatus(apt.id, e.target.value),
    disabled: loadingId === apt.id,
    className: "w-full px-2 py-1 text-sm border border-gray-300 rounded hover:border-gray-400 disabled:opacity-50 cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: apt.status
  }, getStatusLabel(apt.status)), apt.status === APPOINTMENT_STATUS.AGENDADO && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.CONFIRMADO
  }, "\u2192 Confirmar"), /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.CANCELADO
  }, "\u2192 Cancelar")), apt.status === APPOINTMENT_STATUS.CONFIRMADO && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.AGUARDANDO
  }, "\u2192 Aguardando"), /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.CANCELADO
  }, "\u2192 Cancelar")), (apt.status === APPOINTMENT_STATUS.AGUARDANDO || apt.status === APPOINTMENT_STATUS.PENDENTE || apt.status === APPOINTMENT_STATUS.FINANCEIRO_PENDENTE) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("option", {
    value: SERVICE_STATUSES.AWAITING_PROFESSIONAL
  }, "\u2192 Liberar"), /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.PENDENTE
  }, "\u2192 Pend\xEAncia"), /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.FINANCEIRO_PENDENTE
  }, "\u2192 Financeiro"), /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.FALTA
  }, "\u2192 Falta")), apt.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.EM_ATENDIMENTO
  }, "\u2192 Em Atendimento"), /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.FALTA
  }, "\u2192 Falta")), apt.status === APPOINTMENT_STATUS.EM_ATENDIMENTO && /*#__PURE__*/React.createElement("option", {
    value: APPOINTMENT_STATUS.FINALIZADO
  }, "\u2192 Finalizado"))))))))));
}