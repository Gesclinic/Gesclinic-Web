import { createContext, useContext, useState } from "react";

const AgendaFiltersContext = createContext();

export function AgendaFiltersProvider({ children }) {
  const [filters, setFilters] = useState({
    professionalId: "",
    query: "",
  });

  const [professionals, setProfessionals] = useState([]);

  return (
    <AgendaFiltersContext.Provider
      value={{ filters, setFilters, professionals, setProfessionals }}
    >
      {children}
    </AgendaFiltersContext.Provider>
  );
}

export function useAgendaFilters() {
  const context = useContext(AgendaFiltersContext);
  if (!context) {
    throw new Error("useAgendaFilters deve ser usado dentro de AgendaFiltersProvider");
  }
  return context;
}
