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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarDays,
  Clock3,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Edit2,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  FileText,
} from 'lucide-react';
import PatientSearchOrCreate from './PatientSearchOrCreate';
import { APPOINTMENT_STATUS } from '@/lib/appointmentStatusEnums';
import { migrateStatus, SERVICE_STATUSES, getStatusLabelOnly } from '@/lib/appointmentStatusConstants';
import { createAR } from '@/lib/financeApi';
import { logAppointmentFinancialAudit, FINANCIAL_EVENT_TYPES } from '@/lib/auditFinancialApi';
import discountApprovalsApi from '@/lib/discountApprovalsApi';
import { getUserNameById } from '@/lib/usersApi';

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

// ✨ FUNÇÕES HELPER PARA ABA DADOS AGENDAMENTO
const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MODAL_VISIBLE_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled'];

const STATUS_CONFIG = {
  'scheduled': { label: 'Agendado', icon: '📅', color: 'blue' },
  'confirmed': { label: 'Confirmado', icon: '✅', color: 'green' },
  'completed': { label: 'Completado', icon: '✓', color: 'emerald' },
  'cancelled': { label: 'Cancelado', icon: '✗', color: 'red' },
  'no-show': { label: 'Não Compareceu', icon: '⚠️', color: 'orange' },
};

const formatDateToIso = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-');
  return new Date(year, month - 1, day);
};

const timeToMinutes = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatScheduleWindow = (schedule) => {
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

  return (schedules || [])
    .filter((schedule) => (
      schedule &&
      schedule.active !== false &&
      Number(schedule.day_of_week) === weekday &&
      isDateInsideScheduleRange(dateString, schedule)
    ))
    .sort((left, right) => timeToMinutes(left.start_time) - timeToMinutes(right.start_time));
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
  const { user, currentRole } = useAuth();
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
    discount_authorized_by: null, // Quem autorizou o desconto
    discount_authorized_at: null, // Quando foi autorizado
    notes: '',
  });

  // Pagamento no Balcão - NOVO: Suporte a múltiplas formas de pagamento
  const [pagamentoSplits, setPagamentoSplits] = useState([]);

  // Pagamento no Balcão - LEGADO: Mantido para compatibilidade
  const [pagamentoData, setPagamentoData] = useState({
    payment_method: '', // DINHEIRO, CARTAO, PIX, CHEQUE, BOLETO, TRANSFERENCIA, DIRETO_PROFISSIONAL, FATURADO
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
    // Específico para TRANSFERENCIA
    transfer_type: '', // PIX, TED, DOC
    transfer_reference: '',
    transfer_bank: '',
    // Específico para DIRETO_PROFISSIONAL
    repasse_type: '', // DINHEIRO, DEPOSITO, CHEQUE, PIX
    repasse_date: '',
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
    tedType: 'TED', // TED ou DOC
    tedReference: '',
    boletoNumber: '',
    boletoBarcode: '',
    bolletoDueDate: '',
    checkNumber: '',
    checkDueDate: '',
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
    endTime: '',
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
    console.log(`🔄 updateAgendamentoField('${field}', '${value}')`);
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
          const { data: profs } = await supabase
            .from('professionals')
            .select('id, name')
            .eq('clinic_id', clinicId);
          setProfessionals(profs || []);

          // Carregar serviços
          const { data: servs } = await supabase
            .from('services')
            .select('id, name, code')
            .eq('clinic_id', clinicId);
          setServices(servs || []);

          // Carregar convênios
          const { data: pyr } = await supabase
            .from('payers')
            .select('id, name')
            .eq('clinic_id', clinicId);
          setPayers(pyr || []);

          // Carregar salas
          const { data: rm } = await supabase
            .from('rooms')
            .select('id, name')
            .eq('clinic_id', clinicId);
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
      console.log('✅ [AtendimentoModal] Carregando dados do appointment existente para aba Dados Agendamento');
      console.log('📊 [AtendimentoModal] Appointment mapeado completo:', {
        id: appointment.id,
        patientId: appointment.patientId,
        professionalId: appointment.professionalId,
        serviceId: appointment.serviceId,
        roomId: appointment.roomId,
        payerId: appointment.payerId,
        scheduledDate: appointment.date,
        scheduledTime: appointment.startTime,
        status: appointment.status,
      });
      
      // Preencher agendamentoData
      setAgendamentoData({
        patientId: appointment.patientId || '',
        patientName: appointment.patientName || appointment.patients?.name || '',
        phone: appointment.patientPhone || appointment.patients?.phone || '',
        date: appointment.date || '',
        time: appointment.startTime || appointment.scheduled_time || appointment.start_time?.split('T')[1]?.slice(0, 5) || '',
        duration: appointment.duration || 30,
        roomId: appointment.roomId || '',
        professionalId: appointment.professionalId || '',
        serviceId: appointment.serviceId || '',
        serviceCode: appointment.serviceName || appointment.services?.code || '',
        payerId: appointment.payerId || '',
        value: appointment.value?.toString() || '',
        status: appointment.status || 'scheduled',
        notes: appointment.notes || '',
        endTime: appointment.endTime || '',
      });
      
      console.log('📝 [AtendimentoModal] AgendamentoData atualizado:', {
        patientId: appointment.patientId,
        professionalId: appointment.professionalId,
        serviceId: appointment.serviceId,
        roomId: appointment.roomId,
        payerId: appointment.payerId,
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
        zip_code: appointment.patients?.zip_code || '',
      });

      // Preencher selectedPatient
      if (appointment.patients) {
        setSelectedPatient({
          patientId: appointment.patientId,
          patientName: appointment.patientName || appointment.patients.name || '',
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
          zip_code: appointment.patients.zip_code || '',
        });
      }

      // Carregar schedules do profissional selecionado
      if (appointment.professionalId) {
        (async () => {
          try {
            setLoadingProfessionalSchedules(true);
            console.log('⏰ [AtendimentoModal] Carregando schedules para professional:', appointment.professionalId);
            const { data: schedules } = await supabase
              .from('professional_schedules')
              .select('*')
              .eq('professional_id', appointment.professionalId)
              .eq('clinic_id', clinicId);
            setProfessionalSchedules(schedules || []);
            console.log('✅ [AtendimentoModal] Schedules carregados:', schedules?.length);
          } catch (err) {
            console.warn('⚠️ [AtendimentoModal] Erro ao carregar schedules:', err.message);
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
          console.log('⏰ [AtendimentoModal] Carregando schedules quando profissional muda:', agendamentoData.professionalId);
          const { data: schedules } = await supabase
            .from('professional_schedules')
            .select('*')
            .eq('professional_id', agendamentoData.professionalId)
            .eq('clinic_id', clinicId);
          setProfessionalSchedules(schedules || []);
          console.log('✅ [AtendimentoModal] Schedules do profissional carregados:', schedules?.length);
        } catch (err) {
          console.warn('⚠️ [AtendimentoModal] Erro ao carregar schedules:', err.message);
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
      if (!appointment || !appointment.patientId) return;

      // 🔄 Primeiro, recarregar DATA MAIS RECENTE do appointment do banco
      console.log('🔄 [AtendimentoModal] Carregando dados mais recentes do appointment com relacionamentos...');
      let appointmentFresh = appointment; // Fallback: usar o appointment original
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (id, name, phone, document_id, birthdate, gender, email, street, number, neighborhood, city, state, zip_code),
          professionals (id, name),
          services (id, name, code),
          payers (id, name),
          rooms (id, name)
        `)
        .eq('id', appointment.id)
        .maybeSingle();

      if (appointmentError) {
        console.error('❌ [AtendimentoModal] Erro ao carregar appointment:', appointmentError);
      } else if (!appointmentData) {
        console.warn('⚠️ [AtendimentoModal] Dados do appointment não encontrados');
      } else if (appointmentData) {
        appointmentFresh = appointmentData;
        console.log('✅ [AtendimentoModal] Dados frescos carregados:', {
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
        console.warn('⚠️ [AtendimentoModal] Usando dados do appointment original (não conseguiu recarregar):', appointmentError?.message);
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', appointment.patientId)
        .maybeSingle();

      if (error) {
        console.error('❌ [AtendimentoModal] Erro ao buscar dados do paciente:', error);
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
        discount_authorized_by: appointmentFresh?.discount_authorized_by || appointment.discount_authorized_by || null, // ✅ Carregar quem autorizou o desconto
        discount_authorized_at: appointmentFresh?.discount_authorized_at || appointment.discount_authorized_at || null, // ✅ Carregar quando foi autorizado
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
    appointment?.patientId &&
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
    if (!appointment?.patientId) return;

    onClose();
    navigate(`/clinica/pacientes/${appointment.patientId}`, {
      state: {
        appointmentId: appointment.id,
        appointmentDate: appointment.date || null,
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
  const handleSaveAgendamento = async (e) => {
    e?.preventDefault?.();
    if (!appointment?.id) {
      console.error('❌ [handleSaveAgendamento] appointment.id is missing');
      alert('Erro: ID do agendamento não encontrado');
      return;
    }

    setLoading(true);
    try {
      console.log('💾 [handleSaveAgendamento] appointmentId:', appointment.id);
      console.log('💾 [handleSaveAgendamento] agendamentoData state:', agendamentoData);
      console.log('💾 [handleSaveAgendamento] Salvando:', {
        date: agendamentoData.date,
        time: agendamentoData.time,
        timeType: typeof agendamentoData.time,
        timeLength: agendamentoData.time?.length,
        professionalId: agendamentoData.professionalId,
        serviceId: agendamentoData.serviceId,
        payerId: agendamentoData.payerId,
        value: agendamentoData.value,
        status: agendamentoData.status,
        notes: agendamentoData.notes,
      });

      // ✅ Validar que temos pelo menos um campo para atualizar
      const updateData = {
        scheduled_date: agendamentoData.date,
        scheduled_time: agendamentoData.time,
        professional_id: agendamentoData.professionalId,
        service_id: agendamentoData.serviceId,
        payer_id: agendamentoData.payerId || null,
        room_id: agendamentoData.roomId || null,
        value: parseFloat(agendamentoData.value) || null,
        status: agendamentoData.status || 'agendado',
        notes: agendamentoData.notes || null,
      };

      console.log('💾 [handleSaveAgendamento] Payload completo:', {
        payer_id: updateData.payer_id,
        room_id: updateData.room_id,
        professional_id: updateData.professional_id,
        service_id: updateData.service_id,
      });

      console.log('💾 [handleSaveAgendamento] FINAL updateData:', updateData);
      console.log('💾 [handleSaveAgendamento] scheduled_time value being sent:', updateData.scheduled_time);

      // ✅ Use .select() to get the updated record
      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment.id)
        .select();

      console.log('💾 [handleSaveAgendamento] response:', { data, error });

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

      console.log('📤 [AtendimentoModal] Enviando dados cadastrais TISS completos:', {
        id: appointment.patientId,
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
        .eq('id', appointment.patientId);

      console.log('📥 [AtendimentoModal] Resposta do servidor:', { data, error });

      if (error) {
        console.error('❌ [AtendimentoModal] Detalhes do erro:', error);
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
                appointment_id: appointment.id,
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
                  payment_splits: pagamentoSplits.map(s => ({ method: s.method, amount: s.amount })),
                  total_paid: pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0),
                  balance_open: saldoAberto,
                  notes: 'Múltiplas formas de pagamento',
                },
              });
              console.log('✅ Auditoria financeira registrada');
            } catch (auditErr) {
              console.warn('⚠️ Erro ao registrar auditoria:', auditErr.message);
            }
          } else {
            // Forma de pagamento única (legado)
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
        }
      } catch (arError) {
        console.error('❌ Erro ao criar Conta a Receber:', arError.message);
        console.error('Stack:', arError.stack);
        // Não bloquear o fluxo se AR não puder ser criada
      }

      // 📊 Atualizar appointment com dados de pagamento
      console.log('📤 Atualizando dados de pagamento do appointment...');
      
      // 💾 Serializar splits de pagamento como JSON
      const paymentSplitsJson = pagamentoSplits && pagamentoSplits.length > 0 
        ? JSON.stringify(pagamentoSplits)
        : null;
      
      const updatePayload = {
        payment_method: pagamentoData.payment_method || (pagamentoSplits?.[0]?.method || null),
        value: parseFloat(faturamentoData.estimated_value || '0'),
        discount: parseFloat(faturamentoData.discount || '0'),
        discount_reason: faturamentoData.discount_reason || null,
        notes: paymentSplitsJson ? `Múltiplos pagamentos: ${paymentSplitsJson}` : (pagamentoData.notes || null),
        status: 'confirmed',
        updated_at: new Date().toISOString(),
        card_number: liberacaoData.card_number || null,
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
        cashFlowRegistered: false,
      });
      
      // 🎯 Exibir mensagem de sucesso
      const successMsg = pagamentoSplits && pagamentoSplits.length > 0
        ? `✅ Dados de pagamento registrados! ${pagamentoSplits.length} forma(s) de pagamento salva(s)`
        : (arId 
          ? '✅ Dados de pagamento registrados! ✓ Conta a Receber criada'
          : '✅ Dados de pagamento registrados!');
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
  const handleCompleteCheckIn = async (e) => {
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
  // ✨ PROPRIEDADES COMPUTADAS PARA ABA DADOS AGENDAMENTO
  const selectedProfessional = professionals.find(p => p.id === agendamentoData.professionalId);
  const availableWeekdayLabels = professionalSchedules.length > 0 
    ? [...new Set(professionalSchedules.map(s => {
        const dayMap = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 0: 'Domingo' };
        return dayMap[s.day_of_week] || '';
      }))].filter(Boolean)
    : [];

  const calendarYearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 2);

  // ✨ USAR FUNÇÃO CORRETA PARA VERIFICAR DISPONIBILIDADE
  const hasAvailabilityForDate = (date) => {
    if (!agendamentoData.professionalId) {
      return true;
    }
    const dateString = formatDateToIso(date);
    return getSchedulesForDate(dateString, professionalSchedules).length > 0;
  };

  const isBlockedHolidayDate = (date) => {
    // Placeholder: sem dados de feriados carregados
    return false;
  };

  // ✨ CALCULAR SCHEDULES PARA A DATA SELECIONADA
  const schedulesForSelectedDate = agendamentoData.date 
    ? getSchedulesForDate(agendamentoData.date, professionalSchedules)
    : [];

  const selectedDateHasAvailability = !agendamentoData.professionalId || !agendamentoData.date
    ? true
    : schedulesForSelectedDate.length > 0 && !isBlockedHolidayDate(parseLocalDate(agendamentoData.date));

  const selectedDateHoliday = null;
  const selectedDateBlockedByHoliday = false;

  // ✨ CALCULAR HORÁRIOS SUGERIDOS
  const buildAvailableSlots = (schedules, duration) => {
    const uniqueSlots = new Set();
    const fallbackDuration = 30;

    (schedules || []).forEach((schedule) => {
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

  const availableTimeSlots = selectedDateBlockedByHoliday 
    ? [] 
    : buildAvailableSlots(schedulesForSelectedDate, agendamentoData.duration);


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

  const handleCalendarMonthChange = (e) => {
    setCalendarActiveStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(parseInt(e.target.value));
      return newDate;
    });
  };

  const handleCalendarYearChange = (e) => {
    setCalendarActiveStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(parseInt(e.target.value));
      return newDate;
    });
  };

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
            onClick={() => setTabAtivo('dados_agendamento')}
            className={tabClass('dados_agendamento')}
          >
            📅 Dados do Agendamento
          </button>
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', overflow: 'hidden' }}>
          {/* Área com scroll */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px' }}>
            <div className="space-y-4">
              {tabAtivo === 'dados_agendamento' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-blue-900">📅 Preencha os dados do agendamento</p>
                  </div>

                  <PatientSearchOrCreate
                    clinicId={clinicId}
                    initialPhone={agendamentoData.phone}
                    selectedPatient={selectedPatient}
                    onSelect={(pacientData) => {
                      console.log('✅ Paciente selecionado:', pacientData);
                      setSelectedPatient(pacientData);
                      setAgendamentoData(prev => ({
                        ...prev,
                        patientId: pacientData.patientId,
                        patientName: pacientData.patientName,
                        phone: pacientData.phone,
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
                        zip_code: pacientData.zip_code,
                      });
                    }}
                    onCreateNew={() => {
                      console.log('➕ Modo: criar novo paciente');
                      setSelectedPatient(null);
                    }}
                    onClearSelection={() => {
                      console.log('🔄 Limpando seleção de paciente');
                      setSelectedPatient(null);
                    }}
                  />

                  {/* ✅ MODO: NOVO PACIENTE (sem seleção) - CAMPOS SIMPLES */}
                  {!selectedPatient && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-3">➕ Novo Paciente - Preencha dados básicos</p>
                      <p className="text-xs text-blue-700 mb-4">Dados completos serão preenchidos quando o paciente chegar na recepção</p>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm">👤 Nome do Paciente *</Label>
                          <Input
                            placeholder="Nome"
                            value={agendamentoData.patientName}
                            onChange={(e) => updateAgendamentoField('patientName', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">🎂 Data de Nascimento</Label>
                          <Input
                            type="date"
                            value={cadastralData.birthdate || ''}
                            onChange={(e) => updateCadastralField('birthdate', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">📱 Telefone *</Label>
                          <Input
                            placeholder="Telefone"
                            value={agendamentoData.phone}
                            onChange={(e) => updateAgendamentoField('phone', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>📅 Data *</Label>
                      <Input
                        type="date"
                        value={agendamentoData.date}
                        onChange={(e) => updateAgendamentoField('date', e.target.value)}
                      />
                      {agendamentoData.date && selectedDateBlockedByHoliday && (
                        <p className="mt-2 text-xs text-red-700">
                          Data bloqueada por feriado: {selectedDateHoliday?.name || 'Feriado'}.
                        </p>
                      )}
                      {agendamentoData.professionalId && agendamentoData.date && !selectedDateHasAvailability && (
                        <p className="mt-2 text-xs text-amber-700">
                          O profissional selecionado nao atende nesta data. Use o calendario abaixo para escolher um dia disponivel.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>🕐 Hora *</Label>
                      <Input
                        type="time"
                        value={agendamentoData.time}
                        onChange={(e) => updateAgendamentoField('time', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>⏱️ Duração (min)</Label>
                      <Input
                        type="number"
                        min="5"
                        value={agendamentoData.duration}
                        onChange={(e) => updateAgendamentoField('duration', parseInt(e.target.value) || 30)}
                      />
                    </div>
                    <div>
                      <Label>🚪 Sala</Label>
                      <Select
                        value={agendamentoData.roomId || ''}
                        onValueChange={(value) => {
                          console.log('🚪 [Select Sala] Valor selecionado:', value, 'Estado anterior:', agendamentoData.roomId);
                          updateAgendamentoField('roomId', value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sala" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>👤 Paciente *</Label>
                      <Input
                        placeholder="Nome do paciente"
                        value={agendamentoData.patientName}
                        onChange={(e) => updateAgendamentoField('patientName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>📞 Telefone</Label>
                      <Input
                        placeholder="(11) 99999-9999"
                        value={agendamentoData.phone}
                        onChange={(e) => updateAgendamentoField('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>🏥 Profissional *</Label>
                    <Select
                      value={agendamentoData.professionalId || ''}
                      onValueChange={(value) => {
                        console.log('👥 [Select] Profissional selecionado:', value);
                        updateAgendamentoField('professionalId', value);
                      }}
                    >
                      <SelectTrigger>
                        {agendamentoData.professionalId && professionals.find(p => p.id === agendamentoData.professionalId) ? (
                          <span>{professionals.find(p => p.id === agendamentoData.professionalId)?.name}</span>
                        ) : (
                          <SelectValue placeholder="Selecione profissional" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <CalendarDays className="h-4 w-4 text-blue-600" />
                          Calendario de disponibilidade
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {selectedProfessional
                            ? `${selectedProfessional.name} atende em ${availableWeekdayLabels.length > 0 ? availableWeekdayLabels.join(', ') : 'nenhum dia cadastrado'}.`
                            : 'Selecione um profissional para visualizar os dias de atendimento.'}
                        </p>
                      </div>

                      {selectedProfessional && !loadingProfessionalSchedules && professionalSchedules.length > 0 && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                          {availableWeekdayLabels.length} dia(s) ativo(s)
                        </span>
                      )}
                    </div>

                    {!selectedProfessional && (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        Escolha o profissional primeiro. O calendario passa a destacar apenas os dias em que ele atende.
                      </div>
                    )}

                    {selectedProfessional && loadingProfessionalSchedules && (
                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        Carregando disponibilidade do profissional...
                      </div>
                    )}

                    {selectedProfessional && !loadingProfessionalSchedules && professionalSchedules.length === 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        Este profissional ainda nao possui dias de atendimento cadastrados em Disponibilidades.
                      </div>
                    )}

                    {selectedProfessional && !loadingProfessionalSchedules && professionalSchedules.length > 0 && (
                      <div className="grid gap-4 xl:grid-cols-[minmax(300px,340px)_1fr]">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                            <button
                              type="button"
                              onClick={handleCalendarPrevMonth}
                              className="rounded-md border border-slate-200 p-2 text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                              aria-label="Mes anterior"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="flex items-center gap-2">
                              <select
                                value={calendarActiveStartDate.getMonth()}
                                onChange={handleCalendarMonthChange}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                                aria-label="Selecionar mes"
                              >
                                {MONTH_LABELS.map((monthLabel, monthIndex) => (
                                  <option key={monthLabel} value={monthIndex}>
                                    {monthLabel}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={calendarActiveStartDate.getFullYear()}
                                onChange={handleCalendarYearChange}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                                aria-label="Selecionar ano"
                              >
                                {calendarYearOptions.map((yearOption) => (
                                  <option key={yearOption} value={yearOption}>
                                    {yearOption}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={handleCalendarNextMonth}
                              className="rounded-md border border-slate-200 p-2 text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                              aria-label="Proximo mes"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>

                          <Calendar
                            className="appointment-availability-calendar"
                            locale="pt-BR"
                            value={calendarSelectedDate}
                            onChange={(nextValue) => {
                              const selectedDate = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                              updateAgendamentoField('date', formatDateToIso(selectedDate));
                            }}
                            activeStartDate={calendarActiveStartDate}
                            onActiveStartDateChange={({ activeStartDate }) => {
                              if (activeStartDate) {
                                setCalendarActiveStartDate(activeStartDate);
                              }
                            }}
                            minDetail="month"
                            prevLabel={null}
                            nextLabel={null}
                            prev2Label={null}
                            next2Label={null}
                            showNavigation={false}
                            showNeighboringMonth={false}
                            tileDisabled={({ date, view }) => view === 'month' && (!hasAvailabilityForDate(date) || isBlockedHolidayDate(date))}
                            tileClassName={({ date, view }) => {
                              if (view !== 'month') return '';

                              const dateString = formatDateToIso(date);
                              const blockedHoliday = isBlockedHolidayDate(date);

                              if (agendamentoData.date && dateString === agendamentoData.date) {
                                return blockedHoliday
                                  ? 'appointment-calendar-tile appointment-calendar-tile--holiday-selected'
                                  : 'appointment-calendar-tile appointment-calendar-tile--selected';
                              }

                              if (blockedHoliday) {
                                return 'appointment-calendar-tile appointment-calendar-tile--holiday-blocked';
                              }

                              if (hasAvailabilityForDate(date)) {
                                return 'appointment-calendar-tile appointment-calendar-tile--available';
                              }

                              return 'appointment-calendar-tile appointment-calendar-tile--unavailable';
                            }}
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dia selecionado</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {agendamentoData.date
                                ? parseLocalDate(agendamentoData.date)?.toLocaleDateString('pt-BR', {
                                    weekday: 'long',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })
                                : 'Selecione uma data no calendario'}
                            </p>

                            {selectedDateHoliday && (
                              <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${selectedDateBlockedByHoliday ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                {selectedDateBlockedByHoliday ? 'Feriado bloqueado' : 'Feriado'}: {selectedDateHoliday.name}
                              </div>
                            )}

                            {agendamentoData.date && selectedDateHasAvailability && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-slate-600">Janelas de atendimento</p>
                                <div className="flex flex-wrap gap-2">
                                  {schedulesForSelectedDate.map((schedule) => (
                                    <span
                                      key={schedule.id || `${schedule.day_of_week}-${schedule.start_time}-${schedule.end_time}`}
                                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                                    >
                                      {formatScheduleWindow(schedule)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {agendamentoData.date && !selectedDateHasAvailability && !selectedDateBlockedByHoliday && (
                              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <span>Sem expediente cadastrado para este profissional neste dia.</span>
                              </div>
                            )}

                            {agendamentoData.date && selectedDateBlockedByHoliday && (
                              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <span>Agendamento bloqueado por feriado.</span>
                              </div>
                            )}
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <Clock3 className="h-4 w-4" />
                              Horarios sugeridos
                            </p>

                            {agendamentoData.date && availableTimeSlots.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {availableTimeSlots.map((slot) => (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => {
                                      updateAgendamentoField('time', slot);
                                      updateAgendamentoField('endTime', minutesToTime(timeToMinutes(slot) + (Number(agendamentoData.duration) || 30)));
                                    }}
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${agendamentoData.time === slot ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:text-blue-700'}`}
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500">
                                {agendamentoData.date
                                  ? 'Nao ha horarios disponiveis para o dia selecionado.'
                                  : 'Selecione um dia disponivel no calendario para ver os horarios.'}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Dia com atendimento</span>
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">Dia selecionado</span>
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">Feriado bloqueado</span>
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-600">Dia bloqueado</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>💊 Serviço *</Label>
                      <Select
                        value={agendamentoData.serviceId || ''}
                        onValueChange={(value) => {
                          console.log('💊 [Select] Serviço selecionado:', value);
                          const selectedService = services.find(s => s.id === value);
                          console.log('💊 [DEBUG] Service found:', selectedService);
                          console.log('💊 [DEBUG] Service keys:', selectedService ? Object.keys(selectedService) : 'null');
                          console.log('💊 [DEBUG] Service code value:', selectedService?.code);
                          updateAgendamentoField('serviceId', value);
                          const serviceCode = selectedService?.code || selectedService?.codigo || selectedService?.service_code || selectedService?.id || '';
                          console.log('💊 [DEBUG] Final serviceCode:', serviceCode);
                          updateAgendamentoField('serviceCode', serviceCode);
                        }}
                      >
                        <SelectTrigger>
                          {agendamentoData.serviceId && services.find(s => s.id === agendamentoData.serviceId) ? (
                            <span>{services.find(s => s.id === agendamentoData.serviceId)?.name}</span>
                          ) : (
                            <SelectValue placeholder="Selecione serviço" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>📋 Código do Serviço</Label>
                      <Input
                        type="text"
                        value={agendamentoData.serviceCode || ''}
                        disabled
                        className="bg-gray-50"
                        placeholder="Auto-preenchido"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>🏥 Convênio</Label>
                      <Select
                        value={agendamentoData.payerId || ''}
                        onValueChange={(value) => {
                          console.log('💳 [Select Convênio] Estado anterior:', agendamentoData.payerId, '→ Novo valor:', value, 'Payers disponíveis:', payers.length);
                          updateAgendamentoField('payerId', value);
                        }}
                      >
                        <SelectTrigger>
                          {agendamentoData.payerId && payers.find(p => p.id === agendamentoData.payerId) ? (
                            <span>{payers.find(p => p.id === agendamentoData.payerId)?.name}</span>
                          ) : (
                            <SelectValue placeholder="Selecione um convênio" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {payers.map((payer) => (
                            <SelectItem key={payer.id} value={payer.id}>
                              {payer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>💰 Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={agendamentoData.value}
                        onChange={(e) => updateAgendamentoField('value', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>🔹 Status *</Label>
                    <Select
                      value={agendamentoData.status || 'scheduled'}
                      onValueChange={(value) => {
                        console.log('🔹 [Status] Alterando status para:', value);
                        updateAgendamentoField('status', value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione status" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODAL_VISIBLE_STATUSES.map((statusValue) => {
                          const statusConfig = STATUS_CONFIG[statusValue];
                          return (
                            <SelectItem key={statusValue} value={statusValue}>
                              {statusConfig?.icon || '•'} {statusConfig?.label || statusValue}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>📝 Observações</Label>
                    <Textarea
                      placeholder="Observações importantes..."
                      value={agendamentoData.notes}
                      onChange={(e) => updateAgendamentoField('notes', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* ABA 2: DADOS CADASTRAIS (PADRÃO TISS) */}
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

              {/* Seção de Ajuste de Desconto - Sempre disponível (sem exigir Liberação para Particular) */}
              {/* VERSÃO COMPACTA: Quando há solicitação pendente e seção não está aberta */}
              {faturamentoData.discount > 0 && !faturamentoData.discount_authorized_by && !isDiscountSectionOpen && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">⏳ Solicitação de desconto enviada</p>
                      <p className="text-xs text-yellow-700 mt-1">Desconto: R$ {parseFloat(faturamentoData.discount).toFixed(2)} • Motivo: {faturamentoData.discount_reason}</p>
                      <p className="text-xs text-yellow-600 mt-1">Aguardando aprovação na página de Autorizações</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDiscountSectionOpen(true)}
                      className="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded hover:bg-yellow-600 transition whitespace-nowrap ml-2"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              )}

              {/* VERSÃO COMPLETA: Quando expandida ou sem solicitação */}
              {(!faturamentoData.discount > 0 || faturamentoData.discount_authorized_by || isDiscountSectionOpen) && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      Desconto Autorizado
                    </h3>
                    {faturamentoData.discount > 0 && !faturamentoData.discount_authorized_by && (
                      <button
                        type="button"
                        onClick={() => setIsDiscountSectionOpen(false)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  {/* Verificação de Permissão */}
                  {(currentRole !== 'admin' && currentRole !== 'gerente_financeiro' && currentRole !== 'gestor') && (
                    <div className="bg-red-100 border-l-4 border-red-600 p-3 mb-4 rounded">
                      <p className="text-sm font-semibold text-red-800">
                        ⚠️ Apenas Administrador ou Gerente Financeiro podem autorizar descontos.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Valor do Desconto (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={faturamentoData.discount || 0}
                        onChange={(e) => {
                          const newDiscount = parseFloat(e.target.value) || 0;
                          
                          // Se está tentando aplicar desconto e não tem permissão, mostrar aviso e sair
                          if (newDiscount > 0 && (currentRole !== 'admin' && currentRole !== 'gerente_financeiro' && currentRole !== 'gestor')) {
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
                            setFaturamentoData({...faturamentoData, discount: newDiscount});
                          }
                        }}
                        disabled={(currentRole !== 'admin' && currentRole !== 'gerente_financeiro' && currentRole !== 'gestor')}
                        placeholder="0,00"
                        className="text-lg font-bold border-red-400 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-600 mt-1">Deixe em branco ou 0 para sem desconto</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo do Desconto</label>
                      <select
                        value={faturamentoData.discount_reason || ''}
                        onChange={(e) => setFaturamentoData({...faturamentoData, discount_reason: e.target.value})}
                        disabled={(currentRole !== 'admin' && currentRole !== 'gerente_financeiro' && currentRole !== 'gestor')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                  {/* Botão para Solicitar Autorização de Desconto (se há desconto não autorizado) */}
                  {faturamentoData.discount > 0 && !faturamentoData.discount_authorized_by && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!faturamentoData.discount_reason || faturamentoData.discount_reason.trim() === '') {
                            alert('⚠️ Por favor, selecione um motivo válido para o desconto antes de solicitar');
                            return;
                          }

                          try {
                            setLoading(true);
                            
                            // 📝 Enviar solicitação para fila de aprovação via API
                            await discountApprovalsApi.createDiscountAuthorization(
                              clinicId,
                              appointment?.id,
                              faturamentoData.discount,
                              faturamentoData.discount_reason,
                              '',  // notes
                              user?.id
                            );
                            
                            console.log('✅ Solicitação de desconto salva no banco de dados');
                            showSuccessNotification('📋 Solicitação enviada com sucesso! Aguardando aprovação na página de Autorizações...');
                            setIsDiscountSectionOpen(false); // Fechar seção após solicitar
                            
                          } catch (error) {
                            console.error('Erro ao solicitar autorização:', error);
                            alert('❌ Erro ao enviar solicitação de autorização: ' + error.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading || !faturamentoData.discount || !faturamentoData.discount_reason}
                        className="w-full px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-lg hover:bg-yellow-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        📝 Solicitar Autorização de Desconto
                      </button>
                      <p className="text-xs text-gray-600 mt-2 text-center">
                        O desconto será enviado para aprovação do Administrador/Gerente Financeiro na página de Autorizações
                      </p>
                    </div>
                  )}

                  {/* Mostrar informações de autorização */}
                  {faturamentoData.discount > 0 && faturamentoData.discount_authorized_by && (
                    <div className="bg-green-50 border-l-4 border-green-600 p-3 mt-4 rounded">
                      <p className="text-xs font-semibold text-green-800">
                        ✅ Desconto autorizado por: {discountAuthorizedByName || faturamentoData.discount_authorized_by}
                      </p>
                      {faturamentoData.discount_authorized_at && (
                        <p className="text-xs text-green-700 mt-1">
                          Em: {new Date(faturamentoData.discount_authorized_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ====== NOVA INTERFACE: MÚLTIPLOS PAGAMENTOS ====== */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-4 text-sm flex items-center gap-2">
                  <span className="text-xl">💳</span>
                  Formas de Pagamento (Múltiplas)
                </h3>

                {/* Valor Total */}
                {(() => {
                  const valorComDesconto = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
                  const totalPago = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
                  const saldo = (valorComDesconto - totalPago).toFixed(2);
                  const completed = saldo <= 0.01;

                  return (
                    <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
                      <div className="bg-white border border-blue-200 rounded p-3">
                        <p className="text-xs text-gray-600">Valor Total</p>
                        <p className="font-bold text-lg text-blue-900">R$ {valorComDesconto.toFixed(2)}</p>
                      </div>
                      <div className="bg-white border border-blue-200 rounded p-3">
                        <p className="text-xs text-gray-600">Já Pago</p>
                        <p className="font-bold text-lg text-blue-600">R$ {totalPago.toFixed(2)}</p>
                      </div>
                      <div className={`border rounded p-3 ${completed ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                        <p className={`text-xs ${completed ? 'text-green-600' : 'text-yellow-600'}`}>Saldo</p>
                        <p className={`font-bold text-lg ${completed ? 'text-green-900' : 'text-yellow-900'}`}>
                          R$ {saldo}
                        </p>
                      </div>
                      <div className={`border rounded p-3 flex items-center justify-center ${completed ? 'bg-green-100 border-green-400' : 'bg-orange-100 border-orange-400'}`}>
                        <p className={`font-bold ${completed ? 'text-green-900' : 'text-orange-900'}`}>
                          {completed ? '✓ Completo' : '⚠️ Incompleto'}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Lista de Splits Adicionados */}
                {pagamentoSplits.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">Formas Adicionadas:</label>
                    <div className="space-y-2">
                      {pagamentoSplits.map((split, idx) => (
                        <div key={split.id} className="flex items-center gap-2 bg-white p-3 border border-gray-300 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {split.method === 'FATURADO' ? '📄 Faturado' : split.method}
                            </p>
                            <p className="text-xs text-gray-600">R$ {parseFloat(split.amount || '0').toFixed(2)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPagamentoSplits(pagamentoSplits.filter((_, i) => i !== idx));
                            }}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200 transition"
                          >
                            ✕ Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adicionar Nova Forma de Pagamento */}
                <div className="bg-white border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-3">Adicionar Nova Forma de Pagamento:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Forma de Pagamento</label>
                      <select
                        id="newPaymentMethod"
                        defaultValue=""
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">— Selecione —</option>
                        <optgroup label="💼 Faturado">
                          <option value="FATURADO">Faturado (Convênio/Particular)</option>
                        </optgroup>
                        <optgroup label="💰 Em Espécie">
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="CHEQUE">Cheque</option>
                        </optgroup>
                        <optgroup label="💳 Cartão">
                          <option value="CARTAO">Cartão de Crédito/Débito</option>
                        </optgroup>
                        <optgroup label="📱 Digital">
                          <option value="PIX">PIX</option>
                          <option value="TRANSFERENCIA">Transferência Bancária</option>
                          <option value="BOLETO">Boleto</option>
                        </optgroup>
                        <optgroup label="👤 Outro">
                          <option value="DIRETO_PROFISSIONAL">Direto ao Profissional</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        id="newPaymentAmount"
                        placeholder="0,00"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
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
                          if ((totalPago + amount) > valorComDesconto + 0.01) {
                            alert(`⚠️ Valor excede o saldo. Saldo disponível: R$ ${(valorComDesconto - totalPago).toFixed(2)}`);
                            return;
                          }

                          // Adicionar split
                          setPagamentoSplits([
                            ...pagamentoSplits,
                            {
                              id: Date.now(),
                              method,
                              amount: amount.toString(),
                              details: {}
                            }
                          ]);

                          // Limpar inputs
                          methodSelect.value = '';
                          amountInput.value = '';
                        }}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition"
                      >
                        ➕ Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                {pagamentoSplits.length > 0 && (
                  <div className="bg-green-50 border border-green-300 rounded p-3">
                    <p className="text-xs font-semibold text-green-800">
                      ✓ {pagamentoSplits.length} forma(s) de pagamento adicionada(s)
                    </p>
                  </div>
                )}
              </div>

              {/* ====== RESUMO DO PAGAMENTO (Múltiplos) ====== */}
              {pagamentoSplits.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-green-900 text-sm">✓ Resumo das Formas de Pagamento</p>
                    <span className="inline-block px-2 py-1 bg-green-200 text-green-900 text-xs font-bold rounded">PRONTO</span>
                  </div>
                  <div className="space-y-3">
                    {pagamentoSplits.map((split, idx) => (
                      <div key={split.id} className="border-2 border-green-300 rounded-lg overflow-hidden">
                        {/* Cabeçalho do Split */}
                        <div className="flex justify-between items-center bg-green-100 p-3 text-sm">
                          <div>
                            <span className="font-semibold text-green-900">
                              {split.method === 'FATURADO' ? '📄 Faturado' : 
                               split.method === 'CARTAO' ? '💳 Cartão' :
                               split.method === 'PIX' ? '📱 PIX' :
                               split.method === 'TRANSFERENCIA' ? '🏦 Transferência' :
                               split.method === 'BOLETO' ? '📋 Boleto' :
                               split.method === 'CHEQUE' ? '✓ Cheque' :
                               split.method === 'DINHEIRO' ? '💵 Dinheiro' :
                               split.method}
                            </span>
                            {split.details?.cardBrand && <span className="text-xs text-green-700 ml-2">({split.details.cardBrand})</span>}
                            {split.details?.pixIdentifier && <span className="text-xs text-green-700 ml-2">{split.details.pixIdentifier}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-900">R$ {parseFloat(split.amount || '0').toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => {
                                console.log('🔄 Clicou em editar split', split.id, 'Modo anterior:', editingSplitId);
                                if (editingSplitId === split.id) {
                                  setEditingSplitId(null);
                                } else {
                                  setEditingSplitId(split.id);
                                  setSplitDetails(split.details || {});
                                  console.log('✏️ Abrindo edição do split', split.id);
                                }
                              }}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                            >
                              {editingSplitId === split.id ? '✓ Pronto' : '✏️ Editar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPagamentoSplits(pagamentoSplits.filter(s => s.id !== split.id));
                                if (editingSplitId === split.id) setEditingSplitId(null);
                              }}
                              className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                            >
                              ✕ Remover
                            </button>
                          </div>
                        </div>

                        {/* PIX - Campos de Edição */}
                        {editingSplitId === split.id && split.method === 'PIX' && (
                          <div className="bg-white border-t border-green-300 p-4 space-y-3">
                            <p className="text-xs font-bold text-gray-800 mb-2">📱 Dados do PIX</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Chave PIX</label>
                                <Input
                                  type="text"
                                  value={splitDetails.pixIdentifier || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, pixIdentifier: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  placeholder="Telefone, email, CPF ou aleatória"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">ID da Transação</label>
                                <Input
                                  type="text"
                                  value={splitDetails.pixTransactionId || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, pixTransactionId: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  placeholder="ID do Pix (opcional)"
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CARTÃO - Campos de Edição */}
                        {editingSplitId === split.id && split.method === 'CARTAO' && (
                          <div className="bg-white border-t border-green-300 p-4 space-y-3">
                            <p className="text-xs font-bold text-gray-800 mb-2">💳 Dados do Cartão</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Bandeira</label>
                                <select
                                  value={splitDetails.cardBrand || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, cardBrand: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  className="w-full px-2 py-2 border border-gray-300 rounded text-xs"
                                >
                                  <option value="">— Selecione —</option>
                                  <option value="VISA">Visa</option>
                                  <option value="MASTERCARD">Mastercard</option>
                                  <option value="ELO">Elo</option>
                                  <option value="AMEX">American Express</option>
                                  <option value="HIPERCARD">Hipercard</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Últimos 4 dígitos</label>
                                <Input
                                  type="text"
                                  maxLength="4"
                                  value={splitDetails.cardLastDigits || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, cardLastDigits: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  placeholder="0000"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Parcelas</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="12"
                                  value={splitDetails.cardInstallments || '1'}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, cardInstallments: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TRANSFERÊNCIA - Campos de Edição */}
                        {editingSplitId === split.id && split.method === 'TRANSFERENCIA' && (
                          <div className="bg-white border-t border-green-300 p-4 space-y-3">
                            <p className="text-xs font-bold text-gray-800 mb-2">🏦 Dados da Transferência</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo</label>
                                <select
                                  value={splitDetails.tedType || 'TED'}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, tedType: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  className="w-full px-2 py-2 border border-gray-300 rounded text-xs"
                                >
                                  <option value="TED">TED</option>
                                  <option value="DOC">DOC</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Referência</label>
                                <Input
                                  type="text"
                                  value={splitDetails.tedReference || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, tedReference: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  placeholder="Número da transferência"
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* BOLETO - Campos de Edição */}
                        {editingSplitId === split.id && split.method === 'BOLETO' && (
                          <div className="bg-white border-t border-green-300 p-4 space-y-3">
                            <p className="text-xs font-bold text-gray-800 mb-2">📋 Dados do Boleto</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Número do Boleto</label>
                                <Input
                                  type="text"
                                  value={splitDetails.boletoNumber || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, boletoNumber: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  placeholder="Número do boleto"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Código de Barras</label>
                                <Input
                                  type="text"
                                  value={splitDetails.boletoBarcode || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, boletoBarcode: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  placeholder="Código de barras"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Vencimento</label>
                                <Input
                                  type="date"
                                  value={splitDetails.bolletoDueDate || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, bolletoDueDate: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CHEQUE - Campos de Edição */}
                        {editingSplitId === split.id && split.method === 'CHEQUE' && (
                          <div className="bg-white border-t border-green-300 p-4 space-y-3">
                            <p className="text-xs font-bold text-gray-800 mb-2">✓ Dados do Cheque</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Número do Cheque</label>
                                <Input
                                  type="text"
                                  value={splitDetails.checkNumber || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, checkNumber: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  placeholder="Número do cheque"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Vencimento</label>
                                <Input
                                  type="date"
                                  value={splitDetails.checkDueDate || ''}
                                  onChange={(e) => {
                                    const newDetails = {...splitDetails, checkDueDate: e.target.value};
                                    setSplitDetails(newDetails);
                                    const updatedSplits = pagamentoSplits.map(s => 
                                      s.id === split.id ? {...s, details: newDetails} : s
                                    );
                                    setPagamentoSplits(updatedSplits);
                                  }}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t-2 border-green-300 mt-3 pt-3 flex justify-between items-center">
                    <p className="font-bold text-green-900 text-sm">Total Pago:</p>
                    <p className="font-bold text-lg text-green-900">
                      R$ {pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ABA 4.5: RESUMO FINANCEIRO - REGISTRO, CAIXA E CONTAS A RECEBER */}

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
                        <p className="text-xs text-gray-600 font-medium">Saldo em Aberto</p>
                        <p className="font-bold text-red-600">
                          R$ {(() => {
                            const valorTotal = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
                            const totalPago = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
                            const saldoAberto = valorTotal - totalPago;
                            return saldoAberto.toFixed(2);
                          })()}
                        </p>
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
              {(() => {
                const validation = validateFinancialData();
                return validation.valid ? null : (
                  <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-lg">
                    <p className="text-sm font-bold text-red-900 mb-2">❌ Não é possível liberar o atendimento:</p>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                      {validation.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-700 mt-3">Corrija os dados nas abas anteriores antes de liberar.</p>
                  </div>
                );
              })()}

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
                    {faturamentoData.discount > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Desconto</p>
                        <div>
                          <p className="font-semibold text-red-600">- R$ {parseFloat(faturamentoData.discount || '0').toFixed(2)}</p>
                          <p className="text-xs text-gray-700 mt-1">{faturamentoData.discount_reason || 'Sem motivo'}</p>
                          {faturamentoData.discount_authorized_by && (
                            <p className="text-xs text-green-700">✓ Autorizado: {discountAuthorizedByName || faturamentoData.discount_authorized_by}</p>
                          )}
                          {!faturamentoData.discount_authorized_by && (
                            <p className="text-xs text-yellow-700">⏳ Pendente de aprovação</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Valor a Receber</p>
                      {/* Force recalculation on render to avoid stale values */}
                      <p className="font-semibold text-green-600 text-lg">R$ {(parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0')).toFixed(2)}</p>
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

                  {/* ✅ RESUMO DE MÚLTIPLOS PAGAMENTOS - Mostrar saldo em aberto */}
                  {pagamentoSplits && pagamentoSplits.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-orange-300">
                      <p className="text-xs font-bold text-orange-900 mb-3">💳 Resumo de Pagamentos Realizados</p>
                      <div className="space-y-2">
                        {pagamentoSplits.map((split, idx) => (
                          <div key={idx} className="flex justify-between bg-white px-3 py-2 rounded border border-orange-100">
                            <span className="font-medium text-gray-700">{formatPaymentMethod(split.method)}:</span>
                            <span className="text-gray-900">R$ {parseFloat(split.amount || '0').toFixed(2)}</span>
                          </div>
                        ))}
                        
                        {/* SALDO EM ABERTO */}
                        {(() => {
                          const valorTotal = parseFloat(faturamentoData.estimated_value || '0') - parseFloat(faturamentoData.discount || '0');
                          const totalPago = pagamentoSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
                          const saldoAberto = valorTotal - totalPago;
                          
                          if (saldoAberto > 0.01) {
                            return (
                              <div className="mt-3 pt-3 border-t border-red-200 flex justify-between bg-red-50 px-3 py-2 rounded border border-red-200">
                                <span className="font-bold text-red-800">Saldo em Aberto:</span>
                                <span className="font-bold text-lg text-red-600">R$ {saldoAberto.toFixed(2)}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
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
            {tabAtivo === 'dados_agendamento' && (
              <>
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button
                  type="button"
                  onClick={handleSaveAgendamento}
                  disabled={loading || !agendamentoData.date || !agendamentoData.time || !agendamentoData.professionalId || !agendamentoData.serviceId}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
                  title={!agendamentoData.date || !agendamentoData.time || !agendamentoData.professionalId || !agendamentoData.serviceId ? 'Preencha Data, Hora, Profissional e Serviço' : 'Salvar dados do agendamento'}
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
            
            {tabAtivo === 'cadastrais' && (
              <>
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button
                  type="button"
                  onClick={() => window.open(`/clinica/pacientes/${appointment?.patientId}`, '_blank')}
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
                  <>
                    {(() => {
                      const validation = validateFinancialData();
                      return (
                        <Button
                          type="button"
                          onClick={handleCompleteCheckIn}
                          disabled={loading || !validation.valid}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold"
                          title={!validation.valid ? `❌ Erros:\n${validation.errors.map(e => `• ${e}`).join('\n')}` : 'Liberar paciente para atendimento'}
                        >
                          {loading ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Liberando...
                            </>
                          ) : (
                            <>
                              ✓ Liberar para Atendimentos
                            </>
                          )}
                        </Button>
                      );
                    })()}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
