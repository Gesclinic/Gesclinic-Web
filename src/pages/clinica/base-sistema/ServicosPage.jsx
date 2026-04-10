// src/pages/clinica/base-sistema/ServicosPage.jsx
// ============================================================
// CRUD Completo de Serviços - Base do Sistema
// Implementa Create, Read, Update, Delete com validação
// ============================================================

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useClinicContext } from "@/contexts/ClinicContext";
import * as servicesApi from "@/lib/servicesApi";
import * as cbhpmApi from "@/lib/cbhpmApi";
import { supabase } from "@/lib/customSupabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Check, X, Stethoscope, ChevronDown } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import BaseSystemHeader from "@/components/layout/BaseSystemHeader";
import { Alert } from "@/components/layout/BaseSystemAlert";
import EmptyState from "@/components/layout/EmptyState";
import { normalizeCodeCBHPM } from "@/utils/formatters";

export function ServicosPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();
  
  // Verifica se voltará para Tabela de Preços após criar
  const params = new URLSearchParams(window.location.search);
  const returnToServicePrices = params.get("returnTo") === "service-prices";
  
  console.log("🏥 ServicosPage carregada | clinicId:", clinicId, "| usuário:", user?.email);
  // ============================================================
  // Estado
  // ============================================================
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    default_duration_minutes: 30,
    type_billing: "per_consultation",
    allow_scheduling_fit: false,
    requires_authorization: false,
    active: true,
    service_category: "consultation",
    is_billable: true,
    // ===== NOVOS CAMPOS TISS =====
    tuss_code: "",
    type_service: "",
    guide_type: "",
    unit_measure: "",
    cost_value: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [cbhpmList, setCbhpmList] = useState([]);
  const [cbhpmSearch, setCbhpmSearch] = useState("");
  const [showCBHPMDropdown, setShowCBHPMDropdown] = useState(false);
  const [loadingCBHPM, setLoadingCBHPM] = useState(false);
  const [expandTISSSection, setExpandTISSSection] = useState(false);

  // ============================================================
  // Efeito: Carregar dados ao montar
  // ============================================================
  
  useEffect(() => {
    if (clinicId && isAuthenticated) {
      loadServices();
      loadCBHPMData();
    }
  }, [clinicId, isAuthenticated]);

  /**
   * Carrega dados da tabela CBHPM para autocomplete
   */
  const loadCBHPMData = async () => {
    try {
      setLoadingCBHPM(true);
      
      let allData = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fazer múltiplas requisições para puxar todos os dados
      while (hasMore) {
        const { data, error } = await supabase
          .from("Cbhpm")
          .select("*")
          .range(offset, offset + pageSize - 1);
        
        if (error) {
          if (allData.length === 0) {
            const fallback = getDefaultCBHPMData();
            setCbhpmList(fallback);
            setLoadingCBHPM(false);
            return;
          }
          hasMore = false;
          break;
        }
        
        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }
        
        allData = allData.concat(data);
        offset += pageSize;
        
        if (data.length < pageSize) {
          hasMore = false;
        }
      }
      
      if (allData.length === 0) {
        const fallback = getDefaultCBHPMData();
        setCbhpmList(fallback);
        setLoadingCBHPM(false);
        return;
      }
      
      // Mapear dados: usar nomes de coluna exatos da tabela Cbhpm
      const mapped = allData.map(item => ({
        "ID do Procedimento": String(item["ID do Procedimento"] || ""),
        "Descrição do Procedimento": String(item["Descrição do Procedimento"] || ""),
        ...item // Manter todos os campos
      }));
      
      setCbhpmList(mapped);
    } catch (err) {
      const fallback = getDefaultCBHPMData();
      setCbhpmList(fallback);
    } finally {
      setLoadingCBHPM(false);
    }
  };

  /**
   * Dados padrão de procedimentos TISS para autocomplete
   */
  const getDefaultCBHPMData = () => {
    return [
      { "ID do Procedimento": "0101010100", "Descrição do Procedimento": "Consulta - Procedimento de avaliação para fins de diagnóstico ou investigação de queixa, sintoma ou doença" },
      { "ID do Procedimento": "0101010101", "Descrição do Procedimento": "Consulta em consultório" },
      { "ID do Procedimento": "0101010102", "Descrição do Procedimento": "Consulta domiciliar" },
      { "ID do Procedimento": "0101010103", "Descrição do Procedimento": "Consulta hospitalar" },
      { "ID do Procedimento": "0102010100", "Descrição do Procedimento": "Exame clínico complementar" },
      { "ID do Procedimento": "0102020100", "Descrição do Procedimento": "Eletrocardiograma" },
      { "ID do Procedimento": "0102030100", "Descrição do Procedimento": "Teste ergométrico" },
      { "ID do Procedimento": "0103010100", "Descrição do Procedimento": "Administração de medicação" },
      { "ID do Procedimento": "0104010100", "Descrição do Procedimento": "Curativo" },
      { "ID do Procedimento": "0104020100", "Descrição do Procedimento": "Injeção intramuscular" },
      { "ID do Procedimento": "0104020200", "Descrição do Procedimento": "Injeção intravenosa" },
      { "ID do Procedimento": "0105010100", "Descrição do Procedimento": "Coleta de material para exame" },
      { "ID do Procedimento": "0201010100", "Descrição do Procedimento": "Radiografia de tórax" },
      { "ID do Procedimento": "0201020100", "Descrição do Procedimento": "Radiografia de coluna" },
      { "ID do Procedimento": "0202010100", "Descrição do Procedimento": "Ultrassonografia de abdômen" },
      { "ID do Procedimento": "0203010100", "Descrição do Procedimento": "Tomografia de tórax" },
      { "ID do Procedimento": "0301010100", "Descrição do Procedimento": "Hemograma" },
      { "ID do Procedimento": "0301010200", "Descrição do Procedimento": "Leucócitos" },
      { "ID do Procedimento": "0301020100", "Descrição do Procedimento": "Glicose" },
      { "ID do Procedimento": "0301030100", "Descrição do Procedimento": "Ureia" },
      { "ID do Procedimento": "0401010100", "Descrição do Procedimento": "Eletroforese de proteínas" },
      { "ID do Procedimento": "0402010100", "Descrição do Procedimento": "Reação de Wassermann" },
      { "ID do Procedimento": "0501010100", "Descrição do Procedimento": "Teste de gravidez" },
      { "ID do Procedimento": "0601010100", "Descrição do Procedimento": "Cultura de escarro" },
      { "ID do Procedimento": "0601020100", "Descrição do Procedimento": "Cultura de urina" }
    ];
  };

  /**
   * Filtra CBHPM baseado no termo de busca
   */
  const filteredCBHPM = useMemo(() => {
    if (!cbhpmSearch.trim() || cbhpmList.length === 0) {
      return [];
    }
    
    const search = cbhpmSearch.toLowerCase();
    console.log("🔍 Filtrando:", search, "| Total:", cbhpmList.length);
    
    let matchCount = 0;
    const resultado = cbhpmList.filter(item => {
      // Tentar múltiplas variações de nomes de coluna
      const codigo = String(
        item["ID do Procedimento"] || 
        item["ID de Procedimento"] || 
        item["IDdoProcedimento"] ||
        item["id_procedimento"] ||
        ""
      ).toLowerCase();
      
      const descricao = String(
        item["Descrição do Procedimento"] || 
        item["Descricao do Procedimento"] ||
        item["DescricaodoProcedimento"] ||
        item["descricao_procedimento"] ||
        ""
      ).toLowerCase();
      
      const match = codigo.includes(search) || descricao.includes(search);
      
      if (match && matchCount < 3) {
        console.log("✅ Match:", codigo, "-", descricao.substring(0, 50));
        matchCount++;
      }
      
      return match;
    }).slice(0, 15);
    
    console.log("📈 Encontrados:", resultado.length);
    return resultado;
  }, [cbhpmSearch, cbhpmList]);

  /**
   * Seleciona um item do CBHPM e preenche o formulário
   */
  const handleSelectCBHPM = (item) => {
    // Tentar múltiplas variações de nome de coluna
    const codigo = normalizeCodeCBHPM(String(
      item["ID do Procedimento"] || 
      item["ID de Procedimento"] || 
      item["IDdoProcedimento"] ||
      item["id_procedimento"] ||
      ""
    ));
    
    const descricao = String(
      item["Descrição do Procedimento"] || 
      item["Descricao do Procedimento"] ||
      item["DescricaodoProcedimento"] ||
      item["descricao_procedimento"] ||
      ""
    );
    
    setFormData(prev => ({
      ...prev,
      name: descricao, // Preencher nome com a descrição do procedimento
      tuss_code: codigo
    }));
    setCbhpmSearch("");
    setShowCBHPMDropdown(false);
    
    console.log("✅ Selecionado:", codigo, "-", descricao.substring(0, 50));
  };

  // ============================================================
  // Funções de Dados
  // ============================================================
  
  /**
   * Carrega lista de serviços da API
   */
  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await servicesApi.listServices(clinicId);
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Erro ao carregar serviços");
      console.error("Erro ao carregar serviços:", err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ===== Não usar mais busca CBHPM - removido por problemas de API key =====
   */

  // ============================================================
  // Funções de Formulário
  // ============================================================
  
  /**
   * Abre formulário para novo serviço
   */
  const handleNew = () => {
    setEditingId(null);
    setFormData({ 
      name: "", 
      description: "", 
      default_duration_minutes: 30,
      type_billing: "per_consultation",
      allow_scheduling_fit: false,
      requires_authorization: false,
      active: true,
      service_category: "consultation",
      is_billable: true,
      // ===== NOVOS CAMPOS TISS =====
      tuss_code: "",
      type_service: "",
      guide_type: "",
      unit_measure: "",
      cost_value: 0,
    });
    setShowForm(true);
    setError(null);
  };

  /**
   * Abre formulário para editar serviço existente
   */
  const handleEdit = (service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name || "",
      description: service.description || "",
      default_duration_minutes: service.default_duration_minutes || 30,
      type_billing: service.type_billing || "per_consultation",
      allow_scheduling_fit: service.allow_scheduling_fit !== false,
      requires_authorization: service.requires_authorization || false,
      active: service.active !== false,
      service_category: service.service_category || "consultation",
      is_billable: service.is_billable !== false,
      // ===== NOVOS CAMPOS TISS =====
      tuss_code: service.code || service.tuss_code || "", // Tentar 'code' primeiro, depois 'tuss_code'
      type_service: service.type_service || "",
      guide_type: service.guide_type || "",
      unit_measure: service.unit_measure || "",
      cost_value: service.cost_value || 0,
    });
    setShowForm(true);
    setError(null);
    setCbhpmSearch("");
    setShowCBHPMDropdown(false);
  };

  /**
   * Fecha formulário
   */
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ 
      name: "", 
      description: "", 
      default_duration_minutes: 30,
      type_billing: "per_consultation",
      allow_scheduling_fit: false,
      requires_authorization: false,
      active: true,
      service_category: "consultation",
      is_billable: true,
      // ===== NOVOS CAMPOS TISS =====
      tuss_code: "",
      type_service: "",
      guide_type: "",
      unit_measure: "",
      cost_value: 0,
    });
    setCbhpmSearch("");
    setShowCBHPMDropdown(false);
    setSubmitting(false);
  };

  const handleCloseWithCheck = () => {
    const hasData = Object.entries(formData).some(([key, value]) => {
      if (typeof value === "string") return value.trim() !== "";
      if (typeof value === "number") return value !== 0;
      if (typeof value === "boolean") return value !== true;
      return false;
    });

    if (hasData) {
      if (window.confirm("Tem certeza que deseja sair? As alterações não salvas serão perdidas.")) {
        closeForm();
      }
    } else {
      closeForm();
    }
  };

  /**
   * Valida formulário antes de enviar
   */
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Nome do serviço é obrigatório");
      return false;
    }
    if (formData.name.trim().length < 3) {
      setError("Nome deve ter pelo menos 3 caracteres");
      return false;
    }
    return true;
  };

  /**
   * Salva serviço novo ou atualiza existente
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dataToSave = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        code: formData.tuss_code.trim() || null, // Salvar o código CBHPM/TUSS no campo 'code'
        default_duration_minutes: parseInt(formData.default_duration_minutes) || 30,
        type_billing: formData.type_billing,
        allow_scheduling_fit: formData.allow_scheduling_fit,
        requires_authorization: formData.requires_authorization,
        active: formData.active,
        service_category: formData.service_category || "consultation",
        is_billable: formData.is_billable !== false,
        // ===== NOVOS CAMPOS TISS =====
        tuss_code: formData.tuss_code.trim() || null,
        type_service: formData.type_service || null,
        guide_type: formData.guide_type || null,
        unit_measure: formData.unit_measure || null,
        cost_value: parseFloat(formData.cost_value) || null,
      };

      if (editingId) {
        // ===== ATUALIZAR =====
        await servicesApi.updateService(editingId, dataToSave);
        setServices(
          services.map((s) =>
            s.id === editingId ? { ...s, ...dataToSave } : s
          )
        );
      } else {
        // ===== CRIAR NOVO =====
        const newService = await servicesApi.createService(clinicId, dataToSave);
        setServices([...services, newService]);
        
        // Se veio de Tabela de Preços, redirecionar pra lá
        if (returnToServicePrices) {
          setTimeout(() => {
            navigate("/clinica/base-sistema/service-prices?openForm=true");
          }, 500);
          return;
        }
      }

      closeForm();
    } catch (err) {
      setError(err.message || "Erro ao salvar serviço");
      console.error("Erro ao salvar:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // Funções de Ação
  // ============================================================
  
  /**
   * Deleta serviço (soft delete)
   */
  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Tem certeza que deseja deletar o serviço "${name}"? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      setError(null);
      await servicesApi.deleteService(id);
      setServices(services.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || "Erro ao deletar serviço");
      console.error("Erro ao deletar:", err);
    }
  };

  // ============================================================
  // Render: Estado de Carregamento
  // ============================================================
  
  if (loading) {
    return (
      <div className="space-y-4 w-full">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // ============================================================
  // Render: Página Principal
  // ============================================================
  
  return (
    <div className="space-y-6 w-full mx-auto">
      {/* HEADER PADRONIZADO */}
      <BaseSystemHeader
        category="4.1 Cadastros Estruturais"
        title="Serviços"
        subtitle="Gerencie todos os serviços que sua clínica oferece"
      />

      {/* ALERTA */}
      {error && (
        <Alert
          type="error"
          title="Aviso"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Serviços Cadastrados ({services.length})</CardTitle>
          <Button
            onClick={handleNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço
          </Button>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <EmptyState
              icon={<Stethoscope className="w-12 h-12 mx-auto text-gray-400" />}
              title="Nenhum serviço cadastrado"
              description="Comece criando seu primeiro serviço para gerenciar as ofertas clínicas"
              action={
                <Button
                  onClick={handleNew}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Cadastrar Primeiro Serviço
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        TUSS Code
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Nome
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Duração (min)
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Tipo Cobrança
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr
                        key={service.id}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="py-3 px-4 text-gray-600">
                          {service.tuss_code ? (
                            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                              {service.tuss_code}
                            </span>
                          ) : (
                            <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                              Falta TUSS
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {service.name}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {service.default_duration_minutes || 30}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {service.type_billing === 'per_consultation' ? 'Por Consulta' : 
                             service.type_billing === 'per_hour' ? 'Por Hora' :
                             service.type_billing === 'per_session' ? 'Por Sessão' :
                             service.type_billing === 'per_package' ? 'Por Pacote' : 'Outro'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {service.active ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="w-3 h-3" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <X className="w-3 h-3" />
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(service)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                          title="Editar"
                          disabled={submitting}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id, service.name)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"
                          title="Deletar"
                          disabled={submitting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== MODAL DE FORMULÁRIO ===== */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide [&>button]:text-white [&>button]:hover:opacity-70">
          {/* HEADER */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg shadow-md">
            <div className="flex items-center gap-3">
              <Stethoscope size={24} className="text-white" />
              <h2 className="text-xl font-bold text-white">
                {editingId ? '✏️ Editar Serviço' : '➕ Novo Serviço'}
              </h2>
            </div>
          </div>

          {/* CONTENT */}
          <form id="service-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5">
                    {/* ===== SEÇÃO 1: IDENTIFICAÇÃO DO SERVIÇO (COM BUSCA CBHPM) ===== */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">🔍 Identificação do Serviço</h3>
                        <p className="text-sm text-gray-600 mt-1">Busque o código CBHPM ou digite os dados manualmente</p>
                      </div>

                      {/* CÓDIGO CBHPM/TUSS - NO TOPO */}
                      <div className="mb-4 relative">
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Código CBHPM/TUSS <span className="text-orange-600 font-bold">(recomendado)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cbhpmSearch || formData.tuss_code}
                            onChange={(e) => {
                              setCbhpmSearch(e.target.value);
                              if (e.target.value === "") {
                                setFormData(prev => ({ ...prev, tuss_code: "" }));
                              }
                              setShowCBHPMDropdown(true);
                            }}
                            onFocus={() => {
                              if (!cbhpmSearch && !formData.tuss_code) {
                                setShowCBHPMDropdown(true);
                              }
                            }}
                            onBlur={() => setTimeout(() => setShowCBHPMDropdown(false), 200)}
                            placeholder="Ex: 0101010101 ou Consulta"
                            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-blue-50"
                            disabled={submitting}
                            autoFocus
                          />
                          {formData.tuss_code && !cbhpmSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, tuss_code: "" }));
                                setCbhpmSearch("");
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                              title="Limpar código"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        
                        {/* Dropdown de sugestões */}
                        {showCBHPMDropdown && cbhpmSearch && (
                          <div className="absolute mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto w-full" style={{maxWidth: "calc(90vw - 60px)"}}>
                            {loadingCBHPM ? (
                              <div className="p-4 text-center text-gray-600 text-sm">⏳ Carregando...</div>
                            ) : filteredCBHPM.length === 0 ? (
                              <div className="p-4 text-center text-gray-500 text-sm">Nenhum resultado encontrado</div>
                            ) : (
                              filteredCBHPM.map((item, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => handleSelectCBHPM(item)}
                                  className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                  <div className="font-bold text-gray-900 text-sm">
                                    {String(
                                      item["ID do Procedimento"] || 
                                      item["ID de Procedimento"] || 
                                      item["IDdoProcedimento"] ||
                                      item["id_procedimento"] ||
                                      ""
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {String(
                                      item["Descrição do Procedimento"] || 
                                      item["Descricao do Procedimento"] ||
                                      item["DescricaodoProcedimento"] ||
                                      item["descricao_procedimento"] ||
                                      ""
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-2">💡 Selecione da lista ou deixe em branco para digitar manualmente</p>
                      </div>
                      
                      {/* Nome */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Nome do Serviço <span className="text-red-600 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Consulta Clínica Geral"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          disabled={submitting}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          {formData.tuss_code ? "✅ Preenchido automaticamente. Pode editar se necessário." : "Será preenchido ao selecionar um código CBHPM"}
                        </p>
                      </div>

                      {/* Categoria */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Categoria do Serviço <span className="text-red-600 font-bold">*</span>
                        </label>
                        <select
                          value={formData.service_category || "consultation"}
                          onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          disabled={submitting}
                          required
                        >
                          <option value="consultation">📋 Consulta</option>
                          <option value="exam">🔬 Exame/SADT</option>
                          <option value="procedure">🏥 Procedimento</option>
                          <option value="surgery">🏨 Cirurgia</option>
                          <option value="other">📝 Outro</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Classifica o tipo de serviço para agendamento e faturamento</p>
                      </div>

                      {/* Descrição */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Descrição
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Forneça detalhes que ajudem pacientes e profissionais a entender este serviço"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={3}
                          disabled={submitting}
                        />
                        <p className="text-xs text-gray-500 mt-2">Opcional, mas recomendado para melhor compreensão</p>
                      </div>
                    </div>

                    {/* ===== SEÇÃO 2: AGENDAMENTO & COBRANÇA ===== */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">⏱️ Agendamento & Cobrança</h3>
                        <p className="text-sm text-gray-600 mt-1">Configure como este serviço será agendado e faturado</p>
                      </div>
                      
                      {/* Duração */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          Duração Padrão (minutos) <span className="text-red-600 font-bold">*</span>
                        </label>
                        <div className="space-y-2">
                          {/* Quick presets */}
                          <div className="grid grid-cols-4 gap-2">
                            {[30, 45, 60, 90].map((min) => (
                              <button
                                key={min}
                                type="button"
                                onClick={() => setFormData({ ...formData, default_duration_minutes: min })}
                                className={`py-2 px-3 rounded-md font-semibold text-sm transition-all ${
                                  formData.default_duration_minutes === min
                                    ? "bg-blue-600 text-white border border-blue-700"
                                    : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                                }`}
                                disabled={submitting}
                              >
                                {min}m
                              </button>
                            ))}
                          </div>
                          {/* Custom input */}
                          <input
                            type="number"
                            value={formData.default_duration_minutes}
                            onChange={(e) => setFormData({ ...formData, default_duration_minutes: parseInt(e.target.value) || 30 })}
                            min="15"
                            step="15"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                            disabled={submitting}
                            placeholder="Ou informe um valor customizado"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Mínimo 15 minutos, em intervalos de 15</p>
                      </div>

                      {/* Tipo de Cobrança */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Tipo de Cobrança <span className="text-red-600 font-bold">*</span>
                        </label>
                        <select
                          value={formData.type_billing}
                          onChange={(e) => setFormData({ ...formData, type_billing: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          required
                          disabled={submitting}
                        >
                          <option value="per_consultation">💬 Por Consulta</option>
                          <option value="per_hour">🕐 Por Hora</option>
                          <option value="per_session">📊 Por Sessão</option>
                          <option value="per_package">📦 Por Pacote</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Define como será efetuada a cobrança ao convênio ou paciente</p>
                      </div>

                      {/* Faturável */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.is_billable !== false}
                            onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                            className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600"
                            disabled={submitting}
                          />
                          <span className="text-sm font-semibold text-gray-800 flex-1">
                            Permitir Faturamento
                          </span>
                          <span className="text-xs text-gray-500">Pode ser incluído em guias/notas fiscais</span>
                        </label>
                      </div>
                    </div>

                    {/* ===== SEÇÃO 3: CONFIGURAÇÕES AVANÇADAS ===== */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandTISSSection(!expandTISSSection)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b"
                      >
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">⚙️ Configurações Avançadas</h3>
                          <p className="text-xs text-gray-600 mt-1">Permissões, status e dados TISS</p>
                        </div>
                        <ChevronDown 
                          size={20} 
                          className={`text-gray-600 transition-transform ${expandTISSSection ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {expandTISSSection && (
                        <div className="p-5 space-y-4 bg-gray-50">
                          
                          {/* Permissões - Encaixe */}
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                id="allow_scheduling_fit"
                                checked={formData.allow_scheduling_fit}
                                onChange={(e) => setFormData({ ...formData, allow_scheduling_fit: e.target.checked })}
                                className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600"
                                disabled={submitting}
                              />
                              <span className="text-sm font-semibold text-gray-800 flex-1">
                                Permitir Encaixe de Pacientes
                              </span>
                              <span className="text-xs text-gray-500">Permite agendamentos de último minuto</span>
                            </label>
                          </div>

                          {/* Permissões - Autorização */}
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                id="requires_authorization"
                                checked={formData.requires_authorization}
                                onChange={(e) => setFormData({ ...formData, requires_authorization: e.target.checked })}
                                className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600"
                                disabled={submitting}
                              />
                              <span className="text-sm font-semibold text-gray-800 flex-1">
                                Requer Autorização do Convênio
                              </span>
                              <span className="text-xs text-gray-500">Será necessário aprovação prévia</span>
                            </label>
                          </div>

                          {/* Status */}
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                id="active"
                                checked={formData.active}
                                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600"
                                disabled={submitting}
                              />
                              <span className="text-sm font-semibold text-gray-800 flex-1">
                                Ativo
                              </span>
                              <span className="text-xs text-gray-500">Disponível para agendamento</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                </form>

          {/* FOOTER */}
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              onClick={() => setShowForm(false)}
              variant="outline"
              disabled={submitting}
              className="border-gray-300 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              form="service-form"
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting ? '⌛ Salvando...' : editingId ? '✓ Atualizar' : '✓ Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

