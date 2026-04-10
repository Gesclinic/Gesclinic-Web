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
import { normalizeCodeCBHPM } from '@/utils/formatters';
import { 
  Pill, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Package,
  AlertTriangle,
  Calendar,
  TrendingDown,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Materiais e Medicamentos
 * Controle de itens lançados por exame ou cirurgia
 * Integração com estoque para baixa automática
 */
export default function MateriaisMedicamentos() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [materiais, setMateriais] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('lancamentos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('lancamento'); // 'lancamento' ou 'material'
  const [editingItem, setEditingItem] = useState(null);

  // Form state para lançamentos
  const [formLancamento, setFormLancamento] = useState({
    guia_sadt_id: '',
    material_id: '',
    lote: '',
    validade: '',
    quantidade: 1,
    valor_unitario: '',
    observacoes: ''
  });

  // Form state para materiais
  const [formMaterial, setFormMaterial] = useState({
    codigo_cbhpm: '',
    codigo_tuss: '',
    descricao: '',
    unidade_medida: 'UN',
    valor_referencia: '',
    categoria: '',
    controlado: false
  });

  // Mock data para demonstração
  const mockMateriais = [
    {
      id: 'MAT001',
      codigo_cbhpm: '30101012',
      codigo_tuss: '80101012',
      descricao: 'Seringa Descartável 10ml',
      unidade_medida: 'UN',
      valor_referencia: 2.50,
      categoria: 'Material Cirúrgico',
      controlado: false,
      estoque_atual: 500,
      estoque_minimo: 100
    },
    {
      id: 'MAT002',
      codigo_cbhpm: '30201015',
      codigo_tuss: '80201015',
      descricao: 'Cateter Venoso Central',
      unidade_medida: 'UN',
      valor_referencia: 85.00,
      categoria: 'Material Cirúrgico',
      controlado: true,
      estoque_atual: 25,
      estoque_minimo: 10
    },
    {
      id: 'MED001',
      codigo_cbhpm: '90101020',
      codigo_tuss: '90101020',
      descricao: 'Anestésico Local Lidocaína 2%',
      unidade_medida: 'AMP',
      valor_referencia: 12.00,
      categoria: 'Medicamentos',
      controlado: true,
      estoque_atual: 80,
      estoque_minimo: 20
    },
    {
      id: 'MED002',
      codigo_cbhpm: '90201025',
      codigo_tuss: '90201025',
      descricao: 'Contraste Iodado 100ml',
      unidade_medida: 'FR',
      valor_referencia: 45.00,
      categoria: 'Medicamentos',
      controlado: false,
      estoque_atual: 15,
      estoque_minimo: 5
    }
  ];

  const mockLancamentos = [
    {
      id: 'LAN001',
      guia_sadt: 'SADT001-2025-001',
      paciente_nome: 'Maria Silva Santos',
      material_id: 'MAT001',
      material_descricao: 'Seringa Descartável 10ml',
      lote: 'LT2025001',
      validade: '2026-12-31',
      quantidade: 2,
      valor_unitario: 2.50,
      valor_total: 5.00,
      data_lancamento: '2025-10-30',
      status: 'Lançado',
      baixa_estoque: true
    },
    {
      id: 'LAN002',
      guia_sadt: 'SADT001-2025-001',
      paciente_nome: 'Maria Silva Santos',
      material_id: 'MED001',
      material_descricao: 'Anestésico Local Lidocaína 2%',
      lote: 'LT2025050',
      validade: '2025-11-15',
      quantidade: 1,
      valor_unitario: 12.00,
      valor_total: 12.00,
      data_lancamento: '2025-10-30',
      status: 'Lançado',
      baixa_estoque: true
    },
    {
      id: 'LAN003',
      guia_sadt: 'SADT002-2025-002',
      paciente_nome: 'Pedro Santos Lima',
      material_id: 'MED002',
      material_descricao: 'Contraste Iodado 100ml',
      lote: 'LT2025075',
      validade: '2026-08-20',
      quantidade: 1,
      valor_unitario: 45.00,
      valor_total: 45.00,
      data_lancamento: '2025-10-29',
      status: 'Pendente Baixa',
      baixa_estoque: false
    }
  ];

  useEffect(() => {
    fetchData();
  }, [clinicId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Simular busca no banco
      setMateriais(mockMateriais);
      setLancamentos(mockLancamentos);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLancamento = async (e) => {
    e.preventDefault();
    try {
      console.log('Criando lançamento:', formLancamento);

      toast({
        title: "Lançamento registrado",
        description: "Material/medicamento lançado com sucesso."
      });

      setIsDialogOpen(false);
      resetFormLancamento();
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar o lançamento.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitMaterial = async (e) => {
    e.preventDefault();
    try {
      console.log('Cadastrando material:', formMaterial);

      toast({
        title: "Material cadastrado",
        description: "Material/medicamento cadastrado com sucesso."
      });

      setIsDialogOpen(false);
      resetFormMaterial();
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o material.",
        variant: "destructive"
      });
    }
  };

  const resetFormLancamento = () => {
    setFormLancamento({
      guia_sadt_id: '',
      material_id: '',
      lote: '',
      validade: '',
      quantidade: 1,
      valor_unitario: '',
      observacoes: ''
    });
  };

  const resetFormMaterial = () => {
    setFormMaterial({
      codigo_cbhpm: '',
      codigo_tuss: '',
      descricao: '',
      unidade_medida: 'UN',
      valor_referencia: '',
      categoria: '',
      controlado: false
    });
  };

  const handleBaixaEstoque = async (lancamento) => {
    try {
      console.log('Executando baixa no estoque:', lancamento.id);
      
      toast({
        title: "Baixa executada",
        description: "Baixa no estoque executada com sucesso."
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível executar a baixa no estoque.",
        variant: "destructive"
      });
    }
  };

  const openLancamentoDialog = () => {
    setDialogType('lancamento');
    setEditingItem(null);
    resetFormLancamento();
    setIsDialogOpen(true);
  };

  const openMaterialDialog = () => {
    setDialogType('material');
    setEditingItem(null);
    resetFormMaterial();
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Lançado': { variant: 'default', color: 'text-green-600', icon: CheckCircle },
      'Pendente Baixa': { variant: 'secondary', color: 'text-yellow-600', icon: AlertTriangle }
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

  const getEstoqueBadge = (atual, minimo) => {
    if (atual <= minimo) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Baixo
        </Badge>
      );
    } else if (atual <= minimo * 2) {
      return (
        <Badge variant="secondary" className="text-yellow-600 gap-1">
          <TrendingDown className="w-3 h-3" />
          Atenção
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="text-green-600 gap-1">
        <CheckCircle className="w-3 h-3" />
        OK
      </Badge>
    );
  };

  const filteredLancamentos = lancamentos.filter(lanc => {
    return lanc.guia_sadt.toLowerCase().includes(searchTerm.toLowerCase()) ||
           lanc.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
           lanc.material_descricao.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredMateriais = materiais.filter(mat => {
    return mat.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
           mat.codigo_cbhpm.toLowerCase().includes(searchTerm.toLowerCase()) ||
           mat.codigo_tuss.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pill className="w-6 h-6 text-blue-600" />
            Materiais e Medicamentos
          </h1>
          <p className="text-muted-foreground">
            Controle de itens lançados por exame ou cirurgia com integração ao estoque
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={openMaterialDialog}>
            <Package className="w-4 h-4" />
            Cadastrar Material
          </Button>
          
          <Button className="gap-2" onClick={openLancamentoDialog}>
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{lancamentos.length}</div>
            <p className="text-sm text-muted-foreground">Total de Lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {lancamentos.filter(l => l.baixa_estoque).length}
            </div>
            <p className="text-sm text-muted-foreground">Baixas Executadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {lancamentos.filter(l => !l.baixa_estoque).length}
            </div>
            <p className="text-sm text-muted-foreground">Pendentes de Baixa</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {materiais.filter(m => m.estoque_atual <= m.estoque_minimo).length}
            </div>
            <p className="text-sm text-muted-foreground">Estoque Baixo</p>
          </CardContent>
        </Card>
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
                  placeholder="Buscar por guia, paciente, material ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button variant="outline" onClick={fetchData}>
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos ({lancamentos.length})</TabsTrigger>
          <TabsTrigger value="materiais">Materiais ({materiais.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos">
          <Card>
            <CardHeader>
              <CardTitle>Lançamentos de Materiais ({filteredLancamentos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guia SADT</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Material/Medicamento</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLancamentos.map((lancamento) => (
                    <TableRow key={lancamento.id}>
                      <TableCell className="font-mono text-sm">
                        {lancamento.guia_sadt}
                      </TableCell>
                      <TableCell>{lancamento.paciente_nome}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lancamento.material_descricao}</div>
                          <div className="text-xs text-muted-foreground">ID: {lancamento.material_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lancamento.lote}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {lancamento.validade}
                        </div>
                      </TableCell>
                      <TableCell>{lancamento.quantidade}</TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {lancamento.valor_total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(lancamento.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!lancamento.baixa_estoque && (
                            <Button
                              size="sm"
                              onClick={() => handleBaixaEstoque(lancamento)}
                            >
                              <TrendingDown className="w-3 h-3 mr-1" />
                              Baixar
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => console.log('Editar:', lancamento.id)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredLancamentos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhum lançamento encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materiais">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro de Materiais ({filteredMateriais.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código CBHPM</TableHead>
                    <TableHead>Código TUSS</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor Referência</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Status Estoque</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMateriais.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <Badge variant="outline">{material.codigo_cbhpm}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{material.codigo_tuss}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{material.descricao}</div>
                          <div className="text-xs text-muted-foreground">
                            {material.unidade_medida}
                            {material.controlado && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Controlado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{material.categoria}</TableCell>
                      <TableCell className="text-right">
                        R$ {material.valor_referencia.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-semibold">{material.estoque_atual}</div>
                          <div className="text-xs text-muted-foreground">
                            Mín: {material.estoque_minimo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getEstoqueBadge(material.estoque_atual, material.estoque_minimo)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => console.log('Editar material:', material.id)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredMateriais.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum material encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'lancamento' 
                ? 'Novo Lançamento de Material' 
                : 'Cadastrar Material/Medicamento'
              }
            </DialogTitle>
          </DialogHeader>

          {dialogType === 'lancamento' ? (
            <form onSubmit={handleSubmitLancamento} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guia_sadt_id">Guia SADT</Label>
                  <Select 
                    value={formLancamento.guia_sadt_id}
                    onValueChange={(value) => setFormLancamento({...formLancamento, guia_sadt_id: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a guia SADT" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SADT001-2025-001">SADT001-2025-001 - Maria Silva</SelectItem>
                      <SelectItem value="SADT002-2025-002">SADT002-2025-002 - Pedro Santos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="material_id">Material/Medicamento</Label>
                  <Select 
                    value={formLancamento.material_id}
                    onValueChange={(value) => {
                      const material = materiais.find(m => m.id === value);
                      setFormLancamento({
                        ...formLancamento, 
                        material_id: value,
                        valor_unitario: material ? material.valor_referencia.toString() : ''
                      });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materiais.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="lote">Lote</Label>
                  <Input
                    id="lote"
                    value={formLancamento.lote}
                    onChange={(e) => setFormLancamento({...formLancamento, lote: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="validade">Validade</Label>
                  <Input
                    id="validade"
                    type="date"
                    value={formLancamento.validade}
                    onChange={(e) => setFormLancamento({...formLancamento, validade: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={formLancamento.quantidade}
                    onChange={(e) => setFormLancamento({...formLancamento, quantidade: parseInt(e.target.value)})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="valor_unitario">Valor Unitário (R$)</Label>
                  <Input
                    id="valor_unitario"
                    type="number"
                    step="0.01"
                    value={formLancamento.valor_unitario}
                    onChange={(e) => setFormLancamento({...formLancamento, valor_unitario: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Registrar Lançamento
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="codigo_cbhpm">Código CBHPM</Label>
                  <Input
                    id="codigo_cbhpm"
                    value={formMaterial.codigo_cbhpm ? formMaterial.codigo_cbhpm.toUpperCase() : ""}
                    onChange={(e) => {
                      const normalized = normalizeCodeCBHPM(e.target.value);
                      setFormMaterial({...formMaterial, codigo_cbhpm: normalized});
                    }}
                    placeholder="Ex: 1.01.01.01-2"
                    className="font-bold text-lg tracking-widest text-gray-900"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="codigo_tuss">Código TUSS</Label>
                  <Input
                    id="codigo_tuss"
                    value={formMaterial.codigo_tuss ? formMaterial.codigo_tuss.toUpperCase() : ""}
                    onChange={(e) => {
                      const normalized = normalizeCodeCBHPM(e.target.value);
                      setFormMaterial({...formMaterial, codigo_tuss: normalized});
                    }}
                    placeholder="Ex: 0101010101"
                    className="font-bold text-lg tracking-widest text-gray-900"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formMaterial.descricao}
                    onChange={(e) => setFormMaterial({...formMaterial, descricao: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select 
                    value={formMaterial.categoria}
                    onValueChange={(value) => setFormMaterial({...formMaterial, categoria: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Material Cirúrgico">Material Cirúrgico</SelectItem>
                      <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                      <SelectItem value="Descartáveis">Descartáveis</SelectItem>
                      <SelectItem value="Contraste">Contraste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="unidade_medida">Unidade de Medida</Label>
                  <Select 
                    value={formMaterial.unidade_medida}
                    onValueChange={(value) => setFormMaterial({...formMaterial, unidade_medida: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">Unidade</SelectItem>
                      <SelectItem value="AMP">Ampola</SelectItem>
                      <SelectItem value="FR">Frasco</SelectItem>
                      <SelectItem value="ML">Mililitro</SelectItem>
                      <SelectItem value="G">Grama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="valor_referencia">Valor de Referência (R$)</Label>
                  <Input
                    id="valor_referencia"
                    type="number"
                    step="0.01"
                    value={formMaterial.valor_referencia}
                    onChange={(e) => setFormMaterial({...formMaterial, valor_referencia: e.target.value})}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="controlado"
                    checked={formMaterial.controlado}
                    onChange={(e) => setFormMaterial({...formMaterial, controlado: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="controlado">Material Controlado</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Cadastrar Material
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

