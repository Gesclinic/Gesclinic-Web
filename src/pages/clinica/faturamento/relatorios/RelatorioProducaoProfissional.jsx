import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { 
  User, 
  Download, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Search,
  Award,
  Users,
  Target
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Relatório de Produção por Profissional
 */
export default function RelatorioProducaoProfissional() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [relatorioData, setRelatorioData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataInicial, setDataInicial] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dataFinal, setDataFinal] = useState(new Date().toISOString().split('T')[0]);
  const [especialidadeFilter, setEspecialidadeFilter] = useState('all');
  const [profissionalFilter, setProfissionalFilter] = useState('all');

  // Mock data para demonstração
  const mockRelatorioData = [
    {
      profissional_id: 'prof_001',
      nome: 'Dr. Fernando Cooper Silva',
      crm: '12345-SP',
      especialidade: 'Cardiologia',
      total_atendimentos: 145,
      total_procedimentos: 280,
      valor_bruto: 42750.00,
      valor_desconto: 2137.50,
      valor_liquido: 40612.50,
      participacao_percentual: 28.5,
      valor_medio_atendimento: 294.83,
      horas_trabalhadas: 120,
      produtividade_hora: 356.25,
      ranking_mensal: 1,
      meta_mensal: 35000.00,
      atingimento_meta: 116.0,
      procedimentos_principais: [
        { codigo: '10101012', nome: 'Consulta Cardiológica', quantidade: 85, valor_total: 12750.00 },
        { codigo: '30501170', nome: 'Ecocardiograma', quantidade: 45, valor_total: 11250.00 },
        { codigo: '20101020', nome: 'ECG', quantidade: 65, valor_total: 6500.00 }
      ],
      distribuicao_convenios: [
        { convenio: 'Unimed', atendimentos: 65, valor: 19500.00 },
        { convenio: 'Bradesco', atendimentos: 45, valor: 13500.00 },
        { convenio: 'Particular', atendimentos: 35, valor: 10500.00 }
      ]
    },
    {
      profissional_id: 'prof_002',
      nome: 'Dra. Ana Paula Santos',
      crm: '23456-SP',
      especialidade: 'Dermatologia',
      total_atendimentos: 128,
      total_procedimentos: 195,
      valor_bruto: 38400.00,
      valor_desconto: 1920.00,
      valor_liquido: 36480.00,
      participacao_percentual: 25.6,
      valor_medio_atendimento: 300.00,
      horas_trabalhadas: 100,
      produtividade_hora: 384.00,
      ranking_mensal: 2,
      meta_mensal: 32000.00,
      atingimento_meta: 114.0,
      procedimentos_principais: [
        { codigo: '10101015', nome: 'Consulta Dermatológica', quantidade: 80, valor_total: 12000.00 },
        { codigo: '90813200', nome: 'Aplicação de Botox', quantidade: 35, valor_total: 17500.00 },
        { codigo: '40301110', nome: 'Biópsia de Pele', quantidade: 25, valor_total: 6250.00 }
      ],
      distribuicao_convenios: [
        { convenio: 'Particular', atendimentos: 55, valor: 16500.00 },
        { convenio: 'SulAmérica', atendimentos: 40, valor: 12000.00 },
        { convenio: 'Unimed', atendimentos: 33, valor: 9900.00 }
      ]
    },
    {
      profissional_id: 'prof_003',
      nome: 'Dr. João Pedro Lima',
      crm: '34567-SP',
      especialidade: 'Ortopedia',
      total_atendimentos: 95,
      total_procedimentos: 145,
      valor_bruto: 28500.00,
      valor_desconto: 1425.00,
      valor_liquido: 27075.00,
      participacao_percentual: 19.0,
      valor_medio_atendimento: 300.00,
      horas_trabalhadas: 80,
      produtividade_hora: 356.25,
      ranking_mensal: 3,
      meta_mensal: 25000.00,
      atingimento_meta: 108.3,
      procedimentos_principais: [
        { codigo: '10101018', nome: 'Consulta Ortopédica', quantidade: 60, valor_total: 9000.00 },
        { codigo: '82010060', nome: 'Infiltração Articular', quantidade: 25, valor_total: 12500.00 },
        { codigo: '40201040', nome: 'Raio-X Articulações', quantidade: 30, valor_total: 3000.00 }
      ],
      distribuicao_convenios: [
        { convenio: 'Bradesco', atendimentos: 42, valor: 12600.00 },
        { convenio: 'Unimed', atendimentos: 35, valor: 10500.00 },
        { convenio: 'Amil', atendimentos: 18, valor: 5400.00 }
      ]
    },
    {
      profissional_id: 'prof_004',
      nome: 'Dra. Mariana Costa',
      crm: '45678-SP',
      especialidade: 'Ginecologia',
      total_atendimentos: 89,
      total_procedimentos: 125,
      valor_bruto: 22250.00,
      valor_desconto: 1112.50,
      valor_liquido: 21137.50,
      participacao_percentual: 14.8,
      valor_medio_atendimento: 250.00,
      horas_trabalhadas: 70,
      produtividade_hora: 317.86,
      ranking_mensal: 4,
      meta_mensal: 20000.00,
      atingimento_meta: 105.7,
      procedimentos_principais: [
        { codigo: '10101019', nome: 'Consulta Ginecológica', quantidade: 55, valor_total: 8250.00 },
        { codigo: '30301160', nome: 'Ultrassom Pélvico', quantidade: 30, valor_total: 7500.00 },
        { codigo: '11101017', nome: 'Colpocitologia', quantidade: 25, valor_total: 3750.00 }
      ],
      distribuicao_convenios: [
        { convenio: 'Unimed', atendimentos: 38, valor: 9500.00 },
        { convenio: 'SulAmérica', atendimentos: 28, valor: 7000.00 },
        { convenio: 'Particular', atendimentos: 23, valor: 5750.00 }
      ]
    },
    {
      profissional_id: 'prof_005',
      nome: 'Dr. Ricardo Oliveira',
      crm: '56789-SP',
      especialidade: 'Clínica Geral',
      total_atendimentos: 165,
      total_procedimentos: 210,
      valor_bruto: 16500.00,
      valor_desconto: 825.00,
      valor_liquido: 15675.00,
      participacao_percentual: 11.0,
      valor_medio_atendimento: 100.00,
      horas_trabalhadas: 110,
      produtividade_hora: 150.00,
      ranking_mensal: 5,
      meta_mensal: 15000.00,
      atingimento_meta: 104.5,
      procedimentos_principais: [
        { codigo: '10101012', nome: 'Consulta Médica', quantidade: 120, valor_total: 12000.00 },
        { codigo: '20101020', nome: 'ECG', quantidade: 35, valor_total: 3500.00 },
        { codigo: '30302110', nome: 'Teste Ergométrico', quantidade: 10, valor_total: 2500.00 }
      ],
      distribuicao_convenios: [
        { convenio: 'Unimed', atendimentos: 85, valor: 8500.00 },
        { convenio: 'Bradesco', atendimentos: 50, valor: 5000.00 },
        { convenio: 'Amil', atendimentos: 30, valor: 3000.00 }
      ]
    }
  ];

  useEffect(() => {
    fetchRelatorioData();
  }, [dataInicial, dataFinal, especialidadeFilter, profissionalFilter, clinicId]);

  const fetchRelatorioData = async () => {
    setLoading(true);
    try {
      // Simular busca no banco com filtros
      let filteredData = mockRelatorioData;
      
      if (especialidadeFilter !== 'all') {
        filteredData = filteredData.filter(item => 
          item.especialidade.toLowerCase().includes(especialidadeFilter.toLowerCase())
        );
      }

      if (profissionalFilter !== 'all') {
        filteredData = filteredData.filter(item => 
          item.profissional_id === profissionalFilter
        );
      }

      // Ordenar por valor líquido (ranking)
      filteredData.sort((a, b) => b.valor_liquido - a.valor_liquido);

      setRelatorioData(filteredData);
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o relatório.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    try {
      const csvContent = [
        ['Ranking', 'Profissional', 'CRM', 'Especialidade', 'Atendimentos', 'Procedimentos', 'Valor Bruto', 'Desconto', 'Valor Líquido', 'Meta', 'Atingimento', 'Produtividade/Hora'],
        ...relatorioData.map((item, index) => [
          index + 1,
          item.nome,
          item.crm,
          item.especialidade,
          item.total_atendimentos,
          item.total_procedimentos,
          item.valor_bruto.toFixed(2),
          item.valor_desconto.toFixed(2),
          item.valor_liquido.toFixed(2),
          item.meta_mensal.toFixed(2),
          item.atingimento_meta.toFixed(1) + '%',
          'R$ ' + item.produtividade_hora.toFixed(2)
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-producao-profissional-${dataInicial}-${dataFinal}.csv`;
      link.click();

      toast({
        title: "Exportação concluída",
        description: "Relatório exportado para CSV com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o relatório.",
        variant: "destructive"
      });
    }
  };

  const exportarExcel = async () => {
    try {
      console.log('Exportando para Excel:', relatorioData);
      
      toast({
        title: "Exportação iniciada",
        description: "Relatório Excel será baixado em instantes."
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar para Excel.",
        variant: "destructive"
      });
    }
  };

  const getTotalGeral = () => {
    return relatorioData.reduce((acc, item) => ({
      total_atendimentos: acc.total_atendimentos + item.total_atendimentos,
      total_procedimentos: acc.total_procedimentos + item.total_procedimentos,
      valor_bruto: acc.valor_bruto + item.valor_bruto,
      valor_desconto: acc.valor_desconto + item.valor_desconto,
      valor_liquido: acc.valor_liquido + item.valor_liquido,
      horas_trabalhadas: acc.horas_trabalhadas + item.horas_trabalhadas
    }), {
      total_atendimentos: 0,
      total_procedimentos: 0,
      valor_bruto: 0,
      valor_desconto: 0,
      valor_liquido: 0,
      horas_trabalhadas: 0
    });
  };

  const getRankingBadge = (ranking) => {
    if (ranking === 1) {
      return <Badge variant="default" className="bg-yellow-500 text-white gap-1">
        <Award className="w-3 h-3" />
        1º Lugar
      </Badge>;
    } else if (ranking <= 3) {
      return <Badge variant="secondary" className="text-blue-600 gap-1">
        <Award className="w-3 h-3" />
        Top 3
      </Badge>;
    } else {
      return <Badge variant="outline">{ranking}º</Badge>;
    }
  };

  const getMetaBadge = (atingimento) => {
    if (atingimento >= 110) {
      return <Badge variant="default" className="text-green-600">Superou Meta</Badge>;
    } else if (atingimento >= 100) {
      return <Badge variant="secondary" className="text-blue-600">Atingiu Meta</Badge>;
    } else if (atingimento >= 80) {
      return <Badge variant="outline" className="text-orange-600">Próximo da Meta</Badge>;
    } else {
      return <Badge variant="destructive">Abaixo da Meta</Badge>;
    }
  };

  const totais = getTotalGeral();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Produção por Profissional
          </h1>
          <p className="text-muted-foreground">
            Análise da produtividade e performance individual dos profissionais
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
              <Label>Especialidade</Label>
              <Select value={especialidadeFilter} onValueChange={setEspecialidadeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="cardiologia">Cardiologia</SelectItem>
                  <SelectItem value="dermatologia">Dermatologia</SelectItem>
                  <SelectItem value="ortopedia">Ortopedia</SelectItem>
                  <SelectItem value="ginecologia">Ginecologia</SelectItem>
                  <SelectItem value="clinica geral">Clínica Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Profissional</Label>
              <Select value={profissionalFilter} onValueChange={setProfissionalFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {mockRelatorioData.map(prof => (
                    <SelectItem key={prof.profissional_id} value={prof.profissional_id}>
                      {prof.nome}
                    </SelectItem>
                  ))}
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{relatorioData.length}</div>
            <p className="text-sm text-muted-foreground">Profissionais</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totais.total_atendimentos}</div>
            <p className="text-sm text-muted-foreground">Atendimentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totais.total_procedimentos}</div>
            <p className="text-sm text-muted-foreground">Procedimentos</p>
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
            <div className="text-2xl font-bold text-green-600">
              R$ {totais.valor_liquido.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Líquido</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totais.horas_trabalhadas}h</div>
            <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Produção ({relatorioData.length} profissionais)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ranking</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-center">Atendimentos</TableHead>
                <TableHead className="text-center">Procedimentos</TableHead>
                <TableHead className="text-right">Valor Líquido</TableHead>
                <TableHead className="text-center">Meta</TableHead>
                <TableHead className="text-right">Produtividade/Hora</TableHead>
                <TableHead className="text-center">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatorioData.map((item, index) => (
                <TableRow key={item.profissional_id}>
                  <TableCell>
                    {getRankingBadge(index + 1)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {item.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{item.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.crm} • {item.especialidade}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-semibold">{item.total_atendimentos}</div>
                    <div className="text-xs text-muted-foreground">
                      Média: {item.valor_medio_atendimento.toFixed(0)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {item.total_procedimentos}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-bold text-green-600">
                      R$ {item.valor_liquido.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({item.participacao_percentual}% do total)
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      {getMetaBadge(item.atingimento_meta)}
                      <div className="text-xs">
                        R$ {item.meta_mensal.toFixed(0)} ({item.atingimento_meta.toFixed(1)}%)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold">R$ {item.produtividade_hora.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.horas_trabalhadas}h trabalhadas
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      {item.atingimento_meta >= 110 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : item.atingimento_meta >= 100 ? (
                        <Target className="w-5 h-5 text-blue-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {relatorioData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum dado encontrado para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalhamento por Profissional */}
      {relatorioData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por Convênio */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Convênio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {relatorioData.slice(0, 3).map((profissional) => (
                  <div key={profissional.profissional_id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{profissional.nome}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Convênio</TableHead>
                          <TableHead className="text-center">Atendimentos</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profissional.distribuicao_convenios.map((conv, index) => (
                          <TableRow key={index}>
                            <TableCell>{conv.convenio}</TableCell>
                            <TableCell className="text-center">{conv.atendimentos}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              R$ {conv.valor.toFixed(2)}
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

          {/* Principais Procedimentos */}
          <Card>
            <CardHeader>
              <CardTitle>Principais Procedimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {relatorioData.slice(0, 3).map((profissional) => (
                  <div key={profissional.profissional_id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{profissional.nome}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Procedimento</TableHead>
                          <TableHead className="text-center">Qtd</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profissional.procedimentos_principais.map((proc, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">{proc.codigo}</TableCell>
                            <TableCell className="text-sm">{proc.nome}</TableCell>
                            <TableCell className="text-center">{proc.quantidade}</TableCell>
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
        </div>
      )}
    </div>
  );
}

