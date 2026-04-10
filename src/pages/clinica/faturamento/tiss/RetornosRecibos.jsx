import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileDown, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  FileX
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Retornos/Recibos TISS
 * Importação de arquivos XML de retorno dos convênios
 */
export default function RetornosRecibos() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [retornos, setRetornos] = useState([]);
  const [guiasProcessadas, setGuiasProcessadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  // Form state para upload de retorno
  const [uploadFile, setUploadFile] = useState(null);
  const [convenioRetorno, setConvenioRetorno] = useState('');

  // Mock data para demonstração
  const mockRetornos = [
    {
      id: 'RT001',
      lote_id: 'LT002',
      numero_lote: 'LT002-2025-10',
      convenio: 'Bradesco Saúde',
      arquivo_nome: 'retorno_bradesco_202510.xml',
      data_importacao: '2025-10-30',
      data_processamento: '2025-10-30',
      total_guias_processadas: 8,
      total_aceitas: 6,
      total_glosadas: 2,
      total_rejeitadas: 0,
      valor_aceito: 900.00,
      valor_glosado: 300.00,
      status: 'Processado',
      observacoes: 'Processamento concluído com sucesso'
    },
    {
      id: 'RT002',
      lote_id: 'LT003',
      numero_lote: 'LT003-2025-09',
      convenio: 'SulAmérica',
      arquivo_nome: 'retorno_sulamérica_202509.xml',
      data_importacao: '2025-09-30',
      data_processamento: '2025-09-30',
      total_guias_processadas: 22,
      total_aceitas: 20,
      total_glosadas: 1,
      total_rejeitadas: 1,
      valor_aceito: 3000.00,
      valor_glosado: 150.00,
      status: 'Processado',
      observacoes: '1 guia rejeitada por erro de preenchimento'
    }
  ];

  const mockGuiasProcessadas = [
    {
      id: 'GP001',
      retorno_id: 'RT001',
      numero_guia: 'GC001-2025-001',
      paciente_nome: 'Maria Silva Santos',
      codigo_cbhpm: '40101012',
      valor_solicitado: 150.00,
      valor_aprovado: 150.00,
      status_processamento: 'Aceita',
      motivo_glosa: null,
      observacoes: 'Aprovada integralmente'
    },
    {
      id: 'GP002',
      retorno_id: 'RT001',
      numero_guia: 'GC002-2025-001',
      paciente_nome: 'Pedro Santos Lima',
      codigo_cbhpm: '40301010',
      valor_solicitado: 80.00,
      valor_aprovado: 60.00,
      status_processamento: 'Glosada Parcial',
      motivo_glosa: 'Valor acima da tabela do convênio',
      observacoes: 'Redução de 25% do valor'
    },
    {
      id: 'GP003',
      retorno_id: 'RT001',
      numero_guia: 'GC003-2025-001',
      paciente_nome: 'Ana Costa Silva',
      codigo_cbhpm: '40201020',
      valor_solicitado: 200.00,
      valor_aprovado: 0.00,
      status_processamento: 'Glosada Total',
      motivo_glosa: 'Procedimento não coberto pelo plano',
      observacoes: 'Verificar cobertura do plano do paciente'
    }
  ];

  useEffect(() => {
    fetchRetornos();
    fetchGuiasProcessadas();
  }, [clinicId]);

  const fetchRetornos = async () => {
    setLoading(true);
    try {
      // Simular busca no banco
      // const { data, error } = await supabase
      //   .from('billing_returns')
      //   .select('*')
      //   .eq('clinic_id', clinicId)
      //   .order('data_importacao', { ascending: false });
      
      setRetornos(mockRetornos);
    } catch (error) {
      console.error('Erro ao buscar retornos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os retornos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGuiasProcessadas = async () => {
    try {
      // Simular busca das guias processadas
      setGuiasProcessadas(mockGuiasProcessadas);
    } catch (error) {
      console.error('Erro ao buscar guias processadas:', error);
    }
  };

  const handleUploadRetorno = async (e) => {
    e.preventDefault();
    
    if (!uploadFile || !convenioRetorno) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um arquivo e o convênio.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Fazendo upload do retorno:', uploadFile.name, convenioRetorno);
      
      // Simular processamento do arquivo XML
      toast({
        title: "Arquivo importado",
        description: `Retorno do ${convenioRetorno} importado com sucesso.`
      });

      setIsUploadDialogOpen(false);
      setUploadFile(null);
      setConvenioRetorno('');
      fetchRetornos();
      fetchGuiasProcessadas();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível processar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        toast({
          title: "Arquivo inválido",
          description: "Selecione apenas arquivos XML.",
          variant: "destructive"
        });
        return;
      }
      setUploadFile(file);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Processado': { variant: 'default', color: 'text-green-600', icon: CheckCircle },
      'Erro': { variant: 'destructive', color: 'text-red-600', icon: XCircle },
      'Processando': { variant: 'secondary', color: 'text-blue-600', icon: RefreshCw }
    };

    const config = statusConfig[status] || { variant: 'outline', color: 'text-gray-600', icon: AlertTriangle };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getGuiaStatusBadge = (status) => {
    const statusConfig = {
      'Aceita': { variant: 'default', color: 'text-green-600' },
      'Glosada Parcial': { variant: 'secondary', color: 'text-yellow-600' },
      'Glosada Total': { variant: 'destructive', color: 'text-red-600' },
      'Rejeitada': { variant: 'destructive', color: 'text-red-600' }
    };

    const config = statusConfig[status] || { variant: 'outline', color: 'text-gray-600' };
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    );
  };

  const filteredRetornos = retornos.filter(retorno => {
    const matchesSearch = retorno.numero_lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         retorno.convenio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         retorno.arquivo_nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || retorno.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredGuias = guiasProcessadas.filter(guia => {
    return guia.numero_guia.toLowerCase().includes(searchTerm.toLowerCase()) ||
           guia.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileDown className="w-6 h-6 text-blue-600" />
            Retornos / Recibos
          </h1>
          <p className="text-muted-foreground">
            Importação de arquivos XML de retorno dos convênios e controle de glosas
          </p>
        </div>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              Importar Retorno
            </Button>
          </DialogTrigger>
          <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
            <DialogHeader>
              <DialogTitle>Importar Arquivo de Retorno</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUploadRetorno} className="space-y-4">
              <div>
                <Label htmlFor="convenio">Convênio</Label>
                <Select 
                  value={convenioRetorno}
                  onValueChange={setConvenioRetorno}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o convênio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unimed">Unimed</SelectItem>
                    <SelectItem value="bradesco">Bradesco Saúde</SelectItem>
                    <SelectItem value="sulamérica">SulAmérica</SelectItem>
                    <SelectItem value="amil">Amil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="arquivo">Arquivo XML de Retorno</Label>
                <Input
                  id="arquivo"
                  type="file"
                  accept=".xml"
                  onChange={handleFileChange}
                  required
                />
                {uploadFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Arquivo selecionado: {uploadFile.name}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Informações importantes:
                    </p>
                    <ul className="text-sm text-blue-800 mt-1 list-disc ml-4">
                      <li>Apenas arquivos XML são aceitos</li>
                      <li>O arquivo será processado automaticamente</li>
                      <li>Verifique se o convênio selecionado está correto</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setIsUploadDialogOpen(false);
                    setUploadFile(null);
                    setConvenioRetorno('');
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Importar Retorno
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{retornos.length}</div>
            <p className="text-sm text-muted-foreground">Retornos Importados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {guiasProcessadas.filter(g => g.status_processamento === 'Aceita').length}
            </div>
            <p className="text-sm text-muted-foreground">Guias Aceitas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {guiasProcessadas.filter(g => g.status_processamento.includes('Glosada')).length}
            </div>
            <p className="text-sm text-muted-foreground">Guias Glosadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {guiasProcessadas.filter(g => g.status_processamento === 'Rejeitada').length}
            </div>
            <p className="text-sm text-muted-foreground">Guias Rejeitadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar por lote, convênio, arquivo ou guia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Processado">Processado</SelectItem>
                  <SelectItem value="Processando">Processando</SelectItem>
                  <SelectItem value="Erro">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={fetchRetornos}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para Retornos e Guias Processadas */}
      <Tabs defaultValue="retornos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="retornos">Retornos Importados</TabsTrigger>
          <TabsTrigger value="guias">Guias Processadas</TabsTrigger>
        </TabsList>

        <TabsContent value="retornos">
          <Card>
            <CardHeader>
              <CardTitle>Retornos Importados ({filteredRetornos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Data Importação</TableHead>
                    <TableHead>Guias Processadas</TableHead>
                    <TableHead>Valor Aceito</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRetornos.map((retorno) => (
                    <TableRow key={retorno.id}>
                      <TableCell className="font-mono text-sm">
                        {retorno.numero_lote}
                      </TableCell>
                      <TableCell>{retorno.convenio}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileX className="w-4 h-4 text-muted-foreground" />
                          {retorno.arquivo_nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {retorno.data_importacao}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            Total: {retorno.total_guias_processadas}
                          </div>
                          <div className="flex gap-1 text-xs">
                            <span className="text-green-600">✓{retorno.total_aceitas}</span>
                            <span className="text-yellow-600">⚠{retorno.total_glosadas}</span>
                            <span className="text-red-600">✗{retorno.total_rejeitadas}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            R$ {retorno.valor_aceito.toFixed(2)}
                          </div>
                          {retorno.valor_glosado > 0 && (
                            <div className="text-sm text-red-600">
                              -R$ {retorno.valor_glosado.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(retorno.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => console.log('Visualizar detalhes:', retorno.id)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => console.log('Baixar arquivo:', retorno.arquivo_nome)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredRetornos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum retorno importado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guias">
          <Card>
            <CardHeader>
              <CardTitle>Guias Processadas ({filteredGuias.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número da Guia</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Código CBHPM</TableHead>
                    <TableHead>Valor Solicitado</TableHead>
                    <TableHead>Valor Aprovado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Motivo da Glosa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuias.map((guia) => (
                    <TableRow key={guia.id}>
                      <TableCell className="font-mono text-sm">
                        {guia.numero_guia}
                      </TableCell>
                      <TableCell>{guia.paciente_nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{guia.codigo_cbhpm}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {guia.valor_solicitado.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {guia.valor_aprovado.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getGuiaStatusBadge(guia.status_processamento)}
                      </TableCell>
                      <TableCell>
                        {guia.motivo_glosa ? (
                          <div className="max-w-xs">
                            <p className="text-sm text-red-600">{guia.motivo_glosa}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredGuias.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma guia processada ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

