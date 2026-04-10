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
import { 
  Microscope, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Search,
  Calendar,
  User,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Nova Guia SADT
 * Ligação direta com atendimentos e solicitações de exames/procedimentos
 */
export default function NovaGuiaSADT() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [guiasSADT, setGuiasSADT] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuia, setEditingGuia] = useState(null);
  const [selectedProcedimentos, setSelectedProcedimentos] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    numero_guia: '',
    paciente_id: '',
    paciente_nome: '',
    convenio_id: '',
    solicitante: '',
    executante: '',
    data_solicitacao: new Date().toISOString().split('T')[0],
    data_execucao: '',
    observacoes: ''
  });

  // Mock data para demonstração
  const mockGuiasSADT = [
    {
      id: 'SADT001',
      numero_guia: 'SADT001-2025-001',
      paciente_nome: 'Maria Silva Santos',
      convenio: 'Unimed',
      solicitante: 'Dr. João Cardiologia',
      executante: 'Clínica de Exames Ltda',
      data_solicitacao: '2025-10-30',
      data_execucao: '2025-10-30',
      status: 'Em Andamento',
      total_procedimentos: 2,
      valor_total: 320.00,
      procedimentos: [
        {
          id: 'P1',
          codigo_tuss: '40301010',
          descricao: 'Eletrocardiograma',
          quantidade: 1,
          valor_unitario: 80.00,
          valor_total: 80.00
        },
        {
          id: 'P2',
          codigo_tuss: '40201027',
          descricao: 'Ecocardiograma Transtorácico',
          quantidade: 1,
          valor_unitario: 240.00,
          valor_total: 240.00
        }
      ]
    },
    {
      id: 'SADT002',
      numero_guia: 'SADT002-2025-002',
      paciente_nome: 'Pedro Santos Lima',
      convenio: 'Bradesco Saúde',
      solicitante: 'Dra. Ana Pediatria',
      executante: 'Lab. Diagnósticos SA',
      data_solicitacao: '2025-10-29',
      data_execucao: '2025-10-30',
      status: 'Finalizada',
      total_procedimentos: 3,
      valor_total: 150.00,
      procedimentos: [
        {
          id: 'P3',
          codigo_tuss: '40301150',
          descricao: 'Hemograma Completo',
          quantidade: 1,
          valor_unitario: 50.00,
          valor_total: 50.00
        },
        {
          id: 'P4',
          codigo_tuss: '40301230',
          descricao: 'Glicemia de Jejum',
          quantidade: 1,
          valor_unitario: 25.00,
          valor_total: 25.00
        },
        {
          id: 'P5',
          codigo_tuss: '40301190',
          descricao: 'Colesterol Total e Frações',
          quantidade: 1,
          valor_unitario: 75.00,
          valor_total: 75.00
        }
      ]
    }
  ];

  // Mock procedimentos disponíveis
  const mockProcedimentos = [
    { codigo_tuss: '40301010', descricao: 'Eletrocardiograma', valor_referencia: 80.00 },
    { codigo_tuss: '40201027', descricao: 'Ecocardiograma Transtorácico', valor_referencia: 240.00 },
    { codigo_tuss: '40301150', descricao: 'Hemograma Completo', valor_referencia: 50.00 },
    { codigo_tuss: '40301230', descricao: 'Glicemia de Jejum', valor_referencia: 25.00 },
    { codigo_tuss: '40301190', descricao: 'Colesterol Total e Frações', valor_referencia: 75.00 },
    { codigo_tuss: '40201020', descricao: 'Ultrassom Abdominal Total', valor_referencia: 120.00 },
    { codigo_tuss: '40401030', descricao: 'Raio X de Tórax PA', valor_referencia: 60.00 }
  ];

  useEffect(() => {
    fetchGuiasSADT();
  }, [clinicId]);

  const fetchGuiasSADT = async () => {
    setLoading(true);
    try {
      // Simular busca no banco
      setGuiasSADT(mockGuiasSADT);
    } catch (error) {
      console.error('Erro ao buscar guias SADT:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as guias SADT.",
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
    const sequence = String(guiasSADT.length + 1).padStart(3, '0');
    return `SADT${sequence}-${year}-${month}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedProcedimentos.length === 0) {
      toast({
        title: "Procedimentos obrigatórios",
        description: "Adicione pelo menos um procedimento à guia.",
        variant: "destructive"
      });
      return;
    }

    try {
      const guiaData = {
        ...formData,
        numero_guia: editingGuia ? editingGuia.numero_guia : generateGuiaNumber(),
        procedimentos: selectedProcedimentos,
        valor_total: selectedProcedimentos.reduce((sum, proc) => sum + proc.valor_total, 0)
      };

      console.log('Salvando guia SADT:', guiaData);

      toast({
        title: editingGuia ? "Guia atualizada" : "Guia criada",
        description: `Guia SADT ${editingGuia ? 'atualizada' : 'criada'} com sucesso.`
      });

      setIsDialogOpen(false);
      setEditingGuia(null);
      resetForm();
      fetchGuiasSADT();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a guia SADT.",
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
      solicitante: '',
      executante: '',
      data_solicitacao: new Date().toISOString().split('T')[0],
      data_execucao: '',
      observacoes: ''
    });
    setSelectedProcedimentos([]);
  };

  const addProcedimento = (procedimento) => {
    const newProc = {
      ...procedimento,
      id: Date.now().toString(),
      quantidade: 1,
      valor_unitario: procedimento.valor_referencia,
      valor_total: procedimento.valor_referencia
    };

    setSelectedProcedimentos([...selectedProcedimentos, newProc]);
  };

  const updateProcedimento = (id, field, value) => {
    setSelectedProcedimentos(procs => 
      procs.map(proc => {
        if (proc.id === id) {
          const updated = { ...proc, [field]: value };
          if (field === 'quantidade' || field === 'valor_unitario') {
            updated.valor_total = updated.quantidade * updated.valor_unitario;
          }
          return updated;
        }
        return proc;
      })
    );
  };

  const removeProcedimento = (id) => {
    setSelectedProcedimentos(procs => procs.filter(proc => proc.id !== id));
  };

  const handleEdit = (guia) => {
    setEditingGuia(guia);
    setFormData({
      numero_guia: guia.numero_guia,
      paciente_nome: guia.paciente_nome,
      convenio_id: guia.convenio,
      solicitante: guia.solicitante,
      executante: guia.executante,
      data_solicitacao: guia.data_solicitacao,
      data_execucao: guia.data_execucao,
      observacoes: guia.observacoes || ''
    });
    setSelectedProcedimentos(guia.procedimentos || []);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Em Andamento': { variant: 'secondary', color: 'text-blue-600' },
      'Finalizada': { variant: 'default', color: 'text-green-600' },
      'Cancelada': { variant: 'destructive', color: 'text-red-600' }
    };

    const config = statusConfig[status] || { variant: 'outline', color: 'text-gray-600' };
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    );
  };

  const filteredGuias = guiasSADT.filter(guia => {
    return guia.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
           guia.numero_guia.toLowerCase().includes(searchTerm.toLowerCase()) ||
           guia.solicitante.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Microscope className="w-6 h-6 text-blue-600" />
            Nova Guia SADT
          </h1>
          <p className="text-muted-foreground">
            Ligação direta com atendimentos e solicitações de exames
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Guia SADT
            </Button>
          </DialogTrigger>
          <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide overflow-y-auto modal-content-scroll">
            <DialogHeader>
              <DialogTitle>
                {editingGuia ? 'Editar Guia SADT' : 'Nova Guia SADT'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="dados-gerais" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
                  <TabsTrigger value="procedimentos">
                    Procedimentos ({selectedProcedimentos.length})
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
                          <SelectItem value="amil">Amil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="solicitante">Médico Solicitante</Label>
                      <Input
                        id="solicitante"
                        value={formData.solicitante}
                        onChange={(e) => setFormData({...formData, solicitante: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="executante">Executante</Label>
                      <Input
                        id="executante"
                        value={formData.executante}
                        onChange={(e) => setFormData({...formData, executante: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="data_solicitacao">Data da Solicitação</Label>
                      <Input
                        id="data_solicitacao"
                        type="date"
                        value={formData.data_solicitacao}
                        onChange={(e) => setFormData({...formData, data_solicitacao: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="data_execucao">Data da Execução</Label>
                      <Input
                        id="data_execucao"
                        type="date"
                        value={formData.data_execucao}
                        onChange={(e) => setFormData({...formData, data_execucao: e.target.value})}
                      />
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

                <TabsContent value="procedimentos" className="space-y-4">
                  {/* Lista de procedimentos disponíveis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Adicionar Procedimentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {mockProcedimentos.map((proc) => (
                          <Button
                            key={proc.codigo_tuss}
                            type="button"
                            variant="outline"
                            className="justify-start h-auto p-3"
                            onClick={() => addProcedimento(proc)}
                          >
                            <div className="text-left">
                              <div className="font-semibold text-xs">{proc.codigo_tuss}</div>
                              <div className="text-xs text-muted-foreground">{proc.descricao}</div>
                              <div className="text-xs font-medium text-green-600">
                                R$ {proc.valor_referencia.toFixed(2)}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Procedimentos selecionados */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Procedimentos Selecionados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProcedimentos.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum procedimento selecionado
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código TUSS</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Qtd</TableHead>
                              <TableHead>Valor Unit.</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedProcedimentos.map((proc) => (
                              <TableRow key={proc.id}>
                                <TableCell>
                                  <Badge variant="outline">{proc.codigo_tuss}</Badge>
                                </TableCell>
                                <TableCell>{proc.descricao}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={proc.quantidade}
                                    onChange={(e) => updateProcedimento(proc.id, 'quantidade', parseInt(e.target.value))}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={proc.valor_unitario}
                                    onChange={(e) => updateProcedimento(proc.id, 'valor_unitario', parseFloat(e.target.value))}
                                    className="w-24"
                                  />
                                </TableCell>
                                <TableCell className="font-semibold">
                                  R$ {proc.valor_total.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeProcedimento(proc.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}

                      {selectedProcedimentos.length > 0 && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Total da Guia:</span>
                            <span className="text-xl font-bold text-green-600">
                              R$ {selectedProcedimentos.reduce((sum, proc) => sum + proc.valor_total, 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingGuia(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {editingGuia ? 'Atualizar' : 'Criar'} Guia
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
                  placeholder="Buscar por paciente, número da guia ou solicitante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button variant="outline" onClick={fetchGuiasSADT}>
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{guiasSADT.length}</div>
            <p className="text-sm text-muted-foreground">Total de Guias SADT</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {guiasSADT.filter(g => g.status === 'Em Andamento').length}
            </div>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {guiasSADT.filter(g => g.status === 'Finalizada').length}
            </div>
            <p className="text-sm text-muted-foreground">Finalizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              R$ {guiasSADT.reduce((sum, g) => sum + g.valor_total, 0).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Valor Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Guias SADT */}
      <Card>
        <CardHeader>
          <CardTitle>Guias SADT ({filteredGuias.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número da Guia</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Convênio</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead>Procedimentos</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuias.map((guia) => (
                <TableRow key={guia.id}>
                  <TableCell className="font-mono text-sm">
                    {guia.numero_guia}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {guia.paciente_nome}
                    </div>
                  </TableCell>
                  <TableCell>{guia.convenio}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-muted-foreground" />
                      {guia.solicitante}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {guia.data_solicitacao}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {guia.total_procedimentos} procedimentos
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {guia.valor_total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(guia.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(guia)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredGuias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchTerm 
                      ? 'Nenhuma guia SADT encontrada com os filtros aplicados.'
                      : 'Nenhuma guia SADT criada ainda.'
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

