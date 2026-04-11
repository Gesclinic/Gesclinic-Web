// src/pages/clinica/base-sistema/ConveniosPage.jsx

// ============================================================

// CRUD Completo de Convênios - Base do Sistema com M:M Serviços

// ============================================================



import React, { useState, useEffect } from "react";

import { useAuth } from "@/contexts/SupabaseAuthContext";

import { useClinicContext } from "@/contexts/ClinicContext";

import { supabase } from "@/lib/customSupabaseClient";

import BaseSystemHeader from "@/components/layout/BaseSystemHeader";

import { Alert } from "@/components/layout/BaseSystemAlert";

import EmptyState from "@/components/layout/EmptyState";

import * as healthInsurancesApi from "@/lib/healthInsurancesApi";

import * as servicesApi from "@/lib/servicesApi";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { TISSConfigurationTab } from "@/components/TISSConfigurationTab";

import { AlertCircle, Plus, Edit2, Trash2, Check, X, Landmark, Upload, Save } from "lucide-react";
import * as XLSX from "xlsx";



// Mapear tipos de convênio para português

const typeTranslations = {

  health_plan: "Plano de Saúde",

  private_insurance: "Seguro Privado",

  government: "Governamental",

  direct_pay: "Pagamento Direto",

  other: "Outro",

};



const translateType = (type) => typeTranslations[type] || type || "-";



export function ConveniosPage() {

  const { user, isAuthenticated } = useAuth();

  const { clinicId, clinic } = useClinicContext();



  // Estado: Listagem

  const [insurances, setInsurances] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);



  // Estado: Financeiro (integrado às abas)

  const [showFinancialForm, setShowFinancialForm] = useState(false);

  const [financialData, setFinancialData] = useState({

    id: null,

    discount_percentage: 0,

    minimum_margin_percentage: 0,

  });



  // Estado: Detalhe com M:M Serviços

  const [selectedInsurance, setSelectedInsurance] = useState(null);

  const [pricingTableData, setPricingTableData] = useState([]);

  

  // 🆕 Estados para cadastro de preços

  const [showPricingForm, setShowPricingForm] = useState(false);

  const [pricingFormData, setPricingFormData] = useState({

    service_id: "",

    price: "",

    plano: "",

    grupo: "",

    id: null

  });

  const [uploadingFile, setUploadingFile] = useState(false);

  const [services, setServices] = useState([]);

  const [insuranceServices, setInsuranceServices] = useState([]);

  const [tabLoading, setTabLoading] = useState(false);

  const [showPriceForm, setShowPriceForm] = useState(false);

  const [priceFormData, setPriceFormData] = useState({

    service_id: "",

    service_value: "",

    copay_value: "",

  });



  const [formData, setFormData] = useState({

    code: "",

    name: "",

    fantasy_name: "",

    legal_name: "",

    type: "",

    cnpj: "",

    contact_person: "",

    contact_email: "",

    contact_phone: "",

    contact_mobile: "",

    discount_percentage: 0,

    minimum_margin_percentage: 0,

    special_rules: "",

    active: true,

    registration_ans: "",

    tiss_pattern: true,

    guide_format: "",

    tiss_version: "3.05.00",

    // ===== NOVOS CAMPOS: FINANCEIRO =====

    payment_due_days: 30,

    accepted_payment_methods: [],

    billing_cycle_start: 1,

    billing_cycle_end: 30,

    administration_fee_percentage: 0,

    early_payment_discount_percentage: 0,

    volume_discount_percentage: 0,

    reajustment_index: "",

    annual_reajustment_date: "",

    next_reajustment_date: "",

    monthly_billing_ceiling: null,

    consultation_limit: null,

    copayment_value: null,

    contract_start_date: "",

    contract_end_date: "",

    auto_renewal: false,

    prior_notice_days: 30,

    days_to_suspension: 30,

    late_payment_fine_percentage: 0,

    daily_interest_rate_percentage: 0,

    financial_contact_name: "",

    financial_contact_email: "",

    financial_contact_phone: "",

    bank_name: "",

    bank_branch: "",

    bank_account: "",

    // ===== NOVOS CAMPOS: ENDEREÇO =====

    address_street: "",

    address_number: "",

    address_neighborhood: "",

    address_city: "",

    address_state: "",

    address_zip_code: "",

    // ===== NOVOS CAMPOS: IDENTIFICAÇÃO FISCAL =====

    municipal_registration: "",

    state_registration: "",

    country: "Brasil",

    // ===== NOVOS CAMPOS: TRIBUTOS =====

    icms_applicable: false,

    icms_rate: 0,

    pis_applicable: false,

    pis_rate: 0,

    cofins_applicable: false,

    cofins_rate: 0,

    iss_applicable: false,

    iss_rate: 0,

    issrf_applicable: false,

    issrf_rate: 0,

    inss_applicable: false,

    inss_rate: 0,

    ibs_applicable: false,

    ibs_rate: 0,

    cbs_applicable: false,

    cbs_rate: 0,

    retains_taxes: false,

    tax_regime: "",

  });

  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("general");



  // 🆕 Estados para gerenciar Planos

  const [plansData, setPlansData] = useState([]);

  const [plansLoading, setPlansLoading] = useState(false);

  const [newPlanName, setNewPlanName] = useState("");

  const [newPlanCode, setNewPlanCode] = useState("");

  const [newPlanDescription, setNewPlanDescription] = useState("");

  const [showNewPlanForm, setShowNewPlanForm] = useState(false);

  const [editingPlanId, setEditingPlanId] = useState(null);

  const [editingPlanName, setEditingPlanName] = useState("");

  const [editingPlanCode, setEditingPlanCode] = useState("");

  const [editingPlanDescription, setEditingPlanDescription] = useState("");

  const [editingPlanActive, setEditingPlanActive] = useState(false);



  useEffect(() => {

    if (clinicId && isAuthenticated) {

      loadInsurances();

    }

  }, [clinicId, isAuthenticated]);



  useEffect(() => {

    if (selectedInsurance) {

      loadServicesTab();

    }

  }, [selectedInsurance]);



  useEffect(() => {

    // Carregar dados quando abrir a aba de preços

    if ((editingId || showForm) && activeTab === "pricing" && clinicId) {

      console.log("📊 Disparando loadPricingTabData...", { editingId, showForm, activeTab, clinicId });

      loadPricingTabData();

    }

  }, [editingId, showForm, activeTab, clinicId]);



  const loadInsurances = async () => {

    try {

      setLoading(true);

      setError(null);

      const data = await healthInsurancesApi.listHealthInsurances(clinicId);

      setInsurances(Array.isArray(data) ? data : []);

    } catch (err) {

      setError(err.message || "Erro ao carregar convênios");

      console.error("Erro:", err);

      setInsurances([]);

    } finally {

      setLoading(false);

    }

  };



  // ===== CARREGAR DADOS PARA ABA DE PREÇOS =====
  const loadPricingTabData = async () => {

    if (!clinicId) {

      console.log("⏭️ Pulando loadPricingTabData: clinicId não definido");

      return;

    }

    try {

      console.log("🔄 Iniciando carregamento completo de dados para preços...");

      

      // 1️⃣ Carregar serviços disponíveis (sempre)

      console.log("📦 Etapa 1: Carregando serviços...");

      const srvs = await servicesApi.listServices(clinicId);

      const servicesLoaded = Array.isArray(srvs) ? srvs : [];

      console.log(`✅ Serviços carregados: ${servicesLoaded.length}`);

      setServices(servicesLoaded);

      

      // 2️⃣ Carregar planos e preços APENAS se editando convênio existente

      if (editingId) {

        console.log("📋 Etapa 2: Carregando planos...");

        const { data: payer } = await supabase

          .from('payers')

          .select('id')

          .eq('name', formData.name)

          .eq('clinic_id', clinicId)

          .maybeSingle(); // Use maybeSingle ao invés de single para evitar erros

        

        if (payer) {

          console.log("✅ Payer encontrado:", payer.id);

          const { data: plansLoaded } = await supabase

            .from("plans")

            .select("id, name, description, active, payer_id")

            .eq("payer_id", payer.id)

            .order("name");

          

          console.log(`✅ Planos carregados: ${plansLoaded?.length || 0}`);

          setPlansData(Array.isArray(plansLoaded) ? plansLoaded : []);

        } else {

          console.warn("⚠️ Payer não encontrado para:", formData.name);

          setPlansData([]);

        }

        // 3️⃣ Carregar dados da tabela de preços

        console.log("📊 Etapa 3: Carregando tabela de preços...");

        await loadPricingTable();

      } else {

        // Novo convênio: limpar planos e preços

        console.log("📋 Etapa 2: Novo convênio (sem planos/preços ainda)");

        setPlansData([]);

        setPricingTableData([]);

      }

    } catch (err) {

      console.error("❌ Erro no loadPricingTabData:", err);

      setServices([]);

      setPlansData([]);

    }

  };



  // ===== CARREGAR SERVIÇOS (para aba de Serviços)
  const loadServicesTab = async () => {

    try {

      setTabLoading(true);

      setError(null);

      const srvs = await servicesApi.listServices(clinicId);

      setServices(Array.isArray(srvs) ? srvs : []);

    } catch (err) {

      setError(err.message || "Erro ao carregar serviços");

      console.error("Erro:", err);

    } finally {

      setTabLoading(false);

    }

  };



  // 🆕 Carregar tabela de preços base do convênio

  const loadPricingTable = async () => {

    if (!editingId) return;

    try {

      // Buscar o payer correspondente ao health_insurance selecionado

      const { data: payer, error: payerError } = await supabase

        .from('payers')

        .select('id')

        .eq('name', formData.name)

        .eq('clinic_id', clinicId)

        .maybeSingle();

      

      if (payerError || !payer) {

        console.warn('⚠️ Payer não encontrado para:', formData.name);

        setPricingTableData([]);

        return;

      }



      // 🆕 Buscar todos os preços base do convênio (que possuem preço configurado)

      const { data: prices, error: pricesError } = await supabase

        .from('service_prices')

        .select(`

          id,

          service_id,

          price,

          plano,

          grupo,

          active,

          scheduling_config,

          created_at,

          updated_at,

          services:service_id (

            id,

            name,

            tuss_code,

            code,

            service_category

          )

        `)

        .eq('payer_id', payer.id)

        .eq('clinic_id', clinicId)

        .gt('price', 0);  // 🆕 Apenas preços > 0



      if (pricesError) {

        console.error('Erro ao carregar preços:', pricesError);

        setPricingTableData([]);

        return;

      }



      // 🆕 Enriquecer dados com informações financeiras

      const enrichedPrices = await Promise.all((prices || []).map(async (price) => {

        // Contar quantos profissionais têm esse preço configurado

        const { data: professionalPrices } = await supabase

          .from('professional_payers')

          .select('id')

          .eq('payer_id', payer.id)

          .eq('clinic_id', clinicId);



        const professionalCount = (professionalPrices?.length || 0);



        return {

          ...price,

          professional_count: professionalCount

        };

      }));



      // Ordenar por nome do serviço no frontend

      const sortedPrices = enrichedPrices.sort((a, b) => {

        const nameA = a.services?.name || '';

        const nameB = b.services?.name || '';

        return nameA.localeCompare(nameB);

      });



      setPricingTableData(sortedPrices);

    } catch (err) {

      console.error('Erro ao carregar tabela de preços:', err);

      setPricingTableData([]);

    }

  };



  // 🆕 Carregar serviços disponíveis

  const loadAvailableServices = async () => {

    try {

      console.log("📦 Carregando serviços da clínica...", { clinicId });

      const srvs = await servicesApi.listServices(clinicId);

      console.log("✅ Serviços carregados:", srvs?.length || 0);

      setServices(Array.isArray(srvs) ? srvs : []);

    } catch (err) {

      console.error('❌ Erro ao carregar serviços:', err);

      setServices([]);

    }

  };



  // 🆕 Adicionar preço manualmente

  const handleAddPricingRow = async () => {

    console.log("💰 [handleAddPricingRow] INICIANDO...", { pricingFormData, editingId });

    if (!pricingFormData.service_id || !pricingFormData.price) {

      setError("Selecione um serviço e informe um preço");

      console.warn("⚠️ [handleAddPricingRow] Validação falhou: sem service_id ou price");

      return;

    }

    // 🔴 Verificar se está criando novo convênio

    if (!editingId) {

      setError("⚠️ Salve o convênio PRIMEIRO antes de adicionar serviços");

      console.warn("⚠️ [handleAddPricingRow] Sem editingId - convênio não foi salvo");

      return;

    }

    try {

      setError(null);

      console.log("🔍 [handleAddPricingRow] Etapa 1: Buscando ou criando payer...", { name: formData.name, clinicId });

      let payerData = await supabase

        .from('payers')

        .select('id')

        .eq('name', formData.name)

        .eq('clinic_id', clinicId)

        .maybeSingle();

      

      // Se payer não existe, criar automaticamente
      if (!payerData.data) {

        console.log("📝 [handleAddPricingRow] Payer não encontrado, criando novo...", { name: formData.name });

        const { data: newPayer, error: createError } = await supabase

          .from('payers')

          .insert([{

            name: formData.name,

            clinic_id: clinicId

          }])

          .select('id')

          .single();

        

        if (createError) {

          console.error("❌ [handleAddPricingRow] Erro ao criar payer:", createError);

          setError("Erro ao criar convênio");

          return;

        }

        payerData = { data: newPayer };

        console.log("✅ [handleAddPricingRow] Payer criado:", { payerId: newPayer.id });

      } else {

        console.log("✅ [handleAddPricingRow] Etapa 2: Payer encontrado:", { payerId: payerData.data.id });

      }



      // Se está em modo edição (tem ID), atualizar diretamente

      if (pricingFormData.id) {

        console.log("📝 [handleAddPricingRow] Etapa 3: Atualizando preço existente...", { id: pricingFormData.id });

        const { error: updateError } = await supabase

          .from('service_prices')

          .update({ 

            price: parseFloat(pricingFormData.price),

            service_id: pricingFormData.service_id,

            plano: pricingFormData.plano || null,

            grupo: pricingFormData.grupo || null

          })

          .eq('id', pricingFormData.id);



        if (updateError) throw updateError;

      } else {

        // Verificar se já existe preço para este serviço

        const { data: existing } = await supabase

          .from('service_prices')
          .select('id')

          .eq('service_id', pricingFormData.service_id)

          .eq('payer_id', payerData.data.id)

          .eq('clinic_id', clinicId)

          .maybeSingle();



        if (existing) {

          // Atualizar

          const { error: updateError } = await supabase

            .from('service_prices')

            .update({ 

              price: parseFloat(pricingFormData.price),

              plano: pricingFormData.plano || null,

              grupo: pricingFormData.grupo || null

            })

            .eq('id', existing.id);



          if (updateError) throw updateError;

        } else {

          // Criar novo

          console.log("➕ [handleAddPricingRow] Etapa 4: Inserindo novo preço...", { 

            service_id: pricingFormData.service_id,

            payer_id: payerData.data.id,

            price: pricingFormData.price

          });

          const { error: insertError } = await supabase

            .from('service_prices')

            .insert([{

              service_id: pricingFormData.service_id,

              payer_id: payerData.data.id,

              clinic_id: clinicId,

              price: parseFloat(pricingFormData.price),

              plano: pricingFormData.plano || null,

              grupo: pricingFormData.grupo || null

            }]);

          if (insertError) {

            console.error("❌ [handleAddPricingRow] Erro no INSERT:", insertError);

            throw insertError;

          }

          console.log("✅ [handleAddPricingRow] Etapa 5: Preço inserido com sucesso!");

        }

      }



      setPricingFormData({ service_id: "", price: "", plano: "", grupo: "", id: null });

      setShowPricingForm(false);

      console.log("🔄 [handleAddPricingRow] Recarregando tabela de preços...");

      await loadPricingTable();

      console.log("✅ [handleAddPricingRow] SUCESSO! Serviço salvo e tabela atualizada.");

    } catch (err) {

      setError(err.message || "Erro ao adicionar preço");

      console.error('❌ [handleAddPricingRow] Erro capturado:', err);

    }

  };



  // 🆕 Editar preço da tabela

  const handleEditPricingRow = async (priceEntry) => {

    setPricingFormData({

      service_id: priceEntry.service_id,

      price: priceEntry.price,

      plano: priceEntry.plano || "",

      grupo: priceEntry.grupo || "",

      id: priceEntry.id

    });

    setShowPricingForm(true);

    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);

  };



  // 🆕 Remover preço da tabela

  const handleRemovePricingRow = async (priceEntry) => {

    if (!window.confirm(`Deseja remover o preço de "${priceEntry.services?.name || 'Serviço desconhecido'}" (R$ ${(priceEntry.price || 0).toFixed(2).replace('.', ',')})?`)) {

      return;

    }



    try {

      setError(null);

      const { error: deleteError } = await supabase

        .from('service_prices')

        .delete()

        .eq('id', priceEntry.id);



      if (deleteError) throw deleteError;



      setError(null);

      loadPricingTable();

    } catch (err) {

      setError(err.message || "Erro ao remover preço");

      console.error('Erro:', err);

    }

  };



  // 🆕 Toggle status de preço (ativo/inativo)

  const togglePricingStatus = async (priceEntry) => {

    const schedulingConfig = priceEntry.scheduling_config 

      ? typeof priceEntry.scheduling_config === 'string' 

        ? JSON.parse(priceEntry.scheduling_config)

        : priceEntry.scheduling_config

      : null;



    // Se está ativo (tem scheduling_config), desativa (limpa)

    // Se está inativo (sem scheduling_config), ativa (cria objeto vazio)

    const newConfig = schedulingConfig ? null : {};



    try {

      setError(null);

      const { error: updateError } = await supabase

        .from('service_prices')

        .update({ scheduling_config: newConfig })

        .eq('id', priceEntry.id);



      if (updateError) throw updateError;



      console.log(`✅ Preço ${priceEntry.id} agora está ${newConfig ? 'ATIVO' : 'INATIVO'}`);

      setError(null);

      loadPricingTable();

    } catch (err) {

      setError(err.message || "Erro ao alterar status do preço");

      console.error('Erro:', err);

    }

  };



  // 🆕 Processar upload de arquivo

  const handleFileUpload = async (e) => {

    const file = e.target.files?.[0];

    if (!file) return;



    try {

      setUploadingFile(true);

      setError(null);



      let headers = [];

      let rows = [];

      

      // Detectar se é Excel ou CSV

      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      

      if (isExcel) {

        // Processar arquivo Excel

        const arrayBuffer = await file.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        

        if (data.length < 2) {

          setError("Arquivo vazio ou sem dados");

          return;

        }

        

        // Header é a primeira linha

        headers = (data[0] || []).map(h => String(h).toLowerCase().trim());

        

        // Dados começam a partir da 3ª linha (índice 2) como no template

        rows = data.slice(2).filter(row => row.some(cell => cell)); // Remover linhas vazias

      } else {

        // Processar arquivo CSV/TXT

        let text = await file.text();

        

        // Remover BOM UTF-8 se presente

        if (text.charCodeAt(0) === 0xFEFF) {

          text = text.slice(1);

        }

        

        const lines = text.trim().split('\n');

        

        if (lines.length < 2) {

          setError("Arquivo vazio ou sem dados");

          return;

        }

        

        headers = lines[0].toLowerCase().split(',').map(h => h.trim());

        

        // Processar dados

        rows = lines.slice(1).map(line => line.split(',').map(s => s.trim())).filter(row => row.some(cell => cell));

      }

      

      const payerUpload = await supabase

        .from('payers')

        .select('id')

        .eq('name', formData.name)

        .eq('clinic_id', clinicId)

        .maybeSingle();

      

      let payerDataUpload = payerUpload;

      

      if (!payerDataUpload.data) {

        console.log("📝 Criando payer para upload...", { name: formData.name });

        const { data: newPayer, error: createError } = await supabase

          .from('payers')

          .insert([{

            name: formData.name,

            clinic_id: clinicId

          }])

          .select('id')

          .single();

        

        if (createError) {

          setError("Erro ao criar convênio");

          return;

        }

        payerDataUpload = { data: newPayer };

      }



      // Mapear posições das colunas esperadas

      const codigoIdx = headers.findIndex(h => h.includes('codigo'));

      const servicoIdx = headers.findIndex(h => h.includes('servico') || h.includes('serviço'));

      const valorIdx = headers.findIndex(h => h.includes('valor') || h.includes('preço') || h.includes('preco'));

      const planoIdx = headers.findIndex(h => h.includes('plano'));

      const grupoIdx = headers.findIndex(h => h.includes('grupo'));



      // Processar linhas com suporte a múltiplas colunas

      const processedRows = rows.map(cols => {

        return {

          codigo: codigoIdx >= 0 ? cols[codigoIdx] : '',

          serviceName: servicoIdx >= 0 ? cols[servicoIdx] : '',

          price: valorIdx >= 0 ? parseFloat(cols[valorIdx]) : 0,

          plano: planoIdx >= 0 ? cols[planoIdx] : '',

          grupo: grupoIdx >= 0 ? cols[grupoIdx] : ''

        };

      }).filter(r => r.serviceName && !isNaN(r.price));



      if (processedRows.length === 0) {

        setError("Nenhum dado válido encontrado no arquivo");

        return;

      }



      let successCount = 0;

      let errorCount = 0;



      for (const row of processedRows) {

        try {

          // Buscar serviço pelo código ou nome

          let service = null;

          

          if (row.codigo) {

            const { data: serviceByCode } = await supabase

              .from('services')

              .select('id')

              .eq('clinic_id', clinicId)

              .eq('code', row.codigo)

              .maybeSingle();

            service = serviceByCode;

          }

          

          if (!service) {

            const { data: serviceByName } = await supabase

              .from('services')

              .select('id')

              .eq('clinic_id', clinicId)

              .ilike('name', row.serviceName)

              .maybeSingle();

            service = serviceByName;

          }



          if (!service) {

            errorCount++;

            continue;

          }



          // Verificar se já existe

          const { data: existing } = await supabase

            .from('service_prices')

            .select('id')

            .eq('service_id', service.id)

            .eq('payer_id', payerDataUpload.data.id)

            .eq('clinic_id', clinicId)

            .maybeSingle();



          if (existing) {

            // Atualizar

            await supabase

              .from('service_prices')

              .update({ 

                price: row.price,

                plano: row.plano || null,

                grupo: row.grupo || null

              })

              .eq('id', existing.id);

          } else {

            // Inserir

            await supabase

              .from('service_prices')

              .insert([{

                service_id: service.id,

                payer_id: payerDataUpload.data.id,

                clinic_id: clinicId,

                price: row.price,

                plano: row.plano || null,

                grupo: row.grupo || null

              }]);

          }

          successCount++;

        } catch (err) {

          console.error('Erro ao processar linha:', err);

          errorCount++;

        }

      }



      setError(null);

      alert(`✅ ${successCount} preços importados com sucesso!\n⚠️ ${errorCount} linhas com erro.`);

      loadPricingTable();

    } catch (err) {

      setError(err.message || "Erro ao fazer upload do arquivo");

      console.error('Erro:', err);

    } finally {

      setUploadingFile(false);

      e.target.value = '';

    }

  };



  // 📋 Função para converter categoria para label
  const getCategoryLabel = (categoryValue) => {
    const categoryMap = {
      consultation: "📋 Consulta",
      exam: "🔬 Exame/SADT",
      procedure: "🏥 Procedimento",
      surgery: "🏨 Cirurgia",
      other: "📝 Outro"
    };
    return categoryMap[categoryValue] || categoryValue || '-';
  };

  // 📋 Função para download de template Excel

  const downloadExcelTemplate = () => {

    // Criar dados com header na linha 1 e dados a partir da linha 3

    const data = [

      ['Código', 'Serviço', 'Plano', 'Categoria', 'Valor', 'Status', 'Ações'],

      [], // Linha em branco

      ['12345', 'Consulta Clínica', 'Plano Básico', 'Consultas', 150.00, '✅ Ativo', ''],

      ['12346', 'Eletrocardiograma', 'Plano Premium', 'Procedimentos', 250.00, '⚠️ Incompleto', ''],

      ['12347', 'Hemograma', 'Qualquer', 'Exames', 80.00, '✅ Ativo', ''],

      ['12348', 'Ultrassom', 'Plano Completo', 'Procedimentos', 300.00, '⚠️ Incompleto', '']

    ];

    

    // Criar worksheet

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    

    // Definir largura das colunas

    worksheet['!cols'] = [

      { wch: 12 },  // Código

      { wch: 25 },  // Serviço

      { wch: 15 },  // Plano

      { wch: 15 },  // Categoria

      { wch: 12 },  // Valor

      { wch: 15 },  // Status

      { wch: 8 }    // Ações

    ];

    

    // Aplicar negrito ao header (linha 1)

    const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1'];

    headerCells.forEach(cell => {

      if (worksheet[cell]) {

        worksheet[cell].s = {

          font: { bold: true },

          alignment: { horizontal: 'center', vertical: 'center' }

        };

      }

    });

    

    // Criar workbook

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Preços');

    

    // Fazer download

    XLSX.writeFile(workbook, 'template-precos.xlsx');

  };

  const loadPlansForPayer = async () => {

    if (!editingId || !formData) {

      console.log("⏭️ Pulando loadPlansForPayer: editingId ou formData não definido");

      return;

    }

    try {

      setPlansLoading(true);

      console.log("📋 Carregando planos para:", { payerName: formData.name });

      

      // Buscar o payer correspondente ao health_insurance pelo nome

      const { data: payer } = await supabase

        .from('payers')

        .select('id')

        .eq('name', formData.name)

        .eq('clinic_id', clinicId)

        .maybeSingle();

      

      if (!payer) {

        console.warn('⚠️ Nenhum payer encontrado com nome:', formData.name);

        setPlansData([]);

        setPlansLoading(false);

        return;

      }

      console.log("✅ Payer encontrado:", payer.id);

      

      const { data, error } = await supabase

        .from("plans")

        .select("id, name, code, description, active, payer_id")

        .eq("payer_id", payer.id)

        .order("name");

      

      if (error) throw error;

      console.log("✅ Planos carregados:", data?.length || 0);

      setPlansData(Array.isArray(data) ? data : []);

    } catch (err) {

      console.error("❌ Erro ao carregar planos:", err.message);

      setPlansData([]);

    } finally {

      setPlansLoading(false);

    }

  };

  // 🆕 Gerar código automático para o plano
  const generatePlanCode = (planName) => {
    if (!planName.trim()) return "";
    
    // Pegar as iniciais de cada palavra
    const words = planName.trim().split(/\s+/);
    const initials = words
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 4); // Até 4 primeiras letras
    
    // Gerar número sequencial de 3 dígitos (001-999)
    const randomNumber = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    return `${initials} - ${randomNumber}`;
  };

  // 🆕 Criar novo plano

  const handleAddPlan = async () => {

    if (!newPlanName.trim() || !editingId || !formData.name) {

      alert("Digite um nome para o plano");

      return;

    }

    try {

      // Buscar o payer correspondente ao health_insurance pelo nome

      const { data: payer, error: payerError } = await supabase

        .from('payers')

        .select('id')

        .eq('name', formData.name)

        .maybeSingle();

      

      if (payerError || !payer) {

        throw new Error(`Payer não encontrado para: ${formData.name}`);

      }

      

      const { data, error } = await supabase

        .from("plans")

        .insert([{

          payer_id: payer.id,

          name: newPlanName,

          code: newPlanCode || null,

          description: newPlanDescription,

          active: true

        }])

        .select();

      

      if (error) throw error;

      

      setPlansData([...plansData, data[0]]);

      setNewPlanName("");

      setNewPlanCode("");

      setNewPlanDescription("");

      setShowNewPlanForm(false);

    } catch (err) {

      console.error("❌ Erro ao criar plano:", err.message);

      alert("Erro ao criar plano: " + err.message);

    }

  };



  // 🆕 Deletar plano

  const handleDeletePlan = async (planId, planName) => {

    if (!confirm(`Tem certeza que deseja deletar o plano "${planName}"?`)) return;

    

    try {

      const { error } = await supabase

        .from("plans")

        .delete()

        .eq("id", planId);

      

      if (error) throw error;

      

      setPlansData(plansData.filter(p => p.id !== planId));

    } catch (err) {

      console.error("❌ Erro ao deletar plano:", err.message);

      alert("Erro ao deletar plano: " + err.message);

    }

  };



  const handleEditPlan = (plan) => {

    setEditingPlanId(plan.id);

    setEditingPlanName(plan.name);

    setEditingPlanCode(plan.code || "");

    setEditingPlanDescription(plan.description || "");

    setEditingPlanActive(plan.active || false);

  };



  const handleUpdatePlan = async () => {

    if (!editingPlanName.trim()) {

      alert("Digite um nome para o plano");

      return;

    }

    

    try {

      const { error } = await supabase

        .from("plans")

        .update({

          name: editingPlanName,

          code: editingPlanCode || null,

          description: editingPlanDescription,

          active: editingPlanActive

        })

        .eq("id", editingPlanId);

      

      if (error) throw error;

      

      setPlansData(plansData.map(p => 

        p.id === editingPlanId 

          ? { ...p, name: editingPlanName, code: editingPlanCode, description: editingPlanDescription, active: editingPlanActive }

          : p

      ));

      

      setEditingPlanId(null);

      setEditingPlanName("");

      setEditingPlanCode("");

      setEditingPlanDescription("");

      setEditingPlanActive(false);

      alert("✅ Plano atualizado com sucesso!");

    } catch (err) {

      console.error("❌ Erro ao atualizar plano:", err.message);

      alert("Erro ao atualizar plano: " + err.message);

    }

  };



  const handleCancelEdit = () => {

    setEditingPlanId(null);

    setEditingPlanName("");

    setEditingPlanCode("");

    setEditingPlanDescription("");

    setEditingPlanActive(false);

  };



  useEffect(() => {

    // Carregar planos quando a aba é selecionada e há um convênio em edição

    if ((activeTab === "plans" || activeTab === "pricing") && editingId) {

      loadPlansForPayer();

    }

  }, [activeTab, editingId]);



  const generateConvenioCode = () => {

    // Extrai números dos códigos existentes (ex: CONV001 -> 1)

    const existingCodes = insurances

      .map((i) => {

        const match = i.code?.match(/CONV(\d+)/i);

        return match ? parseInt(match[1], 10) : 0;

      })

      .filter((num) => !isNaN(num));



    // Encontra o maior número e incrementa

    const maxNumber = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;

    const nextNumber = maxNumber + 1;



    // Formata com 3 dígitos (CONV001, CONV002, etc)

    return `CONV${String(nextNumber).padStart(3, "0")}`;

  };



  const handleNew = () => {

    setEditingId(null);

    setFormData({

      code: generateConvenioCode(),

      name: "",

      fantasy_name: "",

      legal_name: "",

      type: "health_plan",

      cnpj: "",

      contact_person: "",

      contact_email: "",

      contact_phone: "",

      discount_percentage: 0,

      minimum_margin_percentage: 0,

      special_rules: "",

      active: true,

      registration_ans: "",

      tiss_pattern: true,

      guide_format: "",

      tiss_version: "3.05.00",

      // ===== NOVOS CAMPOS: ENDEREÇO =====

      address_street: "",

      address_number: "",

      address_neighborhood: "",

      address_city: "",

      address_state: "",

      address_zip_code: "",

    });

    setShowForm(true);

    setError(null);

  };



  const handleEdit = (insurance) => {

    setEditingId(insurance.id);

    setSelectedInsurance(insurance);

    setFormData({

      code: insurance.code || "",

      name: insurance.name || "",

      fantasy_name: insurance.fantasy_name || "",

      legal_name: insurance.legal_name || "",

      type: insurance.type || "",

      cnpj: insurance.cnpj || "",

      contact_person: insurance.contact_person || "",

      contact_email: insurance.contact_email || "",

      contact_phone: insurance.contact_phone || "",

      contact_mobile: insurance.contact_mobile || "",

      discount_percentage: insurance.discount_percentage || 0,

      minimum_margin_percentage: insurance.minimum_margin_percentage || 0,

      special_rules: insurance.special_rules || "",

      active: insurance.active !== false,

      // ===== NOVOS CAMPOS TISS =====

      registration_ans: insurance.registration_ans || "",

      tiss_pattern: insurance.tiss_pattern !== false,

      guide_format: insurance.guide_format || "",

      tiss_version: insurance.tiss_version || "3.05.00",

      // ===== NOVOS CAMPOS: ENDEREÇO =====

      address_street: insurance.address_street || "",

      address_number: insurance.address_number || "",

      address_neighborhood: insurance.address_neighborhood || "",

      address_city: insurance.address_city || "",

      address_state: insurance.address_state || "",

      address_zip_code: insurance.address_zip_code || "",

      // ===== NOVOS CAMPOS: IDENTIFICAÇÃO FISCAL =====

      municipal_registration: insurance.municipal_registration || "",

      state_registration: insurance.state_registration || "",

      country: insurance.country || "Brasil",

      // ===== NOVOS CAMPOS: TRIBUTOS =====

      icms_applicable: insurance.icms_applicable === true,

      icms_rate: insurance.icms_rate || 0,

      pis_applicable: insurance.pis_applicable === true,

      pis_rate: insurance.pis_rate || 0,

      cofins_applicable: insurance.cofins_applicable === true,

      cofins_rate: insurance.cofins_rate || 0,

      iss_applicable: insurance.iss_applicable === true,

      iss_rate: insurance.iss_rate || 0,

      issrf_applicable: insurance.issrf_applicable === true,

      issrf_rate: insurance.issrf_rate || 0,

      inss_applicable: insurance.inss_applicable === true,

      inss_rate: insurance.inss_rate || 0,

      ibs_applicable: insurance.ibs_applicable === true,

      ibs_rate: insurance.ibs_rate || 0,

      cbs_applicable: insurance.cbs_applicable === true,

      cbs_rate: insurance.cbs_rate || 0,

      retains_taxes: insurance.retains_taxes === true,

      tax_regime: insurance.tax_regime || "",

      // ===== NOVOS CAMPOS: FINANCEIRO =====

      payment_due_days: insurance.payment_due_days || 30,

      accepted_payment_methods: insurance.accepted_payment_methods || [],

      billing_cycle_start: insurance.billing_cycle_start || 1,

      billing_cycle_end: insurance.billing_cycle_end || 30,

      administration_fee_percentage: insurance.administration_fee_percentage || 0,

      early_payment_discount_percentage: insurance.early_payment_discount_percentage || 0,

      volume_discount_percentage: insurance.volume_discount_percentage || 0,

      reajustment_index: insurance.reajustment_index || "",

      annual_reajustment_date: insurance.annual_reajustment_date || "",

      next_reajustment_date: insurance.next_reajustment_date || "",

      monthly_billing_ceiling: insurance.monthly_billing_ceiling || null,

      consultation_limit: insurance.consultation_limit || null,

      copayment_value: insurance.copayment_value || null,

      contract_start_date: insurance.contract_start_date || "",

      contract_end_date: insurance.contract_end_date || "",

      auto_renewal: insurance.auto_renewal === true,

      prior_notice_days: insurance.prior_notice_days || 30,

      days_to_suspension: insurance.days_to_suspension || 30,

      late_payment_fine_percentage: insurance.late_payment_fine_percentage || 0,

      daily_interest_rate_percentage: insurance.daily_interest_rate_percentage || 0,

      financial_contact_name: insurance.financial_contact_name || "",

      financial_contact_email: insurance.financial_contact_email || "",

      financial_contact_phone: insurance.financial_contact_phone || "",

      bank_name: insurance.bank_name || "",

      bank_branch: insurance.bank_branch || "",

      bank_account: insurance.bank_account || "",

    });

    setShowForm(true);

    setActiveTab("general");

    setError(null);

    // 🆕 Resetar estados dos planos

    setPlansData([]);

    setNewPlanName("");

    setNewPlanDescription("");

    setShowNewPlanForm(false);

  };



  const closeForm = () => {

    setShowForm(false);

    setEditingId(null);

    setActiveTab("general");

    setFormData({

      code: "",

      name: "",

      fantasy_name: "",

      legal_name: "",

      type: "health_plan",

      cnpj: "",

      contact_person: "",

      contact_email: "",

      contact_phone: "",

      contact_mobile: "",

      discount_percentage: 0,

      minimum_margin_percentage: 0,

      special_rules: "",

      active: true,

      registration_ans: "",

      tiss_pattern: true,

      guide_format: "",

      tiss_version: "3.05.00",

      // ===== NOVOS CAMPOS: ENDEREÇO =====

      address_street: "",

      address_number: "",

      address_neighborhood: "",

      address_city: "",

      address_state: "",

      address_zip_code: "",

      // ===== NOVOS CAMPOS: IDENTIFICAÇÃO FISCAL =====

      municipal_registration: "",

      state_registration: "",

      country: "Brasil",

      // ===== NOVOS CAMPOS: TRIBUTOS =====

      icms_applicable: false,

      icms_rate: 0,

      pis_applicable: false,

      pis_rate: 0,

      cofins_applicable: false,

      cofins_rate: 0,

      iss_applicable: false,

      iss_rate: 0,

      issrf_applicable: false,

      issrf_rate: 0,

      inss_applicable: false,

      inss_rate: 0,

      ibs_applicable: false,

      ibs_rate: 0,

      cbs_applicable: false,

      cbs_rate: 0,

      retains_taxes: false,

      tax_regime: "",

    });

    // 🆕 Limpar estados dos planos

    setPlansData([]);

    setNewPlanName("");

    setNewPlanDescription("");

    setShowNewPlanForm(false);

    setSubmitting(false);

  };



  const closePriceForm = () => {

    setShowPriceForm(false);

    setPriceFormData({

      service_id: "",

      service_value: "",

      copay_value: "",

    });

  };



  // Função para verificar se há mudanças antes de fechar

  const handleCloseWithCheck = () => {

    // Verifica se há algum dado preenchido no formulário

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



  const selectInsurance = (insurance) => {

    setSelectedInsurance(insurance);

    setError(null);

  };



  const closeInsuranceDetail = () => {

    setSelectedInsurance(null);

  };



  const addServicePrice = async () => {

    if (!priceFormData.service_id || (!priceFormData.service_value && !priceFormData.copay_value)) {

      setError("Selecione um serviço e defina pelo menos um valor");

      return;

    }



    try {

      setSubmitting(true);

      setError(null);

      closePriceForm();

      await loadServicesTab();

    } catch (err) {

      setError(err.message || "Erro ao adicionar serviço");

      console.error("Erro:", err);

    } finally {

      setSubmitting(false);

    }

  };



  const deleteServicePrice = async (serviceId) => {

    if (!window.confirm("Tem certeza que deseja remover este serviço?")) {

      return;

    }



    try {

      setError(null);

      await loadServicesTab();

    } catch (err) {

      setError(err.message || "Erro ao remover serviço");

      console.error("Erro:", err);

    }

  };



  const validateForm = () => {

    if (!formData.fantasy_name.trim()) {

      setError("Nome Fantasia é obrigatório");

      return false;

    }

    if (!formData.code.trim()) {

      setError("Código é obrigatório");

      return false;

    }

    if (!formData.type.trim()) {

      setError("Tipo de convênio é obrigatório");

      return false;

    }

    return true;

  };



  const handleSubmit = async (e) => {

    e.preventDefault();



    if (!validateForm()) {

      return;

    }



    try {

      setSubmitting(true);

      setError(null);



      const dataToSave = {

        code: formData.code?.trim() || null,

        name: formData.fantasy_name?.trim() || null,

        fantasy_name: formData.fantasy_name?.trim() || null,

        legal_name: formData.legal_name?.trim() || null,

        type: formData.type?.trim() || null,

        cnpj: formData.cnpj?.trim() || null,

        contact_person: formData.contact_person?.trim() || null,

        contact_email: formData.contact_email?.trim() || null,

        contact_phone: formData.contact_phone?.trim() || null,

        contact_mobile: formData.contact_mobile?.trim() || null,

        discount_percentage: parseFloat(formData.discount_percentage) || 0,

        minimum_margin_percentage: parseFloat(formData.minimum_margin_percentage) || 0,

        special_rules: formData.special_rules?.trim() || null,

        active: formData.active,

        registration_ans: formData.registration_ans?.trim() || null,

        tiss_pattern: formData.tiss_pattern === true,

        guide_format: formData.guide_format?.trim() || null,

        tiss_version: formData.tiss_version?.trim() || "3.05.00",

        // ===== NOVOS CAMPOS: ENDEREÇO =====

        address_street: formData.address_street?.trim() || null,

        address_number: formData.address_number?.trim() || null,

        address_neighborhood: formData.address_neighborhood?.trim() || null,

        address_city: formData.address_city?.trim() || null,

        address_state: formData.address_state?.trim() || null,

        address_zip_code: formData.address_zip_code?.trim() || null,

        // ===== NOVOS CAMPOS: IDENTIFICAÇÃO FISCAL =====

        municipal_registration: formData.municipal_registration?.trim() || null,

        state_registration: formData.state_registration?.trim() || null,

        country: formData.country?.trim() || "Brasil",

        // ===== NOVOS CAMPOS: TRIBUTOS =====

        icms_applicable: formData.icms_applicable === true,

        icms_rate: parseFloat(formData.icms_rate) || 0,

        pis_applicable: formData.pis_applicable === true,

        pis_rate: parseFloat(formData.pis_rate) || 0,

        cofins_applicable: formData.cofins_applicable === true,

        cofins_rate: parseFloat(formData.cofins_rate) || 0,

        iss_applicable: formData.iss_applicable === true,

        iss_rate: parseFloat(formData.iss_rate) || 0,

        issrf_applicable: formData.issrf_applicable === true,

        issrf_rate: parseFloat(formData.issrf_rate) || 0,

        inss_applicable: formData.inss_applicable === true,

        inss_rate: parseFloat(formData.inss_rate) || 0,

        ibs_applicable: formData.ibs_applicable === true,

        ibs_rate: parseFloat(formData.ibs_rate) || 0,

        cbs_applicable: formData.cbs_applicable === true,

        cbs_rate: parseFloat(formData.cbs_rate) || 0,

        retains_taxes: formData.retains_taxes === true,

        tax_regime: formData.tax_regime?.trim() || null,

      };



      console.log("📊 Frontend - Dados a salvar:", dataToSave);

      console.log("🔍 Modo:", editingId ? "UPDATE" : "CREATE", editingId || "novo");



      if (editingId) {

        console.log("🔄 Chamando UPDATE...");

        await healthInsurancesApi.updateHealthInsurance(editingId, clinicId, dataToSave);

        setInsurances(

          insurances.map((i) =>

            i.id === editingId ? { ...i, ...dataToSave } : i

          )

        );

      } else {

        console.log("➕ Chamando CREATE...");

        const newInsurance = await healthInsurancesApi.createHealthInsurance(clinicId, dataToSave);

        setInsurances([...insurances, newInsurance]);

      }



      closeForm();

    } catch (err) {

      console.error("❌ Erro ao salvar convênio:", err);

      setError(err.message || "Erro ao salvar convênio");

    } finally {

      setSubmitting(false);

    }

  };



  const handleDelete = async (id, name) => {

    if (!window.confirm(`Tem certeza que deseja deletar "${name}"?`)) {

      return;

    }



    try {

      setError(null);

      await healthInsurancesApi.deleteHealthInsurance(id);

      setInsurances(insurances.filter((i) => i.id !== id));

    } catch (err) {

      setError(err.message || "Erro ao deletar convênio");

      console.error("Erro:", err);

    }

  };



  if (loading) {

    return (

      <div className="space-y-4 w-full">

        <div className="h-10 bg-gray-200 rounded animate-pulse" />

        <div className="h-64 bg-gray-200 rounded animate-pulse" />

      </div>

    );

  }



  // Detalhe de Convênio com M:M Serviços

  if (selectedInsurance) {

    return (

      <div className="space-y-6 w-full">

        <button

          onClick={closeInsuranceDetail}

          className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2"

        >

          ← Voltar à lista

        </button>



        <div>

          <h1 className="text-3xl font-bold text-gray-900">{selectedInsurance.name}</h1>

          <p className="text-gray-600 mt-1">Código: {selectedInsurance.code}</p>

        </div>



        {error && (

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">

            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />

            <div>

              <p className="font-medium text-red-900">Erro</p>

              <p className="text-sm text-red-700">{error}</p>

            </div>

          </div>

        )}



        <Card>

          <CardHeader className="border-b">

            <CardTitle>Serviços e Valores</CardTitle>

          </CardHeader>

          <CardContent className="pt-6">

            {tabLoading ? (

              <div className="text-center py-8">

                <div className="animate-spin inline-block">⌛</div>

                <p className="text-gray-600 mt-2">Carregando...</p>

              </div>

            ) : (

              <div className="space-y-4">

                <div className="flex justify-end">

                  <Button

                    onClick={() => setShowPriceForm(true)}

                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"

                  >

                    <Plus className="w-4 h-4" />

                    Adicionar Serviço

                  </Button>

                </div>



                {showPriceForm && (

                  <div className="border rounded-lg p-4 bg-blue-50">

                    <h3 className="font-medium text-gray-900 mb-4">Novo Serviço</h3>

                    <div className="space-y-4">

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          Serviço <span className="text-red-500">*</span>

                        </label>

                        <select

                          value={priceFormData.service_id}

                          onChange={(e) =>

                            setPriceFormData({ ...priceFormData, service_id: e.target.value })

                          }

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                          disabled={submitting}

                        >

                          <option value="">Selecione um serviço</option>

                          {services.map((service) => (

                            <option key={service.id} value={service.id}>

                              {service.name}

                            </option>

                          ))}

                        </select>

                      </div>



                      <div className="grid grid-cols-2 gap-4">

                        <div>

                          <label className="block text-sm font-medium text-gray-700 mb-1">

                            Valor do Serviço (R$)

                          </label>

                          <input

                            type="number"

                            value={priceFormData.service_value}

                            onChange={(e) =>

                              setPriceFormData({ ...priceFormData, service_value: e.target.value })

                            }

                            step="0.01"

                            min="0"

                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                            disabled={submitting}

                          />

                        </div>



                        <div>

                          <label className="block text-sm font-medium text-gray-700 mb-1">

                            Copagamento (R$)

                          </label>

                          <input

                            type="number"

                            value={priceFormData.copay_value}

                            onChange={(e) =>

                              setPriceFormData({ ...priceFormData, copay_value: e.target.value })

                            }

                            step="0.01"

                            min="0"

                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                            disabled={submitting}

                          />

                        </div>

                      </div>



                      <div className="flex gap-3">

                        <Button

                          onClick={closePriceForm}

                          variant="outline"

                          className="flex-1"

                          disabled={submitting}

                        >

                          Cancelar

                        </Button>

                        <Button

                          onClick={addServicePrice}

                          className="flex-1 bg-blue-600 hover:bg-blue-700"

                          disabled={submitting}

                        >

                          {submitting ? "Salvando..." : "Salvar"}

                        </Button>

                      </div>

                    </div>

                  </div>

                )}



                {insuranceServices.length > 0 ? (

                  <div className="overflow-x-auto">

                    <table className="w-full text-sm">

                      <thead>

                        <tr className="border-b bg-gray-50">

                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Serviço</th>

                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>

                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Copagamento</th>

                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>

                        </tr>

                      </thead>

                      <tbody>

                        {insuranceServices.map((insService) => (

                          <tr key={insService.id} className="border-b hover:bg-gray-50">

                            <td className="py-3 px-4">{insService.service_name || insService.service?.name || "-"}</td>

                            <td className="py-3 px-4 text-right">

                              {insService.service_value

                                ? `R$ ${parseFloat(insService.service_value).toFixed(2)}`

                                : "-"}

                            </td>

                            <td className="py-3 px-4 text-right">

                              {insService.copay_value

                                ? `R$ ${parseFloat(insService.copay_value).toFixed(2)}`

                                : "-"}

                            </td>

                            <td className="py-3 px-4 flex justify-center">

                              <button

                                onClick={() => deleteServicePrice(insService.service_id)}

                                className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"

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

                ) : (

                  <div className="text-center py-8 border rounded-lg bg-gray-50">

                    <p className="text-gray-600">Nenhum serviço cadastrado para este convênio</p>

                  </div>

                )}

              </div>

            )}

          </CardContent>

        </Card>

      </div>

    );

  }



  // Listagem principal

  return (

    <div className="space-y-6 w-full mx-auto">

      <BaseSystemHeader

        category="4.1 Cadastros Estruturais"

        title="Convênios"

        subtitle="Cadastre convênios e seguradoras de saúde"

      />



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

          <CardTitle>Convênios Cadastrados ({insurances.length})</CardTitle>

          <Button

            onClick={handleNew}

            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"

          >

            <Plus className="w-4 h-4" />

            Novo Convênio

          </Button>

        </CardHeader>

        <CardContent>

          {insurances.length === 0 ? (

            <EmptyState

              icon={<Landmark className="w-12 h-12 mx-auto text-gray-400" />}

              title="Nenhum convênio cadastrado"

              description="Comece criando seu primeiro convênio para gerenciar seguradoras e planos de saúde"

              action={

                <Button

                  onClick={handleNew}

                  className="bg-blue-600 hover:bg-blue-700"

                >

                  Cadastrar Primeiro Convênio

                </Button>

              }

            />

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Código</th>

                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>

                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>

                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>

                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>

                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>

                  </tr>

                </thead>

                <tbody>

                  {insurances.map((insurance) => (

                    <tr key={insurance.id} className="border-b hover:bg-gray-50 transition">

                      <td

                        className="py-3 px-4 font-medium text-blue-600 cursor-pointer hover:text-blue-700"

                        onClick={() => selectInsurance(insurance)}

                      >

                        {insurance.code}

                      </td>

                      <td

                        className="py-3 px-4 text-blue-600 cursor-pointer hover:text-blue-700"

                        onClick={() => selectInsurance(insurance)}

                      >

                        {insurance.fantasy_name || insurance.name}

                      </td>

                      <td className="py-3 px-4 text-gray-600">

                        {translateType(insurance.type)}

                      </td>

                      <td className="py-3 px-4 text-gray-600">

                        {insurance.contact_email || "-"}

                      </td>

                      <td className="py-3 px-4 text-center">

                        {insurance.active ? (

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

                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEdit(insurance);
                            setSelectedInsurance(null);
                          }}

                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"

                          disabled={submitting}

                          title="Editar convênio"

                        >

                          <Edit2 className="w-4 h-4" />

                        </button>

                        <button

                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(insurance.id, insurance.name);
                          }}

                          className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"

                          disabled={submitting}

                          title="Deletar convênio"

                        >

                          <Trash2 className="w-4 h-4" />

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </CardContent>

      </Card>



      {showForm && (

        <div className="app-modal-overlay">

          <div className="app-modal-shell app-modal-shell--form app-modal-shell--wide">

            <Card className="app-modal-card shadow-2xl border-0">

              {/* Botão Fechar - Posicionado Absolutamente */}

              <button

                type="button"

                onClick={() => handleCloseWithCheck()}

                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors z-10"

                title="Fechar"

              >

                <X size={20} />

              </button>



              <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white" style={{flexShrink: 0, padding: "16px"}}>

                <CardTitle className="text-white">

                  {editingId ? "Editar Convênio" : "Novo Convênio"}

                </CardTitle>

              </CardHeader>



              {/* Abas de Navegação */}

              <div style={{display: 'flex', width: '100%', gap: '0', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff', alignItems: 'stretch', height: '48px', flexShrink: 0}}>

                <button

                  type="button"

                  onClick={() => setActiveTab("general")}

                  style={{flex: '1', padding: '0 !important', margin: '0 !important', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: activeTab === "general" ? '2px solid #2563eb' : '2px solid transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'transparent', color: activeTab === "general" ? '#2563eb' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1', whiteSpace: 'nowrap', fontFamily: 'inherit', boxSizing: 'border-box'}}

                >

                  Dados Gerais

                </button>

                <button

                  type="button"

                  onClick={() => setActiveTab("address")}

                  style={{flex: '1', padding: '0 !important', margin: '0 !important', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: activeTab === "address" ? '2px solid #2563eb' : '2px solid transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'transparent', color: activeTab === "address" ? '#2563eb' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1', whiteSpace: 'nowrap', fontFamily: 'inherit', boxSizing: 'border-box'}}

                >

                  Endereço

                </button>

                <button

                  type="button"

                  onClick={() => setActiveTab("fiscal")}

                  style={{flex: '1', padding: '0 !important', margin: '0 !important', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: activeTab === "fiscal" ? '2px solid #2563eb' : '2px solid transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'transparent', color: activeTab === "fiscal" ? '#2563eb' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1', whiteSpace: 'nowrap', fontFamily: 'inherit', boxSizing: 'border-box'}}

                >

                  Fiscal

                </button>

                <button

                  type="button"

                  onClick={() => setActiveTab("billing")}

                  style={{flex: '1', padding: '0 !important', margin: '0 !important', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: activeTab === "billing" ? '2px solid #ea580c' : '2px solid transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'transparent', color: activeTab === "billing" ? '#ea580c' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1', whiteSpace: 'nowrap', fontFamily: 'inherit', boxSizing: 'border-box'}}

                >

                  Faturamento

                </button>

                <button

                  type="button"

                  onClick={() => setActiveTab("taxes")}

                  style={{flex: '1', padding: '0 !important', margin: '0 !important', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: activeTab === "taxes" ? '2px solid #2563eb' : '2px solid transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'transparent', color: activeTab === "taxes" ? '#2563eb' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1', whiteSpace: 'nowrap', fontFamily: 'inherit', boxSizing: 'border-box'}}

                >

                  Tributos

                </button>

                <button

                  type="button"

                  onClick={() => setActiveTab("financial")}

                  style={{flex: '1', padding: '0 !important', margin: '0 !important', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: activeTab === "financial" ? '2px solid #16a34a' : '2px solid transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'transparent', color: activeTab === "financial" ? '#16a34a' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1', whiteSpace: 'nowrap', fontFamily: 'inherit', boxSizing: 'border-box'}}

                >

                  Financeiro

                </button>

                <button

                  type="button"

                  onClick={() => setActiveTab("plans")}

                  style={{flex: '1', padding: '0 !important', margin: '0 !important', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: activeTab === "plans" ? '2px solid #7c3aed' : '2px solid transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'transparent', color: activeTab === "plans" ? '#7c3aed' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1', whiteSpace: 'nowrap', fontFamily: 'inherit', boxSizing: 'border-box'}}

                >

                  Planos

                </button>

                <button

                  type="button"

                  onClick={() => setActiveTab("pricing")}

                  style={{flex: '1', padding: '0 !important', margin: '0 !important', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: activeTab === "pricing" ? '2px solid #dc2626' : '2px solid transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'transparent', color: activeTab === "pricing" ? '#dc2626' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1', whiteSpace: 'nowrap', fontFamily: 'inherit', boxSizing: 'border-box'}}

                >

                  Tabela de Preços

                </button>

                <button

                  type="button"

                  onClick={() => setActiveTab("tiss")}

                  style={{flex: '1', padding: '0 !important', margin: '0 !important', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: activeTab === "tiss" ? '2px solid #7c3aed' : '2px solid transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'transparent', color: activeTab === "tiss" ? '#7c3aed' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1', whiteSpace: 'nowrap', fontFamily: 'inherit', boxSizing: 'border-box'}}

                >

                  🏥 TISS

                </button>

              </div>



              <CardContent className="app-modal-body p-6 modal-content-scroll">

                <form id="convenio-form" onSubmit={handleSubmit} className="space-y-6 flex flex-col" style={{flex: 1, overflow: "visible"}}>

                  <div style={{flex: 1, overflowY: "auto", paddingRight: "8px"}}>

                    {/* ABA: DADOS GERAIS */}

                    {activeTab === "general" && (

                      <div className="space-y-6">

                        {/* Seção: Código + Tipo */}

                        <div className="grid grid-cols-4 gap-4">

                      <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Código <span className="text-red-500">*</span>

                      </label>

                      <input

                        type="text"

                        value={formData.code}

                        onChange={(e) =>

                          setFormData({ ...formData, code: e.target.value })

                        }

                        placeholder="Ex: CONV001"

                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"

                        required

                        disabled={submitting || !editingId}

                        readOnly={!editingId}

                      />

                    </div>



                    <div className="col-span-3">

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Tipo <span className="text-red-500">*</span>

                      </label>

                      <select

                        value={formData.type}

                        onChange={(e) =>

                          setFormData({ ...formData, type: e.target.value })

                        }

                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        required

                        disabled={submitting}

                      >

                        <option value="">Selecione o tipo</option>

                        <option value="health_plan">Plano de Saúde</option>

                        <option value="private_insurance">Seguro Privado</option>

                        <option value="government">Governamental (SUS/INSS)</option>

                        <option value="direct_pay">Pagamento Direto</option>

                        <option value="other">Outro</option>

                      </select>

                    </div>

                  </div>



                  {/* Seção: Nome Fantasia + Razão Social */}

                  <div className="grid grid-cols-2 gap-4">

                    <div className="col-span-1">

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Nome Fantasia <span className="text-red-500">*</span>

                      </label>

                      <input

                        type="text"

                        value={formData.fantasy_name}

                        onChange={(e) =>

                          setFormData({ ...formData, fantasy_name: e.target.value })

                        }

                        placeholder="Ex: Unimed São Paulo"

                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        required

                        disabled={submitting}

                      />

                    </div>



                    <div className="col-span-1">

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Razão Social

                      </label>

                      <input

                        type="text"

                        value={formData.legal_name}

                        onChange={(e) =>

                          setFormData({ ...formData, legal_name: e.target.value })

                        }

                        placeholder="Ex: Unimed Brasil Administradora..."

                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        disabled={submitting}

                      />

                    </div>

                  </div>



                  {/* Seção: CNPJ + Pessoa de Contato */}

                  <div className="grid grid-cols-2 gap-4">

                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        CNPJ

                      </label>

                      <input

                        type="text"

                        value={formData.cnpj}

                        onChange={(e) =>

                          setFormData({ ...formData, cnpj: e.target.value })

                        }

                        placeholder="00.000.000/0000-00"

                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        disabled={submitting}

                      />

                    </div>



                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Pessoa de Contato

                      </label>

                      <input

                        type="text"

                        value={formData.contact_person}

                        onChange={(e) =>

                          setFormData({ ...formData, contact_person: e.target.value })

                        }

                        placeholder="Nome do responsável"

                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        disabled={submitting}

                      />

                    </div>

                  </div>



                  {/* Seção: Email (linha cheia) */}

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">

                      Email de Contato

                    </label>

                    <input

                      type="email"

                      value={formData.contact_email}

                      onChange={(e) =>

                        setFormData({ ...formData, contact_email: e.target.value })

                      }

                      placeholder="contato@exemplo.com"

                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                      disabled={submitting}

                    />

                  </div>



                  {/* Seção: Telefone + Celular */}

                  <div className="grid grid-cols-2 gap-4">

                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Telefone de Contato

                      </label>

                      <input

                        type="tel"

                        value={formData.contact_phone}

                        onChange={(e) =>

                          setFormData({ ...formData, contact_phone: e.target.value })

                        }

                        placeholder="(11) 3333-3333"

                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        disabled={submitting}

                      />

                    </div>



                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Celular de Contato

                      </label>

                      <input

                        type="tel"

                        value={formData.contact_mobile}

                        onChange={(e) =>

                          setFormData({ ...formData, contact_mobile: e.target.value })

                        }

                        placeholder="(11) 99999-9999"

                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        disabled={submitting}

                      />

                    </div>

                  </div>



                  {/* Seção: Regras Específicas em linha cheia */}

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">

                      Regras Específicas

                    </label>

                    <textarea

                      value={formData.special_rules}

                      onChange={(e) =>

                        setFormData({ ...formData, special_rules: e.target.value })

                      }

                      placeholder="Ex: Requer autorização prévia, limite de 10 consultas/mês, etc"

                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                      rows={2}

                      disabled={submitting}

                    />

                  </div>

                  {/* Seção: Checkbox Ativo */}

                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">

                    <input

                      type="checkbox"

                      id="active"

                      checked={formData.active}

                      onChange={(e) =>

                        setFormData({ ...formData, active: e.target.checked })

                      }

                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"

                      disabled={submitting}

                    />

                    <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer">

                      ✅ Convênio Ativo

                    </label>

                    <span className="text-xs text-gray-500 ml-auto">

                      {formData.active ? 'Habilitado para agendamentos' : 'Desabilitado'}

                    </span>

                  </div>

                    </div>

                  )}



                  {/* ABA: TABELA DE PREÇOS */}

                  {activeTab === "pricing" && (

                    <div className="space-y-6">

                      <div className="border-b pb-6">

                        {/* 📋 Cabeçalho Limpo */}

                        <div className="mb-6">

                          <h3 className="text-lg font-bold text-gray-900 mb-1">💰 Tabela de Preços</h3>

                          <p className="text-xs text-gray-500">Gerencie serviços e preços para este convênio</p>

                        </div>

                        

                        {/* ⚠️ Aviso se não salvou o convênio ainda */}

                        {!editingId && (

                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">

                            <p className="text-sm text-amber-800">

                              ⚠️ <strong>Salve o convênio primeiro</strong> antes de adicionar serviços

                            </p>

                          </div>

                        )}

                        

                        {/* Botões de Ação */}

                        <div className="flex gap-2 flex-wrap mb-6">

                          <Button

                            type="button"

                            onClick={() => setShowPricingForm(!showPricingForm)}

                            disabled={!editingId}

                            title={!editingId ? "Salve o convênio primeiro" : ""}

                            className={`text-white text-sm py-2 px-4 rounded flex items-center gap-2 ${

                              editingId ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"

                            }`}

                          >

                            <Plus className="w-4 h-4" />

                            Novo Serviço

                          </Button>

                          <label className="inline-block">

                            <Button

                              type="button"

                              onClick={() => document.getElementById('pricingFileInput')?.click()}

                              disabled={uploadingFile || !editingId}

                              title={!editingId ? "Salve o convênio primeiro" : ""}

                              className={`text-white text-sm py-2 px-4 rounded flex items-center gap-2 ${

                                editingId && !uploadingFile ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"

                              }`}

                            >

                              <Upload className="w-4 h-4" />

                              {uploadingFile ? 'Carregando...' : 'Importar Excel'}

                            </Button>

                            <input

                              id="pricingFileInput"

                              type="file"

                              accept=".csv,.xlsx,.xls,.txt"

                              onChange={handleFileUpload}

                              style={{ display: 'none' }}

                            />

                          </label>

                          <Button

                            type="button"

                            onClick={downloadExcelTemplate}

                            disabled={!editingId}

                            title={!editingId ? "Salve o convênio primeiro" : ""}

                            className={`text-white text-sm py-2 px-4 rounded flex items-center gap-2 ${

                              editingId ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-400 cursor-not-allowed"

                            }`}

                          >

                            📥 Template Excel

                          </Button>

                        </div>

                        

                        <div className="space-y-6">

                          <>

                            {/* Formulário Compacto */}

                              {showPricingForm && (

                              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">

                                <h4 className="text-sm font-semibold text-gray-900 mb-4">

                                  {pricingFormData.id ? '✏️ Editar Serviço' : '➕ Novo Serviço'}

                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">

                                  <select

                                    value={pricingFormData.service_id}

                                    onChange={(e) => {
                                      const selectedServiceId = e.target.value;
                                      const selectedService = services.find(s => s.id === selectedServiceId);
                                      setPricingFormData({
                                        ...pricingFormData,
                                        service_id: selectedServiceId,
                                        grupo: selectedService?.service_category || ''
                                      });
                                    }}

                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

                                  >

                                    <option value="">📋 Selecione o serviço</option>

                                    {(services || [])

                                      .filter(s => !pricingTableData.some(p => p.service_id === s.id && p.id !== pricingFormData.id))

                                      .map(s => (

                                        <option key={s.id} value={s.id}>{s.name}</option>

                                      ))}

                                  </select>

                                  <select

                                    value={pricingFormData.plano}

                                    onChange={(e) => setPricingFormData({...pricingFormData, plano: e.target.value})}

                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

                                  >

                                    <option value="">📍 Selecione o plano</option>

                                    {(plansData || []).map(plan => (

                                      <option key={plan.id} value={plan.name}>{plan.name}</option>

                                    ))}

                                  </select>

                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">

                                  <input

                                    type="number"

                                    step="0.01"

                                    min="0"

                                    value={pricingFormData.price}

                                    onChange={(e) => setPricingFormData({...pricingFormData, price: e.target.value})}

                                    placeholder="💵 Preço (R$)"

                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

                                  />

                                  <select

                                    value={pricingFormData.grupo}

                                    onChange={(e) => setPricingFormData({...pricingFormData, grupo: e.target.value})}

                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

                                  >

                                    <option value="">📊 Selecione a Categoria</option>

                                    <option value="consultation">📋 Consulta</option>

                                    <option value="exam">🔬 Exame/SADT</option>

                                    <option value="procedure">🏥 Procedimento</option>

                                    <option value="surgery">🏨 Cirurgia</option>

                                    <option value="other">📝 Outro</option>

                                  </select>

                                  <Button

                                    type="button"

                                    onClick={handleAddPricingRow}

                                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded flex-1"

                                  >

                                    <Save className="w-4 h-4 inline mr-1" />

                                    Salvar

                                  </Button>

                                  <Button

                                    type="button"

                                    onClick={() => {

                                      setShowPricingForm(false);

                                      setPricingFormData({service_id: '', price: '', plano: '', grupo: '', id: null});

                                    }}

                                    className="bg-gray-300 hover:bg-gray-400 text-gray-900 text-sm px-4 py-2 rounded"

                                  >

                                    ✕

                                  </Button>

                                  </div>

                                </div>

                            )}

                              {editingId && pricingTableData && Array.isArray(pricingTableData) && pricingTableData.length > 0 && (

                                <div className="space-y-4">

                                  <div className="flex flex-wrap gap-4 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">

                                    <div className="text-center">

                                      <p className="text-xs text-gray-600">Serviços</p>

                                      <p className="text-lg font-bold text-gray-900">{pricingTableData.length}</p>

                                    </div>

                                    <div className="text-center border-l border-r border-gray-300 px-4">

                                      <p className="text-xs text-gray-600">Configurados</p>

                                      <p className="text-lg font-bold text-green-600">

                                        {pricingTableData.filter(p => {

                                          const config = typeof p.scheduling_config === 'string' ? JSON.parse(p.scheduling_config) : p.scheduling_config;

                                          const periods = config ? Object.values(config).reduce((s, d) => s + (d?.periods?.length || 0), 0) : 0;

                                          return periods > 0;

                                        }).length}

                                      </p>

                                    </div>

                                    <div className="text-center">

                                      <p className="text-xs text-gray-600">Faturamento</p>

                                      <p className="text-lg font-bold text-blue-600">

                                        {new Intl.NumberFormat('pt-BR', {

                                          style: 'currency',

                                          currency: 'BRL'

                                        }).format(pricingTableData.reduce((sum, p) => sum + (p.price || 0), 0))}

                                      </p>

                                    </div>

                                  </div>



                                  <div className="overflow-x-auto">

                                    <table className="w-full text-sm border-collapse">

                                      <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">

                                        <tr>

                                          <th className="text-center py-2 px-3 font-semibold text-gray-800 text-xs">Código</th>

                                          <th className="text-left py-2 px-3 font-semibold text-gray-800">Serviço</th>

                                          <th className="text-left py-2 px-3 font-semibold text-gray-800">Plano</th>

                                          <th className="text-left py-2 px-3 font-semibold text-gray-800">Categoria</th>

                                          <th className="text-right py-2 px-3 font-semibold text-gray-800">Valor</th>

                                          <th className="text-center py-2 px-3 font-semibold text-gray-800">Status</th>

                                          <th className="text-center py-2 px-3 font-semibold text-gray-800">Ações</th>

                                        </tr>

                                      </thead>

                                      <tbody>

                                        {pricingTableData.map((priceEntry) => {

                                          const schedulingConfig = priceEntry.scheduling_config 

                                            ? typeof priceEntry.scheduling_config === 'string' 

                                              ? JSON.parse(priceEntry.scheduling_config)

                                              : priceEntry.scheduling_config

                                            : null;

                                          

                                          const serviceCode = priceEntry.services?.code || priceEntry.services?.tuss_code || priceEntry.service_id?.substring(0, 8) || '-';

                                          const totalPeriods = schedulingConfig 

                                            ? Object.values(schedulingConfig).reduce((sum, dayData) => {

                                                return sum + (dayData?.periods?.length || 0);

                                              }, 0)

                                            : 0;



                                          // Verificar se preço está ATIVO (active = true)

                                          const isConfigured = priceEntry.active === true;



                                          return (

                                            <tr key={priceEntry.id} className="border-b hover:bg-gray-50 transition">

                                              <td className="py-2 px-3 text-center text-xs text-gray-700 font-mono bg-gray-50">

                                                {serviceCode}

                                              </td>

                                              <td className="py-2 px-3 text-gray-900 text-sm font-medium">

                                                {priceEntry.services?.name || 'N/A'}

                                              </td>

                                              <td className="py-2 px-3 text-gray-900 text-sm">

                                                {priceEntry.plano || '-'}

                                              </td>

                                              <td className="py-2 px-3 text-gray-900 text-sm">

                                                {getCategoryLabel(priceEntry.services?.service_category || priceEntry.grupo)}

                                              </td>

                                              <td className="py-2 px-3 text-right text-gray-900 font-semibold">

                                                {new Intl.NumberFormat('pt-BR', {

                                                  style: 'currency',

                                                  currency: 'BRL'

                                                }).format(priceEntry.price || 0)}

                                              </td>

                                              <td className="py-2 px-3 text-center">

                                                <div className="flex items-center justify-center gap-2">

                                                  <input

                                                    type="checkbox"

                                                    checked={isConfigured}

                                                    onChange={() => togglePricingStatus(priceEntry)}

                                                    className="w-4 h-4 cursor-pointer"

                                                    title={isConfigured ? 'Clique para desativar' : 'Clique para ver detalhes'}

                                                  />

                                                  <span className={`text-xs font-semibold ${isConfigured ? 'text-green-600' : 'text-yellow-600'}`}>

                                                    {isConfigured ? '✅' : '⚠️'}

                                                  </span>

                                                </div>

                                              </td>

                                              <td className="py-2 px-3 text-center space-x-1 flex gap-1 justify-center">

                                                <button

                                                  type="button"

                                                  onClick={() => handleEditPricingRow(priceEntry)}

                                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold"

                                                >

                                                  ✏️

                                                </button>

                                                <button

                                                  type="button"

                                                  onClick={() => handleRemovePricingRow(priceEntry)}

                                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold"

                                                >

                                                  🗑️

                                                </button>

                                              </td>

                                            </tr>

                                          );

                                        })}

                                      </tbody>

                                    </table>

                                  </div>

                                </div>

                              )}

                              {!editingId && pricingTableData && pricingTableData.length > 0 && (

                                <>

                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">

                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">

                                    <p className="text-xs text-gray-600 font-semibold">Total de Serviços</p>

                                    <p className="text-2xl font-bold text-blue-600">{pricingTableData.length}</p>

                                  </div>

                                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">

                                    <p className="text-xs text-gray-600 font-semibold">Preço Médio</p>

                                    <p className="text-2xl font-bold text-green-600">

                                      {new Intl.NumberFormat('pt-BR', {

                                        style: 'currency',

                                        currency: 'BRL'

                                      }).format((pricingTableData.reduce((sum, p) => sum + (p.price || 0), 0)) / pricingTableData.length)}

                                    </p>

                                  </div>

                                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">

                                    <p className="text-xs text-gray-600 font-semibold">Total de Profissionais</p>

                                    <p className="text-2xl font-bold text-purple-600">

                                      {pricingTableData.reduce((sum, p) => sum + (p.professional_count || 0), 0)}

                                    </p>

                                  </div>

                                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">

                                    <p className="text-xs text-gray-600 font-semibold">Incompletos</p>

                                    <p className="text-2xl font-bold text-yellow-600">

                                      {pricingTableData.filter(p => {

                                        const config = typeof p.scheduling_config === 'string' ? JSON.parse(p.scheduling_config) : p.scheduling_config;

                                        const periods = config ? Object.values(config).reduce((s, d) => s + (d?.periods?.length || 0), 0) : 0;

                                        return periods === 0;

                                      }).length}

                                    </p>

                                  </div>

                                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">

                                    <p className="text-xs text-gray-600 font-semibold">Faturamento Total</p>

                                    <p className="text-lg font-bold text-red-600">

                                      {new Intl.NumberFormat('pt-BR', {

                                        style: 'currency',

                                        currency: 'BRL'

                                      }).format(pricingTableData.reduce((sum, p) => sum + (p.price || 0), 0))}

                                    </p>

                                  </div>

                                </div>



                                <div className="overflow-x-auto">

                                  <table className="w-full text-sm border-collapse">

                                    <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">

                                      <tr>

                                        <th className="text-center py-2 px-3 font-semibold text-gray-800 text-xs">Código</th>

                                        <th className="text-left py-2 px-3 font-semibold text-gray-800">Serviço</th>

                                        <th className="text-left py-2 px-3 font-semibold text-gray-800">Plano</th>

                                        <th className="text-left py-2 px-3 font-semibold text-gray-800">Categoria</th>

                                        <th className="text-right py-2 px-3 font-semibold text-gray-800">Valor</th>

                                        <th className="text-center py-2 px-3 font-semibold text-gray-800">Status</th>

                                        <th className="text-center py-2 px-3 font-semibold text-gray-800">Ações</th>

                                      </tr>

                                    </thead>

                                    <tbody>

                                      {pricingTableData.map((priceEntry) => {

                                        const schedulingConfig = priceEntry.scheduling_config 

                                          ? typeof priceEntry.scheduling_config === 'string' 

                                            ? JSON.parse(priceEntry.scheduling_config)

                                            : priceEntry.scheduling_config

                                          : null;

                                        

                                        const totalPeriods = schedulingConfig 

                                          ? Object.values(schedulingConfig).reduce((sum, dayData) => {

                                              return sum + (dayData?.periods?.length || 0);

                                            }, 0)

                                          : 0;



                                        const serviceCode = priceEntry.services?.code || priceEntry.services?.tuss_code || priceEntry.service_id?.substring(0, 8) || '-';

                                        const isConfigured = priceEntry.active === true;



                                        return (

                                          <tr key={priceEntry.id} className="border-b hover:bg-blue-50 transition">

                                            <td className="py-3 px-4 text-center text-xs text-gray-700 font-semibold bg-gray-50">

                                              {serviceCode}

                                            </td>

                                            <td className="py-3 px-4 text-gray-900 font-medium">

                                              {priceEntry.services?.name || 'Serviço desconhecido'}

                                            </td>

                                            <td className="py-3 px-4 text-gray-900">

                                              {priceEntry.plano || '-'}

                                            </td>

                                            <td className="py-3 px-4 text-gray-900">

                                              {getCategoryLabel(priceEntry.services?.service_category || priceEntry.grupo)}

                                            </td>

                                            <td className="py-3 px-4 text-right text-gray-900 font-bold text-base">

                                              {new Intl.NumberFormat('pt-BR', {

                                                style: 'currency',

                                                currency: 'BRL'

                                              }).format(priceEntry.price || 0)}

                                            </td>

                                            <td className="py-3 px-4 text-center">

                                              <div className="flex items-center justify-center gap-2">

                                                <span className={`text-xs font-semibold ${isConfigured ? 'text-green-600' : 'text-yellow-600'}`}>

                                                  {isConfigured ? '✅ Ativo' : '⚠️ Incompleto'}

                                                </span>

                                              </div>

                                            </td>

                                            <td className="py-3 px-4 text-center space-x-1">

                                              <button

                                                type="button"

                                                onClick={() => handleEditPricingRow(priceEntry)}

                                                className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold"

                                              >

                                                ✏️ Editar

                                              </button>

                                              <button

                                                type="button"

                                                onClick={() => handleRemovePricingRow(priceEntry)}

                                                className="inline-block bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold"

                                              >

                                                🗑️ Remover

                                              </button>

                                            </td>

                                          </tr>

                                        );

                                      })}

                                    </tbody>

                                  </table>

                                </div>

                                </>

                              )}

                              {!editingId && (!pricingTableData || pricingTableData.length === 0) && (

                                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">

                                  <p className="text-sm text-gray-700">

                                    <strong>Nenhum preço configurado</strong> para este convênio ainda.

                                  </p>

                                  <p className="text-sm text-gray-600 mt-2">

                                    A tabela mostra apenas os <strong>preços base</strong> efetivamente negociados com o convênio. 

                                    Preços específicos de profissionais (negociações pontuais) aparecem como <strong>"✏️ Negociação"</strong> na edição do profissional.

                                  </p>

                                </div>

                              )}

                            </>

                            {/* Instruções de Upload - Ocultas */}

                            </div>


                            {false && (

                              <>

                                <div>

                                  <p className="text-xs text-gray-600 mb-2">

                                    Crie um arquivo CSV ou TXT com três colunas: <strong>Código CBHPM</strong>, <strong>Nome do Serviço</strong> e <strong>Preço</strong>

                                  </p>

                                  <div className="bg-white p-2 rounded text-xs font-mono text-gray-700 overflow-x-auto mb-2">

                                    <div>Código CBHPM,Nome do Serviço,Preço</div>

                                    <div>10101012,Consulta em horário normal ou preestabelecido,150.00</div>

                                    <div>10101020,Consulta em domicílio,80.50</div>

                                    <div>10101039,Consulta em pronto socorro,250.00</div>

                                  </div>

                                </div>

                                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">

                                <p className="text-xs text-gray-600 font-semibold mb-3">📊 Estrutura da Tabela de Preços (Visão Financeira):</p>

                              <div className="space-y-2 text-xs text-gray-600">

                                <div className="flex gap-2">

                                  <span className="font-semibold min-w-max">� Código CBHPM:</span>

                                  <span>Identificador único do serviço conforme tabela CBHPM da ANS</span>

                                </div>

                                <div className="flex gap-2">

                                  <span className="font-semibold min-w-max">�💰 Preço Base:</span>

                                  <span>Valor negociado com o convênio para cada serviço</span>

                                </div>

                                <div className="flex gap-2">

                                  <span className="font-semibold min-w-max">👥 Profissionais:</span>

                                  <span>Quantidade de profissionais vinculados a este convênio</span>

                                </div>

                                <div className="flex gap-2">

                                  <span className="font-semibold min-w-max">✅ Status:</span>

                                  <span>Ativo (preço configurado) ou Incompleto (sem horários definidos)</span>

                                </div>

                                <div className="flex gap-2">

                                  <span className="font-semibold min-w-max">📅 Horários:</span>

                                  <span>Número de períodos de agendamento configurados</span>

                                </div>

                                <div className="flex gap-2">

                                  <span className="font-semibold min-w-max">🔄 Útil. Atualização:</span>

                                  <span>Data da última modificação (importante para auditoria)</span>

                                </div>

                                <div className="flex gap-2">

                                  <span className="font-semibold min-w-max">✏️ Negociação:</span>

                                  <span>Preço específico de um profissional (override) que difere do base</span>

                                </div>

                              </div>

                              <div className="mt-3 pt-3 border-t border-blue-200">

                                <p className="text-xs text-gray-600 font-semibold mb-2">Para adicionar preços a este convênio:</p>

                                <ol className="text-xs text-gray-600 space-y-1">

                                  <li>1. Base do Sistema → <strong>Profissionais</strong></li>

                                  <li>2. <strong>Editar</strong> um profissional</li>

                                  <li>3. Aba <strong>"Convênios"</strong> → Adicionar este convênio</li>

                                  <li>4. <strong>Expandir serviço</strong> e informar o preço base</li>

                                  <li>5. Clicar em <strong>"Salvar"</strong></li>

                                </ol>

                              </div>

                              </div>

                            </>

                            )}

                          {/* End of pricing section */}

                        </div>

                      </div>

                    )}



                  {/* ABA: ENDEREÇO */}

                  {activeTab === "address" && (

                    <div className="space-y-6">

                  {/* ===== SEÇÃO: ENDEREÇO ===== */}

                  <div className="border-b pb-6">

                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">

                        📍

                      </span>

                      Endereço

                    </h3>



                    {/* Grid: Rua + Número */}

                    <div className="grid grid-cols-3 gap-4 mb-4">

                      <div className="col-span-2">

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          Rua

                        </label>

                        <input

                          type="text"

                          value={formData.address_street}

                          onChange={(e) =>

                            setFormData({ ...formData, address_street: e.target.value })

                          }

                          placeholder="Ex: Avenida Paulista"

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                          disabled={submitting}

                        />

                      </div>

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          Número

                        </label>

                        <input

                          type="text"

                          value={formData.address_number}

                          onChange={(e) =>

                            setFormData({ ...formData, address_number: e.target.value })

                          }

                          placeholder="Ex: 1000"

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                          disabled={submitting}

                        />

                      </div>

                    </div>



                    {/* Campo: Bairro + CEP */}

                    <div className="grid grid-cols-2 gap-4 mb-4">

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          Bairro

                        </label>

                        <input

                          type="text"

                          value={formData.address_neighborhood}

                          onChange={(e) =>

                            setFormData({ ...formData, address_neighborhood: e.target.value })

                          }

                          placeholder="Ex: Bela Vista"

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                          disabled={submitting}

                        />

                      </div>



                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          CEP

                        </label>

                        <input

                          type="text"

                          value={formData.address_zip_code}

                          onChange={(e) =>

                            setFormData({ ...formData, address_zip_code: e.target.value })

                          }

                          placeholder="Ex: 01311-100"

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                          disabled={submitting}

                        />

                      </div>

                    </div>



                    {/* Grid: Cidade + Estado + País */}

                    <div className="grid grid-cols-3 gap-4 mb-4">

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          Cidade

                        </label>

                        <input

                          type="text"

                          value={formData.address_city}

                          onChange={(e) =>

                            setFormData({ ...formData, address_city: e.target.value })

                          }

                          placeholder="Ex: São Paulo"

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                          disabled={submitting}

                        />

                      </div>



                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          Estado

                        </label>

                        <input

                          type="text"

                          value={formData.address_state}

                          onChange={(e) =>

                            setFormData({ ...formData, address_state: e.target.value })

                          }

                          placeholder="Ex: SP"

                          maxLength="2"

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                          disabled={submitting}

                        />

                      </div>



                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          País

                        </label>

                        <input

                          type="text"

                          value={formData.country}

                          onChange={(e) =>

                            setFormData({ ...formData, country: e.target.value })

                          }

                          placeholder="Ex: Brasil"

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                          disabled={submitting}

                        />

                      </div>

                    </div>

                  </div>

                    </div>

                  )}



                  {/* ABA: FISCAL */}

                  {activeTab === "fiscal" && (

                    <div className="space-y-6">

                      {/* ===== SEÇÃO: IDENTIFICAÇÃO FISCAL ===== */}

                      <div className="border-b pb-6">

                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">

                            📋

                          </span>

                          Identificação Fiscal

                        </h3>



                        {/* Grid: Inscrição Municipal + Inscrição Estadual */}

                        <div className="grid grid-cols-2 gap-4 mb-4">

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Inscrição Municipal

                            </label>

                            <input

                              type="text"

                              value={formData.municipal_registration}

                              onChange={(e) =>

                                setFormData({ ...formData, municipal_registration: e.target.value })

                              }

                              placeholder="Ex: 123.456.789"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                              disabled={submitting}

                            />

                          </div>



                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Inscrição Estadual

                            </label>

                            <input

                              type="text"

                              value={formData.state_registration}

                              onChange={(e) =>

                                setFormData({ ...formData, state_registration: e.target.value })

                              }

                              placeholder="Ex: 123.456.789.012"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                              disabled={submitting}

                            />

                          </div>

                        </div>

                      </div>

                    </div>

                  )}



                  {/* ABA: FATURAMENTO */}

                  {activeTab === "billing" && (

                    <div className="space-y-6">

                      <div className="border-b pb-6">

                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">📋</span>

                          Dados Obrigatórios para Faturamento

                        </h3>

                      </div>



                      {/* Campo: Registro ANS */}

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          Registro ANS <span className="text-red-500">*</span>

                        </label>

                        <input

                          type="text"

                          value={formData.registration_ans}

                          onChange={(e) =>

                            setFormData({

                              ...formData,

                              registration_ans: e.target.value,

                            })

                          }

                          placeholder="Ex: 352.500"

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"

                          disabled={submitting}

                        />

                        <p className="text-xs text-gray-500 mt-1">Número de registro na ANS (agência de seguros privados). Obrigatório para planos privados.</p>

                      </div>



                      {/* Checkbox: Segue padrão TISS */}

                      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">

                        <input

                          type="checkbox"

                          id="tiss_pattern"

                          checked={formData.tiss_pattern}

                          onChange={(e) =>

                            setFormData({ ...formData, tiss_pattern: e.target.checked })

                          }

                          className="rounded border-gray-300 w-5 h-5"

                          disabled={submitting}

                        />

                        <label htmlFor="tiss_pattern" className="text-sm font-medium text-gray-700">

                          Segue padrão TISS (recomendado)

                        </label>

                      </div>



                      {/* Campo: Versão TISS */}

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          Versão TISS <span className="text-red-500">*</span>

                        </label>

                        <select

                          value={formData.tiss_version}

                          onChange={(e) =>

                            setFormData({

                              ...formData,

                              tiss_version: e.target.value,

                            })

                          }

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"

                          disabled={submitting}

                        >

                          <option value="3.01.00">TISS 3.01.00</option>

                          <option value="3.02.00">TISS 3.02.00</option>

                          <option value="3.03.00">TISS 3.03.00</option>

                          <option value="3.04.00">TISS 3.04.00</option>

                          <option value="3.05.00">TISS 3.05.00 (Recomendado)</option>

                          <option value="3.06.00">TISS 3.06.00</option>

                        </select>

                        <p className="text-xs text-gray-500 mt-1">Versão do padrão TISS utilizado pelo convênio</p>

                      </div>



                      {/* Campo: Formato de Guia */}

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">

                          Formato de Guia

                        </label>

                        <select

                          value={formData.guide_format}

                          onChange={(e) =>

                            setFormData({

                              ...formData,

                              guide_format: e.target.value,

                            })

                          }

                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"

                          disabled={submitting}

                        >

                          <option value="">Selecione...</option>

                          <option value="consultation">Guia de Consulta</option>

                          <option value="sadt">Guia de SADT</option>

                          <option value="hospitalization">Guia de Internação</option>

                        </select>

                        <p className="text-xs text-gray-500 mt-1">Tipo padrão de guia para este convênio</p>

                      </div>

                    </div>

                  )}



                  {/* ABA: TRIBUTOS */}

                  {activeTab === "taxes" && (

                    <div className="space-y-6">

                  {/* ===== SEÇÃO: TRIBUTOS ===== */}

                  <div className="border-b pb-6">

                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">

                        💰

                      </span>

                      Tributos (Para NF-e - Reforma Tributária 2024)

                    </h3>



                    {/* Campo: Regime Tributário */}

                    <div className="mb-4">

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Regime Tributário

                      </label>

                      <select

                        value={formData.tax_regime}

                        onChange={(e) =>

                          setFormData({ ...formData, tax_regime: e.target.value })

                        }

                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        disabled={submitting}

                      >

                        <option value="">Selecione...</option>

                        <option value="Simples">Simples Nacional</option>

                        <option value="Lucro Real">Lucro Real</option>

                        <option value="Lucro Presumido">Lucro Presumido</option>

                      </select>

                    </div>



                    {/* Checkbox: Retém impostos */}

                    <div className="flex items-center gap-2 mb-6 p-3 bg-blue-50 rounded border border-blue-200">

                      <input

                        type="checkbox"

                        id="retains_taxes"

                        checked={formData.retains_taxes}

                        onChange={(e) =>

                          setFormData({

                            ...formData,

                            retains_taxes: e.target.checked,

                          })

                        }

                        className="rounded border-gray-300"

                        disabled={submitting}

                      />

                      <label

                        htmlFor="retains_taxes"

                        className="text-sm font-medium text-gray-700"

                      >

                        ✓ Operadora retém impostos na fonte

                      </label>

                    </div>



                    {/* Tabela de Tributos - Grid compacto 4 colunas */}

                    <div className="overflow-x-auto">

                      <div className="bg-gray-50 rounded border border-gray-200">

                        {/* Cabeçalho */}

                        <div className="grid grid-cols-4 gap-2 p-3 border-b border-gray-200 font-bold text-xs text-gray-700 bg-gray-100">

                          <div>Ativar</div>

                          <div>Tributo</div>

                          <div>Alíquota (%)</div>

                          <div>Notas</div>

                        </div>



                        {/* ICMS */}

                        <div className="grid grid-cols-4 gap-2 p-3 border-b border-gray-100 items-center text-xs">

                          <div className="flex justify-center">

                            <input

                              type="checkbox"

                              checked={formData.icms_applicable}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  icms_applicable: e.target.checked,

                                })

                              }

                              disabled={submitting}

                              className="rounded"

                            />

                          </div>

                          <div className="font-medium">ICMS</div>

                          <input

                            type="number"

                            value={formData.icms_rate}

                            onChange={(e) =>

                              setFormData({

                                ...formData,

                                icms_rate: parseFloat(e.target.value) || 0,

                              })

                            }

                            placeholder="0.00"

                            step="0.01"

                            min="0"

                            max="100"

                            className="w-full px-2 py-1 border rounded text-xs"

                            disabled={submitting || !formData.icms_applicable}

                          />

                          <div className="text-gray-500">Circulação</div>

                        </div>



                        {/* PIS */}

                        <div className="grid grid-cols-4 gap-2 p-3 border-b border-gray-100 items-center text-xs">

                          <div className="flex justify-center">

                            <input

                              type="checkbox"

                              checked={formData.pis_applicable}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  pis_applicable: e.target.checked,

                                })

                              }

                              disabled={submitting}

                              className="rounded"

                            />

                          </div>

                          <div className="font-medium">PIS</div>

                          <input

                            type="number"

                            value={formData.pis_rate}

                            onChange={(e) =>

                              setFormData({

                                ...formData,

                                pis_rate: parseFloat(e.target.value) || 0,

                              })

                            }

                            placeholder="0.00"

                            step="0.01"

                            min="0"

                            max="100"

                            className="w-full px-2 py-1 border rounded text-xs"

                            disabled={submitting || !formData.pis_applicable}

                          />

                          <div className="text-gray-500">Social</div>

                        </div>



                        {/* COFINS */}

                        <div className="grid grid-cols-4 gap-2 p-3 border-b border-gray-100 items-center text-xs">

                          <div className="flex justify-center">

                            <input

                              type="checkbox"

                              checked={formData.cofins_applicable}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  cofins_applicable: e.target.checked,

                                })

                              }

                              disabled={submitting}

                              className="rounded"

                            />

                          </div>

                          <div className="font-medium">COFINS</div>

                          <input

                            type="number"

                            value={formData.cofins_rate}

                            onChange={(e) =>

                              setFormData({

                                ...formData,

                                cofins_rate: parseFloat(e.target.value) || 0,

                              })

                            }

                            placeholder="0.00"

                            step="0.01"

                            min="0"

                            max="100"

                            className="w-full px-2 py-1 border rounded text-xs"

                            disabled={submitting || !formData.cofins_applicable}

                          />

                          <div className="text-gray-500">Financiamento</div>

                        </div>



                        {/* ISS */}

                        <div className="grid grid-cols-4 gap-2 p-3 border-b border-gray-100 items-center text-xs">

                          <div className="flex justify-center">

                            <input

                              type="checkbox"

                              checked={formData.iss_applicable}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  iss_applicable: e.target.checked,

                                })

                              }

                              disabled={submitting}

                              className="rounded"

                            />

                          </div>

                          <div className="font-medium">ISS</div>

                          <input

                            type="number"

                            value={formData.iss_rate}

                            onChange={(e) =>

                              setFormData({

                                ...formData,

                                iss_rate: parseFloat(e.target.value) || 0,

                              })

                            }

                            placeholder="0.00"

                            step="0.01"

                            min="0"

                            max="100"

                            className="w-full px-2 py-1 border rounded text-xs"

                            disabled={submitting || !formData.iss_applicable}

                          />

                          <div className="text-gray-500">Serviço</div>

                        </div>



                        {/* ISSRF */}

                        <div className="grid grid-cols-4 gap-2 p-3 border-b border-gray-100 items-center text-xs">

                          <div className="flex justify-center">

                            <input

                              type="checkbox"

                              checked={formData.issrf_applicable}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  issrf_applicable: e.target.checked,

                                })

                              }

                              disabled={submitting}

                              className="rounded"

                            />

                          </div>

                          <div className="font-medium">ISSRF</div>

                          <input

                            type="number"

                            value={formData.issrf_rate}

                            onChange={(e) =>

                              setFormData({

                                ...formData,

                                issrf_rate: parseFloat(e.target.value) || 0,

                              })

                            }

                            placeholder="0.00"

                            step="0.01"

                            min="0"

                            max="100"

                            className="w-full px-2 py-1 border rounded text-xs"

                            disabled={submitting || !formData.issrf_applicable}

                          />

                          <div className="text-gray-500">Serviço Federal</div>

                        </div>



                        {/* INSS */}

                        <div className="grid grid-cols-4 gap-2 p-3 border-b border-gray-100 items-center text-xs">

                          <div className="flex justify-center">

                            <input

                              type="checkbox"

                              checked={formData.inss_applicable}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  inss_applicable: e.target.checked,

                                })

                              }

                              disabled={submitting}

                              className="rounded"

                            />

                          </div>

                          <div className="font-medium">INSS</div>

                          <input

                            type="number"

                            value={formData.inss_rate}

                            onChange={(e) =>

                              setFormData({

                                ...formData,

                                inss_rate: parseFloat(e.target.value) || 0,

                              })

                            }

                            placeholder="0.00"

                            step="0.01"

                            min="0"

                            max="100"

                            className="w-full px-2 py-1 border rounded text-xs"

                            disabled={submitting || !formData.inss_applicable}

                          />

                          <div className="text-gray-500">Previdência</div>

                        </div>



                        {/* IBS (Reforma Tributária) */}

                        <div className="grid grid-cols-4 gap-2 p-3 border-b border-gray-100 items-center text-xs bg-green-50">

                          <div className="flex justify-center">

                            <input

                              type="checkbox"

                              checked={formData.ibs_applicable}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  ibs_applicable: e.target.checked,

                                })

                              }

                              disabled={submitting}

                              className="rounded"

                            />

                          </div>

                          <div className="font-medium text-green-700">IBS</div>

                          <input

                            type="number"

                            value={formData.ibs_rate}

                            onChange={(e) =>

                              setFormData({

                                ...formData,

                                ibs_rate: parseFloat(e.target.value) || 0,

                              })

                            }

                            placeholder="0.00"

                            step="0.01"

                            min="0"

                            max="100"

                            className="w-full px-2 py-1 border rounded text-xs bg-green-50"

                            disabled={submitting || !formData.ibs_applicable}

                          />

                          <div className="text-green-600 text-xs">Reforma 2024+</div>

                        </div>



                        {/* CBS (Reforma Tributária) */}

                        <div className="grid grid-cols-4 gap-2 p-3 items-center text-xs bg-green-50">

                          <div className="flex justify-center">

                            <input

                              type="checkbox"

                              checked={formData.cbs_applicable}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  cbs_applicable: e.target.checked,

                                })

                              }

                              disabled={submitting}

                              className="rounded"

                            />

                          </div>

                          <div className="font-medium text-green-700">CBS</div>

                          <input

                            type="number"

                            value={formData.cbs_rate}

                            onChange={(e) =>

                              setFormData({

                                ...formData,

                                cbs_rate: parseFloat(e.target.value) || 0,

                              })

                            }

                            placeholder="0.00"

                            step="0.01"

                            min="0"

                            max="100"

                            className="w-full px-2 py-1 border rounded text-xs bg-green-50"

                            disabled={submitting || !formData.cbs_applicable}

                          />

                          <div className="text-green-600 text-xs">Reforma 2024+</div>

                        </div>

                      </div>

                    </div>

                  </div>

                    </div>

                  )}



                  {/* ABA: FINANCEIRO */}

                  {activeTab === "financial" && (

                    <div className="space-y-6">

                      {/* SEÇÃO 1: CONDIÇÕES COMERCIAIS */}

                      <div className="border-b pb-6">

                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">📊</span>

                          Condições Comerciais

                        </h3>

                        <div className="grid grid-cols-2 gap-4">

                          {/* Desconto */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Desconto (%)

                            </label>

                            <input

                              type="number"

                              value={formData.discount_percentage}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  discount_percentage: parseFloat(e.target.value) || 0,

                                })

                              }

                              min="0"

                              max="100"

                              step="0.01"

                              placeholder="0.00"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Desconto padrão do convênio</p>

                          </div>



                          {/* Margem Mínima */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Margem Mínima (%)

                            </label>

                            <input

                              type="number"

                              value={formData.minimum_margin_percentage}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  minimum_margin_percentage: parseFloat(e.target.value) || 0,

                                })

                              }

                              min="0"

                              max="100"

                              step="0.01"

                              placeholder="0.00"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Margem mínima aceitável</p>

                          </div>



                          {/* Taxa de Administração */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Taxa de Administração (%)

                            </label>

                            <input

                              type="number"

                              value={formData.administration_fee_percentage}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  administration_fee_percentage: parseFloat(e.target.value) || 0,

                                })

                              }

                              min="0"

                              max="100"

                              step="0.01"

                              placeholder="0.00"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Taxa cobrada pelo convênio</p>

                          </div>



                          {/* Desconto por Pronta Pagamento */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Desconto Pronta Pagamento (%)

                            </label>

                            <input

                              type="number"

                              value={formData.early_payment_discount_percentage}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  early_payment_discount_percentage: parseFloat(e.target.value) || 0,

                                })

                              }

                              min="0"

                              max="100"

                              step="0.01"

                              placeholder="0.00"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Se pagar antecipado</p>

                          </div>



                          {/* Desconto por Volume */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Desconto por Volume (%)

                            </label>

                            <input

                              type="number"

                              value={formData.volume_discount_percentage}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  volume_discount_percentage: parseFloat(e.target.value) || 0,

                                })

                              }

                              min="0"

                              max="100"

                              step="0.01"

                              placeholder="0.00"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Acordo de volume</p>

                          </div>

                        </div>

                      </div>



                      {/* SEÇÃO 2: PRAZOS E PAGAMENTO */}

                      <div className="border-b pb-6">

                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">⏳</span>

                          Prazos e Formas de Pagamento

                        </h3>

                        <div className="grid grid-cols-2 gap-4">

                          {/* Dias para Vencimento */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              DPP - Dias para Vencimento <span className="text-red-500">*</span>

                            </label>

                            <input

                              type="number"

                              value={formData.payment_due_days}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  payment_due_days: parseInt(e.target.value) || 0,

                                })

                              }

                              min="0"

                              placeholder="30"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"

                              disabled={submitting}

                              required

                            />

                            <p className="text-xs text-gray-500 mt-1">Dias até vencimento (ex: 30, 45, 60)</p>

                          </div>



                          {/* Ciclo de Faturamento */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Ciclo de Faturamento (dias do mês)

                            </label>

                            <div className="grid grid-cols-2 gap-2">

                              <input

                                type="number"

                                value={formData.billing_cycle_start}

                                onChange={(e) =>

                                  setFormData({

                                    ...formData,

                                    billing_cycle_start: parseInt(e.target.value) || 1,

                                  })

                                }

                                min="1"

                                max="31"

                                placeholder="Início"

                                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"

                                disabled={submitting}

                              />

                              <input

                                type="number"

                                value={formData.billing_cycle_end}

                                onChange={(e) =>

                                  setFormData({

                                    ...formData,

                                    billing_cycle_end: parseInt(e.target.value) || 30,

                                  })

                                }

                                min="1"

                                max="31"

                                placeholder="Fim"

                                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"

                                disabled={submitting}

                              />

                            </div>

                            <p className="text-xs text-gray-500 mt-1">De ___ até ___ de cada mês</p>

                          </div>



                          {/* Formas de Pagamento */}

                          <div className="col-span-2">

                            <label className="block text-sm font-medium text-gray-700 mb-2">

                              Formas de Pagamento Aceitas

                            </label>

                            <div className="grid grid-cols-2 gap-3">

                              {[

                                { id: "debit", label: "Débito Automático" },

                                { id: "boleto", label: "Boleto" },

                                { id: "ted", label: "TED" },

                                { id: "pix", label: "PIX" },

                              ].map((method) => (

                                <label key={method.id} className="flex items-center gap-2">

                                  <input

                                    type="checkbox"

                                    checked={formData.accepted_payment_methods?.includes(method.id) || false}

                                    onChange={(e) =>

                                      setFormData({

                                        ...formData,

                                        accepted_payment_methods: e.target.checked

                                          ? [...(formData.accepted_payment_methods || []), method.id]

                                          : (formData.accepted_payment_methods || []).filter(

                                              (m) => m !== method.id

                                            ),

                                      })

                                    }

                                    disabled={submitting}

                                    className="rounded"

                                  />

                                  <span className="text-sm text-gray-700">{method.label}</span>

                                </label>

                              ))}

                            </div>

                          </div>

                        </div>

                      </div>



                      {/* SEÇÃO 3: REAJUSTES */}

                      <div className="border-b pb-6">

                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">📈</span>

                          Reajustes

                        </h3>

                        <div className="grid grid-cols-2 gap-4">

                          {/* Índice de Reajuste */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Índice de Reajuste

                            </label>

                            <select

                              value={formData.reajustment_index}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  reajustment_index: e.target.value,

                                })

                              }

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"

                              disabled={submitting}

                            >

                              <option value="">Selecione...</option>

                              <option value="inpc">INPC</option>

                              <option value="ipca">IPCA</option>

                              <option value="igp-m">IGP-M</option>

                              <option value="fixed_percentage">Percentual Fixo</option>

                              <option value="customized">Customizado</option>

                            </select>

                            <p className="text-xs text-gray-500 mt-1">Índice para reajuste anual</p>

                          </div>



                          {/* Data Reajuste Anual */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Mês de Reajuste Anual

                            </label>

                            <input

                              type="month"

                              value={formData.annual_reajustment_date}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  annual_reajustment_date: e.target.value,

                                })

                              }

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Quando ocorre a atualização</p>

                          </div>



                          {/* Próxima Data de Reajuste */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Próxima Data de Reajuste

                            </label>

                            <input

                              type="date"

                              value={formData.next_reajustment_date}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  next_reajustment_date: e.target.value,

                                })

                              }

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Para controle/avaliação</p>

                          </div>

                        </div>

                      </div>



                      {/* SEÇÃO 4: VIGÊNCIA DO CONTRATO */}

                      <div className="border-b pb-6">

                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                          <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">📅</span>

                          Vigência do Contrato

                        </h3>

                        <div className="grid grid-cols-2 gap-4">

                          {/* Data Início */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Data de Início <span className="text-red-500">*</span>

                            </label>

                            <input

                              type="date"

                              value={formData.contract_start_date}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  contract_start_date: e.target.value,

                                })

                              }

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"

                              disabled={submitting}

                              required

                            />

                          </div>



                          {/* Data Vencimento */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Data de Vencimento

                            </label>

                            <input

                              type="date"

                              value={formData.contract_end_date}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  contract_end_date: e.target.value,

                                })

                              }

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"

                              disabled={submitting}

                            />

                          </div>



                          {/* Renovação Automática */}

                          <div className="col-span-1">

                            <label className="flex items-center gap-2 cursor-pointer">

                              <input

                                type="checkbox"

                                checked={formData.auto_renewal}

                                onChange={(e) =>

                                  setFormData({

                                    ...formData,

                                    auto_renewal: e.target.checked,

                                  })

                                }

                                disabled={submitting}

                                className="rounded"

                              />

                              <span className="text-sm font-medium text-gray-700">

                                Renovação Automática

                              </span>

                            </label>

                          </div>



                          {/* Dias Aviso Prévio */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Dias de Aviso Prévio

                            </label>

                            <input

                              type="number"

                              value={formData.prior_notice_days}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  prior_notice_days: parseInt(e.target.value) || 0,

                                })

                              }

                              min="0"

                              placeholder="30"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Para não renovação</p>

                          </div>

                        </div>

                      </div>



                      {/* SEÇÃO 5: POLÍTICA DE SUSPENSÃO E MULTAS */}

                      <div className="border-b pb-6">

                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">⚠️</span>

                          Suspensão e Multas

                        </h3>

                        <div className="grid grid-cols-2 gap-4">

                          {/* Dias para Suspensão */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Dias para Suspensão (após atraso)

                            </label>

                            <input

                              type="number"

                              value={formData.days_to_suspension}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  days_to_suspension: parseInt(e.target.value) || 0,

                                })

                              }

                              min="0"

                              placeholder="30"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Quando parar de atender</p>

                          </div>



                          {/* Multa por Atraso */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Multa por Atraso (%)

                            </label>

                            <input

                              type="number"

                              value={formData.late_payment_fine_percentage}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  late_payment_fine_percentage: parseFloat(e.target.value) || 0,

                                })

                              }

                              min="0"

                              max="100"

                              step="0.01"

                              placeholder="0.00"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Penalidade por atraso</p>

                          </div>



                          {/* Juros */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Taxa de Juros Diária (%)

                            </label>

                            <input

                              type="number"

                              value={formData.daily_interest_rate_percentage}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  daily_interest_rate_percentage: parseFloat(e.target.value) || 0,

                                })

                              }

                              min="0"

                              max="100"

                              step="0.0001"

                              placeholder="0.00"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Taxa diária de juros</p>

                          </div>

                        </div>

                      </div>



                      {/* SEÇÃO 6: LIMITES E TETOS */}

                      <div className="border-b pb-6">

                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">📏</span>

                          Limites e Tetos

                        </h3>

                        <div className="grid grid-cols-2 gap-4">

                          {/* Teto Mensal */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Teto de Faturamento Mensal (R$)

                            </label>

                            <input

                              type="number"

                              value={formData.monthly_billing_ceiling || ""}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  monthly_billing_ceiling: e.target.value ? parseFloat(e.target.value) : null,

                                })

                              }

                              min="0"

                              step="0.01"

                              placeholder="Ilimitado"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Limite máximo por mês</p>

                          </div>



                          {/* Limite de Consultas */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Limite de Consultas/Ano

                            </label>

                            <input

                              type="number"

                              value={formData.consultation_limit || ""}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  consultation_limit: e.target.value ? parseInt(e.target.value) : null,

                                })

                              }

                              min="0"

                              placeholder="Ilimitado"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Se houver limite</p>

                          </div>



                          {/* Co-participação */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Co-participação/Franquia (R$)

                            </label>

                            <input

                              type="number"

                              value={formData.copayment_value || ""}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  copayment_value: e.target.value ? parseFloat(e.target.value) : null,

                                })

                              }

                              min="0"

                              step="0.01"

                              placeholder="Sem co-participação"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"

                              disabled={submitting}

                            />

                            <p className="text-xs text-gray-500 mt-1">Valor mínimo que o paciente paga</p>

                          </div>

                        </div>

                      </div>



                      {/* SEÇÃO 7: CONTATOS FINANCEIROS E DADOS BANCÁRIOS */}

                      <div>

                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">

                          <span className="bg-cyan-100 text-cyan-700 px-2 py-1 rounded text-xs">👥</span>

                          Contatos Financeiros e Dados Bancários

                        </h3>

                        <div className="grid grid-cols-2 gap-4">

                          {/* ResponsávelFinanceiro */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Responsável Financeiro

                            </label>

                            <input

                              type="text"

                              value={formData.financial_contact_name}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  financial_contact_name: e.target.value,

                                })

                              }

                              placeholder="Nome completo"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"

                              disabled={submitting}

                            />

                          </div>



                          {/* Email Financeiro */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Email Financeiro

                            </label>

                            <input

                              type="email"

                              value={formData.financial_contact_email}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  financial_contact_email: e.target.value,

                                })

                              }

                              placeholder="email@convenvio.com"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"

                              disabled={submitting}

                            />

                          </div>



                          {/* Telefone Financeiro */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Telefone Financeiro

                            </label>

                            <input

                              type="tel"

                              value={formData.financial_contact_phone}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  financial_contact_phone: e.target.value,

                                })

                              }

                              placeholder="(11) 98765-4321"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"

                              disabled={submitting}

                            />

                          </div>



                          {/* Banco */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Banco para Depósitos

                            </label>

                            <input

                              type="text"

                              value={formData.bank_name}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  bank_name: e.target.value,

                                })

                              }

                              placeholder="Ex: Itaú, Bradesco"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"

                              disabled={submitting}

                            />

                          </div>



                          {/* Agência */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Agência

                            </label>

                            <input

                              type="text"

                              value={formData.bank_branch}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  bank_branch: e.target.value,

                                })

                              }

                              placeholder="0001"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"

                              disabled={submitting}

                            />

                          </div>



                          {/* Conta */}

                          <div>

                            <label className="block text-sm font-medium text-gray-700 mb-1">

                              Número da Conta

                            </label>

                            <input

                              type="text"

                              value={formData.bank_account}

                              onChange={(e) =>

                                setFormData({

                                  ...formData,

                                  bank_account: e.target.value,

                                })

                              }

                              placeholder="123456-7"

                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"

                              disabled={submitting}

                            />

                          </div>

                        </div>

                      </div>

                    </div>

                  )}



                  {/* ABA: PLANOS */}

                  {activeTab === "plans" && (

                    <div className="space-y-6">

                      <div className="border-b pb-6">

                        <div className="flex justify-between items-center mb-4">

                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">

                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">📋</span>

                            Planos de Saúde

                          </h3>

                          {(editingId || showForm) && (

                            <button

                              type="button"

                              onClick={() => setShowNewPlanForm(!showNewPlanForm)}

                              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"

                            >

                              <Plus size={14} />

                              Novo Plano

                            </button>

                          )}

                        </div>



                        {/* Form Criar Novo Plano */}

                        {showNewPlanForm && (

                          <div className="bg-purple-50 p-4 rounded-lg mb-4 border border-purple-200">

                            <h4 className="font-medium text-gray-900 mb-3">Criar Novo Plano</h4>

                            <div className="space-y-3">

                              <input

                                type="text"

                                value={newPlanName}

                                onChange={(e) => setNewPlanName(e.target.value)}

                                placeholder="Ex: Unimed - Plano Nacional"

                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                              />

                              <div className="flex gap-2">

                                <input

                                  type="text"

                                  value={newPlanCode}

                                  onChange={(e) => setNewPlanCode(e.target.value)}

                                  placeholder="Código do plano (para vincular à agenda)"

                                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"

                                />

                                <button

                                  type="button"

                                  onClick={() => setNewPlanCode(generatePlanCode(newPlanName))}

                                  className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm font-medium whitespace-nowrap"

                                >

                                  Gerar

                                </button>

                              </div>

                              <textarea

                                value={newPlanDescription}

                                onChange={(e) => setNewPlanDescription(e.target.value)}

                                placeholder="Descrição do plano (opcional)"

                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-20"

                              />

                              <div className="flex gap-2">

                                <button

                                  type="button"

                                  onClick={handleAddPlan}

                                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"

                                >

                                  Adicionar Plano

                                </button>

                                <button

                                  type="button"

                                  onClick={() => {

                                    setShowNewPlanForm(false);

                                    setNewPlanName("");

                                    setNewPlanDescription("");

                                  }}

                                  className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"

                                >

                                  Cancelar

                                </button>

                              </div>

                            </div>

                          </div>

                        )}



                        {/* Lista de Planos */}

                        {plansLoading ? (

                          <p className="text-gray-500 text-sm text-center py-4">Carregando planos...</p>

                        ) : plansData.length === 0 ? (

                          <div className="text-center py-8">

                            <p className="text-gray-500 mb-2">Nenhum plano cadastrado</p>

                            <p className="text-xs text-gray-400">Clique em "Novo Plano" para adicionar</p>

                          </div>

                        ) : (

                          <div className="space-y-2">

                            {plansData.map((plan) => (

                              <div key={plan.id}>

                                {editingPlanId === plan.id ? (

                                  <div className="bg-blue-50 p-4 rounded-lg mb-3 border border-blue-200">

                                    <h4 className="font-medium text-gray-900 mb-3">Editar Plano</h4>

                                    <div className="space-y-3">

                                      <input

                                        type="text"

                                        value={editingPlanName}

                                        onChange={(e) => setEditingPlanName(e.target.value)}

                                        placeholder="Nome do plano"

                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                      />

                                      <div className="flex gap-2">

                                        <input

                                          type="text"

                                          value={editingPlanCode}

                                          onChange={(e) => setEditingPlanCode(e.target.value)}

                                          placeholder="Código do plano (para vincular à agenda)"

                                          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"

                                        />

                                        <button

                                          type="button"

                                          onClick={() => setEditingPlanCode(generatePlanCode(editingPlanName))}

                                          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium whitespace-nowrap"

                                        >

                                          Gerar

                                        </button>

                                      </div>

                                      <textarea

                                        value={editingPlanDescription}

                                        onChange={(e) => setEditingPlanDescription(e.target.value)}

                                        placeholder="Descrição do plano (opcional)"

                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"

                                      />

                                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">

                                        <input

                                          type="checkbox"

                                          id={`plan-active-${editingPlanId}`}

                                          checked={editingPlanActive}

                                          onChange={(e) => setEditingPlanActive(e.target.checked)}

                                          className="w-4 h-4 rounded"

                                        />

                                        <label htmlFor={`plan-active-${editingPlanId}`} className="text-sm font-medium text-gray-700">

                                          ✅ Plano Ativo

                                        </label>

                                        <span className="text-xs text-gray-500 ml-auto">

                                          {editingPlanActive ? 'Habilitado' : 'Desabilitado'}

                                        </span>

                                      </div>

                                      <div className="flex gap-2">

                                        <button

                                          type="button"

                                          onClick={handleUpdatePlan}

                                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"

                                        >

                                          Salvar Alterações

                                        </button>

                                        <button

                                          type="button"

                                          onClick={handleCancelEdit}

                                          className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"

                                        >

                                          Cancelar

                                        </button>

                                      </div>

                                    </div>

                                  </div>

                                ) : (

                                  <div

                                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"

                                  >

                                    <div className="flex-1">

                                      <p className="font-medium text-gray-900">{plan.name}</p>

                                      {plan.code && (

                                        <p className="text-xs text-blue-600 font-mono mt-1">Código: {plan.code}</p>

                                      )}

                                      {plan.description && (

                                        <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

                                      )}

                                    </div>

                                    <div className="flex items-center gap-2">

                                      {plan.active ? (

                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">

                                          <Check size={14} />

                                          Ativo

                                        </span>

                                      ) : (

                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">

                                          <X size={14} />

                                          Inativo

                                        </span>

                                      )}

                                      <button

                                        type="button"

                                        onClick={() => handleEditPlan(plan)}

                                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"

                                        title="Editar plano"

                                      >

                                        <Edit2 size={16} />

                                      </button>

                                      <button

                                        type="button"

                                        onClick={() => handleDeletePlan(plan.id, plan.name)}

                                        className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"

                                        title="Deletar plano"

                                      >

                                        <Trash2 size={16} />

                                      </button>

                                    </div>

                                  </div>

                                )}

                              </div>

                            ))}

                          </div>

                        )}

                      </div>

                    </div>

                  )}

                  {/* ABA: TISS */}

                  {activeTab === "tiss" && selectedInsurance && (

                    <TISSConfigurationTab 

                      insurance={selectedInsurance} 

                      onUpdate={() => {

                        handleEdit(editingId);

                      }}

                      clinicId={clinicId}

                    />

                  )}



                  </div>

                </form>

              </CardContent>



              {/* Footer com Botões de Ação - Fica Fixo */}

              <div className="border-t bg-white px-6 py-4 flex gap-3" style={{flexShrink: 0}}>

                <Button

                  type="button"

                  onClick={closeForm}

                  variant="outline"

                  className="flex-1"

                  disabled={submitting}

                >

                  Cancelar

                </Button>

                <Button

                  form="convenio-form"

                  type="submit"

                  className="flex-1 bg-blue-600 hover:bg-blue-700"

                  disabled={submitting}

                >

                  {submitting ? "Salvando..." : editingId ? "Atualizar" : "Criar"}

                </Button>

              </div>

            </Card>

          </div>

        </div>

      )}

    </div>

  );

}







