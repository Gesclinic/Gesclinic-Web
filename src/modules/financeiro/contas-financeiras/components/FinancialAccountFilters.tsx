/**
 * Financial Account Filters Component
 * Handles filtering and searching financial accounts
 */

import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FinancialAccountsFilterOptions, AccountType, ACCOUNT_TYPE_LABELS } from '../types';
import { FiltersSkeleton } from './SkeletonLoader';

interface FinancialAccountFiltersProps {
  onFilter: (filters: FinancialAccountsFilterOptions) => void;
  onReset?: () => void;
  loading?: boolean;
  banks?: string[];
}

export const FinancialAccountFilters = React.memo<FinancialAccountFiltersProps>(({
  onFilter,
  onReset,
  loading = false,
  banks = [],
}) => {
  if (loading) {
    return <FiltersSkeleton />;
  }

  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState<AccountType | ''>('');
  const [bankName, setBankName] = useState('');
  const [isActive, setIsActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortBy, setSortBy] = useState<'account_name' | 'current_balance' | 'account_type' | 'created_at'>('account_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hasFilters, setHasFilters] = useState(false);

  const handleSearch = (value: string) => {
    setSearch(value);
    applyFilters({ search: value });
  };

  const handleAccountTypeChange = (value: string) => {
    const type = (value as AccountType) || '';
    setAccountType(type);
    applyFilters({ account_type: type as AccountType | undefined });
  };

  const handleBankChange = (value: string) => {
    setBankName(value);
    applyFilters({ bank_name: value });
  };

  const handleStatusChange = (value: 'all' | 'active' | 'inactive') => {
    setIsActive(value);
    applyFilters({
      is_active: value === 'all' ? undefined : value === 'active',
    });
  };

  const handleSortChange = (field: 'account_name' | 'current_balance' | 'account_type' | 'created_at') => {
    setSortBy(field);
    applyFilters({ sortBy: field });
  };

  const handleSortOrderChange = (order: 'asc' | 'desc') => {
    setSortOrder(order);
    applyFilters({ sortOrder: order });
  };

  const applyFilters = (updates: any) => {
    const filters: FinancialAccountsFilterOptions = {
      search: search || undefined,
      account_type: (accountType as AccountType) || undefined,
      bank_name: bankName || undefined,
      is_active: isActive === 'all' ? undefined : isActive === 'active',
      sortBy,
      sortOrder,
      ...updates,
    };

    // Remove undefined values
    Object.keys(filters).forEach(
      (key) => filters[key as keyof FinancialAccountsFilterOptions] === undefined && 
        delete filters[key as keyof FinancialAccountsFilterOptions]
    );

    setHasFilters(
      !!search || !!accountType || !!bankName || isActive !== 'active' || 
      sortBy !== 'account_name' || sortOrder !== 'asc'
    );

    onFilter(filters);
  };

  const handleReset = () => {
    setSearch('');
    setAccountType('');
    setBankName('');
    setIsActive('active');
    setSortBy('account_name');
    setSortOrder('asc');
    setHasFilters(false);
    onFilter({ is_active: true, sortBy: 'account_name', sortOrder: 'asc' });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por banco, conta ou número..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
          disabled={loading}
        />
      </div>

      {/* Filters Row */}
      <div className="flex gap-2 flex-wrap">
        {/* Account Type Filter */}
        <Select value={accountType || undefined} onValueChange={handleAccountTypeChange} disabled={loading}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo de conta" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([type, label]) => (
              <SelectItem key={type} value={type}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bank Filter */}
        {banks.length > 0 && (
          <Select value={bankName} onValueChange={handleBankChange} disabled={loading}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Banco" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={bank} value={bank}>
                  {bank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status Filter */}
        <Select value={isActive} onValueChange={handleStatusChange} disabled={loading}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={loading}
            >
              <Filter className="w-4 h-4" />
              Ordenar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Ordenar por:</p>
                <div className="space-y-2">
                  {[
                    { value: 'account_name', label: 'Nome' },
                    { value: 'current_balance', label: 'Saldo' },
                    { value: 'account_type', label: 'Tipo' },
                    { value: 'created_at', label: 'Data de criação' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value as any)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                        sortBy === option.value
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Ordem:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSortOrderChange('asc')}
                    className={`flex-1 px-2 py-1.5 rounded text-sm ${
                      sortOrder === 'asc'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Crescente ↑
                  </button>
                  <button
                    onClick={() => handleSortOrderChange('desc')}
                    className={`flex-1 px-2 py-1.5 rounded text-sm ${
                      sortOrder === 'desc'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Decrescente ↓
                  </button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset Button */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-2 text-gray-600 hover:text-gray-900"
            disabled={loading}
          >
            <X className="w-4 h-4" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
});
