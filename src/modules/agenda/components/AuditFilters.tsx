import React, { useState, useCallback } from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface AuditFilterOptions {
  operationType?: 'CREATE' | 'UPDATE' | 'DELETE' | '';
  changedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchText?: string;
}

interface AuditFiltersProps {
  onFilterChange: (filters: AuditFilterOptions) => void;
  isLoading?: boolean;
  className?: string;
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  onFilterChange,
  isLoading = false,
  className = '',
}) => {
  const [filters, setFilters] = useState<AuditFilterOptions>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = useCallback(
    (newFilters: AuditFilterOptions) => {
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [onFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    setFilters({});
    onFilterChange({});
  }, [onFilterChange]);

  const handleOperationChange = (op: string) => {
    const newFilters = {
      ...filters,
      operationType: (op === '' ? '' : op) as AuditFilterOptions['operationType'],
    };
    handleFilterChange(newFilters);
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = {
      ...filters,
      dateFrom: e.target.value ? new Date(e.target.value) : undefined,
    };
    handleFilterChange(newFilters);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = {
      ...filters,
      dateTo: e.target.value ? new Date(e.target.value) : undefined,
    };
    handleFilterChange(newFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = {
      ...filters,
      searchText: e.target.value || undefined,
    };
    handleFilterChange(newFilters);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header with expand button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-700">Filtros Avançados</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {Object.values(filters).filter(v => v !== undefined && v !== '').length} ativo
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isExpanded ? <X size={18} /> : <Filter size={18} />}
        </button>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Search text */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <Input
                type="text"
                placeholder="Nome do usuário, ID do agendamento..."
                value={filters.searchText || ''}
                onChange={handleSearchChange}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>

          {/* Operation type */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['', 'CREATE', 'UPDATE', 'DELETE'] as const).map(op => (
                <button
                  key={op || 'all'}
                  onClick={() => handleOperationChange(op)}
                  disabled={isLoading}
                  className={`py-2 px-3 rounded text-xs font-medium transition-colors ${
                    filters.operationType === op
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {op || 'Todos'}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                <Calendar size={14} className="inline mr-1" />
                De
              </label>
              <Input
                type="date"
                lang="pt-BR"
                value={formatDateForInput(filters.dateFrom)}
                onChange={handleDateFromChange}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                <Calendar size={14} className="inline mr-1" />
                Até
              </label>
              <Input
                type="date"
                lang="pt-BR"
                value={formatDateForInput(filters.dateTo)}
                onChange={handleDateToChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* User filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">
              Usuário que fez alteração
            </label>
            <Input
              type="text"
              placeholder="UUID do usuário ou email..."
              value={filters.changedBy || ''}
              onChange={(e) => handleFilterChange({ ...filters, changedBy: e.target.value || undefined })}
              disabled={isLoading}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <Button
              onClick={handleClearFilters}
              disabled={isLoading || !hasActiveFilters}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Limpar Filtros
            </Button>
            <Button
              onClick={() => setIsExpanded(false)}
              disabled={isLoading}
              size="sm"
              className="flex-1"
            >
              Aplicar
            </Button>
          </div>
        </div>
      )}

      {/* Collapsed view - show active filters as chips */}
      {!isExpanded && hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.operationType && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              filters.operationType === 'CREATE' ? 'bg-green-100 text-green-700' :
              filters.operationType === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>
              {filters.operationType}
            </span>
          )}
          {filters.dateFrom && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              De: {filters.dateFrom.toLocaleDateString('pt-BR')}
            </span>
          )}
          {filters.dateTo && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              Até: {filters.dateTo.toLocaleDateString('pt-BR')}
            </span>
          )}
          {filters.searchText && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              🔍 {filters.searchText.substring(0, 20)}...
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditFilters;
