import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, CheckCircle, Clock, Eye, FileSpreadsheet, FileText, Package, Search, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getLotsAndGlosas } from '@/lib/faturamentoReportsApi';

function exportCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(String(value).slice(0, 10)).toLocaleDateString('pt-BR');
}

export default function RelatorioLotesGlosas() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [lotes, setLotes] = useState([]);
  const [glosas, setGlosas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataInicial, setDataInicial] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dataFinal, setDataFinal] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [convenioFilter, setConvenioFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('lotes');

  const fetchRelatorioData = async () => {
    setLoading(true);
    try {
      const result = await getLotsAndGlosas({ clinicId, startDate: dataInicial, endDate: dataFinal, statusFilter, payerFilter: convenioFilter });
      setLotes(result.lotes);
      setGlosas(result.glosas);
    } catch (error) {
      toast({ title: 'Erro', description: error.message || 'Nao foi possivel carregar o relatorio.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRelatorioData(); }, [dataInicial, dataFinal, statusFilter, convenioFilter, clinicId]);

  const totaisLotes = useMemo(() => lotes.reduce((acc, lote) => ({ total_guias: acc.total_guias + lote.total_guias, valor_apresentado: acc.valor_apresentado + lote.valor_apresentado, valor_processado: acc.valor_processado + lote.valor_processado, valor_glosado: acc.valor_glosado + lote.valor_glosado }), { total_guias: 0, valor_apresentado: 0, valor_processado: 0, valor_glosado: 0 }), [lotes]);
  const percentualGlosaGeral = totaisLotes.valor_apresentado > 0 ? (totaisLotes.valor_glosado / totaisLotes.valor_apresentado) * 100 : 0;

  const exportarCSV = () => {
    if (activeTab === 'lotes') {
      exportCsv(`relatorio-lotes-${dataInicial}-${dataFinal}.csv`, ['Lote', 'Convenio', 'Status', 'Guias', 'Valor Apresentado', 'Valor Processado', 'Valor Glosado', '% Glosa'], lotes.map((lote) => [lote.numero_lote, lote.convenio_nome, lote.status, lote.total_guias, lote.valor_apresentado.toFixed(2), lote.valor_processado.toFixed(2), lote.valor_glosado.toFixed(2), `${lote.percentual_glosa.toFixed(2)}%`]));
    } else {
      exportCsv(`relatorio-glosas-${dataInicial}-${dataFinal}.csv`, ['Lote', 'Convenio', 'Guia', 'Paciente', 'Procedimento', 'Valor Apresentado', 'Valor Glosado', 'Motivo', 'Status Recurso'], glosas.map((glosa) => [glosa.lote_numero, glosa.convenio_nome, glosa.guia_numero, glosa.paciente_nome, glosa.procedimento_nome, glosa.valor_apresentado.toFixed(2), glosa.valor_glosado.toFixed(2), glosa.motivo_glosa, glosa.status_recurso]));
    }
    toast({ title: 'Exportacao concluida', description: 'Relatorio exportado para CSV.' });
  };

  const getStatusBadge = (status) => {
    const config = { Aberto: { variant: 'secondary', color: 'text-blue-700', icon: Package }, Enviado: { variant: 'outline', color: 'text-yellow-700', icon: Clock }, Processado: { variant: 'default', color: 'text-green-700', icon: CheckCircle }, Rejeitado: { variant: 'destructive', color: 'text-red-700', icon: XCircle }, Pago: { variant: 'default', color: 'text-green-700', icon: CheckCircle }, Glosado: { variant: 'destructive', color: 'text-red-700', icon: AlertTriangle } }[status] || { variant: 'outline', color: 'text-gray-700', icon: Clock };
    const Icon = config.icon;
    return <Badge variant={config.variant} className={`${config.color} gap-1`}><Icon className="w-3 h-3" />{status}</Badge>;
  };
  const getRecursoBadge = (status) => <Badge variant={String(status).toLowerCase().includes('recuper') ? 'default' : 'outline'}>{status || 'Pendente'}</Badge>;
  const getGlosaBadge = (percentual) => percentual === 0 ? <Badge className="text-green-700">Sem Glosa</Badge> : percentual <= 5 ? <Badge variant="secondary">Baixa</Badge> : percentual <= 15 ? <Badge variant="outline">Moderada</Badge> : <Badge variant="destructive">Alta</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-orange-600" />Status de Lotes e Glosas</h1><p className="text-muted-foreground">Lotes derivados de `billing_guides` e glosas reais de `receivable_glosas`.</p></div><div className="flex gap-2"><Button variant="outline" onClick={exportarCSV} className="gap-2"><FileText className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={exportarCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />Planilha</Button></div></div>

      <Card><CardContent className="pt-6"><div className="flex flex-wrap gap-4 items-end"><div><Label htmlFor="data_inicial">Data Inicial</Label><Input id="data_inicial" type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} /></div><div><Label htmlFor="data_final">Data Final</Label><Input id="data_final" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} /></div><div><Label>Status do Lote</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="Aberto">Aberto</SelectItem><SelectItem value="Enviado">Enviado</SelectItem><SelectItem value="Processado">Processado</SelectItem><SelectItem value="Glosado">Glosado</SelectItem><SelectItem value="Pago">Pago</SelectItem></SelectContent></Select></div><div><Label>Convenio</Label><Input className="w-48" value={convenioFilter === 'all' ? '' : convenioFilter} onChange={(e) => setConvenioFilter(e.target.value || 'all')} placeholder="Todos" /></div><Button onClick={fetchRelatorioData} disabled={loading}><Search className="w-4 h-4 mr-2" />{loading ? 'Carregando...' : 'Atualizar'}</Button></div></CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4"><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{lotes.length}</div><p className="text-sm text-muted-foreground">Lotes</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totaisLotes.total_guias}</div><p className="text-sm text-muted-foreground">Guias</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">R$ {totaisLotes.valor_apresentado.toFixed(2)}</div><p className="text-sm text-muted-foreground">Apresentado</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">R$ {totaisLotes.valor_processado.toFixed(2)}</div><p className="text-sm text-muted-foreground">Processado</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">R$ {totaisLotes.valor_glosado.toFixed(2)}</div><p className="text-sm text-muted-foreground">Glosado</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-orange-600">{percentualGlosaGeral.toFixed(1)}%</div><p className="text-sm text-muted-foreground">% Glosa</p></CardContent></Card></div>

      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit"><Button variant={activeTab === 'lotes' ? 'default' : 'ghost'} onClick={() => setActiveTab('lotes')} className="gap-2"><Package className="w-4 h-4" />Lotes ({lotes.length})</Button><Button variant={activeTab === 'glosas' ? 'default' : 'ghost'} onClick={() => setActiveTab('glosas')} className="gap-2"><AlertTriangle className="w-4 h-4" />Glosas ({glosas.length})</Button></div>

      {activeTab === 'lotes' && <Card><CardHeader><CardTitle>Lotes TISS ({lotes.length})</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Lote</TableHead><TableHead>Convenio</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center">Guias</TableHead><TableHead className="text-right">Apresentado</TableHead><TableHead className="text-right">Processado</TableHead><TableHead className="text-right">Glosado</TableHead><TableHead className="text-center">% Glosa</TableHead><TableHead className="text-center">Acoes</TableHead></TableRow></TableHeader><TableBody>{lotes.map((lote) => <TableRow key={lote.lote_id}><TableCell className="font-mono text-sm"><div className="font-semibold">{lote.numero_lote}</div><div className="text-xs text-muted-foreground">Criado: {formatDate(lote.data_criacao)}</div></TableCell><TableCell><div className="font-medium">{lote.convenio_nome}</div>{lote.protocolo_envio && <div className="text-xs text-muted-foreground">{lote.protocolo_envio}</div>}</TableCell><TableCell className="text-center">{getStatusBadge(lote.status)}</TableCell><TableCell className="text-center"><div className="font-semibold">{lote.total_guias}</div>{lote.status === 'Processado' && <div className="text-xs"><span className="text-green-600">{lote.guias_aceitas}A</span> / <span className="text-red-600">{lote.guias_glosadas}G</span></div>}</TableCell><TableCell className="text-right font-semibold">R$ {lote.valor_apresentado.toFixed(2)}</TableCell><TableCell className="text-right font-semibold text-green-600">R$ {lote.valor_processado.toFixed(2)}</TableCell><TableCell className="text-right font-semibold text-red-600">R$ {lote.valor_glosado.toFixed(2)}</TableCell><TableCell className="text-center">{getGlosaBadge(lote.percentual_glosa)}<div className="text-sm font-semibold mt-1">{lote.percentual_glosa.toFixed(1)}%</div></TableCell><TableCell className="text-center"><Dialog><DialogTrigger asChild><Button size="sm" variant="outline"><Eye className="w-3 h-3 mr-1" />Detalhes</Button></DialogTrigger><DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide"><DialogHeader><DialogTitle>Detalhes do Lote {lote.numero_lote}</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4 text-sm"><div><Label>Convenio</Label><p>{lote.convenio_nome}</p></div><div><Label>Status</Label><div>{getStatusBadge(lote.status)}</div></div><div><Label>Data Envio</Label><p>{formatDate(lote.data_envio)}</p></div><div><Label>Protocolo</Label><p className="font-mono">{lote.protocolo_envio || '-'}</p></div><div className="col-span-2"><Label>Origem</Label><p>Lote operacional derivado de {lote.total_guias} guia(s) em billing_guides.</p></div></div></DialogContent></Dialog></TableCell></TableRow>)}{lotes.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum lote real encontrado.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>}

      {activeTab === 'glosas' && <Card><CardHeader><CardTitle>Glosas Detalhadas ({glosas.length})</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Lote / Guia</TableHead><TableHead>Paciente</TableHead><TableHead>Procedimento</TableHead><TableHead className="text-right">Apresentado</TableHead><TableHead className="text-right">Glosado</TableHead><TableHead>Motivo</TableHead><TableHead className="text-center">Recurso</TableHead><TableHead>Profissional</TableHead></TableRow></TableHeader><TableBody>{glosas.map((glosa) => <TableRow key={glosa.glosa_id}><TableCell><div className="font-mono text-xs">{glosa.lote_numero}</div><div className="font-mono text-xs text-muted-foreground">{glosa.guia_numero}</div><div className="text-xs text-muted-foreground">{formatDate(glosa.data_atendimento)}</div></TableCell><TableCell><div className="font-medium">{glosa.paciente_nome}</div><div className="text-sm text-muted-foreground">{glosa.convenio_nome}</div></TableCell><TableCell><div className="font-medium">{glosa.procedimento_nome}</div><div className="text-xs text-muted-foreground font-mono">{glosa.procedimento_codigo}</div></TableCell><TableCell className="text-right font-semibold">R$ {glosa.valor_apresentado.toFixed(2)}</TableCell><TableCell className="text-right font-semibold text-red-600">R$ {glosa.valor_glosado.toFixed(2)}</TableCell><TableCell><div className="font-medium">{glosa.motivo_glosa}</div><Badge variant="outline" className="text-xs mt-1">{glosa.codigo_glosa}</Badge></TableCell><TableCell className="text-center">{getRecursoBadge(glosa.status_recurso)}{glosa.data_recurso && <div className="text-xs text-muted-foreground mt-1">{formatDate(glosa.data_recurso)}</div>}</TableCell><TableCell><div className="font-medium">{glosa.profissional}</div>{glosa.observacoes && <div className="text-xs text-muted-foreground mt-1">{glosa.observacoes.substring(0, 50)}</div>}</TableCell></TableRow>)}{glosas.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma glosa real encontrada.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>}
    </div>
  );
}
