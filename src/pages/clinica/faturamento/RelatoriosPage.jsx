// src/pages/clinica/faturamento/RelatoriosPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, BarChart3, Download, Loader2, TrendingUp } from 'lucide-react';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function monthKey(value) {
  return String(value || new Date().toISOString()).slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function buildCsv(rows) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
}

export default function RelatoriosPage() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('faturamento');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ guides: [], invoices: [], glosas: [], submissions: [] });

  const loadData = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [guidesResult, invoicesResult, glosasResult, submissionsResult] = await Promise.all([
        supabase.from('billing_guides').select('*').eq('clinic_id', clinicId),
        supabase.from('ar_invoices').select('*').eq('clinic_id', clinicId),
        supabase.from('receivable_glosas').select('*').eq('clinic_id', clinicId),
        supabase.from('tiss_submissions').select('*').eq('clinic_id', clinicId),
      ]);

      if (guidesResult.error) throw guidesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (glosasResult.error) throw glosasResult.error;
      if (submissionsResult.error) throw submissionsResult.error;

      setData({
        guides: guidesResult.data || [],
        invoices: invoicesResult.data || [],
        glosas: glosasResult.data || [],
        submissions: submissionsResult.data || [],
      });
    } catch (error) {
      toast({ title: 'Erro ao carregar relatórios', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const report = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentInvoices = data.invoices.filter((item) => monthKey(item.competency_date || item.invoice_date || item.created_at) === currentMonth);
    const billedMonth = currentInvoices.reduce((sum, item) => sum + Number(item.net_value || item.amount || item.gross_amount || 0), 0);
    const processedGuides = data.guides.filter((guide) => ['Enviado', 'XML Gerado', 'Pago', 'Processado'].includes(guide.status)).length;
    const sentAmount = data.glosas.reduce((sum, item) => sum + Number(item.sent_amount || 0), 0);
    const glossedAmount = data.glosas.reduce((sum, item) => sum + Number(item.glosa_amount || 0), 0);
    const ticketBase = data.guides.length || data.invoices.length || 1;
    const totalGuideValue = data.guides.reduce((sum, guide) => sum + Number(guide.valor || 0), 0);

    const periodMap = new Map();
    data.invoices.forEach((invoice) => {
      const key = monthKey(invoice.competency_date || invoice.invoice_date || invoice.created_at);
      const current = periodMap.get(key) || { key, value: 0, guides: 0, received: 0 };
      current.value += Number(invoice.net_value || invoice.amount || invoice.gross_amount || 0);
      current.received += Number(invoice.received_value || invoice.paid_total || 0);
      current.guides += invoice.guide_number ? 1 : 0;
      periodMap.set(key, current);
    });

    const glosaReasonMap = new Map();
    data.glosas.forEach((glosa) => {
      const reason = glosa.reason || 'Sem motivo informado';
      const current = glosaReasonMap.get(reason) || { reason, count: 0, value: 0 };
      current.count += 1;
      current.value += Number(glosa.glosa_amount || 0);
      glosaReasonMap.set(reason, current);
    });

    const submissionsWithDuration = data.submissions.filter((item) => item.created_at && item.updated_at);
    const averageHours = submissionsWithDuration.length
      ? submissionsWithDuration.reduce((sum, item) => sum + (new Date(item.updated_at) - new Date(item.created_at)) / 36e5, 0) / submissionsWithDuration.length
      : 0;

    return {
      billedMonth,
      processedGuides,
      sentGuides: data.guides.length,
      glosaRate: sentAmount > 0 ? (glossedAmount / sentAmount) * 100 : 0,
      glosaCount: data.glosas.length,
      averageTicket: (totalGuideValue || billedMonth) / ticketBase,
      periods: Array.from(periodMap.values()).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 12),
      glosaReasons: Array.from(glosaReasonMap.values()).sort((a, b) => b.value - a.value),
      performance: {
        averageHours,
        successRate: data.submissions.length
          ? (data.submissions.filter((item) => ['sent', 'accepted', 'processing'].includes(item.status)).length / data.submissions.length) * 100
          : 0,
        rejected: data.submissions.filter((item) => item.status === 'rejected').length,
      },
    };
  }, [data]);

  const exportCsv = () => {
    const rows = [
      ['Periodo', 'Faturado', 'Recebido', 'Guias vinculadas'],
      ...report.periods.map((item) => [monthLabel(item.key), item.value, item.received, item.guides]),
      [],
      ['Motivo glosa', 'Quantidade', 'Valor'],
      ...report.glosaReasons.map((item) => [item.reason, item.count, item.value]),
    ];
    const blob = new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-faturamento-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios de Faturamento</h1>
          <p className="text-gray-600 mt-2">Análises baseadas em guias, recebíveis, XML TISS e glosas reais</p>
        </div>
        <button type="button" onClick={exportCsv} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          <Download size={20} />
          Exportar CSV
        </button>
      </div>

      {loading && <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando dados...</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card><CardHeader><CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2"><BarChart3 size={16} />Faturado (Mês)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{formatCurrency(report.billedMonth)}</div><p className="text-xs text-gray-500 mt-2">Competência atual</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2"><TrendingUp size={16} />Guias Processadas</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-600">{report.processedGuides}</div><p className="text-xs text-gray-500 mt-2">De {report.sentGuides} guias</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2"><AlertTriangle size={16} />Taxa de Glosa</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-orange-600">{report.glosaRate.toFixed(1)}%</div><p className="text-xs text-gray-500 mt-2">{report.glosaCount} registros</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-gray-600">Ticket Médio</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-purple-600">{formatCurrency(report.averageTicket)}</div><p className="text-xs text-gray-500 mt-2">Por guia/recebível</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="faturamento">Faturamento por Período</TabsTrigger>
          <TabsTrigger value="glosas">Análise de Glosas</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="faturamento">
          <Card><CardHeader><CardTitle>Faturamento por Período</CardTitle></CardHeader><CardContent><div className="space-y-4">
            {report.periods.length === 0 && <p className="text-sm text-gray-500">Nenhum recebível encontrado no período.</p>}
            {report.periods.map((item) => <div key={item.key} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"><div><h3 className="font-semibold text-gray-900 capitalize">{monthLabel(item.key)}</h3><p className="text-sm text-gray-600">{item.guides} guias vinculadas</p></div><div className="text-right"><p className="font-bold text-lg text-green-600">{formatCurrency(item.value)}</p><span className="text-xs text-gray-500">Recebido: {formatCurrency(item.received)}</span></div></div>)}
          </div></CardContent></Card>
        </TabsContent>

        <TabsContent value="glosas">
          <Card><CardHeader><CardTitle>Análise de Glosas</CardTitle></CardHeader><CardContent><div className="space-y-4">
            {report.glosaReasons.length === 0 && <p className="text-sm text-gray-500">Nenhuma glosa registrada.</p>}
            {report.glosaReasons.map((item) => <div key={item.reason} className="flex justify-between items-center p-4 border rounded-lg"><div className="flex-1"><h3 className="font-semibold text-gray-900">{item.reason}</h3><p className="text-sm text-gray-500">{item.count} ocorrência(s)</p></div><div className="text-right ml-4"><p className="font-bold text-lg text-red-600">{formatCurrency(item.value)}</p></div></div>)}
          </div></CardContent></Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>Tempo de Processamento</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="p-3 border rounded-lg"><p className="text-sm text-gray-600">Tempo médio envio-recibo</p><p className="font-semibold text-gray-900 mt-1">{report.performance.averageHours ? `${report.performance.averageHours.toFixed(1)} horas` : 'Sem amostra'}</p></div><div className="p-3 border rounded-lg"><p className="text-sm text-gray-600">Submissões rejeitadas</p><p className="font-semibold text-gray-900 mt-1">{report.performance.rejected}</p></div></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Disponibilidade TISS</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="p-3 border rounded-lg"><p className="text-sm text-gray-600">Taxa sucesso envios</p><p className="font-semibold text-lg mt-1 text-green-600">{report.performance.successRate.toFixed(1)}%</p></div><div className="p-3 border rounded-lg"><p className="text-sm text-gray-600">Submissões registradas</p><p className="font-semibold text-lg mt-1 text-blue-600">{data.submissions.length}</p></div></div></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}