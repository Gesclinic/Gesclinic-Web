import React from "react";
export default function AgendaTableSkeleton() {
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 animate-pulse"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-8 bg-gray-200 rounded w-40 mb-4"
  }), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, Array.from({
    length: 8
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "h-14 bg-gray-100 rounded border"
  }))));
}