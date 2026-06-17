import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  Trash2,
  Download,
} from 'lucide-react';

export const FiltersPanel = ({
  filters,
  onFilterChange,
  onClearFilters,
  onSaveFilter,
  savedFilters,
  onLoadFilter,
  onDeleteFilter,
  paymentMethods = [],
  professionals = [],
  payers = [],
  showAdvanced = false,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');

  const normalizeDateInput = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const handleSave = () => {
    if (!filterName.trim()) return;
    onSaveFilter(filterName);
    setFilterName('');
    setShowSaveModal(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      {/* Header */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          🔍 Filtros Avançados
          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {Object.values(filters).filter(v => v).length} ativo(s)
          </span>
        </h3>
        {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {showFilters && (
        <>
          {/* Filtros Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Data Início */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Início
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="dd/mm/aaaa"
                value={filters.startDate || ''}
                onChange={(e) => onFilterChange('startDate', normalizeDateInput(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400">dd/mm/aaaa</span>
            </div>

            {/* Data Fim */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Fim
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="dd/mm/aaaa"
                value={filters.endDate || ''}
                onChange={(e) => onFilterChange('endDate', normalizeDateInput(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400">dd/mm/aaaa</span>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Tipo
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => onFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Forma de Pagamento
              </label>
              <select
                value={filters.paymentMethod || ''}
                onChange={(e) => onFilterChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            {/* Profissional */}
            {professionals.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Profissional
                </label>
                <select
                  value={filters.professionalId || ''}
                  onChange={(e) => onFilterChange('professionalId', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {professionals.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Convênio/Pagador */}
            {payers.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Convênio/Pagador
                </label>
                <select
                  value={filters.payerId || ''}
                  onChange={(e) => onFilterChange('payerId', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {payers.map((payer) => (
                    <option key={payer.id} value={payer.id}>
                      {payer.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onClearFilters}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <RotateCcw size={16} />
              Limpar Filtros
            </button>

            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              <Save size={16} />
              Salvar Filtro
            </button>
          </div>

          {/* Filtros Salvos */}
          {savedFilters.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-3">Filtros Salvos</p>
              <div className="flex gap-2 flex-wrap">
                {savedFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                  >
                    <button
                      onClick={() => onLoadFilter(filter)}
                      className="text-blue-700 font-medium hover:text-blue-900 flex-1 text-left"
                    >
                      {filter.name}
                    </button>
                    <button
                      onClick={() => onDeleteFilter(filter.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Deletar filtro"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Salvar Filtro */}
          {showSaveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-lg">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Salvar Filtro</h3>
                <input
                  type="text"
                  placeholder="Nome do filtro"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveModal(false);
                      setFilterName('');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
