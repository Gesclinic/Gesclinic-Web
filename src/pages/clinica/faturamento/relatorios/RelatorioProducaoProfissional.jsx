import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Award, FileSpreadsheet, FileText, Search, Target, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getProductionByProfessional } from '@/lib/faturamentoReportsApi';

function exportCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function initials(name) {
  return String(name || 'PN').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export default function RelatorioProducaoProfissional() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [relatorioData, setRelatorioData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataInicial, setDataInicial] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dataFinal, setDataFinal] = useState(new Date().toISOString().split('T')[0]);
  const [especialidadeFilter, setEspecialidadeFilter] = useState('all');
  const [profissionalFilter, setProfissionalFilter] = useState('all');

  const fetchRelatorioData = async () => {
    setLoading(true);
    try {
      const rows = await getProductionByProfessional({ clinicId, startDate: dataInicial, endDate: dataFinal, specialtyFilter: especialidadeFilter, professionalFilter: profissionalFilter });
      setRelatorioData(rows.map((row, index) => ({ ...row, ranking_mensal: index + 1 })));
    } catch (error) {
      toast({ title: 'Erro', description: error.message || 'Nao foi possivel carregar o relatorio.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRelatorioData(); }, [dataInicial, dataFinal, especialidadeFilter, profissionalFilter, clinicId]);

  const profissionais = useMemo(() => relatorioData.map((row) => ({ id: row.profissional_id, nome: row.nome })), [relatorioData]);
  const especialidades = useMemo(() => Array.from(new Set(relatorioData.map((row) => row.especialidade).filter(Boolean))), [relatorioData]);
  const totais = useMemo(() => relatorioData.reduce((acc, item) => ({ total_atendimentos: acc.total_atendimentos + item.total_atendimentos, total_procedimentos: acc.total_procedimentos + item.total_procedimentos, valor_bruto: acc.valor_bruto + item.valor_bruto, valor_desconto: acc.valor_desconto + item.valor_desconto, valor_liquido: acc.valor_liquido + item.valor_liquido, horas_trabalhadas: acc.horas_trabalhadas + item.horas_trabalhadas }), { total_atendimentos: 0, total_procedimentos: 0, valor_bruto: 0, valor_desconto: 0, valor_liquido: 0, horas_trabalhadas: 0 }), [relatorioData]);

  const exportarCSV = () => {
    exportCsv(`relatorio-producao-profissional-${dataInicial}-${dataFinal}.csv`, ['Ranking', 'Profissional', 'Especialidade', 'Atendimentos', 'Procedimentos', 'Valor Bruto', 'Desconto', 'Valor Liquido', 'Produtividade/Hora'], relatorioData.map((item, index) => [index + 1, item.nome, item.especialidade, item.total_atendimentos, item.total_procedimentos, item.valor_bruto.toFixed(2), item.valor_desconto.toFixed(2), item.valor_liquido.toFixed(2), item.produtividade_hora.toFixed(2)]));
    toast({ title: 'Exportacao concluida', description: 'Relatorio exportado para CSV.' });
  };

  const getRankingBadge = (ranking) => ranking === 1 ? <Badge className="bg-yellow-500 text-white gap-1"><Award className="w-3 h-3" />1o Lugar</Badge> : ranking <= 3 ? <Badge variant="secondary" className="text-blue-700 gap-1"><Award className="w-3 h-3" />Top 3</Badge> : <Badge variant="outline">{ranking}o</Badge>;
  const getMetaBadge = (atingimento) => atingimento >= 100 ? <Badge className="text-green-700">Meta real</Badge> : <Badge variant="outline">Em acompanhamento</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" />Producao por Profissional</h1><p className="text-muted-foreground">Ranking real derivado de `ar_invoices` e do evento faturavel 360.</p></div><div className="flex gap-2"><Button variant="outline" onClick={exportarCSV} className="gap-2"><FileText className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={exportarCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />Planilha</Button></div></div>

      <Card><CardContent className="pt-6"><div className="flex flex-wrap gap-4 items-end"><div><Label htmlFor="data_inicial">Data Inicial</Label><Input id="data_inicial" type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} /></div><div><Label htmlFor="data_final">Data Final</Label><Input id="data_final" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} /></div><div><Label>Especialidade</Label><Select value={especialidadeFilter} onValueChange={setEspecialidadeFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{especialidades.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div><Label>Profissional</Label><Select value={profissionalFilter} onValueChange={setProfissionalFilter}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{profissionais.map((prof) => <SelectItem key={prof.id} value={prof.id}>{prof.nome}</SelectItem>)}</SelectContent></Select></div><Button onClick={fetchRelatorioData} disabled={loading}><Search className="w-4 h-4 mr-2" />{loading ? 'Carregando...' : 'Gerar Relatorio'}</Button></div></CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4"><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{relatorioData.length}</div><p className="text-sm text-muted-foreground">Profissionais</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totais.total_atendimentos}</div><p className="text-sm text-muted-foreground">Atendimentos</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totais.total_procedimentos}</div><p className="text-sm text-muted-foreground">Procedimentos</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">R$ {totais.valor_bruto.toFixed(2)}</div><p className="text-sm text-muted-foreground">Valor Bruto</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">R$ {totais.valor_liquido.toFixed(2)}</div><p className="text-sm text-muted-foreground">Valor Liquido</p></CardContent></Card><Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totais.horas_trabalhadas.toFixed(1)}h</div><p className="text-sm text-muted-foreground">Horas Estimadas</p></CardContent></Card></div>

      <Card><CardHeader><CardTitle>Ranking de Producao ({relatorioData.length})</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Ranking</TableHead><TableHead>Profissional</TableHead><TableHead className="text-center">Atendimentos</TableHead><TableHead className="text-center">Procedimentos</TableHead><TableHead className="text-right">Valor Liquido</TableHead><TableHead className="text-center">Meta</TableHead><TableHead className="text-right">Produtividade/Hora</TableHead><TableHead className="text-center">Performance</TableHead></TableRow></TableHeader><TableBody>{relatorioData.map((item, index) => <TableRow key={item.profissional_id}><TableCell>{getRankingBadge(index + 1)}</TableCell><TableCell><div className="flex items-center gap-3"><Avatar><AvatarImage src="" /><AvatarFallback>{initials(item.nome)}</AvatarFallback></Avatar><div><div className="font-medium">{item.nome}</div><div className="text-sm text-muted-foreground">{item.crm || 'Sem conselho'} - {item.especialidade}</div></div></div></TableCell><TableCell className="text-center"><div className="font-semibold">{item.total_atendimentos}</div><div className="text-xs text-muted-foreground">Media: R$ {item.valor_medio_atendimento.toFixed(0)}</div></TableCell><TableCell className="text-center font-semibold">{item.total_procedimentos}</TableCell><TableCell className="text-right"><div className="font-bold text-green-600">R$ {item.valor_liquido.toFixed(2)}</div><div className="text-xs text-muted-foreground">{item.participacao_percentual}% do total</div></TableCell><TableCell className="text-center"><div className="space-y-1">{getMetaBadge(item.atingimento_meta)}<div className="text-xs">R$ {item.meta_mensal.toFixed(0)}</div></div></TableCell><TableCell className="text-right"><div className="font-semibold">R$ {item.produtividade_hora.toFixed(2)}</div><div className="text-xs text-muted-foreground">{item.horas_trabalhadas}h estimadas</div></TableCell><TableCell className="text-center">{item.atingimento_meta >= 100 ? <Target className="w-5 h-5 text-blue-600 mx-auto" /> : item.valor_liquido > 0 ? <TrendingUp className="w-5 h-5 text-green-600 mx-auto" /> : <TrendingDown className="w-5 h-5 text-orange-600 mx-auto" />}</TableCell></TableRow>)}{relatorioData.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum dado real encontrado para o periodo selecionado.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>

      {relatorioData.length > 0 && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card><CardHeader><CardTitle>Distribuicao por Convenio</CardTitle></CardHeader><CardContent><div className="space-y-4">{relatorioData.slice(0, 3).map((prof) => <div key={prof.profissional_id} className="border rounded-lg p-4"><h4 className="font-semibold mb-3">{prof.nome}</h4><Table><TableHeader><TableRow><TableHead>Convenio</TableHead><TableHead className="text-center">Atend.</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{prof.distribuicao_convenios.map((conv) => <TableRow key={conv.convenio}><TableCell>{conv.convenio}</TableCell><TableCell className="text-center">{conv.atendimentos}</TableCell><TableCell className="text-right font-semibold text-green-600">R$ {conv.valor.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Principais Procedimentos</CardTitle></CardHeader><CardContent><div className="space-y-4">{relatorioData.slice(0, 3).map((prof) => <div key={prof.profissional_id} className="border rounded-lg p-4"><h4 className="font-semibold mb-3">{prof.nome}</h4><Table><TableHeader><TableRow><TableHead>Codigo</TableHead><TableHead>Procedimento</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{prof.procedimentos_principais.map((proc, index) => <TableRow key={`${proc.codigo}-${index}`}><TableCell className="font-mono text-xs">{proc.codigo || '-'}</TableCell><TableCell className="text-sm">{proc.nome}</TableCell><TableCell className="text-center">{proc.quantidade}</TableCell><TableCell className="text-right font-semibold text-green-600">R$ {proc.valor_total.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></div>)}</div></CardContent></Card></div>}
    </div>
  );
}
