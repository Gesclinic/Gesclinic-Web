import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Edit, Filter, PlusCircle, RotateCcw, Search, Trash2 } from 'lucide-react';
import { stockItemsApi } from '@/lib/stockApi';
import ConfirmationDialog from '@/components/clinica/ConfirmationDialog';

const ALL_CATEGORIES_VALUE = 'all-categories';
const ALL_STATUS_VALUE = 'all-status';
const ALL_STOCK_VALUE = 'all-stock';

const initialFilters = {
  search: '',
  category: ALL_CATEGORIES_VALUE,
  status: ALL_STATUS_VALUE,
  stock: ALL_STOCK_VALUE,
};

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const isLowStock = (item) => Number(item.total_balance || 0) < Number(item.min_stock || 0);

const isAboveMaxStock = (item) => {
  const maxStock = Number(item.max_stock || 0);
  return maxStock > 0 && Number(item.total_balance || 0) > maxStock;
};

export default function EstoqueProdutos() {
  const { clinicId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  console.log(
    'EstoqueProdutos render. clinicId:',
    clinicId,
    'loading:',
    loading,
    'items:',
    items.length,
  );

  const fetchItems = useCallback(async () => {
    console.log('fetchItems called. clinicId:', clinicId);
    if (!clinicId) {
      console.warn('fetchItems: No clinicId available');
      setLoading(false); // Ensure loading stops if no clinicId
      return;
    }
    setLoading(true);
    try {
      console.log('Calling stockItemsApi.list...');
      const data = await stockItemsApi.list(clinicId);
      console.log('stockItemsApi.list result:', data);
      setItems(data || []);
      setSelectedIds((current) => current.filter((id) => (data || []).some((item) => item.id === id)));
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar produtos',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openDeleteAlert = (item) => {
    setItemToDelete(item);
    setDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) {
      return;
    }
    try {
      await stockItemsApi.remove(itemToDelete.id);
      toast({ title: 'Produto excluído com sucesso!' });
      await fetchItems();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir produto',
        description: error.message,
      });
    } finally {
      setDeleteAlertOpen(false);
      setItemToDelete(null);
    }
  };

  const categories = useMemo(() => {
    const names = items.map((item) => item.category_name).filter(Boolean);
    return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right));
  }, [items]);

  const filteredItems = useMemo(() => {
    const search = normalizeSearchText(filters.search);
    return items.filter((item) => {
      if (search) {
        const haystack = normalizeSearchText([
          item.name,
          item.sku,
          item.category_name,
          item.unit_symbol,
          item.description,
        ].filter(Boolean).join(' '));
        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (filters.category !== ALL_CATEGORIES_VALUE && item.category_name !== filters.category) {
        return false;
      }

      if (filters.status === 'active' && item.is_active === false) {
        return false;
      }
      if (filters.status === 'inactive' && item.is_active !== false) {
        return false;
      }

      const balance = Number(item.total_balance || 0);
      if (filters.stock === 'low' && !isLowStock(item)) {
        return false;
      }
      if (filters.stock === 'zero' && balance > 0) {
        return false;
      }
      if (filters.stock === 'above_max' && !isAboveMaxStock(item)) {
        return false;
      }
      if (filters.stock === 'normal' && (isLowStock(item) || isAboveMaxStock(item))) {
        return false;
      }

      return true;
    });
  }, [filters, items]);

  const selectedRows = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );

  const selectedVisibleIds = useMemo(
    () => selectedIds.filter((id) => filteredItems.some((item) => item.id === id)),
    [filteredItems, selectedIds],
  );

  const allVisibleSelected = filteredItems.length > 0 && selectedVisibleIds.length === filteredItems.length;

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => value !== initialFilters[key]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setBulkAction('');
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    clearSelection();
  };

  const toggleSelection = (itemId, checked) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(itemId) ? current : [...current, itemId];
      }
      return current.filter((id) => id !== itemId);
    });
  };

  const toggleVisibleSelection = (checked) => {
    const visibleIds = filteredItems.map((item) => item.id);
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...visibleIds]));
      }
      return current.filter((id) => !visibleIds.includes(id));
    });
  };

  const exportItems = (rows, filenameSuffix) => {
    const headers = ['Nome', 'SKU', 'Categoria', 'Minimo', 'Maximo', 'Saldo atual', 'Unidade', 'Status'];
    const lines = rows.map((item) => [
      item.name || '',
      item.sku || '',
      item.category_name || '',
      item.min_stock ?? '',
      item.max_stock ?? '',
      item.total_balance ?? 0,
      item.unit_symbol || 'un',
      item.is_active === false ? 'Inativo' : 'Ativo',
    ].map(csvCell).join(';'));
    const csv = [headers.map(csvCell).join(';'), ...lines].join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produtos-estoque-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApplyBulkAction = async () => {
    if (!bulkAction || bulkProcessing) return;

    if (bulkAction === 'export_visible') {
      if (!filteredItems.length) {
        toast({ variant: 'destructive', title: 'Nada para exportar', description: 'Não há produtos visíveis com os filtros atuais.' });
        return;
      }
      exportItems(filteredItems, 'visiveis');
      toast({ title: 'Exportação gerada', description: `${filteredItems.length} produto(s) exportado(s).` });
      return;
    }

    if (!selectedRows.length) {
      toast({ variant: 'destructive', title: 'Nenhum produto selecionado', description: 'Selecione um ou mais produtos para aplicar a ação.' });
      return;
    }

    if (bulkAction === 'export_selected') {
      exportItems(selectedRows, 'selecionados');
      toast({ title: 'Exportação gerada', description: `${selectedRows.length} produto(s) exportado(s).` });
      return;
    }

    if (bulkAction === 'delete') {
      const confirmed = window.confirm(`Excluir ${selectedRows.length} produto(s) selecionado(s)?`);
      if (!confirmed) return;
    }

    setBulkProcessing(true);
    try {
      const failures = [];
      let succeeded = 0;

      for (const item of selectedRows) {
        try {
          if (bulkAction === 'activate') {
            await stockItemsApi.updateStatus(item.id, true);
          } else if (bulkAction === 'deactivate') {
            await stockItemsApi.updateStatus(item.id, false);
          } else if (bulkAction === 'delete') {
            await stockItemsApi.remove(item.id);
          }
          succeeded += 1;
        } catch (error) {
          failures.push(`${item.name || item.id}: ${error.message || 'erro desconhecido'}`);
        }
      }

      if (failures.length) {
        toast({
          variant: 'destructive',
          title: 'Ação em lote concluída com falhas',
          description: `${succeeded} processado(s), ${failures.length} com falha. ${failures.slice(0, 2).join(' | ')}`,
        });
      } else {
        toast({ title: 'Ação em lote concluída', description: `${succeeded} produto(s) processado(s).` });
      }

      if (succeeded > 0) {
        clearSelection();
        await fetchItems();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro na ação em lote', description: error.message });
    } finally {
      setBulkProcessing(false);
    }
  };

  const applyDisabled = !bulkAction || bulkProcessing || (bulkAction !== 'export_visible' && selectedRows.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <Button onClick={() => navigate('/clinica/estoque/produtos/novo')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(220px,1.5fr)_minmax(180px,1fr)_minmax(150px,0.7fr)_minmax(170px,0.8fr)]">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Nome, SKU, categoria..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Categoria</label>
              <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES_VALUE}>Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS_VALUE}>Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Estoque</label>
              <Select value={filters.stock} onValueChange={(value) => updateFilter('stock', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STOCK_VALUE}>Todos</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Abaixo do mínimo</SelectItem>
                  <SelectItem value="zero">Sem saldo</SelectItem>
                  <SelectItem value="above_max">Acima do máximo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 rounded-md border border-gray-100 bg-gray-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <label className="inline-flex items-center gap-2 font-medium text-gray-700">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => toggleVisibleSelection(Boolean(checked))}
                  disabled={!filteredItems.length}
                  aria-label="Marcar todos os produtos visíveis"
                />
                Marcar todos visíveis
              </label>
              <span className="inline-flex items-center gap-2 font-medium text-gray-700">
                <Filter className="h-4 w-4" />
                {filteredItems.length} de {items.length} produto(s)
              </span>
              {selectedRows.length > 0 && (
                <span className="font-medium text-blue-700">{selectedRows.length} selecionado(s)</span>
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
                aria-label="Ação selecionada para produtos de estoque"
                title="Ação selecionada"
                disabled={bulkProcessing}
              >
                <option value="">Ação selecionada</option>
                <option value="export_selected" disabled={!selectedRows.length}>Exportar selecionados</option>
                <option value="export_visible" disabled={!filteredItems.length}>Exportar visíveis</option>
                <option value="activate" disabled={!selectedRows.length}>Ativar selecionados</option>
                <option value="deactivate" disabled={!selectedRows.length}>Inativar selecionados</option>
                <option value="delete" disabled={!selectedRows.length}>Excluir selecionados</option>
              </select>
              <Button type="button" size="sm" className="bg-blue-600 text-white" onClick={handleApplyBulkAction} disabled={applyDisabled}>
                {bulkAction?.startsWith('export') ? <Download className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {bulkProcessing ? 'Processando...' : 'Aplicar'}
              </Button>
            </div>
          </div>
          <div className="border rounded-md">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="w-10 p-3 text-left">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) => toggleVisibleSelection(Boolean(checked))}
                      disabled={!filteredItems.length}
                      aria-label="Selecionar produtos visíveis"
                    />
                  </th>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">SKU</th>
                  <th className="p-3 text-left">Categoria</th>
                  <th className="p-3 text-center">Mínimo</th>
                  <th className="p-3 text-center">Máximo</th>
                  <th className="p-3 text-center">Saldo Atual</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-4 text-center">
                      Carregando...
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-3 align-middle">
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) => toggleSelection(item.id, Boolean(checked))}
                          aria-label={`Selecionar produto ${item.name || ''}`}
                        />
                      </td>
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-muted-foreground">{item.sku || '-'}</td>
                      <td className="p-3 text-muted-foreground">{item.category_name || '-'}</td>
                      <td className="p-3 text-center text-muted-foreground">
                        {item.min_stock || '-'}
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {item.max_stock || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={
                            item.total_balance < (item.min_stock || 0)
                              ? 'text-red-600 font-semibold'
                              : ''
                          }
                        >
                          {`${item.total_balance || 0} ${item.unit_symbol || 'un'}`}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={item.is_active ? 'default' : 'outline'}>
                          {item.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="p-3 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/clinica/estoque/produtos/editar/${item.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteAlert(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
            {!loading && filteredItems.length === 0 && (
              <p className="text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir o produto "${itemToDelete?.name}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
