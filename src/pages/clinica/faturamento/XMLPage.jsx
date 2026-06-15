import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, FileText, Loader2, RefreshCw, Send, Upload } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { loadFaturamentoOperationalData, markGuideAsSent } from '@/lib/faturamentoOperationalApi';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function lotKey(guide) {
  return guide.xml_path || `${String(guide.data_criacao || '').slice(0, 7) || 'sem-competencia'}-${guide.convenio || 'particular'}`;
}

function buildLots(guides) {
  const map = new Map();
  for (const guide of guides) {
    const key = lotKey(guide);
    const current = map.get(key) || {
      id: key,
      lote: key.split('/').pop()?.replace('.xml', '') || key,
      guias: [],
      data: guide.data_criacao,
      status: guide.xml_path ? 'Pronto para envio' : 'Aguardando XML',
      xmlPath: guide.xml_path || null,
    };
    current.guias.push(guide);
    current.xmlPath = current.xmlPath || guide.xml_path || null;
    if (String(guide.status || '').toLowerCase().includes('envi')) current.status = 'Enviado';
    if (String(guide.status || '').toLowerCase().includes('process')) current.status = 'Em processamento';
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => String(b.data).localeCompare(String(a.data)));
}

export default function XMLPage() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pendentes');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [data, setData] = useState({ guides: [], submissions: [] });
  const [lastPreparedBatch, setLastPreparedBatch] = useState(null);

  const loadData = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      setData(await loadFaturamentoOperationalData(clinicId));
    } catch (error) {
      toast({ title: 'Erro ao carregar XML TISS', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const lots = useMemo(() => buildLots(data.guides || []), [data.guides]);
  const pendingLots = lots.filter((lot) => lot.status !== 'Enviado' && lot.status !== 'Em processamento');
  const sentLots = lots.filter((lot) => lot.status === 'Enviado');
  const processingLots = lots.filter((lot) => lot.status === 'Em processamento');

  const prepareXml = async (lot) => {
    setActionLoadingId(lot.id);
    try {
      const xmlPath = lot.xmlPath || `tiss/guias/${lot.lote}-${Date.now()}.xml`;
      const { error } = await supabase
        .from('billing_guides')
        .update({ status: 'XML Gerado', xml_path: xmlPath, data_atualizacao: new Date().toISOString() })
        .eq('clinic_id', clinicId)
        .in('id', lot.guias.map((guide) => guide.id));
      if (error) throw error;
      setLastPreparedBatch({ lote: lot.lote, guias: lot.guias.length, fileName: xmlPath });
      toast({ title: 'XML preparado', description: `${lot.guias.length} guia(s) prontas para envio.` });
      await loadData();
    } catch (error) {
      toast({ title: 'Erro ao preparar XML', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const sendLot = async (lot) => {
    setActionLoadingId(lot.id);
    try {
      await Promise.all(lot.guias.map((guide) => markGuideAsSent(clinicId, guide)));
      toast({ title: 'XML enviado', description: 'Guias enviadas e recebiveis sincronizados com Contas a Receber.' });
      setActiveTab('enviados');
      await loadData();
    } catch (error) {
      toast({ title: 'Erro ao enviar XML', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderLots = (rows, emptyText, allowActions = false) => (
    <Card>
      <CardHeader><CardTitle>{emptyText.includes('Hist') ? 'Historico de Envios' : 'Lotes TISS'}</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rows.length === 0 && <p className="text-sm text-gray-500">{emptyText}</p>}
          {rows.map((lot) => (
            <div key={lot.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="font-semibold text-gray-900">{lot.lote}</h3>
                <p className="text-sm text-gray-600">{lot.guias.length} guias - {formatDate(lot.data)}</p>
                <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${lot.status === 'Enviado' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{lot.status}</span>
              </div>
              {allowActions && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={actionLoadingId === lot.id} onClick={() => prepareXml(lot)} className="gap-2"><Upload size={16} />Preparar</Button>
                  <Button size="sm" disabled={actionLoadingId === lot.id} onClick={() => sendLot(lot)} className="gap-2"><Send size={16} />Enviar</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Envio de XML TISS</h1>
          <p className="text-gray-600 mt-2">Gere XML a partir das guias e envie mantendo o recebivel financeiro sincronizado</p>
        </div>
        <Button type="button" variant="outline" onClick={loadData} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      {lastPreparedBatch && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <CheckCircle className="mt-0.5 h-5 w-5 text-green-700" />
          <div><p className="font-semibold">Envio preparado para {lastPreparedBatch.lote}</p><p>{lastPreparedBatch.guias} guias vinculadas ao arquivo {lastPreparedBatch.fileName}.</p></div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="pendentes">Pendentes ({pendingLots.length})</TabsTrigger>
          <TabsTrigger value="enviados">Enviados ({sentLots.length})</TabsTrigger>
          <TabsTrigger value="processamento">Em Processamento ({processingLots.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes">{renderLots(pendingLots, 'Nenhum lote pendente de XML.', true)}</TabsContent>
        <TabsContent value="enviados">{renderLots(sentLots, 'Historico de envios vazio.')}</TabsContent>
        <TabsContent value="processamento">{renderLots(processingLots, 'Nenhum lote em processamento.')}</TabsContent>
      </Tabs>

      <Card>
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <FileText className="mt-0.5 h-4 w-4" />
          Esta tela nao cria tabela de lotes: os lotes sao derivados das guias existentes em billing_guides.
        </CardContent>
      </Card>
    </div>
  );
}
