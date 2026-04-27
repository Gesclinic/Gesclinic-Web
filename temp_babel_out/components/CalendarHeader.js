import React from "react";
import { addDays, subDays, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
export default function CalendarHeader({
  filters,
  setFilters
}) {
  const current = filters.dateStart;
  const changeDate = type => {
    if (type === "prev") {
      setFilters(prev => ({
        ...prev,
        dateStart: subDays(prev.dateStart, 1),
        dateEnd: subDays(prev.dateEnd, 1)
      }));
    } else if (type === "next") {
      setFilters(prev => ({
        ...prev,
        dateStart: addDays(prev.dateStart, 1),
        dateEnd: addDays(prev.dateEnd, 1)
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        dateStart: new Date(),
        dateEnd: new Date()
      }));
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 bg-white border-b px-4 py-2 shadow-sm"
  }, /*#__PURE__*/React.createElement("button", {
    className: "p-1 rounded hover:bg-gray-100",
    onClick: () => changeDate("prev")
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    className: "w-4 h-4"
  })), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold text-[hsl(var(--primary))] text-sm"
  }, format(current, "dd/MM/yyyy")), /*#__PURE__*/React.createElement("button", {
    className: "p-1 rounded hover:bg-gray-100",
    onClick: () => changeDate("next")
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    className: "w-4 h-4"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ml-3 text-xs px-2 py-1 border rounded hover:bg-gray-100",
    onClick: () => changeDate("today")
  }, "Hoje"));
}