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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Package,
  Plus,
  Download,
  FileCode,
  Calendar,
  DollarSign,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Lotes de Envio TISS
 * Agrupamento de guias por convênio/período para envio
 */
export default function LotesEnvio() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state para criação de novo lote
  const [formData, setFormData] = useState({
    convenio_id: '',
    competencia: new Date().toISOString().slice(0, 7), // YYYY-MM
    observacoes: '',
  });

  // Mock data para demonstração
  const mockLotes = [
    {
      id: 'LT001',
      numero_lote: 'LT001-2025-10',
      convenio: 'Unimed',
      competencia: '2025-10',
      data_criacao: '2025-10-30',
      data_fechamento: null,
      total_guias: 15,
      total_valor: 2250.0,
      status: 'Aberto',
      xml_path: null,
      observacoes: 'Lote em construção',
    },
    {
      id: 'LT002',
      numero_lote: 'LT002-2025-10',
      convenio: 'Bradesco Saúde',
      competencia: '2025-10',
      data_criacao: '2025-10-28',
      data_fechamento: '2025-10-30',
      total_guias: 8,
      total_valor: 1200.0,
      status: 'Fechado',
      xml_path: '/xml/lote_002.xml',
      observacoes: 'Lote enviado para o convênio',
    },
    {
      id: 'LT003',
      numero_lote: 'LT003-2025-09',
      convenio: 'SulAmérica',
      competencia: '2025-09',
      data_criacao: '2025-09-25',
      data_fechamento: '2025-09-30',
      total_guias: 22,
      total_valor: 3300.0,
      status: 'Enviado',
      xml_path: '/xml/lote_003.xml',
      observacoes: 'Aguardando retorno',
    },
  ];

  // Mock convenios
  const mockConvenios = [
    { id: '1', nome: 'Unimed' },
    { id: '2', nome: 'Bradesco Saúde' },
    { id: '3', nome: 'SulAmérica' },
    { id: '4', nome: 'Amil' },
    { id: '5', nome: 'NotreDame Intermédica' },
  ];

  useEffect(() => {
    fetchLotes();
  }, [clinicId]);

  const fetchLotes = async () => {
    setLoading(true);
    try {
      // Simular busca no banco
      // const { data, error } = await supabase
      //   .from('billing_batches')
      //   .select('*')
      //   .eq('clinic_id', clinicId)
      //   .order('created_at', { ascending: false });

      setLotes(mockLotes);
    } catch (error) {
      console.error('Erro ao buscar lotes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os lotes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Criando novo lote:', formData);

      toast({
        title: 'Lote criado',
        description: 'Novo lote criado com sucesso.',
      });

      setIsDialogOpen(false);
      resetForm();
      fetchLotes();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o lote.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      convenio_id: '',
      competencia: new Date().toISOString().slice(0, 7),
      observacoes: '',
    });
  };

  const handleGerarXMLLote = async (lote) => {
    try {
      console.log('Gerando XML do lote:', lote.id);

      toast({
        title: 'XML do Lote Gerado',
        description: `XML do lote ${lote.numero_lote} gerado com sucesso.`,
      });

      // Atualizar status do lote
      fetchLotes();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o XML do lote.',
        variant: 'destructive',
      });
    }
  };

  const handleFecharLote = async (lote) => {
    try {
      console.log('Fechando lote:', lote.id);

      toast({
        title: 'Lote fechado',
        description: `Lote ${lote.numero_lote} fechado com sucesso.`,
      });

      fetchLotes();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível fechar o lote.',
        variant: 'destructive',
      });
    }
  };

  const handleReabrirLote = async (lote) => {
    try {
      console.log('Reabrindo lote:', lote.id);

      toast({
        title: 'Lote reaberto',
        description: `Lote ${lote.numero_lote} reaberto com sucesso.`,
      });

      fetchLotes();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível reabrir o lote.',
        variant: 'destructive',
      });
    }
  };

  const handleBaixarXML = (lote) => {
    if (lote.xml_path) {
      console.log('Baixando XML:', lote.xml_path);
      toast({
        title: 'Download iniciado',
        description: `Baixando XML do lote ${lote.numero_lote}.`,
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Aberto: { variant: 'outline', color: 'text-blue-600', icon: Unlock },
      Fechado: { variant: 'secondary', color: 'text-gray-600', icon: Lock },
      Enviado: { variant: 'default', color: 'text-green-600', icon: CheckCircle },
      Erro: { variant: 'destructive', color: 'text-red-600', icon: AlertCircle },
    };

    const config = statusConfig[status] || {
      variant: 'outline',
      color: 'text-gray-600',
      icon: AlertCircle,
    };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const filteredLotes = lotes.filter((lote) => {
    const matchesSearch =
      lote.numero_lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lote.convenio.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Lotes de Envio
          </h1>
          <p className="text-muted-foreground">
            Agrupamento de guias por convênio e período para envio aos convênios
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Lote
            </Button>
          </DialogTrigger>
          <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
            <DialogHeader>
              <DialogTitle>Criar Novo Lote</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="convenio">Convênio</Label>
                <Select
                  value={formData.convenio_id}
                  onValueChange={(value) => setFormData({ ...formData, convenio_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um convênio" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockConvenios.map((convenio) => (
                      <SelectItem key={convenio.id} value={convenio.id}>
                        {convenio.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="competencia">Competência (Ano-Mês)</Label>
                <Input
                  id="competencia"
                  type="month"
                  value={formData.competencia}
                  onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre o lote..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Criar Lote</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar por número do lote ou convênio..."
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
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Fechado">Fechado</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                  <SelectItem value="Erro">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={fetchLotes}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{lotes.length}</div>
            <p className="text-sm text-muted-foreground">Total de Lotes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {lotes.filter((l) => l.status === 'Aberto').length}
            </div>
            <p className="text-sm text-muted-foreground">Lotes Abertos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {lotes.filter((l) => l.status === 'Enviado').length}
            </div>
            <p className="text-sm text-muted-foreground">Lotes Enviados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              R$ {lotes.reduce((sum, l) => sum + l.total_valor, 0).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Lotes */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes Registrados ({filteredLotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número do Lote</TableHead>
                <TableHead>Convênio</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Data Criação</TableHead>
                <TableHead>Guias</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLotes.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell className="font-mono text-sm">{lote.numero_lote}</TableCell>
                  <TableCell>{lote.convenio}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {lote.competencia}
                    </div>
                  </TableCell>
                  <TableCell>{lote.data_criacao}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{lote.total_guias} guias</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      R$ {lote.total_valor.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(lote.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {lote.status === 'Aberto' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGerarXMLLote(lote)}
                          >
                            <FileCode className="w-3 h-3 mr-1" />
                            Gerar XML
                          </Button>
                          <Button size="sm" onClick={() => handleFecharLote(lote)}>
                            <Lock className="w-3 h-3 mr-1" />
                            Fechar
                          </Button>
                        </>
                      )}

                      {lote.status === 'Fechado' && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleBaixarXML(lote)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Baixar XML
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReabrirLote(lote)}
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            Reabrir
                          </Button>
                        </>
                      )}

                      {lote.status === 'Enviado' && (
                        <Button size="sm" variant="secondary" onClick={() => handleBaixarXML(lote)}>
                          <Download className="w-3 h-3 mr-1" />
                          Baixar XML
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredLotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Nenhum lote encontrado com os filtros aplicados.'
                      : 'Nenhum lote criado ainda.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
