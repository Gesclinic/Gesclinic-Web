import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { formatBRL } from '@/utils/formatCurrency';

/**
 * APItemsEditor
 * Props:
 * - value: Array<{ description, quantity, unit_price, category_id, notes }>
 * - onChange: (items) => void
 * - costCenters: optional array for category select
 */
export default function APItemsEditor({ value = [], onChange, costCenters = [] }) {
  const items = Array.isArray(value) ? value : [];

  const update = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange?.(next);
  };

  const addItem = () => {
    onChange?.([...items, { description: '', quantity: 1, unit_price: 0, category_id: '', notes: '' }]);
  };

  const removeItem = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    onChange?.(next);
  };

  const total = items.reduce((acc, it) => {
    const q = Number(it.quantity || 0);
    const u = Number(it.unit_price || 0);
    if (Number.isFinite(q) && Number.isFinite(u)) return acc + q * u;
    return acc;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Itens da NF</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar item
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-500">Nenhum item. Clique em "Adicionar item".</div>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => {
            const lineTotal = Number(it.quantity || 0) * Number(it.unit_price || 0);
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-4">
                  <Label className="text-xs text-gray-600">Descrição</Label>
                  <Input value={it.description} onChange={(e) => update(idx, { description: e.target.value })} placeholder="Ex.: Serviço, produto" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-600">Qtd</Label>
                  <Input type="number" min="0" step="1" value={it.quantity} onChange={(e) => update(idx, { quantity: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-600">Preço unit.</Label>
                  <Input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => update(idx, { unit_price: e.target.value })} />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-xs text-gray-600">Centro de custo</Label>
                  {costCenters.length > 0 ? (
                    <select className="w-full border rounded h-9 px-2 text-sm" value={it.category_id || ''} onChange={(e) => update(idx, { category_id: e.target.value })}>
                      <option value="">Selecione...</option>
                      {costCenters
                        .filter(c => (c.type || '').toLowerCase() === 'despesa' || !c.type)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  ) : (
                    <Input value={it.category_id || ''} onChange={(e) => update(idx, { category_id: e.target.value })} placeholder="UUID" />
                  )}
                </div>
                <div className="md:col-span-1 flex items-center gap-2 justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} title="Remover">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <div className="md:col-span-12 text-right text-xs text-gray-600">Subtotal: {formatBRL(lineTotal || 0)}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className="text-right font-semibold">Total dos itens: {formatBRL(total)}</div>
      <div className="text-xs text-gray-500">O valor total da conta será derivado dos itens quando informado.</div>
    </div>
  );
}
