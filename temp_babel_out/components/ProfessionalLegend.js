import React from "react";
export default function ProfessionalLegend({
  professionals = []
}) {
  if (!professionals.length) return /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500 italic"
  }, "Nenhum profissional dispon\xEDvel");
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, professionals.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "flex items-center gap-2 px-2 py-1 border rounded-lg bg-white shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-3 h-3 rounded-full",
    style: {
      backgroundColor: p.color
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-gray-700"
  }, p.name))));
}