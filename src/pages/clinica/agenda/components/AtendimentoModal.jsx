import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, ChevronRight, CheckCircle, Edit2, Calendar, Clock, User, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { APPOINTMENT_STATUS } from '@/lib/appointmentStatusEnums';
import { migrateStatus, SERVICE_STATUSES, getStatusLabelOnly } from '@/lib/appointmentStatusConstants';
import { createAR } from '@/lib/financeApi';
import { logAppointmentFinancialAudit, FINANCIAL_EVENT_TYPES } from '@/lib/auditFinancialApi';

// 💳 Função para formatar nome da forma de pagamento
const formatPaymentMethod = (method) => {
  const paymentNames = {
    'DINHEIRO': 'Dinheiro',
    'CARTAO': 'Cartão',
    'PIX': 'PIX',
    'CHEQUE': 'Cheque',
    'BOLETO': 'Boleto'
  };
  return paymentNames[method?.toUpperCase()] || method || '';
};

/**
 * AtendimentoModal - Tela de atendimento com abas
 * Abas em sequência lógica:
 * 1. Dados Cadastrais (atualizar info do paciente)
 * 2. Liberação (validar convênio, carteirinha, autorização)
 * 3. Faturamento (serviço, médico, guia, valores)
 */
export default function AtendimentoModal({
  isOpen,
  onClose,
  appointment,
  arrivals,
  onArrivalsUpdate,
  onSuccess,
}) {
  const navigate = useNavigate();
  const { clinicId } = useClinicContext();
  const [tabAtivo, setTabAtivo] = useState('cadastrais');
  const [loading, setLoading] = useState(false);
  const [checkInCompleted, setCheckInCompleted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successMessageVisible, setSuccessMessageVisible] = useState(false);
  
  // Dados Cadastrais (Padrão TISS)
  const [cadastralData, setCadastralData] = useState({
    name: '',
    document_id: '',
    birthdate: '',
    gender: '',
    phone: '',
    cell_phone: '',
    email: '',
    // Endereço (TISS obrigatório)
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
  });

  // Validação de campos TISS
  const [cadastralStatus, setCadastralStatus] = useState({
    complete: false,
    missing: [],
  });

  // Liberação (Padrão TISS)
  const [liberacaoData, setLiberacaoData] = useState({
    payer_name: '',
    plan_name: '',
    plan_code: '',
    card_number: '', // Matrícula do beneficiário
    requires_auth: 'no', // yes/no para saber se requer autorização
    auth_number: '',
    auth_expiry: '',
    auth_status: 'approved', // approved, partial, pending, denied
    authorized: false,
  });

  // Faturamento (Padrão TISS XML)
  const [faturamentoData, setFaturamentoData] = useState({
    service_name: '',
    guide_type: 'consulta',
    code_type: 'tuss',
    procedure_code: '',
    service_date: '',
    service_place: '',
    requesting_doctor: '',
    responsible_doctor: '',
    guide_number: '',
    estimated_value: '',
    authorized_value: '',
    discount: 0, // 💰 DESCONTO AUTORIZADO
    discount_reason: '', // Motivo do desconto
    notes: '',
  });

  // Pagamento no Balcão
  const [pagamentoData, setPagamentoData] = useState({
    payment_method: '', // DINHEIRO, CARTAO, PIX, CHEQUE, BOLETO
    amount_paid: '',
    change: '',
    receipt_number: '',
    notes: '',
    // Específico para DINHEIRO
    cedulas: [], // Array de {valor, quantidade}
    // Específico para CARTAO
    card_last_digits: '',
    card_brand: '', // VISA, MASTERCARD, ELO, AMEX, etc
    card_installments: '1',
    // Específico para PIX
    pix_identifier: '', // Chave PIX
    pix_transaction_id: '',
    pix_timestamp: '',
    // Específico para CHEQUE
    check_bank: '',
    check_agency: '',
    check_account: '',
    check_number: '',
    check_due_date: '',
    // Específico para BOLETO
    boleto_number: '',
    boleto_due_date: '',
    boleto_bank: '',
  });

  // 💰 Informações de Registro e Caixa
  const [registroData, setRegistroData] = useState({
    receivableId: null,
    receivableStatus: 'não criada',
    registeredAt: null,
    registeredBy: null,
    operationHash: null, // Para rastreamento
    arValue: 0,
    paymentMethod: '',
    cashFlowRegistered: false,
  });

  // Carregar dados do paciente quando modal abre
  useEffect(() => {
    if (isOpen && appointment) {
      setLoading(false); // 🔄 Resetar loading
      // ⚠️ NÃO resetar tabAtivo aqui - vamos determinar na função loadPatientData
      loadPatientData();
    }
  }, [isOpen, appointment]);

  // 🔄 Função para recarregar dados do appointment após auto-save
  const refreshAppointmentData = async () => {
    try {
      console.log('🔄 Recarregando dados do appointment...');
      const { data: freshData, error } = await supabase
        .from('appointments')
        .select('discount, authorization_number, authorization_expiry, card_number, card_brand, card_last_digits, card_installments, payment_method, notes')
        .eq('id', appointment.id)
        .single();
      
      if (!error && freshData) {
        console.log('✅ Dados recarregados com sucesso:', freshData);
        
        // Atualizar states com dados frescos
        if (freshData.discount) {
          setFaturamentoData(prev => ({
            ...prev,
            discount: parseFloat(freshData.discount || 0),
            notes: freshData.notes || prev.notes,
          }));
        }
        
        if (freshData.authorization_number || freshData.authorization_expiry) {
          setLiberacaoData(prev => ({
            ...prev,
            auth_number: freshData.authorization_number || prev.auth_number,
            auth_expiry: freshData.authorization_expiry || prev.auth_expiry,
          }));
        }
        
        if (freshData.card_number) {
          setLiberacaoData(prev => ({
            ...prev,
            card_number: freshData.card_number
          }));
        }
        
        if (freshData.payment_method) {
          setPagamentoData(prev => ({
            ...prev,
            payment_method: freshData.payment_method,
            card_brand: freshData.card_brand || prev.card_brand,
            card_last_digits: freshData.card_last_digits || prev.card_last_digits,
            card_installments: (freshData.card_installments?.toString() || prev.card_installments),
          }));
        }
      }
    } catch (err) {
      console.warn('⚠️ Erro ao recarregar dados:', err.message);
    }
  };

  const loadPatientData = async () => {
    try {
      if (!appointment || !appointment.patient_id) return;

      // 🔄 Primeiro, recarregar DATA MAIS RECENTE do appointment do banco
      console.log('🔄 Carregando dados mais recentes do appointment...');
      let appointmentFresh = appointment; // Fallback: usar o appointment original
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointment.id)
        .single();

      if (!appointmentError && appointmentData) {
        appointmentFresh = appointmentData;
        console.log('✅ Dados frescos carregados:', {
          card_number: appointmentFresh.card_number,
          authorization_number: appointmentFresh.authorization_number,
          authorization_expiry: appointmentFresh.authorization_expiry,
          guide_number: appointmentFresh.guide_number,
          payment_method: appointmentFresh.payment_method,
          card_brand: appointmentFresh.card_brand,
          card_last_digits: appointmentFresh.card_last_digits,
          card_installments: appointmentFresh.card_installments,
          discount: appointmentFresh.discount,
          notes: appointmentFresh.notes,
        });
      } else {
        console.warn('⚠️ Usando dados do appointment original (não conseguiu recarregar):', appointmentError?.message);
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', appointment.patient_id)
        .single();

      if (error) throw error;

      // Carregar dados do cadastro do paciente
      const patientData = {
        name: data?.name || data?.full_name || '',
        document_id: data?.document_id || data?.cpf || '',
        birthdate: data?.birthdate || data?.birth_date || '',
        gender: data?.gender || '',
        phone: data?.phone || '',
        cell_phone: data?.cell_phone || '',
        email: data?.email || '',
        street: data?.street || '',
        number: data?.number || '',
        neighborhood: data?.neighborhood || '',
        city: data?.city || '',
        state: data?.state || '',
        zip_code: data?.zip_code || '',
      };

      setCadastralData(patientData);

      // 🔍 Validar campos obrigatórios TISS
      const requiredFields = [
        ['name', 'Nome Completo'],
        ['document_id', 'CPF'],
        ['birthdate', 'Data de Nascimento'],
        ['gender', 'Sexo'],
        ['email', 'Email'],
        ['phone', 'Telefone'],
        ['street', 'Rua'],
        ['number', 'Número'],
        ['neighborhood', 'Bairro'],
        ['city', 'Cidade'],
        ['state', 'Estado'],
        ['zip_code', 'CEP'],
      ];

      const missing = requiredFields
        .filter(([field, label]) => !patientData[field] || patientData[field].toString().trim() === '')
        .map(([field, label]) => label);

      setCadastralStatus({
        complete: missing.length === 0,
        missing: missing,
      });

      // 🔥 Buscar o valor correto baseado em convênio + plano + serviço
      let estimatedValue = appointment.value || '0';
      
      if (appointment.payer_id && appointment.service_id) {
        try {
          // Buscar preço específico do serviço para este convênio
          const { data: priceData, error: priceError } = await supabase
            .from('service_prices')
            .select('price')
            .eq('payer_id', appointment.payer_id)
            .eq('service_id', appointment.service_id)
            .maybeSingle();

          if (!priceError && priceData && priceData.price) {
            estimatedValue = priceData.price;
          } else {
            // Se não encontrar, buscar preço padrão do serviço
            const { data: serviceData, error: serviceError } = await supabase
              .from('services')
              .select('default_price, default_duration_minutes')
              .eq('id', appointment.service_id)
              .maybeSingle();

            if (!serviceError && serviceData && serviceData.default_price) {
              estimatedValue = serviceData.default_price;
            }
          }
        } catch (err) {
          console.warn('Erro ao buscar valor do serviço:', err);
        }
      }

      // Preencher dados de liberação (com valores salvos anteriormente se existirem)
      // 🔑 USAR OS DADOS FRESCOS DO BANCO se disponíveis
      const freshCardNumber = appointmentFresh?.card_number || appointment.card_number || '';
      const freshAuthNumber = appointmentFresh?.authorization_number || appointment.authorization_number || '';
      const freshAuthExpiry = appointmentFresh?.authorization_expiry || appointment.authorization_expiry || '';

      setLiberacaoData({
        payer_name: appointment.payers?.name || '',
        plan_name: appointment.plans?.name || '',
        plan_code: appointment.plans?.code || '',
        card_number: freshCardNumber,
        requires_auth: freshAuthNumber ? 'yes' : 'no',
        auth_number: freshAuthNumber,
        auth_expiry: freshAuthExpiry,
        auth_status: 'approved',
        authorized: !!freshAuthNumber,
      });

      // Preencher dados de faturamento (com valores salvos anteriormente se existirem)
      // 🔑 USAR OS DADOS FRESCOS DO BANCO se disponíveis
      const freshGuideNumber = appointmentFresh?.guide_number || appointment.guide_number || '';
      let freshBillingData = {};
      try {
        if (appointmentFresh?.billing_data) {
          freshBillingData = JSON.parse(appointmentFresh.billing_data);
          console.log('✅ billing_data carregado do appointmentFresh:', freshBillingData);
        } else if (appointment.billing_data) {
          freshBillingData = JSON.parse(appointment.billing_data);
          console.log('✅ billing_data carregado do appointment:', freshBillingData);
        }
      } catch (parseErr) {
        console.warn('⚠️ Erro ao parsear billing_data:', parseErr);
        freshBillingData = {};
      }

      console.log('🔍 Dados para preencher faturamento:', {
        service_place_fresh: freshBillingData?.service_place,
        requesting_doctor_fresh: freshBillingData?.requesting_doctor,
        service_place_appointment: appointment.service_place,
        requesting_doctor_appointment: appointment.requesting_doctor,
      });

      setFaturamentoData({
        service_name: appointment.services?.name || '',
        guide_type: freshBillingData?.guide_type || 'consulta',
        code_type: freshBillingData?.code_type || 'tuss',
        procedure_code: freshBillingData?.procedure_code || appointment.services?.tuss_code || '', // 🔗 Puxar código TUSS do serviço
        service_date: freshBillingData?.service_date || appointment.scheduled_date || '',
        service_place: freshBillingData?.service_place || appointment.service_place || '',
        requesting_doctor: freshBillingData?.requesting_doctor || appointment.requesting_doctor || '',
        responsible_doctor: freshBillingData?.responsible_doctor || appointment.professionals?.name || '',
        guide_number: freshGuideNumber || liberacaoData.auth_number || '', // 🔗 Puxar do Nº Autorização da aba Liberação
        estimated_value: freshBillingData?.estimated_value || appointment.value || estimatedValue, // 💰 Puxar valor do agendamento
        authorized_value: freshBillingData?.authorized_value || appointment.value || estimatedValue, // 💰 Puxar valor do agendamento
        discount: parseFloat(freshBillingData?.discount !== undefined ? freshBillingData.discount : (appointmentFresh?.discount || appointment.discount || 0)), // ✅ Sempre carregar desconto do appointmentFresh do banco
        discount_reason: appointmentFresh?.discount_reason || appointment.discount_reason || freshBillingData?.discount_reason || '', // ✅ Carregar motivo do desconto
        notes: appointmentFresh?.notes || appointment.notes || freshBillingData?.notes || '', // ✅ Carregar observação
      });

      // Preencher dados de pagamento (so para particular)
      const discountAmount = parseFloat(appointmentFresh?.discount || appointment.discount || 0);
      const amountWithDiscount = estimatedValue - discountAmount;
      setPagamentoData({
        payment_method: appointmentFresh?.payment_method || appointment.payment_method || '',
        amount_paid: appointmentFresh?.amount_paid || amountWithDiscount.toFixed(2),
        change: '',
        receipt_number: appointmentFresh?.authorization_number || appointment.authorization_number || '', // ✅ Carregar Nº Autorização do banco
        notes: appointmentFresh?.notes || appointment.notes || '', // ✅ Carregar observação do banco
        // Específico para DINHEIRO
        cedulas: [],
        // Específico para CARTAO - CARREGAR DO BANCO
        card_last_digits: appointmentFresh?.card_last_digits || appointment.card_last_digits || '',
        card_brand: appointmentFresh?.card_brand || appointment.card_brand || '',
        card_installments: appointmentFresh?.card_installments?.toString() || appointment.card_installments?.toString() || '1',
        // Específico para PIX
        pix_identifier: '',
        pix_transaction_id: '',
        pix_timestamp: '',
        // Específico para CHEQUE
        check_bank: '',
        check_agency: '',
        check_account: '',
        check_number: '',
        check_due_date: '',
        // Específico para BOLETO
        boleto_number: '',
        boleto_due_date: '',
        boleto_bank: '',
      });

      // 🎯 Determinar a aba apropriada baseado no que já foi preenchido
      // Usar dados FRESCOS do appointmentFresh (carregado do DB) para verificar se tudo está pronto
      const isParticular = !appointmentFresh?.payer_id;
      
      console.log('🔍 Verificando dados frescos para determinar aba:', {
        authorization_number: appointmentFresh?.authorization_number,
        payment_method: appointmentFresh?.payment_method,
        card_number: appointmentFresh?.card_number,
        guide_number: appointmentFresh?.guide_number,
        discount: appointmentFresh?.discount,
        amount_paid: appointmentFresh?.amount_paid,
        cadastral_complete: missing.length === 0,
        isParticular: isParticular,
        payer_id: appointmentFresh?.payer_id,
      });

      // 🎯 LÓGICA DE DETERMINAÇÃO DE ABA - FLUXO COMPLETO
      const normalizedStatus = migrateStatus(appointmentFresh?.status || appointment?.status);

      if ([SERVICE_STATUSES.AWAITING_PROFESSIONAL, SERVICE_STATUSES.IN_SERVICE, SERVICE_STATUSES.ATTENDED].includes(normalizedStatus)) {
        console.log('✅ Atendimento já está em fluxo clínico → Resumo');
        setTabAtivo('resumo');
        setCheckInCompleted(true);
      }
      
      // 1️⃣ Se é VERDADEIRO PARTICULAR (sem convênio):
      else if (isParticular) {
        // 1a. Se tem payment_method → Resumo (checkin completo)
        if (appointmentFresh?.payment_method) {
          console.log('✅ Particular puro com payment_method e cadastrais completos → Resumo');
          setTabAtivo('resumo');
          setCheckInCompleted(true);
        }
        // 1b. Se cadastrais completos mas sem pagamento → Pagamento (próxima aba)
        else if (missing.length === 0) {
          console.log('✅ Particular puro com cadastrais completos → Pagamento');
          setTabAtivo('pagamento');
          setCheckInCompleted(false);
        }
        // 1c. Senão → Cadastrais (ainda faltam preencher)
        else {
          console.log('ℹ️ Particular puro com cadastrais incompletos → Cadastrais');
          setTabAtivo('cadastrais');
          setCheckInCompleted(false);
        }
      }
      // 2️⃣ Se é CONVÊNIO PARTICULAR (não precisa de guia TISS):
      else if (isConvenioParticular) {
        // 2a. Se tem payment_method → Resumo (checkin completo)
        if (appointmentFresh?.payment_method) {
          console.log('✅ Convênio Particular com payment_method e cadastrais completos → Resumo');
          setTabAtivo('resumo');
          setCheckInCompleted(true);
        }
        // 2b. Se cadastrais completos mas sem pagamento → Pagamento
        else if (missing.length === 0) {
          console.log('✅ Convênio Particular com cadastrais completos → Pagamento');
          setTabAtivo('pagamento');
          setCheckInCompleted(false);
        }
        // 2c. Senão → Cadastrais
        else {
          console.log('ℹ️ Convênio Particular com cadastrais incompletos → Cadastrais');
          setTabAtivo('cadastrais');
          setCheckInCompleted(false);
        }
      }
      // 3️⃣ Se é CONVÊNIO FATURADO (precisa de guia TISS, autorização):
      else if (isConvenioFaturado) {
        // 3a. Se tem auth + guide → Resumo (checkin completo) ✅
        if (appointmentFresh?.authorization_number && appointmentFresh?.guide_number) {
          console.log('✅ Convênio Faturado com auth + guide → Resumo (COMPLETO)');
          setTabAtivo('resumo');
          setCheckInCompleted(true);
        }
        // 3b. Se tem auth mas sem guide e cadastrais completos → Faturamento (próxima aba)
        else if (appointmentFresh?.authorization_number && missing.length === 0) {
          console.log('✅ Convênio Faturado com auth e cadastrais completos → Faturamento (próxima aba)');
          setTabAtivo('faturamento');
          setCheckInCompleted(false); // ✅ CORRIGIDO: ainda falta guide!
        }
        // 3c. Se cadastrais completos mas sem auth → Liberação (próxima aba)
        else if (missing.length === 0) {
          console.log('✅ Convênio Faturado com cadastrais completos → Liberação (próxima aba)');
          setTabAtivo('liberacao');
          setCheckInCompleted(false);
        }
        // 3d. Senão → Cadastrais (ainda faltam preencher)
        else {
          console.log('ℹ️ Convênio Faturado com cadastrais incompletos → Cadastrais');
          setTabAtivo('cadastrais');
          setCheckInCompleted(false);
        }
      }
      // Fallback
      else {
        console.log('ℹ️ Tipo desconhecido → Cadastrais');
        setTabAtivo('cadastrais');
        setCheckInCompleted(false);
      }

      // ✅ Recalcular e atualizar registroData com valores sincronizados do banco
      const freshDiscount = parseFloat(appointmentFresh?.discount || 0);
      const freshEstimatedValue = estimatedValue; // Já carregado acima
      const freshValueWithDiscount = freshEstimatedValue - freshDiscount;
      
      setRegistroData({
        receivableId: null, // Será preenchido apenas após criar AR
        receivableStatus: appointmentFresh?.payment_method ? 'criada' : 'não criada', // Se tem payment_method, significa que CR foi criada
        registeredAt: appointmentFresh?.updated_at || null,
        registeredBy: 'Sistema',
        operationHash: appointmentFresh?.id?.substring(0, 16) || null,
        arValue: freshValueWithDiscount, // ✅ Sincronizar com valores frescos do banco
        paymentMethod: appointmentFresh?.payment_method || '',
        cashFlowRegistered: false, // Será true após fechar caixa
      });

      console.log('✅ registroData atualizado com valores sincronizados:', {
        arValue: freshValueWithDiscount,
        discount: freshDiscount,
        estimatedValue: freshEstimatedValue,
        payment_method: appointmentFresh?.payment_method,
      });
    } catch (err) {
      console.error('Erro ao carregar dados do paciente:', err);
    }
  };

  // 🎯 Detectar tipo de convênio/pagamento
  // "Particular" = sem convênio nenhum (payer_id = null)
  // "Convênio Particular" = é um tipo de convênio que não precisa de guia TISS
  // "Convênio Faturado" = convênio que precisa de guia TISS, autorização
  const isParticular = appointment ? !appointment.payer_id : false; // ✅ Verdadeiro PARTICULAR
  
  // ✅ Detectar se é convênio "Particular" ou qualquer nome que contenha "Particular" (case-insensitive)
  const payerName = appointment?.payers?.name?.toLowerCase() || '';
  const isConvenioParticular = appointment && appointment.payer_id && payerName.includes('particular'); 
  
  // ✅ Convênio que precisa de guia TISS (não é Particular)
  const isConvenioFaturado = appointment && appointment.payer_id && !payerName.includes('particular');
  const normalizedAppointmentStatus = migrateStatus(appointment?.status);
  const isReleasedForProfessional = normalizedAppointmentStatus === SERVICE_STATUSES.AWAITING_PROFESSIONAL;
  const isAppointmentInProgress = normalizedAppointmentStatus === SERVICE_STATUSES.IN_SERVICE;
  const hasClinicalShortcuts = Boolean(
    appointment?.patient_id &&
    [SERVICE_STATUSES.AWAITING_PROFESSIONAL, SERVICE_STATUSES.IN_SERVICE, SERVICE_STATUSES.ATTENDED].includes(normalizedAppointmentStatus)
  );
  
  // Mostrar abas de pagamento para Particular e Convênio Particular
  const showPaymentTab = isParticular || isConvenioParticular;

  // Mostrar mensagem de sucesso temporária
  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setSuccessMessageVisible(true);
    setTimeout(() => setSuccessMessageVisible(false), 3000);
  };

  const handleOpenPatientRecord = () => {
    if (!appointment?.patient_id) return;

    onClose();
    navigate(`/clinica/pacientes/${appointment.patient_id}`, {
      state: {
        appointmentId: appointment.id,
        appointmentDate: appointment.scheduled_date || null,
        openTab: 'historico',
        fromAgendaClinicalFlow: true,
        canStartAppointment: isReleasedForProfessional,
      },
    });
  };

  const handleOpenProfessionalFlow = () => {
    onClose();
    navigate(`/clinica/agenda/atendimento/${appointment.id}`);
  };

  // 🔗 Atualizar procedure_code quando code_type muda
  useEffect(() => {
    if (!appointment?.services) return;

    let newCode = '';
    if (faturamentoData.code_type === 'tuss') {
      newCode = appointment.services.tuss_code || '';
    } else if (faturamentoData.code_type === 'cbhpm') {
      newCode = appointment.services.code || '';
    }
    // Se for CPT, deixar vazio (não há campo específico)

    setFaturamentoData(prev => ({
      ...prev,
      procedure_code: newCode,
    }));
  }, [faturamentoData.code_type, appointment?.services]);

  // 🔗 Sincronizar Nº Guia TISS com Nº Autorização da aba Liberação
  useEffect(() => {
    if (liberacaoData.auth_number) {
      setFaturamentoData(prev => ({
        ...prev,
        guide_number: liberacaoData.auth_number,
      }));
    }
  }, [liberacaoData.auth_number]);

  // 🔄 Monitorar mudanças em cadastralData e atualizar status de validação
  useEffect(() => {
    const requiredFields = [
      ['name', 'Nome Completo'],
      ['document_id', 'CPF'],
      ['birthdate', 'Data de Nascimento'],
      ['gender', 'Sexo'],
      ['email', 'Email'],
      ['phone', 'Telefone'],
      ['street', 'Rua'],
      ['number', 'Número'],
      ['neighborhood', 'Bairro'],
      ['city', 'Cidade'],
      ['state', 'Estado'],
      ['zip_code', 'CEP'],
    ];

    const missing = requiredFields
      .filter(([field, label]) => !cadastralData[field] || cadastralData[field].toString().trim() === '')
      .map(([field, label]) => label);

    setCadastralStatus({
      complete: missing.length === 0,
      missing: missing,
    });
  }, [cadastralData]);

  // 💰 Sincronizar desconto com amount_paid
  useEffect(() => {
    const valorComDesconto = (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2);
    console.log('💰 Sincronizando amount_paid: ', { 
      estimated: faturamentoData.estimated_value,
      discount: faturamentoData.discount,
      resultado: valorComDesconto 
    });
    setPagamentoData(prev => ({
      ...prev,
      amount_paid: valorComDesconto
    }));
  }, [faturamentoData.discount, faturamentoData.estimated_value]);

  // 💾 Auto-save de dados de pagamento (cartão, forma de pagamento)
  useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      if (!pagamentoData.payment_method || !appointment?.id) return;
      
      try {
        console.log('💾 Tentando salvar pagamento:', pagamentoData.payment_method);
        
        const updatePayload = {
          payment_method: pagamentoData.payment_method,
          card_brand: pagamentoData.card_brand || null,
          card_last_digits: pagamentoData.card_last_digits || null,
          card_installments: pagamentoData.card_installments ? parseInt(pagamentoData.card_installments) : 1,
          updated_at: new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('appointments')
          .update(updatePayload)
          .eq('id', appointment.id);
        
        if (error) {
          console.error('❌ Auto-save pagamento falhou:', error.message);
        } else {
          console.log('✅ Pagamento salvo com sucesso:', pagamentoData.payment_method);
        }
      } catch (err) {
        console.error('❌ Erro no auto-save de pagamento:', err.message);
      }
    }, 500);
    
    return () => clearTimeout(autoSaveTimer);
  }, [pagamentoData.payment_method, pagamentoData.card_brand, pagamentoData.card_last_digits, pagamentoData.card_installments, appointment?.id]);

  // 💾 Auto-save de dados de faturamento (desconto e observações)
  useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      if (!appointment?.id) return;
      
      // Só salvar se houver desconto ou notas
      if (!faturamentoData.discount && !faturamentoData.notes) return;
      
      try {
        console.log('💾 Tentando salvar desconto/notas:', { 
          discount: faturamentoData.discount,
          notes: faturamentoData.notes
        });
        
        const updatePayload = {
          updated_at: new Date().toISOString(),
        };
        
        // Só incluir campos que são realmente necessários
        if (faturamentoData.discount > 0) {
          updatePayload.discount = parseFloat(faturamentoData.discount);
        }
        if (faturamentoData.notes) {
          updatePayload.notes = faturamentoData.notes;
        }
        if (pagamentoData.amount_paid) {
          updatePayload.amount_paid = parseFloat(pagamentoData.amount_paid);
        }
        
        const { error } = await supabase
          .from('appointments')
          .update(updatePayload)
          .eq('id', appointment.id);
        
        if (error) {
          console.error('❌ Auto-save faturamento falhou:', error.message);
        } else {
          console.log('✅ Desconto/notas salvo(a) com sucesso');
        }
      } catch (err) {
        console.error('❌ Erro no auto-save de faturamento:', err.message);
      }
    }, 500);
    
    return () => clearTimeout(autoSaveTimer);
  }, [faturamentoData.discount, faturamentoData.notes, appointment?.id]);

  // 💾 Auto-save de dados de liberação (autorização, nº comprovante, cartão)
  useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      if (!appointment?.id) return;
      
      // Só salvar se houver algo para salvar
      if (!liberacaoData.auth_number && !liberacaoData.auth_expiry && !liberacaoData.card_number) return;
      
      try {
        console.log('💾 Tentando salvar liberação:', { 
          auth_number: liberacaoData.auth_number,
          auth_expiry: liberacaoData.auth_expiry,
          card_number: liberacaoData.card_number
        });
        
        const updatePayload = {
          authorization_number: liberacaoData.auth_number || null,
          authorization_expiry: liberacaoData.auth_expiry || null,
          card_number: liberacaoData.card_number || null,
          updated_at: new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('appointments')
          .update(updatePayload)
          .eq('id', appointment.id);
        
        if (error) {
          console.error('❌ Auto-save liberação falhou:', error.message);
        } else {
          console.log('✅ Liberação salva com sucesso');
        }
      } catch (err) {
        console.error('❌ Erro no auto-save de liberação:', err.message);
      }
    }, 500);
    
    return () => clearTimeout(autoSaveTimer);
  }, [liberacaoData.card_number, liberacaoData.auth_number, liberacaoData.auth_expiry, appointment?.id]);

  // ✅ Atualizar Valor Estimado quando convênio ou serviço mudam
  useEffect(() => {
    if (agendamentoData.payerId && agendamentoData.serviceId && clinicId) {
      fetchServicePriceForPayer();
    }
  }, [agendamentoData.payerId, agendamentoData.serviceId, clinicId]);

  const fetchServicePriceForPayer = async () => {
    try {
      console.log('💰 Buscando preço do serviço para o convênio...', {
        payerId: agendamentoData.payerId,
        serviceId: agendamentoData.serviceId,
        clinicId: clinicId
      });

      const { data: priceData, error } = await supabase
        .from('service_prices')
        .select('price')
        .eq('payer_id', agendamentoData.payerId)
        .eq('service_id', agendamentoData.serviceId)
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Erro ao buscar preço:', error);
        return;
      }

      if (priceData?.price) {
        console.log('✅ Preço encontrado:', priceData.price);
        setFaturamentoData(prev => ({
          ...prev,
          estimated_value: priceData.price,
          authorized_value: priceData.price
        }));
        // Também atualizar o valor do agendamento
        updateAgendamentoField('value', priceData.price.toString());
      } else {
        console.log('ℹ️ Nenhum preço configurado para este serviço neste convênio');
      }
    } catch (err) {
      console.error('❌ Erro ao buscar preço do serviço:', err);
    }
  };

  // Salvar dados cadastrais (Padrão TISS)
  const handleSaveCadastral = async (e) => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setLoading(true);
      
      // 🔍 Validar campos obrigatórios TISS
      const requiredFields = [
        { field: 'name', label: 'Nome Completo' },
        { field: 'document_id', label: 'CPF' },
        { field: 'birthdate', label: 'Data de Nascimento' },
        { field: 'gender', label: 'Sexo' },
        { field: 'email', label: 'Email (obrigatório para NF)' },
        { field: 'phone', label: 'Telefone' },
        { field: 'street', label: 'Rua' },
        { field: 'number', label: 'Número' },
        { field: 'neighborhood', label: 'Bairro' },
        { field: 'city', label: 'Cidade' },
        { field: 'state', label: 'Estado' },
        { field: 'zip_code', label: 'CEP' },
      ];

      const missing = requiredFields.filter(
        ({ field }) => !cadastralData[field] || cadastralData[field].toString().trim() === ''
      );

      if (missing.length > 0) {
        const labels = missing.map(m => m.label).join(', ');
        alert(`❌ Campos obrigatórios em branco:\n\n${labels}\n\nTodos os campos são necessários para emissão de guia TISS.`);
        setLoading(false);
        return;
      }

      console.log('📤 Enviando dados cadastrais TISS completos:', {
        id: appointment.patient_id,
        name: cadastralData.name,
        document_id: cadastralData.document_id,
        gender: cadastralData.gender,
        email: cadastralData.email,
        endereco: `${cadastralData.street}, ${cadastralData.number} - ${cadastralData.neighborhood}, ${cadastralData.city}-${cadastralData.state}`,
      });

      const { data, error } = await supabase
        .from('patients')
        .update({
          name: cadastralData.name || null,
          document_id: cadastralData.document_id || null,
          birthdate: cadastralData.birthdate || null,
          gender: cadastralData.gender || null,
          phone: cadastralData.phone || null,
          cell_phone: cadastralData.cell_phone || null,
          email: cadastralData.email || null,
          street: cadastralData.street || null,
          number: cadastralData.number || null,
          neighborhood: cadastralData.neighborhood || null,
          city: cadastralData.city || null,
          state: cadastralData.state || null,
          zip_code: cadastralData.zip_code || null,
        })
        .eq('id', appointment.patient_id);

      console.log('📥 Resposta do servidor:', { data, error });

      if (error) {
        console.error('❌ Detalhes do erro:', error);
        throw new Error(error.message || 'Erro ao atualizar paciente');
      }
      
      // 🎯 Exibir mensagem de sucesso
      showSuccessNotification('✅ Dados cadastrais salvos com sucesso!');
      console.log('✅ SUCESSO: Cadastro TISS atualizado e validado, avançando para próxima aba');
      
      // Ir para próxima aba (liberação se convênio, pagamento se particular)
      setTimeout(() => {
        setTabAtivo(isParticular ? 'pagamento' : 'liberacao');
      }, 1500);
    } catch (err) {
      console.error('❌ Erro ao salvar cadastrais:', err.message);
      console.error('Stack:', err.stack);
    } finally {
      setLoading(false);
    }
  };

  // 💾 Salvar dados de Liberação
  const handleSaveLiberacao = async (e) => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setLoading(true);
      console.log('📝 handleSaveLiberacao iniciado');
      
      // 🔍 Validar dados
      console.log('🔍 Verificando card_number:', {
        valor: liberacaoData.card_number,
        tipo: typeof liberacaoData.card_number,
        vazio: !liberacaoData.card_number?.trim(),
      });

      if (!liberacaoData.card_number?.trim()) {
        console.warn('❌ Validação falhou: Carteirinha vazia');
        setLoading(false);
        return;
      }

      // Se requer autorização, validar número
      if (liberacaoData.requires_auth === 'yes' && !liberacaoData.auth_number?.trim()) {
        console.warn('❌ Validação falhou: Auth number vazio mas required');
        setLoading(false);
        return;
      }

      const updatePayload = {
        card_number: liberacaoData.card_number,
        authorization_number: liberacaoData.auth_number || null,
        authorization_expiry: liberacaoData.auth_expiry || null,
        updated_at: new Date().toISOString(),
      };

      console.log('📤 Iniciando UPDATE no banco:', {
        appointmentId: appointment.id,
        payload: updatePayload,
      });
      
      const { data, error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', appointment.id);

      console.log('📥 Resposta do Supabase:', { 
        sucessoUpdate: !error,
        erro: error?.message,
      });

      if (error) {
        console.error('❌ Erro Supabase:', error);
        throw new Error(`Erro ao salvar: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum registro foi atualizado - RLS pode estar bloqueando');
        throw new Error('Nenhum registro foi atualizado. Verifique RLS policies.');
      }
      
      console.log('✅ Carteirinha salva com sucesso:', data[0].card_number);
      console.log('✅ SUCESSO: Avançando para Faturamento');
      
      // 🎯 Exibir mensagem de sucesso
      showSuccessNotification('✅ Carteirinha validada! Avançando para faturamento...');
      
      // 🔄 Trocar de aba ANTES de fechar o modal
      console.log('🔄 Trocando aba para: faturamento');
      setTimeout(() => {
        setTabAtivo('faturamento');
      }, 1500);
    } catch (err) {
      console.error('❌ Erro ao salvar liberação:', err.message);
      console.error('Stack:', err.stack);
      // 🎯 Não usar alert() que fecha o modal - apenas logar o erro
      console.error('❌ ERRO COMPLETO:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFaturamento = async (e) => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setLoading(true);
      
      // 🔍 Validar dados
      if (!faturamentoData.guide_number?.trim()) {
        alert('❌ Número da guia TISS é obrigatório');
        setLoading(false);
        return;
      }

      // Estruturar dados TISS para XML
      const tissData = {
        guide_number: faturamentoData.guide_number,
        guide_type: faturamentoData.guide_type,
        code_type: faturamentoData.code_type,
        procedure_code: faturamentoData.procedure_code || '',
        service_date: faturamentoData.service_date || appointment.scheduled_date,
        service_place: faturamentoData.service_place,
        requesting_doctor: faturamentoData.requesting_doctor,
        responsible_doctor: faturamentoData.responsible_doctor,
        estimated_value: faturamentoData.estimated_value,
        authorized_value: faturamentoData.authorized_value,
        notes: faturamentoData.notes,
      };

      console.log('📤 Enviando dados de faturamento TISS:', {
        id: appointment.id,
        guide_number: faturamentoData.guide_number,
        guide_type: faturamentoData.guide_type,
        procedure_code: faturamentoData.procedure_code,
        service_place: faturamentoData.service_place,
        requesting_doctor: faturamentoData.requesting_doctor,
        discount: faturamentoData.discount, // 💾 Confirmar que o desconto está aqui
      });
      
      // 💾 Calcular amount_paid com desconto
      const calculateedAmountPaid = (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2);
      
      const { data, error } = await supabase
        .from('appointments')
        .update({
          guide_number: faturamentoData.guide_number,
          billing_data: JSON.stringify(tissData), // Salvar estrutura TISS completa
          discount: parseFloat(faturamentoData.discount || 0), // 💾 Salvar desconto explicitamente
          amount_paid: parseFloat(calculateedAmountPaid), // 💾 Salvar amount_paid recalculado
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment.id);

      console.log('📥 Resposta do servidor:', { data, error });

      if (error) {
        console.error('❌ Detalhes do erro:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Guia TISS + Desconto salvo com sucesso');
      
      // 🎯 Exibir mensagem de sucesso
      showSuccessNotification('✅ Guia TISS + Desconto salvo com sucesso! Avançando para resumo...');
      console.log('✅ SUCESSO: Guia TISS + Desconto salvo, avançando para Resumo');
      
      // 🎯 IMPORTANTE: Trocar de aba ANTES de fechar o modal
      // Aguardar um pouco para garantir que a aba mudou
      setTimeout(() => {
        setTabAtivo('resumo');
      }, 1000);
    } catch (err) {
      console.error('❌ Erro ao salvar faturamento:', err.message);
      console.error('Stack:', err.stack);
    } finally {
      setLoading(false);
    }
  };

  // 💾 Salvar dados de Pagamento (Particular)
  const handleSavePagamento = async (e) => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setLoading(true);
      
      // 🔍 Validar dados
      if (!pagamentoData.payment_method) {
        console.warn('❌ Forma de pagamento é obrigatória');
        alert('⚠️ Selecione uma forma de pagamento');
        setLoading(false);
        return;
      }

      console.log('📤 Iniciando processo de registro financeiro...');
      
      // 💰 Criar Conta a Receber (AR) para particular
      let arId = null;
      // 💰 Aplicar DESCONTO ao valor final a receber
      let arValue = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
      
      try {
        if (arValue > 0) {
          // 🎯 Verificar se é cartão parcelado
          const isInstalledCard = pagamentoData.payment_method === 'CARTAO' && 
                                   parseInt(pagamentoData.card_installments || 1) > 1;
          const installments = isInstalledCard ? parseInt(pagamentoData.card_installments) : 1;
          
          console.log(`💳 Criando Conta a Receber (valor com desconto: R$ ${arValue.toFixed(2)})...${isInstalledCard ? ` com ${installments} parcelas` : ''}`);
          
          const createdARs = [];
          const installmentValue = (arValue / installments).toFixed(2);
          
          // 🔄 Criar uma AR para cada parcela
          for (let i = 0; i < installments; i++) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30 + (i * 30)); // Primeira vence em 30 dias, depois a cada 30 dias
            
            const arResult = await createAR(clinicId, {
              amount: parseFloat(installmentValue),
              due_date: dueDate.toISOString().split('T')[0],
              customer_name: appointment.patients?.name || 'Paciente',
              appointment_id: appointment.id,
            });
            
            createdARs.push(arResult);
            console.log(`✅ ${isInstalledCard ? `Parcela ${i + 1}/${installments}` : 'Conta a Receber'} criada:`, { 
              id: arResult.id, 
              value: installmentValue, 
              due_date: dueDate.toISOString().split('T')[0]
            });
          }
          
          arId = createdARs[0].id;
          
          // 📋 Registrar auditoria de criação de AR
          try {
            await logAppointmentFinancialAudit({
              appointmentId: appointment.id,
              financialEventType: FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED,
              relatedEntity: 'accounts_receivable',
              relatedEntityId: arId,
              amount: arValue,
              context: {
                payment_method: pagamentoData.payment_method,
                installments: installments,
                installment_value: parseFloat(installmentValue),
                notes: isInstalledCard 
                  ? `Pagamento em ${installments}x no cartão ${pagamentoData.card_brand || ''} (últimos dígitos: ${pagamentoData.card_last_digits})` 
                  : pagamentoData.notes || 'Lançamento de particular no check-in',
              },
            });
            console.log('✅ Auditoria financeira registrada');
          } catch (auditErr) {
            console.warn('⚠️ Erro ao registrar auditoria:', auditErr.message);
            // Continuar mesmo com erro de auditoria
          }
        }
      } catch (arError) {
        console.error('❌ Erro ao criar Conta a Receber:', arError.message);
        console.error('Stack:', arError.stack);
        // Não bloquear o fluxo se AR não puder ser criada
      }

      // 📊 Atualizar appointment com dados de pagamento
      console.log('📤 Atualizando dados de pagamento do appointment...');
      
      const updatePayload = {
        payment_method: pagamentoData.payment_method,
        value: parseFloat(faturamentoData.estimated_value || '0'),
        discount: parseFloat(faturamentoData.discount || '0'),
        discount_reason: faturamentoData.discount_reason || null, // ✅ Salvar motivo do desconto
        notes: pagamentoData.notes || null, // ✅ Salvar observação
        status: 'confirmed',
        updated_at: new Date().toISOString(),
        card_number: liberacaoData.card_number || null,
        // ✅ Para Convênio Faturado: usar auth_number de liberação. Para Particular/Convênio Particular: usar receipt_number
        authorization_number: isConvenioFaturado ? (liberacaoData.auth_number || null) : (pagamentoData.receipt_number || null),
        guide_number: faturamentoData.guide_number || null,
        card_brand: pagamentoData.card_brand || null,
        card_last_digits: pagamentoData.card_last_digits || null,
        card_installments: pagamentoData.card_installments ? parseInt(pagamentoData.card_installments) : 1,
      };
      
      const { data, error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', appointment.id);

      console.log('📥 Resposta do servidor:', { data, error });

      if (error) {
        console.error('❌ Detalhes do erro:', error);
        // Se o erro for sobre discount_reason, tenta novamente sem essa coluna
        if (error.message && error.message.includes('discount_reason')) {
          console.log('⚠️ Coluna discount_reason ainda não existe. Salvando sem ela...');
          const updatePayloadWithoutDiscount = { ...updatePayload };
          delete updatePayloadWithoutDiscount.discount_reason;
          
          const { data: retryData, error: retryError } = await supabase
            .from('appointments')
            .update(updatePayloadWithoutDiscount)
            .eq('id', appointment.id);
          
          if (retryError) {
            throw new Error(retryError.message);
          }
        } else {
          throw new Error(error.message);
        }
      }
      
      // 💾 Atualizar estado de registro
      const operationHash = `${appointment.id}-${Date.now()}`.substring(0, 16);
      const isInstalledCard = pagamentoData.payment_method === 'CARTAO' && 
                               parseInt(pagamentoData.card_installments || 1) > 1;
      const installments = isInstalledCard ? parseInt(pagamentoData.card_installments) : 1;
      const valueWithDiscount = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
      
      setRegistroData({
        receivableId: arId,
        receivableStatus: arId ? 'criada' : 'não criada',
        registeredAt: new Date().toISOString(),
        registeredBy: 'Sistema',
        operationHash: operationHash,
        arValue: valueWithDiscount,
        paymentMethod: pagamentoData.payment_method,
        cashFlowRegistered: false,
      });
      
      // 🎯 Exibir mensagem de sucesso
      const successMsg = arId 
        ? `✅ Dados de pagamento registrados! ${installments > 1 ? `✓ ${installments} parcelas criadas no contas a receber` : '✓ Conta a Receber criada'}`
        : '✅ Dados de pagamento registrados!';
      console.log('✅ SUCESSO:', successMsg);
      showSuccessNotification(successMsg);
      
      // Liberar loading
      setLoading(false);
      
      // Avançar para resumo financeiro SEM delay
      console.log('🔄 Avançando para aba Financeiro...');
      setTabAtivo('financeiro');
      
    } catch (err) {
      console.error('❌ Erro ao salvar pagamento:', err.message);
      console.error('Stack completo:', err.stack);
      console.error('Erro completo:', err);
      setLoading(false);
      
      const errorMsg = err?.message || 'Erro desconhecido ao salvar pagamento';
      console.error('🔴 ERRO FINAL:', errorMsg);
      alert(`❌ Erro: ${errorMsg}`);
    }
  };

  // Marcar como check-in completo
  // Marcar como check-in completo e aguardando profissional
  const handleCompleteCheckIn = async (e) => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setLoading(true);
      
      console.log('🔄 Iniciando liberação para profissional - appt:', appointment.id);
      console.log('📋 Appointment data:', appointment);
      
      // 📝 Atualizar status: AGUARDANDO → LIBERADO_PARA_ATENDIMENTO
      // Paciente fez checklist completo e está pronto para ser atendido
      const newStatus = APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO;
      console.log('🔍 [handleCompleteCheckIn] Salvando com:', {
        appointmentId: appointment.id,
        newStatus: newStatus,
        statusEnum: APPOINTMENT_STATUS
      });
      
      const { data: updateData, error } = await supabase
        .from('appointments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment.id);

      console.log('📊 Resultado update:', { 
        success: !error, 
        data: updateData, 
        error: error?.message || error?.details || error,
        statusSalvo: newStatus
      });
      
      if (error) {
        console.error('❌ ERRO COMPLETO na atualização:', error);
        throw error;
      }
      
      console.log('✅ Update bem-sucedido! Status atualizado para:', newStatus);

      // Marcar como liberado nas arrivals
      const updatedArrivals = {
        ...arrivals,
        [appointment.id]: {
          ...arrivals[appointment.id],
          checkedIn: true,
          checkedInAt: new Date().toISOString(),
          releasedAt: new Date().toISOString(), // ✅ Horário em que foi liberado
        }
      };
      
      console.log('📝 Atualizando arrivals:', updatedArrivals);
      onArrivalsUpdate(updatedArrivals);
      console.log('✅ Paciente liberado para atendimento!');
      
      // Reset loading imediatamente
      setLoading(false);
      
      // 🎉 SUCESSO: Paciente liberado
      showSuccessNotification('✅ Paciente liberado para atendimento!');
      console.log('🎉 SUCESSO: Paciente liberado para atendimento!');
      
      // ✅ Aguardar 800ms para garantir que o banco replicou a mudança
      console.log('⏳ [AtendimentoModal] Aguardando 800ms antes de disparar callbacks...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Chamar onSuccess PRIMEIRO para recarregar agenda
      if (onSuccess) {
        console.log('📢 [AtendimentoModal] Chamando onSuccess callback para recarregar agenda');
        await onSuccess();
      }
      
      console.log('✅ [AtendimentoModal] Callbacks executados, fechando modal...');
      
      // Depois fechar o modal
      onClose();
    } catch (err) {
      console.error('❌ ERRO COMPLETO ao liberar paciente:', err);
      console.error('Erro message:', err?.message);
      console.error('Erro details:', err?.details);
      console.error('Erro code:', err?.code);
      setLoading(false);
      alert(`❌ Erro ao liberar: ${err?.message || 'Tente novamente'}`);
    }
  };

  if (!appointment) return null;

  const tabClass = (tab) =>`
    px-4 py-2 font-medium text-sm border-b-2 transition-colors cursor-pointer
    ${tabAtivo === tab
      ? 'border-blue-600 text-blue-600'
      : 'border-transparent text-gray-600 hover:text-gray-900'
    }
  `;

  // ✅ Guard clause - retornar null se modal não estiver aberto ou appointment for null
  if (!isOpen || !appointment) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content overflow-auto">
        <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="flex items-center gap-3">
            <span>📋 Atendimento - {appointment.patients?.name}</span>
            <span className="text-sm font-normal text-gray-500">
              Senha: <span className="text-blue-600 font-bold">{arrivals[appointment.id]?.password}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Notificação de Sucesso */}
        {successMessageVisible && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 animate-in fade-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Info rápida do agendamento */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-600 font-medium">Horário</p>
              <p className="font-bold text-gray-900">{appointment.scheduled_time?.substring(0, 5)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Profissional</p>
              <p className="font-bold text-gray-900">{appointment.professionals?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Serviço</p>
              <p className="font-bold text-gray-900">{appointment.services?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Convênio</p>
              <p className="font-bold text-gray-900">{appointment.payers?.name || 'Particular'}</p>
            </div>
          </div>
        </div>

        {/* Status de Registro (visível quando tiver informações) */}
        {registroData.receivableId && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-900">✅ Registro Financeiro</p>
              <p className="text-xs text-green-700">Conta a Receber criada • ID: {registroData.receivableId.substring(0, 8)}...  • Auditoria: ✓</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-600">R$ {registroData.arValue.toFixed(2)}</p>
              <p className="text-xs text-green-600">{formatPaymentMethod(registroData.paymentMethod)}</p>
            </div>
          </div>
        )}

        {hasClinicalShortcuts && (
          <div className="bg-violet-50 border border-violet-300 rounded-lg p-4 mb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-violet-900">Atendimento em fluxo clínico</p>
                <p className="text-sm text-violet-700 mt-1">
                  Status atual: {getStatusLabelOnly(normalizedAppointmentStatus)}. Use o prontuário para registrar a evolução e, se preferir, o painel clínico para conduzir o início/finalização.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenPatientRecord}
                  className="border-violet-300 text-violet-700 hover:bg-violet-100"
                >
                  <FileText size={16} className="mr-2" />
                  Abrir Prontuário
                </Button>
                <Button
                  type="button"
                  onClick={handleOpenProfessionalFlow}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isReleasedForProfessional ? 'Iniciar no Painel' : 'Abrir Painel do Atendimento'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Abas */}
        <div className="border-b border-gray-200 flex gap-2 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => setTabAtivo('cadastrais')}
            className={tabClass('cadastrais')}
          >
            📝 Dados Cadastrais
          </button>
          {/* ✅ Liberação: Só para Convênio Faturado (que precisa de autorização) */}
          {isConvenioFaturado && (
            <button
              type="button"
              onClick={() => setTabAtivo('liberacao')}
              className={tabClass('liberacao')}
            >
              ✓ Liberação
            </button>
          )}
          {/* ✅ Faturamento: Só para Convênio Faturado (que precisa de guia TISS) */}
          {isConvenioFaturado && (
            <button
              type="button"
              onClick={() => setTabAtivo('faturamento')}
              className={tabClass('faturamento')}
            >
              💰 Faturamento
            </button>
          )}
          {/* ✅ Pagamento: Só para Particular e Convênio Particular (ambos pagam com cartão/dinheiro) */}
          {(isParticular || isConvenioParticular) && (
            <button
              type="button"
              onClick={() => setTabAtivo('pagamento')}
              className={tabClass('pagamento')}
            >
              💳 Pagamento
            </button>
          )}
          {(tabAtivo === 'resumo' || tabAtivo === 'financeiro' || checkInCompleted) && (
            <button
              type="button"
              onClick={() => setTabAtivo('financeiro')}
              className={tabClass('financeiro')}
            >
              📊 Resumo Financeiro
            </button>
          )}
          {(tabAtivo === 'resumo' || checkInCompleted) && (
            <button
              type="button"
              onClick={() => setTabAtivo('resumo')}
              className={tabClass('resumo')}
            >
              ✅ Resumo Final
            </button>
          )}
        </div>

        {/* Conteúdo das Abas - Dividido em scroll + footer */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', overflow: 'hidden' }}>
          {/* Área com scroll */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '20px' }}>
            <div className="space-y-4">
              {/* ABA 1: DADOS CADASTRAIS (PADRÃO TISS) */}
              {tabAtivo === 'cadastrais' && (
                <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-blue-900">📋 Validação Cadastral (Padrão TISS)</p>
                <p className="text-xs text-blue-700 mt-1">Estes dados vêm do cadastro do paciente e são obrigatórios para emissão de guia</p>
              </div>

              {!cadastralStatus.complete && cadastralStatus.missing.length > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800 font-semibold mb-2">
                    ❌ {cadastralStatus.missing.length} campos incompletos:
                  </p>
                  <ul className="text-xs text-red-700 space-y-1">
                    {cadastralStatus.missing.map((field, idx) => (
                      <li key={idx}>• {field}</li>
                    ))}
                  </ul>
                </div>
              )}

              {cadastralStatus.complete && (
                <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800 font-semibold">
                    ✅ Cadastro TISS completo e validado!
                  </p>
                </div>
              )}

              {/* Seção 1: Dados Pessoais */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">1</span>
                  Dados Pessoais (TISS)
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nome Completo <span className="text-red-500">*</span>
                      {cadastralData.name?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      value={cadastralData.name}
                      onChange={(e) => setCadastralData({...cadastralData, name: e.target.value})}
                      placeholder="Nome completo"
                      className={cadastralData.name?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      CPF <span className="text-red-500">*</span>
                      {cadastralData.document_id?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      value={cadastralData.document_id}
                      onChange={(e) => setCadastralData({...cadastralData, document_id: e.target.value})}
                      placeholder="000.000.000-00"
                      className={cadastralData.document_id?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Data Nascimento <span className="text-red-500">*</span>
                      {cadastralData.birthdate?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      type="date"
                      value={cadastralData.birthdate}
                      onChange={(e) => setCadastralData({...cadastralData, birthdate: e.target.value})}
                      className={cadastralData.birthdate?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Sexo <span className="text-red-500">*</span>
                      {cadastralData.gender?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <select
                      value={cadastralData.gender}
                      onChange={(e) => setCadastralData({...cadastralData, gender: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">— Selecione —</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                      {cadastralData.email?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      type="email"
                      value={cadastralData.email}
                      onChange={(e) => setCadastralData({...cadastralData, email: e.target.value})}
                      placeholder="email@example.com"
                      className={cadastralData.email?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Telefone <span className="text-red-500">*</span>
                      {cadastralData.phone?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      value={cadastralData.phone}
                      onChange={(e) => setCadastralData({...cadastralData, phone: e.target.value})}
                      placeholder="(00) 0000-0000"
                      className={cadastralData.phone?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Celular</label>
                    <Input
                      value={cadastralData.cell_phone}
                      onChange={(e) => setCadastralData({...cadastralData, cell_phone: e.target.value})}
                      placeholder="(00) 99999-9999"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Celular</label>
                    <Input
                      value={cadastralData.cell_phone}
                      onChange={(e) => setCadastralData({...cadastralData, cell_phone: e.target.value})}
                      placeholder="(00) 99999-9999"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Endereço (TISS Obrigatório) */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">2</span>
                  Endereço (TISS Obrigatório)
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Rua <span className="text-red-500">*</span>
                      {cadastralData.street?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      value={cadastralData.street}
                      onChange={(e) => setCadastralData({...cadastralData, street: e.target.value})}
                      placeholder="Nome da rua"
                      className={cadastralData.street?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Número <span className="text-red-500">*</span>
                      {cadastralData.number?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      value={cadastralData.number}
                      onChange={(e) => setCadastralData({...cadastralData, number: e.target.value})}
                      placeholder="123"
                      className={cadastralData.number?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Complemento</label>
                    <Input
                      value=""
                      onChange={() => {}}
                      placeholder="Apto 101, sala 202, etc"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Bairro <span className="text-red-500">*</span>
                      {cadastralData.neighborhood?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      value={cadastralData.neighborhood}
                      onChange={(e) => setCadastralData({...cadastralData, neighborhood: e.target.value})}
                      placeholder="Bairro"
                      className={cadastralData.neighborhood?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Cidade <span className="text-red-500">*</span>
                      {cadastralData.city?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      value={cadastralData.city}
                      onChange={(e) => setCadastralData({...cadastralData, city: e.target.value})}
                      placeholder="Cidade"
                      className={cadastralData.city?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      UF <span className="text-red-500">*</span>
                      {cadastralData.state?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <select
                      value={cadastralData.state}
                      onChange={(e) => setCadastralData({...cadastralData, state: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${cadastralData.state?.trim() ? 'border-green-300' : 'border-gray-300'}`}
                    >
                      <option value="">— UF —</option>
                      <option value="AC">AC</option>
                      <option value="AL">AL</option>
                      <option value="AP">AP</option>
                      <option value="AM">AM</option>
                      <option value="BA">BA</option>
                      <option value="CE">CE</option>
                      <option value="DF">DF</option>
                      <option value="ES">ES</option>
                      <option value="GO">GO</option>
                      <option value="MA">MA</option>
                      <option value="MT">MT</option>
                      <option value="MS">MS</option>
                      <option value="MG">MG</option>
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PR">PR</option>
                      <option value="PE">PE</option>
                      <option value="PI">PI</option>
                      <option value="RJ">RJ</option>
                      <option value="RN">RN</option>
                      <option value="RS">RS</option>
                      <option value="RO">RO</option>
                      <option value="RR">RR</option>
                      <option value="SC">SC</option>
                      <option value="SP">SP</option>
                      <option value="SE">SE</option>
                      <option value="TO">TO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      CEP <span className="text-red-500">*</span>
                      {cadastralData.zip_code?.trim() && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <Input
                      value={cadastralData.zip_code}
                      onChange={(e) => setCadastralData({...cadastralData, zip_code: e.target.value})}
                      placeholder="00000-000"
                      className={cadastralData.zip_code?.trim() ? 'border-green-300' : ''}
                    />
                  </div>
                  <div className="col-span-4"></div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: LIBERAÇÃO (PADRÃO TISS) */}
          {tabAtivo === 'liberacao' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-blue-900">📋 Validação de Cobertura (Padrão TISS)</p>
                <p className="text-xs text-blue-700 mt-1">Operadora: {liberacaoData.payer_name || 'Não definida'}</p>
              </div>

              )}

              {/* Seção 1: Dados do Beneficiário */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">1</span>
                  Dados do Beneficiário
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Operadora</label>
                    <Input
                      value={liberacaoData.payer_name}
                      onChange={() => {}}
                      disabled
                      className="bg-gray-100 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Plano</label>
                    <Input
                      value={liberacaoData.plan_name}
                      onChange={() => {}}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Matrícula / Nº Carteirinha <span className="text-red-500">*</span></label>
                    <Input
                      value={liberacaoData.card_number}
                      onChange={(e) => setLiberacaoData({...liberacaoData, card_number: e.target.value})}
                      placeholder="Ex: 123456789012345"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Verificação de Cobertura */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-green-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">2</span>
                  Autorização Prévia
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Requer autorização prévia?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="requires_auth"
                          value="yes"
                          checked={liberacaoData.requires_auth === 'yes'}
                          onChange={(e) => setLiberacaoData({...liberacaoData, requires_auth: 'yes'})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Sim - Necessário</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="requires_auth"
                          value="no"
                          checked={liberacaoData.requires_auth === 'no'}
                          onChange={(e) => setLiberacaoData({...liberacaoData, requires_auth: 'no'})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Não - Consulta livre</span>
                      </label>
                    </div>
                  </div>

                  {liberacaoData.requires_auth === 'yes' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Nº de Autorização (TISS)</label>
                        <Input
                          value={liberacaoData.auth_number}
                          onChange={(e) => setLiberacaoData({...liberacaoData, auth_number: e.target.value})}
                          placeholder="Ex: XXXXXX/2026"
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Validade</label>
                        <Input
                          type="date"
                          value={liberacaoData.auth_expiry}
                          onChange={(e) => setLiberacaoData({...liberacaoData, auth_expiry: e.target.value})}
                        />
                      </div>
                    </>
                  )}

                  <div className="col-span-3">
                    <select
                      value={liberacaoData.auth_status || 'approved'}
                      onChange={(e) => setLiberacaoData({...liberacaoData, auth_status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="approved">✓ Aprovada</option>
                      <option value="partial">⚠️ Parcial</option>
                      <option value="pending">⏳ Pendente de Análise</option>
                      <option value="denied">✗ Negada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 3: Confirmação */}
              <div className="flex items-center gap-3 p-3 bg-blue-100 border border-blue-400 rounded-lg">
                <input
                  type="checkbox"
                  id="authorized"
                  checked={liberacaoData.authorized}
                  onChange={(e) => setLiberacaoData({...liberacaoData, authorized: e.target.checked})}
                  className="w-5 h-5 text-blue-600 cursor-pointer"
                />
                <label htmlFor="authorized" className="flex-1 cursor-pointer">
                  <p className="font-semibold text-gray-900">Documentação validada e paciente autorizado</p>
                  <p className="text-xs text-gray-600">Marque para prosseguir com o faturamento</p>
                </label>
              </div>

            </div>
          )}

          {/* ABA 3: FATURAMENTO (PADRÃO TISS XML) */}
          {tabAtivo === 'faturamento' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-300 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-purple-900">💼 Estrutura de Faturamento TISS</p>
                <p className="text-xs text-purple-700 mt-1">Compatível com: Unimed, Fundação Copele, Sanepar, Itamed, PAM, SUS, Consórcios</p>
              </div>

              {!faturamentoData.guide_number?.trim() && (
                <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-800 font-semibold">
                    🔴 Campo obrigatório: Número sequencial da Guia TISS
                  </p>
                </div>
              )}

              {/* Seção 1: Tipo de Serviço */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">1</span>
                  Tipo de Serviço
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Tipo de Guia TISS</label>
                    <select
                      value={faturamentoData.guide_type || 'consulta'}
                      onChange={(e) => setFaturamentoData({...faturamentoData, guide_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                    >
                      <option value="">— Selecione o tipo —</option>
                      <option value="consulta">01.01 - Consulta Médica/Odontológica</option>
                      <option value="procedimento">01.02 - Procedimento</option>
                      <option value="internacao">01.03 - Internação Hospitalar</option>
                      <option value="urgencia">01.04 - Atendimento de Urgência</option>
                      <option value="exame">02.01 - Solicitação de Exame</option>
                      <option value="autorizacao">02.02 - Autorização de Procedimento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Codificação</label>
                    <select
                      value={faturamentoData.code_type || 'tuss'}
                      onChange={(e) => setFaturamentoData({...faturamentoData, code_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="tuss">TUSS (Padrão)</option>
                      <option value="cbhpm">CBHPM (Medicina)</option>
                      <option value="cpt">CPT (Odontologia)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Código do Procedimento</label>
                    <Input
                      value={faturamentoData.procedure_code}
                      onChange={(e) => setFaturamentoData({...faturamentoData, procedure_code: e.target.value})}
                      placeholder="Ex: 30101020"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados do Atendimento */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">2</span>
                  Dados do Atendimento
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Data do Atendimento</label>
                    <Input
                      type="date"
                      value={faturamentoData.service_date}
                      onChange={(e) => setFaturamentoData({...faturamentoData, service_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Local de Atendimento</label>
                    <Input
                      value={faturamentoData.service_place}
                      onChange={(e) => setFaturamentoData({...faturamentoData, service_place: e.target.value})}
                      placeholder="Ex: Consultório, Hospital"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição do Serviço</label>
                    <Input
                      value={faturamentoData.service_name}
                      onChange={() => {}}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Profissional Executante</label>
                    <Input
                      value={faturamentoData.responsible_doctor}
                      onChange={(e) => setFaturamentoData({...faturamentoData, responsible_doctor: e.target.value})}
                      placeholder="Nome do profissional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Profissional Solicitante</label>
                    <Input
                      value={faturamentoData.requesting_doctor}
                      onChange={(e) => setFaturamentoData({...faturamentoData, requesting_doctor: e.target.value})}
                      placeholder="Médico que solicitou"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Dados da Guia TISS */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">3</span>
                  Identificação da Guia TISS
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nº Sequencial da Guia TISS <span className="text-red-500">*</span></label>
                    <Input
                      value={faturamentoData.guide_number}
                      onChange={(e) => setFaturamentoData({...faturamentoData, guide_number: e.target.value})}
                      placeholder="Ex: 000000001"
                      className="font-mono text-lg font-bold"
                    />
                    <p className="text-xs text-gray-600 mt-1">Será componente do arquivo XML para faturamento</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Valor Solicitado (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={faturamentoData.estimated_value}
                      onChange={(e) => setFaturamentoData({...faturamentoData, estimated_value: e.target.value})}
                      placeholder="0,00"
                      className="text-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Valor Autorizado (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={faturamentoData.authorized_value || faturamentoData.estimated_value}
                      onChange={(e) => setFaturamentoData({...faturamentoData, authorized_value: e.target.value})}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 4: Observações */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📝 Observações Adicionais</h3>
                <textarea
                  value={faturamentoData.notes}
                  onChange={(e) => setFaturamentoData({...faturamentoData, notes: e.target.value})}
                  placeholder="Informações complementares para o arquivo XML..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows="3"
                />
              </div>

              {/* Status de Preparação */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-blue-900">
                  ✓ Guia TISS {faturamentoData.guide_number?.trim() ? 'pronta para XML' : 'incompleta'}
                </p>
                {faturamentoData.guide_number?.trim() && (
                  <p className="text-xs text-blue-700 mt-1">
                    Operadora: {liberacaoData.payer_name} | Arquivo será estruturado conforme padrão
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ABA 4: PAGAMENTO (PARTICULAR) */}
          {tabAtivo === 'pagamento' && showPaymentTab && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                  💳 Registre o pagamento da consulta no balcão
                </p>
                <p className="text-xs text-orange-700 mt-1">Preencha os dados específicos da forma de pagamento</p>
              </div>

              {!pagamentoData.payment_method && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800 font-semibold">
                    🔴 Selecione uma forma de pagamento para continuar
                  </p>
                </div>
              )}

              {/* Valor da Consulta e Forma de Pagamento */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4">
                  <label className="block text-xs font-bold text-blue-900 mb-2">VALOR ORIGINAL</label>
                  <p className="text-3xl font-bold text-blue-700">
                    R$ {parseFloat(faturamentoData.estimated_value || '0').toFixed(2)}
                  </p>
                </div>

                {faturamentoData.discount > 0 && (
                  <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-400 rounded-lg p-4">
                    <label className="block text-xs font-bold text-red-900 mb-2">💰 DESCONTO AUTORIZADO</label>
                    <p className="text-3xl font-bold text-red-600">
                      - R$ {parseFloat(faturamentoData.discount || '0').toFixed(2)}
                    </p>
                    {faturamentoData.discount_reason && (
                      <p className="text-xs text-red-700 mt-2 font-medium">Motivo: {faturamentoData.discount_reason}</p>
                    )}
                  </div>
                )}

                <div className={`bg-gradient-to-br ${faturamentoData.discount > 0 ? 'from-green-50 to-green-100 border border-green-400' : 'from-blue-50 to-blue-100 border border-blue-300'} rounded-lg p-4`}>
                  <label className="block text-xs font-bold text-gray-900 mb-2">VALOR A PAGAR</label>
                  <p className={`text-3xl font-bold ${faturamentoData.discount > 0 ? 'text-green-700' : 'text-blue-700'}`}>
                    R$ {(parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Seção de Ajuste de Desconto */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  Desconto Autorizado
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Valor do Desconto (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={faturamentoData.discount || 0}
                      onChange={(e) => setFaturamentoData({...faturamentoData, discount: parseFloat(e.target.value) || 0})}
                      placeholder="0,00"
                      className="text-lg font-bold border-red-400 focus:ring-red-500"
                    />
                    <p className="text-xs text-gray-600 mt-1">Deixe em branco ou 0 para sem desconto</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo do Desconto</label>
                    <select
                      value={faturamentoData.discount_reason || ''}
                      onChange={(e) => setFaturamentoData({...faturamentoData, discount_reason: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">— Nenhum motivo —</option>
                      <option value="Autorizado Adm">Autorizado Adm</option>
                      <option value="Autorizado Médico">Autorizado Médico</option>
                      <option value="Convênio/Acordo">Convênio/Acordo</option>
                      <option value="Promoção">Promoção</option>
                      <option value="Fidelidade">Fidelidade</option>
                      <option value="Dificuldade Financeira">Dificuldade Financeira</option>
                      <option value="Erro de Cobrança">Erro de Cobrança</option>
                      <option value="Cortesia">Cortesia</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Forma de Pagamento <span className="text-red-500">*</span></label>
                <select
                  value={pagamentoData.payment_method}
                  onChange={(e) => {
                    const valorComDesconto = (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2);
                    setPagamentoData({
                      ...pagamentoData,
                      payment_method: e.target.value,
                      amount_paid: valorComDesconto
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Selecione —</option>
                  <option value="DINHEIRO">💵 Dinheiro</option>
                  <option value="CARTAO">💳 Cartão de Crédito/Débito</option>
                  <option value="PIX">📱 PIX</option>
                  <option value="CHEQUE">📋 Cheque</option>
                  <option value="BOLETO">📄 Boleto</option>
                </select>
              </div>

              {/* ====== PAGAMENTO EM DINHEIRO ====== */}
              {pagamentoData.payment_method === 'DINHEIRO' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                    <h3 className="font-bold text-green-900 mb-3 text-sm">💵 Dados do Pagamento em Dinheiro</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Valor Recebido (R$) <span className="text-red-500">*</span></label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pagamentoData.amount_paid}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            const valorComDesconto = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
                            const change = (value - valorComDesconto).toFixed(2);
                            setPagamentoData({
                              ...pagamentoData,
                              amount_paid: e.target.value,
                              change: change
                            });
                          }}
                          placeholder="0,00"
                          className="font-bold text-lg border-green-300 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Troco (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pagamentoData.change}
                          disabled
                          className="bg-green-200 font-bold text-green-900 border-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                        <div className={`px-3 py-2 rounded font-bold text-center ${parseFloat(pagamentoData.amount_paid || '0') >= (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')) ? 'bg-green-200 text-green-900' : 'bg-yellow-200 text-yellow-900'}`}>
                          {parseFloat(pagamentoData.amount_paid || '0') >= (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')) ? '✓ OK' : '⚠️ Incompleto'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">📝 Observações</label>
                    <textarea
                      value={pagamentoData.notes}
                      onChange={(e) => setPagamentoData({...pagamentoData, notes: e.target.value})}
                      placeholder="Ex: Cliente solicitou recibo, trocos em moedas, etc..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      rows="2"
                    />
                  </div>
                </div>
              )}

              {/* ====== PAGAMENTO COM CARTÃO ====== */}
              {pagamentoData.payment_method === 'CARTAO' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
                    <h3 className="font-bold text-purple-900 mb-3 text-sm">💳 Dados do Cartão</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Bandeira <span className="text-red-500">*</span></label>
                        <select
                          value={pagamentoData.card_brand}
                          onChange={(e) => setPagamentoData({...pagamentoData, card_brand: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">— Selecione —</option>
                          <option value="VISA">VISA</option>
                          <option value="MASTERCARD">MASTERCARD</option>
                          <option value="ELO">ELO</option>
                          <option value="AMEX">AMERICAN EXPRESS</option>
                          <option value="HIPERCARD">HIPERCARD</option>
                          <option value="OUTRO">OUTRO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Últimos 4 Dígitos <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.card_last_digits}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setPagamentoData({...pagamentoData, card_last_digits: cleaned});
                          }}
                          placeholder="0000"
                          maxLength="4"
                          className="text-center font-mono text-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Parcelas <span className="text-red-500">*</span></label>
                        <select
                          value={pagamentoData.card_installments}
                          onChange={(e) => setPagamentoData({...pagamentoData, card_installments: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
                            <option key={n} value={n}>{n}x</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Nº Autorização/Comprovante <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.receipt_number}
                          onChange={(e) => setPagamentoData({...pagamentoData, receipt_number: e.target.value})}
                          placeholder="Ex: 123456"
                          className="text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pagamentoData.amount_paid}
                          onChange={(e) => setPagamentoData({...pagamentoData, amount_paid: e.target.value})}
                          disabled
                          className="bg-gray-100 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">📝 Observações</label>
                    <textarea
                      value={pagamentoData.notes}
                      onChange={(e) => setPagamentoData({...pagamentoData, notes: e.target.value})}
                      placeholder="Ex: Cliente solicitou nota, problemas na máquina, etc..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      rows="2"
                    />
                  </div>
                </div>
              )}

              {/* ====== PAGAMENTO VIA PIX ====== */}
              {pagamentoData.payment_method === 'PIX' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-3 text-sm">📱 Dados do PIX</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Identificador PIX (Chave/CPF/Telefone) <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.pix_identifier}
                          onChange={(e) => setPagamentoData({...pagamentoData, pix_identifier: e.target.value})}
                          placeholder="Ex: chave@email.com, 123.456.789-10, (11) 99999-9999"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ID da Transação PIX <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.pix_transaction_id}
                          onChange={(e) => setPagamentoData({...pagamentoData, pix_transaction_id: e.target.value})}
                          placeholder="Ex: e1047061-7aed-4f57-bcb0-f851c621c1e6"
                          className="text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Horário do PIX</label>
                        <Input
                          type="datetime-local"
                          value={pagamentoData.pix_timestamp}
                          onChange={(e) => setPagamentoData({...pagamentoData, pix_timestamp: e.target.value})}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pagamentoData.amount_paid}
                          onChange={(e) => setPagamentoData({...pagamentoData, amount_paid: e.target.value})}
                          disabled
                          className="bg-gray-100 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">📝 Observações</label>
                    <textarea
                      value={pagamentoData.notes}
                      onChange={(e) => setPagamentoData({...pagamentoData, notes: e.target.value})}
                      placeholder="Ex: Comprovante enviado via WhatsApp, valor confirmado..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      rows="2"
                    />
                  </div>
                </div>
              )}

              {/* ====== PAGAMENTO COM CHEQUE ====== */}
              {pagamentoData.payment_method === 'CHEQUE' && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <h3 className="font-bold text-yellow-900 mb-3 text-sm">📋 Dados do Cheque</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Banco <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.check_bank}
                          onChange={(e) => setPagamentoData({...pagamentoData, check_bank: e.target.value})}
                          placeholder="Ex: Banco do Brasil"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Agência <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.check_agency}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 5);
                            setPagamentoData({...pagamentoData, check_agency: cleaned});
                          }}
                          placeholder="0000"
                          className="text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Conta <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.check_account}
                          onChange={(e) => setPagamentoData({...pagamentoData, check_account: e.target.value})}
                          placeholder="Ex: 123456-7"
                          className="text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Nº Cheque <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.check_number}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setPagamentoData({...pagamentoData, check_number: cleaned});
                          }}
                          placeholder="0000000000"
                          className="text-sm font-mono font-bold text-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Compensação <span className="text-red-500">*</span></label>
                        <Input
                          type="date"
                          value={pagamentoData.check_due_date}
                          onChange={(e) => setPagamentoData({...pagamentoData, check_due_date: e.target.value})}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pagamentoData.amount_paid}
                          onChange={(e) => setPagamentoData({...pagamentoData, amount_paid: e.target.value})}
                          disabled
                          className="bg-gray-100 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-800">⚠️ <span className="font-semibold">Atenção:</span> Verifique a data da compensação do cheque antes de confirmar</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">📝 Observações</label>
                    <textarea
                      value={pagamentoData.notes}
                      onChange={(e) => setPagamentoData({...pagamentoData, notes: e.target.value})}
                      placeholder="Ex: Cheque pré-datado, solicitação de cliente confirmada..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      rows="2"
                    />
                  </div>
                </div>
              )}

              {/* ====== PAGAMENTO COM BOLETO ====== */}
              {pagamentoData.payment_method === 'BOLETO' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-300 rounded-lg p-4">
                    <h3 className="font-bold text-indigo-900 mb-3 text-sm">📄 Dados do Boleto</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Nº Boleto (Código de Barras) <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.boleto_number}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 47);
                            setPagamentoData({...pagamentoData, boleto_number: cleaned});
                          }}
                          placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
                          className="text-sm font-mono font-bold"
                        />
                        <p className="text-xs text-gray-500 mt-1">47 dígitos do código de barras</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Banco <span className="text-red-500">*</span></label>
                        <Input
                          value={pagamentoData.boleto_bank}
                          onChange={(e) => setPagamentoData({...pagamentoData, boleto_bank: e.target.value})}
                          placeholder="Ex: Caixa"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Vencimento <span className="text-red-500">*</span></label>
                        <Input
                          type="date"
                          value={pagamentoData.boleto_due_date}
                          onChange={(e) => setPagamentoData({...pagamentoData, boleto_due_date: e.target.value})}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pagamentoData.amount_paid}
                          onChange={(e) => setPagamentoData({...pagamentoData, amount_paid: e.target.value})}
                          disabled
                          className="bg-gray-100 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-800">⚠️ <span className="font-semibold">Atenção:</span> Boleto é apenas para futura compensação. Registre como pendente.</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">📝 Observações</label>
                    <textarea
                      value={pagamentoData.notes}
                      onChange={(e) => setPagamentoData({...pagamentoData, notes: e.target.value})}
                      placeholder="Ex: Boleto enviado por email, data negociada..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      rows="2"
                    />
                  </div>
                </div>
              )}

              {/* Resumo de Pagamento */}
              {pagamentoData.payment_method && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-400 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-green-900">✓ Resumo do Pagamento</p>
                    <span className="inline-block px-2 py-1 bg-green-200 text-green-900 text-xs font-bold rounded">PRONTO</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-green-700">Forma</p>
                      <p className="font-bold text-green-900">{pagamentoData.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Valor</p>
                      <p className="font-bold text-lg text-green-900">R$ {parseFloat(pagamentoData.amount_paid || '0').toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Status</p>
                      <p className="font-bold text-green-900">Registrado ✓</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 4.5: RESUMO FINANCEIRO - REGISTRO, CAIXA E CONTAS A RECEBER */}
          {tabAtivo === 'financeiro' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-300 rounded-lg p-4 mb-4">
                <p className="text-lg font-bold text-purple-900 flex items-center gap-2">
                  <TrendingUp size={20} />
                  📊 Resumo Financeiro {isConvenioFaturado ? '- Convênio/Faturamento' : '- Particular'}
                </p>
                <p className="text-sm text-purple-700 mt-1">
                  {isConvenioFaturado 
                    ? 'Informações de autorização e faturamento TISS' 
                    : 'Informações de registro, contas a receber e fluxo de caixa'}
                </p>
              </div>

              {/* Seção 1: Informações de Registro */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <FileText size={18} />
                  Informações de Registro
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border border-blue-100">
                    <p className="text-xs text-gray-600 font-medium">Data/Hora de Registro</p>
                    <p className="font-semibold text-gray-900">
                      {new Date().toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-100">
                    <p className="text-xs text-gray-600 font-medium">Registrado por</p>
                    <p className="font-semibold text-gray-900">Sistema Automático</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-100">
                    <p className="text-xs text-gray-600 font-medium">Hash de Operação</p>
                    <p className="font-mono text-xs font-semibold text-gray-900">{appointment.id.substring(0, 12)}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-100">
                    <p className="text-xs text-gray-600 font-medium">Status de Auditoria</p>
                    <p className="font-semibold text-green-600">✓ Rastreado</p>
                  </div>
                </div>
              </div>

              {/* ✅ CONVÊNIO FATURADO: Mostrar Liberação + Faturamento */}
              {isConvenioFaturado && (
                <>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="font-semibold text-blue-900 mb-3">✓ Liberação/Autorização</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Convênio</p>
                        <p className="font-semibold text-gray-900">{liberacaoData.payer_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Plano</p>
                        <p className="font-semibold text-gray-900">{liberacaoData.plan_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Nº Autorização</p>
                        <p className="font-semibold text-blue-600">{liberacaoData.auth_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Validade</p>
                        <p className="font-semibold text-gray-900">{liberacaoData.auth_expiry || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="font-semibold text-purple-900 mb-3">💰 Faturamento TISS</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Serviço</p>
                        <p className="font-semibold text-gray-900">{faturamentoData.service_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Nº Guia TISS</p>
                        <p className="font-semibold text-purple-600">{faturamentoData.guide_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Médico</p>
                        <p className="font-semibold text-gray-900">{faturamentoData.responsible_doctor || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Valor Estimado</p>
                        <p className="font-bold text-purple-600">R$ {parseFloat(faturamentoData.estimated_value || '0').toFixed(2)}</p>
                      </div>
                      {parseFloat(faturamentoData.discount || '0') > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Desconto</p>
                          <p className="font-semibold text-red-600">- R$ {parseFloat(faturamentoData.discount || '0').toFixed(2)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Valor Final</p>
                        <p className="font-bold text-green-600">R$ {(parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ✅ PARTICULAR/CONVÊNIO PARTICULAR: Mostrar Dados para Caixa + AR */}
              {(isParticular || isConvenioParticular) && (
                <>
                  {/* Seção 2: Dados do Atendimento para Caixa */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                      <DollarSign size={18} />
                      Dados para Fechamento de Caixa
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border border-orange-100">
                        <p className="text-xs text-gray-600 font-medium">Paciente</p>
                        <p className="font-semibold text-gray-900">{appointment.patients?.name || 'N/A'}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-orange-100">
                        <p className="text-xs text-gray-600 font-medium">Forma de Pagamento</p>
                        <p className="font-semibold text-gray-900">{pagamentoData.payment_method ? formatPaymentMethod(pagamentoData.payment_method) : (appointment.payer_id ? 'Convênio' : 'Não definida')}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-orange-100">
                        <p className="text-xs text-gray-600 font-medium">Valor Total</p>
                        <p className="font-bold text-orange-600">R$ {(parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2)}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-orange-100">
                        <p className="text-xs text-gray-600 font-medium">Profissional</p>
                        <p className="font-semibold text-gray-900">{appointment.professionals?.name || '—'}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-orange-100">
                        <p className="text-xs text-gray-600 font-medium">Serviço</p>
                        <p className="font-semibold text-gray-900">{appointment.services?.name || '—'}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-orange-100">
                        <p className="text-xs text-gray-600 font-medium">Convênio</p>
                        <p className="font-semibold text-gray-900">{appointment.payers?.name || 'Particular'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Seção 3: Status de Contas a Receber */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <TrendingUp size={18} />
                      Contas a Receber (AR)
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border border-green-100">
                        <p className="text-xs text-gray-600 font-medium">Status</p>
                        <p className={`font-semibold ${registroData.receivableStatus === 'criada' ? 'text-green-600' : 'text-gray-500'}`}>
                          {registroData.receivableStatus === 'criada' ? '✓ Criada' : 'Não criada'}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border border-green-100">
                        <p className="text-xs text-gray-600 font-medium">Valor da AR</p>
                        <p className="font-bold text-green-600">R$ {registroData.arValue.toFixed(2)}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-green-100">
                        <p className="text-xs text-gray-600 font-medium">ID da AR</p>
                        <p className="font-mono text-xs font-semibold text-gray-900">
                          {registroData.receivableId ? registroData.receivableId.substring(0, 8) + '...' : 'Aguardando'}
                        </p>
                      </div>
                    </div>
                    {registroData.receivableStatus === 'criada' && (
                      <div className="mt-3 p-2 bg-green-100 rounded border border-green-300 text-xs text-green-800">
                        ✓ Conta a Receber criada com sucesso e registrada na auditoria financeira
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Seção 4: Fluxo de Caixa */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="font-semibold text-indigo-900 mb-3">📈 Fluxo de Caixa</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border border-indigo-100">
                    <p className="text-xs text-gray-600 font-medium">Saldo atual</p>
                    <p className="font-bold text-indigo-600">Não disponível</p>
                    <p className="text-xs text-gray-500">Será atualizado após fechamento</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-indigo-100">
                    <p className="text-xs text-gray-600 font-medium">Lançamento no caixa</p>
                    <p className={`font-semibold ${registroData.cashFlowRegistered ? 'text-green-600' : 'text-gray-500'}`}>
                      {registroData.cashFlowRegistered ? '✓ Registrado' : 'Pendente de confirmação'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Seção 5: Resumo de Segurança */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-3">🔒 Segurança e Conformidade</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">Dados cadastrais validados conforme padrão TISS</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${registroData.receivableStatus === 'criada' ? 'text-green-600' : 'text-gray-400'}`}>
                      {registroData.receivableStatus === 'criada' ? '✓' : '○'}
                    </span>
                    <span className="text-gray-700">Conta a Receber {registroData.receivableStatus === 'criada' ? 'registrada' : 'será registrada'} no sistema</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">Auditoria financeira ativada e rastreando</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">Pronto para fechamento de caixa</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ABA 5: RESUMO FINAL */}
          {tabAtivo === 'resumo' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
                <p className="text-lg font-bold text-green-900">
                  ✅ Dados do Atendimento Confirmados
                </p>
                <p className="text-sm text-green-700 mt-1">Resumo de todos os dados preenchidos</p>
              </div>

              {/* Resumo Cadastrais */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-semibold text-gray-900 mb-3">📝 Dados Cadastrais</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Nome</p>
                    <p className="font-semibold text-gray-900">{cadastralData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Email</p>
                    <p className="font-semibold text-gray-900">{cadastralData.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">CPF/RG</p>
                    <p className="font-semibold text-gray-900">{cadastralData.document_id || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Telefone</p>
                    <p className="font-semibold text-gray-900">{cadastralData.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Celular</p>
                    <p className="font-semibold text-gray-900">{cadastralData.cell_phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Data de Nascimento</p>
                    <p className="font-semibold text-gray-900">{cadastralData.birthdate || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Resumo Convênio Faturado */}
              {isConvenioFaturado && (
                <>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="font-semibold text-gray-900 mb-3">✓ Liberação</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Convênio</p>
                        <p className="font-semibold text-gray-900">{liberacaoData.payer_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Plano</p>
                        <p className="font-semibold text-gray-900">{liberacaoData.plan_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Nº Autorização</p>
                        <p className="font-semibold text-gray-900 text-blue-600">{liberacaoData.auth_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Vencimento</p>
                        <p className="font-semibold text-gray-900">{liberacaoData.auth_expiry || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="font-semibold text-gray-900 mb-3">💰 Faturamento</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Serviço</p>
                        <p className="font-semibold text-gray-900">{faturamentoData.service_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Nº Guia TISS</p>
                        <p className="font-semibold text-purple-600">{faturamentoData.guide_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Médico Responsável</p>
                        <p className="font-semibold text-gray-900">{faturamentoData.responsible_doctor || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Valor Estimado</p>
                        <p className="font-semibold text-gray-900">R$ {parseFloat(faturamentoData.estimated_value || '0').toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Resumo Particular ou Convênio Particular */}
              {(isParticular || isConvenioParticular) && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="font-semibold text-gray-900 mb-3">💳 Pagamento</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Forma de Pagamento</p>
                      <p className="font-semibold text-gray-900">{formatPaymentMethod(pagamentoData.payment_method)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Valor da Consulta</p>
                      <p className="font-semibold text-gray-900">R$ {parseFloat(faturamentoData.estimated_value || '0').toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Valor Recebido</p>
                      {/* Force recalculation on render to avoid stale values */}
                      <p className="font-semibold text-green-600">R$ {(parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2)}</p>
                    </div>
                    {pagamentoData.payment_method === 'DINHEIRO' && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Troco</p>
                        <p className="font-semibold text-green-600">R$ {parseFloat(pagamentoData.change || '0').toFixed(2)}</p>
                      </div>
                    )}
                    {pagamentoData.payment_method === 'CARTAO' && parseInt(pagamentoData.card_installments || 1) > 1 && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Parcelamento</p>
                        <p className="font-semibold text-blue-600">{pagamentoData.card_installments}x</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Exibição de parcelas quando parcelado */}
                  {pagamentoData.payment_method === 'CARTAO' && parseInt(pagamentoData.card_installments || 1) > 1 && (
                    <div className="mt-4 pt-4 border-t border-orange-300">
                      <p className="text-xs font-bold text-orange-900 mb-2">📊 Cronograma de Parcelas (Contas a Receber)</p>
                      <div className="grid gap-2 text-xs">
                        {Array.from({ length: parseInt(pagamentoData.card_installments || 1) }).map((_, i) => {
                          const dueDate = new Date();
                          dueDate.setDate(dueDate.getDate() + 30 + (i * 30));
                          // 💰 Aplicar DESCONTO ao cálculo das parcelas
                          const valueWithDiscount = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
                          const installmentValue = (valueWithDiscount / parseInt(pagamentoData.card_installments || 1)).toFixed(2);
                          return (
                            <div key={i} className="flex justify-between bg-white px-3 py-2 rounded border border-orange-100">
                              <span className="font-medium text-gray-700">Parcela {i + 1}:</span>
                              <span className="text-gray-900">
                                R$ {parseFloat(installmentValue).toFixed(2)} - Vence em {dueDate.toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 text-center">
                <p className="text-green-900 font-bold text-lg">
                  🎉 Tudo pronto para liberar o atendimento!
                </p>
              </div>
            </div>
          )}
            </div>
          </div>

          {/* FOOTER COM BOTÕES - SEMPRE VISÍVEL */}
          <div className="border-t border-gray-200 p-4 bg-white flex gap-2 justify-end flex-shrink-0">
            {tabAtivo === 'cadastrais' && (
              <>
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button
                  type="button"
                  onClick={() => window.open(`/clinica/pacientes/${appointment?.patient_id}`, '_blank')}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  <Edit2 size={16} className="mr-2" />
                  Editar Cadastro
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveCadastral}
                  disabled={loading || !cadastralStatus.complete}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
                  title={!cadastralStatus.complete ? 'Preencha todos os campos obrigatórios' : 'Salvar e ir para próxima aba'}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      ✓ Salvar e Continuar →
                    </>
                  )}
                </Button>
              </>
            )}
            
            {tabAtivo === 'liberacao' && (
              <>
                <Button type="button" variant="outline" onClick={() => setTabAtivo('cadastrais')}>← Voltar</Button>
                <Button
                  type="button"
                  onClick={handleSaveLiberacao}
                  disabled={!liberacaoData.card_number?.trim() || !liberacaoData.authorized || loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      ✓ Salvar e Continuar →
                    </>
                  )}
                </Button>
              </>
            )}
            
            {tabAtivo === 'faturamento' && (
              <>
                <Button type="button" variant="outline" onClick={() => setTabAtivo('liberacao')}>← Voltar</Button>
                <Button
                  type="button"
                  onClick={handleSaveFaturamento}
                  disabled={!faturamentoData.guide_number?.trim() || loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      ✓ Salvar e Continuar →
                    </>
                  )}
                </Button>
              </>
            )}
            
            {tabAtivo === 'pagamento' && (
              <>
                <Button type="button" variant="outline" onClick={() => setTabAtivo('cadastrais')}>← Voltar</Button>
                <Button
                  type="button"
                  onClick={handleSavePagamento}
                  disabled={!pagamentoData.payment_method || loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      ✓ Salvar e Continuar →
                    </>
                  )}
                </Button>
              </>
            )}
            
            {tabAtivo === 'financeiro' && (
              <>
                <Button type="button" variant="outline" onClick={() => setTabAtivo('pagamento')}>← Voltar</Button>
                <Button
                  type="button"
                  onClick={() => setTabAtivo('resumo')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Prosseguir para Resumo Final →
                </Button>
              </>
            )}
            
            {tabAtivo === 'resumo' && (
              <>
                <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
                {hasClinicalShortcuts ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenPatientRecord}
                      className="border-violet-300 text-violet-700 hover:bg-violet-100"
                    >
                      <FileText size={16} className="mr-2" />
                      Abrir Prontuário
                    </Button>
                    <Button
                      type="button"
                      onClick={handleOpenProfessionalFlow}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-bold"
                    >
                      {isReleasedForProfessional ? '▶ Iniciar Atendimento' : '↗ Abrir Atendimento'}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={handleCompleteCheckIn}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Liberando...
                      </>
                    ) : (
                      <>
                        ✅ Liberar para Atendimento
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>


    </Dialog>
  );
}
