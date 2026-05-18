/**
 * 💰 Contas a Pagar - Página Principal
 * Enterprise payables management dashboard
 */

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Download, Upload, Filter, X } from 'lucide-react';
import { usePayableManagement, usePayables } from '../hooks/usePayables';
import { PayablesExtendedDashboard } from '../components/PayablesDashboard';
import { PayablesTable } from '../components/PayablesTable';
import { Payable, PayableFilterParams, PayableStatus, PayableType } from '../types';

interface PayablesPageState {
  showFilters: boolean;
  selectedPayables: string[];
  filterParams: PayableFilterParams;
  searchQuery: string;
}

export default function ContasApagarPage() {
  const { user } = useAuth();
  const { clinic, clinicId } = useClinicContext();

  const [pageState, setPageState] = useState<PayablesPageState>({
    showFilters: false,
    selectedPayables: [],
    filterParams: {
      clinic_id: clinicId!,
      limit: 50,
      offset: 0,
    },
    searchQuery: '',
  });

  // Queries
  const { payables, summary, overdueCount, isLoading, createPayable, updatePayable, deletePayable, payPayable } =
    usePayableManagement(clinicId!);

  // Update filters when search changes
  const handleSearch = useCallback((query: string) => {
    setPageState((prev) => ({
      ...prev,
      searchQuery: query,
      filterParams: {
        ...prev.filterParams,
        search: query || undefined,
        offset: 0,
      },
    }));
  }, []);

  // Toggle filters
  const handleToggleFilters = useCallback(() => {
    setPageState((prev) => ({
      ...prev,
      showFilters: !prev.showFilters,
    }));
  }, []);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setPageState((prev) => ({
      ...prev,
      filterParams: {
        clinic_id: clinicId!,
        limit: 50,
        offset: 0,
      },
      searchQuery: '',
    }));
  }, [clinicId]);

  // Select payables
  const handleSelectChange = useCallback((selected: string[]) => {
    setPageState((prev) => ({
      ...prev,
      selectedPayables: selected,
    }));
  }, []);

  // Handlers
  const handleViewPayable = useCallback((payable: Payable) => {
    // TODO: Open detail modal or navigate to detail page
    console.log('View payable:', payable.id);
  }, []);

  const handleEditPayable = useCallback((payable: Payable) => {
    // TODO: Open edit modal
    console.log('Edit payable:', payable.id);
  }, []);

  const handleDeletePayable = useCallback(
    async (payable: Payable) => {
      try {
        await deletePayable(payable.id);
        // TODO: Show success toast
      } catch (error) {
        console.error('Error deleting payable:', error);
        // TODO: Show error toast
      }
    },
    [deletePayable]
  );

  const handlePayPayable = useCallback(
    (payable: Payable) => {
      // TODO: Open payment modal
      console.log('Pay payable:', payable.id);
    },
    []
  );

  const handleCreateNew = useCallback(() => {
    // TODO: Open create modal
    console.log('Create new payable');
  }, []);

  const handleExport = useCallback(() => {
    // TODO: Implement export
    console.log('Export payables');
  }, []);

  const hasActiveFilters = pageState.searchQuery || 
    Object.entries(pageState.filterParams).some(
      ([key, value]) => key !== 'clinic_id' && key !== 'limit' && key !== 'offset' && value !== undefined
    );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contas a Pagar</h1>
            <p className="text-gray-600 mt-1">Gestão completa de contas e fornecedores</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button
              onClick={handleCreateNew}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Conta
            </Button>
          </div>
        </div>

        {/* Dashboard KPIs */}
        <PayablesExtendedDashboard
          summary={summary}
          isLoading={isLoading}
        />

        {/* Search and Filters Bar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por fornecedor, descrição ou documento..."
                  value={pageState.searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={pageState.showFilters ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleFilters}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                      !
                    </span>
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Advanced Filters (collapsed by default) */}
          {pageState.showFilters && (
            <CardContent className="pt-0 border-t">
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="">Todos</option>
                    <option value="OPEN">Aberto</option>
                    <option value="OVERDUE">Vencido</option>
                    <option value="PARTIAL">Parcial</option>
                    <option value="PAID">Pago</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="">Todos</option>
                    <option value="SUPPLIER">Fornecedor</option>
                    <option value="SERVICE">Serviço</option>
                    <option value="UTILITIES">Utilidades</option>
                    <option value="PAYROLL">Folha</option>
                  </select>
                </div>

                {/* Due Date Range */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Vencimento De</label>
                  <input
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Vencimento Até</label>
                  <input
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                {/* Amount Range */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Valor Mínimo</label>
                  <input
                    type="number"
                    placeholder="0,00"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Valor Máximo</label>
                  <input
                    type="number"
                    placeholder="9.999.999,00"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Payables Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contas a Pagar</CardTitle>
                <CardDescription>
                  Total: {payables.length} conta{payables.length !== 1 ? 's' : ''}
                  {pageState.selectedPayables.length > 0 && (
                    <span className="ml-2 font-semibold text-blue-600">
                      ({pageState.selectedPayables.length} selecionada{pageState.selectedPayables.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <PayablesTable
              payables={payables}
              isLoading={isLoading}
              onView={handleViewPayable}
              onEdit={handleEditPayable}
              onDelete={handleDeletePayable}
              onPay={handlePayPayable}
              onSelectChange={handleSelectChange}
            />
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {pageState.selectedPayables.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  <strong>{pageState.selectedPayables.length}</strong> conta{pageState.selectedPayables.length !== 1 ? 's' : ''} selecionada{pageState.selectedPayables.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Marcar como Pago
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
