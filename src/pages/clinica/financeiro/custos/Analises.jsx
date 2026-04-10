import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

function currency(n){ const v=Number(n||0); return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

export default function Analises(){
  const { clinicId } = useAuth();
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState('all');
  const [period, setPeriod] = useState('m3'); // mês atual, m3, m6, y1 etc.
  const [rows, setRows] = useState([]);

  useEffect(() => { (async ()=>{
    if(!clinicId) return; const { data } = await supabase.from('account_plans').select('*').eq('clinic_id', clinicId).order('name'); setCenters(data||[]);
  })(); }, [clinicId]);

  useEffect(() => { (async ()=>{
    if(!clinicId) return; const now=new Date(); let start=new Date(now.getFullYear(), now.getMonth(), 1); if(period==='m3'){ start.setMonth(start.getMonth()-2);} if(period==='m6'){ start.setMonth(start.getMonth()-5);} if(period==='y1'){ start.setFullYear(start.getFullYear()-1);} const end=now; const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let q = supabase.from('ap_bills').select('category_id, amount, due_date').eq('clinic_id', clinicId).gte('due_date', iso(start)).lte('due_date', iso(end));
    if(centerId!=='all') q=q.eq('category_id', centerId);
    const { data } = await q;
    setRows(data||[]);
  })(); }, [clinicId, centerId, period]);

  const byMonth = useMemo(() => {
    const map = new Map();
    for (const r of rows){
      const d = new Date(r.due_date); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      map.set(k, (map.get(k)||0) + Number(r.amount||0));
    }
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-gray-600 mb-1">Centro</div>
          <Select value={centerId} onValueChange={setCenterId}>
            <SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {centers.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Período</div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="m3">Últimos 3 meses</SelectItem>
              <SelectItem value="m6">Últimos 6 meses</SelectItem>
              <SelectItem value="y1">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border rounded-md p-3">
        <div className="text-sm font-semibold mb-2">Evolução mensal (Custos)</div>
        <div className="text-xs text-gray-600 mb-1">(Gráfico em breve)</div>
        <ul className="text-sm list-disc ml-5">
          {byMonth.map(([k,v]) => (<li key={k}>{k}: {currency(v)}</li>))}
          {byMonth.length===0 && (<li>Nenhum lançamento no período.</li>)}
        </ul>
      </div>
      <div className="border rounded-md p-3">
        <div className="text-sm font-semibold mb-2">Participação no resultado</div>
        <div className="text-xs text-gray-600">Em breve.</div>
      </div>
    </div>
  );
}

