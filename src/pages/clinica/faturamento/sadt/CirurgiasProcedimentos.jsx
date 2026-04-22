import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { normalizeCodeCBHPM } from '@/utils/formatters/formatters';
import { 
  Scissors, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Calendar,
  User,
  Clock,
  DollarSign,
  Users,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Cirurgias/Procedimentos
 * Tela específica para registrar atos cirúrgicos e honorários múltiplos
 * Permite múltiplos profissionais e divisões de valores
 */
export default function CirurgiasProcedimentos() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [cirurgias, setCirurgias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCirurgia, setEditingCirurgia] = useState(null);
  const [profissionaisCirurgia, setProfissionaisCirurgia] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    numero_guia: '',
    paciente_id: '',
    paciente_nome: '',
    convenio_id: '',
    data_cirurgia: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_fim: '',
    sala_cirurgica: '',
    codigo_cbhpm_principal: '',
    procedimento_principal: '',
    valor_total: '',
    status: 'Agendada',
    observacoes: ''
  });

  // Mock data para demonstração
  const mockCirurgias = [
    {
      id: 'CIR001',
      numero_guia: 'CIR001-2025-001',
      paciente_nome: 'Carlos Eduardo Silva',
      convenio: 'Unimed',
      data_cirurgia: '2025-10-30',
      hora_inicio: '08:00',
      hora_fim: '10:30',
      duracao: '2h30min',
      sala_cirurgica: 'Sala 1',
      procedimento_principal: 'Apendicectomia Laparoscópica',
      codigo_cbhpm_principal: '31201039',
      valor_total: 3500.00,
      status: 'Realizada',
      total_profissionais: 3,
      profissionais: [
        {
          id: 'P1',
          nome: 'Dr. João Cirurgião',
          funcao: 'Cirurgião',
          percentual: 60,
          valor: 2100.00
        },
        {
          id: 'P2',
          nome: 'Dr. Pedro Auxiliar',
          funcao: 'Auxiliar',
          percentual: 25,
          valor: 875.00
        },
        {
          id: 'P3',
          nome: 'Dra. Ana Anestesista',
          funcao: 'Anestesista',
          percentual: 15,
          valor: 525.00
        }
      ],
      materiais_utilizados: [
        {
          id: 'M1',
          descricao: 'Kit Laparoscopia',
          quantidade: 1,
          valor: 450.00
        },
        {
          id: 'M2',
          descricao: 'Anestésico Geral',
          quantidade: 2,
          valor: 120.00
        }
      ]
    },
    {
      id: 'CIR002',
      numero_guia: 'CIR002-2025-002',
      paciente_nome: 'Maria Fernanda Costa',
      convenio: 'Bradesco Saúde',
      data_cirurgia: '2025-11-05',
      hora_inicio: '14:00',
      hora_fim: '',
      duracao: '',
      sala_cirurgica: 'Sala 2',
      procedimento_principal: 'Colecistectomia Videolaparoscópica',
      codigo_cbhpm_principal: '31201101',
      valor_total: 4200.00,
      status: 'Agendada',
      total_profissionais: 2,
      profissionais: [
        {
          id: 'P4',
          nome: 'Dr. Roberto Especialista',
          funcao: 'Cirurgião',
          percentual: 70,
          valor: 2940.00
        },
        {
          id: 'P5',
          nome: 'Dra. Sandra Anestesia',
          funcao: 'Anestesista',
          percentual: 30,
          valor: 1260.00
        }
      ],
      materiais_utilizados: []
    }
  ];

  const mockProfissionais = [
    { id: '1', nome: 'Dr. João Cirurgião', especialidade: 'Cirurgia Geral' },
    { id: '2', nome: 'Dr. Pedro Auxiliar', especialidade: 'Cirurgia Geral' },
    { id: '3', nome: 'Dra. Ana Anestesista', especialidade: 'Anestesiologia' },
    { id: '4', nome: 'Dr. Roberto Especialista', especialidade: 'Cirurgia Geral' },
    { id: '5', nome: 'Dra. Sandra Anestesia', especialidade: 'Anestesiologia' }
  ];

  useEffect(() => {
    fetchCirurgias();
  }, [clinicId]);

  const fetchCirurgias = async () => {
    setLoading(true);
    try {
      // Simular busca no banco
      setCirurgias(mockCirurgias);
    } catch (error) {
      console.error('Erro ao buscar cirurgias:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as cirurgias.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateGuiaNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = String(cirurgias.length + 1).padStart(3, '0');
    return `CIR${sequence}-${year}-${month}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (profissionaisCirurgia.length === 0) {
      toast({
        title: "Profissionais obrigatórios",
        description: "Adicione pelo menos um profissional à cirurgia.",
        variant: "destructive"
      });
      return;
    }

    try {
      const cirurgiaData = {
        ...formData,
        numero_guia: editingCirurgia ? editingCirurgia.numero_guia : generateGuiaNumber(),
        profissionais: profissionaisCirurgia
      };

      console.log('Salvando cirurgia:', cirurgiaData);

      toast({
        title: editingCirurgia ? "Cirurgia atualizada" : "Cirurgia agendada",
        description: `Cirurgia ${editingCirurgia ? 'atualizada' : 'agendada'} com sucesso.`
      });

      setIsDialogOpen(false);
      setEditingCirurgia(null);
      resetForm();
      fetchCirurgias();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a cirurgia.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      numero_guia: '',
      paciente_id: '',
      paciente_nome: '',
      convenio_id: '',
      data_cirurgia: new Date().toISOString().split('T')[0],
      hora_inicio: '',
      hora_fim: '',
      sala_cirurgica: '',
      codigo_cbhpm_principal: '',
      procedimento_principal: '',
      valor_total: '',
      status: 'Agendada',
      observacoes: ''
    });
    setProfissionaisCirurgia([]);
  };

  const addProfissional = () => {
    const newProfissional = {
      id: Date.now().toString(),
      profissional_id: '',
      nome: '',
      funcao: 'Cirurgião',
      percentual: 0,
      valor: 0
    };
    setProfissionaisCirurgia([...profissionaisCirurgia, newProfissional]);
  };

  const updateProfissional = (id, field, value) => {
    setProfissionaisCirurgia(profs => 
      profs.map(prof => {
        if (prof.id === id) {
          const updated = { ...prof, [field]: value };
          
          // Auto-calcular valor baseado no percentual
          if (field === 'percentual' && formData.valor_total) {
            updated.valor = (parseFloat(formData.valor_total) * parseFloat(value)) / 100;
          }
          
          // Se mudou o profissional, atualizar o nome
          if (field === 'profissional_id') {
            const profissional = mockProfissionais.find(p => p.id === value);
            updated.nome = profissional ? profissional.nome : '';
          }
          
          return updated;
        }
        return prof;
      })
    );
  };

  const removeProfissional = (id) => {
    setProfissionaisCirurgia(profs => profs.filter(prof => prof.id !== id));
  };

  const recalcularValoresProfissionais = () => {
    if (!formData.valor_total) return;
    
    const valorTotal = parseFloat(formData.valor_total);
    setProfissionaisCirurgia(profs =>
      profs.map(prof => ({
        ...prof,
        valor: (valorTotal * parseFloat(prof.percentual || 0)) / 100
      }))
    );
  };

  const handleEdit = (cirurgia) => {
    setEditingCirurgia(cirurgia);
    setFormData({
      numero_guia: cirurgia.numero_guia,
      paciente_nome: cirurgia.paciente_nome,
      convenio_id: cirurgia.convenio,
      data_cirurgia: cirurgia.data_cirurgia,
      hora_inicio: cirurgia.hora_inicio,
      hora_fim: cirurgia.hora_fim,
      sala_cirurgica: cirurgia.sala_cirurgica,
      codigo_cbhpm_principal: cirurgia.codigo_cbhpm_principal,
      procedimento_principal: cirurgia.procedimento_principal,
      valor_total: cirurgia.valor_total.toString(),
      status: cirurgia.status,
      observacoes: cirurgia.observacoes || ''
    });
    setProfissionaisCirurgia(cirurgia.profissionais || []);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Agendada': { variant: 'secondary', color: 'text-blue-600' },
      'Em Andamento': { variant: 'default', color: 'text-yellow-600' },
      'Realizada': { variant: 'default', color: 'text-green-600' },
      'Cancelada': { variant: 'destructive', color: 'text-red-600' }
    };

    const config = statusConfig[status] || { variant: 'outline', color: 'text-gray-600' };
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    );
  };

  const filteredCirurgias = cirurgias.filter(cirurgia => {
    return cirurgia.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
           cirurgia.numero_guia.toLowerCase().includes(searchTerm.toLowerCase()) ||
           cirurgia.procedimento_principal.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPercentual = profissionaisCirurgia.reduce((sum, prof) => sum + (parseFloat(prof.percentual) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scissors className="w-6 h-6 text-blue-600" />
            Cirurgias / Procedimentos
          </h1>
          <p className="text-muted-foreground">
            Registro de atos cirúrgicos e honorários múltiplos com divisão de valores
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Cirurgia
            </Button>
          </DialogTrigger>
          <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide overflow-y-auto modal-content-scroll">
            <DialogHeader>
              <DialogTitle>
                {editingCirurgia ? 'Editar Cirurgia' : 'Nova Cirurgia / Procedimento'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="dados-gerais" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
                  <TabsTrigger value="profissionais">
                    Profissionais ({profissionaisCirurgia.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dados-gerais" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paciente_nome">Nome do Paciente</Label>
                      <Input
                        id="paciente_nome"
                        value={formData.paciente_nome}
                        onChange={(e) => setFormData({...formData, paciente_nome: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="convenio_id">Convênio</Label>
                      <Select 
                        value={formData.convenio_id}
                        onValueChange={(value) => setFormData({...formData, convenio_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o convênio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unimed">Unimed</SelectItem>
                          <SelectItem value="bradesco">Bradesco Saúde</SelectItem>
                          <SelectItem value="sulamérica">SulAmérica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="data_cirurgia">Data da Cirurgia</Label>
                      <Input
                        id="data_cirurgia"
                        type="date"
                        value={formData.data_cirurgia}
                        onChange={(e) => setFormData({...formData, data_cirurgia: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="sala_cirurgica">Sala Cirúrgica</Label>
                      <Select 
                        value={formData.sala_cirurgica}
                        onValueChange={(value) => setFormData({...formData, sala_cirurgica: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a sala" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sala 1">Sala 1</SelectItem>
                          <SelectItem value="Sala 2">Sala 2</SelectItem>
                          <SelectItem value="Sala 3">Sala 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="hora_inicio">Hora de Início</Label>
                      <Input
                        id="hora_inicio"
                        type="time"
                        value={formData.hora_inicio}
                        onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="hora_fim">Hora de Fim</Label>
                      <Input
                        id="hora_fim"
                        type="time"
                        value={formData.hora_fim}
                        onChange={(e) => setFormData({...formData, hora_fim: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="codigo_cbhpm_principal">Código CBHPM</Label>
                      <Input
                        id="codigo_cbhpm_principal"
                        value={formData.codigo_cbhpm_principal ? formData.codigo_cbhpm_principal.toUpperCase() : ""}
                        onChange={(e) => {
                          const normalized = normalizeCodeCBHPM(e.target.value);
                          setFormData({...formData, codigo_cbhpm_principal: normalized});
                        }}
                        placeholder="Ex: 1.01.01.01-2"
                        className="font-bold text-lg tracking-widest text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="valor_total">Valor Total (R$)</Label>
                      <Input
                        id="valor_total"
                        type="number"
                        step="0.01"
                        value={formData.valor_total}
                        onChange={(e) => {
                          setFormData({...formData, valor_total: e.target.value});
                        }}
                        onBlur={recalcularValoresProfissionais}
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="procedimento_principal">Procedimento Principal</Label>
                      <Input
                        id="procedimento_principal"
                        value={formData.procedimento_principal}
                        onChange={(e) => setFormData({...formData, procedimento_principal: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.status}
                        onValueChange={(value) => setFormData({...formData, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Agendada">Agendada</SelectItem>
                          <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                          <SelectItem value="Realizada">Realizada</SelectItem>
                          <SelectItem value="Cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="profissionais" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium">Equipe Cirúrgica</h3>
                      <p className="text-sm text-muted-foreground">
                        Distribua os honorários entre os profissionais
                      </p>
                    </div>
                    <Button type="button" onClick={addProfissional} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Profissional
                    </Button>
                  </div>

                  {profissionaisCirurgia.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum profissional adicionado à equipe
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Profissional</TableHead>
                              <TableHead>Função</TableHead>
                              <TableHead>Percentual (%)</TableHead>
                              <TableHead>Valor (R$)</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {profissionaisCirurgia.map((prof) => (
                              <TableRow key={prof.id}>
                                <TableCell>
                                  <Select 
                                    value={prof.profissional_id}
                                    onValueChange={(value) => updateProfissional(prof.id, 'profissional_id', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o profissional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {mockProfissionais.map((profissional) => (
                                        <SelectItem key={profissional.id} value={profissional.id}>
                                          {profissional.nome}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select 
                                    value={prof.funcao}
                                    onValueChange={(value) => updateProfissional(prof.id, 'funcao', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Cirurgião">Cirurgião</SelectItem>
                                      <SelectItem value="Auxiliar">Auxiliar</SelectItem>
                                      <SelectItem value="Anestesista">Anestesista</SelectItem>
                                      <SelectItem value="Instrumentador">Instrumentador</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={prof.percentual}
                                    onChange={(e) => updateProfissional(prof.id, 'percentual', e.target.value)}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="font-mono text-sm">
                                    R$ {(prof.valor || 0).toFixed(2)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeProfissional(prof.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">Total Distribuído:</span>
                              <span className={`ml-2 ${totalPercentual === 100 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalPercentual.toFixed(1)}%
                              </span>
                              {totalPercentual !== 100 && (
                                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                                  <AlertTriangle className="w-4 h-4" />
                                  A soma deve ser 100%
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Valor Total:</div>
                              <div className="text-xl font-bold">
                                R$ {(formData.valor_total || 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingCirurgia(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={totalPercentual !== 100 && profissionaisCirurgia.length > 0}
                >
                  {editingCirurgia ? 'Atualizar' : 'Agendar'} Cirurgia
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
                  placeholder="Buscar por paciente, número da guia ou procedimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button variant="outline" onClick={fetchCirurgias}>
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{cirurgias.length}</div>
            <p className="text-sm text-muted-foreground">Total de Cirurgias</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {cirurgias.filter(c => c.status === 'Agendada').length}
            </div>
            <p className="text-sm text-muted-foreground">Agendadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {cirurgias.filter(c => c.status === 'Realizada').length}
            </div>
            <p className="text-sm text-muted-foreground">Realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              R$ {cirurgias.reduce((sum, c) => sum + c.valor_total, 0).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Cirurgias */}
      <Card>
        <CardHeader>
          <CardTitle>Cirurgias Registradas ({filteredCirurgias.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número da Guia</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Procedimento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Profissionais</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCirurgias.map((cirurgia) => (
                <TableRow key={cirurgia.id}>
                  <TableCell className="font-mono text-sm">
                    {cirurgia.numero_guia}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {cirurgia.paciente_nome}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cirurgia.procedimento_principal}</div>
                      <div className="text-xs text-muted-foreground">
                        {cirurgia.codigo_cbhpm_principal}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {cirurgia.data_cirurgia}
                    </div>
                  </TableCell>
                  <TableCell>
                    {cirurgia.duracao ? (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {cirurgia.duracao}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="secondary">
                        {cirurgia.total_profissionais} profissionais
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      R$ {cirurgia.valor_total.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(cirurgia.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(cirurgia)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredCirurgias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchTerm 
                      ? 'Nenhuma cirurgia encontrada com os filtros aplicados.'
                      : 'Nenhuma cirurgia agendada ainda.'
                    }
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

