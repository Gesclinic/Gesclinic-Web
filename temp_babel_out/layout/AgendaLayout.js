// src/pages/clinica/agenda/layout/AgendaLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
export default function AgendaLayout() {
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full flex flex-col overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-auto px-4 py-4"
  }, /*#__PURE__*/React.createElement(Outlet, null)));
}