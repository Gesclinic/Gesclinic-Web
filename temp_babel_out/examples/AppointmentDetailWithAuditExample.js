/**
 * 📋 EXEMPLO DE INTEGRAÇÃO - MODAL/DRAWER COM AUDITORIA FINANCEIRA
 * 
 * Este componente mostra como integrar o AppointmentFinancialAuditTimeline
 * em um modal/drawer de detalhes do atendimento
 * 
 * Use como referência para integrar em seus componentes existentes
 */

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTabs, DialogTabsContent, DialogTabsList, DialogTabsTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, FileText, Clock, AlertCircle } from "lucide-react";
import { AppointmentFinancialAuditTimeline } from "@/pages/clinica/agenda/components/AppointmentFinancialAuditTimeline";
import { useAppointmentFinancialAudit } from "@/pages/clinica/agenda/hooks/useAppointmentFinancialAudit";
import { useAuth } from "@/contexts/SupabaseAuthContext";

/**
 * Exemplo de Modal com Abas
 */
export function AppointmentDetailModalWithAudit({
  isOpen,
  onClose,
  appointmentId,
  appointmentData
}) {
  const {
    currentRole
  } = useAuth();
  const [activeTab, setActiveTab] = useState("details");
  const {
    hasDivergences,
    divergences
  } = useAppointmentFinancialAudit(appointmentId, {
    autoLoad: true,
    refreshInterval: 30000
  } // Atualiza a cada 30s
  );
  return /*#__PURE__*/React.createElement(Dialog, {
    open: isOpen,
    onOpenChange: onClose
  }, /*#__PURE__*/React.createElement(DialogContent, {
    className: "w-full max-h-[90vh] overflow-y-auto modal-content-scroll\\"
  }, /*#__PURE__*/React.createElement(DialogHeader, null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DialogTitle, null, "Detalhes do Atendimento"), hasDivergences && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    className: "w-4 h-4"
  }), divergences.length, " diverg\xEAncia(s) detectada(s)")), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(X, {
    className: "w-4 h-4"
  })))), /*#__PURE__*/React.createElement(DialogTabs, {
    defaultValue: "details",
    value: activeTab,
    onValueChange: setActiveTab
  }, /*#__PURE__*/React.createElement(DialogTabsList, {
    className: "grid w-full grid-cols-3"
  }, /*#__PURE__*/React.createElement(DialogTabsTrigger, {
    value: "details",
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(FileText, {
    className: "w-4 h-4"
  }), "Detalhes"), ["GESTOR", "FINANCEIRO", "ADMIN"].includes(currentRole) && /*#__PURE__*/React.createElement(DialogTabsTrigger, {
    value: "financial",
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Clock, {
    className: "w-4 h-4"
  }), "Auditoria Financeira", hasDivergences && /*#__PURE__*/React.createElement("span", {
    className: "ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs"
  }, "!")), /*#__PURE__*/React.createElement(DialogTabsTrigger, {
    value: "notes"
  }, "Observa\xE7\xF5es")), /*#__PURE__*/React.createElement(DialogTabsContent, {
    value: "details",
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600"
  }, "Paciente"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-1"
  }, appointmentData?.patient_name || "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600"
  }, "Profissional"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-1"
  }, appointmentData?.professional_name || "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600"
  }, "Data/Hora"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-1"
  }, appointmentData?.scheduled_date || "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600"
  }, "Status"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: `px-2 py-1 rounded text-xs font-semibold ${appointmentData?.status === "confirmado" ? "bg-green-100 text-green-800" : appointmentData?.status === "cancelado" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`
  }, appointmentData?.status || "—"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-1"
  }, appointmentData?.payer_name || "Particular")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600"
  }, "Valor"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-1 font-semibold text-green-600"
  }, "R$ ", appointmentData?.value ? Number(appointmentData.value).toFixed(2) : "—")))), ["GESTOR", "FINANCEIRO", "ADMIN"].includes(currentRole) && /*#__PURE__*/React.createElement(DialogTabsContent, {
    value: "financial",
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(AppointmentFinancialAuditTimeline, {
    appointmentId: appointmentId,
    userRole: currentRole
  })), /*#__PURE__*/React.createElement(DialogTabsContent, {
    value: "notes",
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-600"
  }, "Observa\xE7\xF5es Gerais"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2 text-gray-700 whitespace-pre-wrap"
  }, appointmentData?.notes || "Sem observações")))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: onClose
  }, "Fechar"), /*#__PURE__*/React.createElement(Button, null, "Editar Atendimento"))));
}

/**
 * Exemplo de Drawer Lateral com Auditoria
 */
export function AppointmentDetailDrawerWithAudit({
  isOpen,
  onClose,
  appointmentId,
  appointmentData
}) {
  const {
    currentRole
  } = useAuth();
  return /*#__PURE__*/React.createElement("div", {
    className: `fixed right-0 top-0 h-full w-96 bg-white shadow-lg transform transition-transform duration-300 z-50 overflow-y-auto ${isOpen ? "translate-x-0" : "translate-x-full"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-gray-900"
  }, "Detalhes do Atendimento"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(X, {
    className: "w-4 h-4"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-6"
  }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3"
  }, "Informa\xE7\xF5es B\xE1sicas"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Paciente:"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, appointmentData?.patient_name || "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Profissional:"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, appointmentData?.professional_name || "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Data/Hora:"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, appointmentData?.scheduled_date || "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Status:"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, appointmentData?.status || "—")))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3"
  }, "Informa\xE7\xF5es Financeiras"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Conv\xEAnio:"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, appointmentData?.payer_name || "Particular")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Valor:"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-green-600"
  }, "R$ ", appointmentData?.value ? Number(appointmentData.value).toFixed(2) : "—")))), ["GESTOR", "FINANCEIRO", "ADMIN"].includes(currentRole) && /*#__PURE__*/React.createElement("section", {
    className: "border-t pt-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Clock, {
    className: "w-4 h-4"
  }), "Timeline Financeira"), /*#__PURE__*/React.createElement(AppointmentFinancialAuditTimeline, {
    appointmentId: appointmentId,
    compact: true,
    userRole: currentRole
  })), appointmentData?.notes && /*#__PURE__*/React.createElement("section", {
    className: "border-t pt-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3"
  }, "Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700 whitespace-pre-wrap"
  }, appointmentData.notes))), /*#__PURE__*/React.createElement("div", {
    className: "sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    className: "flex-1",
    onClick: onClose
  }, "Fechar"), /*#__PURE__*/React.createElement(Button, {
    className: "flex-1"
  }, "Editar")));
}
export default {
  AppointmentDetailModalWithAudit,
  AppointmentDetailDrawerWithAudit
};