import React from "react";
import { X } from "lucide-react";
export default function AgendaSidePanel({
  open,
  onClose,
  data,
  logs = [],
  onConfirm,
  onCancel
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed right-0 top-0 h-full w-96 bg-white border-l shadow-xl p-5 z-50 animate-slide-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-semibold text-primary"
  }, "Detalhes"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose
  }, /*#__PURE__*/React.createElement(X, {
    className: "w-5 h-5"
  }))), data ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 text-sm"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "Paciente:"), " ", data.patient_name), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "Profissional:"), " ", data.professional_name), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "Servi\xE7o:"), " ", data.service_name), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "Hor\xE1rio:"), " ", data.start_time?.slice(11, 16)), /*#__PURE__*/React.createElement("div", {
    className: "pt-3"
  }, /*#__PURE__*/React.createElement("button", {
    className: "w-full bg-green-600 text-white py-2 rounded-md mb-2",
    onClick: () => onConfirm(data)
  }, "Confirmar"), /*#__PURE__*/React.createElement("button", {
    className: "w-full bg-red-600 text-white py-2 rounded-md",
    onClick: () => onCancel(data)
  }, "Cancelar")), /*#__PURE__*/React.createElement("hr", {
    className: "my-3"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-700 mb-2"
  }, "Hist\xF3rico"), logs.length ? logs.map((l, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-xs text-gray-600"
  }, l.created_at, " \u2014 ", l.message)) : /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400"
  }, "Nenhum log registrado."))) : /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400"
  }, "Nenhum item selecionado."));
}