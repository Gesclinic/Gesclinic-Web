import React from "react";
export default function AgendaCardSkeleton() {
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-4 gap-4 p-4 animate-pulse"
  }, [1, 2, 3, 4].map(col => /*#__PURE__*/React.createElement("div", {
    key: col,
    className: "bg-white rounded-xl border p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-6 bg-gray-200 rounded mb-4"
  }), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, Array.from({
    length: 4
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "h-20 bg-gray-100 rounded border"
  }))))));
}