import React, { createContext, useContext, useState } from "react";
import { AgendaViewProvider } from "./useAgendaView";
import { AgendaFiltersProvider } from "./useAgendaFilters";
const AgendaContext = /*#__PURE__*/createContext(null);
export function AgendaProvider({
  children
}) {
  const [filters, setFilters] = useState({
    clinicId: null,
    dateStart: new Date(),
    dateEnd: new Date(),
    professionalId: null,
    roomId: null,
    status: null,
    payerId: null,
    serviceId: null,
    query: ""
  });
  return /*#__PURE__*/React.createElement(AgendaViewProvider, null, /*#__PURE__*/React.createElement(AgendaFiltersProvider, null, /*#__PURE__*/React.createElement(AgendaContext.Provider, {
    value: {
      filters,
      setFilters
    }
  }, children)));
}
export function useAgendaContext() {
  return useContext(AgendaContext);
}
export default AgendaProvider;