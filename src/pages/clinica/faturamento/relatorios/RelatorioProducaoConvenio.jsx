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
  ChartBar,
  Download,
  Calendar,
  DollarSign,
  User,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Relatório de Produção por Convênio
 */
export default function RelatorioProducaoConvenio() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [relatorioData, setRelatorioData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataInicial, setDataInicial] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  );
  const [dataFinal, setDataFinal] = useState(new Date().toISOString().split('T')[0]);
  const [convenioFilter, setConvenioFilter] = useState('all');

  // Mock data para demonstração
  const mockRelatorioData = [
    {
      convenio_id: 'conv_001',
      convenio_nome: 'Unimed Regional',
      tipo_convenio: 'Médico',
      total_guias: 125,
      total_procedimentos: 340,
      valor_bruto: 45650.8,
      valor_desconto: 2282.54,
      valor_liquido: 43368.26,
      percentual_total: 35.2,
      guias_pagas: 110,
      guias_pendentes: 12,
      guias_glosadas: 3,
      valor_medio_guia: 365.41,
      procedimentos_principais: [
        { codigo: '10101012', nome: 'Consulta Médica', quantidade: 85, valor_total: 8500.0 },
        { codigo: '20101020', nome: 'ECG', quantidade: 45, valor_total: 4500.0 },
        { codigo: '30301150', nome: 'Ultrassom Abdominal', quantidade: 30, valor_total: 7500.0 },
      ],
    },
    {
      convenio_id: 'conv_002',
      convenio_nome: 'Bradesco Saúde',
      tipo_convenio: 'Médico',
      total_guias: 98,
      total_procedimentos: 245,
      valor_bruto: 32140.6,
      valor_desconto: 1607.03,
      valor_liquido: 30533.57,
      percentual_total: 24.8,
      guias_pagas: 88,
      guias_pendentes: 8,
      guias_glosadas: 2,
      valor_medio_guia: 327.96,
      procedimentos_principais: [
        { codigo: '10101012', nome: 'Consulta Médica', quantidade: 65, valor_total: 6500.0 },
        { codigo: '40201040', nome: 'Raio-X Tórax', quantidade: 35, valor_total: 3500.0 },
        { codigo: '30301150', nome: 'Ultrassom Abdominal', quantidade: 20, valor_total: 5000.0 },
      ],
    },
    {
      convenio_id: 'conv_003',
      convenio_nome: 'SulAmérica',
      tipo_convenio: 'Médico',
      total_guias: 76,
      total_procedimentos: 198,
      valor_bruto: 28750.4,
      valor_desconto: 1437.52,
      valor_liquido: 27312.88,
      percentual_total: 22.1,
      guias_pagas: 70,
      guias_pendentes: 5,
      guias_glosadas: 1,
      valor_medio_guia: 378.29,
      procedimentos_principais: [
        { codigo: '10101012', nome: 'Consulta Médica', quantidade: 50, valor_total: 5000.0 },
        { codigo: '30501170', nome: 'Ecocardiograma', quantidade: 25, valor_total: 6250.0 },
        { codigo: '20101020', nome: 'ECG', quantidade: 30, valor_total: 3000.0 },
      ],
    },
    {
      convenio_id: 'conv_004',
      convenio_nome: 'Particular',
      tipo_convenio: 'Particular',
      total_guias: 45,
      total_procedimentos: 85,
      valor_bruto: 18950.0,
      valor_desconto: 947.5,
      valor_liquido: 18002.5,
      percentual_total: 14.6,
      guias_pagas: 42,
      guias_pendentes: 2,
      guias_glosadas: 1,
      valor_medio_guia: 421.11,
      procedimentos_principais: [
        { codigo: '10101012', nome: 'Consulta Médica', quantidade: 25, valor_total: 3750.0 },
        { codigo: '90416090', nome: 'Check-up Executivo', quantidade: 15, valor_total: 12000.0 },
        { codigo: '30301150', nome: 'Ultrassom Abdominal', quantidade: 10, valor_total: 2500.0 },
      ],
    },
    {
      convenio_id: 'conv_005',
      convenio_nome: 'Amil',
      tipo_convenio: 'Médico',
      total_guias: 34,
      total_procedimentos: 78,
      valor_bruto: 11240.8,
      valor_desconto: 562.04,
      valor_liquido: 10678.76,
      percentual_total: 8.7,
      guias_pagas: 30,
      guias_pendentes: 3,
      guias_glosadas: 1,
      valor_medio_guia: 330.61,
      procedimentos_principais: [
        { codigo: '10101012', nome: 'Consulta Médica', quantidade: 20, valor_total: 2000.0 },
        { codigo: '20101020', nome: 'ECG', quantidade: 18, valor_total: 1800.0 },
        { codigo: '40201040', nome: 'Raio-X Tórax', quantidade: 15, valor_total: 1500.0 },
      ],
    },
  ];

  useEffect(() => {
    fetchRelatorioData();
  }, [dataInicial, dataFinal, convenioFilter, clinicId]);

  const fetchRelatorioData = async () => {
    setLoading(true);
    try {
      // Simular busca no banco com filtros
      let filteredData = mockRelatorioData;

      if (convenioFilter !== 'all') {
        filteredData = filteredData.filter((item) =>
          item.tipo_convenio.toLowerCase().includes(convenioFilter.toLowerCase()),
        );
      }

      setRelatorioData(filteredData);
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
      const csvContent = [
        [
          'Convênio',
          'Tipo',
          'Total Guias',
          'Total Procedimentos',
          'Valor Bruto',
          'Desconto',
          'Valor Líquido',
          'Percentual',
          'Valor Médio/Guia',
        ],
        ...relatorioData.map((item) => [
          item.convenio_nome,
          item.tipo_convenio,
          item.total_guias,
          item.total_procedimentos,
          item.valor_bruto.toFixed(2),
          item.valor_desconto.toFixed(2),
          item.valor_liquido.toFixed(2),
          item.percentual_total.toFixed(1) + '%',
          item.valor_medio_guia.toFixed(2),
        ]),
      ]
        .map((row) => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-producao-convenio-${dataInicial}-${dataFinal}.csv`;
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
      // Simular exportação para Excel
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
        total_guias: acc.total_guias + item.total_guias,
        total_procedimentos: acc.total_procedimentos + item.total_procedimentos,
        valor_bruto: acc.valor_bruto + item.valor_bruto,
        valor_desconto: acc.valor_desconto + item.valor_desconto,
        valor_liquido: acc.valor_liquido + item.valor_liquido,
      }),
      {
        total_guias: 0,
        total_procedimentos: 0,
        valor_bruto: 0,
        valor_desconto: 0,
        valor_liquido: 0,
      },
    );
  };

  const getStatusBadge = (guias_pagas, total_guias) => {
    const percentualPago = (guias_pagas / total_guias) * 100;

    if (percentualPago >= 90) {
      return (
        <Badge variant="default" className="text-green-600">
          Excelente
        </Badge>
      );
    } else if (percentualPago >= 70) {
      return (
        <Badge variant="secondary" className="text-blue-600">
          Bom
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="text-red-600">
          Atenção
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
            <ChartBar className="w-6 h-6 text-blue-600" />
            Produção por Convênio
          </h1>
          <p className="text-muted-foreground">
            Análise da produção e faturamento por convênio no período selecionado
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
              <Label>Tipo de Convênio</Label>
              <Select value={convenioFilter} onValueChange={setConvenioFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="médico">Médico</SelectItem>
                  <SelectItem value="particular">Particular</SelectItem>
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
            <div className="text-2xl font-bold">{totais.total_guias}</div>
            <p className="text-sm text-muted-foreground">Total de Guias</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totais.total_procedimentos}</div>
            <p className="text-sm text-muted-foreground">Total de Procedimentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              R$ {totais.valor_bruto.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Bruto</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              R$ {totais.valor_desconto.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Total Descontos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              R$ {totais.valor_liquido.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Líquido</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Produção por Convênio ({relatorioData.length} convênios)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Convênio</TableHead>
                <TableHead className="text-center">Guias</TableHead>
                <TableHead className="text-center">Procedimentos</TableHead>
                <TableHead className="text-right">Valor Bruto</TableHead>
                <TableHead className="text-right">Desconto</TableHead>
                <TableHead className="text-right">Valor Líquido</TableHead>
                <TableHead className="text-center">Participação</TableHead>
                <TableHead className="text-center">Status Pagto</TableHead>
                <TableHead className="text-right">Valor Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatorioData.map((item) => (
                <TableRow key={item.convenio_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.convenio_nome}</div>
                      <Badge variant="outline" className="text-xs">
                        {item.tipo_convenio}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-semibold">{item.total_guias}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.guias_pagas}P / {item.guias_pendentes}Pe / {item.guias_glosadas}G
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {item.total_procedimentos}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {item.valor_bruto.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    -R$ {item.valor_desconto.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    R$ {item.valor_liquido.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {item.percentual_total >= 25 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-orange-600" />
                      )}
                      <span className="font-semibold">{item.percentual_total}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(item.guias_pagas, item.total_guias)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <span className="font-semibold">{item.valor_medio_guia.toFixed(2)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {relatorioData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum dado encontrado para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalhamento dos Principais Procedimentos */}
      {relatorioData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Principais Procedimentos por Convênio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {relatorioData.map((convenio) => (
                <div key={convenio.convenio_id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-lg">{convenio.convenio_nome}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Procedimento</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {convenio.procedimentos_principais.map((proc, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{proc.codigo}</TableCell>
                          <TableCell>{proc.nome}</TableCell>
                          <TableCell className="text-center font-semibold">
                            {proc.quantidade}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            R$ {proc.valor_total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
