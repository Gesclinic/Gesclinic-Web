import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertTriangle, 
  Download, 
  Calendar,
  DollarSign,
  FileText,
  FileSpreadsheet,
  Search,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  TrendingDown,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Relatório de Status de Lotes e Glosas
 */
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

  // Mock data para demonstração - Lotes
  const mockLotes = [
    {
      lote_id: 'LOT001',
      numero_lote: 'LOT001-2025-001',
      convenio_nome: 'Unimed Regional',
      data_criacao: '2025-01-28',
      data_envio: '2025-01-29',
      data_processamento: '2025-01-30',
      status: 'Processado',
      total_guias: 45,
      valor_apresentado: 15750.00,
      valor_processado: 14200.00,
      valor_glosado: 1550.00,
      percentual_glosa: 9.84,
      guias_aceitas: 38,
      guias_glosadas: 7,
      protocolo_envio: 'PROT789456123',
      protocolo_retorno: 'RET987654321',
      observacoes: 'Glosas por falta de autorização prévia'
    },
    {
      lote_id: 'LOT002',
      numero_lote: 'LOT002-2025-002',
      convenio_nome: 'Bradesco Saúde',
      data_criacao: '2025-01-29',
      data_envio: '2025-01-30',
      data_processamento: null,
      status: 'Enviado',
      total_guias: 32,
      valor_apresentado: 11840.00,
      valor_processado: 0,
      valor_glosado: 0,
      percentual_glosa: 0,
      guias_aceitas: 0,
      guias_glosadas: 0,
      protocolo_envio: 'PROT456789012',
      protocolo_retorno: null,
      observacoes: 'Aguardando processamento'
    },
    {
      lote_id: 'LOT003',
      numero_lote: 'LOT003-2025-003',
      convenio_nome: 'SulAmérica',
      data_criacao: '2025-01-30',
      data_envio: null,
      data_processamento: null,
      status: 'Aberto',
      total_guias: 18,
      valor_apresentado: 7200.00,
      valor_processado: 0,
      valor_glosado: 0,
      percentual_glosa: 0,
      guias_aceitas: 0,
      guias_glosadas: 0,
      protocolo_envio: null,
      protocolo_retorno: null,
      observacoes: 'Lote em construção'
    }
  ];

  // Mock data para demonstração - Glosas
  const mockGlosas = [
    {
      glosa_id: 'GL001',
      lote_numero: 'LOT001-2025-001',
      convenio_nome: 'Unimed Regional',
      guia_numero: 'GUI001-2025-001',
      paciente_nome: 'Maria Santos Silva',
      data_atendimento: '2025-01-25',
      procedimento_codigo: '10101012',
      procedimento_nome: 'Consulta Médica',
      valor_apresentado: 150.00,
      valor_glosado: 150.00,
      motivo_glosa: 'Falta de autorização prévia',
      codigo_glosa: 'G001',
      status_recurso: 'Pendente',
      data_recurso: null,
      profissional: 'Dr. Fernando Cooper',
      observacoes: 'Autorização solicitada posteriormente'
    },
    {
      glosa_id: 'GL002',
      lote_numero: 'LOT001-2025-001',
      convenio_nome: 'Unimed Regional',
      guia_numero: 'GUI002-2025-001',
      paciente_nome: 'João Pedro Lima',
      data_atendimento: '2025-01-26',
      procedimento_codigo: '30501170',
      procedimento_nome: 'Ecocardiograma',
      valor_apresentado: 250.00,
      valor_glosado: 50.00,
      motivo_glosa: 'Valor acima da tabela',
      codigo_glosa: 'G012',
      status_recurso: 'Aceito Parcialmente',
      data_recurso: '2025-01-29',
      profissional: 'Dr. Fernando Cooper',
      observacoes: 'Diferença de valor ajustada'
    },
    {
      glosa_id: 'GL003',
      lote_numero: 'LOT001-2025-001',
      convenio_nome: 'Unimed Regional',
      guia_numero: 'GUI003-2025-001',
      paciente_nome: 'Ana Costa Santos',
      data_atendimento: '2025-01-27',
      procedimento_codigo: '20101020',
      procedimento_nome: 'ECG',
      valor_apresentado: 100.00,
      valor_glosado: 100.00,
      motivo_glosa: 'Procedimento não coberto',
      codigo_glosa: 'G025',
      status_recurso: 'Rejeitado',
      data_recurso: '2025-01-30',
      profissional: 'Dra. Ana Paula Santos',
      observacoes: 'Procedimento fora da cobertura'
    }
  ];

  useEffect(() => {
    fetchRelatorioData();
  }, [dataInicial, dataFinal, statusFilter, convenioFilter, clinicId]);

  const fetchRelatorioData = async () => {
    setLoading(true);
    try {
      // Simular busca no banco com filtros
      let filteredLotes = mockLotes;
      let filteredGlosas = mockGlosas;
      
      if (statusFilter !== 'all') {
        filteredLotes = filteredLotes.filter(lote => lote.status === statusFilter);
      }

      if (convenioFilter !== 'all') {
        filteredLotes = filteredLotes.filter(lote => 
          lote.convenio_nome.toLowerCase().includes(convenioFilter.toLowerCase())
        );
        filteredGlosas = filteredGlosas.filter(glosa => 
          glosa.convenio_nome.toLowerCase().includes(convenioFilter.toLowerCase())
        );
      }

      setLotes(filteredLotes);
      setGlosas(filteredGlosas);
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
      let csvContent;
      
      if (activeTab === 'lotes') {
        csvContent = [
          ['Número Lote', 'Convênio', 'Status', 'Data Criação', 'Data Envio', 'Total Guias', 'Valor Apresentado', 'Valor Processado', 'Valor Glosado', '% Glosa'],
          ...lotes.map(lote => [
            lote.numero_lote,
            lote.convenio_nome,
            lote.status,
            lote.data_criacao,
            lote.data_envio || '',
            lote.total_guias,
            lote.valor_apresentado.toFixed(2),
            lote.valor_processado.toFixed(2),
            lote.valor_glosado.toFixed(2),
            lote.percentual_glosa.toFixed(2) + '%'
          ])
        ].map(row => row.join(',')).join('\n');
      } else {
        csvContent = [
          ['Lote', 'Convênio', 'Guia', 'Paciente', 'Data Atendimento', 'Procedimento', 'Valor Apresentado', 'Valor Glosado', 'Motivo', 'Status Recurso'],
          ...glosas.map(glosa => [
            glosa.lote_numero,
            glosa.convenio_nome,
            glosa.guia_numero,
            glosa.paciente_nome,
            glosa.data_atendimento,
            glosa.procedimento_nome,
            glosa.valor_apresentado.toFixed(2),
            glosa.valor_glosado.toFixed(2),
            glosa.motivo_glosa,
            glosa.status_recurso
          ])
        ].map(row => row.join(',')).join('\n');
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-${activeTab}-${dataInicial}-${dataFinal}.csv`;
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
      console.log(`Exportando ${activeTab} para Excel:`, activeTab === 'lotes' ? lotes : glosas);
      
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Aberto': { variant: 'secondary', color: 'text-blue-600', icon: Package },
      'Enviado': { variant: 'outline', color: 'text-yellow-600', icon: Clock },
      'Processado': { variant: 'default', color: 'text-green-600', icon: CheckCircle },
      'Rejeitado': { variant: 'destructive', color: 'text-red-600', icon: XCircle }
    };

    const config = statusConfig[status] || { variant: 'outline', color: 'text-gray-600', icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getRecursoBadge = (status) => {
    const statusConfig = {
      'Pendente': { variant: 'secondary', color: 'text-yellow-600' },
      'Aceito': { variant: 'default', color: 'text-green-600' },
      'Aceito Parcialmente': { variant: 'outline', color: 'text-blue-600' },
      'Rejeitado': { variant: 'destructive', color: 'text-red-600' },
      'Sem Recurso': { variant: 'outline', color: 'text-gray-600' }
    };

    const config = statusConfig[status] || { variant: 'outline', color: 'text-gray-600' };
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    );
  };

  const getGlosaBadge = (percentual) => {
    if (percentual === 0) {
      return <Badge variant="default" className="text-green-600">Sem Glosa</Badge>;
    } else if (percentual <= 5) {
      return <Badge variant="secondary" className="text-blue-600">Baixa</Badge>;
    } else if (percentual <= 15) {
      return <Badge variant="outline" className="text-yellow-600">Moderada</Badge>;
    } else {
      return <Badge variant="destructive" className="text-red-600">Alta</Badge>;
    }
  };

  const getTotaisLotes = () => {
    return lotes.reduce((acc, lote) => ({
      total_guias: acc.total_guias + lote.total_guias,
      valor_apresentado: acc.valor_apresentado + lote.valor_apresentado,
      valor_processado: acc.valor_processado + lote.valor_processado,
      valor_glosado: acc.valor_glosado + lote.valor_glosado
    }), {
      total_guias: 0,
      valor_apresentado: 0,
      valor_processado: 0,
      valor_glosado: 0
    });
  };

  const getTotaisGlosas = () => {
    return glosas.reduce((acc, glosa) => ({
      valor_apresentado: acc.valor_apresentado + glosa.valor_apresentado,
      valor_glosado: acc.valor_glosado + glosa.valor_glosado
    }), {
      valor_apresentado: 0,
      valor_glosado: 0
    });
  };

  const totaisLotes = getTotaisLotes();
  const totaisGlosas = getTotaisGlosas();
  const percentualGlosaGeral = totaisLotes.valor_apresentado > 0 
    ? (totaisLotes.valor_glosado / totaisLotes.valor_apresentado) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            Status de Lotes e Glosas
          </h1>
          <p className="text-muted-foreground">
            Monitoramento de lotes TISS e análise detalhada de glosas
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
              <Label>Status do Lote</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                  <SelectItem value="Processado">Processado</SelectItem>
                  <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Convênio</Label>
              <Select value={convenioFilter} onValueChange={setConvenioFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Convênios</SelectItem>
                  <SelectItem value="unimed">Unimed</SelectItem>
                  <SelectItem value="bradesco">Bradesco</SelectItem>
                  <SelectItem value="sulamérica">SulAmérica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchRelatorioData}>
              <Search className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{lotes.length}</div>
            <p className="text-sm text-muted-foreground">Total de Lotes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totaisLotes.total_guias}</div>
            <p className="text-sm text-muted-foreground">Total de Guias</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              R$ {totaisLotes.valor_apresentado.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Apresentado</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              R$ {totaisLotes.valor_processado.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Processado</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              R$ {totaisLotes.valor_glosado.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Glosado</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {percentualGlosaGeral.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">% Glosa Geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'lotes' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('lotes')}
          className="gap-2"
        >
          <Package className="w-4 h-4" />
          Lotes ({lotes.length})
        </Button>
        <Button
          variant={activeTab === 'glosas' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('glosas')}
          className="gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Glosas ({glosas.length})
        </Button>
      </div>

      {/* Tabela de Lotes */}
      {activeTab === 'lotes' && (
        <Card>
          <CardHeader>
            <CardTitle>Lotes TISS ({lotes.length} lotes)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número do Lote</TableHead>
                  <TableHead>Convênio</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Guias</TableHead>
                  <TableHead className="text-right">Valor Apresentado</TableHead>
                  <TableHead className="text-right">Valor Processado</TableHead>
                  <TableHead className="text-right">Valor Glosado</TableHead>
                  <TableHead className="text-center">% Glosa</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((lote) => (
                  <TableRow key={lote.lote_id}>
                    <TableCell className="font-mono text-sm">
                      <div>
                        <div className="font-semibold">{lote.numero_lote}</div>
                        <div className="text-xs text-muted-foreground">
                          Criado: {new Date(lote.data_criacao).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{lote.convenio_nome}</div>
                      {lote.protocolo_envio && (
                        <div className="text-xs text-muted-foreground">
                          {lote.protocolo_envio}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(lote.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="font-semibold">{lote.total_guias}</div>
                      {lote.status === 'Processado' && (
                        <div className="text-xs">
                          <span className="text-green-600">{lote.guias_aceitas}A</span>
                          {' / '}
                          <span className="text-red-600">{lote.guias_glosadas}G</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {lote.valor_apresentado.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      R$ {lote.valor_processado.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      R$ {lote.valor_glosado.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getGlosaBadge(lote.percentual_glosa)}
                      <div className="text-sm font-semibold mt-1">
                        {lote.percentual_glosa.toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3 mr-1" />
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
                          <DialogHeader>
                            <DialogTitle>Detalhes do Lote {lote.numero_lote}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Convênio</Label>
                                <p className="text-sm">{lote.convenio_nome}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <div className="mt-1">{getStatusBadge(lote.status)}</div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Data Criação</Label>
                                <p className="text-sm">{new Date(lote.data_criacao).toLocaleDateString('pt-BR')}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Data Envio</Label>
                                <p className="text-sm">{lote.data_envio ? new Date(lote.data_envio).toLocaleDateString('pt-BR') : '-'}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Protocolo Envio</Label>
                                <p className="text-sm font-mono">{lote.protocolo_envio || '-'}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Protocolo Retorno</Label>
                                <p className="text-sm font-mono">{lote.protocolo_retorno || '-'}</p>
                              </div>
                            </div>
                            {lote.observacoes && (
                              <div>
                                <Label className="text-sm font-medium">Observações</Label>
                                <p className="text-sm mt-1 p-2 bg-muted rounded">{lote.observacoes}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}

                {lotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum lote encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Glosas */}
      {activeTab === 'glosas' && (
        <Card>
          <CardHeader>
            <CardTitle>Glosas Detalhadas ({glosas.length} glosas)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote / Guia</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead className="text-right">Valor Apresentado</TableHead>
                  <TableHead className="text-right">Valor Glosado</TableHead>
                  <TableHead>Motivo da Glosa</TableHead>
                  <TableHead className="text-center">Status Recurso</TableHead>
                  <TableHead>Profissional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {glosas.map((glosa) => (
                  <TableRow key={glosa.glosa_id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-xs">{glosa.lote_numero}</div>
                        <div className="font-mono text-xs text-muted-foreground">{glosa.guia_numero}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(glosa.data_atendimento).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{glosa.paciente_nome}</div>
                      <div className="text-sm text-muted-foreground">{glosa.convenio_nome}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{glosa.procedimento_nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">{glosa.procedimento_codigo}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {glosa.valor_apresentado.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      R$ {glosa.valor_glosado.toFixed(2)}
                      {glosa.valor_glosado < glosa.valor_apresentado && (
                        <div className="text-xs text-muted-foreground">
                          ({((glosa.valor_glosado / glosa.valor_apresentado) * 100).toFixed(0)}%)
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{glosa.motivo_glosa}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {glosa.codigo_glosa}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getRecursoBadge(glosa.status_recurso)}
                      {glosa.data_recurso && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(glosa.data_recurso).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{glosa.profissional}</div>
                      {glosa.observacoes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {glosa.observacoes.substring(0, 50)}...
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {glosas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma glosa encontrada com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Análise de Glosas por Motivo */}
      {activeTab === 'glosas' && glosas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análise de Glosas por Motivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Resumo dos principais motivos */}
              {[
                { motivo: 'Falta de autorização prévia', quantidade: 1, valor: 150.00 },
                { motivo: 'Valor acima da tabela', quantidade: 1, valor: 50.00 },
                { motivo: 'Procedimento não coberto', quantidade: 1, valor: 100.00 }
              ].map((item, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="font-medium text-sm">{item.motivo}</div>
                      <div className="text-2xl font-bold text-red-600">
                        R$ {item.valor.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantidade} ocorrência{item.quantidade !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

