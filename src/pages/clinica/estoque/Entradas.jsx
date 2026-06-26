import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Filter, Plus, Pencil, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useClinicContext } from '@/contexts/useClinicContext';
import { stockItemsApi, stockLocationsApi, stockMovementsApi } from '@/lib/stockApi';
import { formatLocalDate } from '@/utils/timezoneHelpers';

const ALL_ITEMS_VALUE = 'all-items';
const ALL_LOCATIONS_VALUE = 'all-locations';

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const initialFilters = {
  search: '',
  startDate: '',
  endDate: '',
  itemId: ALL_ITEMS_VALUE,
  locationId: ALL_LOCATIONS_VALUE,
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const movementTotal = (entry) => Number(entry?.qty || 0) * Number(entry?.unit_cost || 0);

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function Entradas() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { clinicId } = useClinicContext();
  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Entradas' },
  ]);

  const loadOptions = async () => {
    if (!clinicId) {
      return;
    }
    try {
      const [itemRows, locationRows] = await Promise.all([
        stockItemsApi.list(clinicId),
        stockLocationsApi.list(clinicId),
      ]);
      setItems(itemRows || []);
      setLocations(locationRows || []);
    } catch (error) {
      console.error('Erro ao carregar filtros de estoque:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar filtros',
        description: error.message,
      });
    }
  };

  const loadEntries = async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await stockMovementsApi.list(clinicId, {
        type: 'entry',
        startDate: filters.startDate || undefined,
        endDate: filters.endDate ? `${filters.endDate}T23:59:59` : undefined,
        itemId: filters.itemId !== ALL_ITEMS_VALUE ? filters.itemId : undefined,
        locationId: filters.locationId !== ALL_LOCATIONS_VALUE ? filters.locationId : undefined,
      });
      setEntries(data);
      setSelectedIds((current) => current.filter((id) => data.some((entry) => entry.id === id)));
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar entradas',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, [clinicId]);

  useEffect(() => {
    loadEntries();
  }, [clinicId, filters.startDate, filters.endDate, filters.itemId, filters.locationId]);

  const filteredEntries = useMemo(() => {
    const search = normalizeSearchText(filters.search);
    if (!search) {
      return entries;
    }
    return entries.filter((entry) => {
      const haystack = normalizeSearchText([
        entry.item?.name,
        entry.item?.unit_symbol,
        entry.location?.name,
        entry.notes,
        entry.qty,
        entry.unit_cost,
      ].filter(Boolean).join(' '));
      return haystack.includes(search);
    });
  }, [entries, filters.search]);

  const selectedVisibleIds = useMemo(
    () => selectedIds.filter((id) => filteredEntries.some((entry) => entry.id === id)),
    [filteredEntries, selectedIds],
  );

  const selectedRows = useMemo(
    () => entries.filter((entry) => selectedIds.includes(entry.id)),
    [entries, selectedIds],
  );

  const selectedTotal = useMemo(
    () => selectedRows.reduce((sum, entry) => sum + movementTotal(entry), 0),
    [selectedRows],
  );

  const visibleTotal = useMemo(
    () => filteredEntries.reduce((sum, entry) => sum + movementTotal(entry), 0),
    [filteredEntries],
  );

  const isAllVisibleSelected = filteredEntries.length > 0 && selectedVisibleIds.length === filteredEntries.length;

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => value !== initialFilters[key]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setSelectedIds([]);
    setBulkAction('');
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setBulkAction('');
  };

  const toggleSelection = (entryId, checked) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(entryId) ? current : [...current, entryId];
      }
      return current.filter((id) => id !== entryId);
    });
  };

  const toggleVisibleSelection = (checked) => {
    const visibleIds = filteredEntries.map((entry) => entry.id);
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...visibleIds]));
      }
      return current.filter((id) => !visibleIds.includes(id));
    });
  };

  const handleDelete = async (movementId) => {
    if (!movementId) {
      return;
    }
    const confirmed = window.confirm('Excluir esta entrada de estoque?');
    if (!confirmed) {
      return;
    }
    try {
      // Remove movimento e AP vinculada, se existir
      if (stockMovementsApi.removeCascadeAP) {
        await stockMovementsApi.removeCascadeAP(movementId);
      } else {
        await stockMovementsApi.remove(movementId);
      }
      toast({ title: 'Entrada excluída' });
      await loadEntries();
    } catch (error) {
      console.error('Erro ao excluir entrada:', error);
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    }
  };

  const exportEntries = (rows, filenameSuffix) => {
    const headers = ['Data', 'Produto', 'Local', 'Quantidade', 'Unidade', 'Custo unitario', 'Total', 'Observacao'];
    const lines = rows.map((entry) => [
      formatLocalDate(entry.move_date) || '',
      entry.item?.name || '',
      entry.location?.name || '',
      entry.qty ?? '',
      entry.item?.unit_symbol || 'un',
      Number(entry.unit_cost || 0).toFixed(2),
      movementTotal(entry).toFixed(2),
      entry.notes || '',
    ].map(csvCell).join(';'));
    const csv = [headers.map(csvCell).join(';'), ...lines].join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entradas-estoque-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApplyBulkAction = async () => {
    if (!bulkAction || bulkProcessing) {
      return;
    }

    if (bulkAction === 'export_visible') {
      if (!filteredEntries.length) {
        toast({ variant: 'destructive', title: 'Nada para exportar', description: 'Não há entradas visíveis com os filtros atuais.' });
        return;
      }
      exportEntries(filteredEntries, 'visiveis');
      toast({ title: 'Exportação gerada', description: `${filteredEntries.length} entrada(s) exportada(s).` });
      return;
    }

    if (!selectedRows.length) {
      toast({ variant: 'destructive', title: 'Nenhuma entrada selecionada', description: 'Selecione uma ou mais entradas para aplicar a ação.' });
      return;
    }

    if (bulkAction === 'export_selected') {
      exportEntries(selectedRows, 'selecionadas');
      toast({ title: 'Exportação gerada', description: `${selectedRows.length} entrada(s) exportada(s).` });
      return;
    }

    if (bulkAction !== 'delete') {
      return;
    }

    const confirmed = window.confirm(`Excluir ${selectedRows.length} entrada(s) de estoque selecionada(s)?`);
    if (!confirmed) return;

    setBulkProcessing(true);
    try {
      const failures = [];
      let succeeded = 0;

      for (const entry of selectedRows) {
        try {
          if (stockMovementsApi.removeCascadeAP) {
            await stockMovementsApi.removeCascadeAP(entry.id);
          } else {
            await stockMovementsApi.remove(entry.id);
          }
          succeeded += 1;
        } catch (error) {
          failures.push(`${entry.item?.name || entry.id}: ${error.message || 'erro desconhecido'}`);
        }
      }

      if (failures.length) {
        toast({
          variant: 'destructive',
          title: 'Ação em lote concluída com falhas',
          description: `${succeeded} excluída(s), ${failures.length} com falha. ${failures.slice(0, 2).join(' | ')}`,
        });
        if (succeeded > 0) {
          clearSelection();
        }
      } else {
        toast({ title: 'Ação em lote concluída', description: `${succeeded} entrada(s) excluída(s).` });
        clearSelection();
      }
      await loadEntries();
    } catch (error) {
      console.error('Erro ao excluir entradas em lote:', error);
      toast({ variant: 'destructive', title: 'Erro na ação em lote', description: error.message });
    } finally {
      setBulkProcessing(false);
    }
  };

  const applyDisabled = !bulkAction || bulkProcessing || (bulkAction !== 'export_visible' && selectedRows.length === 0);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Entradas de Estoque"
      subtitle="Registre entradas de produtos, compras e reposições."
      actions={
        <Button
          className="bg-blue-600 text-white flex items-center"
          onClick={() => navigate('/clinica/estoque/entradas/nova')}
        >
          <Plus className="mr-2 w-4 h-4" /> Nova Entrada
        </Button>
      }
    >
      <Card className="p-5 mt-6 space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1 block text-xs font-medium text-gray-600">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={filters.search}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  placeholder="Produto, observação, quantidade..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:flex-1">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">De</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => updateFilter('startDate', event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Até</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => updateFilter('endDate', event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Produto</label>
                <Select value={filters.itemId} onValueChange={(value) => updateFilter('itemId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ITEMS_VALUE}>Todos os produtos</SelectItem>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Local</label>
                <Select value={filters.locationId} onValueChange={(value) => updateFilter('locationId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_LOCATIONS_VALUE}>Todos os locais</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <label className="inline-flex items-center gap-2 font-medium text-gray-700">
                <Checkbox
                  checked={isAllVisibleSelected}
                  onCheckedChange={(checked) => toggleVisibleSelection(Boolean(checked))}
                  disabled={!filteredEntries.length}
                  aria-label="Marcar todas as entradas visíveis"
                />
                Marcar todos visíveis
              </label>
              <span className="inline-flex items-center gap-2 font-medium text-gray-700">
                <Filter className="h-4 w-4" />
                {filteredEntries.length} de {entries.length} entrada(s) · {formatCurrency(visibleTotal)} visível
              </span>
              {selectedRows.length > 0 && (
                <span className="font-medium text-blue-700">
                  {selectedRows.length} selecionada(s) · {formatCurrency(selectedTotal)}
                </span>
              )}
              {selectedRows.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                  Desmarcar
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters && selectedIds.length === 0}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Limpar
              </Button>
              <select
                className="h-9 min-w-[210px] rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value)}
                aria-label="Ação selecionada para entradas de estoque"
                title="Ação selecionada"
                disabled={bulkProcessing}
              >
                <option value="">Ação selecionada</option>
                <option value="export_selected" disabled={!selectedRows.length}>Exportar selecionadas</option>
                <option value="export_visible" disabled={!filteredEntries.length}>Exportar visíveis</option>
                <option value="delete" disabled={!selectedRows.length}>Excluir selecionadas</option>
              </select>
              <Button type="button" size="sm" className="bg-blue-600 text-white" onClick={handleApplyBulkAction} disabled={applyDisabled}>
                {bulkAction?.startsWith('export') ? <Download className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {bulkProcessing ? 'Processando...' : 'Aplicar'}
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-4 py-2 text-left">
                <Checkbox
                  checked={isAllVisibleSelected}
                  onCheckedChange={(checked) => toggleVisibleSelection(Boolean(checked))}
                  aria-label="Selecionar entradas visíveis"
                />
              </th>
              <th className="px-4 py-2 text-left">Data</th>
              <th className="px-4 py-2 text-left">Produto</th>
              <th className="px-4 py-2 text-left">Local</th>
              <th className="px-4 py-2 text-left">Quantidade</th>
              <th className="px-4 py-2 text-left">Unidade</th>
              <th className="px-4 py-2 text-right">Custo Unit.</th>
              <th className="px-4 py-2 text-left">Observação</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-500">
                  {hasActiveFilters ? 'Nenhuma entrada encontrada com os filtros atuais.' : 'Nenhuma entrada registrada.'}
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 align-middle">
                    <Checkbox
                      checked={selectedIds.includes(entry.id)}
                      onCheckedChange={(checked) => toggleSelection(entry.id, Boolean(checked))}
                      aria-label={`Selecionar entrada de ${entry.item?.name || 'produto'}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {formatLocalDate(entry.move_date) || '-'}
                  </td>
                  <td className="px-4 py-3">{entry.item?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{entry.location?.name || '-'}</td>
                  <td className="px-4 py-3">{entry.qty}</td>
                  <td className="px-4 py-3">{entry.item?.unit_symbol || 'un'}</td>
                  <td className="px-4 py-3 text-right">
                    {entry.unit_cost ? `R$ ${parseFloat(entry.unit_cost).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{entry.notes || '-'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigate(`/clinica/estoque/entradas/editar/${entry.id}`);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </PageLayout>
  );
}
