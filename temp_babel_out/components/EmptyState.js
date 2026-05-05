import React from "react";
import { CalendarX } from "lucide-react";
export default function EmptyState({
  message = "Nenhum registro encontrado"
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-10 text-gray-500"
  }, /*#__PURE__*/React.createElement(CalendarX, {
    className: "w-10 h-10 mb-3 opacity-50"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, message));
}