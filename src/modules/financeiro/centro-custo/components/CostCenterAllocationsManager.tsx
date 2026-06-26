import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { CostCenter } from '../types';
import {
  listCostCenterAllocations,
  saveCostCenterAllocation,
  deleteCostCenterAllocation,
} from '../services/costCentersApi';

type AllocationMethod = 'PERCENT' | 'VALUE' | 'MIXED';

interface AllocationItemForm {
  target_cost_center_id: string;
  percentage: string;
  fixed_amount: string;
}

interface AllocationForm {
  id?: string;
  source_cost_center_id: string;
  description: string;
  allocation_method: AllocationMethod;
  items: AllocationItemForm[];
}

interface CostCenterAllocationsManagerProps {
  clinicId: string;
  centers: CostCenter[];
  onChanged?: () => Promise<void> | void;
}

const EMPTY_FORM: AllocationForm = {
  source_cost_center_id: '',
  description: '',
  allocation_method: 'PERCENT',
  items: [
    {
      target_cost_center_id: '',
      percentage: '',
      fixed_amount: '',
    },
  ],
};

export function CostCenterAllocationsManager({ clinicId, centers, onChanged }: CostCenterAllocationsManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [form, setForm] = useState<AllocationForm>(EMPTY_FORM);

  const centerById = useMemo(() => new Map(centers.map((c) => [c.id, c])), [centers]);

  const activeCenters = useMemo(
    () => centers.filter((center) => center.is_active),
    [centers],
  );

  const loadAllocations = async () => {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listCostCenterAllocations(clinicId);
      setAllocations(rows || []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar rateios');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = async () => {
    setForm(EMPTY_FORM);
    setOpen(true);
    await loadAllocations();
  };

  const openEdit = (allocation: any) => {
    const items = (allocation.items || []).map((item: any) => ({
      target_cost_center_id: item.target_cost_center_id || '',
      percentage:
        item.percentage === null || item.percentage === undefined ? '' : String(item.percentage),
      fixed_amount:
        item.fixed_amount === null || item.fixed_amount === undefined ? '' : String(item.fixed_amount),
    }));

    setForm({
      id: allocation.id,
      source_cost_center_id: allocation.source_cost_center_id || '',
      description: allocation.description || '',
      allocation_method: (allocation.allocation_method || 'PERCENT') as AllocationMethod,
      items: items.length > 0 ? items : EMPTY_FORM.items,
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { target_cost_center_id: '', percentage: '', fixed_amount: '' },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, patch: Partial<AllocationItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const validateAndNormalizeItems = () => {
    const normalized = form.items
      .map((item) => ({
        target_cost_center_id: item.target_cost_center_id,
        percentage: item.percentage === '' ? null : Number(item.percentage),
        fixed_amount: item.fixed_amount === '' ? null : Number(item.fixed_amount),
      }))
      .filter((item) => item.target_cost_center_id);

    if (!form.source_cost_center_id) {
      throw new Error('Selecione o centro de custo de origem.');
    }

    if (normalized.length === 0) {
      throw new Error('Adicione pelo menos um destino de rateio.');
    }

    const duplicatedTargets = new Set<string>();
    const targetsSeen = new Set<string>();
    normalized.forEach((item) => {
      if (targetsSeen.has(item.target_cost_center_id)) duplicatedTargets.add(item.target_cost_center_id);
      targetsSeen.add(item.target_cost_center_id);
    });

    if (duplicatedTargets.size > 0) {
      throw new Error('Existem destinos duplicados no rateio.');
    }

    if (form.allocation_method === 'PERCENT') {
      const sum = normalized.reduce((acc, item) => acc + Number(item.percentage || 0), 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw new Error('No método percentual, a soma dos percentuais deve ser 100%.');
      }
    }

    return normalized;
  };

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    setError(null);
    try {
      const items = validateAndNormalizeItems();
      await saveCostCenterAllocation(
        clinicId,
        form.source_cost_center_id,
        items,
        {
          description: form.description || undefined,
          allocation_method: form.allocation_method,
        },
      );

      await loadAllocations();
      await onChanged?.();
      closeModal();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar regra de rateio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (allocationId: string) => {
    if (!allocationId || !window.confirm('Deseja excluir esta regra de rateio?')) return;

    setDeletingId(allocationId);
    setError(null);
    try {
      await deleteCostCenterAllocation(allocationId);
      await loadAllocations();
      await onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir regra de rateio');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Rateio Automático</CardTitle>
        <Button variant="outline" onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Gerenciar Rateio
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Carregando regras de rateio...</p>
        ) : allocations.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma regra de rateio cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {allocations.map((allocation) => {
              const source = centerById.get(allocation.source_cost_center_id);
              return (
                <div key={allocation.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Origem: {source ? `${source.code} - ${source.name}` : allocation.source_cost_center_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        Método: {allocation.allocation_method} • Itens: {(allocation.items || []).length}
                      </p>
                      {allocation.description && (
                        <p className="text-xs text-gray-600 mt-1">{allocation.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(allocation)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(allocation.id)}
                        disabled={deletingId === allocation.id}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={open} onOpenChange={(value) => (!value ? closeModal() : setOpen(true))}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Editar regra de rateio' : 'Nova regra de rateio'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>Centro de origem *</Label>
                  <Select
                    value={form.source_cost_center_id}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, source_cost_center_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o centro de origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.code} - {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Método</Label>
                  <Select
                    value={form.allocation_method}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, allocation_method: value as AllocationMethod }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Percentual</SelectItem>
                      <SelectItem value="VALUE">Valor fixo</SelectItem>
                      <SelectItem value="MIXED">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex.: Rateio despesas administrativas"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Itens de destino</Label>
                  <Button size="sm" variant="outline" onClick={addItem}>
                    Adicionar destino
                  </Button>
                </div>

                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded-lg p-2">
                    <div className="md:col-span-6">
                      <Label className="text-xs">Centro destino *</Label>
                      <Select
                        value={item.target_cost_center_id}
                        onValueChange={(value) => updateItem(index, { target_cost_center_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeCenters.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              {center.code} - {center.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-xs">% rateio</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.percentage}
                        onChange={(e) => updateItem(index, { percentage: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <Label className="text-xs">Valor fixo</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.fixed_amount}
                        onChange={(e) => updateItem(index, { fixed_amount: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar regra'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
