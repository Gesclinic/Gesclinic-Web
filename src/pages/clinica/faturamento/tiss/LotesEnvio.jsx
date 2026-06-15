import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Archive, CheckCircle, Download, FileText, Loader2, Package, RefreshCw, RotateCcw, Search, Send, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getOperationalLots, updateOperationalLot } from '@/lib/faturamentoReportsApi';

function formatDate(value) {
  if (!value) return '-';
  return new Date(String(value).slice(0, 10)).toLocaleDateString('pt-BR');
}

function statusBadge(status) {
  const variants = { Aberto: 'secondary', Fechado: 'outline', 'XML Gerado': 'default', Enviado: 'default', Processado: 'default', Rejeitado: 'destructive', Glosado: 'destructive', Pago: 'default' };
  return <Badge variant={variants[status] || 'outline'}>{status || 'Aberto'}</Badge>;
}

export default function LotesEnvio() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingKey, setUpdatingKey] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadLotes = async () => {
    setLoading(true);
    try {
      const rows = await getOperationalLots({ clinicId });
      setLotes(rows);
    } catch (error) {
      toast({ title: 'Erro', description: error.message || 'Nao foi possivel carregar os lotes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLotes(); }, [clinicId]);

  const filteredLotes = useMemo(() => lotes.filter((lote) => {
    const matchesStatus = statusFilter === 'all' || lote.status === statusFilter;
    const haystack = `${lote.numero_lote} ${lote.convenio_nome}`.toLowerCase();
    return matchesStatus && haystack.includes(searchTerm.toLowerCase());
  }), [lotes, statusFilter, searchTerm]);

  const totais = useMemo(() => lotes.reduce((acc, lote) => ({ total_guias: acc.total_guias + lote.total_guias, valor_total: acc.valor_total + lote.valor_total, abertos: acc.abertos + (lote.status === 'Aberto' ? 1 : 0), enviados: acc.enviados + (lote.status === 'Enviado' ? 1 : 0), processados: acc.processados + (lote.status === 'Processado' ? 1 : 0) }), { total_guias: 0, valor_total: 0, abertos: 0, enviados: 0, processados: 0 }), [lotes]);

  const updateLot = async (lote, status, xml = false) => {
    const key = lote.lote_id || lote.numero_lote;
    setUpdatingKey(key);
    try {
      await updateOperationalLot({ clinicId, lote, status, xml });
      toast({ title: 'Lote atualizado', description: `${lote.numero_lote} atualizado para ${status}.` });
      await loadLotes();
    } catch (error) {
      toast({ title: 'Erro', description: error.message || 'Nao foi possivel atualizar o lote.', variant: 'destructive' });
    } finally {
      setUpdatingKey(null);
    }
  };

  const baixarXml = (lote) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><loteTISS numero="${lote.numero_lote}" guias="${lote.total_guias}" valor="${lote.valor_total.toFixed(2)}" />`;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${lote.numero_lote}.xml`;
    link.click();
  };

  const ActionButton = ({ lote, status, xml, icon: Icon, children, variant = 'outline' }) => {
    const key = lote.lote_id || lote.numero_lote;
    return <Button size="sm" variant={variant} disabled={updatingKey === key} onClick={() => updateLot(lote, status, xml)}>{updatingKey === key ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Icon className="w-3 h-3 mr-1" />}{children}</Button>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-blue-600" />Lotes de Envio TISS</h1><p className="text-muted-foreground">Lotes operacionais derivados de `billing_guides` e atualizados diretamente nas guias.</p></div><div className="flex gap-2"><Button variant="outline" onClick={loadLotes} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Atualizar</Button><Dialog><DialogTrigger asChild><Button><Archive className="w-4 h-4 mr-2" />Origem dos Lotes</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Lotes derivados</DialogTitle><DialogDescription>Esta tela nao cria linhas em `billing_batches`. Cada lote aparece quando existem guias em `billing_guides` com a mesma competencia, convenio e lote/numero operacional.</DialogDescription></DialogHeader><DialogFooter><Button onClick={loadLotes}>Recarregar guias</Button></DialogFooter></DialogContent></Dialog></div></div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4"><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{lotes.length}</div><p className="text-sm text-muted-foreground">Lotes derivados</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totais.total_guias}</div><p className="text-sm text-muted-foreground">Guias</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">R$ {totais.valor_total.toFixed(2)}</div><p className="text-sm text-muted-foreground">Valor total</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-orange-600">{totais.abertos}</div><p className="text-sm text-muted-foreground">Abertos</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{totais.processados}</div><p className="text-sm text-muted-foreground">Processados</p></CardContent></Card></div>

      <Card><CardContent className="pt-6"><div className="flex flex-wrap gap-4 items-end"><div className="flex-1 min-w-64"><Label>Buscar</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Numero do lote ou convenio" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div><div><Label>Status</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="Aberto">Aberto</SelectItem><SelectItem value="Fechado">Fechado</SelectItem><SelectItem value="XML Gerado">XML Gerado</SelectItem><SelectItem value="Enviado">Enviado</SelectItem><SelectItem value="Processado">Processado</SelectItem><SelectItem value="Rejeitado">Rejeitado</SelectItem><SelectItem value="Glosado">Glosado</SelectItem><SelectItem value="Pago">Pago</SelectItem></SelectContent></Select></div></div></CardContent></Card>

      <Card><CardHeader><CardTitle>Lotes ({filteredLotes.length})</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Lote</TableHead><TableHead>Convenio</TableHead><TableHead>Competencia</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center">Guias</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Atualizacao</TableHead><TableHead className="text-right">Acoes</TableHead></TableRow></TableHeader><TableBody>{filteredLotes.map((lote) => <TableRow key={lote.lote_id}><TableCell><div className="font-mono font-semibold">{lote.numero_lote}</div><div className="text-xs text-muted-foreground">{lote.lote_id}</div></TableCell><TableCell>{lote.convenio_nome}</TableCell><TableCell>{lote.competencia}</TableCell><TableCell className="text-center">{statusBadge(lote.status)}</TableCell><TableCell className="text-center"><div className="font-semibold">{lote.total_guias}</div><div className="text-xs text-muted-foreground">{lote.guia_ids.length} guia(s)</div></TableCell><TableCell className="text-right font-semibold text-green-600">R$ {lote.valor_total.toFixed(2)}</TableCell><TableCell><div className="text-sm">{formatDate(lote.updated_at || lote.data_criacao)}</div><div className="text-xs text-muted-foreground">Criado: {formatDate(lote.data_criacao)}</div></TableCell><TableCell className="text-right"><div className="flex flex-wrap justify-end gap-2">{lote.status === 'Aberto' && <ActionButton lote={lote} status="Fechado" icon={CheckCircle}>Fechar</ActionButton>}{['Aberto', 'Fechado'].includes(lote.status) && <ActionButton lote={lote} status="XML Gerado" xml icon={FileText}>XML</ActionButton>}{['XML Gerado', 'Fechado'].includes(lote.status) && <ActionButton lote={lote} status="Enviado" icon={Send}>Enviado</ActionButton>}{lote.status !== 'Aberto' && <ActionButton lote={lote} status="Aberto" icon={RotateCcw}>Reabrir</ActionButton>}{lote.status === 'XML Gerado' && <Button size="sm" variant="outline" onClick={() => baixarXml(lote)}><Download className="w-3 h-3 mr-1" />Baixar</Button>}{lote.status === 'Rejeitado' && <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Revisar</Badge>}</div></TableCell></TableRow>)}{filteredLotes.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum lote derivado encontrado. Crie ou fature guias em `billing_guides` para que aparecam aqui.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </div>
  );
}
