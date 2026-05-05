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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bed,
  Plus,
  Edit,
  Search,
  Calendar,
  User,
  Clock,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Guia de Internação
 * Registro e controle de internações, autorizações e prorrogações
 */
export default function GuiaInternacao() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [internacoes, setInternacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInternacao, setEditingInternacao] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    numero_guia: '',
    paciente_id: '',
    paciente_nome: '',
    convenio_id: '',
    numero_autorizacao: '',
    data_entrada: new Date().toISOString().split('T')[0],
    hora_entrada: '',
    data_alta_prevista: '',
    data_alta_real: '',
    hora_alta: '',
    leito: '',
    especialidade: '',
    cid_principal: '',
    diagnostico_principal: '',
    medico_assistente: '',
    medico_solicitante: '',
    carater_internacao: 'Eletiva',
    regime_internacao: 'Hospitalar',
    observacoes: '',
  });

  // Mock data para demonstração
  const mockInternacoes = [
    {
      id: 'INT001',
      numero_guia: 'INT001-2025-001',
      paciente_nome: 'José Silva Costa',
      convenio: 'Unimed',
      numero_autorizacao: 'AUT123456789',
      data_entrada: '2025-10-28',
      hora_entrada: '14:30',
      data_alta_prevista: '2025-11-03',
      data_alta_real: null,
      hora_alta: null,
      leito: 'Leito 101 - Quarto 10',
      especialidade: 'Cirurgia Geral',
      cid_principal: 'K35.9',
      diagnostico_principal: 'Apendicite Aguda',
      medico_assistente: 'Dr. João Cirurgião',
      medico_solicitante: 'Dr. Pedro Clínico',
      carater_internacao: 'Urgência',
      regime_internacao: 'Hospitalar',
      dias_internacao: 3,
      status: 'Internado',
      guias_associadas: [
        { tipo: 'SP', numero: 'SP001-2025-001', valor: 1500.0 },
        { tipo: 'SADT', numero: 'SADT005-2025-001', valor: 800.0 },
      ],
      valor_total: 2300.0,
    },
    {
      id: 'INT002',
      numero_guia: 'INT002-2025-002',
      paciente_nome: 'Ana Paula Santos',
      convenio: 'Bradesco Saúde',
      numero_autorizacao: 'AUT987654321',
      data_entrada: '2025-10-25',
      hora_entrada: '09:15',
      data_alta_prevista: '2025-10-30',
      data_alta_real: '2025-10-30',
      hora_alta: '16:45',
      leito: 'Leito 205 - Quarto 20',
      especialidade: 'Ginecologia',
      cid_principal: 'N80.0',
      diagnostico_principal: 'Endometriose do Útero',
      medico_assistente: 'Dra. Maria Ginecologista',
      medico_solicitante: 'Dra. Ana Clínica',
      carater_internacao: 'Eletiva',
      regime_internacao: 'Hospitalar',
      dias_internacao: 5,
      status: 'Alta Médica',
      guias_associadas: [
        { tipo: 'SP', numero: 'SP002-2025-001', valor: 2200.0 },
        { tipo: 'SADT', numero: 'SADT006-2025-001', valor: 1200.0 },
      ],
      valor_total: 3400.0,
    },
    {
      id: 'INT003',
      numero_guia: 'INT003-2025-003',
      paciente_nome: 'Roberto Lima Oliveira',
      convenio: 'SulAmérica',
      numero_autorizacao: 'AUT456789123',
      data_entrada: '2025-11-02',
      hora_entrada: '08:00',
      data_alta_prevista: '2025-11-10',
      data_alta_real: null,
      hora_alta: null,
      leito: 'Leito 301 - Quarto 30',
      especialidade: 'Cardiologia',
      cid_principal: 'I21.9',
      diagnostico_principal: 'Infarto Agudo do Miocárdio',
      medico_assistente: 'Dr. Carlos Cardiologista',
      medico_solicitante: 'Dr. José Emergência',
      carater_internacao: 'Urgência',
      regime_internacao: 'Hospitalar',
      dias_internacao: 1,
      status: 'Aguardando Autorização',
      guias_associadas: [],
      valor_total: 0.0,
    },
  ];

  useEffect(() => {
    fetchInternacoes();
  }, [clinicId]);

  const fetchInternacoes = async () => {
    setLoading(true);
    try {
      // Simular busca no banco
      setInternacoes(mockInternacoes);
    } catch (error) {
      console.error('Erro ao buscar internações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as internações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateGuiaNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = String(internacoes.length + 1).padStart(3, '0');
    return `INT${sequence}-${year}-${month}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const internacaoData = {
        ...formData,
        numero_guia: editingInternacao ? editingInternacao.numero_guia : generateGuiaNumber(),
      };

      console.log('Salvando internação:', internacaoData);

      toast({
        title: editingInternacao ? 'Internação atualizada' : 'Internação registrada',
        description: `Internação ${editingInternacao ? 'atualizada' : 'registrada'} com sucesso.`,
      });

      setIsDialogOpen(false);
      setEditingInternacao(null);
      resetForm();
      fetchInternacoes();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a internação.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      numero_guia: '',
      paciente_id: '',
      paciente_nome: '',
      convenio_id: '',
      numero_autorizacao: '',
      data_entrada: new Date().toISOString().split('T')[0],
      hora_entrada: '',
      data_alta_prevista: '',
      data_alta_real: '',
      hora_alta: '',
      leito: '',
      especialidade: '',
      cid_principal: '',
      diagnostico_principal: '',
      medico_assistente: '',
      medico_solicitante: '',
      carater_internacao: 'Eletiva',
      regime_internacao: 'Hospitalar',
      observacoes: '',
    });
  };

  const handleEdit = (internacao) => {
    setEditingInternacao(internacao);
    setFormData({
      numero_guia: internacao.numero_guia,
      paciente_nome: internacao.paciente_nome,
      convenio_id: internacao.convenio,
      numero_autorizacao: internacao.numero_autorizacao,
      data_entrada: internacao.data_entrada,
      hora_entrada: internacao.hora_entrada,
      data_alta_prevista: internacao.data_alta_prevista,
      data_alta_real: internacao.data_alta_real || '',
      hora_alta: internacao.hora_alta || '',
      leito: internacao.leito,
      especialidade: internacao.especialidade,
      cid_principal: internacao.cid_principal,
      diagnostico_principal: internacao.diagnostico_principal,
      medico_assistente: internacao.medico_assistente,
      medico_solicitante: internacao.medico_solicitante,
      carater_internacao: internacao.carater_internacao,
      regime_internacao: internacao.regime_internacao,
      observacoes: internacao.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDarAlta = async (internacao) => {
    try {
      console.log('Dando alta para internação:', internacao.id);

      toast({
        title: 'Alta realizada',
        description: `Alta médica registrada para ${internacao.paciente_nome}.`,
      });

      fetchInternacoes();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a alta.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Aguardando Autorização': {
        variant: 'secondary',
        color: 'text-yellow-600',
        icon: AlertTriangle,
      },
      Autorizada: { variant: 'default', color: 'text-blue-600', icon: CheckCircle },
      Internado: { variant: 'default', color: 'text-green-600', icon: Bed },
      'Alta Médica': { variant: 'outline', color: 'text-gray-600', icon: CheckCircle },
      Cancelada: { variant: 'destructive', color: 'text-red-600', icon: XCircle },
    };

    const config = statusConfig[status] || {
      variant: 'outline',
      color: 'text-gray-600',
      icon: AlertTriangle,
    };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getCaraterBadge = (carater) => {
    const caraterConfig = {
      Eletiva: { variant: 'default', color: 'text-green-600' },
      Urgência: { variant: 'destructive', color: 'text-red-600' },
      Emergência: { variant: 'destructive', color: 'text-red-600' },
    };

    const config = caraterConfig[carater] || { variant: 'outline', color: 'text-gray-600' };

    return (
      <Badge variant={config.variant} className={config.color}>
        {carater}
      </Badge>
    );
  };

  const filteredInternacoes = internacoes.filter((internacao) => {
    const matchesSearch =
      internacao.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      internacao.numero_guia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      internacao.diagnostico_principal.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || internacao.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bed className="w-6 h-6 text-blue-600" />
            Guia de Internação
          </h1>
          <p className="text-muted-foreground">
            Registro e controle de internações, autorizações e prorrogações
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Internação
            </Button>
          </DialogTrigger>
          <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide overflow-y-auto modal-content-scroll">
            <DialogHeader>
              <DialogTitle>
                {editingInternacao ? 'Editar Internação' : 'Nova Guia de Internação'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="dados-gerais" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
                  <TabsTrigger value="dados-clinicos">Dados Clínicos</TabsTrigger>
                  <TabsTrigger value="internacao">Internação</TabsTrigger>
                </TabsList>

                <TabsContent value="dados-gerais" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paciente_nome">Nome do Paciente</Label>
                      <Input
                        id="paciente_nome"
                        value={formData.paciente_nome}
                        onChange={(e) =>
                          setFormData({ ...formData, paciente_nome: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="convenio_id">Convênio</Label>
                      <Select
                        value={formData.convenio_id}
                        onValueChange={(value) => setFormData({ ...formData, convenio_id: value })}
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
                      <Label htmlFor="numero_autorizacao">Número da Autorização</Label>
                      <Input
                        id="numero_autorizacao"
                        value={formData.numero_autorizacao}
                        onChange={(e) =>
                          setFormData({ ...formData, numero_autorizacao: e.target.value })
                        }
                        placeholder="Autorização do convênio"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="carater_internacao">Caráter da Internação</Label>
                      <Select
                        value={formData.carater_internacao}
                        onValueChange={(value) =>
                          setFormData({ ...formData, carater_internacao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Eletiva">Eletiva</SelectItem>
                          <SelectItem value="Urgência">Urgência</SelectItem>
                          <SelectItem value="Emergência">Emergência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="regime_internacao">Regime de Internação</Label>
                      <Select
                        value={formData.regime_internacao}
                        onValueChange={(value) =>
                          setFormData({ ...formData, regime_internacao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hospitalar">Hospitalar</SelectItem>
                          <SelectItem value="Hospital Dia">Hospital Dia</SelectItem>
                          <SelectItem value="Domiciliar">Domiciliar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="especialidade">Especialidade</Label>
                      <Input
                        id="especialidade"
                        value={formData.especialidade}
                        onChange={(e) =>
                          setFormData({ ...formData, especialidade: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="dados-clinicos" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cid_principal">CID Principal</Label>
                      <Input
                        id="cid_principal"
                        value={formData.cid_principal}
                        onChange={(e) =>
                          setFormData({ ...formData, cid_principal: e.target.value })
                        }
                        placeholder="Ex: K35.9"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="medico_solicitante">Médico Solicitante</Label>
                      <Input
                        id="medico_solicitante"
                        value={formData.medico_solicitante}
                        onChange={(e) =>
                          setFormData({ ...formData, medico_solicitante: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="diagnostico_principal">Diagnóstico Principal</Label>
                      <Input
                        id="diagnostico_principal"
                        value={formData.diagnostico_principal}
                        onChange={(e) =>
                          setFormData({ ...formData, diagnostico_principal: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="medico_assistente">Médico Assistente</Label>
                      <Input
                        id="medico_assistente"
                        value={formData.medico_assistente}
                        onChange={(e) =>
                          setFormData({ ...formData, medico_assistente: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="internacao" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="data_entrada">Data de Entrada</Label>
                      <Input
                        id="data_entrada"
                        type="date"
                        value={formData.data_entrada}
                        onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="hora_entrada">Hora de Entrada</Label>
                      <Input
                        id="hora_entrada"
                        type="time"
                        value={formData.hora_entrada}
                        onChange={(e) => setFormData({ ...formData, hora_entrada: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="data_alta_prevista">Data de Alta Prevista</Label>
                      <Input
                        id="data_alta_prevista"
                        type="date"
                        value={formData.data_alta_prevista}
                        onChange={(e) =>
                          setFormData({ ...formData, data_alta_prevista: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="leito">Leito</Label>
                      <Select
                        value={formData.leito}
                        onValueChange={(value) => setFormData({ ...formData, leito: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o leito" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Leito 101 - Quarto 10">
                            Leito 101 - Quarto 10
                          </SelectItem>
                          <SelectItem value="Leito 102 - Quarto 10">
                            Leito 102 - Quarto 10
                          </SelectItem>
                          <SelectItem value="Leito 201 - Quarto 20">
                            Leito 201 - Quarto 20
                          </SelectItem>
                          <SelectItem value="Leito 202 - Quarto 20">
                            Leito 202 - Quarto 20
                          </SelectItem>
                          <SelectItem value="Leito 301 - Quarto 30">
                            Leito 301 - Quarto 30
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="data_alta_real">Data de Alta Real</Label>
                      <Input
                        id="data_alta_real"
                        type="date"
                        value={formData.data_alta_real}
                        onChange={(e) =>
                          setFormData({ ...formData, data_alta_real: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="hora_alta">Hora de Alta</Label>
                      <Input
                        id="hora_alta"
                        type="time"
                        value={formData.hora_alta}
                        onChange={(e) => setFormData({ ...formData, hora_alta: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingInternacao(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingInternacao ? 'Atualizar' : 'Registrar'} Internação
                </Button>
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
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por paciente, número da guia ou diagnóstico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Aguardando Autorização">Aguardando Autorização</SelectItem>
                  <SelectItem value="Autorizada">Autorizada</SelectItem>
                  <SelectItem value="Internado">Internado</SelectItem>
                  <SelectItem value="Alta Médica">Alta Médica</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={fetchInternacoes}>
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{internacoes.length}</div>
            <p className="text-sm text-muted-foreground">Total de Internações</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {internacoes.filter((i) => i.status === 'Internado').length}
            </div>
            <p className="text-sm text-muted-foreground">Pacientes Internados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {internacoes.filter((i) => i.status === 'Aguardando Autorização').length}
            </div>
            <p className="text-sm text-muted-foreground">Aguardando Autorização</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              R$ {internacoes.reduce((sum, i) => sum + i.valor_total, 0).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Internações */}
      <Card>
        <CardHeader>
          <CardTitle>Internações Registradas ({filteredInternacoes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número da Guia</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Diagnóstico</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Leito</TableHead>
                <TableHead>Caráter</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInternacoes.map((internacao) => (
                <TableRow key={internacao.id}>
                  <TableCell className="font-mono text-sm">{internacao.numero_guia}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{internacao.paciente_nome}</div>
                        <div className="text-xs text-muted-foreground">{internacao.convenio}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{internacao.diagnostico_principal}</div>
                      <div className="text-xs text-muted-foreground">
                        CID: {internacao.cid_principal}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm">{internacao.data_entrada}</div>
                        <div className="text-xs text-muted-foreground">
                          {internacao.hora_entrada}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {internacao.leito}
                    </div>
                  </TableCell>
                  <TableCell>{getCaraterBadge(internacao.carater_internacao)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {internacao.dias_internacao} dias
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(internacao.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(internacao)}>
                        <Edit className="w-3 h-3" />
                      </Button>

                      {internacao.status === 'Internado' && (
                        <Button size="sm" onClick={() => handleDarAlta(internacao)}>
                          Alta
                        </Button>
                      )}

                      {internacao.guias_associadas.length > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => console.log('Ver guias:', internacao.guias_associadas)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Guias
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredInternacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Nenhuma internação encontrada com os filtros aplicados.'
                      : 'Nenhuma internação registrada ainda.'}
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
