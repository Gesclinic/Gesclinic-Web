import { createContext, useContext, useState } from "react";

const AgendaViewContext = createContext();

export function AgendaViewProvider({ children }) {
  const [viewMode, setViewMode] = useState("calendar");
  const [calendarView, setCalendarView] = useState("day");

  return (
    <AgendaViewContext.Provider
      value={{ viewMode, setViewMode, calendarView, setCalendarView }}
    >
      {children}
    </AgendaViewContext.Provider>
  );
}

export function useAgendaView() {
  const context = useContext(AgendaViewContext);
  if (!context) {
    throw new Error("useAgendaView deve ser usado dentro de AgendaViewProvider");
  }
  return context;
}

