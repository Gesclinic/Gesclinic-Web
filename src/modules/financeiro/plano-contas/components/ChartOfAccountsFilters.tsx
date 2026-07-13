/**
 * Component: ChartOfAccountsFilters
 * Filters for chart of accounts search and display
 */

import React, { useState } from 'react';
import { Search, X, RotateCcw, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { ChartOfAccountFilter, AccountType, AccountNature } from '../types';

interface ChartOfAccountsFiltersProps {
  onFilterChange: (filters: ChartOfAccountFilter) => void;
  initialFilters?: ChartOfAccountFilter;
}

const ACCOUNT_TYPES: AccountType[] = ['RECEITA', 'DESPESA', 'ATIVO', 'PASSIVO', 'PATRIMONIO'];
const ACCOUNT_NATURES: AccountNature[] = ['CREDORA', 'DEVEDORA'];

export const ChartOfAccountsFilters: React.FC<ChartOfAccountsFiltersProps> = ({
  onFilterChange,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<ChartOfAccountFilter>({
    search: initialFilters.search || '',
    type: initialFilters.type,
    nature: initialFilters.nature,
    is_active: initialFilters.is_active !== undefined ? initialFilters.is_active : true,
    level: initialFilters.level,
    accepts_entries: initialFilters.accepts_entries,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleFilterChange = (field: string, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: ChartOfAccountFilter = {
      search: '',
      is_active: true,
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters =
    filters.search ||
    filters.type ||
    filters.nature ||
    filters.level ||
    filters.is_active !== true ||
    filters.accepts_entries !== undefined;

  const activeFilterCount = [
    filters.search,
    filters.type,
    filters.nature,
    filters.level,
    filters.is_active !== true ? filters.is_active : undefined,
    filters.accepts_entries,
  ].filter((value) => value !== undefined && value !== '').length;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isExpanded}
      >
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-600" />
          Filtros Avançados
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-normal text-slate-500">
            {activeFilterCount} ativo(s)
          </span>
        </h3>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
      </button>

      {isExpanded && (
        <div className="mt-4 border-t border-slate-100 pt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código ou nome..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filters.search && (
              <button
                type="button"
                aria-label="Limpar busca"
                title="Limpar busca"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Tipo de Conta
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value=""
                  checked={!filters.type}
                  onChange={() => handleFilterChange('type', undefined)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Todos os tipos</span>
              </label>
              {ACCOUNT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={filters.type === type}
                    onChange={() => handleFilterChange('type', type)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Nature Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Natureza
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="nature"
                  value=""
                  checked={!filters.nature}
                  onChange={() => handleFilterChange('nature', undefined)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Todas as naturezas</span>
              </label>
              {ACCOUNT_NATURES.map((nature) => (
                <label key={nature} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nature"
                    value={nature}
                    checked={filters.nature === nature}
                    onChange={() => handleFilterChange('nature', nature)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">{nature}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Status
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="all"
                  checked={filters.is_active === undefined}
                  onChange={() => handleFilterChange('is_active', undefined)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Ambas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={filters.is_active === true}
                  onChange={() => handleFilterChange('is_active', true)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Ativas apenas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={filters.is_active === false}
                  onChange={() => handleFilterChange('is_active', false)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Inativas apenas</span>
              </label>
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Nível
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="level"
                  value=""
                  checked={!filters.level}
                  onChange={() => handleFilterChange('level', undefined)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Todos os níveis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="level"
                  value="1"
                  checked={filters.level === 1}
                  onChange={() => handleFilterChange('level', 1)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Contas raiz</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="level"
                  value="2"
                  checked={filters.level === 2}
                  onChange={() => handleFilterChange('level', 2)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Subcontas</span>
              </label>
            </div>
          </div>

          {/* Accepts Entries Filter */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.accepts_entries === true}
                onChange={(e) =>
                  handleFilterChange('accepts_entries', e.target.checked ? true : undefined)
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Apenas contas que aceitam lançamentos
              </span>
            </label>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Limpar Filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChartOfAccountsFilters;
