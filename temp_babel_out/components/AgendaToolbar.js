// src/pages/clinica/agenda/components/AgendaToolbar.jsx

import React from "react";
import { Calendar, List, Kanban, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

// Esses contextos vêm da Agenda Premium
import { useAgendaView } from "@/pages/clinica/agenda/context/useAgendaView";
import { useAgendaFilters } from "@/pages/clinica/agenda/context/useAgendaFilters";
export default function AgendaToolbar() {
  const {
    viewMode,
    setViewMode
  } = useAgendaView();
  const {
    filters,
    setFilters,
    professionals
  } = useAgendaFilters();
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: viewMode === "calendar" ? "default" : "outline",
    onClick: () => setViewMode("calendar")
  }, /*#__PURE__*/React.createElement(Calendar, {
    className: "w-4 h-4 mr-1"
  }), " Calend\xE1rio"), /*#__PURE__*/React.createElement(Button, {
    variant: viewMode === "list" ? "default" : "outline",
    onClick: () => setViewMode("list")
  }, /*#__PURE__*/React.createElement(List, {
    className: "w-4 h-4 mr-1"
  }), " Lista"), /*#__PURE__*/React.createElement(Button, {
    variant: viewMode === "kanban" ? "default" : "outline",
    onClick: () => setViewMode("kanban")
  }, /*#__PURE__*/React.createElement(Kanban, {
    className: "w-4 h-4 mr-1"
  }), " Kanban")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("select", {
    className: "border rounded-lg px-3 py-1 text-sm",
    value: filters?.professionalId ?? "",
    onChange: e => setFilters(f => ({
      ...f,
      professionalId: e.target.value || null
    }))
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos os profissionais"), professionals?.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Buscar paciente...",
    className: "border px-3 py-1 rounded-lg text-sm w-48",
    value: filters?.query ?? "",
    onChange: e => setFilters(f => ({
      ...f,
      query: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(Filter, {
    className: "w-5 h-5 text-gray-500"
  })));
}