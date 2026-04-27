import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
export default function AgendaIndicadores() {
  const {
    user
  } = useAuth();
  const {
    clinicId
  } = useClinicContext();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Aqui será implementada a lógica de indicadores
    console.log('AgendaIndicadores carregado para clínica:', clinicId);
  }, [clinicId]);
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-bold text-gray-900 mb-2"
  }, "\uD83D\uDCCA Indicadores de Agenda"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Acompanhe m\xE9tricas e desempenho dos agendamentos")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow-lg p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center h-96"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-24 h-24 text-green-400 mx-auto mb-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.5,
    d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-semibold text-gray-800 mb-3"
  }, "Indicadores"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 w-full"
  }, "Esta p\xE1gina est\xE1 em desenvolvimento. Aqui voc\xEA poder\xE1 acompanhar indicadores e m\xE9tricas de desempenho da agenda."), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 p-4 rounded-lg"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Taxa de Ocupa\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-blue-600"
  }, "--")), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 p-4 rounded-lg"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Falta de Pacientes"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-green-600"
  }, "--")), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-4 rounded-lg"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Tempo M\xE9dio"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-indigo-600"
  }, "--"))))))));
}