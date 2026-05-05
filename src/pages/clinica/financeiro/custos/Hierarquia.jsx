import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function Hierarquia() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', type: 'despesa' });

  useEffect(() => {
    (async () => {
      if (!clinicId) {
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');
      setAccounts(data || []);
      setLoading(false);
      // Open edit dialog if edit param is present
      const editId = searchParams.get('edit');
      if (editId && data) {
        const node = (data || []).find((a) => String(a.id) === String(editId));
        if (node) {
          openEdit(node);
        }
      }
    })();
  }, [clinicId]);

  const tree = useMemo(() => {
    const map = new Map((accounts || []).map((a) => [a.id, { ...a, children: [] }]));
    const roots = [];
    for (const a of map.values()) {
      if (a.parent_id && map.has(a.parent_id)) {
        map.get(a.parent_id).children.push(a);
      } else {
        roots.push(a);
      }
    }
    return roots;
  }, [accounts]);

  const openEdit = (node) => {
    setEditing(node);
    setEditForm({ name: node.name || '', type: node.type || 'despesa' });
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('edit', node.id);
      return p;
    });
  };

  const saveEdit = async () => {
    if (!editing) {
      return;
    }
    try {
      const update = { name: editForm.name, type: editForm.type };
      const { data, error } = await supabase
        .from('cost_centers')
        .update(update)
        .eq('id', editing.id)
        .select();

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];
      if (error) {
        throw error;
      }
      setAccounts((prev) => prev.map((a) => (a.id === editing.id ? { ...a, ...data } : a)));
      setEditing(null);
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.delete('edit');
        return p;
      });
      // Voltar para a pÃ¡gina anterior (onde iniciou a ediÃ§Ã£o)
      navigate(-1);
      toast({ title: 'Centro atualizado!' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: e.message });
    }
  };

  const Row = ({ node, level = 0 }) => (
    <div
      className="flex items-center justify-between py-1"
      style={{ paddingLeft: `${level * 16}px` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{node.name}</span>
        <span className="text-xs text-gray-500 capitalize">({node.type || 'â€”'})</span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => openEdit(node)}>
          Editar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => window.alert('Subcentro em breve')}>
          Subcentro
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.alert('Resultados em breve')}>
          Ver resultados
        </Button>
      </div>
    </div>
  );

  return (
    <div className="border rounded-md p-3">
      {loading ? (
        <div className="text-sm text-gray-600">Carregando...</div>
      ) : tree.length === 0 ? (
        <div className="text-sm text-gray-600">Nenhum centro cadastrado.</div>
      ) : (
        tree.map((root) => (
          <div key={root.id} className="mb-2">
            <Row node={root} />
            {(root.children || []).map((child) => (
              <div key={child.id}>
                <Row node={child} level={1} />
              </div>
            ))}
          </div>
        ))
      )}
      <div className="text-xs text-gray-500 mt-2">Arrastar para reordenar/mudar pai: em breve.</div>

      {/* Edit dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) {
            setEditing(null);
          }
        }}
      >
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Editar Centro de Custo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.delete('edit');
                  return p;
                });
                navigate(-1);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
