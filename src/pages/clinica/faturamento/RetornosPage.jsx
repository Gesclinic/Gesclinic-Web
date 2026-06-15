import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  loadFaturamentoOperationalData,
  normalizeReceivableBillingStatus,
  registerBillingGlosa,
  registerBillingPayment,
  updateBillingGlosaWorkflow,
} from '@/lib/faturamentoOperationalApi';

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function statusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('receb') || normalized.includes('paid') || normalized.includes('accepted')) return 'bg-green-100 text-green-800';
  if (normalized.includes('glos') || normalized.includes('erro') || normalized.includes('reject')) return 'bg-red-100 text-red-800';
  if (normalized.includes('envi') || normalized.includes('sent')) return 'bg-blue-100 text-blue-800';
  return 'bg-amber-100 text-amber-800';
}

export default function RetornosPage() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('recibos');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [data, setData] = useState({ guides: [], submissions: [], receivables: [], glosas: [] });
  const [glosaInputs, setGlosaInputs] = useState({});
  const [glosaWorkflowInputs, setGlosaWorkflowInputs] = useState({});

  const loadData = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      setData(await loadFaturamentoOperationalData(clinicId));
    } catch (error) {
      toast({ title: 'Erro ao carregar retornos', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const guideById = useMemo(() => new Map(data.guides.map((guide) => [guide.id, guide])), [data.guides]);

  const recibos = useMemo(() => data.submissions.map((submission) => {
    const guide = guideById.get(submission.guide_id) || {};
    return {
      id: submission.id,
      recibo: submission.response_data?.receipt || submission.response_data?.protocol || submission.id,
      lote: guide.xml_path || guide.numero_guia || submission.guide_id || '-',
      guia: guide.numero_guia || guide.guide_number || '-',
      guias: 1,
      dataEnvio: submission.created_at,
      dataRecebimento: submission.updated_at || submission.created_at,
      status: submission.status || guide.status || 'Enviado',
    };
  }), [data.submissions, guideById]);

  const retornos = useMemo(() => data.receivables.map((receivable) => ({
    ...receivable,
    billingStatus: normalizeReceivableBillingStatus(receivable),
    balance: Math.max(0, Number(receivable.net_value || receivable.amount || 0) - Number(receivable.received_value || receivable.paid_total || 0) - Number(receivable.glosa_value || 0)),
  })), [data.receivables]);

  const erros = useMemo(() => {
    const glosaRows = data.glosas.map((glosa) => ({
      id: glosa.id,
      codigo: glosa.glosa_type || 'GLOSA',
      guia: glosa.metadata?.guide_number || glosa.metadata?.numero_guia || glosa.ar_invoice_id || '-',
      erro: glosa.reason || 'Glosa sem motivo informado',
      recibo: glosa.ar_invoice_id || '-',
      data: glosa.glosa_date || glosa.created_at,
      value: glosa.glosa_amount,
    }));
    const rejectedSubmissions = data.submissions
      .filter((item) => String(item.status || '').toLowerCase().includes('reject') || String(item.status || '').toLowerCase().includes('erro'))
      .map((item) => ({
        id: item.id,
        codigo: item.response_data?.code || 'RETORNO',
        guia: guideById.get(item.guide_id)?.numero_guia || item.guide_id || '-',
        erro: item.response_data?.message || item.error_message || 'Retorno rejeitado',
        recibo: item.response_data?.protocol || item.id,
        data: item.updated_at || item.created_at,
        value: 0,
      }));
    return [...glosaRows, ...rejectedSubmissions];
  }, [data.glosas, data.submissions, guideById]);

  const registerPayment = async (receivable) => {
    setActionLoadingId(receivable.id);
    try {
      const amount = receivable.balance || receivable.net_value || receivable.amount;
      await registerBillingPayment({
        clinicId,
        receivable,
        amount,
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: receivable.payment_method || 'convenio',
        notes: 'Recebimento registrado em Retornos de Faturamento',
      });
      toast({ title: 'Recebimento registrado', description: 'Contas a Receber, Fluxo, DRE e Cockpit passam a consumir o recebivel atualizado.' });
      await loadData();
    } catch (error) {
      toast({ title: 'Erro ao registrar recebimento', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const registerGlosa = async (receivable) => {
    const input = glosaInputs[receivable.id] || {};
    const glosaAmount = Number(input.amount || receivable.balance || receivable.net_value || receivable.amount || 0);
    if (!glosaAmount) return;
    setActionLoadingId(receivable.id);
    try {
      await registerBillingGlosa({
        clinicId,
        receivable,
        glosaAmount,
        reason: input.reason || 'Glosa registrada em Retornos de Faturamento',
        glosaType: input.type || 'administrativa',
        responsible: input.responsible || 'faturamento',
        contestationDeadline: input.deadline || null,
      });
      toast({ title: 'Glosa registrada', description: 'Recebivel atualizado para refletir fluxo projetado e DRE via dados financeiros existentes.' });
      setGlosaInputs((current) => ({ ...current, [receivable.id]: {} }));
      await loadData();
    } catch (error) {
      toast({ title: 'Erro ao registrar glosa', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const updateGlosaWorkflow = async (receivable, status) => {
    const input = glosaWorkflowInputs[receivable.id] || {};
    setActionLoadingId(receivable.id);
    try {
      await updateBillingGlosaWorkflow({
        clinicId,
        receivableId: receivable.id,
        status,
        contestedAmount: input.contestedAmount || receivable.glosa_value || 0,
        recoveredAmount: input.recoveredAmount || 0,
        finalLossAmount: input.finalLossAmount || 0,
        contestationDeadline: input.deadline || receivable.last_glosa?.contestation_deadline || null,
        responsible: input.responsible || receivable.last_glosa?.responsible || 'faturamento',
        notes: input.notes || '',
      });
      toast({ title: 'Recurso de glosa atualizado', description: 'Workflow, valor recuperado e recebivel foram sincronizados.' });
      setGlosaWorkflowInputs((current) => ({ ...current, [receivable.id]: {} }));
      await loadData();
    } catch (error) {
      toast({ title: 'Erro ao atualizar recurso', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Retornos & Recibos</h1>
          <p className="text-gray-600 mt-2">Retornos reais conectados a guias, recebiveis e glosas</p>
        </div>
        <Button type="button" variant="outline" onClick={loadData} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="recibos">Recibos ({recibos.length})</TabsTrigger>
          <TabsTrigger value="retornos">Retornos ({retornos.length})</TabsTrigger>
          <TabsTrigger value="erros">Glosas & Rejeicoes ({erros.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="recibos">
          <Card>
            <CardHeader><CardTitle>Recibos de Envio</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b"><tr><th className="px-4 py-3 text-left">Recibo</th><th className="px-4 py-3 text-left">Guia/Lote</th><th className="px-4 py-3 text-left">Envio</th><th className="px-4 py-3 text-left">Retorno</th><th className="px-4 py-3 text-center">Status</th></tr></thead>
                  <tbody>
                    {recibos.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-gray-500">Nenhum recibo TISS encontrado.</td></tr>}
                    {recibos.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3 font-mono text-blue-600">{item.recibo}</td><td className="px-4 py-3">{item.guia} / {item.lote}</td><td className="px-4 py-3">{formatDate(item.dataEnvio)}</td><td className="px-4 py-3">{formatDate(item.dataRecebimento)}</td><td className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${statusClass(item.status)}`}><CheckCircle size={14} />{item.status}</span></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retornos">
          <Card>
            <CardHeader><CardTitle>Retornos Financeiros</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {retornos.length === 0 && <p className="text-sm text-gray-500">Nenhum recebivel de faturamento encontrado.</p>}
                {retornos.map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{item.description || item.service_description || 'Recebivel'}</p>
                      <p className="text-sm text-gray-600">Guia {item.guide_number || '-'} - {currency(item.net_value || item.amount)} - saldo {currency(item.balance)}</p>
                      <span className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${statusClass(item.billingStatus)}`}>{item.billingStatus}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        className="h-9 w-32"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Glosa"
                        value={glosaInputs[item.id]?.amount || ''}
                        onChange={(event) => setGlosaInputs((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), amount: event.target.value } }))}
                      />
                      <Input
                        className="h-9 w-36"
                        placeholder="Motivo"
                        value={glosaInputs[item.id]?.reason || ''}
                        onChange={(event) => setGlosaInputs((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), reason: event.target.value } }))}
                      />
                      <Input
                        className="h-9 w-32"
                        placeholder="Tipo"
                        value={glosaInputs[item.id]?.type || ''}
                        onChange={(event) => setGlosaInputs((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), type: event.target.value } }))}
                      />
                      <Input
                        className="h-9 w-36"
                        placeholder="Responsavel"
                        value={glosaInputs[item.id]?.responsible || ''}
                        onChange={(event) => setGlosaInputs((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), responsible: event.target.value } }))}
                      />
                      <Input
                        className="h-9 w-36"
                        type="date"
                        value={glosaInputs[item.id]?.deadline || ''}
                        onChange={(event) => setGlosaInputs((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), deadline: event.target.value } }))}
                      />
                      <Button size="sm" variant="outline" disabled={actionLoadingId === item.id || item.balance <= 0} onClick={() => registerPayment(item)}>Receber</Button>
                      <Button size="sm" variant="outline" disabled={actionLoadingId === item.id || item.balance <= 0} onClick={() => registerGlosa(item)}>Glosar</Button>
                    </div>
                    {Number(item.glosa_value || 0) > 0 && (
                      <div className="md:col-span-2 rounded-md border bg-slate-50 p-3">
                        <div className="grid gap-2 md:grid-cols-6">
                          <Input className="h-9" type="number" step="0.01" placeholder="Valor recurso" value={glosaWorkflowInputs[item.id]?.contestedAmount || ''} onChange={(event) => setGlosaWorkflowInputs((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), contestedAmount: event.target.value } }))} />
                          <Input className="h-9" type="number" step="0.01" placeholder="Recuperado" value={glosaWorkflowInputs[item.id]?.recoveredAmount || ''} onChange={(event) => setGlosaWorkflowInputs((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), recoveredAmount: event.target.value } }))} />
                          <Input className="h-9" type="number" step="0.01" placeholder="Perda final" value={glosaWorkflowInputs[item.id]?.finalLossAmount || ''} onChange={(event) => setGlosaWorkflowInputs((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), finalLossAmount: event.target.value } }))} />
                          <Input className="h-9" placeholder="Notas recurso" value={glosaWorkflowInputs[item.id]?.notes || ''} onChange={(event) => setGlosaWorkflowInputs((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), notes: event.target.value } }))} />
                          <Button size="sm" variant="outline" disabled={actionLoadingId === item.id} onClick={() => updateGlosaWorkflow(item, 'contestada')}>Recorrer</Button>
                          <Button size="sm" variant="outline" disabled={actionLoadingId === item.id} onClick={() => updateGlosaWorkflow(item, 'recuperada')}>Recuperar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="erros">
          <Card>
            <CardHeader><CardTitle>Glosas & Rejeicoes</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b"><tr><th className="px-4 py-3 text-left">Codigo</th><th className="px-4 py-3 text-left">Guia</th><th className="px-4 py-3 text-left">Ocorrencia</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-left">Data</th></tr></thead>
                  <tbody>
                    {erros.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-gray-500">Nenhuma glosa ou rejeicao encontrada.</td></tr>}
                    {erros.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-red-50"><td className="px-4 py-3"><span className="rounded bg-red-100 px-2 py-1 font-mono text-xs text-red-800">{item.codigo}</span></td><td className="px-4 py-3 font-mono">{item.guia}</td><td className="px-4 py-3"><span className="flex items-center text-red-600"><AlertCircle size={16} className="mr-2" />{item.erro}</span></td><td className="px-4 py-3 text-right font-mono">{currency(item.value)}</td><td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.data)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
