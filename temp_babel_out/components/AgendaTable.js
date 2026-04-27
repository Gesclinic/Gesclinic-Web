import React from "react";
export default function AgendaTable({
  appointments = [],
  loading,
  onClickSlot
}) {
  if (loading) return /*#__PURE__*/React.createElement("p", {
    className: "text-center py-6 text-gray-500"
  }, "Carregando\u2026");
  if (!appointments.length) return /*#__PURE__*/React.createElement("p", {
    className: "text-center py-10 text-gray-400"
  }, "Nenhum agendamento encontrado.");
  return /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gray-100 text-sm"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-left"
  }, "Hor\xE1rio"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-left"
  }, "Paciente"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-left"
  }, "Profissional"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-left"
  }, "Servi\xE7o"))), /*#__PURE__*/React.createElement("tbody", null, appointments.map(a => /*#__PURE__*/React.createElement("tr", {
    key: a.id,
    className: "border-b hover:bg-gray-50 cursor-pointer",
    onClick: () => onClickSlot(a)
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2"
  }, a.scheduled_time?.slice(0, 5)), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2"
  }, a.patient_name), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2"
  }, a.professional_name), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2"
  }, a.service_name)))));
}