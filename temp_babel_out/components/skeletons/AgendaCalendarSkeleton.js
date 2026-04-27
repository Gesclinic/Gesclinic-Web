import React from "react";
export default function AgendaCalendarSkeleton() {
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full p-4 animate-pulse"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-4 mb-4"
  }, [1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "h-10 bg-gray-200 rounded-md shadow-sm"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, Array.from({
    length: 12
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "h-12 bg-gray-100 rounded-md border"
  }))));
}