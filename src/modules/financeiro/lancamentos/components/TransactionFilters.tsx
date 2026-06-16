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
}

export const TransactionFilters = React.memo<TransactionFiltersProps>(({
  onFilter,
  onReset,
  loading = false,
  accounts,
  categories,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState('');
  const [movementType, setMovementType] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
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
    dateFrom ||
    dateTo ||
    reconciled !== '';

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Filtros Avançados</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            {filtersOpen ? 'Fechar filtros' : 'Abrir filtros'}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {!filtersOpen && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por descrição ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleApplyFilters} disabled={loading}>
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
        </div>
      )}

      {filtersOpen && (
        <>

      {/* Row 1: Busca e Conta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Descrição, documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
              className="pl-10"
            />
          </div>
        </div>

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
      </div>

      {/* Row 2: Tipo, Movimento, Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Row 3: Datas e Categoria */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Row 4: Conciliação e Botões */}
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
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

        <div className="flex gap-2 w-full md:w-auto">
          <Button
            onClick={handleApplyFilters}
            disabled={loading}
            className="flex-1 md:flex-none"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>

          {/* Salvar Filtro */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            disabled={loading}
            title="Salvar configuração atual como filtro"
          >
            <Save className="w-4 h-4" />
          </Button>

          {/* Carregar Filtro */}
          {savedFilters.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  title="Carregar um filtro salvo"
                >
                  <Download className="w-4 h-4" />
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
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* SaveFilterDialog */}
      <SaveFilterDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveFilter}
        existingNames={savedFilters.map((f) => f.name)}
        loading={loading}
      />
        </>
      )}
    </div>
  );
});

TransactionFilters.displayName = 'TransactionFilters';
