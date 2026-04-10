/**
 * @fileoverview Página de Gerenciamento de Procedimentos CBHPM
 * @module CBHPMManagement
 * 
 * Funcionalidades:
 * - Listar procedimentos CBHPM
 * - Criar novo procedimento
 * - Editar procedimento existente
 * - Deletar/Restaurar procedimento
 * - Filtros por categoria, tipo de guia, status
 * - Busca por código ou descrição
 */

import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useClinicContext } from "@/contexts/ClinicContext";
import { useToast } from "@/components/ui/use-toast";
import * as cbhpmApi from "@/lib/cbhpmApi";

import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  Eye,
} from "lucide-react";

const GUIA_TYPES = [
  { value: "consulta", label: "📋 Consulta" },
  { value: "sadt", label: "🔬 SADT" },
  { value: "internacao", label: "🏥 Internação" },
  { value: "procedimento", label: "🔧 Procedimento" },
];

const UNIDADE_MEDIDA = [
  { value: "unidade", label: "Unidade" },
  { value: "sessao", label: "Sessão" },
  { value: "minuto", label: "Minuto" },
  { value: "diaria", label: "Diária" },
  { value: "hora", label: "Hora" },
];

export default function CBHPMManagement() {
  const { clinicId } = useClinicContext();
  const { toast } = useToast();
  const breadcrumbs = useBreadcrumbs([
    { label: "Base do Sistema", path: "/clinica/base-sistema" },
    { label: "CBHPM" },
  ]);

  const [procedures, setProcedures] = useState([]);
  const [filteredProcedures, setFilteredProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all-categories");
  const [filterGuiaType, setFilterGuiaType] = useState("all-types");
  const [categories, setCategories] = useState([]);
  const [guiaTypes, setGuiaTypes] = useState([]);

  // Form
  const [formData, setFormData] = useState({
    codigo_cbhpm: "",
    descricao_completa: "",
    descricao_curta: "",
    grupo_procedimento: "",
    subgrupo_procedimento: "",
    codigo_tuss: "",
    valor_minimo: "",
    valor_maximo: "",
    valor_base: "",
    permite_faturamento: true,
    exige_autorizacao: false,
    tipo_guia: "",
    unidade_medida: "",
    categoria: "",
    subcategoria: "",
    observacoes: "",
  });

  const [valErrors, setValErrors] = useState([]);

  // Carregar dados
  useEffect(() => {
    if (clinicId) {
      loadProcedures();
      loadFilters();
    }
  }, [clinicId, showDeleted]);

  const loadProcedures = async () => {
    try {
      setLoading(true);
      const data = await cbhpmApi.listCBHPM(clinicId, {
        ativo: !showDeleted,
      });
      setProcedures(data);
      setFilteredProcedures(data);
    } catch (error) {
      console.error("Erro ao carregar CBHPM:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os procedimentos CBHPM",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const [categories, guiaTypes] = await Promise.all([
        cbhpmApi.listCBHPMCategories(clinicId),
        cbhpmApi.listCBHPMGuiaTypes(clinicId),
      ]);
      setCategories(categories);
      setGuiaTypes(guiaTypes);
    } catch (error) {
      console.error("Erro ao carregar filtros:", error);
    }
  };

  // Aplicar filtros
  useEffect(() => {
    let filtered = procedures;

    // Filtro de busca
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.codigo_cbhpm?.toLowerCase().includes(searchLower) ||
          p.descricao_completa?.toLowerCase().includes(searchLower) ||
          p.codigo_tuss?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro de categoria
    if (filterCategory && filterCategory !== "all-categories") {
      filtered = filtered.filter((p) => p.categoria === filterCategory);
    }

    // Filtro de tipo de guia
    if (filterGuiaType && filterGuiaType !== "all-types") {
      filtered = filtered.filter((p) => p.tipo_guia === filterGuiaType);
    }

    setFilteredProcedures(filtered);
  }, [search, filterCategory, filterGuiaType, procedures]);

  // Abrir formulário para novo
  const handleNew = () => {
    setEditingId(null);
    setFormData({
      codigo_cbhpm: "",
      descricao_completa: "",
      descricao_curta: "",
      grupo_procedimento: "",
      subgrupo_procedimento: "",
      codigo_tuss: "",
      valor_minimo: "",
      valor_maximo: "",
      valor_base: "",
      permite_faturamento: true,
      exige_autorizacao: false,
      tipo_guia: "",
      unidade_medida: "",
      categoria: "",
      subcategoria: "",
      observacoes: "",
    });
    setValErrors([]);
    setIsDialogOpen(true);
  };

  // Abrir para edição
  const handleEdit = async (procedure) => {
    setEditingId(procedure.id);
    setFormData({
      codigo_cbhpm: procedure.codigo_cbhpm,
      descricao_completa: procedure.descricao_completa,
      descricao_curta: procedure.descricao_curta || "",
      grupo_procedimento: procedure.grupo_procedimento || "",
      subgrupo_procedimento: procedure.subgrupo_procedimento || "",
      codigo_tuss: procedure.codigo_tuss || "",
      valor_minimo: procedure.valor_minimo?.toString() || "",
      valor_maximo: procedure.valor_maximo?.toString() || "",
      valor_base: procedure.valor_base?.toString() || "",
      permite_faturamento: procedure.permite_faturamento,
      exige_autorizacao: procedure.exige_autorizacao,
      tipo_guia: procedure.tipo_guia || "",
      unidade_medida: procedure.unidade_medida || "",
      categoria: procedure.categoria || "",
      subcategoria: procedure.subcategoria || "",
      observacoes: procedure.observacoes || "",
    });
    setValErrors([]);
    setIsDialogOpen(true);
  };

  // Validar e salvar
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    const errors = [];
    if (!formData.codigo_cbhpm.trim()) errors.push("Código CBHPM é obrigatório");
    if (!formData.descricao_completa.trim()) errors.push("Descrição é obrigatória");

    const codeValidation = cbhpmApi.validateCBHPMCode(formData.codigo_cbhpm);
    if (!codeValidation.valid) {
      errors.push(...codeValidation.errors);
    }

    if (errors.length > 0) {
      setValErrors(errors);
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        // Atualizar
        await cbhpmApi.updateCBHPM(editingId, formData);
        toast({
          title: "Sucesso",
          description: "Procedimento CBHPM atualizado com sucesso",
        });
      } else {
        // Criar
        await cbhpmApi.createCBHPM(clinicId, formData);
        toast({
          title: "Sucesso",
          description: "Procedimento CBHPM criado com sucesso",
        });
      }

      setIsDialogOpen(false);
      loadProcedures();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Deletar
  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja deletar este procedimento?")) return;

    try {
      await cbhpmApi.deleteCBHPM(id);
      toast({
        title: "Sucesso",
        description: "Procedimento deletado",
      });
      loadProcedures();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar o procedimento",
        variant: "destructive",
      });
    }
  };

  // Restaurar
  const handleRestore = async (id) => {
    try {
      await cbhpmApi.restoreCBHPM(id);
      toast({
        title: "Sucesso",
        description: "Procedimento restaurado",
      });
      loadProcedures();
    } catch (error) {
      console.error("Erro ao restaurar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível restaurar",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>CBHPM - Gesclinic</title>
      </Helmet>

      <PageLayout breadcrumbs={breadcrumbs} title="Procedimentos CBHPM" subtitle="Catalogar e gerenciar procedimentos médicos">
        {/* Barra de Ação */}
        <div className="mb-6 flex gap-3 items-center">
          <Button onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Procedimento
          </Button>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descrição ou TUSS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant={showDeleted ? "default" : "outline"}
            onClick={() => setShowDeleted(!showDeleted)}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {showDeleted ? "Showing Deleted" : "Show Deleted"}
          </Button>
        </div>

        {/* Filtros */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm mb-2 block">Tipo de Guia</Label>
            <Select value={filterGuiaType} onValueChange={setFilterGuiaType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">Todos os tipos</SelectItem>
                {guiaTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {GUIA_TYPES.find((g) => g.value === type)?.label || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Categoria</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-categories">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              Procedimentos ({filteredProcedures.length})
            </CardTitle>
            <CardDescription>
              Manage medical procedures with CBHPM codes
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredProcedures.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Nenhum procedimento encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Código CBHPM</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>TUSS</TableHead>
                      <TableHead className="text-right">Valor Base</TableHead>
                      <TableHead>Tipo Guia</TableHead>
                      <TableHead>Faturável</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredProcedures.map((procedure) => (
                      <TableRow key={procedure.id} className={!procedure.ativo ? "opacity-60 bg-destructive/5" : ""}>
                        <TableCell className="font-mono font-bold text-sm">
                          {procedure.codigo_cbhpm}
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {procedure.descricao_completa}
                            </p>
                            {procedure.descricao_curta && (
                              <p className="text-xs text-muted-foreground">
                                {procedure.descricao_curta}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {procedure.codigo_tuss ? (
                            <Badge variant="outline">{procedure.codigo_tuss}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-mono">
                          {procedure.valor_base > 0 ? (
                            <span className="text-green-600 font-semibold">
                              R$ {procedure.valor_base.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {procedure.tipo_guia ? (
                            <Badge variant="secondary">
                              {GUIA_TYPES.find((g) => g.value === procedure.tipo_guia)?.label ||
                                procedure.tipo_guia}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {procedure.permite_faturamento ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(procedure)}
                              className="gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Editar
                            </Button>

                            {!procedure.ativo ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestore(procedure.id)}
                                className="gap-1 text-green-600 hover:text-green-700"
                              >
                                <RotateCcw className="w-3 h-3" /> Restaurar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(procedure.id)}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" /> Deletar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageLayout>

      {/* Dialog Novo/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "✏️ Editar Procedimento" : "➕ Novo Procedimento CBHPM"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Erros */}
            {valErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm font-semibold text-destructive mb-2">Erros encontrados:</p>
                <ul className="text-sm text-destructive space-y-1">
                  {valErrors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Campos Principais */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo_cbhpm">Código CBHPM *</Label>
                <Input
                  id="codigo_cbhpm"
                  value={formData.codigo_cbhpm}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo_cbhpm: e.target.value.toUpperCase() })
                  }
                  placeholder="Ex: 1.01.01.01-2"
                  className="font-bold text-lg tracking-wider"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <Label htmlFor="codigo_tuss">Código TUSS (Mapping)</Label>
                <Input
                  id="codigo_tuss"
                  value={formData.codigo_tuss}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo_tuss: e.target.value.toUpperCase() })
                  }
                  placeholder="Ex: 0101010101"
                  className="font-mono"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="descricao_completa">Descrição Completa *</Label>
              <Input
                id="descricao_completa"
                value={formData.descricao_completa}
                onChange={(e) =>
                  setFormData({ ...formData, descricao_completa: e.target.value })
                }
                placeholder="Ex: Consulta - Clínico Geral"
                disabled={submitting}
                required
              />
            </div>

            <div>
              <Label htmlFor="descricao_curta">Descrição Curta</Label>
              <Input
                id="descricao_curta"
                value={formData.descricao_curta}
                onChange={(e) =>
                  setFormData({ ...formData, descricao_curta: e.target.value })
                }
                placeholder="Ex: Consulta Clínico"
                disabled={submitting}
              />
            </div>

            {/* Classificação */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ex: CONSULTAS"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="subcategoria">Subcategoria</Label>
                <Input
                  id="subcategoria"
                  value={formData.subcategoria}
                  onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                  placeholder="Ex: CLÍNICAS GERAIS"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="valor_minimo">Valor Mínimo</Label>
                <Input
                  id="valor_minimo"
                  type="number"
                  step="0.01"
                  value={formData.valor_minimo}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_minimo: e.target.value })
                  }
                  placeholder="0,00"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="valor_base">Valor Base</Label>
                <Input
                  id="valor_base"
                  type="number"
                  step="0.01"
                  value={formData.valor_base}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_base: e.target.value })
                  }
                  placeholder="0,00"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="valor_maximo">Valor Máximo</Label>
                <Input
                  id="valor_maximo"
                  type="number"
                  step="0.01"
                  value={formData.valor_maximo}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_maximo: e.target.value })
                  }
                  placeholder="0,00"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Tipo e Unidade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_guia">Tipo de Guia</Label>
                <Select
                  value={formData.tipo_guia}
                  onValueChange={(value) => setFormData({ ...formData, tipo_guia: value })}
                >
                  <SelectTrigger disabled={submitting}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GUIA_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unidade_medida">Unidade de Medida</Label>
                <Select
                  value={formData.unidade_medida}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unidade_medida: value })
                  }
                >
                  <SelectTrigger disabled={submitting}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADE_MEDIDA.map((um) => (
                      <SelectItem key={um.value} value={um.value}>
                        {um.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.permite_faturamento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permite_faturamento: e.target.checked,
                    })
                  }
                  disabled={submitting}
                />
                <span className="text-sm">Permite Faturamento</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.exige_autorizacao}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      exige_autorizacao: e.target.checked,
                    })
                  }
                  disabled={submitting}
                />
                <span className="text-sm">Exige Autorização</span>
              </label>
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Notas adicionais..."
                className="w-full px-3 py-2 border rounded-lg"
                rows="3"
                disabled={submitting}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
