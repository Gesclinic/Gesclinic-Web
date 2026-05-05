import { createContext, useContext, useState } from "react";
const AgendaFiltersContext = /*#__PURE__*/createContext();
export function AgendaFiltersProvider({
  children
}) {
  const [filters, setFilters] = useState({
    professionalId: "",
    query: ""
  });
  const [professionals, setProfessionals] = useState([]);
  return /*#__PURE__*/React.createElement(AgendaFiltersContext.Provider, {
    value: {
      filters,
      setFilters,
      professionals,
      setProfessionals
    }
  }, children);
}
export function useAgendaFilters() {
  const context = useContext(AgendaFiltersContext);
  if (!context) {
    throw new Error("useAgendaFilters deve ser usado dentro de AgendaFiltersProvider");
  }
  return context;
}