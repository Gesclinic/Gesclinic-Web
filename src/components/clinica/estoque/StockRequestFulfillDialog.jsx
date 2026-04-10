import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { stockRequestsApi } from "@/lib/stockApi";

export default function StockRequestFulfillDialog({ open, onOpenChange, clinicId, requestId, onCompleted }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [header, setHeader] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!open || !requestId) return;
      setLoading(true);
      try {
        const [h, its] = await Promise.all([
          stockRequestsApi.getHeader(requestId),
          stockRequestsApi.getItems(requestId),
        ]);
        setHeader(h);
        setItems(its.map(it => ({
          ...it,
          deliver_now: Math.max(0, parseFloat(it.qty) - parseFloat(it.delivered_qty || 0)),
        })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, requestId]);

  const pendingOf = (it) => Math.max(0, parseFloat(it.qty) - parseFloat(it.delivered_qty || 0));

  const fillAll = () => {
    setItems(prev => prev.map(it => ({ ...it, deliver_now: pendingOf(it) })));
  };

  const submit = async (e) => {
    e.preventDefault();
    const lines = items
      .map(it => ({ id: it.id, item_id: it.item_id, qty: parseFloat(it.deliver_now) || 0 }))
      .filter(l => l.qty > 0);
    if (lines.length === 0) {
      onOpenChange(false);
      return;
    }
    setLoading(true);
    try {
      await stockRequestsApi.fulfillPartial(clinicId, requestId, lines);
      onOpenChange(false);
      onCompleted?.();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao atender requisição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        <DialogHeader>
          <DialogTitle>Atender Requisição</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {header && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><Label className="text-xs text-gray-600">Data</Label><div>{header.request_date}</div></div>
                <div><Label className="text-xs text-gray-600">Local</Label><div>{header.location_id ? 'Selecionado' : '-'}</div></div>
                <div><Label className="text-xs text-gray-600">Status</Label><div className="capitalize">{header.status}</div></div>
              </div>
            )}

            <div className="border rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-right">Solicitado</th>
                    <th className="px-3 py-2 text-right">Entregue</th>
                    <th className="px-3 py-2 text-right">Pendente</th>
                    <th className="px-3 py-2 text-right">Entregar agora</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-2">{it.item?.name || '-'}</td>
                      <td className="px-3 py-2 text-right">{it.qty}</td>
                      <td className="px-3 py-2 text-right">{it.delivered_qty || 0}</td>
                      <td className="px-3 py-2 text-right">{pendingOf(it)}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={pendingOf(it)}
                          step="0.01"
                          value={it.deliver_now}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setItems(prev => prev.map(p => p.id === it.id ? { ...p, deliver_now: Math.min(Math.max(0, v), pendingOf(p)) } : p));
                          }}
                          className="border rounded px-2 py-1 w-28 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={fillAll}>Entregar tudo pendente</Button>
              <Button type="submit">Confirmar atendimento</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
