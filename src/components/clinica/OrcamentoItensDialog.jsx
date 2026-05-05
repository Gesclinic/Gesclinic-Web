import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function OrcamentoItensDialog({
  open,
  onOpenChange,
  orcamento,
  listItens,
  addItem,
  updateItem,
  deleteItem,
}) {
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState([]);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    if (!orcamento?.id) {
      return;
    }
    setLoading(true);
    try {
      const data = await listItens(orcamento.id);
      setItens(data);
    } finally {
      setLoading(false);
    }
  }, [orcamento?.id, listItens]);

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open, load]);

  const subtotalCalc = useMemo(() => {
    return itens.reduce(
      (acc, it) =>
        acc + Number(it.total_item || Number(it.quantidade || 0) * Number(it.valor_unitario || 0)),
      0,
    );
  }, [itens]);

  const totalCalc = useMemo(() => {
    const desconto = Number(orcamento?.desconto || 0);
    return Math.max(subtotalCalc - desconto, 0);
  }, [subtotalCalc, orcamento?.desconto]);

  const startNew = () => setEdit({ id: null, descricao: '', quantidade: 1, valor_unitario: 0 });
  const startEdit = (it) =>
    setEdit({
      id: it.id,
      descricao: it.descricao || '',
      quantidade: Number(it.quantidade || 1),
      valor_unitario: Number(it.valor_unitario || 0),
    });
  const cancelEdit = () => setEdit(null);

  const saveEdit = async () => {
    if (!orcamento?.id) {
      return;
    }
    setLoading(true);
    try {
      if (edit.id) {
        await updateItem(edit.id, {
          descricao: edit.descricao,
          quantidade: Number(edit.quantidade || 0),
          valor_unitario: Number(edit.valor_unitario || 0),
        });
      } else {
        await addItem(orcamento.id, {
          descricao: edit.descricao,
          quantidade: Number(edit.quantidade || 0),
          valor_unitario: Number(edit.valor_unitario || 0),
        });
      }
      setEdit(null);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id) => {
    setLoading(true);
    try {
      await deleteItem(id);
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        <DialogHeader>
          <DialogTitle>Itens do Orçamento</DialogTitle>
          <DialogDescription>
            {orcamento?.numero
              ? `#${orcamento.numero} — ${orcamento?.titulo || ''}`
              : orcamento?.titulo || ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button onClick={startNew} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar item
            </Button>
            <div className="text-sm text-gray-600">
              Subtotal: <b>R$ {subtotalCalc.toFixed(2)}</b> · Desconto:{' '}
              <b>R$ {Number(orcamento?.desconto || 0).toFixed(2)}</b> · Total:{' '}
              <b>R$ {totalCalc.toFixed(2)}</b>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2">Descrição</th>
                  <th className="text-right px-3 py-2">Qtd</th>
                  <th className="text-right px-3 py-2">Vlr unit.</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!loading && itens.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                      Nenhum item
                    </td>
                  </tr>
                )}
                {!loading &&
                  itens.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-2">{it.descricao || '-'}</td>
                      <td className="px-3 py-2 text-right">{Number(it.quantidade || 0)}</td>
                      <td className="px-3 py-2 text-right">
                        R$ {Number(it.valor_unitario || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        R$ {Number(it.total_item || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(it)}>
                            <Pencil className="w-4 h-4 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => removeItem(it.id)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Remover
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {edit && (
            <div className="border rounded-md p-3 space-y-3 bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-3 space-y-1">
                  <Label>Descrição</Label>
                  <Input
                    value={edit.descricao}
                    onChange={(e) => setEdit({ ...edit, descricao: e.target.value })}
                    placeholder="Ex.: Consulta, Procedimento X…"
                  />
                </div>
                <div className="sm:col-span-1 space-y-1">
                  <Label>Qtd</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={edit.quantidade}
                    onChange={(e) => setEdit({ ...edit, quantidade: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label>Valor unitário (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={edit.valor_unitario}
                    onChange={(e) => setEdit({ ...edit, valor_unitario: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
                <Button onClick={saveEdit}>Salvar item</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
