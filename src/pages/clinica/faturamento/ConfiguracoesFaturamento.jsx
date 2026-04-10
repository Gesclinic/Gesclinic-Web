import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  UserCheck, 
  Plus, 
  Edit, 
  Save,
  Settings,
  FileCode,
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Copy,
  Upload
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Componente para Configurações de Faturamento
 * Gerencia configurações TISS, convênios e parâmetros de faturamento
 */
export default function ConfiguracoesFaturamento() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [activeTab, setActiveTab] = useState('tiss');
  const [configTiss, setConfigTiss] = useState({});
  const [convenios, setConvenios] = useState([]);
  const [configGerais, setConfigGerais] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConvenio, setEditingConvenio] = useState(null);

  // Form states
  const [formConvenio, setFormConvenio] = useState({
    nome: '',
    codigo_ans: '',
    tipo: 'Médico',
    ativo: true,
    versao_tiss: '4.01.00',
    url_webservice: '',
    usuario_ws: '',
    senha_ws: '',
    certificado_digital: null,
    validar_procedimentos: true,
    exige_autorizacao: true,
    dias_vencimento: 30,
    percentual_iss: 0,
    observacoes: ''
  });

  // Mock data para configurações TISS
  const mockConfigTiss = {
    versao_padrao: '4.01.00',
    codigo_prestador: '123456789',
    nome_prestador: 'Clínica GesClinic',
    cnpj_prestador: '12.345.678/0001-99',
    cnes_prestador: '1234567',
    municipio_prestador: 'São Paulo',
    uf_prestador: 'SP',
    tipo_prestador: '01', // Pessoa Jurídica
    validar_xml: true,
    gerar_hash: true,
    assinar_digitalmente: true,
    certificado_ativo: true,
    caminho_certificado: 'C:\\Certificados\\clinica.p12',
    senha_certificado: '******',
    backup_automatico: true,
    dias_backup: 30
  };

  // Mock data para convênios
  const mockConvenios = [
    {
      id: 'conv_001',
      nome: 'Unimed Regional',
      codigo_ans: '34567',
      tipo: 'Médico',
      ativo: true,
      versao_tiss: '4.01.00',
      url_webservice: 'https://webservice.unimed.com.br/tiss',
      usuario_ws: 'clinica123',
      senha_ws: '******',
      certificado_digital: 'unimed_certificado.p12',
      validar_procedimentos: true,
      exige_autorizacao: true,
      dias_vencimento: 30,
      percentual_iss: 5.0,
      data_criacao: '2024-01-15',
      ultimo_envio: '2025-01-30'
    },
    {
      id: 'conv_002',
      nome: 'Bradesco Saúde',
      codigo_ans: '34568',
      tipo: 'Médico',
      ativo: true,
      versao_tiss: '4.01.00',
      url_webservice: 'https://api.bradescosegurosaude.com.br/tiss',
      usuario_ws: 'prestador456',
      senha_ws: '******',
      certificado_digital: null,
      validar_procedimentos: false,
      exige_autorizacao: false,
      dias_vencimento: 30,
      percentual_iss: 5.0,
      data_criacao: '2024-02-10',
      ultimo_envio: '2025-01-29'
    },
    {
      id: 'conv_003',
      nome: 'SulAmérica',
      codigo_ans: '34569',
      tipo: 'Médico',
      ativo: false,
      versao_tiss: '4.01.00',
      url_webservice: 'https://webservice.sulamerica.com.br/tiss',
      usuario_ws: 'clinica789',
      senha_ws: '******',
      certificado_digital: 'sulamerica_cert.p12',
      validar_procedimentos: true,
      exige_autorizacao: true,
      dias_vencimento: 45,
      percentual_iss: 5.0,
      data_criacao: '2024-03-05',
      ultimo_envio: null
    }
  ];

  // Mock data para configurações gerais
  const mockConfigGerais = {
    numeracao_automatica: true,
    formato_numero_guia: 'GUI{000000}-{YYYY}-{MM}',
    validar_cpf_paciente: true,
    exigir_carteirinha: true,
    backup_automatico: true,
    dias_backup: 7,
    notificar_glosas: true,
    email_notificacoes: 'admin@gesclinic.com.br',
    integrar_agenda: true,
    calcular_iss_automatico: true,
    margem_seguranca_glosa: 10.0,
    prazo_envio_lotes: 5
  };

  useEffect(() => {
    fetchConfiguracoes();
  }, [clinicId]);

  const fetchConfiguracoes = async () => {
    setLoading(true);
    try {
      setConfigTiss(mockConfigTiss);
      setConvenios(mockConvenios);
      setConfigGerais(mockConfigGerais);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfigTiss = async (e) => {
    e.preventDefault();
    try {
      console.log('Salvando configurações TISS:', configTiss);
      
      toast({
        title: "Configurações salvas",
        description: "Configurações TISS atualizadas com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
  };

  const handleSaveConfigGerais = async (e) => {
    e.preventDefault();
    try {
      console.log('Salvando configurações gerais:', configGerais);
      
      toast({
        title: "Configurações salvas",
        description: "Configurações gerais atualizadas com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitConvenio = async (e) => {
    e.preventDefault();
    try {
      const convenioData = {
        ...formConvenio,
        id: editingConvenio ? editingConvenio.id : `conv_${Date.now()}`,
        data_criacao: editingConvenio ? editingConvenio.data_criacao : new Date().toISOString().split('T')[0]
      };

      console.log('Salvando convênio:', convenioData);

      toast({
        title: editingConvenio ? "Convênio atualizado" : "Convênio criado",
        description: `Convênio ${editingConvenio ? 'atualizado' : 'criado'} com sucesso.`
      });

      setIsDialogOpen(false);
      setEditingConvenio(null);
      resetFormConvenio();
      fetchConfiguracoes();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o convênio.",
        variant: "destructive"
      });
    }
  };

  const resetFormConvenio = () => {
    setFormConvenio({
      nome: '',
      codigo_ans: '',
      tipo: 'Médico',
      ativo: true,
      versao_tiss: '4.01.00',
      url_webservice: '',
      usuario_ws: '',
      senha_ws: '',
      certificado_digital: null,
      validar_procedimentos: true,
      exige_autorizacao: true,
      dias_vencimento: 30,
      percentual_iss: 0,
      observacoes: ''
    });
  };

  const handleEditConvenio = (convenio) => {
    setEditingConvenio(convenio);
    setFormConvenio({
      nome: convenio.nome,
      codigo_ans: convenio.codigo_ans,
      tipo: convenio.tipo,
      ativo: convenio.ativo,
      versao_tiss: convenio.versao_tiss,
      url_webservice: convenio.url_webservice,
      usuario_ws: convenio.usuario_ws,
      senha_ws: convenio.senha_ws,
      certificado_digital: convenio.certificado_digital,
      validar_procedimentos: convenio.validar_procedimentos,
      exige_autorizacao: convenio.exige_autorizacao,
      dias_vencimento: convenio.dias_vencimento,
      percentual_iss: convenio.percentual_iss,
      observacoes: convenio.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handleTestarConexao = async (convenio) => {
    try {
      console.log('Testando conexão:', convenio.nome);
      
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Conexão testada",
        description: `Conexão com ${convenio.nome} realizada com sucesso.`
      });
    } catch (error) {
      toast({
        title: "Erro de conexão",
        description: `Não foi possível conectar com ${convenio.nome}.`,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (ativo) => {
    return ativo ? (
      <Badge variant="default" className="text-green-600 gap-1">
        <CheckCircle className="w-3 h-3" />
        Ativo
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-gray-600 gap-1">
        <AlertCircle className="w-3 h-3" />
        Inativo
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-600" />
            Configurações de Faturamento
          </h1>
          <p className="text-muted-foreground">
            Configurações TISS, convênios e parâmetros do sistema de faturamento
          </p>
        </div>

        <Badge variant="outline" className="gap-2">
          <Settings className="w-4 h-4" />
          TISS 4.01.00
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'tiss' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('tiss')}
          className="gap-2"
        >
          <FileCode className="w-4 h-4" />
          TISS
        </Button>
        <Button
          variant={activeTab === 'convenios' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('convenios')}
          className="gap-2"
        >
          <Building2 className="w-4 h-4" />
          Convênios ({convenios.length})
        </Button>
        <Button
          variant={activeTab === 'gerais' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('gerais')}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Configurações Gerais
        </Button>
      </div>

      {/* Configurações TISS */}
      {activeTab === 'tiss' && (
        <form onSubmit={handleSaveConfigTiss} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Prestador TISS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="versao_padrao">Versão TISS Padrão</Label>
                  <Select 
                    value={configTiss.versao_padrao || ''}
                    onValueChange={(value) => setConfigTiss({...configTiss, versao_padrao: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4.01.00">4.01.00 (Atual)</SelectItem>
                      <SelectItem value="3.03.00">3.03.00 (Legado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="codigo_prestador">Código do Prestador</Label>
                  <Input
                    id="codigo_prestador"
                    value={configTiss.codigo_prestador || ''}
                    onChange={(e) => setConfigTiss({...configTiss, codigo_prestador: e.target.value})}
                    placeholder="Código junto à ANS"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="nome_prestador">Nome do Prestador</Label>
                  <Input
                    id="nome_prestador"
                    value={configTiss.nome_prestador || ''}
                    onChange={(e) => setConfigTiss({...configTiss, nome_prestador: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cnpj_prestador">CNPJ</Label>
                  <Input
                    id="cnpj_prestador"
                    value={configTiss.cnpj_prestador || ''}
                    onChange={(e) => setConfigTiss({...configTiss, cnpj_prestador: e.target.value})}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cnes_prestador">CNES</Label>
                  <Input
                    id="cnes_prestador"
                    value={configTiss.cnes_prestador || ''}
                    onChange={(e) => setConfigTiss({...configTiss, cnes_prestador: e.target.value})}
                    placeholder="Código CNES"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="municipio_prestador">Município</Label>
                  <Input
                    id="municipio_prestador"
                    value={configTiss.municipio_prestador || ''}
                    onChange={(e) => setConfigTiss({...configTiss, municipio_prestador: e.target.value})}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certificado Digital</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="caminho_certificado">Caminho do Certificado</Label>
                  <div className="flex gap-2">
                    <Input
                      id="caminho_certificado"
                      value={configTiss.caminho_certificado || ''}
                      onChange={(e) => setConfigTiss({...configTiss, caminho_certificado: e.target.value})}
                      placeholder="C:\Certificados\certificado.p12"
                    />
                    <Button type="button" variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="senha_certificado">Senha do Certificado</Label>
                  <Input
                    id="senha_certificado"
                    type="password"
                    value={configTiss.senha_certificado || ''}
                    onChange={(e) => setConfigTiss({...configTiss, senha_certificado: e.target.value})}
                    placeholder="Senha do certificado"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="validar_xml"
                    checked={configTiss.validar_xml || false}
                    onCheckedChange={(checked) => setConfigTiss({...configTiss, validar_xml: checked})}
                  />
                  <Label htmlFor="validar_xml">Validar XML</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="gerar_hash"
                    checked={configTiss.gerar_hash || false}
                    onCheckedChange={(checked) => setConfigTiss({...configTiss, gerar_hash: checked})}
                  />
                  <Label htmlFor="gerar_hash">Gerar Hash</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="assinar_digitalmente"
                    checked={configTiss.assinar_digitalmente || false}
                    onCheckedChange={(checked) => setConfigTiss({...configTiss, assinar_digitalmente: checked})}
                  />
                  <Label htmlFor="assinar_digitalmente">Assinar Digitalmente</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="backup_automatico"
                    checked={configTiss.backup_automatico || false}
                    onCheckedChange={(checked) => setConfigTiss({...configTiss, backup_automatico: checked})}
                  />
                  <Label htmlFor="backup_automatico">Backup Automático</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Configurações TISS
            </Button>
          </div>
        </form>
      )}

      {/* Configurações de Convênios */}
      {activeTab === 'convenios' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Convênios Cadastrados</h2>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Convênio
                </Button>
              </DialogTrigger>
              <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide overflow-y-auto modal-content-scroll">
                <DialogHeader>
                  <DialogTitle>
                    {editingConvenio ? 'Editar Convênio' : 'Novo Convênio'}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmitConvenio} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome do Convênio</Label>
                      <Input
                        id="nome"
                        value={formConvenio.nome}
                        onChange={(e) => setFormConvenio({...formConvenio, nome: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="codigo_ans">Código ANS</Label>
                      <Input
                        id="codigo_ans"
                        value={formConvenio.codigo_ans}
                        onChange={(e) => setFormConvenio({...formConvenio, codigo_ans: e.target.value})}
                        placeholder="Código de registro na ANS"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="tipo">Tipo de Convênio</Label>
                      <Select 
                        value={formConvenio.tipo}
                        onValueChange={(value) => setFormConvenio({...formConvenio, tipo: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Médico">Médico</SelectItem>
                          <SelectItem value="Odontológico">Odontológico</SelectItem>
                          <SelectItem value="Misto">Misto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="versao_tiss">Versão TISS</Label>
                      <Select 
                        value={formConvenio.versao_tiss}
                        onValueChange={(value) => setFormConvenio({...formConvenio, versao_tiss: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4.01.00">4.01.00</SelectItem>
                          <SelectItem value="3.03.00">3.03.00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="url_webservice">URL do WebService</Label>
                      <Input
                        id="url_webservice"
                        type="url"
                        value={formConvenio.url_webservice}
                        onChange={(e) => setFormConvenio({...formConvenio, url_webservice: e.target.value})}
                        placeholder="https://webservice.convenio.com.br/tiss"
                      />
                    </div>

                    <div>
                      <Label htmlFor="usuario_ws">Usuário WebService</Label>
                      <Input
                        id="usuario_ws"
                        value={formConvenio.usuario_ws}
                        onChange={(e) => setFormConvenio({...formConvenio, usuario_ws: e.target.value})}
                        placeholder="Usuário para autenticação"
                      />
                    </div>

                    <div>
                      <Label htmlFor="senha_ws">Senha WebService</Label>
                      <Input
                        id="senha_ws"
                        type="password"
                        value={formConvenio.senha_ws}
                        onChange={(e) => setFormConvenio({...formConvenio, senha_ws: e.target.value})}
                        placeholder="Senha para autenticação"
                      />
                    </div>

                    <div>
                      <Label htmlFor="dias_vencimento">Dias para Vencimento</Label>
                      <Input
                        id="dias_vencimento"
                        type="number"
                        min="1"
                        max="365"
                        value={formConvenio.dias_vencimento}
                        onChange={(e) => setFormConvenio({...formConvenio, dias_vencimento: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="percentual_iss">Percentual ISS (%)</Label>
                      <Input
                        id="percentual_iss"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formConvenio.percentual_iss}
                        onChange={(e) => setFormConvenio({...formConvenio, percentual_iss: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativo"
                        checked={formConvenio.ativo}
                        onCheckedChange={(checked) => setFormConvenio({...formConvenio, ativo: checked})}
                      />
                      <Label htmlFor="ativo">Ativo</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="validar_procedimentos"
                        checked={formConvenio.validar_procedimentos}
                        onCheckedChange={(checked) => setFormConvenio({...formConvenio, validar_procedimentos: checked})}
                      />
                      <Label htmlFor="validar_procedimentos">Validar Procedimentos</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="exige_autorizacao"
                        checked={formConvenio.exige_autorizacao}
                        onCheckedChange={(checked) => setFormConvenio({...formConvenio, exige_autorizacao: checked})}
                      />
                      <Label htmlFor="exige_autorizacao">Exige Autorização</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formConvenio.observacoes}
                      onChange={(e) => setFormConvenio({...formConvenio, observacoes: e.target.value})}
                      placeholder="Informações adicionais sobre o convênio..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingConvenio(null);
                        resetFormConvenio();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingConvenio ? 'Atualizar' : 'Criar'} Convênio
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Convênio</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Código ANS</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Versão TISS</TableHead>
                    <TableHead>Último Envio</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {convenios.map((convenio) => (
                    <TableRow key={convenio.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{convenio.nome}</div>
                          {convenio.url_webservice && (
                            <div className="text-xs text-muted-foreground">
                              WebService Configurado
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(convenio.ativo)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {convenio.codigo_ans}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{convenio.tipo}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {convenio.versao_tiss}
                      </TableCell>
                      <TableCell>
                        {convenio.ultimo_envio ? (
                          <div className="text-sm">
                            {new Date(convenio.ultimo_envio).toLocaleDateString('pt-BR')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditConvenio(convenio)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          
                          {convenio.url_webservice && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestarConexao(convenio)}
                            >
                              Testar
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(convenio.codigo_ans);
                              toast({
                                title: "Código copiado",
                                description: "Código ANS copiado para a área de transferência."
                              });
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {convenios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum convênio cadastrado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configurações Gerais */}
      {activeTab === 'gerais' && (
        <form onSubmit={handleSaveConfigGerais} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Guias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="formato_numero_guia">Formato do Número da Guia</Label>
                  <Input
                    id="formato_numero_guia"
                    value={configGerais.formato_numero_guia || ''}
                    onChange={(e) => setConfigGerais({...configGerais, formato_numero_guia: e.target.value})}
                    placeholder="GUI{000000}-{YYYY}-{MM}"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use: {'{000000}'} para sequencial, {'{YYYY}'} para ano, {'{MM}'} para mês
                  </p>
                </div>

                <div>
                  <Label htmlFor="prazo_envio_lotes">Prazo para Envio de Lotes (dias)</Label>
                  <Input
                    id="prazo_envio_lotes"
                    type="number"
                    min="1"
                    max="30"
                    value={configGerais.prazo_envio_lotes || ''}
                    onChange={(e) => setConfigGerais({...configGerais, prazo_envio_lotes: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="margem_seguranca_glosa">Margem de Segurança para Glosa (%)</Label>
                  <Input
                    id="margem_seguranca_glosa"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={configGerais.margem_seguranca_glosa || ''}
                    onChange={(e) => setConfigGerais({...configGerais, margem_seguranca_glosa: parseFloat(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="email_notificacoes">E-mail para Notificações</Label>
                  <Input
                    id="email_notificacoes"
                    type="email"
                    value={configGerais.email_notificacoes || ''}
                    onChange={(e) => setConfigGerais({...configGerais, email_notificacoes: e.target.value})}
                    placeholder="admin@clinica.com.br"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="numeracao_automatica"
                    checked={configGerais.numeracao_automatica || false}
                    onCheckedChange={(checked) => setConfigGerais({...configGerais, numeracao_automatica: checked})}
                  />
                  <Label htmlFor="numeracao_automatica">Numeração Automática</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="validar_cpf_paciente"
                    checked={configGerais.validar_cpf_paciente || false}
                    onCheckedChange={(checked) => setConfigGerais({...configGerais, validar_cpf_paciente: checked})}
                  />
                  <Label htmlFor="validar_cpf_paciente">Validar CPF</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="exigir_carteirinha"
                    checked={configGerais.exigir_carteirinha || false}
                    onCheckedChange={(checked) => setConfigGerais({...configGerais, exigir_carteirinha: checked})}
                  />
                  <Label htmlFor="exigir_carteirinha">Exigir Carteirinha</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="integrar_agenda"
                    checked={configGerais.integrar_agenda || false}
                    onCheckedChange={(checked) => setConfigGerais({...configGerais, integrar_agenda: checked})}
                  />
                  <Label htmlFor="integrar_agenda">Integrar com Agenda</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="calcular_iss_automatico"
                    checked={configGerais.calcular_iss_automatico || false}
                    onCheckedChange={(checked) => setConfigGerais({...configGerais, calcular_iss_automatico: checked})}
                  />
                  <Label htmlFor="calcular_iss_automatico">Calcular ISS</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="notificar_glosas"
                    checked={configGerais.notificar_glosas || false}
                    onCheckedChange={(checked) => setConfigGerais({...configGerais, notificar_glosas: checked})}
                  />
                  <Label htmlFor="notificar_glosas">Notificar Glosas</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="backup_automatico_geral"
                    checked={configGerais.backup_automatico || false}
                    onCheckedChange={(checked) => setConfigGerais({...configGerais, backup_automatico: checked})}
                  />
                  <Label htmlFor="backup_automatico_geral">Backup Automático</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Configurações Gerais
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

