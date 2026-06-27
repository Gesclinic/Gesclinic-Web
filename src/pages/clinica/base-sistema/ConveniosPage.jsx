// src/pages/clinica/base-sistema/ConveniosPage.jsx

// ============================================================

// CRUD Completo de Convênios - Base do Sistema com M:M Serviços

// ============================================================

import React, { useState, useEffect } from 'react';

import { useAuth } from '@/contexts/SupabaseAuthContext';

import { useClinicContext } from '@/contexts/ClinicContext';

import { supabase } from '@/lib/customSupabaseClient';

import BaseSystemHeader from '@/components/layout/BaseSystemHeader';

import { Alert } from '@/components/layout/BaseSystemAlert';

import EmptyState from '@/components/layout/EmptyState';

import * as healthInsurancesApi from '@/lib/healthInsurancesApi';

import * as servicesApi from '@/lib/servicesApi';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import {
  FormSection,
  FormGrid,
  FormInput,
  FormSelect,
  FormCheckbox,
  InfoCard,
} from '@/components/convenios/FormComponents';
import { CONVENIENCE_TABS, FORM_OPTIONS } from '@/components/convenios/tabsConfig';

import { AlertCircle, Plus, Edit2, Trash2, Check, X, Landmark, Upload, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

// Mapear tipos de convênio para portugus

const typeTranslations = {
  health_plan: 'Plano de Saúde',

  private_insurance: 'Seguro Privado',

  government: 'Governamental',

  direct_pay: 'Pagamento Direto',

  other: 'Outro',
};

const translateType = (type) => typeTranslations[type] || type || '-';

export function ConveniosPage() {
  const { user, isAuthenticated } = useAuth();

  const { clinicId, clinic } = useClinicContext();

  // Estado: Listagem

  const [insurances, setInsurances] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  // Estado: Financeiro (integrado s abas)

  const [showFinancialForm, setShowFinancialForm] = useState(false);

  const [financialData, setFinancialData] = useState({
    id: null,

    discount_percentage: 0,

    minimum_margin_percentage: 0,
  });

  // Estado: Detalhe com M:M Serviços

  const [selectedInsurance, setSelectedInsurance] = useState(null);

  const [pricingTableData, setPricingTableData] = useState([]);

  // ?? Estados para cadastro de preços

  const [showPricingForm, setShowPricingForm] = useState(false);

  const [pricingFormData, setPricingFormData] = useState({
    service_id: '',

    price: '',

    plano: '',

    grupo: '',

    id: null,
  });

  const [uploadingFile, setUploadingFile] = useState(false);

  const [services, setServices] = useState([]);

  const [insuranceServices, setInsuranceServices] = useState([]);

  const [tabLoading, setTabLoading] = useState(false);

  const [showPriceForm, setShowPriceForm] = useState(false);

  const [priceFormData, setPriceFormData] = useState({
    service_id: '',

    service_value: '',

    copay_value: '',
  });

  const [formData, setFormData] = useState({
    code: '',

    name: '',

    fantasy_name: '',

    legal_name: '',

    type: '',

    cnpj: '',

    contact_person: '',

    contact_email: '',

    contact_phone: '',

    contact_mobile: '',

    discount_percentage: 0,

    minimum_margin_percentage: 0,

    special_rules: '',

    active: true,

    registration_ans: '',

    tiss_pattern: true,

    guide_format: '',

    tiss_version: '3.05.00',

    // ===== NOVOS CAMPOS: NF-e =====

    nfe_series: '',

    cfm_code: '',

    is_simple_nacional: false,

    icms_indicator: '',

    // ===== NOVOS CAMPOS: RPS =====

    rps_series: '',

    rps_initial: 0,

    rps_type: '',

    iss_retained: false,

    // ===== NOVOS CAMPOS: INTEGRAÇÃO =====

    beneficiary_type: '',

    municipal_service_code: '',

    enable_nfe_generation: false,

    // ===== NOVOS CAMPOS: FINANCEIRO =====

    payment_due_days: 30,

    accepted_payment_methods: [],

    billing_cycle_start: 1,

    billing_cycle_end: 30,

    administration_fee_percentage: 0,

    early_payment_discount_percentage: 0,

    volume_discount_percentage: 0,

    reajustment_index: '',

    annual_reajustment_date: '',

    next_reajustment_date: '',

    monthly_billing_ceiling: null,

    consultation_limit: null,

    copayment_value: null,

    contract_start_date: '',

    contract_end_date: '',

    auto_renewal: false,

    prior_notice_days: 30,

    days_to_suspension: 30,

    late_payment_fine_percentage: 0,

    daily_interest_rate_percentage: 0,

    financial_contact_name: '',

    financial_contact_email: '',

    financial_contact_phone: '',

    bank_name: '',

    bank_branch: '',

    bank_account: '',

    // ===== NOVOS CAMPOS: ENDEREO =====

    address_street: '',

    address_number: '',

    address_neighborhood: '',

    address_city: '',

    address_state: '',

    address_zip_code: '',

    // ===== NOVOS CAMPOS: IDENTIFICAO FISCAL =====

    municipal_registration: '',

    state_registration: '',

    country: 'Brasil',

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

    ir_applicable: false,

    ir_rate: 0,

    csll_applicable: false,

    csll_rate: 0,

    ibs_applicable: false,

    ibs_rate: 0,

    cbs_applicable: false,

    cbs_rate: 0,

    retains_taxes: false,

    tax_regime: '',

    // ===== NOVOS CAMPOS: TISS =====

    tiss_enabled: false,

    submission_method: 'HTTP',

    tiss_endpoint: '',

    tiss_username: '',

    tiss_password: '',

    tiss_response_email: '',

    // ===== NOVOS CAMPOS: PORTAL XML INTEGRATION =====

    portal_username: '',

    portal_password: '',

    portal_webhook_url: '',

    portal_api_key: '',

    certificate_path: '',

    certificate_password: '',

    use_certificate: true,

    submission_format: 'xml',

    response_format: 'xml',

    use_compression: true,

    max_daily_submissions: 100,

    max_file_size_mb: 50,

    max_guides_per_submission: 500,

    requires_manual_confirmation: false,

    support_email: '',

    support_phone: '',

    support_hours: '08:00-18:00',

    enable_rps_generation: false,

    portal_connection_status: 'untested',
  });

  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('general');

  // ?? Estados para gerenciar Planos

  const [plansData, setPlansData] = useState([]);

  const [plansLoading, setPlansLoading] = useState(false);

  const [newPlanName, setNewPlanName] = useState('');

  const [newPlanCode, setNewPlanCode] = useState('');

  const [newPlanDescription, setNewPlanDescription] = useState('');

  const [showNewPlanForm, setShowNewPlanForm] = useState(false);

  const [editingPlanId, setEditingPlanId] = useState(null);

  const [editingPlanName, setEditingPlanName] = useState('');

  const [editingPlanCode, setEditingPlanCode] = useState('');

  const [editingPlanDescription, setEditingPlanDescription] = useState('');

  const [editingPlanActive, setEditingPlanActive] = useState(false);

  // Helper function to format date display (ISO yyyy-mm-dd → dd/mm/yyyy)
  const formatDateDisplay = (value) => {
    if (!value) return '';
    if (value.includes('-') && value.length === 10) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    return value;
  };

  // Helper function to format month display (ISO yyyy-mm → mm/yyyy)
  const formatMonthDisplay = (value) => {
    if (!value) return '';
    if (value.includes('-') && value.length === 7) {
      const [year, month] = value.split('-');
      return `${month}/${year}`;
    }
    return value;
  };

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

    if ((editingId || showForm) && activeTab === 'pricing' && clinicId) {
      console.log('?? Disparando loadPricingTabData...', {
        editingId,
        showForm,
        activeTab,
        clinicId,
      });

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
      setError(err.message || 'Erro ao carregar convênios');

      console.error('Erro:', err);

      setInsurances([]);
    } finally {
      setLoading(false);
    }
  };

  // ===== CARREGAR DADOS PARA ABA DE PREOS =====
  const loadPricingTabData = async () => {
    if (!clinicId) {
      console.log('?? Pulando loadPricingTabData: clinicId no definido');

      return;
    }

    try {
      console.log('?? Iniciando carregamento completo de dados para preços...');

      // 1?? Carregar serviços disponveis (sempre)

      console.log('?? Etapa 1: Carregando serviços...');

      const srvs = await servicesApi.listServices(clinicId);

      const servicesLoaded = Array.isArray(srvs) ? srvs : [];

      console.log(`? Serviços carregados: ${servicesLoaded.length}`);

      setServices(servicesLoaded);

      // 2?? Carregar planos e preços APENAS se editando convênio existente

      if (editingId) {
        console.log('?? Etapa 2: Carregando planos...');

        const { data: payer } = await supabase

          .from('payers')

          .select('id')

          .eq('name', formData.name)

          .eq('clinic_id', clinicId)

          .maybeSingle(); // Use maybeSingle ao invs de single para evitar erros

        if (payer) {
          console.log('? Payer encontrado:', payer.id);

          const { data: plansLoaded } = await supabase

            .from('plans')

            .select('id, name, description, active, payer_id')

            .eq('payer_id', payer.id)

            .order('name');

          console.log(`? Planos carregados: ${plansLoaded?.length || 0}`);

          setPlansData(Array.isArray(plansLoaded) ? plansLoaded : []);
        } else {
          console.warn('?? Payer no encontrado para:', formData.name);

          setPlansData([]);
        }

        // 3?? Carregar dados da tabela de preços

        console.log('?? Etapa 3: Carregando tabela de preços...');

        await loadPricingTable();
      } else {
        // Novo convênio: limpar planos e preços

        console.log('?? Etapa 2: Novo convênio (sem planos/preços ainda)');

        setPlansData([]);

        setPricingTableData([]);
      }
    } catch (err) {
      console.error('? Erro no loadPricingTabData:', err);

      setServices([]);

      setPlansData([]);
    }
  };

  // ===== CARREGAR SERVIOS (para aba de Serviços)
  const loadServicesTab = async () => {
    try {
      setTabLoading(true);

      setError(null);

      const srvs = await servicesApi.listServices(clinicId);

      setServices(Array.isArray(srvs) ? srvs : []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar serviços');

      console.error('Erro:', err);
    } finally {
      setTabLoading(false);
    }
  };

  // ?? Carregar tabela de preços base do convênio

  const loadPricingTable = async () => {
    if (!editingId) {
      return;
    }

    try {
      // Buscar o payer correspondente ao health_insurance selecionado

      const { data: payer, error: payerError } = await supabase

        .from('payers')

        .select('id')

        .eq('name', formData.name)

        .eq('clinic_id', clinicId)

        .maybeSingle();

      if (payerError || !payer) {
        console.warn('?? Payer no encontrado para:', formData.name);

        setPricingTableData([]);

        return;
      }

      // ?? Buscar todos os preços base do convênio (que possuem preço configurado)

      const { data: prices, error: pricesError } = await supabase

        .from('service_prices')

        .select(
          `

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

        `,
        )

        .eq('payer_id', payer.id)

        .eq('clinic_id', clinicId)

        .gt('price', 0); // ?? Apenas preços > 0

      if (pricesError) {
        console.error('Erro ao carregar preços:', pricesError);

        setPricingTableData([]);

        return;
      }

      // ?? Enriquecer dados com informações financeiras

      const enrichedPrices = await Promise.all(
        (prices || []).map(async (price) => {
          // Contar quantos profissionais tm esse preço configurado

          const { data: professionalPrices } = await supabase

            .from('professional_payers')

            .select('id')

            .eq('payer_id', payer.id)

            .eq('clinic_id', clinicId);

          const professionalCount = professionalPrices?.length || 0;

          return {
            ...price,

            professional_count: professionalCount,
          };
        }),
      );

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

  // ?? Carregar serviços disponveis

  const loadAvailableServices = async () => {
    try {
      console.log('?? Carregando serviços da clnica...', { clinicId });

      const srvs = await servicesApi.listServices(clinicId);

      console.log('? Serviços carregados:', srvs?.length || 0);

      setServices(Array.isArray(srvs) ? srvs : []);
    } catch (err) {
      console.error('? Erro ao carregar serviços:', err);

      setServices([]);
    }
  };

  // ?? Adicionar preço manualmente

  const handleAddPricingRow = async () => {
    console.log('?? [handleAddPricingRow] INICIANDO...', { pricingFormData, editingId });

    if (!pricingFormData.service_id || !pricingFormData.price) {
      setError('Selecione um serviço e informe um preço');

      console.warn('?? [handleAddPricingRow] Validao falhou: sem service_id ou price');

      return;
    }

    // ?? Verificar se est criando novo convênio

    if (!editingId) {
      setError('?? Salve o convênio PRIMEIRO antes de adicionar serviços');

      console.warn('?? [handleAddPricingRow] Sem editingId - convênio no foi salvo');

      return;
    }

    try {
      setError(null);

      console.log('?? [handleAddPricingRow] Etapa 1: Buscando ou criando payer...', {
        name: formData.name,
        clinicId,
      });

      let payerData = await supabase

        .from('payers')

        .select('id')

        .eq('name', formData.name)

        .eq('clinic_id', clinicId)

        .maybeSingle();

      // Se payer no existe, criar automaticamente
      if (!payerData.data) {
        console.log('?? [handleAddPricingRow] Payer no encontrado, criando novo...', {
          name: formData.name,
        });

        const { data: newPayer, error: createError } = await supabase

          .from('payers')

          .insert([
            {
              name: formData.name,

              clinic_id: clinicId,
            },
          ])

          .select('id')

          .single();

        if (createError) {
          console.error('? [handleAddPricingRow] Erro ao criar payer:', createError);

          setError('Erro ao criar convênio');

          return;
        }

        payerData = { data: newPayer };

        console.log('? [handleAddPricingRow] Payer criado:', { payerId: newPayer.id });
      } else {
        console.log('? [handleAddPricingRow] Etapa 2: Payer encontrado:', {
          payerId: payerData.data.id,
        });
      }

      // Se est em modo edio (tem ID), atualizar diretamente

      if (pricingFormData.id) {
        console.log('?? [handleAddPricingRow] Etapa 3: Atualizando preço existente...', {
          id: pricingFormData.id,
        });

        const { error: updateError } = await supabase

          .from('service_prices')

          .update({
            price: parseFloat(pricingFormData.price),

            service_id: pricingFormData.service_id,

            plano: pricingFormData.plano || null,

            grupo: pricingFormData.grupo || null,
          })
          .eq('id', pricingFormData.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Verificar se j existe preço para este serviço

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

              grupo: pricingFormData.grupo || null,
            })

            .eq('id', existing.id);

          if (updateError) {
            throw updateError;
          }
        } else {
          // Criar novo

          console.log('? [handleAddPricingRow] Etapa 4: Inserindo novo preço...', {
            service_id: pricingFormData.service_id,

            payer_id: payerData.data.id,

            price: pricingFormData.price,
          });

          const { error: insertError } = await supabase

            .from('service_prices')

            .insert([
              {
                service_id: pricingFormData.service_id,

                payer_id: payerData.data.id,

                clinic_id: clinicId,

                price: parseFloat(pricingFormData.price),

                plano: pricingFormData.plano || null,

                grupo: pricingFormData.grupo || null,
              },
            ]);

          if (insertError) {
            console.error('? [handleAddPricingRow] Erro no INSERT:', insertError);

            throw insertError;
          }

          console.log('? [handleAddPricingRow] Etapa 5: Preço inserido com sucesso!');
        }
      }

      setPricingFormData({ service_id: '', price: '', plano: '', grupo: '', id: null });

      setShowPricingForm(false);

      console.log('?? [handleAddPricingRow] Recarregando tabela de preços...');

      await loadPricingTable();

      console.log('? [handleAddPricingRow] SUCESSO! Serviço salvo e tabela atualizada.');
    } catch (err) {
      setError(err.message || 'Erro ao adicionar preço');

      console.error('? [handleAddPricingRow] Erro capturado:', err);
    }
  };

  // ?? Editar preço da tabela

  const handleEditPricingRow = async (priceEntry) => {
    setPricingFormData({
      service_id: priceEntry.service_id,

      price: priceEntry.price,

      plano: priceEntry.plano || '',

      grupo: priceEntry.grupo || '',

      id: priceEntry.id,
    });

    setShowPricingForm(true);

    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // ?? Remover preço da tabela

  const handleRemovePricingRow = async (priceEntry) => {
    if (
      !window.confirm(
        `Deseja remover o preço de "${priceEntry.services?.name || 'Serviço desconhecido'}" (R$ ${(priceEntry.price || 0).toFixed(2).replace('.', ',')})?`,
      )
    ) {
      return;
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase

        .from('service_prices')

        .delete()

        .eq('id', priceEntry.id);

      if (deleteError) {
        throw deleteError;
      }

      setError(null);

      loadPricingTable();
    } catch (err) {
      setError(err.message || 'Erro ao remover preço');

      console.error('Erro:', err);
    }
  };

  // ?? Toggle status de preço (ativo/inativo)

  const togglePricingStatus = async (priceEntry) => {
    const schedulingConfig = priceEntry.scheduling_config
      ? typeof priceEntry.scheduling_config === 'string'
        ? JSON.parse(priceEntry.scheduling_config)
        : priceEntry.scheduling_config
      : null;

    // Se est ativo (tem scheduling_config), desativa (limpa)

    // Se est inativo (sem scheduling_config), ativa (cria objeto vazio)

    const newConfig = schedulingConfig ? null : {};

    try {
      setError(null);

      const { error: updateError } = await supabase

        .from('service_prices')

        .update({ scheduling_config: newConfig })

        .eq('id', priceEntry.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`? Preço ${priceEntry.id} agora est ${newConfig ? 'ATIVO' : 'INATIVO'}`);

      setError(null);

      loadPricingTable();
    } catch (err) {
      setError(err.message || 'Erro ao alterar status do preço');

      console.error('Erro:', err);
    }
  };

  // ?? Processar upload de arquivo

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingFile(true);

      setError(null);

      let headers = [];

      let rows = [];

      // Detectar se  Excel ou CSV

      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      if (isExcel) {
        // Processar arquivo Excel

        const arrayBuffer = await file.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length < 2) {
          setError('Arquivo vazio ou sem dados');

          return;
        }

        // Header  a primeira linha

        headers = (data[0] || []).map((h) => String(h).toLowerCase().trim());

        // Dados comeam a partir da 3 linha (ndice 2) como no template

        rows = data.slice(2).filter((row) => row.some((cell) => cell)); // Remover linhas vazias
      } else {
        // Processar arquivo CSV/TXT

        let text = await file.text();

        // Remover BOM UTF-8 se presente

        if (text.charCodeAt(0) === 0xfeff) {
          text = text.slice(1);
        }

        const lines = text.trim().split('\n');

        if (lines.length < 2) {
          setError('Arquivo vazio ou sem dados');

          return;
        }

        headers = lines[0]
          .toLowerCase()
          .split(',')
          .map((h) => h.trim());

        // Processar dados

        rows = lines
          .slice(1)
          .map((line) => line.split(',').map((s) => s.trim()))
          .filter((row) => row.some((cell) => cell));
      }

      const payerUpload = await supabase

        .from('payers')

        .select('id')

        .eq('name', formData.name)

        .eq('clinic_id', clinicId)

        .maybeSingle();

      let payerDataUpload = payerUpload;

      if (!payerDataUpload.data) {
        console.log('?? Criando payer para upload...', { name: formData.name });

        const { data: newPayer, error: createError } = await supabase

          .from('payers')

          .insert([
            {
              name: formData.name,

              clinic_id: clinicId,
            },
          ])

          .select('id');

        if (!data || data.length === 0) {
          throw new Error('Record not found');
        }
        return data[0];

        if (createError) {
          setError('Erro ao criar convênio');

          return;
        }

        payerDataUpload = { data: newPayer };
      }

      // Mapear posies das colunas esperadas

      const codigoIdx = headers.findIndex((h) => h.includes('codigo'));

      const servicoIdx = headers.findIndex((h) => h.includes('servico') || h.includes('serviço'));

      const valorIdx = headers.findIndex(
        (h) => h.includes('valor') || h.includes('preço') || h.includes('preco'),
      );

      const planoIdx = headers.findIndex((h) => h.includes('plano'));

      const grupoIdx = headers.findIndex((h) => h.includes('grupo'));

      // Processar linhas com suporte a mltiplas colunas

      const processedRows = rows
        .map((cols) => {
          return {
            codigo: codigoIdx >= 0 ? cols[codigoIdx] : '',

            serviceName: servicoIdx >= 0 ? cols[servicoIdx] : '',

            price: valorIdx >= 0 ? parseFloat(cols[valorIdx]) : 0,

            plano: planoIdx >= 0 ? cols[planoIdx] : '',

            grupo: grupoIdx >= 0 ? cols[grupoIdx] : '',
          };
        })
        .filter((r) => r.serviceName && !isNaN(r.price));

      if (processedRows.length === 0) {
        setError('Nenhum dado vlido encontrado no arquivo');

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

          // Verificar se j existe

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

                grupo: row.grupo || null,
              })

              .eq('id', existing.id);
          } else {
            // Inserir

            await supabase

              .from('service_prices')

              .insert([
                {
                  service_id: service.id,

                  payer_id: payerDataUpload.data.id,

                  clinic_id: clinicId,

                  price: row.price,

                  plano: row.plano || null,

                  grupo: row.grupo || null,
                },
              ]);
          }

          successCount++;
        } catch (err) {
          console.error('Erro ao processar linha:', err);

          errorCount++;
        }
      }

      setError(null);

      alert(`? ${successCount} preços importados com sucesso!\n?? ${errorCount} linhas com erro.`);

      loadPricingTable();
    } catch (err) {
      setError(err.message || 'Erro ao fazer upload do arquivo');

      console.error('Erro:', err);
    } finally {
      setUploadingFile(false);

      e.target.value = '';
    }
  };

  // Função para converter categoria para label
  const getCategoryLabel = (categoryValue) => {
    const categoryMap = {
      consultation: 'Consulta',
      exam: 'Exame/SADT',
      procedure: 'Procedimento',
      surgery: 'Cirurgia',
      other: 'Outro',
    };
    return categoryMap[categoryValue] || categoryValue || '-';
  };

  // ?? Funo para download de template Excel

  const downloadExcelTemplate = () => {
    // Criar dados com header na linha 1 e dados a partir da linha 3

    const data = [
      ['Código', 'Serviço', 'Plano', 'Categoria', 'Valor', 'Status', 'Ações'],

      [], // Linha em branco

      ['12345', 'Consulta Clnica', 'Plano Bsico', 'Consultas', 150.0, '? Ativo', ''],

      ['12346', 'Eletrocardiograma', 'Plano Premium', 'Procedimentos', 250.0, '?? Incompleto', ''],

      ['12347', 'Hemograma', 'Qualquer', 'Exames', 80.0, '? Ativo', ''],

      ['12348', 'Ultrassom', 'Plano Completo', 'Procedimentos', 300.0, '?? Incompleto', ''],
    ];

    // Criar worksheet

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Definir largura das colunas

    worksheet['!cols'] = [
      { wch: 12 }, // Código

      { wch: 25 }, // Serviço

      { wch: 15 }, // Plano

      { wch: 15 }, // Categoria

      { wch: 12 }, // Valor

      { wch: 15 }, // Status

      { wch: 8 }, // Ações
    ];

    // Aplicar negrito ao header (linha 1)

    const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1'];

    headerCells.forEach((cell) => {
      if (worksheet[cell]) {
        worksheet[cell].s = {
          font: { bold: true },

          alignment: { horizontal: 'center', vertical: 'center' },
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
      console.log('?? Pulando loadPlansForPayer: editingId ou formData no definido');

      return;
    }

    try {
      setPlansLoading(true);

      console.log('?? Carregando planos para:', { payerName: formData.name });

      // Buscar o payer correspondente ao health_insurance pelo nome

      const { data: payer } = await supabase

        .from('payers')

        .select('id')

        .eq('name', formData.name)

        .eq('clinic_id', clinicId)

        .maybeSingle();

      if (!payer) {
        console.warn('?? Nenhum payer encontrado com nome:', formData.name);

        setPlansData([]);

        setPlansLoading(false);

        return;
      }

      console.log('? Payer encontrado:', payer.id);

      const { data, error } = await supabase

        .from('plans')

        .select('id, name, code, description, active, payer_id')

        .eq('payer_id', payer.id)

        .order('name');

      if (error) {
        throw error;
      }

      console.log('? Planos carregados:', data?.length || 0);

      setPlansData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('? Erro ao carregar planos:', err.message);

      setPlansData([]);
    } finally {
      setPlansLoading(false);
    }
  };

  // ?? Gerar código automtico para o plano
  const generatePlanCode = (planName) => {
    if (!planName.trim()) {
      return '';
    }

    // Pegar as iniciais de cada palavra
    const words = planName.trim().split(/\s+/);
    const initials = words
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 4); // At 4 primeiras letras

    // Gerar número sequencial de 3 dgitos (001-999)
    const randomNumber = String(Math.floor(Math.random() * 1000)).padStart(3, '0');

    return `${initials} - ${randomNumber}`;
  };

  // ?? Criar novo plano

  const handleAddPlan = async () => {
    if (!newPlanName.trim() || !editingId || !formData.name) {
      alert('Digite um nome para o plano');

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
        throw new Error(`Payer no encontrado para: ${formData.name}`);
      }

      const { data, error } = await supabase

        .from('plans')

        .insert([
          {
            payer_id: payer.id,

            name: newPlanName,

            code: newPlanCode || null,

            description: newPlanDescription,

            active: true,
          },
        ])

        .select();

      if (error) {
        throw error;
      }

      setPlansData([...plansData, data[0]]);

      setNewPlanName('');

      setNewPlanCode('');

      setNewPlanDescription('');

      setShowNewPlanForm(false);
    } catch (err) {
      console.error('? Erro ao criar plano:', err.message);

      alert('Erro ao criar plano: ' + err.message);
    }
  };

  // ?? Deletar plano

  const handleDeletePlan = async (planId, planName) => {
    if (!confirm(`Tem certeza que deseja deletar o plano "${planName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase

        .from('plans')

        .delete()

        .eq('id', planId);

      if (error) {
        throw error;
      }

      setPlansData(plansData.filter((p) => p.id !== planId));
    } catch (err) {
      console.error('? Erro ao deletar plano:', err.message);

      alert('Erro ao deletar plano: ' + err.message);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.id);

    setEditingPlanName(plan.name);

    setEditingPlanCode(plan.code || '');

    setEditingPlanDescription(plan.description || '');

    setEditingPlanActive(plan.active || false);
  };

  const handleUpdatePlan = async () => {
    if (!editingPlanName.trim()) {
      alert('Digite um nome para o plano');

      return;
    }

    try {
      const { error } = await supabase

        .from('plans')

        .update({
          name: editingPlanName,

          code: editingPlanCode || null,

          description: editingPlanDescription,

          active: editingPlanActive,
        })

        .eq('id', editingPlanId);

      if (error) {
        throw error;
      }

      setPlansData(
        plansData.map((p) =>
          p.id === editingPlanId
            ? {
                ...p,
                name: editingPlanName,
                code: editingPlanCode,
                description: editingPlanDescription,
                active: editingPlanActive,
              }
            : p,
        ),
      );

      setEditingPlanId(null);

      setEditingPlanName('');

      setEditingPlanCode('');

      setEditingPlanDescription('');

      setEditingPlanActive(false);

      alert('? Plano atualizado com sucesso!');
    } catch (err) {
      console.error('? Erro ao atualizar plano:', err.message);

      alert('Erro ao atualizar plano: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);

    setEditingPlanName('');

    setEditingPlanCode('');

    setEditingPlanDescription('');

    setEditingPlanActive(false);
  };

  useEffect(() => {
    // Carregar planos quando a aba  selecionada e h um convênio em edio

    if ((activeTab === 'plans' || activeTab === 'pricing') && editingId) {
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

    // Formata com 3 dgitos (CONV001, CONV002, etc)

    return `CONV${String(nextNumber).padStart(3, '0')}`;
  };

  const handleNew = () => {
    setEditingId(null);

    setFormData({
      code: generateConvenioCode(),

      name: '',

      fantasy_name: '',

      legal_name: '',

      type: 'health_plan',

      cnpj: '',

      contact_person: '',

      contact_email: '',

      contact_phone: '',

      discount_percentage: 0,

      minimum_margin_percentage: 0,

      special_rules: '',

      active: true,

      registration_ans: '',

      tiss_pattern: true,

      guide_format: '',

      tiss_version: '3.05.00',

      nfe_series: '',

      cfm_code: '',

      is_simple_nacional: false,

      icms_indicator: '',

      rps_series: '',

      rps_initial: 0,

      rps_type: '',

      iss_retained: false,

      beneficiary_type: '',

      municipal_service_code: '',

      enable_nfe_generation: false,

      // ===== NOVOS CAMPOS: TISS =====

      tiss_enabled: false,

      submission_method: 'HTTP',

      tiss_endpoint: '',

      tiss_username: '',

      tiss_password: '',

      tiss_response_email: '',

      // ===== NOVOS CAMPOS: PORTAL XML INTEGRATION =====

      portal_username: '',

      portal_password: '',

      portal_webhook_url: '',

      portal_api_key: '',

      certificate_path: '',

      certificate_password: '',

      use_certificate: true,

      submission_format: 'xml',

      response_format: 'xml',

      use_compression: true,

      max_daily_submissions: 100,

      max_file_size_mb: 50,

      max_guides_per_submission: 500,

      requires_manual_confirmation: false,

      support_email: '',

      support_phone: '',

      support_hours: '08:00-18:00',

      enable_rps_generation: false,

      portal_connection_status: 'untested',

      // ===== NOVOS CAMPOS: ENDEREO =====

      address_street: '',

      address_number: '',

      address_neighborhood: '',

      address_city: '',

      address_state: '',

      address_zip_code: '',
    });

    setShowForm(true);

    setError(null);
  };

  const handleEdit = (insurance) => {
    setEditingId(insurance.id);

    setSelectedInsurance(insurance);

    setFormData({
      code: insurance.code || '',

      name: insurance.name || '',

      fantasy_name: insurance.fantasy_name || '',

      legal_name: insurance.legal_name || '',

      type: insurance.type || '',

      cnpj: insurance.cnpj || '',

      contact_person: insurance.contact_person || '',

      contact_email: insurance.contact_email || '',

      contact_phone: insurance.contact_phone || '',

      contact_mobile: insurance.contact_mobile || '',

      discount_percentage: insurance.discount_percentage || 0,

      minimum_margin_percentage: insurance.minimum_margin_percentage || 0,

      special_rules: insurance.special_rules || '',

      active: insurance.active !== false,

      // ===== NOVOS CAMPOS TISS =====

      registration_ans: insurance.registration_ans || '',

      tiss_pattern: insurance.tiss_pattern !== false,

      guide_format: insurance.guide_format || '',

      tiss_version: insurance.tiss_version || '3.05.00',

      nfe_series: insurance.nfe_series || '',

      cfm_code: insurance.cfm_code || '',

      is_simple_nacional: insurance.is_simple_nacional === true,

      icms_indicator: insurance.icms_indicator || '',

      rps_series: insurance.rps_series || '',

      rps_initial: insurance.rps_initial || 0,

      rps_type: insurance.rps_type || '',

      iss_retained: insurance.iss_retained === true,

      beneficiary_type: insurance.beneficiary_type || '',

      municipal_service_code: insurance.municipal_service_code || '',

      enable_nfe_generation: insurance.enable_nfe_generation === true,

      // ===== NOVOS CAMPOS: ENDEREO =====

      address_street: insurance.address_street || '',

      address_number: insurance.address_number || '',

      address_neighborhood: insurance.address_neighborhood || '',

      address_city: insurance.address_city || '',

      address_state: insurance.address_state || '',

      address_zip_code: insurance.address_zip_code || '',

      // ===== NOVOS CAMPOS: IDENTIFICAO FISCAL =====

      municipal_registration: insurance.municipal_registration || '',

      state_registration: insurance.state_registration || '',

      country: insurance.country || 'Brasil',

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

      ir_applicable: insurance.ir_applicable === true,

      ir_rate: insurance.ir_rate || 0,

      csll_applicable: insurance.csll_applicable === true,

      csll_rate: insurance.csll_rate || 0,

      ibs_applicable: insurance.ibs_applicable === true,

      ibs_rate: insurance.ibs_rate || 0,

      cbs_applicable: insurance.cbs_applicable === true,

      cbs_rate: insurance.cbs_rate || 0,

      retains_taxes: insurance.retains_taxes === true,

      tax_regime: insurance.tax_regime || '',

      // ===== NOVOS CAMPOS: TISS =====

      tiss_enabled: insurance.tiss_enabled === true,

      submission_method: insurance.submission_method || 'HTTP',

      tiss_endpoint: insurance.tiss_endpoint || '',

      tiss_username: insurance.tiss_username || '',

      tiss_password: insurance.tiss_password || '',

      tiss_response_email: insurance.tiss_response_email || '',

      // ===== NOVOS CAMPOS: PORTAL XML INTEGRATION =====

      portal_username: insurance.portal_username || '',

      portal_password: insurance.portal_password || '',

      portal_webhook_url: insurance.portal_webhook_url || '',

      portal_api_key: insurance.portal_api_key || '',

      certificate_path: insurance.certificate_path || '',

      certificate_password: insurance.certificate_password || '',

      use_certificate: insurance.use_certificate ?? true,

      submission_format: insurance.submission_format || 'xml',

      response_format: insurance.response_format || 'xml',

      use_compression: insurance.use_compression ?? true,

      max_daily_submissions: insurance.max_daily_submissions || 100,

      max_file_size_mb: insurance.max_file_size_mb || 50,

      max_guides_per_submission: insurance.max_guides_per_submission || 500,

      requires_manual_confirmation: insurance.requires_manual_confirmation ?? false,

      support_email: insurance.support_email || '',

      support_phone: insurance.support_phone || '',

      support_hours: insurance.support_hours || '08:00-18:00',

      enable_rps_generation: insurance.enable_rps_generation ?? false,

      portal_connection_status: insurance.portal_connection_status || 'untested',

      // ===== NOVOS CAMPOS: FINANCEIRO ====="

      payment_due_days: insurance.payment_due_days || 30,

      accepted_payment_methods: insurance.accepted_payment_methods || [],

      billing_cycle_start: insurance.billing_cycle_start || 1,

      billing_cycle_end: insurance.billing_cycle_end || 30,

      administration_fee_percentage: insurance.administration_fee_percentage || 0,

      early_payment_discount_percentage: insurance.early_payment_discount_percentage || 0,

      volume_discount_percentage: insurance.volume_discount_percentage || 0,

      reajustment_index: insurance.reajustment_index || '',

      annual_reajustment_date: insurance.annual_reajustment_date || '',

      next_reajustment_date: insurance.next_reajustment_date || '',

      monthly_billing_ceiling: insurance.monthly_billing_ceiling || null,

      consultation_limit: insurance.consultation_limit || null,

      copayment_value: insurance.copayment_value || null,

      contract_start_date: insurance.contract_start_date || '',

      contract_end_date: insurance.contract_end_date || '',

      auto_renewal: insurance.auto_renewal === true,

      prior_notice_days: insurance.prior_notice_days || 30,

      days_to_suspension: insurance.days_to_suspension || 30,

      late_payment_fine_percentage: insurance.late_payment_fine_percentage || 0,

      daily_interest_rate_percentage: insurance.daily_interest_rate_percentage || 0,

      financial_contact_name: insurance.financial_contact_name || '',

      financial_contact_email: insurance.financial_contact_email || '',

      financial_contact_phone: insurance.financial_contact_phone || '',

      bank_name: insurance.bank_name || '',

      bank_branch: insurance.bank_branch || '',

      bank_account: insurance.bank_account || '',
    });

    setShowForm(true);

    setActiveTab('general');

    setError(null);

    // ?? Resetar estados dos planos

    setPlansData([]);

    setNewPlanName('');

    setNewPlanDescription('');

    setShowNewPlanForm(false);
  };

  const closeForm = () => {
    setShowForm(false);

    setEditingId(null);

    setSelectedInsurance(null);

    setActiveTab('general');

    setFormData({
      code: '',

      name: '',

      fantasy_name: '',

      legal_name: '',

      type: 'health_plan',

      cnpj: '',

      contact_person: '',

      contact_email: '',

      contact_phone: '',

      contact_mobile: '',

      discount_percentage: 0,

      minimum_margin_percentage: 0,

      special_rules: '',

      active: true,

      registration_ans: '',

      tiss_pattern: true,

      guide_format: '',

      tiss_version: '3.05.00',

      nfe_series: '',

      cfm_code: '',

      is_simple_nacional: false,

      icms_indicator: '',

      rps_series: '',

      rps_initial: 0,

      rps_type: '',

      iss_retained: false,

      beneficiary_type: '',

      municipal_service_code: '',

      enable_nfe_generation: false,

      // ===== NOVOS CAMPOS: ENDEREO =====

      address_street: '',

      address_number: '',

      address_neighborhood: '',

      address_city: '',

      address_state: '',

      address_zip_code: '',

      // ===== NOVOS CAMPOS: IDENTIFICAO FISCAL =====

      municipal_registration: '',

      state_registration: '',

      country: 'Brasil',

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

      ir_applicable: false,

      ir_rate: 0,

      csll_applicable: false,

      csll_rate: 0,

      ibs_applicable: false,

      ibs_rate: 0,

      cbs_applicable: false,

      cbs_rate: 0,

      retains_taxes: false,

      tax_regime: '',

      // ===== NOVOS CAMPOS: TISS =====

      tiss_enabled: false,

      submission_method: 'HTTP',

      tiss_endpoint: '',

      tiss_username: '',

      tiss_password: '',

      tiss_response_email: '',

      // ===== NOVOS CAMPOS: PORTAL XML INTEGRATION =====

      portal_username: '',

      portal_password: '',

      portal_webhook_url: '',

      portal_api_key: '',

      certificate_path: '',

      certificate_password: '',

      use_certificate: true,

      submission_format: 'xml',

      response_format: 'xml',

      use_compression: true,

      max_daily_submissions: 100,

      max_file_size_mb: 50,

      max_guides_per_submission: 500,

      requires_manual_confirmation: false,

      support_email: '',

      support_phone: '',

      support_hours: '08:00-18:00',

      enable_rps_generation: false,

      portal_connection_status: 'untested',
    });

    // ?? Limpar estados dos planos

    setPlansData([]);

    setNewPlanName('');

    setNewPlanDescription('');

    setShowNewPlanForm(false);

    setSubmitting(false);
  };

  const closePriceForm = () => {
    setShowPriceForm(false);

    setPriceFormData({
      service_id: '',

      service_value: '',

      copay_value: '',
    });
  };

  // Funo para verificar se h mudanas antes de fechar

  const handleCloseWithCheck = () => {
    // Verifica se h algum dado preenchido no formulrio

    const hasData = Object.entries(formData).some(([key, value]) => {
      if (typeof value === 'string') {
        return value.trim() !== '';
      }

      if (typeof value === 'number') {
        return value !== 0;
      }

      if (typeof value === 'boolean') {
        return value !== true;
      }

      return false;
    });

    if (hasData) {
      if (window.confirm('Tem certeza que deseja sair? As alterações no salvas sero perdidas.')) {
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
      setError('Selecione um serviço e defina pelo menos um valor');

      return;
    }

    try {
      setSubmitting(true);

      setError(null);

      closePriceForm();

      await loadServicesTab();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar serviço');

      console.error('Erro:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteServicePrice = async (serviceId) => {
    if (!window.confirm('Tem certeza que deseja remover este serviço?')) {
      return;
    }

    try {
      setError(null);

      await loadServicesTab();
    } catch (err) {
      setError(err.message || 'Erro ao remover serviço');

      console.error('Erro:', err);
    }
  };

  const validateForm = () => {
    if (!formData.fantasy_name.trim()) {
      setError('Nome Fantasia  obrigatório');

      return false;
    }

    if (!formData.code.trim()) {
      setError('Código  obrigatório');

      return false;
    }

    if (!formData.type.trim()) {
      setError('Tipo de convênio  obrigatório');

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

        tiss_version: formData.tiss_version?.trim() || '3.05.00',

        nfe_series: formData.nfe_series?.trim() || null,

        cfm_code: formData.cfm_code?.trim() || null,

        is_simple_nacional: formData.is_simple_nacional === true,

        icms_indicator: formData.icms_indicator?.trim() || null,

        rps_series: formData.rps_series?.trim() || null,

        rps_initial: parseInt(formData.rps_initial) || 0,

        rps_type: formData.rps_type?.trim() || null,

        iss_retained: formData.iss_retained === true,

        beneficiary_type: formData.beneficiary_type?.trim() || null,

        municipal_service_code: formData.municipal_service_code?.trim() || null,

        enable_nfe_generation: formData.enable_nfe_generation === true,

        // ===== NOVOS CAMPOS: ENDEREO =====

        address_street: formData.address_street?.trim() || null,

        address_number: formData.address_number?.trim() || null,

        address_neighborhood: formData.address_neighborhood?.trim() || null,

        address_city: formData.address_city?.trim() || null,

        address_state: formData.address_state?.trim() || null,

        address_zip_code: formData.address_zip_code?.trim() || null,

        // ===== NOVOS CAMPOS: IDENTIFICAO FISCAL =====

        municipal_registration: formData.municipal_registration?.trim() || null,

        state_registration: formData.state_registration?.trim() || null,

        country: formData.country?.trim() || 'Brasil',

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

        // ===== NOVOS CAMPOS: TISS =====

        tiss_enabled: formData.tiss_enabled === true,

        submission_method: formData.submission_method?.trim() || 'HTTP',

        tiss_endpoint: formData.tiss_endpoint?.trim() || null,

        tiss_username: formData.tiss_username?.trim() || null,

        tiss_password: formData.tiss_password?.trim() || null,

        tiss_response_email: formData.tiss_response_email?.trim() || null,

        // ===== NOVOS CAMPOS: PORTAL XML INTEGRATION =====

        portal_username: formData.portal_username?.trim() || null,

        portal_password: formData.portal_password?.trim() || null,

        portal_webhook_url: formData.portal_webhook_url?.trim() || null,

        portal_api_key: formData.portal_api_key?.trim() || null,

        certificate_path: formData.certificate_path?.trim() || null,

        certificate_password: formData.certificate_password?.trim() || null,

        use_certificate: formData.use_certificate === true,

        submission_format: formData.submission_format?.trim() || 'xml',

        response_format: formData.response_format?.trim() || 'xml',

        use_compression: formData.use_compression === true,

        max_daily_submissions: parseInt(formData.max_daily_submissions) || 100,

        max_file_size_mb: parseInt(formData.max_file_size_mb) || 50,

        max_guides_per_submission: parseInt(formData.max_guides_per_submission) || 500,

        requires_manual_confirmation: formData.requires_manual_confirmation === true,

        support_email: formData.support_email?.trim() || null,

        support_phone: formData.support_phone?.trim() || null,

        support_hours: formData.support_hours?.trim() || '08:00-18:00',

        enable_rps_generation: formData.enable_rps_generation === true,

        portal_connection_status: formData.portal_connection_status?.trim() || 'untested',
      };

      console.log('?? Frontend - Dados a salvar:', dataToSave);

      console.log('?? Modo:', editingId ? 'UPDATE' : 'CREATE', editingId || 'novo');

      if (editingId) {
        console.log('?? Chamando UPDATE...');

        await healthInsurancesApi.updateHealthInsurance(editingId, clinicId, dataToSave);

        setInsurances(insurances.map((i) => (i.id === editingId ? { ...i, ...dataToSave } : i)));
      } else {
        console.log('? Chamando CREATE...');

        const newInsurance = await healthInsurancesApi.createHealthInsurance(clinicId, dataToSave);

        setInsurances([...insurances, newInsurance]);
      }

      closeForm();
    } catch (err) {
      console.error('? Erro ao salvar convênio:', err);

      setError(err.message || 'Erro ao salvar convênio');
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

      await healthInsurancesApi.deleteHealthInsurance(id, clinicId);

      setInsurances(insurances.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message || 'Erro ao deletar convênio');

      console.error('Erro:', err);
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

  // Se formulrio/modal est aberto, renderizar somente o modal (no detalhes)

  if (showForm) {
    // O modal ser renderizado abaixo (no return principal)
    // Retorna null aqui para que a pgina de detalhes no tenha prioridade
  }

  // Detalhe de Convênio com M:M Serviços (s se NO est em edio)

  if (selectedInsurance && !showForm) {
    return (
      <div className="space-y-6 w-full">
        <button
          onClick={closeInsuranceDetail}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2"
        >
          ? Voltar  lista
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
                <div className="animate-spin inline-block">?</div>

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
                          {submitting ? 'Salvando...' : 'Salvar'}
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
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            Serviço
                          </th>

                          <th className="text-right py-3 px-4 font-semibold text-gray-700">
                            Valor
                          </th>

                          <th className="text-right py-3 px-4 font-semibold text-gray-700">
                            Copagamento
                          </th>

                          <th className="text-center py-3 px-4 font-semibold text-gray-700">
                            Ações
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {insuranceServices.map((insService) => (
                          <tr key={insService.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              {insService.service_name || insService.service?.name || '-'}
                            </td>

                            <td className="py-3 px-4 text-right">
                              {insService.service_value
                                ? `R$ ${parseFloat(insService.service_value).toFixed(2)}`
                                : '-'}
                            </td>

                            <td className="py-3 px-4 text-right">
                              {insService.copay_value
                                ? `R$ ${parseFloat(insService.copay_value).toFixed(2)}`
                                : '-'}
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

      {error && <Alert type="error" title="Aviso" message={error} onClose={() => setError(null)} />}

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
                <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
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

                      <td className="py-3 px-4 text-gray-600">{translateType(insurance.type)}</td>

                      <td className="py-3 px-4 text-gray-600">{insurance.contact_email || '-'}</td>

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
              {/* Boto Fechar - Posicionado Absolutamente */}

              <button
                type="button"
                onClick={() => handleCloseWithCheck()}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors z-10"
                title="Fechar"
              >
                <X size={20} />
              </button>

              <CardHeader
                className="border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                style={{ flexShrink: 0, padding: '16px' }}
              >
                <CardTitle className="text-white">
                  {editingId ? 'Editar Convênio' : 'Novo Convênio'}
                </CardTitle>
              </CardHeader>

              {/* Abas de Navegao */}

              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  gap: '0',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  alignItems: 'stretch',
                  height: '48px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  style={{
                    flex: '1',
                    padding: '0 !important',
                    margin: '0 !important',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderBottom:
                      activeTab === 'general' ? '2px solid #2563eb' : '2px solid transparent',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'transparent',
                    color: activeTab === 'general' ? '#2563eb' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    lineHeight: '1',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  Dados Gerais
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('address')}
                  style={{
                    flex: '1',
                    padding: '0 !important',
                    margin: '0 !important',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderBottom:
                      activeTab === 'address' ? '2px solid #2563eb' : '2px solid transparent',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'transparent',
                    color: activeTab === 'address' ? '#2563eb' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    lineHeight: '1',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  Endereço
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('fiscal')}
                  style={{
                    flex: '1',
                    padding: '0 !important',
                    margin: '0 !important',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderBottom:
                      activeTab === 'fiscal' ? '2px solid #2563eb' : '2px solid transparent',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'transparent',
                    color: activeTab === 'fiscal' ? '#2563eb' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    lineHeight: '1',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  Fiscal
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  style={{
                    flex: '1',
                    padding: '0 !important',
                    margin: '0 !important',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderBottom:
                      activeTab === 'billing' ? '2px solid #ea580c' : '2px solid transparent',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'transparent',
                    color: activeTab === 'billing' ? '#ea580c' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    lineHeight: '1',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  Faturamento
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('taxes')}
                  style={{
                    flex: '1',
                    padding: '0 !important',
                    margin: '0 !important',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderBottom:
                      activeTab === 'taxes' ? '2px solid #2563eb' : '2px solid transparent',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'transparent',
                    color: activeTab === 'taxes' ? '#2563eb' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    lineHeight: '1',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  Tributos
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('financial')}
                  style={{
                    flex: '1',
                    padding: '0 !important',
                    margin: '0 !important',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderBottom:
                      activeTab === 'financial' ? '2px solid #16a34a' : '2px solid transparent',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'transparent',
                    color: activeTab === 'financial' ? '#16a34a' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    lineHeight: '1',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  Financeiro
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('plans')}
                  style={{
                    flex: '1',
                    padding: '0 !important',
                    margin: '0 !important',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderBottom:
                      activeTab === 'plans' ? '2px solid #7c3aed' : '2px solid transparent',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'transparent',
                    color: activeTab === 'plans' ? '#7c3aed' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    lineHeight: '1',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  Planos
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pricing')}
                  style={{
                    flex: '1',
                    padding: '0 !important',
                    margin: '0 !important',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderBottom:
                      activeTab === 'pricing' ? '2px solid #dc2626' : '2px solid transparent',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'transparent',
                    color: activeTab === 'pricing' ? '#dc2626' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    lineHeight: '1',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  Tabela de Preços
                </button>
              </div>

              <CardContent className="app-modal-body p-6 modal-content-scroll">
                <form
                  id="convenio-form"
                  onSubmit={handleSubmit}
                  className="space-y-6 flex flex-col"
                  style={{ flex: 1, overflow: 'visible' }}
                >
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                    {/* ABA: DADOS GERAIS */}

                    {activeTab === 'general' && (
                      <FormSection icon="📋" title="Identificação" description="Dados básicos do convênio">
                        {/* Código + Tipo */}
                        <FormGrid columns={4}>
                          <FormInput
                            type="text"
                            label="Código"
                            required
                            placeholder="Ex: CONV001"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            disabled={submitting || !editingId}
                          />
                          <div className="col-span-3">
                            <FormSelect
                              label="Tipo"
                              required
                              options={[
                                { value: '', label: 'Selecione o tipo' },
                                { value: 'health_plan', label: 'Plano de Saúde' },
                                { value: 'private_insurance', label: 'Seguro Privado' },
                                { value: 'government', label: 'Governamental (SUS/INSS)' },
                                { value: 'direct_pay', label: 'Pagamento Direto' },
                                { value: 'other', label: 'Outro' },
                              ]}
                              value={formData.type}
                              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                              disabled={submitting}
                            />
                          </div>
                        </FormGrid>

                        {/* Nome Fantasia + Razão Social */}
                        <FormGrid columns={2}>
                          <FormInput
                            type="text"
                            label="Nome Fantasia"
                            required
                            placeholder="Ex: Unimed São Paulo"
                            value={formData.fantasy_name}
                            onChange={(e) => setFormData({ ...formData, fantasy_name: e.target.value })}
                            disabled={submitting}
                          />
                          <FormInput
                            type="text"
                            label="Razão Social"
                            placeholder="Ex: Unimed Brasil Administradora..."
                            value={formData.legal_name}
                            onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                            disabled={submitting}
                          />
                        </FormGrid>

                        {/* CNPJ + Pessoa de Contato */}
                        <FormGrid columns={2}>
                          <FormInput
                            type="text"
                            label="CNPJ"
                            placeholder="00.000.000/0000-00"
                            value={formData.cnpj}
                            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                            disabled={submitting}
                          />
                          <FormInput
                            type="text"
                            label="Pessoa de Contato"
                            placeholder="Nome do responsável"
                            value={formData.contact_person}
                            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                            disabled={submitting}
                          />
                        </FormGrid>

                        {/* Email */}
                        <FormInput
                          type="email"
                          label="Email de Contato"
                          placeholder="contato@exemplo.com"
                          value={formData.contact_email}
                          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                          disabled={submitting}
                        />

                        {/* Telefone + Celular */}
                        <FormGrid columns={2}>
                          <FormInput
                            type="tel"
                            label="Telefone de Contato"
                            placeholder="(11) 3333-3333"
                            value={formData.contact_phone}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                            disabled={submitting}
                          />
                          <FormInput
                            type="tel"
                            label="Celular de Contato"
                            placeholder="(11) 99999-9999"
                            value={formData.contact_mobile}
                            onChange={(e) => setFormData({ ...formData, contact_mobile: e.target.value })}
                            disabled={submitting}
                          />
                        </FormGrid>

                        {/* Regras Especiais */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Regras Especiais
                          </label>
                          <textarea
                            value={formData.special_rules}
                            onChange={(e) => setFormData({ ...formData, special_rules: e.target.value })}
                            placeholder="Ex: Requer autorização prévia, limite de 10 consultas/mês, etc"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            disabled={submitting}
                          />
                        </div>

                        {/* Convênio Ativo */}
                        <FormCheckbox
                          id="active"
                          label="Convênio Ativo"
                          checked={formData.active}
                          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                          disabled={submitting}
                          color="blue"
                        />
                      </FormSection>
                    )}

                    {/* ABA: TABELA DE PREÇOS */}

                    {activeTab === 'pricing' && (
                      <div className="space-y-6">
                        <div className="border-b pb-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            🏷️ Tabela de Preços
                          </h3>

                          <p className="text-xs text-gray-500">
                            Gerencie serviços e preços para este convênio
                          </p>
                        </div>

                        {/* Aviso se não salvou o convênio ainda */}
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
                            title={!editingId ? 'Salve o convênio primeiro' : ''}
                            className={`text-white text-sm py-2 px-4 rounded flex items-center gap-2 ${
                              editingId
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-gray-400 cursor-not-allowed'
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
                              title={!editingId ? 'Salve o convênio primeiro' : ''}
                              className={`text-white text-sm py-2 px-4 rounded flex items-center gap-2 ${
                                editingId && !uploadingFile
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'bg-gray-400 cursor-not-allowed'
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
                            title={!editingId ? 'Salve o convênio primeiro' : ''}
                            className={`text-white text-sm py-2 px-4 rounded flex items-center gap-2 ${
                              editingId
                                ? 'bg-purple-600 hover:bg-purple-700'
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                          >
                            📋 Template Excel
                          </Button>
                        </div>

                        <div className="space-y-6">
                            <>
                              {/* Formulrio Compacto */}

                              {showPricingForm && (
                                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-4">
                                    {pricingFormData.id ? 'Editar Serviço' : 'Novo Serviço'}
                                  </h4>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    <select
                                      value={pricingFormData.service_id}
                                      onChange={(e) => {
                                        const selectedServiceId = e.target.value;
                                        const selectedService = services.find(
                                          (s) => s.id === selectedServiceId,
                                        );
                                        setPricingFormData({
                                          ...pricingFormData,
                                          service_id: selectedServiceId,
                                          grupo: selectedService?.service_category || '',
                                        });
                                      }}
                                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Selecione o serviço</option>

                                      {(services || [])

                                        .filter(
                                          (s) =>
                                            !pricingTableData.some(
                                              (p) =>
                                                p.service_id === s.id &&
                                                p.id !== pricingFormData.id,
                                            ),
                                        )

                                        .map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.name}
                                          </option>
                                        ))}
                                    </select>

                                    <select
                                      value={pricingFormData.plano}
                                      onChange={(e) =>
                                        setPricingFormData({
                                          ...pricingFormData,
                                          plano: e.target.value,
                                        })
                                      }
                                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Selecione o plano</option>

                                      {(plansData || []).map((plan) => (
                                        <option key={plan.id} value={plan.name}>
                                          {plan.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={pricingFormData.price}
                                      onChange={(e) =>
                                        setPricingFormData({
                                          ...pricingFormData,
                                          price: e.target.value,
                                        })
                                      }
                                      placeholder="Preço (R$)"
                                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />

                                    <select
                                      value={pricingFormData.grupo}
                                      onChange={(e) =>
                                        setPricingFormData({
                                          ...pricingFormData,
                                          grupo: e.target.value,
                                        })
                                      }
                                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Selecione a Categoria</option>

                                      <option value="consultation">Consulta</option>

                                      <option value="exam">Exame/SADT</option>

                                      <option value="procedure">Procedimento</option>

                                      <option value="surgery">Cirurgia</option>

                                      <option value="other">Outro</option>
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

                                        setPricingFormData({
                                          service_id: '',
                                          price: '',
                                          plano: '',
                                          grupo: '',
                                          id: null,
                                        });
                                      }}
                                      className="bg-gray-300 hover:bg-gray-400 text-gray-900 text-sm px-4 py-2 rounded"
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {editingId &&
                                pricingTableData &&
                                Array.isArray(pricingTableData) &&
                                pricingTableData.length > 0 && (
                                  <div className="space-y-4">
                                    <div className="flex flex-wrap gap-4 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                      <div className="text-center">
                                        <p className="text-xs text-gray-600">Serviços</p>

                                        <p className="text-lg font-bold text-gray-900">
                                          {pricingTableData.length}
                                        </p>
                                      </div>

                                      <div className="text-center border-l border-r border-gray-300 px-4">
                                        <p className="text-xs text-gray-600">Configurados</p>

                                        <p className="text-lg font-bold text-green-600">
                                          {
                                            pricingTableData.filter((p) => {
                                              const config =
                                                typeof p.scheduling_config === 'string'
                                                  ? JSON.parse(p.scheduling_config)
                                                  : p.scheduling_config;

                                              const periods = config
                                                ? Object.values(config).reduce(
                                                    (s, d) => s + (d?.periods?.length || 0),
                                                    0,
                                                  )
                                                : 0;

                                              return periods > 0;
                                            }).length
                                          }
                                        </p>
                                      </div>

                                      <div className="text-center">
                                        <p className="text-xs text-gray-600">Faturamento</p>

                                        <p className="text-lg font-bold text-blue-600">
                                          {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',

                                            currency: 'BRL',
                                          }).format(
                                            pricingTableData.reduce(
                                              (sum, p) => sum + (p.price || 0),
                                              0,
                                            ),
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm border-collapse">
                                        <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
                                          <tr>
                                            <th className="text-center py-2 px-3 font-semibold text-gray-800 text-xs">
                                              Código
                                            </th>

                                            <th className="text-left py-2 px-3 font-semibold text-gray-800">
                                              Serviço
                                            </th>

                                            <th className="text-left py-2 px-3 font-semibold text-gray-800">
                                              Plano
                                            </th>

                                            <th className="text-left py-2 px-3 font-semibold text-gray-800">
                                              Categoria
                                            </th>

                                            <th className="text-right py-2 px-3 font-semibold text-gray-800">
                                              Valor
                                            </th>

                                            <th className="text-center py-2 px-3 font-semibold text-gray-800">
                                              Status
                                            </th>

                                            <th className="text-center py-2 px-3 font-semibold text-gray-800">
                                              Ações
                                            </th>
                                          </tr>
                                        </thead>

                                        <tbody>
                                          {pricingTableData.map((priceEntry) => {
                                            const schedulingConfig = priceEntry.scheduling_config
                                              ? typeof priceEntry.scheduling_config === 'string'
                                                ? JSON.parse(priceEntry.scheduling_config)
                                                : priceEntry.scheduling_config
                                              : null;

                                            const serviceCode =
                                              priceEntry.services?.code ||
                                              priceEntry.services?.tuss_code ||
                                              priceEntry.service_id?.substring(0, 8) ||
                                              '-';

                                            const totalPeriods = schedulingConfig
                                              ? Object.values(schedulingConfig).reduce(
                                                  (sum, dayData) => {
                                                    return sum + (dayData?.periods?.length || 0);
                                                  },
                                                  0,
                                                )
                                              : 0;

                                            // Verificar se preço est ATIVO (active = true)

                                            const isConfigured = priceEntry.active === true;

                                            return (
                                              <tr
                                                key={priceEntry.id}
                                                className="border-b hover:bg-gray-50 transition"
                                              >
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
                                                  {getCategoryLabel(
                                                    priceEntry.services?.service_category ||
                                                      priceEntry.grupo,
                                                  )}
                                                </td>

                                                <td className="py-2 px-3 text-right text-gray-900 font-semibold">
                                                  {new Intl.NumberFormat('pt-BR', {
                                                    style: 'currency',

                                                    currency: 'BRL',
                                                  }).format(priceEntry.price || 0)}
                                                </td>

                                                <td className="py-2 px-3 text-center">
                                                  <div className="flex items-center justify-center gap-2">
                                                    <input
                                                      type="checkbox"
                                                      checked={isConfigured}
                                                      onChange={() =>
                                                        togglePricingStatus(priceEntry)
                                                      }
                                                      className="w-4 h-4 cursor-pointer"
                                                      title={
                                                        isConfigured
                                                          ? 'Clique para desativar'
                                                          : 'Clique para ver detalhes'
                                                      }
                                                    />

                                                    <span
                                                      className={`text-xs font-semibold ${isConfigured ? 'text-green-600' : 'text-yellow-600'}`}
                                                    >
                                                      {isConfigured ? '✓' : '✗'}
                                                    </span>
                                                  </div>
                                                </td>

                                                <td className="py-2 px-3 text-center space-x-1 flex gap-1 justify-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleEditPricingRow(priceEntry)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold"
                                                  >
                                                    Editar
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleRemovePricingRow(priceEntry)
                                                    }
                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold"
                                                  >
                                                    Deletar
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
                                      <p className="text-xs text-gray-600 font-semibold">
                                        Total de Serviços
                                      </p>

                                      <p className="text-2xl font-bold text-blue-600">
                                        {pricingTableData.length}
                                      </p>
                                    </div>

                                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                      <p className="text-xs text-gray-600 font-semibold">
                                        Preço Mdio
                                      </p>

                                      <p className="text-2xl font-bold text-green-600">
                                        {new Intl.NumberFormat('pt-BR', {
                                          style: 'currency',

                                          currency: 'BRL',
                                        }).format(
                                          pricingTableData.reduce(
                                            (sum, p) => sum + (p.price || 0),
                                            0,
                                          ) / pricingTableData.length,
                                        )}
                                      </p>
                                    </div>

                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                      <p className="text-xs text-gray-600 font-semibold">
                                        Total de Profissionais
                                      </p>

                                      <p className="text-2xl font-bold text-purple-600">
                                        {pricingTableData.reduce(
                                          (sum, p) => sum + (p.professional_count || 0),
                                          0,
                                        )}
                                      </p>
                                    </div>

                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                      <p className="text-xs text-gray-600 font-semibold">
                                        Incompletos
                                      </p>

                                      <p className="text-2xl font-bold text-yellow-600">
                                        {
                                          pricingTableData.filter((p) => {
                                            const config =
                                              typeof p.scheduling_config === 'string'
                                                ? JSON.parse(p.scheduling_config)
                                                : p.scheduling_config;

                                            const periods = config
                                              ? Object.values(config).reduce(
                                                  (s, d) => s + (d?.periods?.length || 0),
                                                  0,
                                                )
                                              : 0;

                                            return periods === 0;
                                          }).length
                                        }
                                      </p>
                                    </div>

                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                      <p className="text-xs text-gray-600 font-semibold">
                                        Faturamento Total
                                      </p>

                                      <p className="text-lg font-bold text-red-600">
                                        {new Intl.NumberFormat('pt-BR', {
                                          style: 'currency',

                                          currency: 'BRL',
                                        }).format(
                                          pricingTableData.reduce(
                                            (sum, p) => sum + (p.price || 0),
                                            0,
                                          ),
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                      <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
                                        <tr>
                                          <th className="text-center py-2 px-3 font-semibold text-gray-800 text-xs">
                                            Código
                                          </th>

                                          <th className="text-left py-2 px-3 font-semibold text-gray-800">
                                            Serviço
                                          </th>

                                          <th className="text-left py-2 px-3 font-semibold text-gray-800">
                                            Plano
                                          </th>

                                          <th className="text-left py-2 px-3 font-semibold text-gray-800">
                                            Categoria
                                          </th>

                                          <th className="text-right py-2 px-3 font-semibold text-gray-800">
                                            Valor
                                          </th>

                                          <th className="text-center py-2 px-3 font-semibold text-gray-800">
                                            Status
                                          </th>

                                          <th className="text-center py-2 px-3 font-semibold text-gray-800">
                                            Ações
                                          </th>
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
                                            ? Object.values(schedulingConfig).reduce(
                                                (sum, dayData) => {
                                                  return sum + (dayData?.periods?.length || 0);
                                                },
                                                0,
                                              )
                                            : 0;

                                          const serviceCode =
                                            priceEntry.services?.code ||
                                            priceEntry.services?.tuss_code ||
                                            priceEntry.service_id?.substring(0, 8) ||
                                            '-';

                                          const isConfigured = priceEntry.active === true;

                                          return (
                                            <tr
                                              key={priceEntry.id}
                                              className="border-b hover:bg-blue-50 transition"
                                            >
                                              <td className="py-3 px-4 text-center text-xs text-gray-700 font-semibold bg-gray-50">
                                                {serviceCode}
                                              </td>

                                              <td className="py-3 px-4 text-gray-900 font-medium">
                                                {priceEntry.services?.name ||
                                                  'Serviço desconhecido'}
                                              </td>

                                              <td className="py-3 px-4 text-gray-900">
                                                {priceEntry.plano || '-'}
                                              </td>

                                              <td className="py-3 px-4 text-gray-900">
                                                {getCategoryLabel(
                                                  priceEntry.services?.service_category ||
                                                    priceEntry.grupo,
                                                )}
                                              </td>

                                              <td className="py-3 px-4 text-right text-gray-900 font-bold text-base">
                                                {new Intl.NumberFormat('pt-BR', {
                                                  style: 'currency',

                                                  currency: 'BRL',
                                                }).format(priceEntry.price || 0)}
                                              </td>

                                              <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                  <span
                                                    className={`text-xs font-semibold ${isConfigured ? 'text-green-600' : 'text-yellow-600'}`}
                                                  >
                                                    {isConfigured ? 'Ativo' : 'Incompleto'}
                                                  </span>
                                                </div>
                                              </td>

                                              <td className="py-3 px-4 text-center space-x-1">
                                                <button
                                                  type="button"
                                                  onClick={() => handleEditPricingRow(priceEntry)}
                                                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold"
                                                >
                                                  Editar
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() => handleRemovePricingRow(priceEntry)}
                                                  className="inline-block bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold"
                                                >
                                                  Remover
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

                              {!editingId &&
                                (!pricingTableData || pricingTableData.length === 0) && (
                                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-gray-700">
                                      <strong>Nenhum preço configurado</strong> para este convênio
                                      ainda.
                                    </p>

                                    <p className="text-sm text-gray-600 mt-2">
                                      A tabela mostra apenas os <strong>preços base</strong>{' '}
                                      efetivamente negociados com o convênio. Preços específicos de
                                      profissionais (negociações pontuais) aparecem como{' '}
                                      <strong>"Negociação"</strong> na edição do profissional.
                                    </p>
                                  </div>
                                )}
                            </>

                            {/* Instrues de Upload - Ocultas */}
                          </div>

                          {false && (
                            <>
                              <div>
                                <p className="text-xs text-gray-600 mb-2">
                                  Crie um arquivo CSV ou TXT com trs colunas:{' '}
                                  <strong>Código CBHPM</strong>, <strong>Nome do Serviço</strong> e{' '}
                                  <strong>Preço</strong>
                                </p>

                                <div className="bg-white p-2 rounded text-xs font-mono text-gray-700 overflow-x-auto mb-2">
                                  <div>Código CBHPM,Nome do Serviço,Preço</div>

                                  <div>
                                    10101012,Consulta em horrio normal ou preestabelecido,150.00
                                  </div>

                                  <div>10101020,Consulta em domiclio,80.50</div>

                                  <div>10101039,Consulta em pronto socorro,250.00</div>
                                </div>
                              </div>

                              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold mb-3">
                                  ?? Estrutura da Tabela de Preços (Viso Financeira):
                                </p>

                                <div className="space-y-2 text-xs text-gray-600">
                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-max">? Código CBHPM:</span>

                                    <span>
                                      Identificador nico do serviço conforme tabela CBHPM da ANS
                                    </span>
                                  </div>

                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-max">??? Preço Base:</span>

                                    <span>Valor negociado com o convênio para cada serviço</span>
                                  </div>

                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-max">
                                      ?? Profissionais:
                                    </span>

                                    <span>
                                      Quantidade de profissionais vinculados a este convênio
                                    </span>
                                  </div>

                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-max">? Status:</span>

                                    <span>
                                      Ativo (preço configurado) ou Incompleto (sem horrios
                                      definidos)
                                    </span>
                                  </div>

                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-max">?? Horrios:</span>

                                    <span>Número de perodos de agendamento configurados</span>
                                  </div>

                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-max">
                                      ?? til. Atualizao:
                                    </span>

                                    <span>
                                      Data da ltima modificao (importante para auditoria)
                                    </span>
                                  </div>

                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-max">Negociação:</span>

                                    <span>
                                      Preço especfico de um profissional (override) que difere do
                                      base
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <p className="text-xs text-gray-600 font-semibold mb-2">
                                    Para adicionar preços a este convênio:
                                  </p>

                                  <ol className="text-xs text-gray-600 space-y-1">
                                    <li>
                                      1. Base do Sistema ? <strong>Profissionais</strong>
                                    </li>

                                    <li>
                                      2. <strong>Editar</strong> um profissional
                                    </li>

                                    <li>
                                      3. Aba <strong>"Convênios"</strong> ? Adicionar este convênio
                                    </li>

                                    <li>
                                      4. <strong>Expandir serviço</strong> e informar o preço base
                                    </li>

                                    <li>
                                      5. Clicar em <strong>"Salvar"</strong>
                                    </li>
                                  </ol>
                                </div>
                              </div>
                            </>
                          )}

                          {/* End of pricing section */}
                        </div>
                    )}

                    {/* ABA: ENDEREÇO */}

                    {activeTab === 'address' && (
                      <FormSection icon="📍" title="Endereço" description="Localização do convênio">
                        {/* Rua + Número */}
                        <FormGrid columns={3}>
                          <div className="col-span-2">
                            <FormInput
                              type="text"
                              label="Rua"
                              placeholder="Ex: Avenida Paulista"
                              value={formData.address_street}
                              onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                              disabled={submitting}
                            />
                          </div>
                          <FormInput
                            type="text"
                            label="Número"
                            placeholder="Ex: 1000"
                            value={formData.address_number}
                            onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                            disabled={submitting}
                          />
                        </FormGrid>

                        {/* Bairro + CEP */}
                        <FormGrid columns={2}>
                          <FormInput
                            type="text"
                            label="Bairro"
                            placeholder="Ex: Bela Vista"
                            value={formData.address_neighborhood}
                            onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
                            disabled={submitting}
                          />
                          <FormInput
                            type="text"
                            label="CEP"
                            placeholder="Ex: 01311-100"
                            value={formData.address_zip_code}
                            onChange={(e) => setFormData({ ...formData, address_zip_code: e.target.value })}
                            disabled={submitting}
                          />
                        </FormGrid>

                        {/* Cidade + Estado + País */}
                        <FormGrid columns={3}>
                          <FormInput
                            type="text"
                            label="Cidade"
                            placeholder="Ex: São Paulo"
                            value={formData.address_city}
                            onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                            disabled={submitting}
                          />
                          <FormInput
                            type="text"
                            label="Estado"
                            placeholder="Ex: SP"
                            maxLength="2"
                            value={formData.address_state}
                            onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                            disabled={submitting}
                          />
                          <FormInput
                            type="text"
                            label="País"
                            placeholder="Ex: Brasil"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            disabled={submitting}
                          />
                        </FormGrid>
                      </FormSection>
                    )}

                    {/* ABA: FISCAL */}

                    {activeTab === 'fiscal' && (
                      <FormSection icon="🏛️" title="Identificação Fiscal" description="Dados de registros fiscais">
                        <FormGrid columns={2}>
                          <FormInput
                            type="text"
                            label="Inscrição Municipal"
                            placeholder="Ex: 123.456.789"
                            value={formData.municipal_registration}
                            onChange={(e) => setFormData({ ...formData, municipal_registration: e.target.value })}
                            disabled={submitting}
                          />
                          <FormInput
                            type="text"
                            label="Inscrição Estadual"
                            placeholder="Ex: 123.456.789.012"
                            value={formData.state_registration}
                            onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
                            disabled={submitting}
                          />
                        </FormGrid>
                      </FormSection>
                    )}

                    {/* ABA: FATURAMENTO */}

                    {activeTab === 'billing' && (
                      <FormSection icon="💰" title="Dados de Faturamento" description="Informações obrigatórias para faturamento e TISS">
                        {/* Registro ANS */}
                        <FormInput
                          type="text"
                          label="Registro ANS"
                          required
                          placeholder="Ex: 352.500"
                          hint="Número de registro na ANS (agência de seguros privados). Obrigatório para planos privados."
                          value={formData.registration_ans}
                          onChange={(e) => setFormData({ ...formData, registration_ans: e.target.value })}
                          disabled={submitting}
                        />

                        {/* TISS Pattern Checkbox */}
                        <FormCheckbox
                          id="tiss_pattern"
                          label="Segue padrão TISS"
                          checked={formData.tiss_pattern}
                          onChange={(e) => setFormData({ ...formData, tiss_pattern: e.target.checked })}
                          disabled={submitting}
                          color="blue"
                          hint="Recomendado para compatibilidade com operadoras"
                        />

                        {/* TISS Version + Guide Format */}
                        <FormGrid columns={2}>
                          <FormSelect
                            label="Versão TISS"
                            required
                            options={[
                              { value: '3.01.00', label: 'TISS 3.01.00' },
                              { value: '3.02.00', label: 'TISS 3.02.00' },
                              { value: '3.03.00', label: 'TISS 3.03.00' },
                              { value: '3.04.00', label: 'TISS 3.04.00' },
                              { value: '3.05.00', label: 'TISS 3.05.00 (Recomendado)' },
                              { value: '3.06.00', label: 'TISS 3.06.00' },
                            ]}
                            hint="Versão do padrão TISS utilizado pelo convênio"
                            value={formData.tiss_version}
                            onChange={(e) => setFormData({ ...formData, tiss_version: e.target.value })}
                            disabled={submitting}
                          />
                          <FormSelect
                            label="Formato de Guia"
                            options={[
                              { value: '', label: 'Selecione...' },
                              { value: 'consultation', label: 'Guia de Consulta' },
                              { value: 'sadt', label: 'Guia de SADT' },
                              { value: 'hospitalization', label: 'Guia de Internação' },
                            ]}
                            hint="Tipo padrão de guia para este convênio"
                            value={formData.guide_format}
                            onChange={(e) => setFormData({ ...formData, guide_format: e.target.value })}
                            disabled={submitting}
                          />
                        </FormGrid>

                        {/* DIVISOR VISUAL */}
                        <div className="border-t border-gray-300 my-6 pt-6">
                          <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-orange-300">
                            <span className="text-lg">📄</span> Configuração NF-e
                          </div>

                          <FormGrid columns={2}>
                            <FormInput
                              type="text"
                              label="Série NF-e"
                              placeholder="Ex: 1"
                              hint="Série de numeração para Notas Fiscais Eletrônicas"
                              value={formData.nfe_series || ''}
                              onChange={(e) => setFormData({ ...formData, nfe_series: e.target.value })}
                              disabled={submitting}
                            />
                            <FormInput
                              type="text"
                              label="CFM (Código Formatação Mensagem)"
                              placeholder="Ex: 01"
                              hint="Código que identifica formato/padrão de transmissão"
                              value={formData.cfm_code || ''}
                              onChange={(e) => setFormData({ ...formData, cfm_code: e.target.value })}
                              disabled={submitting}
                            />
                          </FormGrid>

                          <FormGrid columns={2}>
                            <FormCheckbox
                              id="is_simple_nacional"
                              label="Optante do Simples Nacional"
                              checked={formData.is_simple_nacional || false}
                              onChange={(e) => setFormData({ ...formData, is_simple_nacional: e.target.checked })}
                              disabled={submitting}
                              color="blue"
                              hint="Marcar se a operadora é optante do regime Simples Nacional"
                            />
                            <FormSelect
                              label="Indicador ICMS"
                              options={[
                                { value: '', label: 'Selecione...' },
                                { value: '0', label: '0 - ICMS não incidente' },
                                { value: '1', label: '1 - ICMS isento' },
                                { value: '2', label: '2 - ICMS retido' },
                                { value: '3', label: '3 - ICMS normal' },
                              ]}
                              hint="Situação do ICMS na operação"
                              value={formData.icms_indicator || ''}
                              onChange={(e) => setFormData({ ...formData, icms_indicator: e.target.value })}
                              disabled={submitting}
                            />
                          </FormGrid>
                        </div>

                        {/* DIVISOR VISUAL */}
                        <div className="border-t border-gray-300 my-6 pt-6">
                          <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-yellow-300">
                            <span className="text-lg">🧾</span> Configuração RPS (ISS)
                          </div>

                          <FormGrid columns={3}>
                            <FormInput
                              type="text"
                              label="Série RPS"
                              placeholder="Ex: A"
                              hint="Série de Recibos Provisórios de Serviços"
                              value={formData.rps_series || ''}
                              onChange={(e) => setFormData({ ...formData, rps_series: e.target.value })}
                              disabled={submitting}
                            />
                            <FormInput
                              type="number"
                              label="RPS Inicial"
                              placeholder="Ex: 1000"
                              hint="Número inicial da sequência RPS"
                              value={formData.rps_initial || ''}
                              onChange={(e) => setFormData({ ...formData, rps_initial: parseInt(e.target.value) || 0 })}
                              disabled={submitting}
                              min="1"
                            />
                            <FormSelect
                              label="Tipo de RPS"
                              options={[
                                { value: '', label: 'Selecione...' },
                                { value: '1', label: '1 - RPS Padrão' },
                                { value: '2', label: '2 - RPS por Fax' },
                                { value: '3', label: '3 - RPS por Email' },
                              ]}
                              hint="Meio de transmissão do RPS"
                              value={formData.rps_type || ''}
                              onChange={(e) => setFormData({ ...formData, rps_type: e.target.value })}
                              disabled={submitting}
                            />
                          </FormGrid>

                          <FormCheckbox
                            id="iss_retained"
                            label="ISS Retido na Fonte"
                            checked={formData.iss_retained || false}
                            onChange={(e) => setFormData({ ...formData, iss_retained: e.target.checked })}
                            disabled={submitting}
                            color="amber"
                            hint="Marcar se o ISS é retido na fonte pelo tomador"
                          />
                        </div>

                        {/* DIVISOR VISUAL */}
                        <div className="border-t border-gray-300 my-6 pt-6">
                          <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-purple-300">
                            <span className="text-lg">🔗</span> Configuração de Integração
                          </div>

                          <FormGrid columns={2}>
                            <FormSelect
                              label="Tipo de Beneficiário"
                              required
                              options={[
                                { value: '', label: 'Selecione...' },
                                { value: 'operator', label: 'Operadora de Saúde' },
                                { value: 'insurance', label: 'Seguradora' },
                                { value: 'third_party', label: 'Terceirizado' },
                                { value: 'direct', label: 'Pagamento Direto' },
                              ]}
                              hint="Qual o tipo de relacionamento com esta operadora"
                              value={formData.beneficiary_type || ''}
                              onChange={(e) => setFormData({ ...formData, beneficiary_type: e.target.value })}
                              disabled={submitting}
                            />
                            <FormInput
                              type="text"
                              label="Código de Serviço Municipal"
                              placeholder="Ex: 107"
                              hint="Código do serviço para integração com ISS municipal"
                              value={formData.municipal_service_code || ''}
                              onChange={(e) => setFormData({ ...formData, municipal_service_code: e.target.value })}
                              disabled={submitting}
                            />
                          </FormGrid>

                          <FormCheckbox
                            id="enable_nfe_generation"
                            label="Habilitar Geração de NF-e"
                            checked={formData.enable_nfe_generation || false}
                            onChange={(e) => setFormData({ ...formData, enable_nfe_generation: e.target.checked })}
                            disabled={submitting}
                            color="green"
                            hint="Ativar geração automática de Notas Fiscais Eletrônicas para esta operadora"
                          />
                        </div>

                        {/* DIVISOR VISUAL */}
                        <div className="border-t border-gray-300 my-6 pt-6">
                          <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-purple-300">
                            <span className="text-lg">🔐</span> Configuração TISS/ANS
                          </div>

                          {/* INFO BOX */}
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-purple-900">📋 Integração TISS</p>
                            <p className="text-xs text-purple-800 mt-1">
                              Preencha os dados para habilitar integração TISS com esta operadora. O Código ANS é obrigatório.
                            </p>
                          </div>

                          {/* Habilitar TISS */}
                          <FormCheckbox
                            id="tiss_enabled"
                            label="Habilitar TISS"
                            checked={formData.tiss_enabled || false}
                            onChange={(e) => setFormData({ ...formData, tiss_enabled: e.target.checked })}
                            disabled={submitting}
                            color="purple"
                            hint="Ativar integração TISS/ANS para submissão automática de guias"
                          />

                          {/* Campos TISS - mostrar apenas se habilitado */}
                          {formData.tiss_enabled && (
                            <div className="mt-4 space-y-4 bg-white p-4 rounded-lg border border-purple-200">
                              {/* Validação: ANS é obrigatório */}
                              {!formData.registration_ans?.trim() && (
                                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                                  ⚠️ <strong>Atenção:</strong> Código ANS (preenchido acima) é obrigatório quando TISS está habilitado.
                                </div>
                              )}

                              {/* Método de Submissão */}
                              <FormSelect
                                label="Método de Submissão"
                                required
                                options={[
                                  { value: 'HTTP', label: '🌐 HTTP API' },
                                  { value: 'SFTP', label: '📁 SFTP' },
                                  { value: 'PORTAL', label: '🌍 Web Portal' },
                                ]}
                                hint="Como as guias TISS serão enviadas"
                                value={formData.submission_method || 'HTTP'}
                                onChange={(e) => setFormData({ ...formData, submission_method: e.target.value })}
                                disabled={submitting}
                              />

                              {/* Endpoint TISS - mostrar apenas se HTTP */}
                              {formData.submission_method === 'HTTP' && (
                                <FormInput
                                  type="url"
                                  label="Endpoint TISS"
                                  required
                                  placeholder="Ex: https://api.unimed.com.br/tiss"
                                  hint="URL do servidor TISS da operadora"
                                  value={formData.tiss_endpoint || ''}
                                  onChange={(e) => setFormData({ ...formData, tiss_endpoint: e.target.value })}
                                  disabled={submitting}
                                />
                              )}

                              {/* Usuário TISS */}
                              <FormInput
                                type="text"
                                label="Usuário TISS"
                                required
                                placeholder="Usuário para autenticação"
                                hint="Login para acesso ao sistema TISS"
                                value={formData.tiss_username || ''}
                                onChange={(e) => setFormData({ ...formData, tiss_username: e.target.value })}
                                disabled={submitting}
                              />

                              {/* Senha TISS */}
                              <FormInput
                                type="password"
                                label="Senha TISS"
                                required
                                placeholder="Senha para autenticação"
                                hint="Será encriptada no servidor"
                                value={formData.tiss_password || ''}
                                onChange={(e) => setFormData({ ...formData, tiss_password: e.target.value })}
                                disabled={submitting}
                              />

                              {/* Email de Resposta */}
                              <FormInput
                                type="email"
                                label="Email para Respostas TISS"
                                placeholder="contato@clinica.com.br"
                                hint="Opcional: para receber notificações TISS"
                                value={formData.tiss_response_email || ''}
                                onChange={(e) => setFormData({ ...formData, tiss_response_email: e.target.value })}
                                disabled={submitting}
                              />
                            </div>
                          )}

                          {/* ===== PORTAL XML INTEGRATION ===== */}
                          <div className="mt-8 pt-6 border-t border-gray-200">
                            {/* Habilitar Portal XML */}
                            <FormCheckbox
                              id="enable_rps_generation"
                              label="Habilitar Integração Portal XML"
                              checked={formData.enable_rps_generation || false}
                              onChange={(e) => setFormData({ ...formData, enable_rps_generation: e.target.checked })}
                              disabled={submitting}
                              color="blue"
                              hint="Ativar integração com Portal XML para RPS e faturamento"
                            />

                            {/* Campos Portal XML - mostrar apenas se habilitado */}
                            {formData.enable_rps_generation && (
                              <div className="mt-4 space-y-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                                {/* Seção: Autenticação */}
                                <div>
                                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>🔐</span> Autenticação Portal
                                  </h4>
                                  <div className="space-y-3 bg-white p-3 rounded">
                                    <FormInput
                                      type="text"
                                      label="Usuário Portal"
                                      placeholder="Ex: user@domain.com"
                                      hint="Usuário para acesso ao Portal XML"
                                      value={formData.portal_username || ''}
                                      onChange={(e) => setFormData({ ...formData, portal_username: e.target.value })}
                                      disabled={submitting}
                                    />

                                    <FormInput
                                      type="password"
                                      label="Senha Portal"
                                      placeholder="••••••••"
                                      hint="Será encriptada no servidor"
                                      value={formData.portal_password || ''}
                                      onChange={(e) => setFormData({ ...formData, portal_password: e.target.value })}
                                      disabled={submitting}
                                    />

                                    <FormInput
                                      type="text"
                                      label="Chave de API Portal"
                                      placeholder="Ex: sk_live_xxx..."
                                      hint="Token de autenticação da API"
                                      value={formData.portal_api_key || ''}
                                      onChange={(e) => setFormData({ ...formData, portal_api_key: e.target.value })}
                                      disabled={submitting}
                                    />
                                  </div>
                                </div>

                                {/* Seção: Certificados */}
                                <div>
                                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>📜</span> Certificados
                                  </h4>
                                  <div className="space-y-3 bg-white p-3 rounded">
                                    <FormCheckbox
                                      id="use_certificate"
                                      label="Usar Certificado Digital"
                                      checked={formData.use_certificate !== false}
                                      onChange={(e) => setFormData({ ...formData, use_certificate: e.target.checked })}
                                      disabled={submitting}
                                      color="blue"
                                      hint="Requerido para submissões seguras"
                                    />

                                    {formData.use_certificate && (
                                      <>
                                        <FormInput
                                          type="text"
                                          label="Caminho do Certificado"
                                          placeholder="Ex: /certs/company.p12"
                                          hint="Caminho local ou URL para arquivo .p12/.pfx"
                                          value={formData.certificate_path || ''}
                                          onChange={(e) => setFormData({ ...formData, certificate_path: e.target.value })}
                                          disabled={submitting}
                                        />

                                        <FormInput
                                          type="password"
                                          label="Senha do Certificado"
                                          placeholder="••••••••"
                                          hint="Será encriptada no servidor"
                                          value={formData.certificate_password || ''}
                                          onChange={(e) => setFormData({ ...formData, certificate_password: e.target.value })}
                                          disabled={submitting}
                                        />
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Seção: Especificações Técnicas */}
                                <div>
                                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>⚙️</span> Especificações Técnicas
                                  </h4>
                                  <div className="space-y-3 bg-white p-3 rounded">
                                    <div className="grid grid-cols-2 gap-3">
                                      <FormSelect
                                        label="Formato Submissão"
                                        options={[
                                          { value: 'xml', label: '📄 XML' },
                                          { value: 'zip', label: '📦 ZIP' },
                                          { value: 'gzip', label: '🗜️ GZIP' },
                                        ]}
                                        value={formData.submission_format || 'xml'}
                                        onChange={(e) => setFormData({ ...formData, submission_format: e.target.value })}
                                        disabled={submitting}
                                      />

                                      <FormSelect
                                        label="Formato Resposta"
                                        options={[
                                          { value: 'xml', label: '📄 XML' },
                                          { value: 'json', label: '🔲 JSON' },
                                        ]}
                                        value={formData.response_format || 'xml'}
                                        onChange={(e) => setFormData({ ...formData, response_format: e.target.value })}
                                        disabled={submitting}
                                      />
                                    </div>

                                    <FormCheckbox
                                      id="use_compression"
                                      label="Usar Compressão"
                                      checked={formData.use_compression !== false}
                                      onChange={(e) => setFormData({ ...formData, use_compression: e.target.checked })}
                                      disabled={submitting}
                                      color="blue"
                                      hint="Reduz tamanho dos arquivos transmitidos"
                                    />

                                    <FormInput
                                      type="url"
                                      label="URL Webhook"
                                      placeholder="Ex: https://seu-dominio.com/webhooks/portal"
                                      hint="Para receber notificações em tempo real"
                                      value={formData.portal_webhook_url || ''}
                                      onChange={(e) => setFormData({ ...formData, portal_webhook_url: e.target.value })}
                                      disabled={submitting}
                                    />
                                  </div>
                                </div>

                                {/* Seção: Políticas de Submissão */}
                                <div>
                                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>📋</span> Políticas de Submissão
                                  </h4>
                                  <div className="space-y-3 bg-white p-3 rounded">
                                    <div className="grid grid-cols-2 gap-3">
                                      <FormInput
                                        type="number"
                                        label="Máximo de Submissões/Dia"
                                        placeholder="100"
                                        hint="Limite de envios por dia"
                                        value={formData.max_daily_submissions || 100}
                                        onChange={(e) => setFormData({ ...formData, max_daily_submissions: parseInt(e.target.value) || 100 })}
                                        disabled={submitting}
                                      />

                                      <FormInput
                                        type="number"
                                        label="Tamanho Máximo (MB)"
                                        placeholder="50"
                                        hint="Tamanho máximo arquivo"
                                        value={formData.max_file_size_mb || 50}
                                        onChange={(e) => setFormData({ ...formData, max_file_size_mb: parseInt(e.target.value) || 50 })}
                                        disabled={submitting}
                                      />
                                    </div>

                                    <FormInput
                                      type="number"
                                      label="Guias por Submissão"
                                      placeholder="500"
                                      hint="Máximo de guias em um arquivo"
                                      value={formData.max_guides_per_submission || 500}
                                      onChange={(e) => setFormData({ ...formData, max_guides_per_submission: parseInt(e.target.value) || 500 })}
                                      disabled={submitting}
                                    />

                                    <FormCheckbox
                                      id="requires_manual_confirmation"
                                      label="Requer Confirmação Manual"
                                      checked={formData.requires_manual_confirmation === true}
                                      onChange={(e) => setFormData({ ...formData, requires_manual_confirmation: e.target.checked })}
                                      disabled={submitting}
                                      color="blue"
                                      hint="Submissões precisam aprovação antes de enviar"
                                    />
                                  </div>
                                </div>

                                {/* Seção: Suporte */}
                                <div>
                                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>📞</span> Informações de Suporte
                                  </h4>
                                  <div className="space-y-3 bg-white p-3 rounded">
                                    <FormInput
                                      type="email"
                                      label="Email Suporte Portal"
                                      placeholder="suporte@portal.com.br"
                                      hint="Contato para problemas técnicos"
                                      value={formData.support_email || ''}
                                      onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                                      disabled={submitting}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                      <FormInput
                                        type="tel"
                                        label="Telefone Suporte"
                                        placeholder="(11) 9999-9999"
                                        hint="Contato telefônico para suporte"
                                        value={formData.support_phone || ''}
                                        onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                                        disabled={submitting}
                                      />

                                      <FormInput
                                        type="text"
                                        label="Horário de Funcionamento"
                                        placeholder="Ex: 08:00-18:00"
                                        hint="Formato: HH:MM-HH:MM ou 24h"
                                        value={formData.support_hours || '08:00-18:00'}
                                        onChange={(e) => setFormData({ ...formData, support_hours: e.target.value })}
                                        disabled={submitting}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Status da Conexão */}
                                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-gray-800">Status da Conexão Portal</h4>
                                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                                      formData.portal_connection_status === 'connected' ? 'bg-green-100 text-green-800' :
                                      formData.portal_connection_status === 'failed' ? 'bg-red-100 text-red-800' :
                                      formData.portal_connection_status === 'disconnected' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {formData.portal_connection_status === 'connected' && '✅ Conectado'}
                                      {formData.portal_connection_status === 'failed' && '❌ Falha'}
                                      {formData.portal_connection_status === 'disconnected' && '⚠️ Desconectado'}
                                      {formData.portal_connection_status === 'untested' && '❓ Não testado'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    Última atualização: {formData.portal_config_updated_at ? new Date(formData.portal_config_updated_at).toLocaleString() : 'Nunca'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </FormSection>
                    )}

                    {/* ABA: TRIBUTOS */}

                    {activeTab === 'taxes' && (
                      <FormSection icon="📊" title="Tributos" description="Configurações tributárias para NF-e e processamento de operadora">
                        {/* Informação Principal */}
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4 mb-6 shadow-sm">
                          <div className="flex gap-3">
                            <div className="text-2xl">📋</div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-blue-900">Configuração de Tributos e Encargos</p>
                              <p className="text-xs text-blue-800 mt-2">
                                Configure os regimes tributários e alíquotas que incidem sobre as operações com esta operadora. Os valores são utilizados para cálculo de margens, análise de rentabilidade e geração de relatórios financeiros.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Regime Tributário e Configuração Geral */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <FormSelect
                            label="Regime Tributário da Operadora"
                            options={[
                              { value: '', label: 'Selecione...' },
                              { value: 'Simples', label: 'Simples Nacional' },
                              { value: 'Lucro Real', label: 'Lucro Real' },
                              { value: 'Lucro Presumido', label: 'Lucro Presumido' },
                            ]}
                            value={formData.tax_regime}
                            onChange={(e) => setFormData({ ...formData, tax_regime: e.target.value })}
                            disabled={submitting}
                          />

                          <div className="flex items-end">
                            <FormCheckbox
                              id="retains_taxes"
                              label="Operadora retém impostos na fonte"
                              checked={formData.retains_taxes}
                              onChange={(e) => setFormData({ ...formData, retains_taxes: e.target.checked })}
                              disabled={submitting}
                              color="blue"
                            />
                          </div>
                        </div>

                        {/* Resumo de Carga Tributária */}
                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-8">
                          <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>📊</span> Resumo Estimado de Carga Tributária
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white border border-gray-200 rounded p-3 text-center">
                              <p className="text-xs text-gray-600 mb-1">Tributos Federais</p>
                              <p className="text-lg font-bold text-red-600">
                                {(parseFloat(formData.pis_rate || 0) + parseFloat(formData.cofins_rate || 0) + parseFloat(formData.inss_rate || 0) + parseFloat(formData.ir_rate || 0) + parseFloat(formData.csll_rate || 0)).toFixed(2)}%
                              </p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-3 text-center">
                              <p className="text-xs text-gray-600 mb-1">Tributos Estaduais</p>
                              <p className="text-lg font-bold text-orange-600">
                                {(parseFloat(formData.icms_rate || 0)).toFixed(2)}%
                              </p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-3 text-center">
                              <p className="text-xs text-gray-600 mb-1">Tributos Municipais</p>
                              <p className="text-lg font-bold text-yellow-600">
                                {(parseFloat(formData.iss_rate || 0) + parseFloat(formData.issrf_rate || 0)).toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* SEÇÃO: TRIBUTOS FEDERAIS */}
                        <div className="mb-8">
                          <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-red-300">
                            <span className="text-lg">🏛️</span> Tributos Federais
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* PIS Card */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:border-red-300 transition">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-red-900">PIS</p>
                                  <p className="text-xs text-red-700 mt-1">Programa de Integração Social</p>
                                </div>
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Federal</span>
                              </div>
                              <div className="bg-white rounded p-2 mb-3">
                                <p className="text-xs text-gray-600 mb-2">💡 Incide sobre faturamento. Alíquota típica: 1,65% a 2,76%</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.pis_applicable}
                                    onChange={(e) => setFormData({ ...formData, pis_applicable: e.target.checked })}
                                    disabled={submitting}
                                    className="rounded cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-700 flex-1">Aplicável</span>
                                  <input
                                    type="number"
                                    value={formData.pis_rate}
                                    onChange={(e) => setFormData({ ...formData, pis_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="1.65"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 px-2 py-1 border border-red-300 rounded text-xs"
                                    disabled={submitting || !formData.pis_applicable}
                                  />
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </div>
                              </div>
                            </div>

                            {/* COFINS Card */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:border-red-300 transition">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-red-900">COFINS</p>
                                  <p className="text-xs text-red-700 mt-1">Contribuição para Financiamento da Seguridade Social</p>
                                </div>
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Federal</span>
                              </div>
                              <div className="bg-white rounded p-2 mb-3">
                                <p className="text-xs text-gray-600 mb-2">💡 Incide sobre faturamento. Alíquota típica: 3% a 7,6%</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.cofins_applicable}
                                    onChange={(e) => setFormData({ ...formData, cofins_applicable: e.target.checked })}
                                    disabled={submitting}
                                    className="rounded cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-700 flex-1">Aplicável</span>
                                  <input
                                    type="number"
                                    value={formData.cofins_rate}
                                    onChange={(e) => setFormData({ ...formData, cofins_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="3.00"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 px-2 py-1 border border-red-300 rounded text-xs"
                                    disabled={submitting || !formData.cofins_applicable}
                                  />
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </div>
                              </div>
                            </div>

                            {/* INSS Card */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:border-red-300 transition">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-red-900">INSS</p>
                                  <p className="text-xs text-red-700 mt-1">Instituto Nacional de Seguridade Social</p>
                                </div>
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Federal</span>
                              </div>
                              <div className="bg-white rounded p-2 mb-3">
                                <p className="text-xs text-gray-600 mb-2">💡 Contribuição previdenciária. Alíquota: 20% em média (para pessoas jurídicas)</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.inss_applicable}
                                    onChange={(e) => setFormData({ ...formData, inss_applicable: e.target.checked })}
                                    disabled={submitting}
                                    className="rounded cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-700 flex-1">Aplicável</span>
                                  <input
                                    type="number"
                                    value={formData.inss_rate}
                                    onChange={(e) => setFormData({ ...formData, inss_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="20.00"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 px-2 py-1 border border-red-300 rounded text-xs"
                                    disabled={submitting || !formData.inss_applicable}
                                  />
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </div>
                              </div>
                            </div>

                            {/* IR Card */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:border-red-300 transition">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-red-900">IR</p>
                                  <p className="text-xs text-red-700 mt-1">Imposto de Renda Pessoa Jurídica</p>
                                </div>
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Federal</span>
                              </div>
                              <div className="bg-white rounded p-2 mb-3">
                                <p className="text-xs text-gray-600 mb-2">💡 Imposto sobre renda. Alíquota: 3% a 34% (conforme regime e lucro)</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.ir_applicable}
                                    onChange={(e) => setFormData({ ...formData, ir_applicable: e.target.checked })}
                                    disabled={submitting}
                                    className="rounded cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-700 flex-1">Aplicável</span>
                                  <input
                                    type="number"
                                    value={formData.ir_rate}
                                    onChange={(e) => setFormData({ ...formData, ir_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="15.00"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 px-2 py-1 border border-red-300 rounded text-xs"
                                    disabled={submitting || !formData.ir_applicable}
                                  />
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </div>
                              </div>
                            </div>

                            {/* CSLL Card */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:border-red-300 transition">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-red-900">CSLL</p>
                                  <p className="text-xs text-red-700 mt-1">Contribuição Social sobre Lucro Líquido</p>
                                </div>
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Federal</span>
                              </div>
                              <div className="bg-white rounded p-2 mb-3">
                                <p className="text-xs text-gray-600 mb-2">💡 Contribuição sobre lucro. Alíquota: 7% a 9% (conforme regime de apuração)</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.csll_applicable}
                                    onChange={(e) => setFormData({ ...formData, csll_applicable: e.target.checked })}
                                    disabled={submitting}
                                    className="rounded cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-700 flex-1">Aplicável</span>
                                  <input
                                    type="number"
                                    value={formData.csll_rate}
                                    onChange={(e) => setFormData({ ...formData, csll_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="9.00"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 px-2 py-1 border border-red-300 rounded text-xs"
                                    disabled={submitting || !formData.csll_applicable}
                                  />
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SEÇÃO: TRIBUTOS ESTADUAIS */}
                        <div className="mb-8">
                          <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-orange-300">
                            <span className="text-lg">🏢</span> Tributos Estaduais
                          </div>

                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:border-orange-300 transition">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-bold text-sm text-orange-900">ICMS</p>
                                <p className="text-xs text-orange-700 mt-1">Imposto sobre Circulação de Mercadorias e Serviços</p>
                              </div>
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold">Estadual</span>
                            </div>
                            <div className="bg-white rounded p-2 mb-3">
                              <p className="text-xs text-gray-600 mb-2">💡 Varia por estado. Serviços de saúde: geralmente isento ou 0%. Variar conforme estado: SP ~7%, RJ ~20%</p>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="checkbox"
                                  checked={formData.icms_applicable}
                                  onChange={(e) => setFormData({ ...formData, icms_applicable: e.target.checked })}
                                  disabled={submitting}
                                  className="rounded cursor-pointer"
                                />
                                <span className="text-xs text-gray-700 flex-1">Aplicável</span>
                                <input
                                  type="number"
                                  value={formData.icms_rate}
                                  onChange={(e) => setFormData({ ...formData, icms_rate: parseFloat(e.target.value) || 0 })}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  className="w-20 px-2 py-1 border border-orange-300 rounded text-xs"
                                  disabled={submitting || !formData.icms_applicable}
                                />
                                <span className="text-xs font-semibold text-gray-700">%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SEÇÃO: TRIBUTOS MUNICIPAIS */}
                        <div className="mb-8">
                          <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-yellow-300">
                            <span className="text-lg">🏛️</span> Tributos Municipais
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* ISS Card */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:border-yellow-300 transition">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-yellow-900">ISS</p>
                                  <p className="text-xs text-yellow-700 mt-1">Imposto sobre Serviços</p>
                                </div>
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">Municipal</span>
                              </div>
                              <div className="bg-white rounded p-2 mb-3">
                                <p className="text-xs text-gray-600 mb-2">💡 Varia por município. Alíquota típica: 2% a 5% (Saúde: pode ter isenção/redução)</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.iss_applicable}
                                    onChange={(e) => setFormData({ ...formData, iss_applicable: e.target.checked })}
                                    disabled={submitting}
                                    className="rounded cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-700 flex-1">Aplicável</span>
                                  <input
                                    type="number"
                                    value={formData.iss_rate}
                                    onChange={(e) => setFormData({ ...formData, iss_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="2.00"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 px-2 py-1 border border-yellow-300 rounded text-xs"
                                    disabled={submitting || !formData.iss_applicable}
                                  />
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </div>
                              </div>
                            </div>

                            {/* ISSRF Card */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:border-yellow-300 transition">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-yellow-900">ISSRF</p>
                                  <p className="text-xs text-yellow-700 mt-1">Imposto sobre Serviços Retido na Fonte</p>
                                </div>
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">Federal</span>
                              </div>
                              <div className="bg-white rounded p-2 mb-3">
                                <p className="text-xs text-gray-600 mb-2">💡 Retenção de ISS. Alíquota: 3% a 5% quando a operadora retém na fonte</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.issrf_applicable}
                                    onChange={(e) => setFormData({ ...formData, issrf_applicable: e.target.checked })}
                                    disabled={submitting}
                                    className="rounded cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-700 flex-1">Aplicável</span>
                                  <input
                                    type="number"
                                    value={formData.issrf_rate}
                                    onChange={(e) => setFormData({ ...formData, issrf_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 px-2 py-1 border border-yellow-300 rounded text-xs"
                                    disabled={submitting || !formData.issrf_applicable}
                                  />
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SEÇÃO: REFORMA TRIBUTÁRIA (BETA) */}
                        <div className="border-t-2 border-yellow-300 pt-8 mt-8">
                          <div className="text-sm font-bold text-yellow-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-yellow-300">
                            <span className="text-lg">🧪</span> Reforma Tributária (BETA - Em Testes)
                          </div>

                          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-400 rounded-lg p-4 mb-6">
                            <p className="text-xs text-yellow-900 flex items-start gap-2">
                              <span className="text-lg">⚠️</span>
                              <span><strong>Importante:</strong> Os tributos abaixo estão em fase de testes e validação. Ainda não devem ser usados para cálculos de margens em produção. Acompanhe as atualizações legislativas.</span>
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* IBS Card */}
                            <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 opacity-80">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-yellow-900">IBS</p>
                                  <p className="text-xs text-yellow-800 mt-1">Imposto sobre Bens e Serviços</p>
                                </div>
                                <span className="bg-yellow-200 text-yellow-900 px-2 py-1 rounded text-xs font-bold">BETA</span>
                              </div>
                              <div className="bg-white bg-opacity-70 rounded p-2 mb-3">
                                <p className="text-xs text-gray-700 mb-2">📌 Previsto para substituir ICMS, PIS, COFINS e IPI. Ainda em discussão legislativa.</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.ibs_applicable}
                                    onChange={(e) => setFormData({ ...formData, ibs_applicable: e.target.checked })}
                                    disabled={submitting}
                                    className="rounded cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-700 flex-1">Testar</span>
                                  <input
                                    type="number"
                                    value={formData.ibs_rate}
                                    onChange={(e) => setFormData({ ...formData, ibs_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 px-2 py-1 border border-yellow-400 rounded text-xs bg-yellow-50"
                                    disabled={submitting || !formData.ibs_applicable}
                                  />
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </div>
                              </div>
                            </div>

                            {/* CBS Card */}
                            <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 opacity-80">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-yellow-900">CBS</p>
                                  <p className="text-xs text-yellow-800 mt-1">Contribuição sobre Bens e Serviços</p>
                                </div>
                                <span className="bg-yellow-200 text-yellow-900 px-2 py-1 rounded text-xs font-bold">BETA</span>
                              </div>
                              <div className="bg-white bg-opacity-70 rounded p-2 mb-3">
                                <p className="text-xs text-gray-700 mb-2">📌 Contribuição social no modelo da reforma. Ainda em negociação legislativa.</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.cbs_applicable}
                                    onChange={(e) => setFormData({ ...formData, cbs_applicable: e.target.checked })}
                                    disabled={submitting}
                                    className="rounded cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-700 flex-1">Testar</span>
                                  <input
                                    type="number"
                                    value={formData.cbs_rate}
                                    onChange={(e) => setFormData({ ...formData, cbs_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 px-2 py-1 border border-yellow-400 rounded text-xs bg-yellow-50"
                                    disabled={submitting || !formData.cbs_applicable}
                                  />
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </FormSection>
                    )}

                    {/* ABA: FINANCEIRO */}

                    {activeTab === 'financial' && (
                      <div className="space-y-6" lang="pt-BR">
                        {/* SEÇÃO 1: CONDIÇÕES COMERCIAIS */}
                        <FormSection icon="💳" title="Condições Comerciais" description="Descontos, margens e taxas">
                          <FormGrid columns={2}>
                            <FormInput
                              type="number"
                              label="Desconto (%)"
                              placeholder="0.00"
                              min="0"
                              max="100"
                              step="0.01"
                              hint="Desconto padrão do convênio"
                              value={formData.discount_percentage}
                              onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                              disabled={submitting}
                            />
                            <FormInput
                              type="number"
                              label="Margem Mínima (%)"
                              placeholder="0.00"
                              min="0"
                              max="100"
                              step="0.01"
                              hint="Margem mínima aceitável"
                              value={formData.minimum_margin_percentage}
                              onChange={(e) => setFormData({ ...formData, minimum_margin_percentage: parseFloat(e.target.value) || 0 })}
                              disabled={submitting}
                            />
                            <FormInput
                              type="number"
                              label="Taxa de Administração (%)"
                              placeholder="0.00"
                              min="0"
                              max="100"
                              step="0.01"
                              hint="Taxa cobrada pelo convênio"
                              value={formData.administration_fee_percentage}
                              onChange={(e) => setFormData({ ...formData, administration_fee_percentage: parseFloat(e.target.value) || 0 })}
                              disabled={submitting}
                            />
                            <FormInput
                              type="number"
                              label="Desconto Pronta Pagamento (%)"
                              placeholder="0.00"
                              min="0"
                              max="100"
                              step="0.01"
                              hint="Se pagar antecipado"
                              value={formData.early_payment_discount_percentage}
                              onChange={(e) => setFormData({ ...formData, early_payment_discount_percentage: parseFloat(e.target.value) || 0 })}
                              disabled={submitting}
                            />
                            <FormInput
                              type="number"
                              label="Desconto por Volume (%)"
                              placeholder="0.00"
                              min="0"
                              max="100"
                              step="0.01"
                              hint="Acordo de volume"
                              value={formData.volume_discount_percentage}
                              onChange={(e) => setFormData({ ...formData, volume_discount_percentage: parseFloat(e.target.value) || 0 })}
                              disabled={submitting}
                            />
                          </FormGrid>
                        </FormSection>

                        {/* SEO 2: PRAZOS E PAGAMENTO */}

                        <div className="border-b pb-6">
                          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                              ⏱️
                            </span>
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

                              <p className="text-xs text-gray-500 mt-1">
                                Dias até vencimento (ex: 30, 45, 60)
                              </p>
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

                              <p className="text-xs text-gray-500 mt-1">
                                De ___ até ___ de cada mês
                              </p>
                            </div>

                            {/* Formas de Pagamento */}

                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Formas de Pagamento Aceitas
                              </label>

                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { id: 'debit', label: 'Débito Automático' },

                                  { id: 'boleto', label: 'Boleto' },

                                  { id: 'ted', label: 'TED' },

                                  { id: 'pix', label: 'PIX' },
                                ].map((method) => (
                                  <label key={method.id} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={
                                        formData.accepted_payment_methods?.includes(method.id) ||
                                        false
                                      }
                                      onChange={(e) =>
                                        setFormData({
                                          ...formData,

                                          accepted_payment_methods: e.target.checked
                                            ? [
                                                ...(formData.accepted_payment_methods || []),
                                                method.id,
                                              ]
                                            : (formData.accepted_payment_methods || []).filter(
                                                (m) => m !== method.id,
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

                        {/* SEO 3: REAJUSTES */}

                        <div className="border-b pb-6">
                          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                              📊
                            </span>
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

                              <p className="text-xs text-gray-500 mt-1">
                                Índice para reajuste anual
                              </p>
                            </div>

                            {/* Mês de Reajuste Anual */}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mês de Reajuste Anual
                              </label>

                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="mm/yyyy"
                                lang="pt-BR"
                                value={formatMonthDisplay(formData.annual_reajustment_date)}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
                                  if (val.length === 7) {
                                    const [month, year] = val.split('/');
                                    const isoDate = `${year}-${month}`;
                                    setFormData({...formData, annual_reajustment_date: isoDate});
                                  } else {
                                    setFormData({...formData, annual_reajustment_date: val});
                                  }
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                disabled={submitting}
                              />

                              <p className="text-xs text-gray-500 mt-1">
                                Quando ocorre a atualização
                              </p>
                            </div>

                            {/* Próxima Data de Reajuste */}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Próxima Data de Reajuste
                              </label>

                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="dd/mm/yyyy"
                                value={formatDateDisplay(formData.next_reajustment_date)}
                                onChange={(e) => {
                                  // Format: accept dd/mm/yyyy and convert to yyyy-mm-dd
                                  let val = e.target.value.replace(/\D/g, '');
                                  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
                                  if (val.length >= 5) val = val.substring(0, 5) + '/' + val.substring(5, 9);
                                  // Convert dd/mm/yyyy to yyyy-mm-dd for storage
                                  if (val.length === 10) {
                                    const [day, month, year] = val.split('/');
                                    const isoDate = `${year}-${month}-${day}`;
                                    setFormData({...formData, next_reajustment_date: isoDate});
                                  } else {
                                    setFormData({...formData, next_reajustment_date: val});
                                  }
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                disabled={submitting}
                              />

                              <p className="text-xs text-gray-500 mt-1">Para controle/avaliação</p>
                            </div>
                          </div>
                        </div>

                        {/* SEO 4: VIGÊNCIA DO CONTRATO */}

                        <div className="border-b pb-6">
                          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">
                              📅
                            </span>
                            Vigência do Contrato
                          </h3>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Data de Início */}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data de Início <span className="text-red-500">*</span>
                              </label>

                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="dd/mm/yyyy"
                                value={formatDateDisplay(formData.contract_start_date)}
                                onChange={(e) => {
                                  // Format: accept dd/mm/yyyy and convert to yyyy-mm-dd
                                  let val = e.target.value.replace(/\D/g, '');
                                  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
                                  if (val.length >= 5) val = val.substring(0, 5) + '/' + val.substring(5, 9);
                                  // Convert dd/mm/yyyy to yyyy-mm-dd for storage
                                  if (val.length === 10) {
                                    const [day, month, year] = val.split('/');
                                    const isoDate = `${year}-${month}-${day}`;
                                    setFormData({...formData, contract_start_date: isoDate});
                                  } else {
                                    setFormData({...formData, contract_start_date: val});
                                  }
                                }}
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
                                type="text"
                                inputMode="numeric"
                                placeholder="dd/mm/yyyy"
                                value={formatDateDisplay(formData.contract_end_date)}
                                onChange={(e) => {
                                  // Format: accept dd/mm/yyyy and convert to yyyy-mm-dd
                                  let val = e.target.value.replace(/\D/g, '');
                                  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
                                  if (val.length >= 5) val = val.substring(0, 5) + '/' + val.substring(5, 9);
                                  // Convert dd/mm/yyyy to yyyy-mm-dd for storage
                                  if (val.length === 10) {
                                    const [day, month, year] = val.split('/');
                                    const isoDate = `${year}-${month}-${day}`;
                                    setFormData({...formData, contract_end_date: isoDate});
                                  } else {
                                    setFormData({...formData, contract_end_date: val});
                                  }
                                }}
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

                            {/* Dias Aviso Prvio */}

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

                        {/* SEO 5: POLÍTICA DE SUSPENSÃO E MULTAS */}

                        <div className="border-b pb-6">
                          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                              ⛔
                            </span>
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
                                Taxa de Juros Diria (%)
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

                              <p className="text-xs text-gray-500 mt-1">Taxa diria de juros</p>
                            </div>
                          </div>
                        </div>

                        {/* SEO 6: LIMITES E TETOS */}

                        <div className="border-b pb-6">
                          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                              📏
                            </span>
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
                                value={formData.monthly_billing_ceiling || ''}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,

                                    monthly_billing_ceiling: e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
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
                                value={formData.consultation_limit || ''}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,

                                    consultation_limit: e.target.value
                                      ? parseInt(e.target.value)
                                      : null,
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
                                value={formData.copayment_value || ''}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,

                                    copayment_value: e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  })
                                }
                                min="0"
                                step="0.01"
                                placeholder="Sem co-participação"
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                disabled={submitting}
                              />

                              <p className="text-xs text-gray-500 mt-1">
                                Valor mínimo que o paciente paga
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* SEO 7: CONTATOS FINANCEIROS E DADOS BANCÁRIOS */}

                        <div>
                          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="bg-cyan-100 text-cyan-700 px-2 py-1 rounded text-xs">
                              🏦
                            </span>
                            Contatos Financeiros e Dados Bancários
                          </h3>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Responsável Financeiro */}

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
                                placeholder="Ex: Ita, Bradesco"
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

                    {activeTab === 'plans' && (
                      <FormSection icon="🏥" title="Planos de Saúde" description="Gerenciar planos vinculados ao convênio">
                        <div className="space-y-4">
                          {(editingId || showForm) && (
                            <button
                              type="button"
                              onClick={() => setShowNewPlanForm(!showNewPlanForm)}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                            >
                              <Plus size={16} />
                              Novo Plano
                            </button>
                          )}

                          {/* Form Criar Novo Plano */}

                          {showNewPlanForm && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
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
                                    placeholder="Código do plano (para vincular  agenda)"
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

                                      setNewPlanName('');

                                      setNewPlanDescription('');
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
                            <p className="text-gray-500 text-sm text-center py-4">
                              Carregando planos...
                            </p>
                          ) : plansData.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-gray-500 mb-2">Nenhum plano cadastrado</p>

                              <p className="text-xs text-gray-400">
                                Clique em "Novo Plano" para adicionar
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {plansData.map((plan) => (
                                <div key={plan.id}>
                                  {editingPlanId === plan.id ? (
                                    <div className="bg-blue-50 p-4 rounded-lg mb-3 border border-blue-200">
                                      <h4 className="font-medium text-gray-900 mb-3">
                                        Editar Plano
                                      </h4>

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
                                            placeholder="Código do plano (para vincular  agenda)"
                                            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                          />

                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingPlanCode(generatePlanCode(editingPlanName))
                                            }
                                            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium whitespace-nowrap"
                                          >
                                            Gerar
                                          </button>
                                        </div>

                                        <textarea
                                          value={editingPlanDescription}
                                          onChange={(e) =>
                                            setEditingPlanDescription(e.target.value)
                                          }
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

                                          <label
                                            htmlFor={`plan-active-${editingPlanId}`}
                                            className="text-sm font-medium text-gray-700"
                                          >
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
                                    <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900">{plan.name}</p>

                                        {plan.code && (
                                          <p className="text-xs text-blue-600 font-mono mt-1">
                                            Código: {plan.code}
                                          </p>
                                        )}

                                        {plan.description && (
                                          <p className="text-sm text-gray-500 mt-1">
                                            {plan.description}
                                          </p>
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
                      </FormSection>
                    )}
                  </div>
                </form>
              </CardContent>

              {/* Footer com Botes de Ao - Fica Fixo */}

              <div className="border-t bg-white px-6 py-4 flex gap-3" style={{ flexShrink: 0 }}>
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
                  {submitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
