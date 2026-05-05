import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { PlusCircle, Edit, Trash2, Wand2, Save, X } from 'lucide-react';
import { NONE, noneOr } from '@/lib/selectUtils';
import { applyDefaultAccountPlan, resetAccountPlan } from '@/lib/accountPlanSeed';

const AccountDialog = ({ open, onOpenChange, account, onSave, parentOptions }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('receita');
  const [parentId, setParentId] = useState(NONE);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Only update when dialog is truly open
      if (account) {
        setName(account.name || '');
        setType(account.type || 'receita');
        setParentId(account.parent_id || NONE);
      } else {
        setName('');
        setType('receita');
        setParentId(NONE);
      }
    }
  }, [account, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave({
        name,
        type,
        parent_id: noneOr(parentId),
      });
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
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Conta Pai (opcional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhuma</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
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
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, account: null });
  const [typeFilter, setTypeFilter] = useState('all'); // all | receita | despesa
  const [usageInfo, setUsageInfo] = useState({}); // { [category_id]: { count, lastDue } }
  const [editMode, setEditMode] = useState(false);
  const [inlineEdits, setInlineEdits] = useState({}); // { id: { name, type, parent_id } }

  const loadAccounts = useCallback(async () => {
    if (!clinicId) {
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_plans')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');
      if (error) {
        throw error;
      }
      setAccounts(data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar plano de contas',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId, toast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Load basic usage info from ap_bills for the current clinic
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('ap_bills')
          .select('category_id, due_date')
          .eq('clinic_id', clinicId)
          .not('category_id', 'is', null);
        if (error) {
          throw error;
        }
        const map = {};
        for (const row of data || []) {
          const cid = row.category_id;
          if (!cid) {
            continue;
          }
          if (!map[cid]) {
            map[cid] = { count: 0, lastDue: null };
          }
          map[cid].count += 1;
          const cur = row.due_date ? new Date(row.due_date) : null;
          if (cur && (!map[cid].lastDue || cur > map[cid].lastDue)) {
            map[cid].lastDue = cur;
          }
        }
        setUsageInfo(map);
      } catch (e) {
        console.warn('load ap_bills usage failed:', e?.message || e);
      }
    })();
  }, [clinicId, accounts.length]);

  const handleSave = async (payload) => {
    try {
      let error;
      if (dialog.account?.id) {
        ({ error } = await supabase
          .from('account_plans')
          .update({ ...payload, clinic_id: clinicId })
          .eq('id', dialog.account.id));
      } else {
        ({ error } = await supabase
          .from('account_plans')
          .insert({ ...payload, clinic_id: clinicId }));
      }
      if (error) {
        throw error;
      }
      toast({ title: 'Salvo com sucesso!' });
      loadAccounts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (accounts.some((a) => a.parent_id === id)) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não é possível excluir uma conta que possui sub-contas.',
      });
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir?')) {
      try {
        const { error } = await supabase.from('account_plans').delete().eq('id', id);
        if (error) {
          throw error;
        }
        toast({ title: 'Excluído com sucesso!' });
        loadAccounts();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
      }
    }
  };

  const structuredAccounts = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, { ...a, children: [] }]));
    const roots = [];
    for (const acc of map.values()) {
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id).children.push(acc);
      } else {
        roots.push(acc);
      }
    }
    const filterType = typeFilter === 'all' ? null : typeFilter;
    const filterTree = (list) =>
      list
        .filter((a) => !filterType || String(a.type || '').toLowerCase() === filterType)
        .map((a) => ({ ...a, children: filterTree(a.children || []) }));
    return filterTree(roots);
  }, [accounts, typeFilter]);

  const parentOptions = accounts.filter((a) => !a.parent_id);

  const startInlineEdit = (acc) => {
    setInlineEdits((prev) => ({
      ...prev,
      [acc.id]: {
        name: acc.name || '',
        type: acc.type || 'receita',
        parent_id: acc.parent_id || NONE,
      },
    }));
  };

  const cancelInlineEdit = (id) => {
    setInlineEdits((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const saveInlineEdit = async (acc) => {
    const payload = inlineEdits[acc.id];
    if (!payload) {
      return;
    }
    const newParent = noneOr(payload.parent_id);
    // Enforce two levels: a node with children cannot become a child (would create level 3)
    if (newParent && (acc.children || []).length > 0) {
      toast({
        variant: 'destructive',
        title: 'Estrutura inválida',
        description: 'Uma conta com sub-contas não pode virar filha (limite de 2 níveis).',
      });
      return;
    }
    // Parent must be a level-1 (no parent)
    if (newParent && accounts.some((a) => a.id === newParent && !!a.parent_id)) {
      toast({
        variant: 'destructive',
        title: 'Conta pai inválida',
        description: 'Selecione apenas contas de nível 1 como pai.',
      });
      return;
    }
    // If parent selected, align type to parent
    let finalType = payload.type;
    if (newParent) {
      const p = accounts.find((a) => a.id === newParent);
      if (p && p.type) {
        finalType = p.type;
      }
    }
    try {
      const { error } = await supabase
        .from('account_plans')
        .update({ name: payload.name, type: finalType, parent_id: newParent || null })
        .eq('id', acc.id);
      if (error) {
        throw error;
      }
      cancelInlineEdit(acc.id);
      await loadAccounts();
      toast({ title: 'Estrutura atualizada!' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
    }
  };

  const AccountRow = ({ acc, level = 0 }) => (
    <>
      <tr className="border-b hover:bg-muted/40">
        <td className="p-2" style={{ paddingLeft: `${0.5 + level * 1.5}rem` }}>
          {editMode && inlineEdits[acc.id] ? (
            <Input
              className="h-8 text-sm"
              value={inlineEdits[acc.id].name}
              onChange={(e) =>
                setInlineEdits((prev) => ({
                  ...prev,
                  [acc.id]: { ...prev[acc.id], name: e.target.value },
                }))
              }
            />
          ) : (
            <span className="font-medium">{acc.name}</span>
          )}
        </td>
        <td className="p-2">
          {editMode && inlineEdits[acc.id] ? (
            <Select
              value={inlineEdits[acc.id].type}
              onValueChange={(v) =>
                setInlineEdits((prev) => ({ ...prev, [acc.id]: { ...prev[acc.id], type: v } }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="capitalize">{acc.type}</span>
          )}
        </td>
        <td className="p-2">
          {editMode && inlineEdits[acc.id] ? (
            <Select
              value={inlineEdits[acc.id].parent_id ?? NONE}
              onValueChange={(v) =>
                setInlineEdits((prev) => ({ ...prev, [acc.id]: { ...prev[acc.id], parent_id: v } }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhuma</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            accounts.find((a) => a.id === acc.parent_id)?.name || '—'
          )}
        </td>
        <td className="p-2 whitespace-nowrap">
          {(() => {
            const info = usageInfo[acc.id];
            const count = info?.count || 0;
            const last = info?.lastDue ? info.lastDue.toLocaleDateString('pt-BR') : '—';
            return (
              <span>
                {count} conta(s) • último: {last}
              </span>
            );
          })()}
        </td>
        <td className="p-2">
          <div className="flex gap-1">
            {!editMode || !inlineEdits[acc.id] ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDialog({ open: true, account: acc })}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                {editMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startInlineEdit(acc)}
                    title="Editar estrutura"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-destructive/10"
                  onClick={() => handleDelete(acc.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => saveInlineEdit(acc)}
                  title="Salvar"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => cancelInlineEdit(acc.id)}
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
      {acc.children.map((child) => (
        <AccountRow key={child.id} acc={child} level={level + 1} />
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Plano de Contas</h1>
        <div className="flex items-center gap-3">
          <Button variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode((v) => !v)}>
            {editMode ? 'Sair do modo edição' : 'Modo edição'}
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <Label>Filtrar</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await applyDefaultAccountPlan(clinicId);
                toast({ title: 'Estrutura padrão aplicada!' });
                loadAccounts();
              } catch (e) {
                toast({
                  variant: 'destructive',
                  title: 'Falha ao aplicar estrutura',
                  description: e.message,
                });
              }
            }}
          >
            <Wand2 className="w-4 h-4 mr-2" /> Estrutura Padrão
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (
                !window.confirm(
                  'Tem certeza que deseja resetar a estrutura? Isso apagará o plano atual e desvinculará categorias das contas a pagar desta clínica.',
                )
              ) {
                return;
              }
              try {
                await resetAccountPlan(clinicId);
                toast({ title: 'Plano de contas resetado!' });
                loadAccounts();
              } catch (e) {
                toast({
                  variant: 'destructive',
                  title: 'Falha ao resetar',
                  description: e.message,
                });
              }
            }}
          >
            Resetar Estrutura
          </Button>
          <Button onClick={() => setDialog({ open: true, account: null })}>
            <PlusCircle className="w-4 h-4 mr-2" /> Nova Conta
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Estrutura de Contas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Conta Pai</th>
                  <th className="text-left p-2">Uso (AP)</th>
                  <th className="p-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {structuredAccounts.map((acc) => (
                  <AccountRow key={acc.id} acc={acc} />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <AccountDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, account: open ? dialog.account : null })}
        account={dialog.account}
        onSave={handleSave}
        parentOptions={parentOptions}
      />
    </div>
  );
}
