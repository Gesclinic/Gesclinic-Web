// src/modules/financeiro/centro-custo/components/CostCenterFilters.tsx

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import type { CostCenterFilters } from '../types';

interface CostCenterFiltersProps {
  filters: CostCenterFilters;
  onFiltersChange: (filters: CostCenterFilters) => void;
}

export const CostCenterFilters: React.FC<CostCenterFiltersProps> = ({ filters, onFiltersChange }) => {
  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleStatusChange = (status: string) => {
    if (status === 'all') {
      onFiltersChange({ ...filters, is_active: null });
    } else {
      onFiltersChange({ ...filters, is_active: status === 'active' });
    }
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = filters.search || filters.is_active !== null;

  return (
    <div className="flex flex-col gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por código, nome ou descrição..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={
            filters.is_active === null || filters.is_active === undefined
              ? 'all'
              : filters.is_active
                ? 'active'
                : 'inactive'
          }
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleClearFilters}
            title="Limpar filtros"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CostCenterFilters;
