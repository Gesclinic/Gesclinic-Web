// src/pages/clinica/agenda/components/AgendaToolbar.jsx

import React from 'react';
import { Calendar, List, Kanban, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Esses contextos vêm da Agenda Premium
import { useAgendaView } from '@/pages/clinica/agenda/context/useAgendaView';
import { useAgendaFilters } from '@/pages/clinica/agenda/context/useAgendaFilters';

export default function AgendaToolbar() {
  const { viewMode, setViewMode } = useAgendaView();
  const { filters, setFilters, professionals } = useAgendaFilters();

  return (
    <div className="w-full bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
      {/* ESQUERDA — MODO DE VISUALIZAÇÃO */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          onClick={() => setViewMode('calendar')}
        >
          <Calendar className="w-4 h-4 mr-1" /> Calendário
        </Button>

        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          onClick={() => setViewMode('list')}
        >
          <List className="w-4 h-4 mr-1" /> Lista
        </Button>

        <Button
          variant={viewMode === 'kanban' ? 'default' : 'outline'}
          onClick={() => setViewMode('kanban')}
        >
          <Kanban className="w-4 h-4 mr-1" /> Kanban
        </Button>
      </div>

      {/* DIREITA — FILTROS */}
      <div className="flex items-center gap-3">
        {/* PROFISSIONAIS */}
        <select
          className="border rounded-lg px-3 py-1 text-sm"
          value={filters?.professionalId ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              professionalId: e.target.value || null,
            }))
          }
        >
          <option value="">Todos os profissionais</option>

          {professionals?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* BUSCA */}
        <input
          type="text"
          placeholder="Buscar paciente..."
          className="border px-3 py-1 rounded-lg text-sm w-48"
          value={filters?.query ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
        />

        <Filter className="w-5 h-5 text-gray-500" />
      </div>
    </div>
  );
}
