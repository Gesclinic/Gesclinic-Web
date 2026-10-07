// src/pages/clinica/faturamento/LotesPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { Download, Eye, FileText, Loader2, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { markGuidesAsBilled, markGuideAsSent } from '@/lib/faturamentoOperationalApi';
import {
  generateBillingBatchXml,
  listBillingBatches,
  transitionBillingBatch,
} from '@/lib/billingOperationsApi';

const statusClasses = {
  draft: 'bg-gray-100 text-gray-800',
  closed: 'bg-cyan-100 text-cyan-800',
  xml_generated: 'bg-indigo-100 text-indigo-800',
  sent: 'bg-blue-100 text-blue-800',
  protocolled: 'bg-blue-100 text-blue-800',
  processed: 'bg-green-100 text-green-800',
  partially_paid: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  glossed: 'bg-red-100 text-red-800',
  reopened: 'bg-orange-100 text-orange-800',
  canceled: 'bg-slate-100 text-slate-500',
  rascunho: 'bg-gray-100 text-gray-800',
  enviado: 'bg-blue-100 text-blue-800',
  processado: 'bg-green-100 text-green-800',
  pago: 'bg-green-100 text-green-800',
  glosado: 'bg-red-100 text-red-800',
  erro: 'bg-red-100 text-red-800',
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function getGuideLotKey(guide) {
  if (guide.billing_batch_key) return guide.billing_batch_key;
  if (guide.xml_path) return guide.xml_path;
  const month = String(guide.data_criacao || new Date().toISOString()).slice(0, 7);
  return `pendente-${month}-${guide.convenio || 'sem-convenio'}`;
}

function getLotStatus(guides) {
  const statuses = guides.map((guide) => String(guide.status || '').toLowerCase());
  if (statuses.some((status) => status.includes('glos'))) return 'glosado';
  if (statuses.every((status) => status.includes('pago'))) return 'pago';
  if (statuses.every((status) => status.includes('process'))) return 'processado';
  if (statuses.some((status) => status.includes('enviado'))) return 'enviado';
  return 'rascunho';
}

function normalizeLots(guides, submissions) {
  const submissionsByGuide = new Map(submissions.map((item) => [item.guide_id, item]));
  const groups = new Map();

  guides.forEach((guide) => {
    const key = getGuideLotKey(guide);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(guide);
  });

  return Array.from(groups.entries()).map(([key, groupedGuides], index) => {
    const latestSubmission = groupedGuides
      .map((guide) => submissionsByGuide.get(guide.id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
    const createdAt = groupedGuides
      .map((guide) => guide.data_criacao)
      .filter(Boolean)
      .sort()[0];

    return {
      id: key,
      nome: key.startsWith('pendente-')
        ? `LOT-${String(index + 1).padStart(3, '0')}`
        : guideName(key),
      dataCriacao: createdAt,
      guias: groupedGuides.length,
      valor: groupedGuides.reduce((sum, guide) => sum + Number(guide.valor || 0), 0),
      status: getLotStatus(groupedGuides),
      recibo: latestSubmission?.id || null,
      xmlPath: groupedGuides.find((guide) => guide.xml_path)?.xml_path || null,
      guideIds: groupedGuides.map((guide) => guide.id),
      convenio: groupedGuides[0]?.convenio || '-',
    };
  });
}

function guideName(key) {
  return key.includes('/') ? key.split('/').pop()?.replace('.xml', '') || key : key;
}

function normalizePersistedBatch(batch) {
  return {
    id: batch.id,
    nome: batch.batch_key,
    dataCriacao: batch.created_at,
    guias: batch.guide_count || 0,
    valor: batch.gross_amount || 0,
    status: batch.status,
    recibo: batch.protocol_number || null,
    xmlPath: batch.xml_path || null,
    guideIds: (batch.billing_batch_guides || [])
      .filter((row) => !row.removed_at)
      .map((row) => row.guide_id),
    convenio: batch.payer_name || '-',
    persisted: true,
  };
}

export default function LotesPage() {
  const { clinicId } = useClinicContext();
  const { toast } = useToast();
  const [guides, setGuides] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [persistedBatches, setPersistedBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [guidesResult, submissionsResult, batches] = await Promise.all([
        supabase
          .from('billing_guides')
          .select(
            'id, numero_guia, convenio, valor, status, xml_path, billing_batch_key, data_criacao, data_envio, data_processamento',
          )
          .eq('clinic_id', clinicId)
          .order('data_criacao', { ascending: false }),
        supabase
          .from('tiss_submissions')
          .select('id, guide_id, status, created_at, updated_at')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false }),
        listBillingBatches(clinicId),
      ]);

      if (guidesResult.error) throw guidesResult.error;
      if (submissionsResult.error) throw submissionsResult.error;

      setGuides(guidesResult.data || []);
      setSubmissions(submissionsResult.data || []);
      setPersistedBatches(batches);
    } catch (error) {
      toast({
        title: 'Erro ao carregar lotes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const lotes = useMemo(() => {
    const persisted = persistedBatches.map(normalizePersistedBatch);
    const persistedKeys = new Set(persisted.map((batch) => batch.nome));
    const legacy = normalizeLots(guides, submissions).filter(
      (batch) => !persistedKeys.has(batch.id),
    );
    return [...persisted, ...legacy];
  }, [guides, submissions, persistedBatches]);
  const totalGuias = lotes.reduce((sum, lote) => sum + lote.guias, 0);

  const updateLot = async (lot, status) => {
    setActionLoading(true);
    try {
      const lotGuides = guides.filter((guide) => lot.guideIds.includes(guide.id));
      if (lot.persisted && status === 'Enviado') {
        await transitionBillingBatch({ clinicId, batchId: lot.id, nextStatus: 'sent' });
        await Promise.all(lotGuides.map((guide) => markGuideAsSent(clinicId, guide)));
        toast({ title: 'Lote enviado', description: `${lot.nome} avançou para enviado com auditoria.` });
        await loadData();
        return;
      }

      if (lot.persisted && status === 'Aguardando XML') {
        await transitionBillingBatch({ clinicId, batchId: lot.id, nextStatus: 'reopened' });
        toast({ title: 'Lote reaberto', description: 'Uma nova versão XML poderá ser gerada após o fechamento.' });
        await loadData();
        return;
      }

      if (status === 'Faturado') {
        await markGuidesAsBilled(clinicId, lotGuides);
        toast({
          title: 'Lote faturado',
          description: `${lot.guias} guia(s) com recebivel garantido em Contas a Receber.`,
        });
        await loadData();
        return;
      }

      if (status === 'Enviado') {
        await Promise.all(lotGuides.map((guide) => markGuideAsSent(clinicId, guide)));
        toast({
          title: 'Lote enviado',
          description: `${lot.guias} guia(s) enviadas e sincronizadas com Contas a Receber.`,
        });
        await loadData();
        return;
      }

      const patch = { status, data_atualizacao: new Date().toISOString() };
      if (status === 'Aguardando XML') {
        patch.data_envio = null;
        patch.data_processamento = null;
      }

      const { error } = await supabase.from('billing_guides').update(patch).in('id', lot.guideIds);
      if (error) throw error;

      toast({ title: 'Lote atualizado', description: `${lot.nome} marcado como ${status}.` });
      await loadData();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar lote',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const prepareXml = async (lot) => {
    setActionLoading(true);
    try {
      if (lot.persisted) {
        const result = await generateBillingBatchXml({ clinicId, batchId: lot.id });
        toast({
          title: 'XML versionado',
          description: `${lot.guias} guia(s) na versão ${result.version.version}.`,
        });
        await loadData();
        return;
      }
      const xmlPath = lot.xmlPath || `tiss/lotes/${lot.nome}-${Date.now()}.xml`;
      const { error } = await supabase
        .from('billing_guides')
        .update({
          status: 'XML Gerado',
          xml_path: xmlPath,
          data_atualizacao: new Date().toISOString(),
        })
        .in('id', lot.guideIds);
      if (error) throw error;

      toast({
        title: 'XML preparado',
        description: `${lot.guias} guia(s) vinculadas a ${xmlPath}.`,
      });
      await loadData();
    } catch (error) {
      toast({ title: 'Erro ao preparar XML', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lotes de Faturamento</h1>
          <p className="text-gray-600 mt-2">
            Lotes persistentes com montagem, auditoria, XML, protocolo, retorno e recebimento
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          Atualizar
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Lotes de Faturamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Lote</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Convênio</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Criação</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Guias</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Recibo</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-500">
                      Carregando lotes...
                    </td>
                  </tr>
                )}
                {!loading && lotes.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-500">
                      Nenhum lote ou guia TISS encontrado.
                    </td>
                  </tr>
                )}
                {!loading &&
                  lotes.map((lote) => (
                    <tr key={lote.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono font-semibold">{lote.nome}</td>
                      <td className="py-3 px-4">{lote.convenio}</td>
                      <td className="py-3 px-4">{formatDate(lote.dataCriacao)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold">
                          {lote.guias}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(lote.valor)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusClasses[lote.status] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {lote.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {lote.recibo ? (
                          <span className="font-mono text-blue-600">{lote.recibo}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap justify-center gap-2">
                          {lote.xmlPath && (
                            <a
                              className="text-gray-600 hover:text-blue-600"
                              title="Visualizar XML"
                              href={lote.xmlPath}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Eye size={16} />
                            </a>
                          )}
                          <button
                            type="button"
                            className="text-gray-600 hover:text-green-600"
                            title="Preparar XML"
                            disabled={actionLoading}
                            onClick={() => prepareXml(lote)}
                          >
                            <Download size={16} />
                          </button>
                          <button
                            type="button"
                            className="text-gray-600 hover:text-indigo-600"
                            title="Faturar e gerar recebivel"
                            disabled={actionLoading}
                            onClick={() => updateLot(lote, 'Faturado')}
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            type="button"
                            className="text-gray-600 hover:text-blue-600"
                            title="Enviar"
                            disabled={actionLoading}
                            onClick={() => updateLot(lote, 'Enviado')}
                          >
                            <Send size={16} />
                          </button>
                          <button
                            type="button"
                            className="text-gray-600 hover:text-orange-600"
                            title="Reabrir"
                            disabled={actionLoading}
                            onClick={() => updateLot(lote, 'Aguardando XML')}
                          >
                            <RotateCcw size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Lotes em Montagem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {lotes.filter((l) => ['rascunho', 'draft', 'reopened'].includes(l.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Lotes Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {lotes.filter((l) => ['enviado', 'sent', 'protocolled'].includes(l.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Lotes Processados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {
                lotes.filter((l) => ['processado', 'processed', 'pago', 'paid'].includes(l.status))
                  .length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Guias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-700">{totalGuias}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
