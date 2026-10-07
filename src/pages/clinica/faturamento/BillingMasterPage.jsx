import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2, RefreshCw, Save, Search, ShieldCheck } from 'lucide-react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { listHealthInsurances } from '@/lib/healthInsurancesApi';
import {
  applyPayerPaymentMatch,
  generateGuideFromBillingWorkItem,
  importPayerPaymentFile,
  loadBillingMasterWorkspace,
  resolveBillingPendingItem,
  saveBillingDocumentRequirement,
  saveBillingPayerSetting,
  syncBillingWorkQueue,
  transitionBillingWorkItem,
} from '@/lib/billingMasterApi';

const PAGE_CONFIG = {
  prebilling: { title: 'Pré-faturamento', subtitle: 'Fila assistencial originada nos serviços realizados.', icon: FileCheck2 },
  contracts: { title: 'Contratos e regras', subtitle: 'Regras operacionais e financeiras por convênio.', icon: ShieldCheck },
  documents: { title: 'Autorizações e documentos', subtitle: 'Requisitos que bloqueiam ou liberam o faturamento.', icon: FileCheck2 },
  pending: { title: 'Central de pendências', subtitle: 'SLA, responsável, criticidade e resolução auditada.', icon: AlertTriangle },
  reconciliation: { title: 'Conciliação de operadoras', subtitle: 'Importações, matching e aplicação financeira.', icon: Search },
  traceability: { title: 'Rastreabilidade', subtitle: 'Eventos imutáveis do atendimento ao recebimento.', icon: ShieldCheck },
};

const emptySetting = {
  payer_id: '', payer_name: '', tiss_version: '4.01.00', submission_method: 'portal',
  payment_term_days: 30, appeal_term_days: 30, requires_eligibility: true,
  requires_authorization: false, requires_cid: false, requires_tuss: true,
  blocks_incomplete_billing: true, honorarium_trigger: 'receipt', active: true,
};

const emptyRequirement = {
  payer_id: '', guide_type: 'all', document_type: '', label: '', required: true,
  blocks_billing: true, active: true,
};

function dateTime(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '-';
}

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Status({ value }) {
  return <span className="inline-flex rounded border bg-muted/40 px-2 py-1 text-xs font-medium uppercase">{String(value || '-').replaceAll('_', ' ')}</span>;
}

function EmptyRow({ columns, text }) {
  return <tr><td colSpan={columns} className="px-3 py-10 text-center text-sm text-muted-foreground">{text}</td></tr>;
}

function WorkQueue({ rows, actionId, onTransition, onGenerateGuide }) {
  return (
    <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
      <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Competência</th><th className="px-3 py-2 text-left">Atendimento</th><th className="px-3 py-2 text-left">Classificação</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-left">Bloqueios</th><th className="px-3 py-2 text-right">Ação</th></tr></thead>
      <tbody>{rows.length === 0 && <EmptyRow columns={6} text="Nenhum serviço concluído na fila." />}{rows.map((row) => (
        <tr key={row.id} className="border-t align-top"><td className="px-3 py-3">{row.competency_date}</td><td className="px-3 py-3 font-mono text-xs">{row.appointment_id}</td><td className="px-3 py-3"><Status value={row.status} /><div className="mt-2 text-xs text-muted-foreground">Elegibilidade: {row.eligibility_status} · Autorização: {row.authorization_status} · Documentos: {row.document_status}</div></td><td className="px-3 py-3 text-right font-mono">{currency(row.net_amount)}</td><td className="px-3 py-3 text-xs text-red-700">{row.blocker_codes?.join(', ') || 'Sem bloqueios'}</td><td className="px-3 py-3 text-right">{row.status === 'ready' ? <Button size="sm" disabled={actionId === row.id} onClick={() => onGenerateGuide(row)}>Gerar guia</Button> : <Button size="sm" disabled={actionId === row.id || ['guide_generated', 'batched', 'canceled'].includes(row.status)} onClick={() => onTransition(row)}>{row.status === 'in_review' ? 'Aprovar' : 'Revisar'}</Button>}</td></tr>
      ))}</tbody>
    </table></div></CardContent></Card>
  );
}

export default function BillingMasterPage({ page = 'prebilling' }) {
  const config = PAGE_CONFIG[page] || PAGE_CONFIG.prebilling;
  const Icon = config.icon;
  const { clinicId } = useClinicContext();
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState(null);
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');
  const [setting, setSetting] = useState(emptySetting);
  const [requirement, setRequirement] = useState(emptyRequirement);
  const [importPayerId, setImportPayerId] = useState('');
  const [importFile, setImportFile] = useState(null);

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [data, payerRows] = await Promise.all([
        loadBillingMasterWorkspace(clinicId),
        listHealthInsurances(clinicId, { includeInactive: false }),
      ]);
      setWorkspace(data);
      setPayers(payerRows);
    } catch (error) {
      toast({ title: 'Erro ao carregar faturamento', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setWorkspace(null); load(); }, [clinicId]);

  const workItems = useMemo(() => (workspace?.workItems || []).filter((row) => {
    const text = `${row.appointment_id} ${row.status} ${(row.blocker_codes || []).join(' ')}`.toLowerCase();
    return !query || text.includes(query.toLowerCase());
  }), [workspace, query]);

  const handleSync = async () => {
    setActionId('sync');
    try {
      const rows = await syncBillingWorkQueue(clinicId);
      toast({ title: 'Fila sincronizada', description: `${rows.length} serviço(s) classificados.` });
      await load();
    } catch (error) {
      toast({ title: 'Erro ao sincronizar fila', description: error.message, variant: 'destructive' });
    } finally { setActionId(null); }
  };

  const handleTransition = async (row) => {
    setActionId(row.id);
    try {
      const nextStatus = row.status === 'in_review' ? 'ready' : 'in_review';
      await transitionBillingWorkItem({ clinicId, workItemId: row.id, nextStatus });
      await load();
    } catch (error) {
      toast({ title: 'Transição bloqueada', description: error.message, variant: 'destructive' });
    } finally { setActionId(null); }
  };

  const handleGenerateGuide = async (row) => {
    setActionId(row.id);
    try {
      const guide = await generateGuideFromBillingWorkItem(clinicId, row.id);
      toast({ title: 'Guia gerada', description: `${guide.numero_guia} criada e vinculada ao atendimento.` });
      await load();
    } catch (error) {
      toast({ title: 'Erro ao gerar guia', description: error.message, variant: 'destructive' });
    } finally { setActionId(null); }
  };

  const handleApplyMatch = async (row) => {
    setActionId(row.id);
    try {
      await applyPayerPaymentMatch(clinicId, row.id);
      toast({ title: 'Recebimento aplicado', description: 'O Contas a Receber foi atualizado sem criar outro título.' });
      await load();
    } catch (error) {
      toast({ title: 'Erro ao aplicar recebimento', description: error.message, variant: 'destructive' });
    } finally { setActionId(null); }
  };

  const selectPayer = (payerId, setter) => {
    const payer = payers.find((row) => row.id === payerId);
    setter((current) => ({ ...current, payer_id: payerId, payer_name: payer?.fantasy_name || payer?.name || '' }));
  };

  const handleSaveSetting = async (event) => {
    event.preventDefault();
    if (!setting.payer_id) return;
    setActionId('setting');
    try { await saveBillingPayerSetting(clinicId, setting); setSetting(emptySetting); await load(); toast({ title: 'Regra contratual salva' }); }
    catch (error) { toast({ title: 'Erro ao salvar regra', description: error.message, variant: 'destructive' }); }
    finally { setActionId(null); }
  };

  const handleSaveRequirement = async (event) => {
    event.preventDefault();
    if (!requirement.payer_id || !requirement.document_type || !requirement.label) return;
    setActionId('requirement');
    try { await saveBillingDocumentRequirement(clinicId, requirement); setRequirement(emptyRequirement); await load(); toast({ title: 'Requisito documental salvo' }); }
    catch (error) { toast({ title: 'Erro ao salvar requisito', description: error.message, variant: 'destructive' }); }
    finally { setActionId(null); }
  };

  const resolvePending = async (row) => {
    setActionId(row.id);
    try { await resolveBillingPendingItem(clinicId, row.id, 'Resolvido na Central de Pendências'); await load(); }
    catch (error) { toast({ title: 'Erro ao resolver pendência', description: error.message, variant: 'destructive' }); }
    finally { setActionId(null); }
  };

  const handleImport = async (event) => {
    event.preventDefault();
    const payer = payers.find((row) => row.id === importPayerId);
    if (!payer || !importFile) return;
    setActionId('import');
    try {
      const result = await importPayerPaymentFile({
        clinicId,
        payerId: payer.id,
        payerName: payer.fantasy_name || payer.name,
        file: importFile,
      });
      toast({ title: 'Demonstrativo importado', description: `${result.lines.length} linha(s), ${result.matches.length} matching(s) exato(s).` });
      setImportFile(null);
      await load();
    } catch (error) {
      toast({ title: 'Erro ao importar demonstrativo', description: error.message, variant: 'destructive' });
    } finally { setActionId(null); }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><Icon className="mt-1 h-6 w-6 text-blue-700" /><div><h1 className="text-2xl font-bold">{config.title}</h1><p className="text-sm text-muted-foreground">{config.subtitle}</p></div></div><div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Atualizar</Button>{page === 'prebilling' && <Button onClick={handleSync} disabled={actionId === 'sync'}>Sincronizar produção</Button>}</div></header>

      {page === 'prebilling' && <><Input className="max-w-md" placeholder="Buscar atendimento, status ou bloqueio" value={query} onChange={(event) => setQuery(event.target.value)} /><WorkQueue rows={workItems} actionId={actionId} onTransition={handleTransition} onGenerateGuide={handleGenerateGuide} /></>}

      {page === 'contracts' && <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.8fr)_1.2fr]"><Card><CardHeader><CardTitle>Regra por convênio</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSaveSetting}><div><Label>Convênio</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={setting.payer_id} onChange={(event) => selectPayer(event.target.value, setSetting)}><option value="">Selecione</option>{payers.map((payer) => <option key={payer.id} value={payer.id}>{payer.fantasy_name || payer.name}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><Label>Versão TISS</Label><Input value={setting.tiss_version} onChange={(event) => setSetting({ ...setting, tiss_version: event.target.value })} /></div><div><Label>Envio</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={setting.submission_method} onChange={(event) => setSetting({ ...setting, submission_method: event.target.value })}><option value="portal">Portal</option><option value="api">API</option><option value="sftp">SFTP</option><option value="manual">Manual</option></select></div><div><Label>Prazo pagamento</Label><Input type="number" value={setting.payment_term_days} onChange={(event) => setSetting({ ...setting, payment_term_days: Number(event.target.value) })} /></div><div><Label>Prazo recurso</Label><Input type="number" value={setting.appeal_term_days} onChange={(event) => setSetting({ ...setting, appeal_term_days: Number(event.target.value) })} /></div></div><div className="grid grid-cols-2 gap-2 text-sm">{[['requires_eligibility', 'Elegibilidade'], ['requires_authorization', 'Autorização'], ['requires_cid', 'CID'], ['requires_tuss', 'TUSS'], ['blocks_incomplete_billing', 'Bloquear incompletos']].map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={setting[key]} onChange={(event) => setSetting({ ...setting, [key]: event.target.checked })} />{label}</label>)}</div><Button type="submit" disabled={actionId === 'setting'}><Save className="mr-2 h-4 w-4" />Salvar regra</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Convênios parametrizados</CardTitle></CardHeader><CardContent className="space-y-2">{(workspace?.settings || []).map((row) => <button type="button" onClick={() => setSetting(row)} key={row.id} className="flex w-full items-center justify-between border-b p-3 text-left hover:bg-muted/40"><span><strong>{row.payer_name}</strong><small className="block text-muted-foreground">TISS {row.tiss_version} · {row.submission_method}</small></span><span className="font-mono text-sm">{row.payment_term_days} dias</span></button>)}{!workspace?.settings?.length && <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada.</p>}</CardContent></Card></div>}

      {page === 'documents' && <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.8fr)_1.2fr]"><Card><CardHeader><CardTitle>Novo requisito</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSaveRequirement}><div><Label>Convênio</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={requirement.payer_id} onChange={(event) => selectPayer(event.target.value, setRequirement)}><option value="">Selecione</option>{payers.map((payer) => <option key={payer.id} value={payer.id}>{payer.fantasy_name || payer.name}</option>)}</select></div><div><Label>Tipo do documento</Label><Input value={requirement.document_type} onChange={(event) => setRequirement({ ...requirement, document_type: event.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="laudo_medico" /></div><div><Label>Nome exibido</Label><Input value={requirement.label} onChange={(event) => setRequirement({ ...requirement, label: event.target.value })} placeholder="Laudo médico" /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={requirement.blocks_billing} onChange={(event) => setRequirement({ ...requirement, blocks_billing: event.target.checked })} />Bloqueia faturamento quando ausente</label><Button type="submit" disabled={actionId === 'requirement'}><Save className="mr-2 h-4 w-4" />Salvar requisito</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Documentos obrigatórios</CardTitle></CardHeader><CardContent><div className="divide-y">{(workspace?.requirements || []).map((row) => <button type="button" onClick={() => setRequirement(row)} key={row.id} className="flex w-full justify-between p-3 text-left hover:bg-muted/40"><span><strong>{row.label}</strong><small className="block text-muted-foreground">{row.document_type} · guia {row.guide_type}</small></span><Status value={row.blocks_billing ? 'bloqueante' : 'informativo'} /></button>)}</div></CardContent></Card></div>}

      {page === 'pending' && <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Severidade</th><th className="px-3 py-2 text-left">Categoria</th><th className="px-3 py-2 text-left">Pendência</th><th className="px-3 py-2 text-left">SLA</th><th className="px-3 py-2 text-right">Ação</th></tr></thead><tbody>{!(workspace?.pendingItems || []).length && <EmptyRow columns={5} text="Nenhuma pendência registrada." />}{(workspace?.pendingItems || []).map((row) => <tr key={row.id} className="border-t"><td className="px-3 py-3"><Status value={row.severity} /></td><td className="px-3 py-3">{row.category}</td><td className="px-3 py-3"><strong>{row.title}</strong><small className="block text-muted-foreground">{row.description}</small></td><td className="px-3 py-3">{dateTime(row.due_at)}</td><td className="px-3 py-3 text-right"><Button size="sm" variant="outline" disabled={row.status === 'resolved' || actionId === row.id} onClick={() => resolvePending(row)}><CheckCircle2 className="mr-2 h-4 w-4" />Resolver</Button></td></tr>)}</tbody></table></div></CardContent></Card>}

      {page === 'reconciliation' && <><Card><CardHeader><CardTitle>Importar demonstrativo da operadora</CardTitle></CardHeader><CardContent><form className="flex flex-col gap-3 md:flex-row md:items-end" onSubmit={handleImport}><div className="min-w-64 flex-1"><Label>Operadora</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={importPayerId} onChange={(event) => setImportPayerId(event.target.value)}><option value="">Selecione</option>{payers.map((payer) => <option key={payer.id} value={payer.id}>{payer.fantasy_name || payer.name}</option>)}</select></div><div className="min-w-64 flex-1"><Label htmlFor="payer-file">Arquivo XLSX, CSV ou TXT</Label><Input id="payer-file" type="file" accept=".xlsx,.csv,.txt" onChange={(event) => setImportFile(event.target.files?.[0] || null)} /></div><Button type="submit" disabled={!importPayerId || !importFile || actionId === 'import'}>{actionId === 'import' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Validar e conciliar</Button></form></CardContent></Card><div className="grid gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle>Arquivos de operadoras</CardTitle></CardHeader><CardContent className="space-y-2">{!(workspace?.imports || []).length && <p className="text-sm text-muted-foreground">Nenhuma importação realizada.</p>}{(workspace?.imports || []).map((row) => <div key={row.id} className="flex justify-between border-b p-3"><span><strong>{row.file_name}</strong><small className="block text-muted-foreground">{row.payer_name} · {row.file_format}</small></span><span className="text-right"><Status value={row.status} /><small className="mt-1 block">{row.matched_rows}/{row.total_rows}</small></span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Matching guia x recebível</CardTitle></CardHeader><CardContent className="space-y-2">{!(workspace?.matches || []).length && <p className="text-sm text-muted-foreground">Nenhum matching sugerido.</p>}{(workspace?.matches || []).map((row) => <div key={row.id} className="flex items-center justify-between gap-3 border-b p-3"><span><strong>{row.match_type}</strong><small className="block text-muted-foreground">Confiança {row.confidence}% · {currency(row.matched_amount)}</small></span><span className="flex items-center gap-2"><Status value={row.status} />{['suggested', 'confirmed'].includes(row.status) && <Button size="sm" disabled={actionId === row.id} onClick={() => handleApplyMatch(row)}>Aplicar</Button>}</span></div>)}</CardContent></Card></div></>}

      {page === 'traceability' && <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]"><Card><CardHeader><CardTitle>Eventos auditáveis</CardTitle></CardHeader><CardContent className="space-y-2">{(workspace?.auditEvents || []).map((row) => <div key={row.id} className="grid gap-2 border-b p-3 md:grid-cols-[160px_1fr_auto]"><span className="font-mono text-xs">{dateTime(row.occurred_at)}</span><span><strong>{row.event_type}</strong><small className="block text-muted-foreground">{row.aggregate_type} · {row.aggregate_id}</small></span><span className="text-xs">{row.previous_status || '-'} → {row.next_status || '-'}</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Versões XML imutáveis</CardTitle></CardHeader><CardContent className="space-y-2">{!(workspace?.xmlVersions || []).length && <p className="text-sm text-muted-foreground">Nenhuma versão XML gerada.</p>}{(workspace?.xmlVersions || []).map((row) => <div key={row.id} className="border-b p-3"><div className="flex justify-between"><strong>Versão {row.version}</strong><Status value={row.validation_status} /></div><small className="mt-1 block font-mono text-muted-foreground">{row.content_hash}</small></div>)}</CardContent></Card></div>}
    </div>
  );
}