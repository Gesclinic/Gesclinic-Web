import React, { useEffect, useMemo, useState, useCallback } from "react";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Trash, X, Plus, TrendingUp, TrendingDown, DollarSign, Tag, Building2, Download, Filter, ChevronDown } from "lucide-react";
import { useClinicContext } from "@/contexts/useClinicContext";
import { listCashFlow, cashflowSummary, listAccountPlans } from "@/lib/financeApi";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { listCostCenters, listFinanceAccounts, createCashFlowManual, transferCashFlow } from "@/lib/financeApi";
import { useDataCache, CacheManager } from "@/hooks/useDataCache";

export default function FluxoCaixa() {
  const breadcrumbs = useBreadcrumbs([
    { label: "Financeiro", path: "/clinica/financeiro" },
    { label: "Fluxo de Caixa" }
  ]);

  const { clinicId } = useClinicContext();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ entradas: 0, saidas: 0, resultado_liquido: 0, saldo_final: 0 });
  const [filters, setFilters] = useState({
    start: "",
    end: "",
    search: "",
    categoryId: "",
    costCenterId: "",
    accountId: "",
    type: "",
  });
  const [categories, setCategories] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [formManual, setFormManual] = useState({ date: "", description: "", type: "entrada", amount: "", category_id: "", cost_center_id: "", account_id: "" });
  const [formTransfer, setFormTransfer] = useState({ date: "", description: "", amount: "", account_from: "", account_to: "" });
  const { toast } = useToast();
  const [initialBalances, setInitialBalances] = useState({});

  // 💾 Cache para metadata (categorias, centros de custo, contas)
  const { data: cachedMetadata, loading: metadataLoading, refresh: refreshMetadata } = useDataCache({
    key: `fluxo_caixa_metadata_${clinicId}`,
    fetcher: async () => {
      const [cats, ccs, accs] = await Promise.all([
        listAccountPlans(clinicId).catch(() => []),
        listCostCenters(clinicId).catch(() => []),
        listFinanceAccounts(clinicId).catch(() => []),
      ]);
      return {
        categories: (cats || []).filter(c => !!c.parent_id),
        costCenters: ccs || [],
        accounts: accs || [],
      };
    },
    ttl: 15 * 60 * 1000, // 15 minutos (metadata de financeiro muda raramente)
    enabled: !!clinicId,
  });

  // Sincronizar metadata em cache
  useEffect(() => {
    if (cachedMetadata) {
      setCategories(cachedMetadata.categories);
      setCostCenters(cachedMetadata.costCenters);
      setAccounts(cachedMetadata.accounts);
    }
  }, [cachedMetadata]);

  // Load/save initial balances from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cashflow_initial_balances');
      if (raw) setInitialBalances(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('cashflow_initial_balances', JSON.stringify(initialBalances)); } catch {}
  }, [initialBalances]);

  // 💾 Cache para dados de cashflow (com filtros)
  const cacheKeyFluxo = `fluxo_caixa_data_${clinicId}_${filters.start}_${filters.end}_${filters.search}_${filters.categoryId}_${filters.costCenterId}_${filters.accountId}_${filters.type}`;
  const { data: cachedFluxoData, loading: fluxoLoading, refresh: refreshFluxo } = useDataCache({
    key: cacheKeyFluxo,
    fetcher: async () => {
      const startISO = filters.start || null;
      const endISO = filters.end || null;
      const [data, sum] = await Promise.all([
        listCashFlow({
          clinicId,
          start: startISO,
          end: endISO,
          search: filters.search || null,
          categoryId: filters.categoryId || null,
          costCenterId: filters.costCenterId || null,
          accountId: filters.accountId || null,
          type: filters.type || null,
          orderBy: 'date',
          orderDir: 'desc',
        }).catch(() => []),
        cashflowSummary(clinicId, startISO, endISO).catch(() => ({})),
      ]);
      return { rows: data, summary: sum };
    },
    ttl: 3 * 60 * 1000, // 3 minutos (dados de fluxo mudam frequentemente)
    enabled: !!clinicId,
  });

  // Sincronizar dados de fluxo em cache
  useEffect(() => {
    if (cachedFluxoData) {
      setRows(cachedFluxoData.rows || []);
      setSummary(cachedFluxoData.summary || { entradas: 0, saidas: 0, resultado_liquido: 0, saldo_final: 0 });
    }
  }, [cachedFluxoData]);

  const onExport = () => {
    const header = ['Data','Descrição','Categoria','Centro de Custo','Conta','Tipo','Valor'];
    const lines = rows.map(r => [
      r.date,
      (r.description || '').replace(/\n/g,' '),
      r.category_id || '',
      r.cost_center_id || '',
      r.account_id || '',
      r.type,
      Number(r.amount || 0).toFixed(2).replace('.',','),
    ]);
    const csv = [header, ...lines].map(l => l.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxo_caixa_${filters.start || 'inicio'}_${filters.end || 'fim'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveManual = async () => {
    try {
      await createCashFlowManual(clinicId, {
        date: formManual.date || new Date().toISOString().slice(0,10),
        description: formManual.description,
        type: formManual.type,
        amount: Number(formManual.amount || 0),
        category_id: formManual.category_id || null,
        cost_center_id: formManual.cost_center_id || null,
        account_id: formManual.account_id || null,
      });
      setShowNew(false);
      setFormManual({ date: "", description: "", type: "entrada", amount: "", category_id: "", cost_center_id: "", account_id: "" });
      
      // Invalidar cache e refrescar dados
      CacheManager.invalidate(cacheKeyFluxo);
      refreshMetadata();
      refreshFluxo();
      
      toast({ title: "Lançamento criado", description: "Fluxo de Caixa atualizado." });
    } catch (e) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    }
  };

  const saveTransfer = async () => {
    try {
      await transferCashFlow({
        clinicId,
        date: formTransfer.date || new Date().toISOString().slice(0,10),
        description: formTransfer.description,
        amount: Number(formTransfer.amount || 0),
        accountFrom: formTransfer.account_from || null,
        accountTo: formTransfer.account_to || null,
      });
      setShowTransfer(false);
      setFormTransfer({ date: "", description: "", amount: "", account_from: "", account_to: "" });
      
      // Invalidar cache e refrescar dados
      CacheManager.invalidate(cacheKeyFluxo);
      refreshMetadata();
      refreshFluxo();
      
      toast({ title: "Transferência registrada", description: "Entrada e saída vinculadas criadas." });
    } catch (e) {
      toast({ title: "Erro na transferência", description: e.message, variant: "destructive" });
    }
  };

  const deleteRow = async (row) => {
    if (row.origin !== 'manual' || row.is_reconciled) {
      toast({ title: "Ação não permitida", description: "Só é possível excluir lançamentos manuais não conciliados.", variant: "destructive" });
      return;
    }
    const ok = window.confirm('Excluir este lançamento?');
    if (!ok) return;
    try {
      const { deleteCashFlowManual } = await import('@/lib/financeApi');
      await deleteCashFlowManual(row.id);
      toast({ title: "Lançamento excluído" });
      await refreshFluxo();
    } catch (e) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const accountBalances = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const map = new Map();
    for (const r of rows) {
      const key = r.account_id || 'sem-conta';
      const curr = map.get(key) || 0;
      const delta = r.type === 'entrada' ? Number(r.amount || 0) : r.type === 'saida' ? -Number(r.amount || 0) : 0;
      map.set(key, curr + delta);
    }
    const items = Array.from(map.entries()).map(([id, total]) => ({ id, total }));
    // Attach names if available
    return items.map(it => ({ id: it.id, total: it.total, name: (accounts.find(a => a.id === it.id)?.name || accounts.find(a => a.id === it.id)?.bank_name || (it.id === 'sem-conta' ? 'Sem Conta' : it.id)) }));
  }, [rows, accounts]);

  // Running balance per row, considering selected account (or overall if none)
  const runningBalanceMap = useMemo(() => {
    const relevant = filters.accountId ? rows.filter(r => r.account_id === filters.accountId) : rows;
    const sorted = [...relevant].sort((a,b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
    let bal = filters.accountId ? Number(initialBalances[filters.accountId] || 0) : 0;
    const map = new Map();
    for (const r of sorted) {
      const delta = r.type === 'entrada' ? Number(r.amount || 0) : r.type === 'saida' ? -Number(r.amount || 0) : 0;
      bal += delta;
      map.set(r.id, bal);
    }
    return map;
  }, [rows, filters.accountId, initialBalances]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Fluxo de Caixa"
      subtitle="Controle completo das entradas e saídas financeiras."
    >
      <Card className="p-6 mt-4">
        <div className="grid md:grid-cols-6 gap-3 mb-6">
          <Input type="date" value={filters.start} onChange={e => setFilters(f => ({...f, start: e.target.value}))} />
          <Input type="date" value={filters.end} onChange={e => setFilters(f => ({...f, end: e.target.value}))} />
          <Select value={filters.type || "all"} onValueChange={v => setFilters(f => ({...f, type: v === "all" ? "" : v}))}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo (Todos)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.categoryId || "all"} onValueChange={v => setFilters(f => ({...f, categoryId: v === "all" ? "" : v}))}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <Input placeholder="Buscar descrição" className="pl-9" value={filters.search}
                   onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshFluxo} className="flex-1">Filtrar</Button>
            <Button variant="outline" onClick={onExport}>Exportar</Button>
          </div>
        </div>

        {/* Optional filters: Cost Center & Account */}
        <div className="grid md:grid-cols-4 gap-3 mb-4">
          {costCenters.length > 0 && (
            <Select value={filters.costCenterId || "all"} onValueChange={v => setFilters(f => ({...f, costCenterId: v === "all" ? "" : v}))}>
              <SelectTrigger>
                <SelectValue placeholder="Centro de Custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {costCenters.map(cc => (
                  <SelectItem key={cc.id} value={cc.id}>{cc.name || cc.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {accounts.length > 0 && (
            <Select value={filters.accountId || "all"} onValueChange={v => setFilters(f => ({...f, accountId: v === "all" ? "" : v}))}>
              <SelectTrigger>
                <SelectValue placeholder="Conta (Banco/Caixa)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {accounts.map(ac => (
                  <SelectItem key={ac.id} value={ac.id}>{ac.name || ac.bank_name || ac.alias}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Saldo inicial por conta (config rápido) */}
          {accounts.length > 0 && (
            <div className="flex items-end gap-2 md:col-span-2">
              <div className="flex-1">
                <Label>Saldo inicial ({filters.accountId ? (accounts.find(a=>a.id===filters.accountId)?.name || 'Conta') : 'selecione a conta'})</Label>
                <Input type="number" step="0.01" value={filters.accountId ? (initialBalances[filters.accountId] ?? '') : ''}
                       onChange={e => filters.accountId && setInitialBalances(b => ({...b, [filters.accountId]: Number(e.target.value)}))}
                       placeholder={filters.accountId ? '0,00' : 'Selecione uma conta acima'} />
              </div>
              <Button variant="outline" onClick={() => {
                if (!filters.accountId) return;
                setInitialBalances(b => ({...b, [filters.accountId]: Number(b[filters.accountId] || 0)}));
                toast({ title: 'Saldo inicial salvo', description: 'Usado para o saldo diário da conta filtrada.' });
              }}>Salvar saldo</Button>
            </div>
          )}
          <div className="flex gap-2 justify-end md:col-span-2">
            <Dialog open={showNew} onOpenChange={setShowNew}>
              <DialogTrigger asChild>
                <Button variant="default">Novo Lançamento</Button>
              </DialogTrigger>
              <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg sticky top-0 z-20 -mx-6 -mt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8" />
                      <div>
                        <h2 className="text-lg font-bold">Novo Lançamento Manual</h2>
                        <p className="text-blue-100 text-sm">Registre uma entrada ou saída de caixa</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNew(false)}
                      className="text-white hover:bg-blue-700 h-8 w-8 p-0 flex-shrink-0"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* CONTENT */}
                <form onSubmit={(e) => { e.preventDefault(); saveManual(); }} className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5">
                  
                  {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <Plus className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Informações Básicas</h3>
                        <p className="text-sm text-gray-600">Data e tipo de movimentação</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Data *</Label>
                        <Input 
                          type="date" 
                          value={formManual.date} 
                          onChange={e=>setFormManual(s=>({...s, date:e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Tipo de Movimentação *</Label>
                        <Select value={formManual.type} onValueChange={v=>setFormManual(s=>({...s, type:v}))}>
                          <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entrada">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                Entrada
                              </div>
                            </SelectItem>
                            <SelectItem value="saida">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                Saída
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 2: DESCRIÇÃO E VALOR */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Valores</h3>
                        <p className="text-sm text-gray-600">Descrição e valor da movimentação</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Descrição *</Label>
                      <Input 
                        value={formManual.description} 
                        onChange={e=>setFormManual(s=>({...s, description:e.target.value}))}
                        placeholder="Ex: Pagamento fornecedor, Taxa bancária, Recebimento cliente"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Valor *</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={formManual.amount} 
                        onChange={e=>setFormManual(s=>({...s, amount:e.target.value}))}
                        placeholder="0,00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-lg font-semibold"
                        required
                      />
                    </div>
                  </div>

                  {/* SEÇÃO 3: CATEGORIA E CENTRO DE CUSTO */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <Tag className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Classificação</h3>
                        <p className="text-sm text-gray-600">Categoria e centro de custo (opcional)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Categoria</Label>
                        <Select value={formManual.category_id || "none"} onValueChange={v=>setFormManual(s=>({...s, category_id: v === "none" ? "" : v}))}>
                          <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {categories.map(c=> (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {costCenters.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Centro de Custo</Label>
                          <Select value={formManual.cost_center_id || "none"} onValueChange={v=>setFormManual(s=>({...s, cost_center_id: v === "none" ? "" : v}))}>
                            <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {costCenters.map(cc=> (
                                <SelectItem key={cc.id} value={cc.id}>{cc.name || cc.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {accounts.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Conta Bancária</Label>
                          <Select value={formManual.account_id || "none"} onValueChange={v=>setFormManual(s=>({...s, account_id: v === "none" ? "" : v}))}>
                            <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {accounts.map(ac=> (
                                <SelectItem key={ac.id} value={ac.id}>{ac.name || ac.bank_name || ac.alias}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </form>

                {/* FOOTER */}
                <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg -mx-6 -mb-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowNew(false)}
                    className="border-gray-300 hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    onClick={saveManual}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Salvar Lançamento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
              <DialogTrigger asChild>
                <Button variant="secondary">Transferência</Button>
              </DialogTrigger>
              <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
                {/* HEADER */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-t-lg sticky top-0 z-20 -mx-6 -mt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-8 w-8" />
                      <div>
                        <h2 className="text-lg font-bold">Transferência entre Contas</h2>
                        <p className="text-purple-100 text-sm">Transfira fundos entre as contas da clínica</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTransfer(false)}
                      className="text-white hover:bg-purple-700 h-8 w-8 p-0 flex-shrink-0"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* CONTENT */}
                <form onSubmit={(e) => { e.preventDefault(); saveTransfer(); }} className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5">
                  
                  {/* SEÇÃO 1: DATA E VALOR */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Informações da Transferência</h3>
                        <p className="text-sm text-gray-600">Data, descrição e valor</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Data *</Label>
                        <Input 
                          type="date" 
                          value={formTransfer.date} 
                          onChange={e=>setFormTransfer(s=>({...s, date:e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Valor *</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={formTransfer.amount} 
                          onChange={e=>setFormTransfer(s=>({...s, amount:e.target.value}))}
                          placeholder="0,00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-lg font-semibold"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Descrição</Label>
                      <Input 
                        value={formTransfer.description} 
                        onChange={e=>setFormTransfer(s=>({...s, description:e.target.value}))}
                        placeholder="Ex: Rebalanceamento de caixa, Operação de caixa"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  {/* SEÇÃO 2: CONTAS */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <Building2 className="h-5 w-5 text-purple-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Contas Envolvidas</h3>
                        <p className="text-sm text-gray-600">Selecione a origem e o destino</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-red-600" />
                          Conta de Origem *
                        </Label>
                        <Select value={formTransfer.account_from} onValueChange={v=>setFormTransfer(s=>({...s, account_from:v}))}>
                          <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(ac=> (
                              <SelectItem key={ac.id} value={ac.id}>{ac.name || ac.bank_name || ac.alias}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-green-600" />
                          Conta de Destino *
                        </Label>
                        <Select value={formTransfer.account_to} onValueChange={v=>setFormTransfer(s=>({...s, account_to:v}))}>
                          <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(ac=> (
                              <SelectItem key={ac.id} value={ac.id}>{ac.name || ac.bank_name || ac.alias}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {accounts.length < 2 && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">⚠️ É necessário cadastrar pelo menos 2 contas para realizar transferências.</p>
                      </div>
                    )}
                  </div>
                </form>

                {/* FOOTER */}
                <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg -mx-6 -mb-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowTransfer(false)}
                    className="border-gray-300 hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    onClick={saveTransfer}
                    disabled={accounts.length < 2}
                    className="bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Transferir Agora
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Entradas no período</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(summary.entradas || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saídas no período</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(summary.saidas || 0)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resultado líquido</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(summary.resultado_liquido || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
          <Card className={`p-4 bg-gradient-to-br ${(summary.saldo_final || 0) >= 0 ? 'from-purple-50 to-purple-100 border-purple-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo final</p>
                <p className={`text-2xl font-bold mt-1 ${(summary.saldo_final || 0) >= 0 ? 'text-purple-600' : 'text-orange-600'}`}>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(summary.saldo_final || 0)}</p>
              </div>
              <Tag className={`w-8 h-8 ${(summary.saldo_final || 0) >= 0 ? 'text-purple-400' : 'text-orange-400'}`} />
            </div>
          </Card>
        </div>

        {/* Per-account balances */}
        {accountBalances.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-2">
            {accountBalances.map(acc => (
              <Card key={acc.id} className="p-3">
                <div className="text-xs text-gray-500">Saldo da Conta</div>
                <div className="text-sm font-medium">{acc.name}</div>
                <div className={`text-lg font-bold ${acc.total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(acc.total)}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Descrição</th>
                <th className="px-4 py-2 text-left">Categoria</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2 text-right">Saldo</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-gray-500">Nenhuma movimentação encontrada.</td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="px-4 py-2">{r.date}</td>
                  <td className="px-4 py-2">{r.description}</td>
                  <td className="px-4 py-2">{r.category_id ? categories.find(c=>c.id===r.category_id)?.name || '-' : '-'}</td>
                  <td className="px-4 py-2">
                    <Badge variant={r.type==='entrada'?'default': r.type==='saida'?'destructive':'secondary'}>
                      {r.type}
                    </Badge>
                  </td>
                  <td className={"px-4 py-2 text-right font-medium " + (r.type==='entrada'?'text-green-600': r.type==='saida'?'text-red-600':'text-blue-600')}>
                    {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(r.amount || 0)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {runningBalanceMap.has(r.id) ? (
                      <span className="font-semibold">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(runningBalanceMap.get(r.id))}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {(r.origin === 'manual' && !r.is_reconciled) ? (
                      <Button variant="ghost" size="sm" onClick={() => deleteRow(r)} title="Excluir">
                        <Trash className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </Card>
    </PageLayout>
  );
}

