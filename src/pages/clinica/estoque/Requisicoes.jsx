import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, Info, MoreVertical, CheckCircle, Hourglass } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import LocationSelect from "@/components/clinica/estoque/LocationSelect";
import { Skeleton } from "@/components/ui/skeleton";
import StockRequestDialog from "@/components/clinica/estoque/StockRequestDialog";
import { useClinicContext } from "@/contexts/useClinicContext";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { stockRequestsApi } from "@/lib/stockApi";
import StockRequestFulfillDialog from "@/components/clinica/estoque/StockRequestFulfillDialog";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import StockMovementDialog from "@/components/clinica/estoque/StockMovementDialog";

export default function Requisicoes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [itemsHeader, setItemsHeader] = useState(null);
  const [balances, setBalances] = useState({}); // item_id -> available balance at location
  const [selected, setSelected] = useState({}); // item_id -> boolean
  const [deliverQty, setDeliverQty] = useState({}); // item_id -> qty to deliver
  const [statusFilter, setStatusFilter] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState({ id: "", name: "" });
  const [searchParams, setSearchParams] = useSearchParams();
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveReqId, setApproveReqId] = useState(null);
  const [approveComment, setApproveComment] = useState("");
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [fulfillReqId, setFulfillReqId] = useState(null);
  const [saidaOpen, setSaidaOpen] = useState(false);
  const [saidaReqId, setSaidaReqId] = useState(null);
  const [saidaInitialForm, setSaidaInitialForm] = useState(null);
  const [summaries, setSummaries] = useState({});
  const { clinicId } = useClinicContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const breadcrumbs = useBreadcrumbs([
    { label: "Estoque", path: "/clinica/estoque" },
    { label: "Requisições" }
  ]);

  const loadRequests = async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await stockRequestsApi.list(clinicId);
      setRows(data);
      const ids = (data || []).map(r => r.id);
      if (ids.length) {
        const items = await stockRequestsApi.getItemsByRequestIds(ids);
        const map = {};
        for (const it of items) {
          const rid = it.request_id;
          if (!map[rid]) map[rid] = { total: 0, delivered: 0 };
          map[rid].total += parseFloat(it.qty) || 0;
          map[rid].delivered += parseFloat(it.delivered_qty) || 0;
        }
        setSummaries(map);
      } else {
        setSummaries({});
      }
    } catch (err) {
      console.error('Erro ao carregar requisições:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar requisições', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const openItems = async (reqHeader) => {
    setItemsOpen(true);
    setItemsLoading(true);
    try {
      // Ensure we have full header (including location_id)
      const header = await stockRequestsApi.getHeader(reqHeader.id);
      setItemsHeader(header);
      const data = await stockRequestsApi.getItems(reqHeader.id);
      setItems(data);
      // Compute availability and default deliver quantities
      const entries = await Promise.all(
        (data || []).map(async (it) => {
          const bal = await stockRequestsApi.getItemBalanceByLocation(
            header.clinic_id,
            it.item?.id || it.item_id,
            header.location_id
          );
          const pending = Math.max(0, (parseFloat(it.qty) || 0) - (parseFloat(it.delivered_qty) || 0));
          const def = Math.min(pending, Math.max(0, bal));
          return { id: it.item?.id || it.item_id, bal, def };
        })
      );
      const balMap = {};
      const qtyMap = {};
      const selMap = {};
      for (const e of entries) {
        balMap[e.id] = e.bal;
        qtyMap[e.id] = e.def;
        selMap[e.id] = e.def > 0; // preselect items with available qty
      }
      setBalances(balMap);
      setDeliverQty(qtyMap);
      setSelected(selMap);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao carregar itens', description: err.message });
    } finally {
      setItemsLoading(false);
    }
  };

  const handleApprove = (id) => {
    setApproveReqId(id);
    setApproveComment('');
    setApproveOpen(true);
  };

  const doApprove = async () => {
    if (!approveReqId) return;
    try {
      const approver = user?.email || user?.user_metadata?.name || null;
      await stockRequestsApi.approve(approveReqId, approver, approveComment);
      toast({ title: 'Requisição aprovada' });
      setApproveOpen(false);
      setApproveReqId(null);
      setApproveComment('');
      await loadRequests();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao aprovar', description: err.message });
    }
  };

  const statusLabel = (s) => {
    switch (s) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovada';
      case 'fulfilled': return 'Atendida';
      case 'partially_fulfilled': return 'Parcialmente atendida';
      case 'rejected': return 'Rejeitada';
      case 'cancelled': return 'Cancelada';
      default: return s || '-';
    }
  };

  const statusClass = (s) => {
    // Tailwind utility classes per status
    switch (s) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'fulfilled': return 'bg-green-100 text-green-800';
      case 'partially_fulfilled': return 'bg-orange-100 text-orange-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const setPeriod = (days) => {
    const today = new Date();
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(today.getDate() - days);
    const fmt = (d) => d.toISOString().slice(0,10);
    setDateStart(fmt(start));
    setDateEnd(fmt(end));
  };

  const toggleItem = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const changeDeliverQty = (id, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setDeliverQty(prev => ({ ...prev, [id]: num }));
  };

  const fulfillSelected = async () => {
    if (!itemsHeader?.id) return;
    const lines = items
      .map(it => {
        const itemId = it.item?.id || it.item_id;
        if (!selected[itemId]) return null;
        const pending = Math.max(0, (parseFloat(it.qty) || 0) - (parseFloat(it.delivered_qty) || 0));
        const requestQty = Math.min(pending, Math.max(0, deliverQty[itemId] || 0));
        return requestQty > 0 ? { item_id: itemId, qty: requestQty, id: it.id } : null;
      })
      .filter(Boolean);
    if (!lines.length) { toast({ title: 'Selecione ao menos um item' }); return; }
    try {
      await stockRequestsApi.fulfillPartial(itemsHeader.clinic_id, itemsHeader.id, lines);
      toast({ title: 'Itens atendidos' });
      setItemsOpen(false);
      await loadRequests();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao atender itens', description: err.message });
    }
  };

    const handleReject = async (id) => {
      if (!confirm('Confirmar rejeição desta requisição?')) return;
      try {
        await stockRequestsApi.reject(id);
        toast({ title: 'Requisição rejeitada' });
        await loadRequests();
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erro ao rejeitar', description: err.message });
      }
    };

    const handleCancel = async (id) => {
      if (!confirm('Confirmar cancelamento desta requisição?')) return;
      try {
        await stockRequestsApi.cancel(id);
        toast({ title: 'Requisição cancelada' });
        await loadRequests();
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erro ao cancelar', description: err.message });
      }
    };

    const handleFulfill = (id) => { setFulfillReqId(id); setFulfillOpen(true); };

    const openSaida = (id) => { setSaidaReqId(id); setSaidaInitialForm({ notes: `REQ:${id}` }); setSaidaOpen(true); };

    const handleSaidaSubmit = async (form) => {
      try {
        toast({ title: 'Saída registrada' });
        setSaidaOpen(false);
        await loadRequests();
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erro ao registrar saída', description: err.message });
      }
    };

    const handleSubmit = async (form) => {
      try {
        await stockRequestsApi.create({ ...form, clinic_id: clinicId });
        toast({ title: 'Requisição criada' });
        setDialogOpen(false);
        await loadRequests();
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erro ao criar requisição', description: err.message });
      }
    };

    return (
      <PageLayout
        breadcrumbs={breadcrumbs}
        title="Requisições de Materiais"
        subtitle="Solicitações internas de materiais e insumos."
        actions={
          <div className="flex gap-2">
            <Button className="bg-blue-600 text-white flex items-center" onClick={() => setDialogOpen(true)}>
              <FilePlus className="mr-2 w-4 h-4" /> Nova Requisição
            </Button>
            <Button variant="outline" onClick={() => exportCSV()}>Exportar CSV</Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3 items-end mt-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Status</label>
            <select className="border rounded px-3 py-2 text-sm" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovada</option>
              <option value="fulfilled">Atendida</option>
              <option value="partially_fulfilled">Parcialmente atendida</option>
              <option value="rejected">Rejeitada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div className="min-w-[220px]">
            <label className="block text-xs text-gray-600 mb-1">Local</label>
            <LocationSelect
              clinicId={clinicId}
              value={locationFilter.name}
              locationId={locationFilter.id}
              onChange={(d)=>setLocationFilter({ id: d.locationId, name: d.location })}
              hideLabel
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">De</label>
            <input type="date" className="border rounded px-3 py-2 text-sm" value={dateStart} onChange={(e)=>setDateStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Até</label>
            <input type="date" className="border rounded px-3 py-2 text-sm" value={dateEnd} onChange={(e)=>setDateEnd(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={()=>setPeriod(0)}>Hoje</Button>
            <Button size="sm" variant="outline" onClick={()=>setPeriod(7)}>Últimos 7 dias</Button>
            <Button size="sm" variant="outline" onClick={()=>setPeriod(30)}>Últimos 30 dias</Button>
          </div>
          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs text-gray-600 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Solicitante ou observação"
              className="border rounded px-3 py-2 text-sm w-full"
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={()=>{ setStatusFilter(""); setDateStart(""); setDateEnd(""); setLocationFilter({id: "", name: ""}); setSearch(""); }}>Limpar</Button>
        </div>

        <Card className="p-6 mt-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_,i)=> (
                <div key={i} className="grid grid-cols-7 gap-3 items-center">
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-6 rounded" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-8" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-gray-600">Nenhuma requisição registrada ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left">Data</th>
                    <th className="px-4 py-2 text-left">Solicitante</th>
                    <th className="px-4 py-2 text-left">Local</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Resumo</th>
                    <th className="px-4 py-2 text-left">Finalidade</th>
                    <th className="px-4 py-2 text-left">Observações</th>
                    <th className="px-4 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter(r => !statusFilter || r.status === statusFilter)
                    .filter(r => !locationFilter.id || r.location_id === locationFilter.id)
                    .filter(r => !dateStart || r.request_date >= dateStart)
                    .filter(r => !dateEnd || r.request_date <= dateEnd)
                    .filter(r => !search || (r.requested_by?.toLowerCase().includes(search.toLowerCase()) || r.notes?.toLowerCase().includes(search.toLowerCase())))
                    .map((r) => {
                      const s = summaries[r.id] || { total: 0, delivered: 0 };
                      const pending = Math.max(0, (s.total || 0) - (s.delivered || 0));
                      const primaryLabel = r.status === 'pending' ? 'Aprovar' : (r.status === 'approved' ? 'Atender' : 'Ações');
                      const primaryDisabled = !(r.status === 'pending' || r.status === 'approved');
                      return (
                        <tr key={r.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">{r.request_date ? format(new Date(r.request_date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</td>
                          <td className="px-4 py-3">{r.requested_by || '-'}</td>
                          <td className="px-4 py-3">{r.location?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center gap-1 text-xs text-gray-700">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="font-medium">{s.delivered || 0}</span>
                                <span className="text-gray-500">/ {s.total || 0}</span>
                              </span>
                              {pending > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-700">
                                  <Hourglass className="w-4 h-4" />
                                  <span className="font-medium">{pending}</span>
                                  <span className="text-gray-500">pendente</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {r.purpose === 'paciente' ? 'Atendimento a paciente' :
                             r.purpose === 'reposicao_sala' ? 'Reposição de sala' :
                             r.purpose === 'consumo_admin' ? 'Consumo administrativo' : (r.purpose || '-')}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{r.notes || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button size="sm" disabled={primaryDisabled} onClick={()=>{
                                if (r.status === 'pending') handleApprove(r.id);
                                else if (r.status === 'approved') handleFulfill(r.id);
                              }}>{primaryLabel}</Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline" className="px-2">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={()=>openItems(r)}>Itens</DropdownMenuItem>
                                  {r.status === 'pending' && (
                                    <>
                                      <DropdownMenuItem onClick={()=>handleApprove(r.id)}>Aprovar</DropdownMenuItem>
                                      <DropdownMenuItem className="text-red-600" onClick={()=>handleReject(r.id)}>Rejeitar</DropdownMenuItem>
                                    </>
                                  )}
                                  {(r.status === 'pending' || r.status === 'approved') && (
                                    <DropdownMenuItem onClick={()=>handleCancel(r.id)}>Cancelar</DropdownMenuItem>
                                  )}
                                  {r.status === 'approved' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={()=>handleFulfill(r.id)}>Atender</DropdownMenuItem>
                                      <DropdownMenuItem onClick={()=>openSaida(r.id)}>Saída</DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <StockRequestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          clinicId={clinicId}
        />

        <Dialog open={itemsOpen} onOpenChange={(v)=>{ setItemsOpen(v); if(!v){ setItems([]); setItemsHeader(null);} }}>
          <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
            <DialogHeader>
              <DialogTitle>Itens da Requisição</DialogTitle>
            </DialogHeader>
            {itemsHeader && (
              <div className="text-sm text-gray-700 mb-3">
                <div><span className="text-gray-500">Data:</span> {itemsHeader.request_date ? format(new Date(itemsHeader.request_date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</div>
                <div><span className="text-gray-500">Local:</span> {itemsHeader.location?.name || '-'}</div>
                <div><span className="text-gray-500">Solicitante:</span> {itemsHeader.requested_by || '-'}</div>
              </div>
            )}
            {itemsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_,i)=> <Skeleton key={i} className="h-4" />)}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left">Selecionar</th>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Solicitado</th>
                    <th className="px-3 py-2 text-right">Entregue</th>
                    <th className="px-3 py-2 text-right">Pendente</th>
                    <th className="px-3 py-2 text-right">Disponível</th>
                    <th className="px-3 py-2 text-right">Qtd a entregar</th>
                    <th className="px-3 py-2 text-left">Categoria</th>
                    <th className="px-3 py-2 text-left">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!!selected[it.item?.id || it.item_id]}
                          onChange={()=>toggleItem(it.item?.id || it.item_id)}
                        />
                      </td>
                      <td className="px-3 py-2">{it.item?.name || '-'}</td>
                      <td className="px-3 py-2 text-right">{it.qty}</td>
                      <td className="px-3 py-2 text-right">{it.delivered_qty || 0}</td>
                      <td className="px-3 py-2 text-right">{Math.max(0, (parseFloat(it.qty) || 0) - (parseFloat(it.delivered_qty) || 0))}</td>
                      <td className="px-3 py-2 text-right">{balances[it.item?.id || it.item_id] ?? '-'}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="border rounded px-2 py-1 w-24 text-right"
                          value={deliverQty[it.item?.id || it.item_id] ?? 0}
                          onChange={(e)=>changeDeliverQty(it.item?.id || it.item_id, e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">{it.item?.category?.name || '-'}</td>
                      <td className="px-3 py-2">{it.item_note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={()=>setItemsOpen(false)}>Fechar</Button>
              <Button onClick={fulfillSelected}>Atender selecionados</Button>
            </div>
          </DialogContent>
        </Dialog>
        

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
          <DialogHeader>
            <DialogTitle>Aprovar Requisição</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="block text-sm text-gray-700">Aprovador</label>
            <input className="border rounded px-3 py-2 text-sm w-full" value={user?.email || user?.user_metadata?.name || ''} disabled />
          </div>
          <div className="space-y-2 mt-2">
            <label className="block text-sm text-gray-700">Comentário do aprovador</label>
            <textarea className="border rounded px-3 py-2 text-sm w-full" rows={3} value={approveComment} onChange={(e)=>setApproveComment(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={()=>setApproveOpen(false)}>Cancelar</Button>
            <Button onClick={doApprove}>Aprovar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <StockRequestFulfillDialog
        open={fulfillOpen}
        onOpenChange={setFulfillOpen}
        clinicId={clinicId}
        requestId={fulfillReqId}
        onCompleted={async ()=>{ toast({ title: 'Requisição atendida' }); await loadRequests(); }}
      />

      <StockMovementDialog
        open={saidaOpen}
        onOpenChange={setSaidaOpen}
        onSubmit={handleSaidaSubmit}
        clinicId={clinicId}
        type="saida"
        initialForm={saidaInitialForm}
      />
    </PageLayout>
  );
}

// Helper: Export visible rows to CSV
function exportCSV() {
  try {
    const table = document.querySelector('table');
    if (!table) return;
    // Collect data from the current table rows for simplicity
    const headers = ['Data','Solicitante','Local','Status','Entregue/Total','Pendentes','Finalidade','Observações'];
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const data = rows.map(tr => {
      const tds = tr.querySelectorAll('td');
      const resumo = tds[4]?.innerText || '';
      let deliveredTotal = '';
      let pendentes = '';
      if (resumo.includes('entregue')) {
        const parts = resumo.split('entregue')[0].trim();
        deliveredTotal = parts;
        const pend = resumo.split('entregue')[1]?.match(/(\d+) pendente/);
        pendentes = pend ? pend[1] : '0';
      }
      return [
        tds[0]?.innerText || '', // Data
        tds[1]?.innerText || '', // Solicitante
        tds[2]?.innerText || '', // Local
        tds[3]?.innerText.replace(/\n.*/,'') || '', // Status (strip tooltip content if any)
        deliveredTotal,
        pendentes,
        tds[5]?.innerText || '', // Finalidade
        tds[6]?.innerText || '', // Observações
      ];
    });
    const csv = [headers, ...data]
      .map(row => row.map(cell => '"' + (cell || '').replace(/"/g,'""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requisicoes_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert('Falha ao exportar CSV');
  }
}

