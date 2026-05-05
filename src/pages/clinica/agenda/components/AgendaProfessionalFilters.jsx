import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

/**
 * AgendaProfessionalFilters - Filtros para Modo Profissional
 * Aparece apenas para Admin/Gestor, não aparece para profissional puro
 */
export default function AgendaProfessionalFilters({
  agenda,
  isGestor,
  canAccessGestorMode,
  isProfissional,
}) {
  const [expandFilters, setExpandFilters] = useState(window.innerWidth > 768);

  // Mostrar filtros apenas se for admin/gestor E não for profissional puro
  const shouldShowFilters = (isGestor || canAccessGestorMode) && !isProfissional;

  if (!shouldShowFilters) {
    return null;
  }

  // Contar filtros ativos
  const activeFilterCount = Object.values(agenda.filters || {}).filter(
    (v) => v !== null && v !== '',
  ).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6">
      {/* Header dos filtros com toggle para mobile */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            🔍 Filtrar Atendimentos:
            {activeFilterCount > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                {activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                agenda.updateFilter('professional', null);
                agenda.updateFilter('room', null);
                agenda.updateFilter('status', null);
                agenda.updateFilter('payer', null);
                agenda.updateFilter('service', null);
              }}
              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpar
            </button>
          )}
          <button
            onClick={() => setExpandFilters(!expandFilters)}
            className="md:hidden inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Conteúdo dos filtros (colapsável em mobile) */}
      {(expandFilters || window.innerWidth > 768) && (
        <div className="p-4 border-t border-gray-200">
          {/* Barra de busca */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar por paciente ou serviço..."
              value={agenda.filters?.searchText || ''}
              onChange={(e) => agenda.updateFilter('searchText', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtros por dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Filtro: Profissional */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Profissional</label>
              <select
                value={agenda.filters.professional || ''}
                onChange={(e) => agenda.updateFilter('professional', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {agenda.metadata.professionals?.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: Sala */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Sala</label>
              <select
                value={agenda.filters.room || ''}
                onChange={(e) => agenda.updateFilter('room', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {agenda.metadata.rooms?.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: Status */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
              <select
                value={agenda.filters.status || ''}
                onChange={(e) => agenda.updateFilter('status', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="confirmado">✅ Confirmado</option>
                <option value="pendente">⏳ Pendente</option>
                <option value="cancelado">❌ Cancelado</option>
                <option value="falta">🚫 Falta</option>
              </select>
            </div>

            {/* Filtro: Convênio */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Convênio</label>
              <select
                value={agenda.filters.payer || ''}
                onChange={(e) => agenda.updateFilter('payer', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {agenda.metadata.payers?.map((payer) => (
                  <option key={payer.id} value={payer.id}>
                    {payer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: Serviço */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Serviço</label>
              <select
                value={agenda.filters.service || ''}
                onChange={(e) => agenda.updateFilter('service', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {agenda.metadata.services?.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
