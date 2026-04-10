import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export default function Cadastro(){
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name:'', tipo:'assistencial', categoria:'despesa', parent_id:null, order_index:'', active:true, notes:'' });
  useEffect(() => { (async ()=>{ if(!clinicId) return; const { data } = await supabase.from('cost_centers').select('*').eq('clinic_id', clinicId).order('name'); setAccounts(data||[]); })(); }, [clinicId]);

  const save = async (goLink=false) => {
    try {
      // Mapear campos para cost_centers
      const base = {
        name: form.name,
        type: form.tipo,
        category: form.categoria,
        parent_id: form.parent_id,
        clinic_id: clinicId,
        order_index: form.order_index ? Number(form.order_index) : null,
        active: !!form.active,
        notes: form.notes
      };
      let { data, error } = await supabase.from('cost_centers').insert(base).select().single();
      if (error) throw error;
      toast({ title: 'Centro salvo!' });
      if (goLink) {
        window.location.assign('/clinica/financeiro/centro-custos/vinculacoes');
      } else {
        setForm({ name:'', tipo:'assistencial', categoria:'despesa', parent_id:null, order_index:'', active:true, notes:'' });
      }
    } catch (e) {
      toast({ variant:'destructive', title:'Erro ao salvar', description: e.message });
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Bloco 1 – Identificação */}
      <div className="border rounded-md p-3 space-y-3">
        <div className="font-semibold">Identificação</div>
        <div>
          <Label>Nome do Centro</Label>
          <Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={v=>setForm(f=>({...f,tipo:v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="assistencial">Assistencial</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={v=>setForm(f=>({...f,categoria:v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="custo">Custo</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bloco 2 – Estrutura */}
      <div className="border rounded-md p-3 space-y-3">
        <div className="font-semibold">Estrutura</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Centro Pai</Label>
            <Select
              value={form.parent_id ?? undefined}
              onValueChange={v=>setForm(f=>({...f,parent_id: v === 'none' ? null : v}))}
            >
              <SelectTrigger><SelectValue placeholder="Nenhum"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {accounts.filter(a=>!a.parent_id).map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ordem de exibição</Label>
            <Input value={form.order_index} onChange={e=>setForm(f=>({...f,order_index:e.target.value}))} placeholder="Opcional" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.active ? '1':'0'} onValueChange={v=>setForm(f=>({...f,active: v==='1'}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Ativo</SelectItem>
                <SelectItem value="0">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bloco 3 – Observações */}
      <div className="border rounded-md p-3 space-y-3">
        <div className="font-semibold">Observações</div>
        <Input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Opcional" />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={()=>save(false)}>Salvar</Button>
        <Button variant="outline" onClick={()=>save(true)}>Salvar e Vincular</Button>
      </div>
    </div>
  );
}

