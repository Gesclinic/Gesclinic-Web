import { createContext, useContext, useState } from "react";
const AgendaViewContext = /*#__PURE__*/createContext();
export function AgendaViewProvider({
  children
}) {
  const [viewMode, setViewMode] = useState("calendar");
  const [calendarView, setCalendarView] = useState("day");
  return /*#__PURE__*/React.createElement(AgendaViewContext.Provider, {
    value: {
      viewMode,
      setViewMode,
      calendarView,
      setCalendarView
    }
  }, children);
}
export function useAgendaView() {
  const context = useContext(AgendaViewContext);
  if (!context) {
    throw new Error("useAgendaView deve ser usado dentro de AgendaViewProvider");
  }
  return context;
}