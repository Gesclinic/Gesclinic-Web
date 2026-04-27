import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Clock3, AlertCircle, ChevronLeft, ChevronRight, X, CheckCircle, Edit2, Clock, User, DollarSign, TrendingUp, FileText } from 'lucide-react';
import PatientSearchOrCreate from './PatientSearchOrCreate';
import { APPOINTMENT_STATUS } from '@/lib/appointmentStatusEnums';
import { migrateStatus, SERVICE_STATUSES, getStatusLabelOnly } from '@/lib/appointmentStatusConstants';
import { createAR } from '@/lib/financeApi';
import { logAppointmentFinancialAudit, FINANCIAL_EVENT_TYPES } from '@/lib/auditFinancialApi';
import discountApprovalsApi from '@/lib/discountApprovalsApi';
import { getUserNameById } from '@/lib/usersApi';

// 💳 Função para formatar nome da forma de pagamento
const formatPaymentMethod = method => {
  const paymentNames = {
    'DINHEIRO': 'Dinheiro',
    'CARTAO': 'Cartão',
    'PIX': 'PIX',
    'CHEQUE': 'Cheque',
    'BOLETO': 'Boleto'
  };
  return paymentNames[method?.toUpperCase()] || method || '';
};

// ✨ FUNÇÕES HELPER PARA ABA DADOS AGENDAMENTO
const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MODAL_VISIBLE_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled'];
const STATUS_CONFIG = {
  'scheduled': {
    label: 'Agendado',
    icon: '📅',
    color: 'blue'
  },
  'confirmed': {
    label: 'Confirmado',
    icon: '✅',
    color: 'green'
  },
  'completed': {
    label: 'Completado',
    icon: '✓',
    color: 'emerald'
  },
  'cancelled': {
    label: 'Cancelado',
    icon: '✗',
    color: 'red'
  },
  'no-show': {
    label: 'Não Compareceu',
    icon: '⚠️',
    color: 'orange'
  }
};
const formatDateToIso = date => {
  if (!date) return '';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};
const parseLocalDate = dateString => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-');
  return new Date(year, month - 1, day);
};
const timeToMinutes = timeString => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};
const minutesToTime = minutes => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};
const formatScheduleWindow = schedule => {
  if (!schedule) return '';
  return `${schedule.start_time || '00:00'} - ${schedule.end_time || '23:59'}`;
};

// ✨ FUNÇÃO CORRETA PARA VERIFICAR DISPONIBILIDADE (CÓPIA DO APPOINTMENTUNITEDMODAL)
const isDateInsideScheduleRange = (dateString, schedule) => {
  if (!dateString) return false;
  const startsOk = !schedule?.start_date || dateString >= schedule.start_date;
  const endsOk = !schedule?.end_date || dateString <= schedule.end_date;
  return startsOk && endsOk;
};
const getSchedulesForDate = (dateString, schedules) => {
  const parsedDate = parseLocalDate(dateString);
  if (!parsedDate) return [];
  const weekday = parsedDate.getDay();
  return (schedules || []).filter(schedule => schedule && schedule.active !== false && Number(schedule.day_of_week) === weekday && isDateInsideScheduleRange(dateString, schedule)).sort((left, right) => timeToMinutes(left.start_time) - timeToMinutes(right.start_time));
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
  onSuccess
}) {
  const navigate = useNavigate();
  const {
    clinicId
  } = useClinicContext();
  const {
    user,
    currentRole
  } = useAuth();
  const [tabAtivo, setTabAtivo] = useState('dados_agendamento');
  const [loading, setLoading] = useState(false);
  const [checkInCompleted, setCheckInCompleted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successMessageVisible, setSuccessMessageVisible] = useState(false);
  const [isDiscountSectionOpen, setIsDiscountSectionOpen] = useState(false);

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
    zip_code: ''
  });

  // Validação de campos TISS
  const [cadastralStatus, setCadastralStatus] = useState({
    complete: false,
    missing: []
  });

  // Liberação (Padrão TISS)
  const [liberacaoData, setLiberacaoData] = useState({
    payer_name: '',
    plan_name: '',
    plan_code: '',
    card_number: '',
    // Matrícula do beneficiário
    requires_auth: 'no',
    // yes/no para saber se requer autorização
    auth_number: '',
    auth_expiry: '',
    auth_status: 'approved',
    // approved, partial, pending, denied
    authorized: false
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
    discount: 0,
    // 💰 DESCONTO AUTORIZADO
    discount_reason: '',
    // Motivo do desconto
    discount_authorized_by: null,
    // Quem autorizou o desconto
    discount_authorized_at: null,
    // Quando foi autorizado
    notes: ''
  });

  // Pagamento no Balcão - NOVO: Suporte a múltiplas formas de pagamento
  const [pagamentoSplits, setPagamentoSplits] = useState([]);

  // Pagamento no Balcão - LEGADO: Mantido para compatibilidade
  const [pagamentoData, setPagamentoData] = useState({
    payment_method: '',
    // DINHEIRO, CARTAO, PIX, CHEQUE, BOLETO, TRANSFERENCIA, DIRETO_PROFISSIONAL, FATURADO
    amount_paid: '',
    change: '',
    receipt_number: '',
    notes: '',
    // Específico para DINHEIRO
    cedulas: [],
    // Array de {valor, quantidade}
    // Específico para CARTAO
    card_last_digits: '',
    card_brand: '',
    // VISA, MASTERCARD, ELO, AMEX, etc
    card_installments: '1',
    // Específico para PIX
    pix_identifier: '',
    // Chave PIX
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
    // Específico para TRANSFERENCIA
    transfer_type: '',
    // PIX, TED, DOC
    transfer_reference: '',
    transfer_bank: '',
    // Específico para DIRETO_PROFISSIONAL
    repasse_type: '',
    // DINHEIRO, DEPOSITO, CHEQUE, PIX
    repasse_date: ''
  });

  // 💰 Informações de Registro e Caixa
  const [registroData, setRegistroData] = useState({
    receivableId: null,
    receivableStatus: 'não criada',
    registeredAt: null,
    registeredBy: null,
    operationHash: null,
    // Para rastreamento
    arValue: 0,
    paymentMethod: '',
    cashFlowRegistered: false
  });

  // 👤 Nome de quem autorizou o desconto
  const [discountAuthorizedByName, setDiscountAuthorizedByName] = useState('');

  // 💳 Estado para gerenciar split de pagamento em edição
  const [editingSplitId, setEditingSplitId] = useState(null);
  const [splitDetails, setSplitDetails] = useState({
    cardLastDigits: '',
    cardBrand: '',
    cardInstallments: '1',
    pixIdentifier: '',
    pixTransactionId: '',
    tedType: 'TED',
    // TED ou DOC
    tedReference: '',
    boletoNumber: '',
    boletoBarcode: '',
    bolletoDueDate: '',
    checkNumber: '',
    checkDueDate: ''
  });

  // ✨ ESTADOS PARA ABA DADOS AGENDAMENTO (Edição de Agendamento)
  const [agendamentoData, setAgendamentoData] = useState({
    patientId: '',
    patientName: '',
    phone: '',
    date: '',
    time: '',
    duration: 30,
    roomId: '',
    professionalId: '',
    serviceId: '',
    serviceCode: '',
    payerId: '',
    value: '',
    status: 'scheduled',
    notes: '',
    endTime: ''
  });
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [professionalSchedules, setProfessionalSchedules] = useState([]);
  const [loadingProfessionalSchedules, setLoadingProfessionalSchedules] = useState(false);
  const [calendarActiveStartDate, setCalendarActiveStartDate] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date());

  // ✨ FUNÇÕES DE ATUALIZAÇÃO PARA ABA DADOS AGENDAMENTO
  const updateAgendamentoField = (field, value) => {
    setAgendamentoData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const updateCadastralField = (field, value) => {
    setCadastralData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Carregar dados do paciente quando modal abre
  useEffect(() => {
    if (isOpen && appointment) {
      setLoading(false); // 🔄 Resetar loading
      // ⚠️ NÃO resetar tabAtivo aqui - vamos determinar na função loadPatientData
      loadPatientData();
    }
  }, [isOpen, appointment]);

  // ✨ Carregar dados para ABA DADOS AGENDAMENTO
  useEffect(() => {
    if (isOpen && clinicId) {
      const loadData = async () => {
        try {
          // Carregar profissionais
          const {
            data: profs
          } = await supabase.from('professionals').select('id, name').eq('clinic_id', clinicId);
          setProfessionals(profs || []);

          // Carregar serviços
          const {
            data: servs
          } = await supabase.from('services').select('id, name, code').eq('clinic_id', clinicId);
          setServices(servs || []);

          // Carregar convênios
          const {
            data: pyr
          } = await supabase.from('payers').select('id, name').eq('clinic_id', clinicId);
          setPayers(pyr || []);

          // Carregar salas
          const {
            data: rm
          } = await supabase.from('rooms').select('id, name').eq('clinic_id', clinicId);
          setRooms(rm || []);
        } catch (err) {
          console.warn('⚠️ Erro ao carregar dados da aba:', err.message);
        }
      };
      loadData();
    }
  }, [isOpen, clinicId]);

  // ✨ CARREGAR DADOS DO APPOINTMENT EXISTENTE PARA A ABA
  useEffect(() => {
    if (isOpen && appointment) {
      console.log('✅ Carregando dados do appointment existente para aba Dados Agendamento');

      // Preencher agendamentoData
      setAgendamentoData({
        patientId: appointment.patient_id || '',
        patientName: appointment.patients?.name || appointment.patient_name || '',
        phone: appointment.patients?.phone || appointment.patient_phone || '',
        date: appointment.scheduled_date || '',
        time: appointment.scheduled_time || appointment.start_time?.split('T')[1]?.slice(0, 5) || '',
        duration: appointment.duration_minutes || appointment.duration || 30,
        roomId: appointment.room_id || '',
        professionalId: appointment.professional_id || '',
        serviceId: appointment.service_id || '',
        serviceCode: appointment.services?.code || '',
        payerId: appointment.payer_id || '',
        value: appointment.value?.toString() || '',
        status: appointment.status || 'scheduled',
        notes: appointment.notes || '',
        endTime: appointment.end_time || ''
      });

      // Preencher cadastralData
      setCadastralData({
        name: appointment.patients?.name || '',
        document_id: appointment.patients?.document_id || '',
        birthdate: appointment.patients?.birthdate || '',
        gender: appointment.patients?.gender || '',
        phone: appointment.patients?.phone || '',
        cell_phone: appointment.patients?.cell_phone || '',
        email: appointment.patients?.email || '',
        street: appointment.patients?.street || '',
        number: appointment.patients?.number || '',
        neighborhood: appointment.patients?.neighborhood || '',
        city: appointment.patients?.city || '',
        state: appointment.patients?.state || '',
        zip_code: appointment.patients?.zip_code || ''
      });

      // Preencher selectedPatient
      if (appointment.patients) {
        setSelectedPatient({
          patientId: appointment.patient_id,
          patientName: appointment.patients.name || '',
          name: appointment.patients.name || '',
          document_id: appointment.patients.document_id || '',
          phone: appointment.patients.phone || '',
          birthdate: appointment.patients.birthdate || '',
          gender: appointment.patients.gender || '',
          cell_phone: appointment.patients.cell_phone || '',
          email: appointment.patients.email || '',
          street: appointment.patients.street || '',
          number: appointment.patients.number || '',
          neighborhood: appointment.patients.neighborhood || '',
          city: appointment.patients.city || '',
          state: appointment.patients.state || '',
          zip_code: appointment.patients.zip_code || ''
        });
      }

      // Carregar schedules do profissional selecionado
      if (appointment.professional_id) {
        (async () => {
          try {
            setLoadingProfessionalSchedules(true);
            const {
              data: schedules
            } = await supabase.from('professional_schedules').select('*').eq('professional_id', appointment.professional_id).eq('clinic_id', clinicId);
            setProfessionalSchedules(schedules || []);
            console.log('✅ Schedules carregados:', schedules?.length);
          } catch (err) {
            console.warn('⚠️ Erro ao carregar schedules:', err.message);
          } finally {
            setLoadingProfessionalSchedules(false);
          }
        })();
      }

      // Inicializar calendário com a data do agendamento
      if (appointment.scheduled_date) {
        const appointmentDate = parseLocalDate(appointment.scheduled_date);
        if (appointmentDate) {
          setCalendarActiveStartDate(appointmentDate);
          setCalendarSelectedDate(appointmentDate);
        }
      }
    }
  }, [isOpen, appointment, clinicId]);

  // ✨ CARREGAR SCHEDULES QUANDO PROFISSIONAL MUDA
  useEffect(() => {
    if (agendamentoData.professionalId && isOpen) {
      const loadSchedules = async () => {
        try {
          setLoadingProfessionalSchedules(true);
          const {
            data: schedules
          } = await supabase.from('professional_schedules').select('*').eq('professional_id', agendamentoData.professionalId).eq('clinic_id', clinicId);
          setProfessionalSchedules(schedules || []);
          console.log('✅ Schedules do profissional carregados:', schedules?.length);
        } catch (err) {
          console.warn('⚠️ Erro ao carregar schedules:', err.message);
        } finally {
          setLoadingProfessionalSchedules(false);
        }
      };
      loadSchedules();
    } else {
      setProfessionalSchedules([]);
    }
  }, [agendamentoData.professionalId, isOpen, clinicId]);
  const loadPatientData = async () => {
    try {
      if (!appointment || !appointment.patient_id) return;

      // 🔄 Primeiro, recarregar DATA MAIS RECENTE do appointment do banco
      console.log('🔄 Carregando dados mais recentes do appointment...');
      let appointmentFresh = appointment; // Fallback: usar o appointment original
      const {
        data: appointmentData,
        error: appointmentError
      } = await supabase.from('appointments').select('*').eq('id', appointment.id).maybeSingle();
      if (appointmentError) {
        console.error('❌ Erro ao carregar appointment:', appointmentError);
      } else if (!appointmentData) {
        console.warn('⚠️ Dados do appointment não encontrados');
      } else if (appointmentData) {
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
          notes: appointmentFresh.notes
        });
      } else {
        console.warn('⚠️ Usando dados do appointment original (não conseguiu recarregar):', appointmentError?.message);
      }
      const {
        data,
        error
      } = await supabase.from('patients').select('*').eq('id', appointment.patient_id).maybeSingle();
      if (error) {
        console.error('❌ Erro ao buscar dados do paciente:', error);
        throw error;
      }
      if (!data) {
        throw new Error("Paciente não encontrado");
      }

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
        zip_code: data?.zip_code || ''
      };
      setCadastralData(patientData);

      // 🔍 Validar campos obrigatórios TISS
      const requiredFields = [['name', 'Nome Completo'], ['document_id', 'CPF'], ['birthdate', 'Data de Nascimento'], ['gender', 'Sexo'], ['email', 'Email'], ['phone', 'Telefone'], ['street', 'Rua'], ['number', 'Número'], ['neighborhood', 'Bairro'], ['city', 'Cidade'], ['state', 'Estado'], ['zip_code', 'CEP']];
      const missing = requiredFields.filter(([field, label]) => !patientData[field] || patientData[field].toString().trim() === '').map(([field, label]) => label);
      setCadastralStatus({
        complete: missing.length === 0,
        missing: missing
      });

      // 🔥 Buscar o valor correto baseado em convênio + plano + serviço
      let estimatedValue = appointment.value || '0';
      if (appointment.payer_id && appointment.service_id) {
        try {
          // Buscar preço específico do serviço para este convênio
          const {
            data: priceData,
            error: priceError
          } = await supabase.from('service_prices').select('price').eq('payer_id', appointment.payer_id).eq('service_id', appointment.service_id).maybeSingle();
          if (!priceError && priceData && priceData.price) {
            estimatedValue = priceData.price;
          } else {
            // Se não encontrar, buscar preço padrão do serviço
            const {
              data: serviceData,
              error: serviceError
            } = await supabase.from('services').select('default_price, default_duration_minutes').eq('id', appointment.service_id).maybeSingle();
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
        authorized: !!freshAuthNumber
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
        requesting_doctor_appointment: appointment.requesting_doctor
      });
      setFaturamentoData({
        service_name: appointment.services?.name || '',
        guide_type: freshBillingData?.guide_type || 'consulta',
        code_type: freshBillingData?.code_type || 'tuss',
        procedure_code: freshBillingData?.procedure_code || appointment.services?.tuss_code || '',
        // 🔗 Puxar código TUSS do serviço
        service_date: freshBillingData?.service_date || appointment.scheduled_date || '',
        service_place: freshBillingData?.service_place || appointment.service_place || '',
        requesting_doctor: freshBillingData?.requesting_doctor || appointment.requesting_doctor || '',
        responsible_doctor: freshBillingData?.responsible_doctor || appointment.professionals?.name || '',
        guide_number: freshGuideNumber || liberacaoData.auth_number || '',
        // 🔗 Puxar do Nº Autorização da aba Liberação
        estimated_value: freshBillingData?.estimated_value || appointment.value || estimatedValue,
        // 💰 Puxar valor do agendamento
        authorized_value: freshBillingData?.authorized_value || appointment.value || estimatedValue,
        // 💰 Puxar valor do agendamento
        discount: parseFloat(freshBillingData?.discount !== undefined ? freshBillingData.discount : appointmentFresh?.discount || appointment.discount || 0),
        // ✅ Sempre carregar desconto do appointmentFresh do banco
        discount_reason: appointmentFresh?.discount_reason || appointment.discount_reason || freshBillingData?.discount_reason || '',
        // ✅ Carregar motivo do desconto
        discount_authorized_by: appointmentFresh?.discount_authorized_by || appointment.discount_authorized_by || null,
        // ✅ Carregar quem autorizou o desconto
        discount_authorized_at: appointmentFresh?.discount_authorized_at || appointment.discount_authorized_at || null,
        // ✅ Carregar quando foi autorizado
        notes: appointmentFresh?.notes || appointment.notes || freshBillingData?.notes || '' // ✅ Carregar observação
      });

      // Preencher dados de pagamento (so para particular)
      const discountAmount = parseFloat(appointmentFresh?.discount || appointment.discount || 0);
      const amountWithDiscount = estimatedValue - discountAmount;
      setPagamentoData({
        payment_method: appointmentFresh?.payment_method || appointment.payment_method || '',
        amount_paid: appointmentFresh?.amount_paid || amountWithDiscount.toFixed(2),
        change: '',
        receipt_number: appointmentFresh?.authorization_number || appointment.authorization_number || '',
        // ✅ Carregar Nº Autorização do banco
        notes: appointmentFresh?.notes || appointment.notes || '',
        // ✅ Carregar observação do banco
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
        boleto_bank: ''
      });

      // 💳 Carregar múltiplos pagamentoSplits se estiverem salvos no campo notes
      try {
        if (appointmentFresh?.notes && appointmentFresh.notes.includes('Múltiplos pagamentos:')) {
          // Extrair JSON dos múltiplos pagamentos
          const jsonMatch = appointmentFresh.notes.match(/Múltiplos pagamentos:\s*(\[.*\])/);
          if (jsonMatch && jsonMatch[1]) {
            const loadedSplits = JSON.parse(jsonMatch[1]);
            console.log('✅ Pagamentoventos split carregados:', loadedSplits);
            setPagamentoSplits(loadedSplits);
          }
        }
      } catch (parseErr) {
        console.warn('⚠️ Erro ao carregar pagamentoSplits:', parseErr.message);
      }

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
        payer_id: appointmentFresh?.payer_id
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
        receivableId: null,
        // Será preenchido apenas após criar AR
        receivableStatus: appointmentFresh?.payment_method ? 'criada' : 'não criada',
        // Se tem payment_method, significa que CR foi criada
        registeredAt: appointmentFresh?.updated_at || null,
        registeredBy: 'Sistema',
        operationHash: appointmentFresh?.id?.substring(0, 16) || null,
        arValue: freshValueWithDiscount,
        // ✅ Sincronizar com valores frescos do banco
        paymentMethod: appointmentFresh?.payment_method || '',
        cashFlowRegistered: false // Será true após fechar caixa
      });
      console.log('✅ registroData atualizado com valores sincronizados:', {
        arValue: freshValueWithDiscount,
        discount: freshDiscount,
        estimatedValue: freshEstimatedValue,
        payment_method: appointmentFresh?.payment_method
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
  const hasClinicalShortcuts = Boolean(appointment?.patient_id && [SERVICE_STATUSES.AWAITING_PROFESSIONAL, SERVICE_STATUSES.IN_SERVICE, SERVICE_STATUSES.ATTENDED].includes(normalizedAppointmentStatus));

  // Mostrar abas de pagamento para Particular e Convênio Particular
  const showPaymentTab = isParticular || isConvenioParticular;

  // Mostrar mensagem de sucesso temporária
  const showSuccessNotification = message => {
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
        canStartAppointment: isReleasedForProfessional
      }
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
      procedure_code: newCode
    }));
  }, [faturamentoData.code_type, appointment?.services]);

  // 🔗 Sincronizar Nº Guia TISS com Nº Autorização da aba Liberação
  useEffect(() => {
    if (liberacaoData.auth_number) {
      setFaturamentoData(prev => ({
        ...prev,
        guide_number: liberacaoData.auth_number
      }));
    }
  }, [liberacaoData.auth_number]);

  // 🔄 Monitorar mudanças em cadastralData e atualizar status de validação
  useEffect(() => {
    const requiredFields = [['name', 'Nome Completo'], ['document_id', 'CPF'], ['birthdate', 'Data de Nascimento'], ['gender', 'Sexo'], ['email', 'Email'], ['phone', 'Telefone'], ['street', 'Rua'], ['number', 'Número'], ['neighborhood', 'Bairro'], ['city', 'Cidade'], ['state', 'Estado'], ['zip_code', 'CEP']];
    const missing = requiredFields.filter(([field, label]) => !cadastralData[field] || cadastralData[field].toString().trim() === '').map(([field, label]) => label);
    setCadastralStatus({
      complete: missing.length === 0,
      missing: missing
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
          updated_at: new Date().toISOString()
        };
        const {
          error
        } = await supabase.from('appointments').update(updatePayload).eq('id', appointment.id);
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
          updated_at: new Date().toISOString()
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
        const {
          error
        } = await supabase.from('appointments').update(updatePayload).eq('id', appointment.id);
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
          updated_at: new Date().toISOString()
        };
        const {
          error
        } = await supabase.from('appointments').update(updatePayload).eq('id', appointment.id);
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

  // 👤 Buscar nome de quem autorizou o desconto
  useEffect(() => {
    const fetchAuthorizerName = async () => {
      if (faturamentoData.discount_authorized_by) {
        try {
          const name = await getUserNameById(faturamentoData.discount_authorized_by);
          setDiscountAuthorizedByName(name || faturamentoData.discount_authorized_by);
        } catch (err) {
          console.warn('⚠️ Erro ao buscar nome do autorizador:', err.message);
          setDiscountAuthorizedByName(faturamentoData.discount_authorized_by);
        }
      } else {
        setDiscountAuthorizedByName('');
      }
    };
    fetchAuthorizerName();
  }, [faturamentoData.discount_authorized_by]);

  // ✨ Salvar dados de agendamento (data, hora, profissional, serviço, etc)
  const handleSaveAgendamento = async e => {
    e?.preventDefault?.();
    if (!appointment?.id) {
      console.error('❌ [handleSaveAgendamento] appointment.id is missing');
      alert('Erro: ID do agendamento não encontrado');
      return;
    }
    setLoading(true);
    try {
      console.log('💾 [handleSaveAgendamento] appointmentId:', appointment.id);
      console.log('💾 [handleSaveAgendamento] Salvando:', {
        date: agendamentoData.date,
        time: agendamentoData.time,
        professionalId: agendamentoData.professionalId,
        serviceId: agendamentoData.serviceId,
        payerId: agendamentoData.payerId,
        value: agendamentoData.value,
        status: agendamentoData.status,
        notes: agendamentoData.notes
      });

      // ✅ Validar que temos pelo menos um campo para atualizar
      const updateData = {
        scheduled_date: agendamentoData.date,
        scheduled_time: agendamentoData.time,
        professional_id: agendamentoData.professionalId,
        service_id: agendamentoData.serviceId,
        payer_id: agendamentoData.payerId || null,
        value: parseFloat(agendamentoData.value) || null,
        status: agendamentoData.status || 'agendado',
        notes: agendamentoData.notes || null
      };
      console.log('💾 [handleSaveAgendamento] updateData:', updateData);

      // ✅ Use .select() to get the updated record
      const {
        data,
        error
      } = await supabase.from('appointments').update(updateData).eq('id', appointment.id).select();
      console.log('💾 [handleSaveAgendamento] response:', {
        data,
        error
      });
      if (error) {
        console.error('❌ [handleSaveAgendamento] Supabase error:', error);
        throw error;
      }

      // ✅ Se temos dados, usar eles. Senão, considerar sucesso mesmo assim
      if (data && data.length > 0) {
        console.log('✅ Agendamento salvo com sucesso!', data[0]);
        if (onSuccess) onSuccess(data[0]);
      } else {
        console.warn('⚠️ UPDATE executado mas sem retorno de dados (possível RLS). Considerando sucesso.');
        if (onSuccess) onSuccess(updateData);
      }
      setTabAtivo('cadastrais');
    } catch (err) {
      console.error('❌ Erro ao salvar agendamento:', err);
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Salvar dados cadastrais (Padrão TISS)
  const handleSaveCadastral = async e => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setLoading(true);

      // 🔍 Validar campos obrigatórios TISS
      const requiredFields = [{
        field: 'name',
        label: 'Nome Completo'
      }, {
        field: 'document_id',
        label: 'CPF'
      }, {
        field: 'birthdate',
        label: 'Data de Nascimento'
      }, {
        field: 'gender',
        label: 'Sexo'
      }, {
        field: 'email',
        label: 'Email (obrigatório para NF)'
      }, {
        field: 'phone',
        label: 'Telefone'
      }, {
        field: 'street',
        label: 'Rua'
      }, {
        field: 'number',
        label: 'Número'
      }, {
        field: 'neighborhood',
        label: 'Bairro'
      }, {
        field: 'city',
        label: 'Cidade'
      }, {
        field: 'state',
        label: 'Estado'
      }, {
        field: 'zip_code',
        label: 'CEP'
      }];
      const missing = requiredFields.filter(({
        field
      }) => !cadastralData[field] || cadastralData[field].toString().trim() === '');
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
        endereco: `${cadastralData.street}, ${cadastralData.number} - ${cadastralData.neighborhood}, ${cadastralData.city}-${cadastralData.state}`
      });
      const {
        data,
        error
      } = await supabase.from('patients').update({
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
        zip_code: cadastralData.zip_code || null
      }).eq('id', appointment.patient_id);
      console.log('📥 Resposta do servidor:', {
        data,
        error
      });
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
  const handleSaveLiberacao = async e => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setLoading(true);
      console.log('📝 handleSaveLiberacao iniciado');

      // 🔍 Validar dados
      console.log('🔍 Verificando card_number:', {
        valor: liberacaoData.card_number,
        tipo: typeof liberacaoData.card_number,
        vazio: !liberacaoData.card_number?.trim()
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
        updated_at: new Date().toISOString()
      };
      console.log('📤 Iniciando UPDATE no banco:', {
        appointmentId: appointment.id,
        payload: updatePayload
      });
      const {
        data,
        error
      } = await supabase.from('appointments').update(updatePayload).eq('id', appointment.id);
      console.log('📥 Resposta do Supabase:', {
        sucessoUpdate: !error,
        erro: error?.message
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
  const handleSaveFaturamento = async e => {
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
        notes: faturamentoData.notes
      };
      console.log('📤 Enviando dados de faturamento TISS:', {
        id: appointment.id,
        guide_number: faturamentoData.guide_number,
        guide_type: faturamentoData.guide_type,
        procedure_code: faturamentoData.procedure_code,
        service_place: faturamentoData.service_place,
        requesting_doctor: faturamentoData.requesting_doctor,
        discount: faturamentoData.discount // 💾 Confirmar que o desconto está aqui
      });

      // 💾 Calcular amount_paid com desconto
      const calculateedAmountPaid = (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2);
      const {
        data,
        error
      } = await supabase.from('appointments').update({
        guide_number: faturamentoData.guide_number,
        billing_data: JSON.stringify(tissData),
        // Salvar estrutura TISS completa
        discount: parseFloat(faturamentoData.discount || 0),
        // 💾 Salvar desconto explicitamente
        amount_paid: parseFloat(calculateedAmountPaid),
        // 💾 Salvar amount_paid recalculado
        updated_at: new Date().toISOString()
      }).eq('id', appointment.id);
      console.log('📥 Resposta do servidor:', {
        data,
        error
      });
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
  const handleSavePagamento = async e => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setLoading(true);

      // 🔍 Validar dados
      if (!pagamentoData.payment_method && pagamentoSplits.length === 0) {
        console.warn('❌ Forma de pagamento é obrigatória');
        alert('⚠️ Selecione uma forma de pagamento ou adicione um split de pagamento');
        setLoading(false);
        return;
      }
      console.log('📤 Iniciando processo de registro financeiro...');
      console.log('📦 Splits de pagamento:', pagamentoSplits);

      // 💰 Criar Conta a Receber (AR) para particular
      let arId = null;
      // 💰 Aplicar DESCONTO ao valor final a receber
      let arValue = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
      try {
        if (arValue > 0) {
          // 🎯 Se tem splits, usar o saldo dos splits. Se não, usar forma de pagamento única
          if (pagamentoSplits && pagamentoSplits.length > 0) {
            const totalPago = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
            const saldoAberto = arValue - totalPago;
            console.log(`💳 Múltiplos pagamentos detectados. Total pago: R$ ${totalPago.toFixed(2)}, Saldo aberto: R$ ${saldoAberto.toFixed(2)}`);

            // Se há saldo aberto, criar AR para o valor faltante
            if (saldoAberto > 0.01) {
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 30);
              const arResult = await createAR(clinicId, {
                amount: saldoAberto,
                due_date: dueDate.toISOString().split('T')[0],
                customer_name: appointment.patients?.name || 'Paciente',
                appointment_id: appointment.id
              });
              arId = arResult.id;
              console.log(`✅ Conta a Receber criada para saldo aberto:`, {
                id: arResult.id,
                value: saldoAberto,
                due_date: dueDate.toISOString().split('T')[0]
              });
            }

            // Registrar auditoria de múltiplos pagamentos
            try {
              await logAppointmentFinancialAudit({
                appointmentId: appointment.id,
                financialEventType: FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED,
                relatedEntity: 'accounts_receivable',
                relatedEntityId: arId || 'multiple-payments',
                amount: arValue,
                context: {
                  payment_splits: pagamentoSplits.map(s => ({
                    method: s.method,
                    amount: s.amount
                  })),
                  total_paid: pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0),
                  balance_open: saldoAberto,
                  notes: 'Múltiplas formas de pagamento'
                }
              });
              console.log('✅ Auditoria financeira registrada');
            } catch (auditErr) {
              console.warn('⚠️ Erro ao registrar auditoria:', auditErr.message);
            }
          } else {
            // Forma de pagamento única (legado)
            // 🎯 Verificar se é cartão parcelado
            const isInstalledCard = pagamentoData.payment_method === 'CARTAO' && parseInt(pagamentoData.card_installments || 1) > 1;
            const installments = isInstalledCard ? parseInt(pagamentoData.card_installments) : 1;
            console.log(`💳 Criando Conta a Receber (valor com desconto: R$ ${arValue.toFixed(2)})...${isInstalledCard ? ` com ${installments} parcelas` : ''}`);
            const createdARs = [];
            const installmentValue = (arValue / installments).toFixed(2);

            // 🔄 Criar uma AR para cada parcela
            for (let i = 0; i < installments; i++) {
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 30 + i * 30); // Primeira vence em 30 dias, depois a cada 30 dias

              const arResult = await createAR(clinicId, {
                amount: parseFloat(installmentValue),
                due_date: dueDate.toISOString().split('T')[0],
                customer_name: appointment.patients?.name || 'Paciente',
                appointment_id: appointment.id
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
                  notes: isInstalledCard ? `Pagamento em ${installments}x no cartão ${pagamentoData.card_brand || ''} (últimos dígitos: ${pagamentoData.card_last_digits})` : pagamentoData.notes || 'Lançamento de particular no check-in'
                }
              });
              console.log('✅ Auditoria financeira registrada');
            } catch (auditErr) {
              console.warn('⚠️ Erro ao registrar auditoria:', auditErr.message);
              // Continuar mesmo com erro de auditoria
            }
          }
        }
      } catch (arError) {
        console.error('❌ Erro ao criar Conta a Receber:', arError.message);
        console.error('Stack:', arError.stack);
        // Não bloquear o fluxo se AR não puder ser criada
      }

      // 📊 Atualizar appointment com dados de pagamento
      console.log('📤 Atualizando dados de pagamento do appointment...');

      // 💾 Serializar splits de pagamento como JSON
      const paymentSplitsJson = pagamentoSplits && pagamentoSplits.length > 0 ? JSON.stringify(pagamentoSplits) : null;
      const updatePayload = {
        payment_method: pagamentoData.payment_method || pagamentoSplits?.[0]?.method || null,
        value: parseFloat(faturamentoData.estimated_value || '0'),
        discount: parseFloat(faturamentoData.discount || '0'),
        discount_reason: faturamentoData.discount_reason || null,
        notes: paymentSplitsJson ? `Múltiplos pagamentos: ${paymentSplitsJson}` : pagamentoData.notes || null,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
        card_number: liberacaoData.card_number || null,
        authorization_number: isConvenioFaturado ? liberacaoData.auth_number || null : pagamentoData.receipt_number || null,
        guide_number: faturamentoData.guide_number || null,
        card_brand: pagamentoData.card_brand || null,
        card_last_digits: pagamentoData.card_last_digits || null,
        card_installments: pagamentoData.card_installments ? parseInt(pagamentoData.card_installments) : 1
      };
      const {
        data,
        error
      } = await supabase.from('appointments').update(updatePayload).eq('id', appointment.id);
      console.log('📥 Resposta do servidor:', {
        data,
        error
      });
      if (error) {
        console.error('❌ Detalhes do erro:', error);
        throw new Error(error.message);
      }

      // 💾 Atualizar estado de registro
      const operationHash = `${appointment.id}-${Date.now()}`.substring(0, 16);
      const totalPaid = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
      const saldoAberto = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0') - totalPaid;
      setRegistroData({
        receivableId: arId,
        receivableStatus: arId ? 'criada' : 'não criada',
        registeredAt: new Date().toISOString(),
        registeredBy: 'Sistema',
        operationHash: operationHash,
        arValue: saldoAberto > 0 ? saldoAberto : 0,
        paymentMethod: pagamentoData.payment_method || 'Múltiplos',
        cashFlowRegistered: false
      });

      // 🎯 Exibir mensagem de sucesso
      const successMsg = pagamentoSplits && pagamentoSplits.length > 0 ? `✅ Dados de pagamento registrados! ${pagamentoSplits.length} forma(s) de pagamento salva(s)` : arId ? '✅ Dados de pagamento registrados! ✓ Conta a Receber criada' : '✅ Dados de pagamento registrados!';
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

  // ✅ VALIDAÇÃO DE DADOS FINANCEIROS ANTES DE LIBERAR
  const validateFinancialData = () => {
    const errors = [];

    // 1. Verificar dados cadastrais
    if (!cadastralData.name?.trim()) errors.push('Nome do paciente incompleto');
    if (!cadastralData.email?.trim()) errors.push('Email do paciente não preenchido');
    if (!cadastralData.phone?.trim() && !cadastralData.cell_phone?.trim()) errors.push('Telefone não preenchido');

    // 2. VALIDA PAGAMENTO NO BALCÃO se for Particular Puro OU Convênio Particular
    // (Convênio Particular = convênio chamado "Particular" que permite pagamento no balcão)
    if (isParticular || isConvenioParticular) {
      // Requer forma de pagamento
      if (!pagamentoData.payment_method) {
        errors.push('Forma de pagamento não preenchida');
      }

      // Se tem desconto: deve estar autorizado ou solicitado
      if (faturamentoData.discount > 0) {
        if (!faturamentoData.discount_reason) {
          errors.push('Desconto sem motivo informado');
        }
      }

      // ✅ Verificar se há saldo em aberto
      const valorTotal = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
      const totalPago = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
      const saldoAberto = valorTotal - totalPago;
      if (saldoAberto > 0.01) {
        errors.push(`Valor em aberto: R$ ${saldoAberto.toFixed(2)} (Preencha o valor faltante antes de liberar)`);
      }
    }
    // 3. VALIDA CONVÊNIO FATURADO (requer autorização/guia TISS)
    else if (isConvenioFaturado) {
      // Requer liberação preenchida
      if (!liberacaoData.auth_number?.trim() && !appointment?.guide_number?.trim()) {
        errors.push('Nº Autorização ou Guia TISS não preenchido');
      }

      // Se é Convênio Faturado: requer guia TISS
      if (!faturamentoData.guide_number?.trim()) {
        errors.push('Nº Guia TISS não preenchido');
      }
    }
    return {
      valid: errors.length === 0,
      errors: errors
    };
  };

  // Marcar como check-in completo
  // Marcar como check-in completo e aguardando profissional
  const handleCompleteCheckIn = async e => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      // ✅ VALIDAR DADOS FINANCEIROS ANTES DE LIBERAR
      const validation = validateFinancialData();
      if (!validation.valid) {
        alert(`❌ Dados incompletos para liberar:\n\n${validation.errors.map(e => `• ${e}`).join('\n')}`);
        console.error('❌ Validação falhou:', validation.errors);
        return;
      }
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
      const {
        data: updateData,
        error
      } = await supabase.from('appointments').update({
        status: newStatus,
        updated_at: new Date().toISOString()
      }).eq('id', appointment.id);
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
          releasedAt: new Date().toISOString() // ✅ Horário em que foi liberado
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
  const tabClass = tab => `
    px-4 py-2 font-medium text-sm border-b-2 transition-colors cursor-pointer
    ${tabAtivo === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}
  `;

  // ✅ Guard clause - retornar null se modal não estiver aberto ou appointment for null
  // ✨ PROPRIEDADES COMPUTADAS PARA ABA DADOS AGENDAMENTO
  const selectedProfessional = professionals.find(p => p.id === agendamentoData.professionalId);
  const availableWeekdayLabels = professionalSchedules.length > 0 ? [...new Set(professionalSchedules.map(s => {
    const dayMap = {
      1: 'Segunda',
      2: 'Terça',
      3: 'Quarta',
      4: 'Quinta',
      5: 'Sexta',
      6: 'Sábado',
      0: 'Domingo'
    };
    return dayMap[s.day_of_week] || '';
  }))].filter(Boolean) : [];
  const calendarYearOptions = Array.from({
    length: 5
  }, (_, i) => new Date().getFullYear() + i - 2);

  // ✨ USAR FUNÇÃO CORRETA PARA VERIFICAR DISPONIBILIDADE
  const hasAvailabilityForDate = date => {
    if (!agendamentoData.professionalId) {
      return true;
    }
    const dateString = formatDateToIso(date);
    return getSchedulesForDate(dateString, professionalSchedules).length > 0;
  };
  const isBlockedHolidayDate = date => {
    // Placeholder: sem dados de feriados carregados
    return false;
  };

  // ✨ CALCULAR SCHEDULES PARA A DATA SELECIONADA
  const schedulesForSelectedDate = agendamentoData.date ? getSchedulesForDate(agendamentoData.date, professionalSchedules) : [];
  const selectedDateHasAvailability = !agendamentoData.professionalId || !agendamentoData.date ? true : schedulesForSelectedDate.length > 0 && !isBlockedHolidayDate(parseLocalDate(agendamentoData.date));
  const selectedDateHoliday = null;
  const selectedDateBlockedByHoliday = false;

  // ✨ CALCULAR HORÁRIOS SUGERIDOS
  const buildAvailableSlots = (schedules, duration) => {
    const uniqueSlots = new Set();
    const fallbackDuration = 30;
    (schedules || []).forEach(schedule => {
      if (!schedule) return;
      const startMinutes = timeToMinutes(schedule.start_time);
      const endMinutes = timeToMinutes(schedule.end_time);
      const breakStart = schedule.break_start ? timeToMinutes(schedule.break_start) : null;
      const breakEnd = schedule.break_end ? timeToMinutes(schedule.break_end) : null;
      const slotDuration = Number(schedule.duration_minutes) || Number(duration) || fallbackDuration;
      for (let currentMinutes = startMinutes; currentMinutes + slotDuration <= endMinutes; currentMinutes += slotDuration) {
        const slotEnd = currentMinutes + slotDuration;
        const overlapsBreak = breakStart !== null && breakEnd !== null && currentMinutes < breakEnd && slotEnd > breakStart;
        if (!overlapsBreak) {
          uniqueSlots.add(minutesToTime(currentMinutes));
        }
      }
    });
    return Array.from(uniqueSlots).sort((left, right) => timeToMinutes(left) - timeToMinutes(right));
  };
  const availableTimeSlots = selectedDateBlockedByHoliday ? [] : buildAvailableSlots(schedulesForSelectedDate, agendamentoData.duration);
  const handleCalendarPrevMonth = () => {
    setCalendarActiveStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };
  const handleCalendarNextMonth = () => {
    setCalendarActiveStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };
  const handleCalendarMonthChange = e => {
    setCalendarActiveStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(parseInt(e.target.value));
      return newDate;
    });
  };
  const handleCalendarYearChange = e => {
    setCalendarActiveStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(parseInt(e.target.value));
      return newDate;
    });
  };
  if (!isOpen || !appointment) {
    return null;
  }
  return /*#__PURE__*/React.createElement(Dialog, {
    open: isOpen,
    onOpenChange: open => !open && onClose(false)
  }, /*#__PURE__*/React.createElement(DialogContent, {
    className: "app-dialog-shell app-dialog-shell--content overflow-auto"
  }, /*#__PURE__*/React.createElement(DialogHeader, {
    className: "border-b border-gray-200 px-6 pb-4 pt-6 text-left"
  }, /*#__PURE__*/React.createElement(DialogTitle, {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCB Atendimento - ", appointment.patients?.name), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-normal text-gray-500"
  }, "Senha: ", /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 font-bold"
  }, arrivals[appointment.id]?.password)))), successMessageVisible && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 animate-in fade-in slide-in-from-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\u2705"), /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, successMessage))), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Hor\xE1rio"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-gray-900"
  }, appointment.scheduled_time?.substring(0, 5))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Profissional"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-gray-900"
  }, appointment.professionals?.name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-gray-900"
  }, appointment.services?.name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-gray-900"
  }, appointment.payers?.name || 'Particular')))), registroData.receivableId && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border border-green-300 rounded-lg p-3 mb-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-green-900"
  }, "\u2705 Registro Financeiro"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-700"
  }, "Conta a Receber criada \u2022 ID: ", registroData.receivableId.substring(0, 8), "...  \u2022 Auditoria: \u2713")), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-green-600"
  }, "R$ ", registroData.arValue.toFixed(2)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-600"
  }, formatPaymentMethod(registroData.paymentMethod)))), hasClinicalShortcuts && /*#__PURE__*/React.createElement("div", {
    className: "bg-violet-50 border border-violet-300 rounded-lg p-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-violet-900"
  }, "Atendimento em fluxo cl\xEDnico"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-violet-700 mt-1"
  }, "Status atual: ", getStatusLabelOnly(normalizedAppointmentStatus), ". Use o prontu\xE1rio para registrar a evolu\xE7\xE3o e, se preferir, o painel cl\xEDnico para conduzir o in\xEDcio/finaliza\xE7\xE3o.")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "outline",
    onClick: handleOpenPatientRecord,
    className: "border-violet-300 text-violet-700 hover:bg-violet-100"
  }, /*#__PURE__*/React.createElement(FileText, {
    size: 16,
    className: "mr-2"
  }), "Abrir Prontu\xE1rio"), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    onClick: handleOpenProfessionalFlow,
    className: "bg-violet-600 hover:bg-violet-700 text-white"
  }, isReleasedForProfessional ? 'Iniciar no Painel' : 'Abrir Painel do Atendimento')))), /*#__PURE__*/React.createElement("div", {
    className: "border-b border-gray-200 flex gap-2 mb-6 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setTabAtivo('dados_agendamento'),
    className: tabClass('dados_agendamento')
  }, "\uD83D\uDCC5 Dados do Agendamento"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setTabAtivo('cadastrais'),
    className: tabClass('cadastrais')
  }, "\uD83D\uDCDD Dados Cadastrais"), isConvenioFaturado && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setTabAtivo('liberacao'),
    className: tabClass('liberacao')
  }, "\u2713 Libera\xE7\xE3o"), isConvenioFaturado && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setTabAtivo('faturamento'),
    className: tabClass('faturamento')
  }, "\uD83D\uDCB0 Faturamento"), (isParticular || isConvenioParticular) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setTabAtivo('pagamento'),
    className: tabClass('pagamento')
  }, "\uD83D\uDCB3 Pagamento"), (tabAtivo === 'resumo' || tabAtivo === 'financeiro' || checkInCompleted) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setTabAtivo('financeiro'),
    className: tabClass('financeiro')
  }, "\uD83D\uDCCA Resumo Financeiro"), (tabAtivo === 'resumo' || checkInCompleted) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setTabAtivo('resumo'),
    className: tabClass('resumo')
  }, "\u2705 Resumo Final")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '80vh',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      paddingRight: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, tabAtivo === 'dados_agendamento' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-blue-900"
  }, "\uD83D\uDCC5 Preencha os dados do agendamento")), /*#__PURE__*/React.createElement(PatientSearchOrCreate, {
    clinicId: clinicId,
    initialPhone: agendamentoData.phone,
    selectedPatient: selectedPatient,
    onSelect: pacientData => {
      console.log('✅ Paciente selecionado:', pacientData);
      setSelectedPatient(pacientData);
      setAgendamentoData(prev => ({
        ...prev,
        patientId: pacientData.patientId,
        patientName: pacientData.patientName,
        phone: pacientData.phone
      }));
      setCadastralData({
        name: pacientData.name,
        document_id: pacientData.document_id,
        birthdate: pacientData.birthdate,
        gender: pacientData.gender,
        phone: pacientData.phone,
        cell_phone: pacientData.cell_phone,
        email: pacientData.email,
        street: pacientData.street,
        number: pacientData.number || '',
        neighborhood: pacientData.neighborhood || '',
        city: pacientData.city,
        state: pacientData.state,
        zip_code: pacientData.zip_code
      });
    },
    onCreateNew: () => {
      console.log('➕ Modo: criar novo paciente');
      setSelectedPatient(null);
    },
    onClearSelection: () => {
      console.log('🔄 Limpando seleção de paciente');
      setSelectedPatient(null);
    }
  }), !selectedPatient && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border-2 border-blue-300 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-blue-900 mb-3"
  }, "\u2795 Novo Paciente - Preencha dados b\xE1sicos"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-700 mb-4"
  }, "Dados completos ser\xE3o preenchidos quando o paciente chegar na recep\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, {
    className: "text-sm"
  }, "\uD83D\uDC64 Nome do Paciente *"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Nome",
    value: agendamentoData.patientName,
    onChange: e => updateAgendamentoField('patientName', e.target.value),
    className: "mt-1"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, {
    className: "text-sm"
  }, "\uD83C\uDF82 Data de Nascimento"), /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: cadastralData.birthdate || '',
    onChange: e => updateCadastralField('birthdate', e.target.value),
    className: "mt-1"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, {
    className: "text-sm"
  }, "\uD83D\uDCF1 Telefone *"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Telefone",
    value: agendamentoData.phone,
    onChange: e => updateAgendamentoField('phone', e.target.value),
    className: "mt-1"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDCC5 Data *"), /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: agendamentoData.date,
    onChange: e => updateAgendamentoField('date', e.target.value)
  }), agendamentoData.date && selectedDateBlockedByHoliday && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs text-red-700"
  }, "Data bloqueada por feriado: ", selectedDateHoliday?.name || 'Feriado', "."), agendamentoData.professionalId && agendamentoData.date && !selectedDateHasAvailability && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs text-amber-700"
  }, "O profissional selecionado nao atende nesta data. Use o calendario abaixo para escolher um dia disponivel.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDD50 Hora *"), /*#__PURE__*/React.createElement(Input, {
    type: "time",
    value: agendamentoData.time,
    onChange: e => updateAgendamentoField('time', e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\u23F1\uFE0F Dura\xE7\xE3o (min)"), /*#__PURE__*/React.createElement(Input, {
    type: "number",
    min: "5",
    value: agendamentoData.duration,
    onChange: e => updateAgendamentoField('duration', parseInt(e.target.value) || 30)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDEAA Sala"), /*#__PURE__*/React.createElement(Select, {
    value: agendamentoData.roomId || '',
    onValueChange: value => updateAgendamentoField('roomId', value)
  }, /*#__PURE__*/React.createElement(SelectTrigger, null, /*#__PURE__*/React.createElement(SelectValue, {
    placeholder: "Selecione sala"
  })), /*#__PURE__*/React.createElement(SelectContent, null, rooms.map(room => /*#__PURE__*/React.createElement(SelectItem, {
    key: room.id,
    value: room.id
  }, room.name)))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDC64 Paciente *"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Nome do paciente",
    value: agendamentoData.patientName,
    onChange: e => updateAgendamentoField('patientName', e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDCDE Telefone"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "(11) 99999-9999",
    value: agendamentoData.phone,
    onChange: e => updateAgendamentoField('phone', e.target.value)
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83C\uDFE5 Profissional *"), /*#__PURE__*/React.createElement(Select, {
    value: agendamentoData.professionalId || '',
    onValueChange: value => {
      console.log('👥 [Select] Profissional selecionado:', value);
      updateAgendamentoField('professionalId', value);
    }
  }, /*#__PURE__*/React.createElement(SelectTrigger, null, agendamentoData.professionalId && professionals.find(p => p.id === agendamentoData.professionalId) ? /*#__PURE__*/React.createElement("span", null, professionals.find(p => p.id === agendamentoData.professionalId)?.name) : /*#__PURE__*/React.createElement(SelectValue, {
    placeholder: "Selecione profissional"
  })), /*#__PURE__*/React.createElement(SelectContent, null, professionals.map(prof => /*#__PURE__*/React.createElement(SelectItem, {
    key: prof.id,
    value: prof.id
  }, prof.name))))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "flex items-center gap-2 text-sm font-semibold text-slate-900"
  }, /*#__PURE__*/React.createElement(CalendarDays, {
    className: "h-4 w-4 text-blue-600"
  }), "Calendario de disponibilidade"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, selectedProfessional ? `${selectedProfessional.name} atende em ${availableWeekdayLabels.length > 0 ? availableWeekdayLabels.join(', ') : 'nenhum dia cadastrado'}.` : 'Selecione um profissional para visualizar os dias de atendimento.')), selectedProfessional && !loadingProfessionalSchedules && professionalSchedules.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
  }, availableWeekdayLabels.length, " dia(s) ativo(s)")), !selectedProfessional && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600"
  }, "Escolha o profissional primeiro. O calendario passa a destacar apenas os dias em que ele atende."), selectedProfessional && loadingProfessionalSchedules && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600"
  }, "Carregando disponibilidade do profissional..."), selectedProfessional && !loadingProfessionalSchedules && professionalSchedules.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
  }, "Este profissional ainda nao possui dias de atendimento cadastrados em Disponibilidades."), selectedProfessional && !loadingProfessionalSchedules && professionalSchedules.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "grid gap-4 xl:grid-cols-[minmax(300px,340px)_1fr]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-slate-200 bg-white p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleCalendarPrevMonth,
    className: "rounded-md border border-slate-200 p-2 text-slate-600 transition hover:border-blue-300 hover:text-blue-700",
    "aria-label": "Mes anterior"
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    className: "h-4 w-4"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("select", {
    value: calendarActiveStartDate.getMonth(),
    onChange: handleCalendarMonthChange,
    className: "rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none transition focus:border-blue-400",
    "aria-label": "Selecionar mes"
  }, MONTH_LABELS.map((monthLabel, monthIndex) => /*#__PURE__*/React.createElement("option", {
    key: monthLabel,
    value: monthIndex
  }, monthLabel))), /*#__PURE__*/React.createElement("select", {
    value: calendarActiveStartDate.getFullYear(),
    onChange: handleCalendarYearChange,
    className: "rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none transition focus:border-blue-400",
    "aria-label": "Selecionar ano"
  }, calendarYearOptions.map(yearOption => /*#__PURE__*/React.createElement("option", {
    key: yearOption,
    value: yearOption
  }, yearOption)))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleCalendarNextMonth,
    className: "rounded-md border border-slate-200 p-2 text-slate-600 transition hover:border-blue-300 hover:text-blue-700",
    "aria-label": "Proximo mes"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    className: "h-4 w-4"
  }))), /*#__PURE__*/React.createElement(Calendar, {
    className: "appointment-availability-calendar",
    locale: "pt-BR",
    value: calendarSelectedDate,
    onChange: nextValue => {
      const selectedDate = Array.isArray(nextValue) ? nextValue[0] : nextValue;
      updateAgendamentoField('date', formatDateToIso(selectedDate));
    },
    activeStartDate: calendarActiveStartDate,
    onActiveStartDateChange: ({
      activeStartDate
    }) => {
      if (activeStartDate) {
        setCalendarActiveStartDate(activeStartDate);
      }
    },
    minDetail: "month",
    prevLabel: null,
    nextLabel: null,
    prev2Label: null,
    next2Label: null,
    showNavigation: false,
    showNeighboringMonth: false,
    tileDisabled: ({
      date,
      view
    }) => view === 'month' && (!hasAvailabilityForDate(date) || isBlockedHolidayDate(date)),
    tileClassName: ({
      date,
      view
    }) => {
      if (view !== 'month') return '';
      const dateString = formatDateToIso(date);
      const blockedHoliday = isBlockedHolidayDate(date);
      if (agendamentoData.date && dateString === agendamentoData.date) {
        return blockedHoliday ? 'appointment-calendar-tile appointment-calendar-tile--holiday-selected' : 'appointment-calendar-tile appointment-calendar-tile--selected';
      }
      if (blockedHoliday) {
        return 'appointment-calendar-tile appointment-calendar-tile--holiday-blocked';
      }
      if (hasAvailabilityForDate(date)) {
        return 'appointment-calendar-tile appointment-calendar-tile--available';
      }
      return 'appointment-calendar-tile appointment-calendar-tile--unavailable';
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-slate-200 bg-white p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold uppercase tracking-wide text-slate-500"
  }, "Dia selecionado"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm font-medium text-slate-900"
  }, agendamentoData.date ? parseLocalDate(agendamentoData.date)?.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) : 'Selecione uma data no calendario'), selectedDateHoliday && /*#__PURE__*/React.createElement("div", {
    className: `mt-3 rounded-lg border px-3 py-2 text-sm ${selectedDateBlockedByHoliday ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`
  }, selectedDateBlockedByHoliday ? 'Feriado bloqueado' : 'Feriado', ": ", selectedDateHoliday.name), agendamentoData.date && selectedDateHasAvailability && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-slate-600"
  }, "Janelas de atendimento"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, schedulesForSelectedDate.map(schedule => /*#__PURE__*/React.createElement("span", {
    key: schedule.id || `${schedule.day_of_week}-${schedule.start_time}-${schedule.end_time}`,
    className: "rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
  }, formatScheduleWindow(schedule))))), agendamentoData.date && !selectedDateHasAvailability && !selectedDateBlockedByHoliday && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    className: "mt-0.5 h-4 w-4 flex-shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, "Sem expediente cadastrado para este profissional neste dia.")), agendamentoData.date && selectedDateBlockedByHoliday && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    className: "mt-0.5 h-4 w-4 flex-shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, "Agendamento bloqueado por feriado."))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-slate-200 bg-white p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
  }, /*#__PURE__*/React.createElement(Clock3, {
    className: "h-4 w-4"
  }), "Horarios sugeridos"), agendamentoData.date && availableTimeSlots.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-2"
  }, availableTimeSlots.map(slot => /*#__PURE__*/React.createElement("button", {
    key: slot,
    type: "button",
    onClick: () => {
      updateAgendamentoField('time', slot);
      updateAgendamentoField('endTime', minutesToTime(timeToMinutes(slot) + (Number(agendamentoData.duration) || 30)));
    },
    className: `rounded-full border px-3 py-1 text-xs font-medium transition ${agendamentoData.time === slot ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:text-blue-700'}`
  }, slot))) : /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-sm text-slate-500"
  }, agendamentoData.date ? 'Nao ha horarios disponiveis para o dia selecionado.' : 'Selecione um dia disponivel no calendario para ver os horarios.')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 text-xs text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700"
  }, "Dia com atendimento"), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-blue-100 px-2.5 py-1 text-blue-700"
  }, "Dia selecionado"), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-red-100 px-2.5 py-1 text-red-700"
  }, "Feriado bloqueado"), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-slate-200 px-2.5 py-1 text-slate-600"
  }, "Dia bloqueado"))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDC8A Servi\xE7o *"), /*#__PURE__*/React.createElement(Select, {
    value: agendamentoData.serviceId || '',
    onValueChange: value => {
      console.log('💊 [Select] Serviço selecionado:', value);
      const selectedService = services.find(s => s.id === value);
      console.log('💊 [DEBUG] Service found:', selectedService);
      console.log('💊 [DEBUG] Service keys:', selectedService ? Object.keys(selectedService) : 'null');
      console.log('💊 [DEBUG] Service code value:', selectedService?.code);
      updateAgendamentoField('serviceId', value);
      const serviceCode = selectedService?.code || selectedService?.codigo || selectedService?.service_code || selectedService?.id || '';
      console.log('💊 [DEBUG] Final serviceCode:', serviceCode);
      updateAgendamentoField('serviceCode', serviceCode);
    }
  }, /*#__PURE__*/React.createElement(SelectTrigger, null, agendamentoData.serviceId && services.find(s => s.id === agendamentoData.serviceId) ? /*#__PURE__*/React.createElement("span", null, services.find(s => s.id === agendamentoData.serviceId)?.name) : /*#__PURE__*/React.createElement(SelectValue, {
    placeholder: "Selecione servi\xE7o"
  })), /*#__PURE__*/React.createElement(SelectContent, null, services.map(service => /*#__PURE__*/React.createElement(SelectItem, {
    key: service.id,
    value: service.id
  }, service.name))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDCCB C\xF3digo do Servi\xE7o"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    value: agendamentoData.serviceCode || '',
    disabled: true,
    className: "bg-gray-50",
    placeholder: "Auto-preenchido"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83C\uDFE5 Conv\xEAnio"), /*#__PURE__*/React.createElement(Select, {
    value: agendamentoData.payerId || '',
    onValueChange: value => {
      console.log('🏥 [Select] Convênio selecionado:', value);
      updateAgendamentoField('payerId', value);
    }
  }, /*#__PURE__*/React.createElement(SelectTrigger, null, agendamentoData.payerId && payers.find(p => p.id === agendamentoData.payerId) ? /*#__PURE__*/React.createElement("span", null, payers.find(p => p.id === agendamentoData.payerId)?.name) : /*#__PURE__*/React.createElement(SelectValue, {
    placeholder: "Selecione um conv\xEAnio"
  })), /*#__PURE__*/React.createElement(SelectContent, null, payers.map(payer => /*#__PURE__*/React.createElement(SelectItem, {
    key: payer.id,
    value: payer.id
  }, payer.name))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDCB0 Valor (R$)"), /*#__PURE__*/React.createElement(Input, {
    type: "number",
    step: "0.01",
    min: "0",
    value: agendamentoData.value,
    onChange: e => updateAgendamentoField('value', e.target.value)
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDD39 Status *"), /*#__PURE__*/React.createElement(Select, {
    value: agendamentoData.status || 'scheduled',
    onValueChange: value => {
      console.log('🔹 [Status] Alterando status para:', value);
      updateAgendamentoField('status', value);
    }
  }, /*#__PURE__*/React.createElement(SelectTrigger, null, /*#__PURE__*/React.createElement(SelectValue, {
    placeholder: "Selecione status"
  })), /*#__PURE__*/React.createElement(SelectContent, null, MODAL_VISIBLE_STATUSES.map(statusValue => {
    const statusConfig = STATUS_CONFIG[statusValue];
    return /*#__PURE__*/React.createElement(SelectItem, {
      key: statusValue,
      value: statusValue
    }, statusConfig?.icon || '•', " ", statusConfig?.label || statusValue);
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "\uD83D\uDCDD Observa\xE7\xF5es"), /*#__PURE__*/React.createElement(Textarea, {
    placeholder: "Observa\xE7\xF5es importantes...",
    value: agendamentoData.notes,
    onChange: e => updateAgendamentoField('notes', e.target.value)
  }))), tabAtivo === 'cadastrais' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-blue-900"
  }, "\uD83D\uDCCB Valida\xE7\xE3o Cadastral (Padr\xE3o TISS)"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-700 mt-1"
  }, "Estes dados v\xEAm do cadastro do paciente e s\xE3o obrigat\xF3rios para emiss\xE3o de guia")), !cadastralStatus.complete && cadastralStatus.missing.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-300 rounded-lg p-4 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-red-800 font-semibold mb-2"
  }, "\u274C ", cadastralStatus.missing.length, " campos incompletos:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs text-red-700 space-y-1"
  }, cadastralStatus.missing.map((field, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx
  }, "\u2022 ", field)))), cadastralStatus.complete && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border border-green-300 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-800 font-semibold"
  }, "\u2705 Cadastro TISS completo e validado!")), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 border border-gray-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
  }, "1"), "Dados Pessoais (TISS)"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Nome Completo ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.name?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.name,
    onChange: e => setCadastralData({
      ...cadastralData,
      name: e.target.value
    }),
    placeholder: "Nome completo",
    className: cadastralData.name?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "CPF ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.document_id?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.document_id,
    onChange: e => setCadastralData({
      ...cadastralData,
      document_id: e.target.value
    }),
    placeholder: "000.000.000-00",
    className: cadastralData.document_id?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Data Nascimento ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.birthdate?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: cadastralData.birthdate,
    onChange: e => setCadastralData({
      ...cadastralData,
      birthdate: e.target.value
    }),
    className: cadastralData.birthdate?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Sexo ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.gender?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement("select", {
    value: cadastralData.gender,
    onChange: e => setCadastralData({
      ...cadastralData,
      gender: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 Selecione \u2014"), /*#__PURE__*/React.createElement("option", {
    value: "M"
  }, "Masculino"), /*#__PURE__*/React.createElement("option", {
    value: "F"
  }, "Feminino"), /*#__PURE__*/React.createElement("option", {
    value: "O"
  }, "Outro"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Email ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.email?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    type: "email",
    value: cadastralData.email,
    onChange: e => setCadastralData({
      ...cadastralData,
      email: e.target.value
    }),
    placeholder: "email@example.com",
    className: cadastralData.email?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Telefone ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.phone?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.phone,
    onChange: e => setCadastralData({
      ...cadastralData,
      phone: e.target.value
    }),
    placeholder: "(00) 0000-0000",
    className: cadastralData.phone?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Celular"), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.cell_phone,
    onChange: e => setCadastralData({
      ...cadastralData,
      cell_phone: e.target.value
    }),
    placeholder: "(00) 99999-9999"
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Celular"), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.cell_phone,
    onChange: e => setCadastralData({
      ...cadastralData,
      cell_phone: e.target.value
    }),
    placeholder: "(00) 99999-9999"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 border border-gray-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
  }, "2"), "Endere\xE7o (TISS Obrigat\xF3rio)"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Rua ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.street?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.street,
    onChange: e => setCadastralData({
      ...cadastralData,
      street: e.target.value
    }),
    placeholder: "Nome da rua",
    className: cadastralData.street?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "N\xFAmero ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.number?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.number,
    onChange: e => setCadastralData({
      ...cadastralData,
      number: e.target.value
    }),
    placeholder: "123",
    className: cadastralData.number?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Complemento"), /*#__PURE__*/React.createElement(Input, {
    value: "",
    onChange: () => {},
    placeholder: "Apto 101, sala 202, etc"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Bairro ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.neighborhood?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.neighborhood,
    onChange: e => setCadastralData({
      ...cadastralData,
      neighborhood: e.target.value
    }),
    placeholder: "Bairro",
    className: cadastralData.neighborhood?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Cidade ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.city?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.city,
    onChange: e => setCadastralData({
      ...cadastralData,
      city: e.target.value
    }),
    placeholder: "Cidade",
    className: cadastralData.city?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "UF ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.state?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement("select", {
    value: cadastralData.state,
    onChange: e => setCadastralData({
      ...cadastralData,
      state: e.target.value
    }),
    className: `w-full px-3 py-2 border rounded-lg text-sm ${cadastralData.state?.trim() ? 'border-green-300' : 'border-gray-300'}`
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 UF \u2014"), /*#__PURE__*/React.createElement("option", {
    value: "AC"
  }, "AC"), /*#__PURE__*/React.createElement("option", {
    value: "AL"
  }, "AL"), /*#__PURE__*/React.createElement("option", {
    value: "AP"
  }, "AP"), /*#__PURE__*/React.createElement("option", {
    value: "AM"
  }, "AM"), /*#__PURE__*/React.createElement("option", {
    value: "BA"
  }, "BA"), /*#__PURE__*/React.createElement("option", {
    value: "CE"
  }, "CE"), /*#__PURE__*/React.createElement("option", {
    value: "DF"
  }, "DF"), /*#__PURE__*/React.createElement("option", {
    value: "ES"
  }, "ES"), /*#__PURE__*/React.createElement("option", {
    value: "GO"
  }, "GO"), /*#__PURE__*/React.createElement("option", {
    value: "MA"
  }, "MA"), /*#__PURE__*/React.createElement("option", {
    value: "MT"
  }, "MT"), /*#__PURE__*/React.createElement("option", {
    value: "MS"
  }, "MS"), /*#__PURE__*/React.createElement("option", {
    value: "MG"
  }, "MG"), /*#__PURE__*/React.createElement("option", {
    value: "PA"
  }, "PA"), /*#__PURE__*/React.createElement("option", {
    value: "PB"
  }, "PB"), /*#__PURE__*/React.createElement("option", {
    value: "PR"
  }, "PR"), /*#__PURE__*/React.createElement("option", {
    value: "PE"
  }, "PE"), /*#__PURE__*/React.createElement("option", {
    value: "PI"
  }, "PI"), /*#__PURE__*/React.createElement("option", {
    value: "RJ"
  }, "RJ"), /*#__PURE__*/React.createElement("option", {
    value: "RN"
  }, "RN"), /*#__PURE__*/React.createElement("option", {
    value: "RS"
  }, "RS"), /*#__PURE__*/React.createElement("option", {
    value: "RO"
  }, "RO"), /*#__PURE__*/React.createElement("option", {
    value: "RR"
  }, "RR"), /*#__PURE__*/React.createElement("option", {
    value: "SC"
  }, "SC"), /*#__PURE__*/React.createElement("option", {
    value: "SP"
  }, "SP"), /*#__PURE__*/React.createElement("option", {
    value: "SE"
  }, "SE"), /*#__PURE__*/React.createElement("option", {
    value: "TO"
  }, "TO"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "CEP ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*"), cadastralData.zip_code?.trim() && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 ml-1"
  }, "\u2713")), /*#__PURE__*/React.createElement(Input, {
    value: cadastralData.zip_code,
    onChange: e => setCadastralData({
      ...cadastralData,
      zip_code: e.target.value
    }),
    placeholder: "00000-000",
    className: cadastralData.zip_code?.trim() ? 'border-green-300' : ''
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-4"
  })))), tabAtivo === 'liberacao' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-blue-900"
  }, "\uD83D\uDCCB Valida\xE7\xE3o de Cobertura (Padr\xE3o TISS)"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-700 mt-1"
  }, "Operadora: ", liberacaoData.payer_name || 'Não definida')), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 border border-gray-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
  }, "1"), "Dados do Benefici\xE1rio"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Operadora"), /*#__PURE__*/React.createElement(Input, {
    value: liberacaoData.payer_name,
    onChange: () => {},
    disabled: true,
    className: "bg-gray-100 font-semibold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Plano"), /*#__PURE__*/React.createElement(Input, {
    value: liberacaoData.plan_name,
    onChange: () => {},
    disabled: true,
    className: "bg-gray-100"
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Matr\xEDcula / N\xBA Carteirinha ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*")), /*#__PURE__*/React.createElement(Input, {
    value: liberacaoData.card_number,
    onChange: e => setLiberacaoData({
      ...liberacaoData,
      card_number: e.target.value
    }),
    placeholder: "Ex: 123456789012345",
    className: "font-mono"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border border-green-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-green-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
  }, "2"), "Autoriza\xE7\xE3o Pr\xE9via"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-2"
  }, "Requer autoriza\xE7\xE3o pr\xE9via?"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "requires_auth",
    value: "yes",
    checked: liberacaoData.requires_auth === 'yes',
    onChange: e => setLiberacaoData({
      ...liberacaoData,
      requires_auth: 'yes'
    }),
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "Sim - Necess\xE1rio")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "requires_auth",
    value: "no",
    checked: liberacaoData.requires_auth === 'no',
    onChange: e => setLiberacaoData({
      ...liberacaoData,
      requires_auth: 'no'
    }),
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "N\xE3o - Consulta livre")))), liberacaoData.requires_auth === 'yes' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "N\xBA de Autoriza\xE7\xE3o (TISS)"), /*#__PURE__*/React.createElement(Input, {
    value: liberacaoData.auth_number,
    onChange: e => setLiberacaoData({
      ...liberacaoData,
      auth_number: e.target.value
    }),
    placeholder: "Ex: XXXXXX/2026",
    className: "font-mono"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Data de Validade"), /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: liberacaoData.auth_expiry,
    onChange: e => setLiberacaoData({
      ...liberacaoData,
      auth_expiry: e.target.value
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-3"
  }, /*#__PURE__*/React.createElement("select", {
    value: liberacaoData.auth_status || 'approved',
    onChange: e => setLiberacaoData({
      ...liberacaoData,
      auth_status: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: "approved"
  }, "\u2713 Aprovada"), /*#__PURE__*/React.createElement("option", {
    value: "partial"
  }, "\u26A0\uFE0F Parcial"), /*#__PURE__*/React.createElement("option", {
    value: "pending"
  }, "\u23F3 Pendente de An\xE1lise"), /*#__PURE__*/React.createElement("option", {
    value: "denied"
  }, "\u2717 Negada"))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 p-3 bg-blue-100 border border-blue-400 rounded-lg"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: "authorized",
    checked: liberacaoData.authorized,
    onChange: e => setLiberacaoData({
      ...liberacaoData,
      authorized: e.target.checked
    }),
    className: "w-5 h-5 text-blue-600 cursor-pointer"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "authorized",
    className: "flex-1 cursor-pointer"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, "Documenta\xE7\xE3o validada e paciente autorizado"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Marque para prosseguir com o faturamento")))), tabAtivo === 'faturamento' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 border border-purple-300 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-purple-900"
  }, "\uD83D\uDCBC Estrutura de Faturamento TISS"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-purple-700 mt-1"
  }, "Compat\xEDvel com: Unimed, Funda\xE7\xE3o Copele, Sanepar, Itamed, PAM, SUS, Cons\xF3rcios")), !faturamentoData.guide_number?.trim() && /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 border border-orange-300 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-orange-800 font-semibold"
  }, "\uD83D\uDD34 Campo obrigat\xF3rio: N\xFAmero sequencial da Guia TISS")), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 border border-gray-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
  }, "1"), "Tipo de Servi\xE7o"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-2"
  }, "Tipo de Guia TISS"), /*#__PURE__*/React.createElement("select", {
    value: faturamentoData.guide_type || 'consulta',
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      guide_type: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 Selecione o tipo \u2014"), /*#__PURE__*/React.createElement("option", {
    value: "consulta"
  }, "01.01 - Consulta M\xE9dica/Odontol\xF3gica"), /*#__PURE__*/React.createElement("option", {
    value: "procedimento"
  }, "01.02 - Procedimento"), /*#__PURE__*/React.createElement("option", {
    value: "internacao"
  }, "01.03 - Interna\xE7\xE3o Hospitalar"), /*#__PURE__*/React.createElement("option", {
    value: "urgencia"
  }, "01.04 - Atendimento de Urg\xEAncia"), /*#__PURE__*/React.createElement("option", {
    value: "exame"
  }, "02.01 - Solicita\xE7\xE3o de Exame"), /*#__PURE__*/React.createElement("option", {
    value: "autorizacao"
  }, "02.02 - Autoriza\xE7\xE3o de Procedimento"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Tipo de Codifica\xE7\xE3o"), /*#__PURE__*/React.createElement("select", {
    value: faturamentoData.code_type || 'tuss',
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      code_type: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: "tuss"
  }, "TUSS (Padr\xE3o)"), /*#__PURE__*/React.createElement("option", {
    value: "cbhpm"
  }, "CBHPM (Medicina)"), /*#__PURE__*/React.createElement("option", {
    value: "cpt"
  }, "CPT (Odontologia)"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "C\xF3digo do Procedimento"), /*#__PURE__*/React.createElement(Input, {
    value: faturamentoData.procedure_code,
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      procedure_code: e.target.value
    }),
    placeholder: "Ex: 30101020",
    className: "font-mono"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 border border-gray-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
  }, "2"), "Dados do Atendimento"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Data do Atendimento"), /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: faturamentoData.service_date,
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      service_date: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Local de Atendimento"), /*#__PURE__*/React.createElement(Input, {
    value: faturamentoData.service_place,
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      service_place: e.target.value
    }),
    placeholder: "Ex: Consult\xF3rio, Hospital"
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Descri\xE7\xE3o do Servi\xE7o"), /*#__PURE__*/React.createElement(Input, {
    value: faturamentoData.service_name,
    onChange: () => {},
    disabled: true,
    className: "bg-gray-100"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Profissional Executante"), /*#__PURE__*/React.createElement(Input, {
    value: faturamentoData.responsible_doctor,
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      responsible_doctor: e.target.value
    }),
    placeholder: "Nome do profissional"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Profissional Solicitante"), /*#__PURE__*/React.createElement(Input, {
    value: faturamentoData.requesting_doctor,
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      requesting_doctor: e.target.value
    }),
    placeholder: "M\xE9dico que solicitou"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 border border-gray-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
  }, "3"), "Identifica\xE7\xE3o da Guia TISS"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "N\xBA Sequencial da Guia TISS ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500"
  }, "*")), /*#__PURE__*/React.createElement(Input, {
    value: faturamentoData.guide_number,
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      guide_number: e.target.value
    }),
    placeholder: "Ex: 000000001",
    className: "font-mono text-lg font-bold"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 mt-1"
  }, "Ser\xE1 componente do arquivo XML para faturamento")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Valor Solicitado (R$)"), /*#__PURE__*/React.createElement(Input, {
    type: "number",
    step: "0.01",
    value: faturamentoData.estimated_value,
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      estimated_value: e.target.value
    }),
    placeholder: "0,00",
    className: "text-lg font-bold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Valor Autorizado (R$)"), /*#__PURE__*/React.createElement(Input, {
    type: "number",
    step: "0.01",
    value: faturamentoData.authorized_value || faturamentoData.estimated_value,
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      authorized_value: e.target.value
    }),
    placeholder: "0,00"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 border border-gray-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 mb-3"
  }, "\uD83D\uDCDD Observa\xE7\xF5es Adicionais"), /*#__PURE__*/React.createElement("textarea", {
    value: faturamentoData.notes,
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      notes: e.target.value
    }),
    placeholder: "Informa\xE7\xF5es complementares para o arquivo XML...",
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm",
    rows: "3"
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-blue-900"
  }, "\u2713 Guia TISS ", faturamentoData.guide_number?.trim() ? 'pronta para XML' : 'incompleta'), faturamentoData.guide_number?.trim() && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-700 mt-1"
  }, "Operadora: ", liberacaoData.payer_name, " | Arquivo ser\xE1 estruturado conforme padr\xE3o"))), tabAtivo === 'pagamento' && showPaymentTab && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-orange-800 flex items-center gap-2"
  }, "\uD83D\uDCB3 Registre o pagamento da consulta no balc\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-orange-700 mt-1"
  }, "Preencha os dados espec\xEDficos da forma de pagamento")), !pagamentoData.payment_method && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-300 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-red-800 font-semibold"
  }, "\uD83D\uDD34 Selecione uma forma de pagamento para continuar")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-blue-900 mb-2"
  }, "VALOR ORIGINAL"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-blue-700"
  }, "R$ ", parseFloat(faturamentoData.estimated_value || '0').toFixed(2))), faturamentoData.discount > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-red-50 to-red-100 border border-red-400 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-red-900 mb-2"
  }, "\uD83D\uDCB0 DESCONTO AUTORIZADO"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-red-600"
  }, "- R$ ", parseFloat(faturamentoData.discount || '0').toFixed(2)), faturamentoData.discount_reason && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-red-700 mt-2 font-medium"
  }, "Motivo: ", faturamentoData.discount_reason)), /*#__PURE__*/React.createElement("div", {
    className: `bg-gradient-to-br ${faturamentoData.discount > 0 ? 'from-green-50 to-green-100 border border-green-400' : 'from-blue-50 to-blue-100 border border-blue-300'} rounded-lg p-4`
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-gray-900 mb-2"
  }, "VALOR A PAGAR"), /*#__PURE__*/React.createElement("p", {
    className: `text-3xl font-bold ${faturamentoData.discount > 0 ? 'text-green-700' : 'text-blue-700'}`
  }, "R$ ", (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2)))), faturamentoData.discount > 0 && !faturamentoData.discount_authorized_by && !isDiscountSectionOpen && /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-yellow-800"
  }, "\u23F3 Solicita\xE7\xE3o de desconto enviada"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-yellow-700 mt-1"
  }, "Desconto: R$ ", parseFloat(faturamentoData.discount).toFixed(2), " \u2022 Motivo: ", faturamentoData.discount_reason), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-yellow-600 mt-1"
  }, "Aguardando aprova\xE7\xE3o na p\xE1gina de Autoriza\xE7\xF5es")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setIsDiscountSectionOpen(true),
    className: "px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded hover:bg-yellow-600 transition whitespace-nowrap ml-2"
  }, "\u270F\uFE0F Editar"))), (!faturamentoData.discount > 0 || faturamentoData.discount_authorized_by || isDiscountSectionOpen) && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCB0"), "Desconto Autorizado"), faturamentoData.discount > 0 && !faturamentoData.discount_authorized_by && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setIsDiscountSectionOpen(false),
    className: "text-sm text-gray-600 hover:text-gray-900"
  }, "\u2715")), currentRole !== 'admin' && currentRole !== 'gerente_financeiro' && currentRole !== 'gestor' && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-100 border-l-4 border-red-600 p-3 mb-4 rounded"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-red-800"
  }, "\u26A0\uFE0F Apenas Administrador ou Gerente Financeiro podem autorizar descontos.")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Valor do Desconto (R$)"), /*#__PURE__*/React.createElement(Input, {
    type: "number",
    step: "0.01",
    value: faturamentoData.discount || 0,
    onChange: e => {
      const newDiscount = parseFloat(e.target.value) || 0;

      // Se está tentando aplicar desconto e não tem permissão, mostrar aviso e sair
      if (newDiscount > 0 && currentRole !== 'admin' && currentRole !== 'gerente_financeiro' && currentRole !== 'gestor') {
        alert('❌ Você não tem permissão para autorizar descontos. Apenas Administrador ou Gerente Financeiro podem fazer isso.');
        return;
      }

      // ✅ Tem permissão (ou desconto é 0), pode prosseguir
      if (newDiscount > 0) {
        // Se tem permissão e está aplicando desconto, registrar autorização
        setFaturamentoData({
          ...faturamentoData,
          discount: newDiscount,
          discount_authorized_by: user?.email || 'Sistema',
          discount_authorized_at: new Date().toISOString()
        });
      } else {
        // Desconto é 0 ou não tem valor
        setFaturamentoData({
          ...faturamentoData,
          discount: newDiscount
        });
      }
    },
    disabled: currentRole !== 'admin' && currentRole !== 'gerente_financeiro' && currentRole !== 'gestor',
    placeholder: "0,00",
    className: "text-lg font-bold border-red-400 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 mt-1"
  }, "Deixe em branco ou 0 para sem desconto")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Motivo do Desconto"), /*#__PURE__*/React.createElement("select", {
    value: faturamentoData.discount_reason || '',
    onChange: e => setFaturamentoData({
      ...faturamentoData,
      discount_reason: e.target.value
    }),
    disabled: currentRole !== 'admin' && currentRole !== 'gerente_financeiro' && currentRole !== 'gestor',
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 Nenhum motivo \u2014"), /*#__PURE__*/React.createElement("option", {
    value: "Autorizado Adm"
  }, "Autorizado Adm"), /*#__PURE__*/React.createElement("option", {
    value: "Autorizado M\xE9dico"
  }, "Autorizado M\xE9dico"), /*#__PURE__*/React.createElement("option", {
    value: "Conv\xEAnio/Acordo"
  }, "Conv\xEAnio/Acordo"), /*#__PURE__*/React.createElement("option", {
    value: "Promo\xE7\xE3o"
  }, "Promo\xE7\xE3o"), /*#__PURE__*/React.createElement("option", {
    value: "Fidelidade"
  }, "Fidelidade"), /*#__PURE__*/React.createElement("option", {
    value: "Dificuldade Financeira"
  }, "Dificuldade Financeira"), /*#__PURE__*/React.createElement("option", {
    value: "Erro de Cobran\xE7a"
  }, "Erro de Cobran\xE7a"), /*#__PURE__*/React.createElement("option", {
    value: "Cortesia"
  }, "Cortesia"), /*#__PURE__*/React.createElement("option", {
    value: "Outro"
  }, "Outro")))), faturamentoData.discount > 0 && !faturamentoData.discount_authorized_by && /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: async () => {
      if (!faturamentoData.discount_reason || faturamentoData.discount_reason.trim() === '') {
        alert('⚠️ Por favor, selecione um motivo válido para o desconto antes de solicitar');
        return;
      }
      try {
        setLoading(true);

        // 📝 Enviar solicitação para fila de aprovação via API
        await discountApprovalsApi.createDiscountAuthorization(clinicId, appointment?.id, faturamentoData.discount, faturamentoData.discount_reason, '',
        // notes
        user?.id);
        console.log('✅ Solicitação de desconto salva no banco de dados');
        showSuccessNotification('📋 Solicitação enviada com sucesso! Aguardando aprovação na página de Autorizações...');
        setIsDiscountSectionOpen(false); // Fechar seção após solicitar
      } catch (error) {
        console.error('Erro ao solicitar autorização:', error);
        alert('❌ Erro ao enviar solicitação de autorização: ' + error.message);
      } finally {
        setLoading(false);
      }
    },
    disabled: loading || !faturamentoData.discount || !faturamentoData.discount_reason,
    className: "w-full px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-lg hover:bg-yellow-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  }, "\uD83D\uDCDD Solicitar Autoriza\xE7\xE3o de Desconto"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 mt-2 text-center"
  }, "O desconto ser\xE1 enviado para aprova\xE7\xE3o do Administrador/Gerente Financeiro na p\xE1gina de Autoriza\xE7\xF5es")), faturamentoData.discount > 0 && faturamentoData.discount_authorized_by && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border-l-4 border-green-600 p-3 mt-4 rounded"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-green-800"
  }, "\u2705 Desconto autorizado por: ", discountAuthorizedByName || faturamentoData.discount_authorized_by), faturamentoData.discount_authorized_at && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-700 mt-1"
  }, "Em: ", new Date(faturamentoData.discount_authorized_at).toLocaleString('pt-BR')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border-2 border-blue-300 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-blue-900 mb-4 text-sm flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\uD83D\uDCB3"), "Formas de Pagamento (M\xFAltiplas)"), (() => {
    const valorComDesconto = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
    const totalPago = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
    const saldo = (valorComDesconto - totalPago).toFixed(2);
    const completed = saldo <= 0.01;
    return /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-4 gap-3 mb-4 text-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white border border-blue-200 rounded p-3"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-600"
    }, "Valor Total"), /*#__PURE__*/React.createElement("p", {
      className: "font-bold text-lg text-blue-900"
    }, "R$ ", valorComDesconto.toFixed(2))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white border border-blue-200 rounded p-3"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-600"
    }, "J\xE1 Pago"), /*#__PURE__*/React.createElement("p", {
      className: "font-bold text-lg text-blue-600"
    }, "R$ ", totalPago.toFixed(2))), /*#__PURE__*/React.createElement("div", {
      className: `border rounded p-3 ${completed ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`
    }, /*#__PURE__*/React.createElement("p", {
      className: `text-xs ${completed ? 'text-green-600' : 'text-yellow-600'}`
    }, "Saldo"), /*#__PURE__*/React.createElement("p", {
      className: `font-bold text-lg ${completed ? 'text-green-900' : 'text-yellow-900'}`
    }, "R$ ", saldo)), /*#__PURE__*/React.createElement("div", {
      className: `border rounded p-3 flex items-center justify-center ${completed ? 'bg-green-100 border-green-400' : 'bg-orange-100 border-orange-400'}`
    }, /*#__PURE__*/React.createElement("p", {
      className: `font-bold ${completed ? 'text-green-900' : 'text-orange-900'}`
    }, completed ? '✓ Completo' : '⚠️ Incompleto')));
  })(), pagamentoSplits.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-semibold text-gray-700 mb-2 block"
  }, "Formas Adicionadas:"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, pagamentoSplits.map((split, idx) => /*#__PURE__*/React.createElement("div", {
    key: split.id,
    className: "flex items-center gap-2 bg-white p-3 border border-gray-300 rounded"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-gray-900"
  }, split.method === 'FATURADO' ? '📄 Faturado' : split.method), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "R$ ", parseFloat(split.amount || '0').toFixed(2))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setPagamentoSplits(pagamentoSplits.filter((_, i) => i !== idx));
    },
    className: "px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200 transition"
  }, "\u2715 Remover"))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-blue-200 rounded-lg p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-700 mb-3"
  }, "Adicionar Nova Forma de Pagamento:"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Forma de Pagamento"), /*#__PURE__*/React.createElement("select", {
    id: "newPaymentMethod",
    defaultValue: "",
    className: "w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 Selecione \u2014"), /*#__PURE__*/React.createElement("optgroup", {
    label: "\uD83D\uDCBC Faturado"
  }, /*#__PURE__*/React.createElement("option", {
    value: "FATURADO"
  }, "Faturado (Conv\xEAnio/Particular)")), /*#__PURE__*/React.createElement("optgroup", {
    label: "\uD83D\uDCB0 Em Esp\xE9cie"
  }, /*#__PURE__*/React.createElement("option", {
    value: "DINHEIRO"
  }, "Dinheiro"), /*#__PURE__*/React.createElement("option", {
    value: "CHEQUE"
  }, "Cheque")), /*#__PURE__*/React.createElement("optgroup", {
    label: "\uD83D\uDCB3 Cart\xE3o"
  }, /*#__PURE__*/React.createElement("option", {
    value: "CARTAO"
  }, "Cart\xE3o de Cr\xE9dito/D\xE9bito")), /*#__PURE__*/React.createElement("optgroup", {
    label: "\uD83D\uDCF1 Digital"
  }, /*#__PURE__*/React.createElement("option", {
    value: "PIX"
  }, "PIX"), /*#__PURE__*/React.createElement("option", {
    value: "TRANSFERENCIA"
  }, "Transfer\xEAncia Banc\xE1ria"), /*#__PURE__*/React.createElement("option", {
    value: "BOLETO"
  }, "Boleto")), /*#__PURE__*/React.createElement("optgroup", {
    label: "\uD83D\uDC64 Outro"
  }, /*#__PURE__*/React.createElement("option", {
    value: "DIRETO_PROFISSIONAL"
  }, "Direto ao Profissional")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Valor (R$)"), /*#__PURE__*/React.createElement(Input, {
    type: "number",
    step: "0.01",
    id: "newPaymentAmount",
    placeholder: "0,00",
    className: "text-sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      const methodSelect = document.getElementById('newPaymentMethod');
      const amountInput = document.getElementById('newPaymentAmount');
      const method = methodSelect.value;
      const amount = parseFloat(amountInput.value);
      if (!method) {
        alert('⚠️ Selecione uma forma de pagamento');
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        alert('⚠️ Digite um valor válido maior que 0');
        return;
      }

      // Validar saldo
      const valorComDesconto = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
      const totalPago = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
      if (totalPago + amount > valorComDesconto + 0.01) {
        alert(`⚠️ Valor excede o saldo. Saldo disponível: R$ ${(valorComDesconto - totalPago).toFixed(2)}`);
        return;
      }

      // Adicionar split
      setPagamentoSplits([...pagamentoSplits, {
        id: Date.now(),
        method,
        amount: amount.toString(),
        details: {}
      }]);

      // Limpar inputs
      methodSelect.value = '';
      amountInput.value = '';
    },
    className: "w-full px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition"
  }, "\u2795 Adicionar")))), pagamentoSplits.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border border-green-300 rounded p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-green-800"
  }, "\u2713 ", pagamentoSplits.length, " forma(s) de pagamento adicionada(s)"))), pagamentoSplits.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-green-900 text-sm"
  }, "\u2713 Resumo das Formas de Pagamento"), /*#__PURE__*/React.createElement("span", {
    className: "inline-block px-2 py-1 bg-green-200 text-green-900 text-xs font-bold rounded"
  }, "PRONTO")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, pagamentoSplits.map((split, idx) => /*#__PURE__*/React.createElement("div", {
    key: split.id,
    className: "border-2 border-green-300 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center bg-green-100 p-3 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-green-900"
  }, split.method === 'FATURADO' ? '📄 Faturado' : split.method === 'CARTAO' ? '💳 Cartão' : split.method === 'PIX' ? '📱 PIX' : split.method === 'TRANSFERENCIA' ? '🏦 Transferência' : split.method === 'BOLETO' ? '📋 Boleto' : split.method === 'CHEQUE' ? '✓ Cheque' : split.method === 'DINHEIRO' ? '💵 Dinheiro' : split.method), split.details?.cardBrand && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-green-700 ml-2"
  }, "(", split.details.cardBrand, ")"), split.details?.pixIdentifier && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-green-700 ml-2"
  }, split.details.pixIdentifier)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-green-900"
  }, "R$ ", parseFloat(split.amount || '0').toFixed(2)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      console.log('🔄 Clicou em editar split', split.id, 'Modo anterior:', editingSplitId);
      if (editingSplitId === split.id) {
        setEditingSplitId(null);
      } else {
        setEditingSplitId(split.id);
        setSplitDetails(split.details || {});
        console.log('✏️ Abrindo edição do split', split.id);
      }
    },
    className: "px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
  }, editingSplitId === split.id ? '✓ Pronto' : '✏️ Editar'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setPagamentoSplits(pagamentoSplits.filter(s => s.id !== split.id));
      if (editingSplitId === split.id) setEditingSplitId(null);
    },
    className: "px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
  }, "\u2715 Remover"))), editingSplitId === split.id && split.method === 'PIX' && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-t border-green-300 p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-gray-800 mb-2"
  }, "\uD83D\uDCF1 Dados do PIX"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Chave PIX"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    value: splitDetails.pixIdentifier || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        pixIdentifier: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    placeholder: "Telefone, email, CPF ou aleat\xF3ria",
    className: "text-xs"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "ID da Transa\xE7\xE3o"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    value: splitDetails.pixTransactionId || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        pixTransactionId: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    placeholder: "ID do Pix (opcional)",
    className: "text-xs"
  })))), editingSplitId === split.id && split.method === 'CARTAO' && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-t border-green-300 p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-gray-800 mb-2"
  }, "\uD83D\uDCB3 Dados do Cart\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Bandeira"), /*#__PURE__*/React.createElement("select", {
    value: splitDetails.cardBrand || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        cardBrand: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    className: "w-full px-2 py-2 border border-gray-300 rounded text-xs"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 Selecione \u2014"), /*#__PURE__*/React.createElement("option", {
    value: "VISA"
  }, "Visa"), /*#__PURE__*/React.createElement("option", {
    value: "MASTERCARD"
  }, "Mastercard"), /*#__PURE__*/React.createElement("option", {
    value: "ELO"
  }, "Elo"), /*#__PURE__*/React.createElement("option", {
    value: "AMEX"
  }, "American Express"), /*#__PURE__*/React.createElement("option", {
    value: "HIPERCARD"
  }, "Hipercard"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "\xDAltimos 4 d\xEDgitos"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    maxLength: "4",
    value: splitDetails.cardLastDigits || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        cardLastDigits: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    placeholder: "0000",
    className: "text-xs"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Parcelas"), /*#__PURE__*/React.createElement(Input, {
    type: "number",
    min: "1",
    max: "12",
    value: splitDetails.cardInstallments || '1',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        cardInstallments: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    className: "text-xs"
  })))), editingSplitId === split.id && split.method === 'TRANSFERENCIA' && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-t border-green-300 p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-gray-800 mb-2"
  }, "\uD83C\uDFE6 Dados da Transfer\xEAncia"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Tipo"), /*#__PURE__*/React.createElement("select", {
    value: splitDetails.tedType || 'TED',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        tedType: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    className: "w-full px-2 py-2 border border-gray-300 rounded text-xs"
  }, /*#__PURE__*/React.createElement("option", {
    value: "TED"
  }, "TED"), /*#__PURE__*/React.createElement("option", {
    value: "DOC"
  }, "DOC"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Refer\xEAncia"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    value: splitDetails.tedReference || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        tedReference: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    placeholder: "N\xFAmero da transfer\xEAncia",
    className: "text-xs"
  })))), editingSplitId === split.id && split.method === 'BOLETO' && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-t border-green-300 p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-gray-800 mb-2"
  }, "\uD83D\uDCCB Dados do Boleto"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "N\xFAmero do Boleto"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    value: splitDetails.boletoNumber || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        boletoNumber: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    placeholder: "N\xFAmero do boleto",
    className: "text-xs"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "C\xF3digo de Barras"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    value: splitDetails.boletoBarcode || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        boletoBarcode: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    placeholder: "C\xF3digo de barras",
    className: "text-xs"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Data de Vencimento"), /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: splitDetails.bolletoDueDate || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        bolletoDueDate: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    className: "text-xs"
  })))), editingSplitId === split.id && split.method === 'CHEQUE' && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-t border-green-300 p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-gray-800 mb-2"
  }, "\u2713 Dados do Cheque"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "N\xFAmero do Cheque"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    value: splitDetails.checkNumber || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        checkNumber: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    placeholder: "N\xFAmero do cheque",
    className: "text-xs"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-700 mb-1"
  }, "Data de Vencimento"), /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: splitDetails.checkDueDate || '',
    onChange: e => {
      const newDetails = {
        ...splitDetails,
        checkDueDate: e.target.value
      };
      setSplitDetails(newDetails);
      const updatedSplits = pagamentoSplits.map(s => s.id === split.id ? {
        ...s,
        details: newDetails
      } : s);
      setPagamentoSplits(updatedSplits);
    },
    className: "text-xs"
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "border-t-2 border-green-300 mt-3 pt-3 flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-green-900 text-sm"
  }, "Total Pago:"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-lg text-green-900"
  }, "R$ ", pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0).toFixed(2))))), tabAtivo === 'financeiro' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 border border-purple-300 rounded-lg p-4 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-purple-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(TrendingUp, {
    size: 20
  }), "\uD83D\uDCCA Resumo Financeiro ", isConvenioFaturado ? '- Convênio/Faturamento' : '- Particular'), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-purple-700 mt-1"
  }, isConvenioFaturado ? 'Informações de autorização e faturamento TISS' : 'Informações de registro, contas a receber e fluxo de caixa')), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-blue-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(FileText, {
    size: 18
  }), "Informa\xE7\xF5es de Registro"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-blue-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Data/Hora de Registro"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, new Date().toLocaleString('pt-BR'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-blue-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Registrado por"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, "Sistema Autom\xE1tico")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-blue-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Hash de Opera\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "font-mono text-xs font-semibold text-gray-900"
  }, appointment.id.substring(0, 12))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-blue-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Status de Auditoria"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-green-600"
  }, "\u2713 Rastreado")))), isConvenioFaturado && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 rounded-lg p-4 border border-blue-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-blue-900 mb-3"
  }, "\u2713 Libera\xE7\xE3o/Autoriza\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, liberacaoData.payer_name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Plano"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, liberacaoData.plan_name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "N\xBA Autoriza\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-blue-600"
  }, liberacaoData.auth_number || '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Validade"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, liberacaoData.auth_expiry || '—')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 rounded-lg p-4 border border-purple-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-purple-900 mb-3"
  }, "\uD83D\uDCB0 Faturamento TISS"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, faturamentoData.service_name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "N\xBA Guia TISS"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-purple-600"
  }, faturamentoData.guide_number || '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "M\xE9dico"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, faturamentoData.responsible_doctor || '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Valor Estimado"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-purple-600"
  }, "R$ ", parseFloat(faturamentoData.estimated_value || '0').toFixed(2))), parseFloat(faturamentoData.discount || '0') > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Desconto"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-red-600"
  }, "- R$ ", parseFloat(faturamentoData.discount || '0').toFixed(2))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Valor Final"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-green-600"
  }, "R$ ", (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2)))))), (isParticular || isConvenioParticular) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 border border-orange-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-orange-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(DollarSign, {
    size: 18
  }), "Dados para Fechamento de Caixa"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-orange-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Paciente"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, appointment.patients?.name || 'N/A')), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-orange-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Forma de Pagamento"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, pagamentoData.payment_method ? formatPaymentMethod(pagamentoData.payment_method) : appointment.payer_id ? 'Convênio' : 'Não definida')), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-orange-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Valor Total"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-orange-600"
  }, "R$ ", (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-orange-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Profissional"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, appointment.professionals?.name || '—')), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-orange-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, appointment.services?.name || '—')), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-orange-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, appointment.payers?.name || 'Particular')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border border-green-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-green-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(TrendingUp, {
    size: 18
  }), "Contas a Receber (AR)"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-green-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Status"), /*#__PURE__*/React.createElement("p", {
    className: `font-semibold ${registroData.receivableStatus === 'criada' ? 'text-green-600' : 'text-gray-500'}`
  }, registroData.receivableStatus === 'criada' ? '✓ Criada' : 'Não criada')), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-green-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Valor da AR"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-green-600"
  }, "R$ ", registroData.arValue.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-green-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Saldo em Aberto"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-red-600"
  }, "R$ ", (() => {
    const valorTotal = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
    const totalPago = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
    const saldoAberto = valorTotal - totalPago;
    return saldoAberto.toFixed(2);
  })())), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-green-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "ID da AR"), /*#__PURE__*/React.createElement("p", {
    className: "font-mono text-xs font-semibold text-gray-900"
  }, registroData.receivableId ? registroData.receivableId.substring(0, 8) + '...' : 'Aguardando'))), registroData.receivableStatus === 'criada' && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-2 bg-green-100 rounded border border-green-300 text-xs text-green-800"
  }, "\u2713 Conta a Receber criada com sucesso e registrada na auditoria financeira"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 border border-indigo-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-indigo-900 mb-3"
  }, "\uD83D\uDCC8 Fluxo de Caixa"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-indigo-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Saldo atual"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-indigo-600"
  }, "N\xE3o dispon\xEDvel"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Ser\xE1 atualizado ap\xF3s fechamento")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-indigo-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Lan\xE7amento no caixa"), /*#__PURE__*/React.createElement("p", {
    className: `font-semibold ${registroData.cashFlowRegistered ? 'text-green-600' : 'text-gray-500'}`
  }, registroData.cashFlowRegistered ? '✓ Registrado' : 'Pendente de confirmação')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-yellow-900 mb-3"
  }, "\uD83D\uDD12 Seguran\xE7a e Conformidade"), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-2 text-sm"
  }, /*#__PURE__*/React.createElement("li", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 font-bold"
  }, "\u2713"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700"
  }, "Dados cadastrais validados conforme padr\xE3o TISS")), /*#__PURE__*/React.createElement("li", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `font-bold ${registroData.receivableStatus === 'criada' ? 'text-green-600' : 'text-gray-400'}`
  }, registroData.receivableStatus === 'criada' ? '✓' : '○'), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700"
  }, "Conta a Receber ", registroData.receivableStatus === 'criada' ? 'registrada' : 'será registrada', " no sistema")), /*#__PURE__*/React.createElement("li", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 font-bold"
  }, "\u2713"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700"
  }, "Auditoria financeira ativada e rastreando")), /*#__PURE__*/React.createElement("li", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 font-bold"
  }, "\u2713"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700"
  }, "Pronto para fechamento de caixa"))))), tabAtivo === 'resumo' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (() => {
    const validation = validateFinancialData();
    return validation.valid ? null : /*#__PURE__*/React.createElement("div", {
      className: "bg-red-50 border-l-4 border-red-600 p-4 rounded-lg"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-bold text-red-900 mb-2"
    }, "\u274C N\xE3o \xE9 poss\xEDvel liberar o atendimento:"), /*#__PURE__*/React.createElement("ul", {
      className: "list-disc list-inside text-sm text-red-800 space-y-1"
    }, validation.errors.map((error, idx) => /*#__PURE__*/React.createElement("li", {
      key: idx
    }, error))), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-red-700 mt-3"
    }, "Corrija os dados nas abas anteriores antes de liberar."));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border border-green-300 rounded-lg p-4 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-green-900"
  }, "\u2705 Dados do Atendimento Confirmados"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-700 mt-1"
  }, "Resumo de todos os dados preenchidos")), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-4 border border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900 mb-3"
  }, "\uD83D\uDCDD Dados Cadastrais"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Nome"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, cadastralData.name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Email"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, cadastralData.email)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "CPF/RG"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, cadastralData.document_id || '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Telefone"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, cadastralData.phone || '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Celular"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, cadastralData.cell_phone || '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Data de Nascimento"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, cadastralData.birthdate || '—')))), isConvenioFaturado && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 rounded-lg p-4 border border-blue-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900 mb-3"
  }, "\u2713 Libera\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, liberacaoData.payer_name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Plano"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, liberacaoData.plan_name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "N\xBA Autoriza\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900 text-blue-600"
  }, liberacaoData.auth_number)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Vencimento"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, liberacaoData.auth_expiry || '—')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 rounded-lg p-4 border border-purple-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900 mb-3"
  }, "\uD83D\uDCB0 Faturamento"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, faturamentoData.service_name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "N\xBA Guia TISS"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-purple-600"
  }, faturamentoData.guide_number)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "M\xE9dico Respons\xE1vel"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, faturamentoData.responsible_doctor || '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Valor Estimado"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, "R$ ", parseFloat(faturamentoData.estimated_value || '0').toFixed(2)))))), (isParticular || isConvenioParticular) && /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 rounded-lg p-4 border border-orange-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900 mb-3"
  }, "\uD83D\uDCB3 Pagamento"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Forma de Pagamento"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, formatPaymentMethod(pagamentoData.payment_method))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Valor da Consulta"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-900"
  }, "R$ ", parseFloat(faturamentoData.estimated_value || '0').toFixed(2))), faturamentoData.discount > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Desconto"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-red-600"
  }, "- R$ ", parseFloat(faturamentoData.discount || '0').toFixed(2)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-700 mt-1"
  }, faturamentoData.discount_reason || 'Sem motivo'), faturamentoData.discount_authorized_by && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-700"
  }, "\u2713 Autorizado: ", discountAuthorizedByName || faturamentoData.discount_authorized_by), !faturamentoData.discount_authorized_by && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-yellow-700"
  }, "\u23F3 Pendente de aprova\xE7\xE3o"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Valor a Receber"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-green-600 text-lg"
  }, "R$ ", (parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2))), pagamentoData.payment_method === 'DINHEIRO' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Troco"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-green-600"
  }, "R$ ", parseFloat(pagamentoData.change || '0').toFixed(2))), pagamentoData.payment_method === 'CARTAO' && parseInt(pagamentoData.card_installments || 1) > 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 font-medium"
  }, "Parcelamento"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-blue-600"
  }, pagamentoData.card_installments, "x"))), pagamentoData.payment_method === 'CARTAO' && parseInt(pagamentoData.card_installments || 1) > 1 && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-orange-300"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-orange-900 mb-2"
  }, "\uD83D\uDCCA Cronograma de Parcelas (Contas a Receber)"), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-2 text-xs"
  }, Array.from({
    length: parseInt(pagamentoData.card_installments || 1)
  }).map((_, i) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30 + i * 30);
    // 💰 Aplicar DESCONTO ao cálculo das parcelas
    const valueWithDiscount = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
    const installmentValue = (valueWithDiscount / parseInt(pagamentoData.card_installments || 1)).toFixed(2);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex justify-between bg-white px-3 py-2 rounded border border-orange-100"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-medium text-gray-700"
    }, "Parcela ", i + 1, ":"), /*#__PURE__*/React.createElement("span", {
      className: "text-gray-900"
    }, "R$ ", parseFloat(installmentValue).toFixed(2), " - Vence em ", dueDate.toLocaleDateString('pt-BR')));
  }))), pagamentoSplits && pagamentoSplits.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-orange-300"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-orange-900 mb-3"
  }, "\uD83D\uDCB3 Resumo de Pagamentos Realizados"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, pagamentoSplits.map((split, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex justify-between bg-white px-3 py-2 rounded border border-orange-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-gray-700"
  }, formatPaymentMethod(split.method), ":"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-900"
  }, "R$ ", parseFloat(split.amount || '0').toFixed(2)))), (() => {
    const valorTotal = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
    const totalPago = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
    const saldoAberto = valorTotal - totalPago;
    if (saldoAberto > 0.01) {
      return /*#__PURE__*/React.createElement("div", {
        className: "mt-3 pt-3 border-t border-red-200 flex justify-between bg-red-50 px-3 py-2 rounded border border-red-200"
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-bold text-red-800"
      }, "Saldo em Aberto:"), /*#__PURE__*/React.createElement("span", {
        className: "font-bold text-lg text-red-600"
      }, "R$ ", saldoAberto.toFixed(2)));
    }
    return null;
  })()))), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-100 border-2 border-green-500 rounded-lg p-4 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-green-900 font-bold text-lg"
  }, "\uD83C\uDF89 Tudo pronto para liberar o atendimento!"))))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-gray-200 p-4 bg-white flex gap-2 justify-end flex-shrink-0"
  }, tabAtivo === 'dados_agendamento' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "outline",
    onClick: onClose
  }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    onClick: handleSaveAgendamento,
    disabled: loading || !agendamentoData.date || !agendamentoData.time || !agendamentoData.professionalId || !agendamentoData.serviceId,
    className: "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold",
    title: !agendamentoData.date || !agendamentoData.time || !agendamentoData.professionalId || !agendamentoData.serviceId ? 'Preencha Data, Hora, Profissional e Serviço' : 'Salvar dados do agendamento'
  }, loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin mr-2"
  }, "\u23F3"), "Salvando...") : /*#__PURE__*/React.createElement(React.Fragment, null, "\u2713 Salvar e Continuar \u2192"))), tabAtivo === 'cadastrais' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "outline",
    onClick: onClose
  }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    onClick: () => window.open(`/clinica/pacientes/${appointment?.patient_id}`, '_blank'),
    className: "bg-gray-600 hover:bg-gray-700 text-white"
  }, /*#__PURE__*/React.createElement(Edit2, {
    size: 16,
    className: "mr-2"
  }), "Editar Cadastro"), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    onClick: handleSaveCadastral,
    disabled: loading || !cadastralStatus.complete,
    className: "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold",
    title: !cadastralStatus.complete ? 'Preencha todos os campos obrigatórios' : 'Salvar e ir para próxima aba'
  }, loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin mr-2"
  }, "\u23F3"), "Salvando...") : /*#__PURE__*/React.createElement(React.Fragment, null, "\u2713 Salvar e Continuar \u2192"))), tabAtivo === 'liberacao' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "outline",
    onClick: () => setTabAtivo('cadastrais')
  }, "\u2190 Voltar"), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    onClick: handleSaveLiberacao,
    disabled: !liberacaoData.card_number?.trim() || !liberacaoData.authorized || loading,
    className: "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
  }, loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin mr-2"
  }, "\u23F3"), "Salvando...") : /*#__PURE__*/React.createElement(React.Fragment, null, "\u2713 Salvar e Continuar \u2192"))), tabAtivo === 'faturamento' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "outline",
    onClick: () => setTabAtivo('liberacao')
  }, "\u2190 Voltar"), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    onClick: handleSaveFaturamento,
    disabled: !faturamentoData.guide_number?.trim() || loading,
    className: "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
  }, loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin mr-2"
  }, "\u23F3"), "Salvando...") : /*#__PURE__*/React.createElement(React.Fragment, null, "\u2713 Salvar e Continuar \u2192"))), tabAtivo === 'pagamento' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "outline",
    onClick: () => setTabAtivo('cadastrais')
  }, "\u2190 Voltar"), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    onClick: handleSavePagamento,
    disabled: !pagamentoData.payment_method || loading,
    className: "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
  }, loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin mr-2"
  }, "\u23F3"), "Salvando...") : /*#__PURE__*/React.createElement(React.Fragment, null, "\u2713 Salvar e Continuar \u2192"))), tabAtivo === 'financeiro' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "outline",
    onClick: () => setTabAtivo('pagamento')
  }, "\u2190 Voltar"), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    onClick: () => setTabAtivo('resumo'),
    className: "bg-blue-600 hover:bg-blue-700 text-white font-bold"
  }, "Prosseguir para Resumo Final \u2192")), tabAtivo === 'resumo' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "outline",
    onClick: onClose
  }, "Fechar"), hasClinicalShortcuts ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "outline",
    onClick: handleOpenPatientRecord,
    className: "border-violet-300 text-violet-700 hover:bg-violet-100"
  }, /*#__PURE__*/React.createElement(FileText, {
    size: 16,
    className: "mr-2"
  }), "Abrir Prontu\xE1rio"), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    onClick: handleOpenProfessionalFlow,
    className: "bg-violet-600 hover:bg-violet-700 text-white font-bold"
  }, isReleasedForProfessional ? '▶ Iniciar Atendimento' : '↗ Abrir Atendimento')) : /*#__PURE__*/React.createElement(React.Fragment, null, (() => {
    const validation = validateFinancialData();
    return /*#__PURE__*/React.createElement(Button, {
      type: "button",
      onClick: handleCompleteCheckIn,
      disabled: loading || !validation.valid,
      className: "bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold",
      title: !validation.valid ? `❌ Erros:\n${validation.errors.map(e => `• ${e}`).join('\n')}` : 'Liberar paciente para atendimento'
    }, loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "animate-spin mr-2"
    }, "\u23F3"), "Liberando...") : /*#__PURE__*/React.createElement(React.Fragment, null, "\u2713 Liberar para Atendimentos"));
  })()))))));
}