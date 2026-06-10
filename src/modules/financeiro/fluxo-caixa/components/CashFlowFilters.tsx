/**
 * 💰 CashFlowFilters Component
 */

import React, { memo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, RotateCcw } from 'lucide-react';
import type { CashFlowFilters as CashFlowFiltersType } from '../types';

interface CashFlowFiltersProps {
  filters: CashFlowFiltersType;
  onFiltersChange: (filters: CashFlowFiltersType) => void;
}

export const CashFlowFilters = memo(({ filters, onFiltersChange }: CashFlowFiltersProps) => {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState((filters as any).searchTerm || '');

  useEffect(() => {
    setSearchTerm((filters as any).searchTerm || '');
  }, [(filters as any).searchTerm]);

  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const now = new Date();
    let startDate: string;
    let endDate: string;

    switch (period) {
      case 'daily':
        startDate = now.toISOString().split('T')[0];
        endDate = startDate;
        break;
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = weekStart.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
    }

    onFiltersChange({
      ...filters,
      start_date: startDate,
      end_date: endDate,
      period,
    });
  };

  const handleReset = () => {
    onFiltersChange({
      period: 'monthly',
      accountId: null,
      searchTerm: '',
    });
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={filters.period === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePeriodChange('daily')}
            >
              Dia
            </Button>
            <Button
              variant={filters.period === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePeriodChange('weekly')}
            >
              Semana
            </Button>
            <Button
              variant={filters.period === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePeriodChange('monthly')}
            >
              Mês
            </Button>
            <Button
              variant={filters.period === 'yearly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePeriodChange('yearly')}
            >
              Ano
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="cash-flow-search" className="text-sm font-medium">Buscar</label>
          <input
            id="cash-flow-search"
            type="search"
            placeholder="Buscar"
            value={searchTerm}
            onChange={e => {
              const nextSearchTerm = e.target.value;
              setSearchTerm(nextSearchTerm);
              onFiltersChange({ ...filters, searchTerm: nextSearchTerm } as any);
            }}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cash-flow-start-date" className="text-sm font-medium">Data Inicial</label>
                <input
                  id="cash-flow-start-date"
                  type="date"
                  lang="pt-BR"
                  value={filters.start_date || ''}
                  onChange={e => onFiltersChange({ ...filters, start_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div>
                <label htmlFor="cash-flow-end-date" className="text-sm font-medium">Data Final</label>
                <input
                  id="cash-flow-end-date"
                  type="date"
                  lang="pt-BR"
                  value={filters.end_date || ''}
                  onChange={e => onFiltersChange({ ...filters, end_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CashFlowFilters.displayName = 'CashFlowFilters';

export default CashFlowFilters;
