import React, { useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useAgendaFilters } from '../hooks/useAgendaFilters';

/**
 * AgendaFiltersNew - Componente colapsável (accordion) para refinamento de filtros
 *
 * Props:
 * - filters: { professional?, room?, status?, payer?, service?, searchText? }
 * - onFilterChange: (key, value) => void
 * - onClearFilters: () => void
 * - metadata: { professionals, rooms, services, payers }
 * - viewMode: 'geral' | 'profissional' | 'sala'
 */
export default function AgendaFiltersNew({
  filters = {},
  onFilterChange,
  onClearFilters,
  metadata = {},
  viewMode = 'geral',
}) {
  const { isOpen, toggleOpen, closeFilters, updateActiveFiltersCount } = useAgendaFilters();

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.professional_id) {
      count++;
    }
    if (filters.room_id) {
      count++;
    }
    if (filters.status) {
      count++;
    }
    if (filters.payer_id) {
      count++;
    }
    if (filters.service_id) {
      count++;
    }
    return count;
  }, [filters]);

  React.useEffect(() => {
    updateActiveFiltersCount(activeFiltersCount);
  }, [activeFiltersCount, updateActiveFiltersCount]);

  const handleClearFilters = () => {
    onClearFilters?.();
    closeFilters();
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-32 z-10">
      <div className="w-full mx-auto px-4 py-3">
        {/* Linha Sempre Visível */}
        <div className="flex items-center gap-3">
          {/* Campo de Busca Global */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente ou serviço..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange?.('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Botão Filtros */}
          <button
            onClick={toggleOpen}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              isOpen
                ? 'bg-blue-100 text-blue-600 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            <span>🔍 Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filtros Avançados */}
        {isOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Filtro: Profissional */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Profissional
                </label>
                <select
                  value={filters.professional_id || ''}
                  onChange={(e) => onFilterChange?.('professional_id', e.target.value || '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {metadata.professionals?.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro: Sala */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Sala</label>
                <select
                  value={filters.room_id || ''}
                  onChange={(e) => onFilterChange?.('room_id', e.target.value || '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas</option>
                  {metadata.rooms?.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro: Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => onFilterChange?.('status', e.target.value || '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="scheduled">🗓️ Agendado</option>
                  <option value="confirmed">✅ Confirmado</option>
                  <option value="in_service">⏳ Em Atendimento</option>
                  <option value="attended">✔️ Compareceu</option>
                  <option value="no_show">❌ Faltou</option>
                  <option value="canceled">🚫 Cancelado</option>
                </select>
              </div>

              {/* Filtro: Convênio */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Convênio</label>
                <select
                  value={filters.payer_id || ''}
                  onChange={(e) => onFilterChange?.('payer_id', e.target.value || '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {metadata.payers?.map((payer) => (
                    <option key={payer.id} value={payer.id}>
                      {payer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro: Serviço */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Serviço</label>
                <select
                  value={filters.service_id || ''}
                  onChange={(e) => onFilterChange?.('service_id', e.target.value || '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {metadata.services?.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botão Limpar Filtros */}
            {activeFiltersCount > 0 && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                >
                  <X className="w-4 h-4" />
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
