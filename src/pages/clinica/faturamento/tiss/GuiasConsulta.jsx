import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  DialogDescription,
  DialogFooter,
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
import { normalizeCodeCBHPM } from '@/utils/formatters/formatters';
import {
  Plus,
  Edit,
  Search,
  FileCode,
  PackagePlus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  criarGuia,
  atualizarGuia,
  listarGuias,
  deletarGuia,
} from '@/modules/financeiro/services/guiasApi';

/**
 * Componente para Guias de Consulta SP/SADT
 * Permite criação, edição e visualização de guias vinculadas a atendimentos
 */
export default function GuiasConsulta({
  tipoGuia = 'SP',
  titulo = 'Guias de Consulta',
  descricao = 'Criação, edição e visualização de guias vinculadas a atendimentos',
  allowTipoChange = false,
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const [guias, setGuias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payerFilter, setPayerFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuia, setEditingGuia] = useState(null);

  // Form state
  const buildInitialForm = () => ({
    tipo_guia: tipoGuia,
    paciente_nome: '',
    convenio: '',
    plano: '',
    numero_carteirinha: '',
    profissional: '',
    codigo_cbhpm: '',
    valor: '',
    observacoes: '',
  });

  const [formData, setFormData] = useState(buildInitialForm);

  useEffect(() => {
    resetForm();
    fetchGuias();
  }, [clinicId, tipoGuia]);

  const fetchGuias = async () => {
    setLoading(true);
    try {
      const data = await listarGuias();
      setGuias((data || []).filter((guia) => (guia.tipo_guia || guia.tipo) === tipoGuia));
    } catch (error) {
      console.error('❌ Erro ao buscar guias:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as guias.',
        variant: 'destructive',
      });
      setGuias([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validar campos obrigatórios
      if (!formData.paciente_nome.trim()) {
        toast({
          title: 'Validação',
          description: 'Nome do paciente é obrigatório.',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.numero_carteirinha.trim()) {
        toast({
          title: 'Validação',
          description: 'Número de carteirinha/matrícula é obrigatório.',
          variant: 'destructive',
        });
        return;
      }

      if (editingGuia) {
        // Atualizar guia existente
        console.log('📝 Atualizando guia:', editingGuia.id, formData);
        await atualizarGuia(editingGuia.id, { ...formData, tipo_guia: allowTipoChange ? formData.tipo_guia : tipoGuia });
        toast({
          title: '✅ Guia atualizada',
          description: 'Guia atualizada com sucesso.',
        });
      } else {
        // Criar nova guia
        console.log('➕ Criando nova guia:', formData);
        const novaGuia = await criarGuia({ ...formData, tipo_guia: allowTipoChange ? formData.tipo_guia : tipoGuia });
        console.log('✅ Guia criada:', novaGuia);
        toast({
          title: '✅ Guia criada',
          description: `Guia criada com sucesso. Matrícula/Carteirinha: ${formData.numero_carteirinha}`,
        });
      }

      setIsDialogOpen(false);
      setEditingGuia(null);
      resetForm();
      await fetchGuias();
    } catch (error) {
      console.error('❌ Erro ao salvar guia:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a guia.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData(buildInitialForm());
  };

  const handleDialogChange = (open) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingGuia(null);
      resetForm();
    }
  };

  const handleEdit = (guia) => {
    setEditingGuia(guia);
    setFormData({
      tipo_guia: guia.tipo_guia || guia.tipo || tipoGuia,
      paciente_nome: guia.paciente_nome,
      convenio: guia.convenio,
      plano: guia.plano,
      numero_carteirinha: guia.numero_carteirinha,
      profissional: guia.profissional,
      codigo_cbhpm: guia.codigo_cbhpm,
      valor: String(guia.valor || ''),
      observacoes: guia.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (guia) => {
    const editable = ['Aguardando XML', 'draft', 'rascunho', null, undefined].includes(guia.status);
    if (!editable) {
      toast({ title: 'Guia protegida', description: 'Guias já processadas devem ser corrigidas pelo fluxo de lote.', variant: 'destructive' });
      return;
    }
    if (!window.confirm(`Excluir a guia ${guia.numero_guia}? Esta ação não pode ser desfeita.`)) return;
    try {
      await deletarGuia(guia.id);
      toast({ title: 'Guia excluída', description: `${guia.numero_guia} foi removida.` });
      await fetchGuias();
    } catch (error) {
      toast({ title: 'Erro ao excluir guia', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Aguardando XML': { variant: 'outline', color: 'text-yellow-600' },
      'XML Gerado': { variant: 'default', color: 'text-green-600' },
      Enviado: { variant: 'secondary', color: 'text-blue-600' },
      Glosado: { variant: 'destructive', color: 'text-red-600' },
      Pago: { variant: 'success', color: 'text-green-600' },
    };

    const config = statusConfig[status] || { variant: 'outline', color: 'text-gray-600' };
    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    );
  };

  const payerOptions = useMemo(() => [...new Set(guias.map((guia) => guia.convenio || 'Particular'))]
    .sort((a, b) => a.localeCompare(b)), [guias]);
  const filteredGuias = guias.filter((guia) => {
    const matchesSearch =
      String(guia.paciente_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(guia.numero_guia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(guia.convenio || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || guia.status === statusFilter;
    const matchesPayer = payerFilter === 'all' || (guia.convenio || 'Particular') === payerFilter;

    return matchesSearch && matchesStatus && matchesPayer;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCode className="w-6 h-6 text-blue-600" />
            {titulo}
          </h1>
          <p className="text-muted-foreground">{descricao}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Guia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl gap-0 overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-4 text-left">
              <DialogTitle>{editingGuia ? 'Editar Guia' : `Nova ${titulo}`}</DialogTitle>
              <DialogDescription>
                Informe os dados da cobrança para gerar a guia e incluí-la em um lote TISS.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
              <div className="grid max-h-[calc(90vh-9rem)] grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tipo_guia">Tipo de Guia</Label>
                  <Select
                    value={formData.tipo_guia}
                    disabled={!allowTipoChange}
                    onValueChange={(value) => setFormData({ ...formData, tipo_guia: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SP">SP - Serviço Profissional</SelectItem>
                      <SelectItem value="SADT">SADT - Serviços Auxiliares Diagnósticos</SelectItem>
                      <SelectItem value="Internação">Internação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paciente_nome">Nome do Paciente</Label>
                  <Input
                    id="paciente_nome"
                    value={formData.paciente_nome}
                    onChange={(e) => setFormData({ ...formData, paciente_nome: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="convenio">Convênio</Label>
                  <Input
                    id="convenio"
                    value={formData.convenio}
                    onChange={(e) => setFormData({ ...formData, convenio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plano">Plano</Label>
                  <Input
                    id="plano"
                    value={formData.plano}
                    onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="numero_carteirinha">Número da Carteirinha</Label>
                  <Input
                    id="numero_carteirinha"
                    value={formData.numero_carteirinha}
                    onChange={(e) =>
                      setFormData({ ...formData, numero_carteirinha: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profissional">Profissional</Label>
                  <Input
                    id="profissional"
                    value={formData.profissional}
                    onChange={(e) => setFormData({ ...formData, profissional: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="codigo_cbhpm">Código CBHPM</Label>
                  <Input
                    id="codigo_cbhpm"
                    value={formData.codigo_cbhpm ? formData.codigo_cbhpm.toUpperCase() : ''}
                    onChange={(e) => {
                      const normalized = normalizeCodeCBHPM(e.target.value);
                      setFormData({ ...formData, codigo_cbhpm: normalized });
                    }}
                    placeholder="Ex: 1.01.01.01-2"
                    className="font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleDialogChange(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">{editingGuia ? 'Atualizar' : 'Criar'} Guia</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por paciente, número da guia ou convênio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Convênio</Label>
              <Select value={payerFilter} onValueChange={setPayerFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Convênios</SelectItem>
                  {payerOptions.map((payer) => <SelectItem key={payer} value={payer}>{payer}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Aguardando XML">Aguardando XML</SelectItem>
                  <SelectItem value="XML Gerado">XML Gerado</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                  <SelectItem value="Glosado">Glosado</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={fetchGuias}>
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Guias */}
      <Card>
        <CardHeader>
          <CardTitle>Guias Registradas ({filteredGuias.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número da Guia</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Convênio</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuias.map((guia) => (
                <TableRow key={guia.id}>
                  <TableCell className="font-mono text-sm">{guia.numero_guia}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{guia.tipo_guia || guia.tipo}</Badge>
                  </TableCell>
                  <TableCell>{guia.data_criacao}</TableCell>
                  <TableCell>{guia.paciente_nome}</TableCell>
                  <TableCell>{guia.convenio}</TableCell>
                  <TableCell>{guia.profissional}</TableCell>
                  <TableCell className="text-right">
                    {Number(guia.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>{getStatusBadge(guia.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(guia)}>
                        <Edit className="w-3 h-3" />
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => handleDelete(guia)} title="Excluir guia"><Trash2 className="w-3 h-3" /></Button>
                      <Button size="sm" onClick={() => navigate('/clinica/faturamento/lotes-faturamento')} className="gap-1"><PackagePlus className="w-3 h-3" />Adicionar ao lote</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredGuias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' || payerFilter !== 'all'
                      ? 'Nenhuma guia encontrada com os filtros aplicados.'
                      : 'Nenhuma guia cadastrada ainda.'}
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
