import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Activity, BarChart3, Calendar, FileSpreadsheet, FileText, PieChart, Search, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getProductionByPeriod } from '@/lib/faturamentoReportsApi';

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
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR');
}

export default function RelatorioProducaoPeriodo() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [relatorioData, setRelatorioData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataInicial, setDataInicial] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dataFinal, setDataFinal] = useState(new Date().toISOString().split('T')[0]);
  const [agrupamento, setAgrupamento] = useState('diario');
  const [comparacao, setComparacao] = useState('periodo_anterior');

  const fetchRelatorioData = async () => {
    setLoading(true);
    try {
      const rows = await getProductionByPeriod({ clinicId, startDate: dataInicial, endDate: dataFinal, grouping: agrupamento });
      setRelatorioData(rows);
    } catch (error) {
      toast({ title: 'Erro', description: error.message || 'Nao foi possivel carregar o relatorio.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRelatorioData(); }, [dataInicial, dataFinal, agrupamento, comparacao, clinicId]);

  const totais = useMemo(() => relatorioData.reduce((acc, item) => ({ total_atendimentos: acc.total_atendimentos + item.total_atendimentos, total_procedimentos: acc.total_procedimentos + item.total_procedimentos, valor_bruto: acc.valor_bruto + item.valor_bruto, valor_desconto: acc.valor_desconto + item.valor_desconto, valor_liquido: acc.valor_liquido + item.valor_liquido }), { total_atendimentos: 0, total_procedimentos: 0, valor_bruto: 0, valor_desconto: 0, valor_liquido: 0 }), [relatorioData]);

  const exportarCSV = () => {
    exportCsv(`relatorio-producao-${agrupamento}-${dataInicial}-${dataFinal}.csv`, ['Periodo', 'Inicio', 'Fim', 'Atendimentos', 'Procedimentos', 'Valor Bruto', 'Desconto', 'Valor Liquido', 'Ticket Medio'], relatorioData.map((item) => [item.periodo, item.data_inicio || item.periodo, item.data_fim || item.periodo, item.total_atendimentos, item.total_procedimentos, item.valor_bruto.toFixed(2), item.valor_desconto.toFixed(2), item.valor_liquido.toFixed(2), item.ticket_medio.toFixed(2)]));
    toast({ title: 'Exportacao concluida', description: 'Relatorio exportado para CSV.' });
  };

  const getCrescimentoBadge = (crescimento) => crescimento > 0 ? <Badge variant="secondary" className="text-blue-700 gap-1"><TrendingUp className="w-3 h-3" />+{crescimento.toFixed(1)}%</Badge> : <Badge variant="outline" className="text-orange-700 gap-1"><TrendingDown className="w-3 h-3" />{crescimento.toFixed(1)}%</Badge>;
  const getMetaBadge = (atingimento) => atingimento >= 100 ? <Badge className="text-green-700">Meta Atingida</Badge> : <Badge variant="outline">Acompanhando</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><PieChart className="w-6 h-6 text-blue-600" />Producao por Periodo</h1><p className="text-muted-foreground">Analise temporal real baseada nos recebiveis do Faturamento 360.</p></div><div className="flex gap-2"><Button variant="outline" onClick={exportarCSV} className="gap-2"><FileText className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={exportarCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />Planilha</Button></div></div>

      <Card><CardContent className="pt-6"><div className="flex flex-wrap gap-4 items-end"><div><Label htmlFor="data_inicial">Data Inicial</Label><Input id="data_inicial" type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} /></div><div><Label htmlFor="data_final">Data Final</Label><Input id="data_final" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} /></div><div><Label>Agrupamento</Label><Select value={agrupamento} onValueChange={setAgrupamento}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="diario">Diario</SelectItem><SelectItem value="semanal">Semanal</SelectItem><SelectItem value="mensal">Mensal</SelectItem></SelectContent></Select></div><div><Label>Comparacao</Label><Select value={comparacao} onValueChange={setComparacao}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="periodo_anterior">Periodo anterior</SelectItem><SelectItem value="media_historica">Media historica</SelectItem></SelectContent></Select></div><Button onClick={fetchRelatorioData} disabled={loading}><Search className="w-4 h-4 mr-2" />{loading ? 'Carregando...' : 'Gerar Relatorio'}</Button></div></CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4"><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{relatorioData.length}</div><p className="text-sm text-muted-foreground">Periodos</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totais.total_atendimentos}</div><p className="text-sm text-muted-foreground">Atendimentos</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totais.total_procedimentos}</div><p className="text-sm text-muted-foreground">Procedimentos</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">R$ {totais.valor_liquido.toFixed(2)}</div><p className="text-sm text-muted-foreground">Valor Liquido</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">R$ {relatorioData.length ? (totais.valor_liquido / relatorioData.length).toFixed(2) : '0.00'}</div><p className="text-sm text-muted-foreground">Media por Periodo</p></CardContent></Card></div>

      <Card><CardHeader><CardTitle className="flex items-center gap-2">{agrupamento === 'diario' ? <Calendar className="w-5 h-5" /> : agrupamento === 'semanal' ? <BarChart3 className="w-5 h-5" /> : <Activity className="w-5 h-5" />}Producao {agrupamento}</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Periodo</TableHead><TableHead>Intervalo</TableHead><TableHead className="text-center">Atend.</TableHead><TableHead className="text-center">Proced.</TableHead><TableHead className="text-right">Valor Liquido</TableHead><TableHead className="text-right">Ticket Medio</TableHead><TableHead className="text-right">Prod./Hora</TableHead><TableHead className="text-center">Variacao</TableHead></TableRow></TableHeader><TableBody>{relatorioData.map((item) => <TableRow key={`${item.periodo}-${item.data_inicio}`}><TableCell className="font-semibold">{item.periodo}</TableCell><TableCell className="text-sm">{formatDate(item.data_inicio || item.periodo)} ate {formatDate(item.data_fim || item.periodo)}</TableCell><TableCell className="text-center font-semibold">{item.total_atendimentos}</TableCell><TableCell className="text-center">{item.total_procedimentos}</TableCell><TableCell className="text-right font-semibold text-green-600">R$ {item.valor_liquido.toFixed(2)}</TableCell><TableCell className="text-right">R$ {item.ticket_medio.toFixed(2)}</TableCell><TableCell className="text-right">R$ {item.produtividade_hora.toFixed(2)}</TableCell><TableCell className="text-center">{getCrescimentoBadge(item.crescimento_dia_anterior || item.crescimento_semana_anterior || item.crescimento_mes_anterior || 0)}</TableCell></TableRow>)}{relatorioData.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum dado real encontrado para o periodo selecionado.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>

      {agrupamento === 'mensal' && relatorioData.length > 0 && <Card><CardHeader><CardTitle>Metas Mensais</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Mes</TableHead><TableHead className="text-right">Meta Realizada</TableHead><TableHead className="text-center">Atingimento</TableHead><TableHead className="text-right">Media Diaria</TableHead></TableRow></TableHeader><TableBody>{relatorioData.map((item) => <TableRow key={`meta-${item.periodo}`}><TableCell>{item.periodo}</TableCell><TableCell className="text-right">R$ {item.meta_mensal.toFixed(2)}</TableCell><TableCell className="text-center">{getMetaBadge(item.atingimento_meta)}</TableCell><TableCell className="text-right">R$ {item.media_diaria.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}

      {agrupamento === 'diario' && relatorioData.length > 0 && <Card><CardHeader><CardTitle>Distribuicao por Convenio por Dia</CardTitle></CardHeader><CardContent><div className="space-y-4">{relatorioData.slice(0, 5).map((dia) => <div key={`conv-${dia.periodo}`} className="border rounded-lg p-4"><h3 className="font-semibold mb-3">{formatDate(dia.periodo)} - {dia.dia_semana}</h3><Table><TableHeader><TableRow><TableHead>Convenio</TableHead><TableHead className="text-center">Atend.</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Participacao</TableHead></TableRow></TableHeader><TableBody>{dia.principais_convenios.map((conv) => <TableRow key={conv.nome}><TableCell>{conv.nome}</TableCell><TableCell className="text-center">{conv.atendimentos}</TableCell><TableCell className="text-right font-semibold text-green-600">R$ {conv.valor.toFixed(2)}</TableCell><TableCell className="text-center"><Badge variant="outline">{dia.valor_liquido ? ((conv.valor / dia.valor_liquido) * 100).toFixed(1) : '0.0'}%</Badge></TableCell></TableRow>)}</TableBody></Table></div>)}</div></CardContent></Card>}

      {relatorioData.length === 0 && <Card><CardContent className="py-16"><div className="text-center text-muted-foreground"><Zap className="w-12 h-12 mx-auto mb-4 opacity-50" /><p className="text-lg">Nenhum dado encontrado para o periodo selecionado.</p></div></CardContent></Card>}
    </div>
  );
}
