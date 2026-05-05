import React, { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * AgendaFiltersOptimized - Filtros ultra-compactos e colapsáveis
 *
 * Design:
 * - Padrão: Fechado (apenas barra com ícone de busca + badge de contagem)
 * - Expandido: Mostra 5 filtros selecionáveis
 * - Altura: 40px (fechado) → 280px (expandido)
 * - Sem espaço desperdiçado quando fechado
 *
 * Props:
 * - searchText: string - filtro de busca/paciente
 * - onSearchChange: (text) => void
 * - selectedFilters: { profissionalId?, salaId?, statusList?, convênioId?, serviçoId? }
 * - onFiltersChange: (filters) => void
 * - professionals: array
 * - rooms: array
 * - agreements: array
 * - services: array
 */
export default function AgendaFiltersOptimized({
  searchText = '',
  onSearchChange = () => {},
  selectedFilters = {},
  onFiltersChange = () => {},
  professionals = [],
  rooms = [],
  agreements = [],
  services = [],
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Contar filtros ativos
  const activeFilterCount = Object.values(selectedFilters).filter(
    (v) => v && (Array.isArray(v) ? v.length > 0 : true),
  ).length;

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleSearchChange = useCallback(
    (e) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange],
  );

  const handleFilterChange = useCallback(
    (filterName, value) => {
      onFiltersChange({ ...selectedFilters, [filterName]: value });
    },
    [selectedFilters, onFiltersChange],
  );

  // Status de exemplo (em produção vem de props)
  const statuses = [
    { value: 'disponivel', label: '🟢 Livre' },
    { value: 'confirmado', label: '🔵 Confirmado' },
    { value: 'aguardando', label: '🟡 Aguardando' },
    { value: 'falta', label: '🔴 Falta' },
    { value: 'bloqueado', label: '⚫ Bloqueado' },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Header: Busca + Toggle */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg h-10">
        {/* Ícone de busca */}
        <span className="text-gray-400">🔍</span>

        {/* Campo de busca */}
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={searchText}
          onChange={handleSearchChange}
          className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
        />

        {/* Badge de filtros ativos */}
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold text-white bg-blue-500 rounded-full">
            {activeFilterCount}
          </span>
        )}

        {/* Toggle de filtros */}
        <button
          onClick={handleToggle}
          className={`flex items-center justify-center w-6 h-6 rounded transition-transform ${
            isOpen ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
          title={isOpen ? 'Fechar filtros' : 'Abrir filtros'}
        >
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filtros expandidos */}
      {isOpen && (
        <div className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg animate-in fade-in-50 duration-200">
          {/* Profissional */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 w-24">👨‍⚕️ Prof.</label>
            <select
              value={selectedFilters.profissionalId || ''}
              onChange={(e) => handleFilterChange('profissionalId', e.target.value || null)}
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
            >
              <option value="">Todos</option>
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name || prof.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Sala */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 w-24">🚪 Sala</label>
            <select
              value={selectedFilters.salaId || ''}
              onChange={(e) => handleFilterChange('salaId', e.target.value || null)}
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
            >
              <option value="">Todas</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name || room.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 w-24">🎯 Status</label>
            <select
              value={selectedFilters.statusList?.[0] || ''}
              onChange={(e) =>
                handleFilterChange('statusList', e.target.value ? [e.target.value] : [])
              }
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
            >
              <option value="">Todos</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Convênio */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 w-24">🏥 Convênio</label>
            <select
              value={selectedFilters.convênioId || ''}
              onChange={(e) => handleFilterChange('convênioId', e.target.value || null)}
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
            >
              <option value="">Todos</option>
              {agreements.map((agreement) => (
                <option key={agreement.id} value={agreement.id}>
                  {agreement.name || agreement.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Serviço */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 w-24">📋 Serviço</label>
            <select
              value={selectedFilters.serviçoId || ''}
              onChange={(e) => handleFilterChange('serviçoId', e.target.value || null)}
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 focus:outline-none focus:border-blue-400"
            >
              <option value="">Todos</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name || service.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Botão limpar filtros */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                onFiltersChange({});
                onSearchChange('');
              }}
              className="mt-1 w-full px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
            >
              🗑️ Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
