// src/pages/clinica/agenda/Agenda.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import AgendaLayout from "./layout/AgendaLayout";
export default function Agenda() {
  return /*#__PURE__*/React.createElement(AgendaLayout, null, /*#__PURE__*/React.createElement(Outlet, null));
}