import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  PieChart,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Search,
  BarChart3,
  Activity,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Relatório de Produção por Período
 * Análise comparativa de diferentes períodos (diário, semanal, mensal)
 */
export default function RelatorioProducaoPeriodo() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [relatorioData, setRelatorioData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataInicial, setDataInicial] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  );
  const [dataFinal, setDataFinal] = useState(new Date().toISOString().split('T')[0]);
  const [agrupamento, setAgrupamento] = useState('diario');
  const [comparacao, setComparacao] = useState('periodo_anterior');

  // Mock data para demonstração
  const mockRelatorioData = {
    diario: [
      {
        periodo: '2025-01-30',
        dia_semana: 'Quinta-feira',
        total_atendimentos: 45,
        total_procedimentos: 78,
        valor_bruto: 12850.0,
        valor_desconto: 642.5,
        valor_liquido: 12207.5,
        numero_profissionais: 8,
        horas_funcionamento: 10,
        produtividade_hora: 1220.75,
        ticket_medio: 285.5,
        crescimento_dia_anterior: 8.5,
        principais_convenios: [
          { nome: 'Unimed', atendimentos: 18, valor: 5400.0 },
          { nome: 'Bradesco', atendimentos: 12, valor: 3600.0 },
          { nome: 'Particular', atendimentos: 10, valor: 3000.0 },
        ],
      },
      {
        periodo: '2025-01-29',
        dia_semana: 'Quarta-feira',
        total_atendimentos: 42,
        total_procedimentos: 68,
        valor_bruto: 11550.0,
        valor_desconto: 577.5,
        valor_liquido: 10972.5,
        numero_profissionais: 7,
        horas_funcionamento: 9,
        produtividade_hora: 1219.17,
        ticket_medio: 275.0,
        crescimento_dia_anterior: -5.2,
        principais_convenios: [
          { nome: 'Unimed', atendimentos: 16, valor: 4800.0 },
          { nome: 'SulAmérica', atendimentos: 14, valor: 4200.0 },
          { nome: 'Particular', atendimentos: 8, valor: 2400.0 },
        ],
      },
      {
        periodo: '2025-01-28',
        dia_semana: 'Terça-feira',
        total_atendimentos: 38,
        total_procedimentos: 62,
        valor_bruto: 10450.0,
        valor_desconto: 522.5,
        valor_liquido: 9927.5,
        numero_profissionais: 6,
        horas_funcionamento: 8,
        produtividade_hora: 1240.94,
        ticket_medio: 275.0,
        crescimento_dia_anterior: 12.3,
        principais_convenios: [
          { nome: 'Bradesco', atendimentos: 15, valor: 4500.0 },
          { nome: 'Unimed', atendimentos: 12, valor: 3600.0 },
          { nome: 'Amil', atendimentos: 8, valor: 2400.0 },
        ],
      },
    ],
    semanal: [
      {
        periodo: 'Semana 5/2025',
        data_inicio: '2025-01-27',
        data_fim: '2025-01-31',
        total_atendimentos: 210,
        total_procedimentos: 365,
        valor_bruto: 58750.0,
        valor_desconto: 2937.5,
        valor_liquido: 55812.5,
        dias_funcionamento: 5,
        media_diaria: 11162.5,
        crescimento_semana_anterior: 15.3,
        melhor_dia: { dia: 'Quinta-feira', valor: 12207.5 },
        pior_dia: { dia: 'Segunda-feira', valor: 8950.0 },
      },
      {
        periodo: 'Semana 4/2025',
        data_inicio: '2025-01-20',
        data_fim: '2025-01-24',
        total_atendimentos: 185,
        total_procedimentos: 320,
        valor_bruto: 51250.0,
        valor_desconto: 2562.5,
        valor_liquido: 48687.5,
        dias_funcionamento: 5,
        media_diaria: 9737.5,
        crescimento_semana_anterior: -8.2,
        melhor_dia: { dia: 'Sexta-feira', valor: 11500.0 },
        pior_dia: { dia: 'Segunda-feira', valor: 7800.0 },
      },
    ],
    mensal: [
      {
        periodo: 'Janeiro/2025',
        total_atendimentos: 890,
        total_procedimentos: 1450,
        valor_bruto: 245750.0,
        valor_desconto: 12287.5,
        valor_liquido: 233462.5,
        dias_funcionamento: 22,
        media_diaria: 10612.39,
        crescimento_mes_anterior: 22.5,
        melhor_semana: { semana: 'Semana 3', valor: 65200.0 },
        pior_semana: { semana: 'Semana 1', valor: 42800.0 },
        meta_mensal: 220000.0,
        atingimento_meta: 106.1,
      },
      {
        periodo: 'Dezembro/2024',
        total_atendimentos: 725,
        total_procedimentos: 1180,
        valor_bruto: 200450.0,
        valor_desconto: 10022.5,
        valor_liquido: 190427.5,
        dias_funcionamento: 20,
        media_diaria: 9521.38,
        crescimento_mes_anterior: 8.7,
        melhor_semana: { semana: 'Semana 2', valor: 55800.0 },
        pior_semana: { semana: 'Semana 4', valor: 38200.0 },
        meta_mensal: 200000.0,
        atingimento_meta: 95.2,
      },
    ],
  };

  useEffect(() => {
    fetchRelatorioData();
  }, [dataInicial, dataFinal, agrupamento, comparacao, clinicId]);

  const fetchRelatorioData = async () => {
    setLoading(true);
    try {
      // Simular busca no banco baseado no agrupamento
      const data = mockRelatorioData[agrupamento] || [];
      setRelatorioData(data);
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o relatório.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    try {
      let csvContent;

      if (agrupamento === 'diario') {
        csvContent = [
          [
            'Data',
            'Dia da Semana',
            'Atendimentos',
            'Procedimentos',
            'Valor Bruto',
            'Desconto',
            'Valor Líquido',
            'Ticket Médio',
            'Crescimento %',
          ],
          ...relatorioData.map((item) => [
            item.periodo,
            item.dia_semana,
            item.total_atendimentos,
            item.total_procedimentos,
            item.valor_bruto.toFixed(2),
            item.valor_desconto.toFixed(2),
            item.valor_liquido.toFixed(2),
            item.ticket_medio.toFixed(2),
            item.crescimento_dia_anterior.toFixed(1) + '%',
          ]),
        ]
          .map((row) => row.join(','))
          .join('\n');
      } else if (agrupamento === 'semanal') {
        csvContent = [
          [
            'Semana',
            'Início',
            'Fim',
            'Atendimentos',
            'Procedimentos',
            'Valor Líquido',
            'Média Diária',
            'Crescimento %',
          ],
          ...relatorioData.map((item) => [
            item.periodo,
            item.data_inicio,
            item.data_fim,
            item.total_atendimentos,
            item.total_procedimentos,
            item.valor_liquido.toFixed(2),
            item.media_diaria.toFixed(2),
            item.crescimento_semana_anterior.toFixed(1) + '%',
          ]),
        ]
          .map((row) => row.join(','))
          .join('\n');
      } else {
        csvContent = [
          [
            'Mês',
            'Atendimentos',
            'Procedimentos',
            'Valor Líquido',
            'Meta',
            'Atingimento %',
            'Crescimento %',
          ],
          ...relatorioData.map((item) => [
            item.periodo,
            item.total_atendimentos,
            item.total_procedimentos,
            item.valor_liquido.toFixed(2),
            item.meta_mensal.toFixed(2),
            item.atingimento_meta.toFixed(1) + '%',
            item.crescimento_mes_anterior.toFixed(1) + '%',
          ]),
        ]
          .map((row) => row.join(','))
          .join('\n');
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-producao-${agrupamento}-${dataInicial}-${dataFinal}.csv`;
      link.click();

      toast({
        title: 'Exportação concluída',
        description: 'Relatório exportado para CSV com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar o relatório.',
        variant: 'destructive',
      });
    }
  };

  const exportarExcel = async () => {
    try {
      console.log('Exportando para Excel:', relatorioData);

      toast({
        title: 'Exportação iniciada',
        description: 'Relatório Excel será baixado em instantes.',
      });
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar para Excel.',
        variant: 'destructive',
      });
    }
  };

  const getTotalGeral = () => {
    return relatorioData.reduce(
      (acc, item) => ({
        total_atendimentos: acc.total_atendimentos + item.total_atendimentos,
        total_procedimentos: acc.total_procedimentos + item.total_procedimentos,
        valor_bruto: acc.valor_bruto + (item.valor_bruto || 0),
        valor_desconto: acc.valor_desconto + (item.valor_desconto || 0),
        valor_liquido: acc.valor_liquido + item.valor_liquido,
      }),
      {
        total_atendimentos: 0,
        total_procedimentos: 0,
        valor_bruto: 0,
        valor_desconto: 0,
        valor_liquido: 0,
      },
    );
  };

  const getCrescimentoBadge = (crescimento) => {
    if (crescimento > 10) {
      return (
        <Badge variant="default" className="text-green-600 gap-1">
          <TrendingUp className="w-3 h-3" />+{crescimento.toFixed(1)}%
        </Badge>
      );
    } else if (crescimento > 0) {
      return (
        <Badge variant="secondary" className="text-blue-600 gap-1">
          <TrendingUp className="w-3 h-3" />+{crescimento.toFixed(1)}%
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="gap-1">
          <TrendingDown className="w-3 h-3" />
          {crescimento.toFixed(1)}%
        </Badge>
      );
    }
  };

  const getMetaBadge = (atingimento) => {
    if (atingimento >= 100) {
      return (
        <Badge variant="default" className="text-green-600">
          Meta Atingida
        </Badge>
      );
    } else if (atingimento >= 90) {
      return (
        <Badge variant="secondary" className="text-blue-600">
          Próximo da Meta
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-orange-600">
          Abaixo da Meta
        </Badge>
      );
    }
  };

  const totais = getTotalGeral();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PieChart className="w-6 h-6 text-blue-600" />
            Produção por Período
          </h1>
          <p className="text-muted-foreground">
            Análise temporal da produtividade com comparações e tendências
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarCSV} className="gap-2">
            <FileText className="w-4 h-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportarExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div>
              <Label htmlFor="data_inicial">Data Inicial</Label>
              <Input
                id="data_inicial"
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="data_final">Data Final</Label>
              <Input
                id="data_final"
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
              />
            </div>

            <div>
              <Label>Agrupamento</Label>
              <Select value={agrupamento} onValueChange={setAgrupamento}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Comparação</Label>
              <Select value={comparacao} onValueChange={setComparacao}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="periodo_anterior">Período Anterior</SelectItem>
                  <SelectItem value="mesmo_periodo_ano_anterior">
                    Mesmo Período Ano Passado
                  </SelectItem>
                  <SelectItem value="media_historica">Média Histórica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchRelatorioData}>
              <Search className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{relatorioData.length}</div>
            <p className="text-sm text-muted-foreground">
              Períodos{' '}
              {agrupamento === 'diario'
                ? 'Analisados'
                : agrupamento === 'semanal'
                  ? 'Semanas'
                  : 'Meses'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totais.total_atendimentos}</div>
            <p className="text-sm text-muted-foreground">Total Atendimentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totais.total_procedimentos}</div>
            <p className="text-sm text-muted-foreground">Total Procedimentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              R$ {totais.valor_liquido.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Líquido Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              R${' '}
              {relatorioData.length > 0
                ? (totais.valor_liquido / relatorioData.length).toFixed(2)
                : '0.00'}
            </div>
            <p className="text-sm text-muted-foreground">
              Média por{' '}
              {agrupamento === 'diario' ? 'Dia' : agrupamento === 'semanal' ? 'Semana' : 'Mês'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Principal - Agrupamento Diário */}
      {agrupamento === 'diario' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Produção Diária ({relatorioData.length} dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Dia da Semana</TableHead>
                  <TableHead className="text-center">Atendimentos</TableHead>
                  <TableHead className="text-center">Procedimentos</TableHead>
                  <TableHead className="text-right">Valor Líquido</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">Produtividade/Hora</TableHead>
                  <TableHead className="text-center">Crescimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorioData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-semibold">
                      {new Date(item.periodo).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{item.dia_semana}</TableCell>
                    <TableCell className="text-center font-semibold">
                      {item.total_atendimentos}
                    </TableCell>
                    <TableCell className="text-center">{item.total_procedimentos}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      R$ {item.valor_liquido.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">R$ {item.ticket_medio.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div>R$ {item.produtividade_hora.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        ({item.horas_funcionamento}h)
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getCrescimentoBadge(item.crescimento_dia_anterior)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabela Principal - Agrupamento Semanal */}
      {agrupamento === 'semanal' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Produção Semanal ({relatorioData.length} semanas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semana</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Atendimentos</TableHead>
                  <TableHead className="text-center">Procedimentos</TableHead>
                  <TableHead className="text-right">Valor Líquido</TableHead>
                  <TableHead className="text-right">Média Diária</TableHead>
                  <TableHead className="text-center">Melhor Dia</TableHead>
                  <TableHead className="text-center">Crescimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorioData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-semibold">{item.periodo}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(item.data_inicio).toLocaleDateString('pt-BR')} até
                        <br />
                        {new Date(item.data_fim).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {item.total_atendimentos}
                    </TableCell>
                    <TableCell className="text-center">{item.total_procedimentos}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      R$ {item.valor_liquido.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">R$ {item.media_diaria.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-medium">{item.melhor_dia.dia}</div>
                        <div className="text-green-600">R$ {item.melhor_dia.valor.toFixed(2)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getCrescimentoBadge(item.crescimento_semana_anterior)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabela Principal - Agrupamento Mensal */}
      {agrupamento === 'mensal' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Produção Mensal ({relatorioData.length} meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-center">Atendimentos</TableHead>
                  <TableHead className="text-center">Procedimentos</TableHead>
                  <TableHead className="text-right">Valor Líquido</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-center">Atingimento</TableHead>
                  <TableHead className="text-right">Média Diária</TableHead>
                  <TableHead className="text-center">Crescimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorioData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-semibold">{item.periodo}</TableCell>
                    <TableCell className="text-center font-semibold">
                      {item.total_atendimentos}
                    </TableCell>
                    <TableCell className="text-center">{item.total_procedimentos}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      R$ {item.valor_liquido.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">R$ {item.meta_mensal.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        {getMetaBadge(item.atingimento_meta)}
                        <div className="text-xs font-medium">
                          {item.atingimento_meta.toFixed(1)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>R$ {item.media_diaria.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        ({item.dias_funcionamento} dias)
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getCrescimentoBadge(item.crescimento_mes_anterior)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detalhamento Adicional - Apenas para Diário */}
      {agrupamento === 'diario' && relatorioData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Convênio por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {relatorioData.slice(0, 3).map((dia, diaIndex) => (
                <div key={diaIndex} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-lg">
                    {new Date(dia.periodo).toLocaleDateString('pt-BR')} - {dia.dia_semana}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Convênio</TableHead>
                        <TableHead className="text-center">Atendimentos</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Participação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dia.principais_convenios.map((convenio, index) => {
                        const participacao = ((convenio.valor / dia.valor_liquido) * 100).toFixed(
                          1,
                        );
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{convenio.nome}</TableCell>
                            <TableCell className="text-center">{convenio.atendimentos}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              R$ {convenio.valor.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{participacao}%</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {relatorioData.length === 0 && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Nenhum dado encontrado para o período selecionado.</p>
              <p>Ajuste os filtros e tente novamente.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
