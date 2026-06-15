import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { applyDefaultAccountPlan, resetAccountPlan } from '@/lib/accountPlanSeed';
import { NONE, noneOr } from '@/lib/selectUtils';
import {
  Download,
  Edit,
  FileDown,
  FileSpreadsheet,
  Filter,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'custo', label: 'Custo' },
  { value: 'deducao', label: 'Deducao' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'ajuste', label: 'Ajuste' },
];

const TEMPLATE_ROWS = [
  ['Receitas', 'receita', ''],
  ['Consultas particulares', 'receita', 'Receitas'],
  ['Convenios', 'receita', 'Receitas'],
  ['Despesas operacionais', 'despesa', ''],
  ['Aluguel', 'despesa', 'Despesas operacionais'],
  ['Folha medica', 'despesa', 'Despesas operacionais'],
  ['Materiais e medicamentos', 'custo', ''],
  ['Taxas de cartao', 'deducao', ''],
];

const normalize = (value) => String(value || '').trim().toLowerCase();

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const toCsv = (rows) =>
  rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');

const downloadText = (filename, content, type = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const AccountDialog = ({ open, onOpenChange, account, onSave, parentOptions }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('receita');
  const [parentId, setParentId] = useState(NONE);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(account?.name || '');
    setType(account?.type || 'receita');
    setParentId(account?.parent_id || NONE);
  }, [account, open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), type, parent_id: noneOr(parentId) });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--compact">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Conta Pai</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhuma</SelectItem>
                {parentOptions.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function PlanoContas() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [usageInfo, setUsageInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, account: null });
  const [inlineEdits, setInlineEdits] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [usageFilter, setUsageFilter] = useState('all');

  const loadAccounts = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_plans')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar plano de contas', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [clinicId, toast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('ap_bills')
          .select('category_id, due_date')
          .eq('clinic_id', clinicId)
          .not('category_id', 'is', null);
        if (error) throw error;

        const map = {};
        for (const row of data || []) {
          if (!row.category_id) continue;
          if (!map[row.category_id]) map[row.category_id] = { count: 0, lastDue: null };
          map[row.category_id].count += 1;
          const dueDate = row.due_date ? new Date(row.due_date) : null;
          if (dueDate && (!map[row.category_id].lastDue || dueDate > map[row.category_id].lastDue)) {
            map[row.category_id].lastDue = dueDate;
          }
        }
        setUsageInfo(map);
      } catch (error) {
        console.warn('load ap_bills usage failed:', error?.message || error);
      }
    })();
  }, [clinicId, accounts.length]);

  const accountsById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const parentOptions = useMemo(() => accounts.filter((account) => !account.parent_id), [accounts]);

  const enrichedAccounts = useMemo(
    () =>
      accounts.map((account) => ({
        ...account,
        level: account.parent_id ? 2 : 1,
        parentName: accountsById.get(account.parent_id)?.name || '',
        usageCount: usageInfo[account.id]?.count || 0,
        lastDue: usageInfo[account.id]?.lastDue || null,
      })),
    [accounts, accountsById, usageInfo],
  );

  const filteredAccounts = useMemo(() => {
    const query = normalize(searchTerm);
    return enrichedAccounts.filter((account) => {
      const matchesSearch =
        !query ||
        normalize(account.name).includes(query) ||
        normalize(account.type).includes(query) ||
        normalize(account.parentName).includes(query);
      const matchesType = typeFilter === 'all' || normalize(account.type) === typeFilter;
      const matchesLevel =
        levelFilter === 'all' ||
        (levelFilter === 'root' && !account.parent_id) ||
        (levelFilter === 'child' && !!account.parent_id);
      const matchesUsage =
        usageFilter === 'all' ||
        (usageFilter === 'used' && account.usageCount > 0) ||
        (usageFilter === 'unused' && account.usageCount === 0);
      return matchesSearch && matchesType && matchesLevel && matchesUsage;
    });
  }, [enrichedAccounts, levelFilter, searchTerm, typeFilter, usageFilter]);

  const structuredAccounts = useMemo(() => {
    const allowedIds = new Set(filteredAccounts.map((account) => account.id));
    const map = new Map(accounts.map((account) => [account.id, { ...account, children: [] }]));
    const roots = [];
    for (const account of map.values()) {
      if (account.parent_id && map.has(account.parent_id)) {
        map.get(account.parent_id).children.push(account);
      } else {
        roots.push(account);
      }
    }
    const filterTree = (items) =>
      items
        .map((account) => ({ ...account, children: filterTree(account.children || []) }))
        .filter((account) => allowedIds.has(account.id) || account.children.length > 0);
    return filterTree(roots);
  }, [accounts, filteredAccounts]);

  const report = useMemo(() => {
    const roots = accounts.filter((account) => !account.parent_id).length;
    const used = enrichedAccounts.filter((account) => account.usageCount > 0).length;
    return { total: accounts.length, roots, children: accounts.length - roots, used, unused: accounts.length - used };
  }, [accounts, enrichedAccounts]);

  const csvRows = useMemo(
    () => [
      ['nome', 'tipo', 'conta_pai', 'nivel', 'usos', 'ultimo_vencimento'],
      ...filteredAccounts.map((account) => [
        account.name,
        account.type,
        account.parentName,
        account.level,
        account.usageCount,
        account.lastDue ? account.lastDue.toLocaleDateString('pt-BR') : '',
      ]),
    ],
    [filteredAccounts],
  );

  const handleSave = async (payload) => {
    try {
      if (!payload.name) throw new Error('Informe o nome da conta.');
      const data = { ...payload, clinic_id: clinicId, parent_id: payload.parent_id || null };
      const { error } = dialog.account?.id
        ? await supabase.from('account_plans').update(data).eq('id', dialog.account.id)
        : await supabase.from('account_plans').insert(data);
      if (error) throw error;
      toast({ title: 'Salvo com sucesso!' });
      await loadAccounts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (accounts.some((account) => account.parent_id === id)) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: 'Não é possível excluir uma conta que possui subcontas.' });
      return;
    }
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      const { error } = await supabase.from('account_plans').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Excluído com sucesso!' });
      await loadAccounts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    }
  };

  const startInlineEdit = (account) => {
    setInlineEdits((prev) => ({
      ...prev,
      [account.id]: { name: account.name || '', type: account.type || 'receita', parent_id: account.parent_id || NONE },
    }));
  };

  const cancelInlineEdit = (id) => {
    setInlineEdits((prev) => {
      const { [id]: _discarded, ...rest } = prev;
      return rest;
    });
  };

  const saveInlineEdit = async (account) => {
    const payload = inlineEdits[account.id];
    if (!payload) return;
    const parentId = noneOr(payload.parent_id);
    if (parentId && accounts.some((item) => item.parent_id === account.id)) {
      toast({ variant: 'destructive', title: 'Estrutura inválida', description: 'Uma conta com subcontas não pode virar filha.' });
      return;
    }
    if (parentId && accounts.some((item) => item.id === parentId && !!item.parent_id)) {
      toast({ variant: 'destructive', title: 'Conta pai inválida', description: 'Selecione apenas contas de nível 1 como pai.' });
      return;
    }
    const parent = accounts.find((item) => item.id === parentId);
    try {
      const { error } = await supabase
        .from('account_plans')
        .update({ name: payload.name.trim(), type: parent?.type || payload.type, parent_id: parentId || null })
        .eq('id', account.id);
      if (error) throw error;
      cancelInlineEdit(account.id);
      await loadAccounts();
      toast({ title: 'Estrutura atualizada!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    }
  };

  const handleExportCsv = () => downloadText('plano-de-contas-relatorio.csv', toCsv(csvRows));
  const handleDownloadTemplate = () => downloadText('template-plano-de-contas.csv', toCsv([['nome', 'tipo', 'conta_pai'], ...TEMPLATE_ROWS]));

  const handlePrint = () => {
    const rows = csvRows.slice(1);
    const bodyRows = rows
      .map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2] || '-')}</td><td>${escapeHtml(row[3])}</td><td>${escapeHtml(row[4])}</td><td>${escapeHtml(row[5] || '-')}</td></tr>`)
      .join('');
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      toast({ variant: 'destructive', title: 'Impressão bloqueada', description: 'Permita pop-ups para imprimir o relatório.' });
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><title>Plano de Contas</title><style>body{font-family:Arial,sans-serif;color:#111827;padding:24px}h1{margin:0;font-size:24px}.meta{color:#4b5563;margin:6px 0 20px}.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px}.card{border:1px solid #d1d5db;border-radius:8px;padding:10px}.card strong{display:block;font-size:18px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #d1d5db;padding:8px;text-align:left}th{background:#f3f4f6}</style></head><body><h1>Plano de Contas</h1><div class="meta">Relatorio gerado em ${new Date().toLocaleString('pt-BR')} - ${rows.length} conta(s) filtrada(s)</div><div class="cards"><div class="card"><span>Total</span><strong>${report.total}</strong></div><div class="card"><span>Nivel 1</span><strong>${report.roots}</strong></div><div class="card"><span>Subcontas</span><strong>${report.children}</strong></div><div class="card"><span>Em uso</span><strong>${report.used}</strong></div><div class="card"><span>Sem uso</span><strong>${report.unused}</strong></div></div><table><thead><tr><th>Conta</th><th>Tipo</th><th>Conta pai</th><th>Nivel</th><th>Usos</th><th>Ultimo vencimento</th></tr></thead><tbody>${bodyRows || '<tr><td colspan="6">Nenhuma conta encontrada</td></tr>'}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleApplyTemplate = async () => {
    try {
      await applyDefaultAccountPlan(clinicId);
      await loadAccounts();
      toast({ title: 'Template aplicado com sucesso!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao aplicar template', description: error.message });
    }
  };

  const handleResetTemplate = async () => {
    if (!window.confirm('Isso recria o plano de contas padrão. Deseja continuar?')) return;
    try {
      await resetAccountPlan(clinicId);
      await loadAccounts();
      toast({ title: 'Plano de contas recriado!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao recriar plano', description: error.message });
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.split(';').map((cell) => cell.replace(/^"|"$/g, '').trim()))
        .filter((row) => row.some(Boolean));
      const dataRows = normalize(rows[0]?.[0]) === 'nome' ? rows.slice(1) : rows;
      const knownParents = new Map(accounts.map((account) => [normalize(account.name), account.id]));
      let imported = 0;
      for (const [name, type = 'despesa', parentName = ''] of dataRows) {
        if (!name) continue;
        const parentId = parentName ? knownParents.get(normalize(parentName)) || null : null;
        const { data, error } = await supabase
          .from('account_plans')
          .insert({ clinic_id: clinicId, name, type: normalize(type) || 'despesa', parent_id: parentId })
          .select('id, name')
          .single();
        if (error) throw error;
        knownParents.set(normalize(data.name), data.id);
        imported += 1;
      }
      await loadAccounts();
      toast({ title: 'Importação concluída', description: `${imported} conta(s) importada(s).` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao importar', description: error.message });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setLevelFilter('all');
    setUsageFilter('all');
  };

  const AccountRow = ({ account, level = 0 }) => {
    const usage = usageInfo[account.id];
    const usageText = `${usage?.count || 0} conta(s) - ultimo: ${usage?.lastDue ? usage.lastDue.toLocaleDateString('pt-BR') : '-'}`;
    const editing = editMode && inlineEdits[account.id];

    return (
      <>
        <tr className="border-b hover:bg-muted/40">
          <td className="p-3" style={{ paddingLeft: `${0.75 + level * 1.5}rem` }}>
            {editing ? (
              <Input className="h-8 text-sm" value={inlineEdits[account.id].name} onChange={(event) => setInlineEdits((prev) => ({ ...prev, [account.id]: { ...prev[account.id], name: event.target.value } }))} />
            ) : (
              <span className="font-medium text-gray-900">{account.name}</span>
            )}
          </td>
          <td className="p-3">
            {editing ? (
              <Select value={inlineEdits[account.id].type} onValueChange={(value) => setInlineEdits((prev) => ({ ...prev, [account.id]: { ...prev[account.id], type: value } }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{ACCOUNT_TYPES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <span className="capitalize">{account.type || '-'}</span>
            )}
          </td>
          <td className="p-3">
            {editing ? (
              <Select value={inlineEdits[account.id].parent_id ?? NONE} onValueChange={(value) => setInlineEdits((prev) => ({ ...prev, [account.id]: { ...prev[account.id], parent_id: value } }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhuma</SelectItem>
                  {parentOptions.filter((parent) => parent.id !== account.id).map((parent) => <SelectItem key={parent.id} value={parent.id}>{parent.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              accountsById.get(account.parent_id)?.name || '-'
            )}
          </td>
          <td className="p-3 whitespace-nowrap">{usageText}</td>
          <td className="p-3">
            <div className="flex justify-end gap-1">
              {editing ? (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveInlineEdit(account)}><Save className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancelInlineEdit(account.id)}><X className="w-4 h-4" /></Button>
                </>
              ) : (
                <>
                  {editMode && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startInlineEdit(account)}><Edit className="w-4 h-4" /></Button>}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, account })}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(account.id)}><Trash2 className="w-4 h-4" /></Button>
                </>
              )}
            </div>
          </td>
        </tr>
        {viewMode === 'tree' && (account.children || []).map((child) => <AccountRow key={child.id} account={child} level={level + 1} />)}
      </>
    );
  };

  const tableRows = viewMode === 'tree' ? structuredAccounts : filteredAccounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plano de Contas</h1>
          <p className="text-gray-600 mt-1">Gerenciar a estrutura contábil central da clínica</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportFile} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}><FileSpreadsheet className="w-4 h-4 mr-2" />Importar Excel</Button>
          <Button variant="outline" onClick={handleDownloadTemplate}><Download className="w-4 h-4 mr-2" />Template</Button>
          <Button onClick={() => setDialog({ open: true, account: null })}><Plus className="w-4 h-4 mr-2" />Nova Conta</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Total', report.total],
          ['Nível 1', report.roots],
          ['Subcontas', report.children],
          ['Em uso', report.used],
          ['Sem uso', report.unused],
        ].map(([label, value]) => <div key={label} className="rounded-lg border bg-white p-4"><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-semibold text-gray-900">{value}</p></div>)}
      </div>

      <div className="space-y-4 rounded-lg border bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Filter className="w-4 h-4" />Filtros e relatórios</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar conta, tipo ou pai" className="pl-9" /></div>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem>{ACCOUNT_TYPES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}><SelectTrigger><SelectValue placeholder="Nível" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os níveis</SelectItem><SelectItem value="root">Somente nível 1</SelectItem><SelectItem value="child">Somente subcontas</SelectItem></SelectContent></Select>
          <Select value={usageFilter} onValueChange={setUsageFilter}><SelectTrigger><SelectValue placeholder="Uso" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="used">Em uso</SelectItem><SelectItem value="unused">Sem uso</SelectItem></SelectContent></Select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={viewMode === 'tree' ? 'secondary' : 'outline'} onClick={() => setViewMode('tree')}>Visualização em Árvore</Button>
            <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} onClick={() => setViewMode('table')}>Visualização em Tabela</Button>
            <Button variant={editMode ? 'secondary' : 'outline'} onClick={() => setEditMode((value) => !value)}><Edit className="w-4 h-4 mr-2" />Edição rápida</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={filteredAccounts.length === 0}><FileDown className="w-4 h-4 mr-2" />Relatório CSV</Button>
            <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
            <Button variant="outline" onClick={handleApplyTemplate}><Wand2 className="w-4 h-4 mr-2" />Aplicar padrão</Button>
            <Button variant="outline" onClick={handleResetTemplate}><RefreshCw className="w-4 h-4 mr-2" />Recriar</Button>
            <Button variant="ghost" onClick={clearFilters}><X className="w-4 h-4 mr-2" />Limpar</Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left font-medium">Conta</th><th className="p-3 text-left font-medium">Tipo</th><th className="p-3 text-left font-medium">Conta pai</th><th className="p-3 text-left font-medium">Uso</th><th className="p-3 text-right font-medium">Ações</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-10 text-center text-gray-500">Carregando plano de contas...</td></tr>
            ) : tableRows.length === 0 ? (
              <tr><td colSpan="5" className="p-10 text-center text-gray-500">Nenhuma conta encontrada</td></tr>
            ) : viewMode === 'tree' ? (
              structuredAccounts.map((account) => <AccountRow key={account.id} account={account} />)
            ) : (
              filteredAccounts.map((account) => <AccountRow key={account.id} account={account} />)
            )}
          </tbody>
        </table>
      </div>

      <AccountDialog open={dialog.open} onOpenChange={(open) => setDialog({ open, account: open ? dialog.account : null })} account={dialog.account} onSave={handleSave} parentOptions={parentOptions} />
    </div>
  );
}