import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ChartBar, FileSpreadsheet, FileText, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getProductionByPayer } from '@/lib/faturamentoReportsApi';

function exportCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export default function RelatorioProducaoConvenio() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [relatorioData, setRelatorioData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataInicial, setDataInicial] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dataFinal, setDataFinal] = useState(new Date().toISOString().split('T')[0]);
  const [convenioFilter, setConvenioFilter] = useState('all');

  const fetchRelatorioData = async () => {
    setLoading(true);
    try {
      const rows = await getProductionByPayer({
        clinicId,
        startDate: dataInicial,
        endDate: dataFinal,
        payerFilter: convenioFilter,
      });
      setRelatorioData(rows);
    } catch (error) {
      toast({ title: 'Erro', description: error.message || 'Nao foi possivel carregar o relatorio.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorioData();
  }, [dataInicial, dataFinal, convenioFilter, clinicId]);

  const totais = useMemo(() => relatorioData.reduce((acc, item) => ({
    total_guias: acc.total_guias + item.total_guias,
    total_procedimentos: acc.total_procedimentos + item.total_procedimentos,
    valor_bruto: acc.valor_bruto + item.valor_bruto,
    valor_desconto: acc.valor_desconto + item.valor_desconto,
    valor_liquido: acc.valor_liquido + item.valor_liquido,
  }), { total_guias: 0, total_procedimentos: 0, valor_bruto: 0, valor_desconto: 0, valor_liquido: 0 }), [relatorioData]);

  const exportarCSV = () => {
    exportCsv(`relatorio-producao-convenio-${dataInicial}-${dataFinal}.csv`, ['Convenio', 'Tipo', 'Guias', 'Procedimentos', 'Valor Bruto', 'Desconto', 'Valor Liquido', 'Participacao', 'Valor Medio'], relatorioData.map((item) => [item.convenio_nome, item.tipo_convenio, item.total_guias, item.total_procedimentos, item.valor_bruto.toFixed(2), item.valor_desconto.toFixed(2), item.valor_liquido.toFixed(2), `${item.percentual_total.toFixed(1)}%`, item.valor_medio_guia.toFixed(2)]));
    toast({ title: 'Exportacao concluida', description: 'Relatorio exportado para CSV.' });
  };

  const getStatusBadge = (pagas, total) => {
    const percentual = total > 0 ? (pagas / total) * 100 : 0;
    if (percentual >= 90) return <Badge className="text-green-700">Excelente</Badge>;
    if (percentual >= 70) return <Badge variant="secondary" className="text-blue-700">Bom</Badge>;
    return <Badge variant="outline" className="text-orange-700">Atencao</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ChartBar className="w-6 h-6 text-blue-600" />Producao por Convenio</h1>
          <p className="text-muted-foreground">Dados reais de `ar_invoices` e `billing_guides` no periodo selecionado.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarCSV} className="gap-2"><FileText className="w-4 h-4" />CSV</Button>
          <Button variant="outline" onClick={exportarCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />Planilha</Button>
        </div>
      </div>

      <Card><CardContent className="pt-6"><div className="flex flex-wrap gap-4 items-end">
        <div><Label htmlFor="data_inicial">Data Inicial</Label><Input id="data_inicial" type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} /></div>
        <div><Label htmlFor="data_final">Data Final</Label><Input id="data_final" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} /></div>
        <div><Label>Tipo</Label><Select value={convenioFilter} onValueChange={setConvenioFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="medico">Convenios</SelectItem><SelectItem value="particular">Particular</SelectItem></SelectContent></Select></div>
        <Button onClick={fetchRelatorioData} disabled={loading}><Search className="w-4 h-4 mr-2" />{loading ? 'Carregando...' : 'Gerar Relatorio'}</Button>
      </div></CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totais.total_guias}</div><p className="text-sm text-muted-foreground">Total de Guias</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totais.total_procedimentos}</div><p className="text-sm text-muted-foreground">Procedimentos</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">R$ {totais.valor_bruto.toFixed(2)}</div><p className="text-sm text-muted-foreground">Valor Bruto</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">R$ {totais.valor_desconto.toFixed(2)}</div><p className="text-sm text-muted-foreground">Descontos</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">R$ {totais.valor_liquido.toFixed(2)}</div><p className="text-sm text-muted-foreground">Valor Liquido</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Producao por Convenio ({relatorioData.length})</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Convenio</TableHead><TableHead className="text-center">Guias</TableHead><TableHead className="text-center">Procedimentos</TableHead><TableHead className="text-right">Bruto</TableHead><TableHead className="text-right">Desconto</TableHead><TableHead className="text-right">Liquido</TableHead><TableHead className="text-center">Participacao</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Medio</TableHead></TableRow></TableHeader><TableBody>
        {relatorioData.map((item) => (<TableRow key={item.convenio_id}><TableCell><div className="font-medium">{item.convenio_nome}</div><Badge variant="outline" className="text-xs">{item.tipo_convenio}</Badge></TableCell><TableCell className="text-center"><div className="font-semibold">{item.total_guias}</div><div className="text-xs text-muted-foreground">{item.guias_pagas}P / {item.guias_pendentes}Pe / {item.guias_glosadas}G</div></TableCell><TableCell className="text-center font-semibold">{item.total_procedimentos}</TableCell><TableCell className="text-right font-semibold">R$ {item.valor_bruto.toFixed(2)}</TableCell><TableCell className="text-right text-red-600">-R$ {item.valor_desconto.toFixed(2)}</TableCell><TableCell className="text-right font-bold text-green-600">R$ {item.valor_liquido.toFixed(2)}</TableCell><TableCell className="text-center"><div className="flex items-center justify-center gap-1">{item.percentual_total >= 25 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-orange-600" />}<span className="font-semibold">{item.percentual_total}%</span></div></TableCell><TableCell className="text-center">{getStatusBadge(item.guias_pagas, item.total_guias)}</TableCell><TableCell className="text-right font-semibold">R$ {item.valor_medio_guia.toFixed(2)}</TableCell></TableRow>))}
        {relatorioData.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum dado real encontrado para o periodo selecionado.</TableCell></TableRow>}
      </TableBody></Table></CardContent></Card>

      {relatorioData.length > 0 && <Card><CardHeader><CardTitle>Principais Procedimentos por Convenio</CardTitle></CardHeader><CardContent><div className="space-y-4">{relatorioData.map((convenio) => <div key={convenio.convenio_id} className="border rounded-lg p-4"><h3 className="font-semibold mb-3">{convenio.convenio_nome}</h3><Table><TableHeader><TableRow><TableHead>Codigo</TableHead><TableHead>Procedimento</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{convenio.procedimentos_principais.map((proc, index) => <TableRow key={`${proc.codigo}-${index}`}><TableCell className="font-mono text-sm">{proc.codigo || '-'}</TableCell><TableCell>{proc.nome}</TableCell><TableCell className="text-center">{proc.quantidade}</TableCell><TableCell className="text-right font-semibold text-green-600">R$ {proc.valor_total.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></div>)}</div></CardContent></Card>}
    </div>
  );
}
