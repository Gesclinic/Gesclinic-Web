import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { createReceivable, arStatusOptions } from '@/lib/receivablesApi';
import { listAccountPlans } from '@/lib/financeApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listPatients } from '@/lib/patientsApi';
import { listPayers } from '@/lib/payersApi';
import { useNavigate } from 'react-router-dom';

export default function NovoRecebimento(){
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    origem: 'Manual',
    payer_name: '',
    descricao: '',
    valor_bruto: '',
    descontos: '0',
    forma_prevista: '',
    data_emissao: new Date().toISOString().slice(0,10),
    data_vencimento: '',
    status: 'open',
    parcelado: false,
    total_parcelas: '',
    profissional_id: '',
    plano_contas_id: '',
    centro_custo_id: '',
    paciente_id: null,
    convenio_id: null,
    empresa_id: null,
    payer_type: 'manual',
  });
  const [plans, setPlans] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [patientResults, setPatientResults] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  useEffect(() => { if (!clinicId) return; (async()=>{ try{ const cs = await listAccountPlans(clinicId); setPlans((cs||[]).filter(c=>!!c.parent_id)); }catch{}})(); }, [clinicId]);
  useEffect(() => { if (!clinicId) return; (async()=>{ try{ const ps = await listProfessionals(clinicId); setProfessionals(ps||[]);}catch{}})(); }, [clinicId]);
  useEffect(() => {
    if (!clinicId) return;

    (async () => {
      try {
        const data = await listPayers(clinicId);
        setConvenios(data || []);
      } catch {
        setConvenios([]);
      }
    })();
  }, [clinicId]);

  useEffect(() => {
    setEmpresas([]);
  }, [clinicId]);

  const valorLiquido = useMemo(() => {
    const bruto = Number(form.valor_bruto || 0);
    const desc = Number(form.descontos || 0);
    return Math.max(0, bruto - desc);
  }, [form.valor_bruto, form.descontos]);

  const searchPatients = async (text) => {
    const term = (text || '').trim();
    if (!term || term.length < 2) { setPatientResults([]); return; }
    try {
      const res = await listPatients(clinicId, { q: term });
      setPatientResults(res || []);
    } catch { setPatientResults([]); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!clinicId) { toast({ variant: 'destructive', title: 'Sem clínica ativa' }); return; }
    if (!form.payer_name) { toast({ variant:'destructive', title: 'Pagador obrigatório' }); return; }
    if (!form.data_vencimento) { toast({ variant:'destructive', title: 'Vencimento obrigatório' }); return; }
    const parcels = form.parcelado ? Math.max(2, parseInt(form.total_parcelas||'0',10)) : 1;
    try {
      // Garante regra: apenas um pagador principal setado
      const payload = { ...form };
      if (payload.payer_type !== 'paciente') payload.paciente_id = null;
      if (payload.payer_type !== 'convenio') payload.convenio_id = null;
      if (payload.payer_type !== 'empresa') payload.empresa_id = null;
      delete payload.payer_type;

      await createReceivable(clinicId, { ...payload, total_parcelas: parcels });
      toast({ title: 'Recebível criado com sucesso!' });
      navigate('/clinica/financeiro/receber');
    } catch (err) {
      toast({ variant:'destructive', title:'Erro ao salvar', description: err.message });
    }
  };

  return (
    <PageLayout title="Novo Recebimento" subtitle="Cadastre um título a receber com rastreabilidade.">
      <div className="w-full mx-auto space-y-4">
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Origem</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={form.origem} onChange={(e)=>setForm(f=>({...f, origem:e.target.value}))}>
                <option>Manual</option>
                <option>Agenda</option>
                <option>Faturamento</option>
                <option>Contrato</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={form.status} onChange={(e)=>setForm(f=>({...f, status:e.target.value}))}>
                {arStatusOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
            <div>
              <Label>Forma prevista</Label>
              <Input value={form.forma_prevista} onChange={(e)=>setForm(f=>({...f, forma_prevista:e.target.value}))} placeholder="Pix, Dinheiro, Cartão..." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Pagador</Label>
              {form.payer_type === 'paciente' ? (
                <div>
                  <Input onChange={(e)=>{ searchPatients(e.target.value); setForm(f=>({...f, payer_name:e.target.value})); }} placeholder="Buscar paciente por nome/CPF" />
                  {patientResults.length > 0 && (
                    <div className="mt-2 border rounded max-h-40 overflow-auto text-sm">
                      {patientResults.map(p => (
                        <div key={p.id} className="px-2 py-1 hover:bg-gray-100 cursor-pointer" onClick={()=>{ setForm(f=>({...f, payer_name:p.full_name, paciente_id:p.id})); setPatientResults([]); }}>
                          {p.full_name} — {p.cpf}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                form.payer_type === 'convenio' && convenios.length > 0 ? (
                  <select className="w-full border rounded h-9 px-2 text-sm" value={form.convenio_id || ''} onChange={(e)=>{ const id=e.target.value; const item = convenios.find(c=>String(c.id)===String(id)); setForm(f=>({...f, convenio_id:id || null, payer_name: item?.name || f.payer_name })); }}>
                    <option value="">Selecione um convênio</option>
                    {convenios.map(c=> (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                ) : form.payer_type === 'empresa' && empresas.length > 0 ? (
                  <select className="w-full border rounded h-9 px-2 text-sm" value={form.empresa_id || ''} onChange={(e)=>{ const id=e.target.value; const item = empresas.find(c=>String(c.id)===String(id)); setForm(f=>({...f, empresa_id:id || null, payer_name: item?.name || f.payer_name })); }}>
                    <option value="">Selecione uma empresa</option>
                    {empresas.map(c=> (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                ) : (
                  <Input value={form.payer_name} onChange={(e)=>setForm(f=>({...f, payer_name:e.target.value}))} placeholder="Paciente / Convênio / Empresa" />
                )
              )}
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e)=>setForm(f=>({...f, descricao:e.target.value}))} placeholder="Serviço/Contrato" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Tipo de Pagador</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={form.payer_type} onChange={(e)=>setForm(f=>({...f, payer_type:e.target.value}))}>
                <option value="manual">Manual</option>
                <option value="paciente">Paciente</option>
                <option value="convenio">Convênio</option>
                <option value="empresa" disabled={!empresas.length}>Empresa</option>
              </select>
            </div>
            <div>
              <Label>Profissional (repasse)</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={form.profissional_id} onChange={(e)=>setForm(f=>({...f, profissional_id:e.target.value}))}>
                <option value="">—</option>
                {professionals.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
            <div>
              <Label>Plano de Contas</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={form.plano_contas_id} onChange={(e)=>setForm(f=>({...f, plano_contas_id:e.target.value}))}>
                <option value="">—</option>
                {plans.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Valor bruto (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_bruto} onChange={(e)=>setForm(f=>({...f, valor_bruto:e.target.value}))} />
            </div>
            <div>
              <Label>Descontos (R$)</Label>
              <Input type="number" step="0.01" value={form.descontos} onChange={(e)=>setForm(f=>({...f, descontos:e.target.value}))} />
            </div>
            <div>
              <Label>Valor líquido</Label>
              <div className="h-9 flex items-center px-2 border rounded bg-gray-50">{valorLiquido.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Emissão</Label>
              <Input type="date" value={form.data_emissao} onChange={(e)=>setForm(f=>({...f, data_emissao:e.target.value}))} />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={form.data_vencimento} onChange={(e)=>setForm(f=>({...f, data_vencimento:e.target.value}))} />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input id="parcelado" type="checkbox" checked={!!form.parcelado} onChange={(e)=>setForm(f=>({...f, parcelado:e.target.checked}))} />
              <Label htmlFor="parcelado">Parcelado</Label>
              {form.parcelado && (
                <Input className="ml-2 w-24" placeholder="Parcelas" value={form.total_parcelas} onChange={(e)=>setForm(f=>({...f, total_parcelas:e.target.value}))} />
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="bg-blue-600 text-white" onClick={handleSave}>Salvar</Button>
            <Button variant="outline" onClick={()=>navigate('/clinica/financeiro/receber')}>Cancelar</Button>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}

