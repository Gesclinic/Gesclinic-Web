import React, { createContext, useContext, useState } from 'react';
import { AgendaViewProvider } from './useAgendaView';
import { AgendaFiltersProvider } from './useAgendaFilters';

const AgendaContext = createContext(null);

export function AgendaProvider({ children }) {
  const [filters, setFilters] = useState({
    clinicId: null,
    dateStart: new Date(),
    dateEnd: new Date(),
    professionalId: null,
    roomId: null,
    status: null,
    payerId: null,
    serviceId: null,
    query: '',
  });

  return (
    <AgendaViewProvider>
      <AgendaFiltersProvider>
        <AgendaContext.Provider value={{ filters, setFilters }}>{children}</AgendaContext.Provider>
      </AgendaFiltersProvider>
    </AgendaViewProvider>
  );
}

export function useAgendaContext() {
  return useContext(AgendaContext);
}

export default AgendaProvider;
