/**
 * TransactionFilters Component
 * Filtros avançados para transações
 */

import React, { useState } from 'react';
import { Search, Filter, X, Save, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TransactionFilters as TransactionFiltersType,
  TransactionType,
  MovementType,
  TransactionStatus,
  TRANSACTION_TYPE_LABELS,
  MOVEMENT_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
} from '../types';
import { useSavedFilters } from '../hooks/useSavedFilters';
import { SaveFilterDialog } from './SaveFilterDialog';

interface TransactionFiltersProps {
  onFilter: (filters: TransactionFiltersType) => void;
  onReset: () => void;
  loading?: boolean;
  accounts: any[];
  categories: any[];
  costCenters: any[];
}

export const TransactionFilters = React.memo<TransactionFiltersProps>(({
  onFilter,
  onReset,
  loading = false,
  accounts,
  categories,
  costCenters,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState('');
  const [movementType, setMovementType] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reconciled, setReconciled] = useState<string>('');
  
  const { savedFilters, saveFilter, deleteFilter, getFilter } = useSavedFilters('lancamentos_filters');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const handleApplyFilters = () => {
    const filters: TransactionFiltersType = {};

    if (search) filters.search = search;
    if (accountId) filters.financial_account_id = accountId;
    if (type) filters.transaction_type = type as TransactionType;
    if (movementType) filters.movement_type = movementType as MovementType;
    if (status) filters.status = status as TransactionStatus;
    if (categoryId) filters.category_id = categoryId;
    if (costCenterId) filters.cost_center_id = costCenterId;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    if (reconciled !== '') filters.is_reconciled = reconciled === 'true';

    onFilter(filters);
  };

  const handleReset = () => {
    setSearch('');
    setAccountId('');
    setType('');
    setMovementType('');
    setStatus('');
    setCategoryId('');
    setCostCenterId('');
    setDateFrom('');
    setDateTo('');
    setReconciled('');
    onReset();
  };

  const handleSaveFilter = (name: string) => {
    const currentFilters = {
      search,
      accountId,
      type,
      movementType,
      status,
      categoryId,
      costCenterId,
      dateFrom,
      dateTo,
      reconciled,
    };
    saveFilter(name, currentFilters);
  };

  const handleLoadFilter = (name: string) => {
    const filters = getFilter(name);
    if (filters) {
      setSearch(filters.search || '');
      setAccountId(filters.accountId || '');
      setType(filters.type || '');
      setMovementType(filters.movementType || '');
      setStatus(filters.status || '');
      setCategoryId(filters.categoryId || '');
      setCostCenterId(filters.costCenterId || '');
      setDateFrom(filters.dateFrom || '');
      setDateTo(filters.dateTo || '');
      setReconciled(filters.reconciled || '');
      
      // Aplicar filtros automaticamente
      const appliedFilters: TransactionFiltersType = {};
      if (filters.search) appliedFilters.search = filters.search;
      if (filters.accountId) appliedFilters.financial_account_id = filters.accountId;
      if (filters.type) appliedFilters.transaction_type = filters.type;
      if (filters.movementType) appliedFilters.movement_type = filters.movementType;
      if (filters.status) appliedFilters.status = filters.status;
      if (filters.categoryId) appliedFilters.category_id = filters.categoryId;
      if (filters.costCenterId) appliedFilters.cost_center_id = filters.costCenterId;
      if (filters.dateFrom) appliedFilters.date_from = filters.dateFrom;
      if (filters.dateTo) appliedFilters.date_to = filters.dateTo;
      if (filters.reconciled !== '') appliedFilters.is_reconciled = filters.reconciled === 'true';
      
      onFilter(appliedFilters);
    }
  };

  const hasActiveFilters =
    search ||
    accountId ||
    type ||
    movementType ||
    status ||
    categoryId ||
    costCenterId ||
    dateFrom ||
    dateTo ||
    reconciled !== '';

  const activeFilterCount = [
    search,
    accountId,
    type,
    movementType,
    status,
    categoryId,
    costCenterId,
    dateFrom,
    dateTo,
    reconciled,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
      {/* Header */}
      <button
        type="button"
        onClick={() => setFiltersOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={filtersOpen}
      >
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-600" />
          Filtros Avançados
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-normal text-slate-500">
            {activeFilterCount} ativo(s)
          </span>
        </h3>
        {filtersOpen ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
      </button>

      {filtersOpen && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por descrição ou documento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
                className="pl-10"
              />
            </div>
          </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Conta Financeira</label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.bank_name} - {account.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Tipo</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([typeVal, label]) => (
                <SelectItem key={typeVal} value={typeVal}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Movimento</label>
          <Select value={movementType} onValueChange={setMovementType}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os movimentos" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MOVEMENT_TYPE_LABELS).map(([mvtType, label]) => (
                <SelectItem key={mvtType} value={mvtType}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRANSACTION_STATUS_LABELS).map(([statusVal, label]) => (
                <SelectItem key={statusVal} value={statusVal}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Data De</label>
          <Input
            type="date"
            placeholder="dd/mm/yyyy"
            lang="pt-BR"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Data Até</label>
          <Input
            type="date"
            placeholder="dd/mm/yyyy"
            lang="pt-BR"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Categoria</label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Centro de Custo</label>
          <Select value={costCenterId} onValueChange={setCostCenterId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os centros" />
            </SelectTrigger>
            <SelectContent>
              {costCenters.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.code ? `${cc.code} - ${cc.name}` : cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-1">
          <label className="text-sm font-medium text-gray-700">Conciliação</label>
          <Select value={reconciled} onValueChange={setReconciled}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Conciliado</SelectItem>
              <SelectItem value="false">Não Conciliado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <Button onClick={handleApplyFilters} disabled={loading} className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(true)}
              disabled={loading}
              className="gap-2"
              title="Salvar configuração atual como filtro"
            >
              <Save className="h-4 w-4" />
              Salvar Filtro
            </Button>
            {savedFilters.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="gap-2"
                    title="Carregar um filtro salvo"
                  >
                    <Download className="h-4 w-4" />
                    Carregar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtros Salvos</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {savedFilters.map((filter) => (
                    <div key={filter.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100">
                      <button
                        onClick={() => handleLoadFilter(filter.name)}
                        className="flex-1 text-left text-sm hover:text-blue-600"
                      >
                        {filter.name}
                      </button>
                      <button
                        onClick={() => deleteFilter(filter.name)}
                        aria-label={`Excluir filtro ${filter.name}`}
                        title={`Excluir filtro ${filter.name}`}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      <SaveFilterDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveFilter}
        existingNames={savedFilters.map((f) => f.name)}
        loading={loading}
      />
    </div>
  );
});

TransactionFilters.displayName = 'TransactionFilters';
