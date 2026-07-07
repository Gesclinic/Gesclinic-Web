import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Calendar from 'react-calendar';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock3, FileText, PlayCircle, PlusCircle, Send } from 'lucide-react';
import {
  createAppointment,
  updateAppointment,
  getAppointmentById,
  mapFromDatabase,
  syncAppointmentServices,
  getAppointmentServices,
  validateAppointmentSaved,
} from '@/lib/appointmentsApi';
import { createPatient, updatePatient } from '@/lib/patientsApi';
import { uploadPatientPhoto } from '@/lib/patientsApi';
import {
  PAYMENT_METHOD_CONFIG,
  defaultPaymentData,
  validatePaymentData,
} from '@/lib/paymentMethodsConfig';
import {
  BOOKING_STATUSES,
  SERVICE_STATUSES,
  STATUS_CONFIG,
  MODAL_VISIBLE_STATUSES,
  validatePatientDataForStatus,
  isStatusTransitionAllowed,
  getFormattedStatus,
} from '@/lib/appointmentStatusConstants';
import PaymentMethodFields from './PaymentMethodFields';
import PaymentSplitFields from './PaymentSplitFields';
import CardProcessorSelectorFields from './CardProcessorSelectorFields';
import PatientSearchOrCreate from './PatientSearchOrCreate';
import ServiceAddRow from './ServiceAddRow';
import AppointmentItemsManager from './AppointmentItemsManager';
import PhotoCapture from '@/components/PhotoCapture';
import { TISSSubmissionDialog } from '@/components/TISSSubmissionDialog';
import InvoiceEmissionModal from './InvoiceEmissionModal';
import { processPaymentComplete } from '@/lib/paymentRegistrationApi';
import { createReceivable } from '@/lib/receivablesApi';
import { getServicePrice } from '@/lib/getServicePrice';
import { checkMultipleDates } from '@/lib/holidaysApi';
import { supabase } from '@/lib/customSupabaseClient';
import { useAppointmentForm } from '@/modules/agenda/hooks/useAppointmentForm';
import {
  listarConveniosPorProfissional,
  listarConveniosPorServicosDoFrofissional,
} from '@/modules/agenda/services/agenda.api.business';
import { listAccountPlans } from '@/lib/financeApi';
import { isBusinessHours, formatTime } from '@/modules/agenda/utils/timezone';
import { validateAppointmentBeforeSave } from '@/modules/agenda/services/appointments.validation';
import {
  toLocalTime,
  fromLocalTime,
  fromLocalTimeToDateAndTime,
  formatLocalDate,
  formatLocalTime,
  isValidLocalDate,
  isValidLocalTime,
  isValidLocalDateTime,
  calculateDurationMinutes,
  addMinutesToTime,
} from '@/utils/timezoneHelpers';
import 'react-calendar/dist/Calendar.css';

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const FIXED_NATIONAL_HOLIDAYS = {
  '01-01': { name: 'Confraternizacao Universal', is_blocked: true, is_mandatory: true },
  '04-21': { name: 'Tiradentes', is_blocked: true, is_mandatory: true },
  '05-01': { name: 'Dia do Trabalho', is_blocked: true, is_mandatory: true },
  '09-07': { name: 'Independencia do Brasil', is_blocked: true, is_mandatory: true },
  '10-12': { name: 'Nossa Senhora Aparecida', is_blocked: true, is_mandatory: true },
  '11-02': { name: 'Finados', is_blocked: true, is_mandatory: true },
  '11-15': { name: 'Proclamacao da Republica', is_blocked: true, is_mandatory: true },
  '11-20': { name: 'Consciencia Negra', is_blocked: true, is_mandatory: true },
  '12-25': { name: 'Natal', is_blocked: true, is_mandatory: true },
};

// ?? Formata��o de moeda brasileira
const formatCurrency = (value) => {
  const numValue = parseFloat(value || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

const calculateAppointmentServicesTotal = (servicesToCalculate = []) =>
  servicesToCalculate.reduce((sum, item) => {
    const value = parseFloat(item.value ?? item.unit_price ?? item.final_value ?? item.price ?? 0);
    const quantity = parseFloat(item.quantity || 1);
    const discount = parseFloat(item.discount || 0);
    return sum + Math.max(0, value * quantity - discount);
  }, 0);

// ? DEPRECATED: Use helpers from @/utils/timezoneHelpers instead
// - parseLocalDate ? use toLocalTime()
// - formatDateToIso ? use formatLocalDate()
// - normalizeTimeValue ? use formatLocalTime()
// - timeToMinutes ? use calculateDurationMinutes()
// - minutesToTime ? use addMinutesToTime()

// ? Compat functions for internal use (time slot calculations)
function timeToMinutes(timeValue) {
  if (!timeValue) return 0;
  const [hours, minutes] = String(timeValue).split(':').slice(0, 2).map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeTimeValue(timeValue) {
  if (!timeValue) return '';
  return String(timeValue).split(':').slice(0, 2).join(':');
}

// ? Date handling with timezone support
function parseLocalDate(dateString) {
  if (!dateString) return null;

  let year, month, day;

  // Suportar ISO format: YYYY-MM-DD
  if (dateString.includes('-')) {
    const parts = dateString.split('T')[0].split('-').map(Number);
    [year, month, day] = parts;
  }
  // Suportar DD/MM/YYYY format (brasileiro)
  else if (dateString.includes('/')) {
    const parts = dateString.split('/').map(Number);
    if (parts.length === 3) {
      [day, month, year] = parts;
    }
  }

  if (!year || !month || !day) {
    console.warn('?? [parseLocalDate] N�o consegui fazer parse de:', dateString);
    return null;
  }

  const date = new Date(year, month - 1, day);
  console.log('? [parseLocalDate] Parseado com sucesso:', {
    input: dateString,
    parsed: date.toLocaleDateString('pt-BR'),
    weekday: date.getDay()
  });

  return date;
}

function formatDateToIso(dateValue) {
  if (!dateValue) return '';
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateInsideScheduleRange(dateString, schedule) {
  if (!dateString) {
    return true; // Se n�o h� data, considerar como v�lido por enquanto
  }

  // NOTA: start_date e end_date foram adicionados em uma migration
  // mas ainda n�o foram aplicadas ao banco de dados em produ��o.
  // Enquanto isso, apenas retornar true para permitir que schedules sejam carregados.
  // TODO: Aplicar migration 2026-02-14_add_date_range_to_professional_schedules.sql

  // C�digo futuro (quando migration for aplicada):
  // const startsOk = !schedule?.start_date || dateString >= schedule.start_date;
  // const endsOk = !schedule?.end_date || dateString <= schedule.end_date;
  // return startsOk && endsOk;

  return true;
}

function getSchedulesForDate(dateString, schedules) {
  const parsedDate = parseLocalDate(dateString);
  if (!parsedDate) {
    return [];
  }

  const weekday = parsedDate.getDay();

  // ?? DEBUG: Log de agendamentos dispon�veis
  if (schedules && schedules.length > 0) {
    console.log('?? [getSchedulesForDate] Procurando agendamentos para:', {
      dateString,
      parsedDate: parsedDate.toLocaleDateString('pt-BR'),
      weekday,
      totalSchedules: schedules.length,
      scheduleWeekdays: schedules.map(s => ({ id: s.id, day_of_week: s.day_of_week, active: s.active }))
    });
  }

  const filtered = (schedules || [])
    .filter(
      (schedule) =>
        schedule &&
        schedule.active !== false &&
        Number(schedule.day_of_week) === weekday &&
        isDateInsideScheduleRange(dateString, schedule),
    )
    .sort((left, right) => timeToMinutes(left.start_time) - timeToMinutes(right.start_time));

  console.log('?? [getSchedulesForDate] Resultado:', filtered.length, 'agendamentos');

  return filtered;
}

function buildAvailableSlots(schedules, fallbackDuration = 30) {
  const uniqueSlots = new Set();

  (schedules || []).forEach((schedule) => {
    const startMinutes = timeToMinutes(schedule.start_time);
    const endMinutes = timeToMinutes(schedule.end_time);
    const breakStart = schedule.break_start ? timeToMinutes(schedule.break_start) : null;
    const breakEnd = schedule.break_end ? timeToMinutes(schedule.break_end) : null;
    const slotDuration = Number(schedule.duration_minutes) || Number(fallbackDuration) || 30;

    for (
      let currentMinutes = startMinutes;
      currentMinutes + slotDuration <= endMinutes;
      currentMinutes += slotDuration
    ) {
      const slotEnd = currentMinutes + slotDuration;
      const overlapsBreak =
        breakStart !== null &&
        breakEnd !== null &&
        currentMinutes < breakEnd &&
        slotEnd > breakStart;

      if (!overlapsBreak) {
        uniqueSlots.add(minutesToTime(currentMinutes));
      }
    }
  });

  return Array.from(uniqueSlots).sort((left, right) => timeToMinutes(left) - timeToMinutes(right));
}

function formatScheduleWindow(schedule) {
  const start = normalizeTimeValue(schedule?.start_time);
  const end = normalizeTimeValue(schedule?.end_time);
  const breakStart = normalizeTimeValue(schedule?.break_start);
  const breakEnd = normalizeTimeValue(schedule?.break_end);

  if (breakStart && breakEnd) {
    return `${start} - ${end} | pausa ${breakStart} - ${breakEnd}`;
  }

  return `${start} - ${end}`;
}

function getMonthDateStrings(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const dates = [];

  for (let day = 1; day <= totalDays; day += 1) {
    dates.push(formatDateToIso(new Date(year, month, day)));
  }

  return dates;
}

function getFixedNationalHoliday(dateValue) {
  if (!dateValue) {
    return null;
  }

  const dateString = typeof dateValue === 'string' ? dateValue : formatDateToIso(dateValue);
  const [, month, day] = dateString.split('-');
  const holidayKey = `${month}-${day}`;
  const holidayInfo = FIXED_NATIONAL_HOLIDAYS[holidayKey];

  if (!holidayInfo) {
    return null;
  }

  return {
    ...holidayInfo,
    scope: 'NACIONAL_FALLBACK',
    has_override: false,
  };
}

/**
 * ?? AppointmentUnitedModal - Componente Unificado
 *
 * Modos de opera��o:
 * - 'new': Criar novo agendamento
 * - 'edit': Editar agendamento existente
 * - 'reception': Atender paciente na recep��o
 */
export default function AppointmentUnitedModal({
  isOpen = false,
  onClose = () => {},
  mode = 'new',
  appointment = null,
  appointmentIdToEdit = null,
  arrivals = {},
  onArrivalsUpdate = null,
  onSuccess = null,
  professionals = [],
  services = [],
  payers = [],
  rooms = [],
}) {
  const navigate = useNavigate();
  const { clinicId } = useClinicContext();
  const { user } = useAuth();

  // ?? DEBUG: Log de props ao inicializar ou mudar
  console.log('?? [AppointmentUnitedModal] PROPS RECEBIDAS:', {
    isOpen,
    mode,
    appointmentIdToEdit,
    'appointment?.id': appointment?.id,
    'appointment.type': appointment?.type,
  });

  const [tabAtivo, setTabAtivo] = useState('dados');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null); // ? Paciente selecionado
  const [attendanceCreated, setAttendanceCreated] = useState(false); // ?? Flag: Atendimento foi criado com sucesso
  const [professionalSchedules, setProfessionalSchedules] = useState([]);
  const [loadingProfessionalSchedules, setLoadingProfessionalSchedules] = useState(false);
  const [holidayMap, setHolidayMap] = useState({});
  const [calendarActiveStartDate, setCalendarActiveStartDate] = useState(new Date());
  const [accountPlans, setAccountPlans] = useState([]);
  const [loadedAppointmentFromId, setLoadedAppointmentFromId] = useState(null);
  const [tissDialogOpen, setTissDialogOpen] = useState(false); // ?? TISS Dialog state
  const [selectedGuideForTiss, setSelectedGuideForTiss] = useState(null); // ?? Guide selecionado para envio TISS
  const [filteredPayers, setFilteredPayers] = useState([]); // ?? Conv�nios filtrados por profissional
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false); // ?? Invoice modal state
  const [businessHoursWarning, setBusinessHoursWarning] = useState(false); // ? PHASE 2: Aviso de hor�rio fora do expediente
  const saveChangesPromiseRef = useRef(null);

  // ? Guardar profissional inicial que veio do slot (para proteger contra overrides)
  const initialSlotProfessionalIdRef = useRef(null);

  // ??? Load appointment details from appointmentIdToEdit in edit mode.
  useEffect(() => {
    console.log(
      '?? [AppointmentUnitedModal] useEffect DISPARO 1: appointmentIdToEdit?',
      appointmentIdToEdit,
      '!appointment?',
      !appointment,
      'isOpen?',
      isOpen,
    );

    // ?? Guard: Se � novo agendamento, N�O tentar carregar
    if (!appointmentIdToEdit) {
      console.log('? [AppointmentUnitedModal] NOVO AGENDAMENTO - N�o carregando via appointmentIdToEdit');
      return;
    }

    if (appointmentIdToEdit && isOpen) {
      console.log(
        '?? [AppointmentUnitedModal] Carregando agendamento via appointmentIdToEdit:',
        appointmentIdToEdit,
      );

      let cancelled = false;

      (async () => {
        try {
          const mappedApt = await getAppointmentById(appointmentIdToEdit);

          if (cancelled) {
            return;
          }

          if (!mappedApt) {
            console.warn('?? Agendamento n�o encontrado:', appointmentIdToEdit);
            setLoadedAppointmentFromId(null);
          } else {
            console.log('? Agendamento carregado via appointmentIdToEdit:', mappedApt);
            // ?? DEBUG: Verificar se payer_id e room_id est�o sendo trazidos
            console.log('?? [DEBUG] Dados cr�ticos do banco:', {
              payer_id: mappedApt.payer_id,
              room_id: mappedApt.room_id,
              payers: mappedApt.payers,
              rooms: mappedApt.rooms,
            });
            console.log('?? [DEBUG] Agendamento ap�s mapFromDatabase:', mappedApt);
            console.log('?? [DEBUG] payerId e roomId ap�s mapFromDatabase:', {
              payerId: mappedApt.payerId,
              roomId: mappedApt.roomId,
            });
            setLoadedAppointmentFromId(mappedApt);
          }
        } catch (err) {
          console.error('? Exce��o ao carregar agendamento:', err);
          if (!cancelled) {
            setLoadedAppointmentFromId(null);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    } else {
      setLoadedAppointmentFromId(null);
    }
  }, [appointmentIdToEdit, isOpen]);

  // ?? DEBUG - COMPREHENSIVE LOGGING
  console.log('='.repeat(70));
  console.log('?? [AppointmentUnitedModal] RENDER STATE SNAPSHOT');
  console.log('='.repeat(70));
  console.log('?? MODO E ABERTURA:');
  console.log('   isOpen:', isOpen, '| mode:', mode, '| appointmentIdToEdit:', appointmentIdToEdit);
  console.log('?? DADOS RECEBIDOS:');
  console.log('   appointment prop:', !!appointment, appointment?.id);
  console.log(
    '   loadedAppointmentFromId:',
    !!loadedAppointmentFromId,
    loadedAppointmentFromId?.id,
  );
  console.log('?? DADOS CR�TICOS DO APPOINTMENT:');
  if (appointment || loadedAppointmentFromId) {
    const apt = loadedAppointmentFromId || appointment;
    console.log('   payerId/payer_id:', apt.payerId || apt.payer_id);
    console.log('   roomId/room_id:', apt.roomId || apt.room_id);
    console.log('   professionalId/professional_id:', apt.professionalId || apt.professional_id);
    console.log('   date:', apt.date || apt.scheduled_date);
    console.log('   time:', apt.time || apt.startTime || apt.scheduled_time);
  }
  console.log('='.repeat(70));
  console.log('?? [MODAL RENDER] appointment prop recebido:', {
    hasAppointment: !!appointment,
    appointmentKeys: appointment ? Object.keys(appointment).slice(0, 10) : [],
    professional_id: appointment?.professional_id,
    professionalId: appointment?.professionalId,
    type: appointment?.type,
    date: appointment?.date,
  });

  // ?? Consolidate appointment from both sources (prop or loaded via ID)
  const finalAppointment = useMemo(
    () => loadedAppointmentFromId || appointment,
    [appointment, loadedAppointmentFromId],
  );

  // ?? DEBUG: Modo NEW - permitindo cria��o de novo agendamento
  if (isOpen && mode === 'new') {
    console.log('? [MODE NOVO] Modal aberto em modo NEW - pronto para criar agendamento');
  }

  // ?? AUTO-NAV: Se atendimento foi criado, vai para aba RESUMO
  useEffect(() => {
    if (attendanceCreated && tabAtivo !== 'resumo') {
      console.log('?? [AUTO-NAV] Atendimento criado! Navegando para aba RESUMO...');
      setTabAtivo('resumo');
    }
  }, [attendanceCreated, tabAtivo]);

  // ?? HOOK: Gerenciar estado do formul�rio de agendamento
  const { formData, setFormData, fillFromAppointment, reset: resetFormData } = useAppointmentForm();

  // Dados de Agendamento
  const [agendamentoData, setAgendamentoData] = useState({
    id: null, // ? NOVO: ID do agendamento para AppointmentItemsManager
    date: '',
    time: '',
    endTime: '',
    duration: 30,
    patientName: '',
    patientId: null,
    phone: '',
    recordNumber: '',
    professionalId: '',
    serviceId: '',
    serviceCode: '',
    payerId: '',
    planId: '',
    planCode: '',
    roomId: '',
    value: '0.00',
    notes: '',
    status: 'scheduled',
  });

  // ?? Estado para m�ltiplos servi�os
  const [appointmentServices, setAppointmentServices] = useState([]);
  const appointmentServicesTotal = useMemo(
    () => calculateAppointmentServicesTotal(appointmentServices),
    [appointmentServices],
  );
  const effectiveAppointmentValue =
    appointmentServices.length > 0
      ? appointmentServicesTotal
      : parseFloat(agendamentoData.value || 0);
  const effectiveAppointmentValueString = effectiveAppointmentValue.toString();

  // Dados Cadastrais
  const [cadastralData, setCadastralData] = useState({
    name: '',
    document_id: '',
    birthdate: '',
    gender: '',
    phone: '',
    cell_phone: '',
    email: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
  });

  // ?? Filtrar conv�nios baseado nos SERVI�OS do profissional selecionado
  useEffect(() => {
    console.log(
      '?? [EFFECT] Filtrando payers pelos servi�os. professionalId:',
      agendamentoData.professionalId,
    );

    async function filterPayersForProfessional() {
      if (!agendamentoData.professionalId) {
        console.log('?? [EFFECT] Sem profissional selecionado, usando todos os payers');
        setFilteredPayers(payers || []);
        return;
      }

      try {
        console.log(
          '?? [EFFECT] Carregando conv�nios dos SERVI�OS do profissional:',
          agendamentoData.professionalId,
        );
        // ?? Buscar conv�nios atrav�s dos servi�os do profissional
        const linked = await listarConveniosPorServicosDoFrofissional({
          profissionalId: agendamentoData.professionalId,
          clinicId: clinicId,
        });
        console.log('?? [EFFECT] Conv�nios dos servi�os carregados:', linked);
        setFilteredPayers(linked || []);
      } catch (err) {
        console.error('? [EFFECT] Erro ao filtrar payers:', err);
        setFilteredPayers([]);
      }
    }

    filterPayersForProfessional();
  }, [agendamentoData.professionalId, payers, clinicId]);

  // ? NOVO: Sincronizar ID do agendamento em modo EDIT
  useEffect(() => {
    if (isOpen && mode === 'edit' && finalAppointment && finalAppointment.id && agendamentoData.id !== finalAppointment.id) {
      console.log('? [Sincroniza��o] Atualizando agendamentoData.id para:', finalAppointment.id);
      setAgendamentoData((prev) => ({ ...prev, id: finalAppointment.id }));
    }
  }, [isOpen, mode, finalAppointment?.id]);

  // ?? CORRE��O EDIT MODE: Em modo EDIT, garantir que payer atual � exib�vel no select
  useEffect(() => {
    if (mode === 'edit' && agendamentoData.payerId && payers) {
      console.log('[FIX EDIT MODE] Verificando se payer atual est� no filtro...');
      console.log('   - payerId:', agendamentoData.payerId);
      console.log('   - filteredPayers count:', filteredPayers?.length || 0);

      const currentPayerInList = filteredPayers?.find((p) => p.id === agendamentoData.payerId);

      if (!currentPayerInList) {
        console.log('[FIX EDIT MODE] Payer atual N�O est� no filtro, adicionando...');
        const currentPayer = payers.find((p) => p.id === agendamentoData.payerId);
        if (currentPayer) {
          console.log(
            '[FIX EDIT MODE] ? Adicionando payer ao topo da lista:',
            currentPayer.name,
          );
          setFilteredPayers((prev) => [
            currentPayer,
            ...(prev?.filter((p) => p.id !== currentPayer.id) || []),
          ]);
        } else {
          console.warn('[FIX EDIT MODE] ?? Payer n�o encontrado em payers list:', agendamentoData.payerId);
        }
      } else {
        console.log('[FIX EDIT MODE] ? Payer atual j� est� no filtro');
      }
    }
  }, [mode, agendamentoData.payerId, payers]);

  // Dados de Libera��o
  const [liberacaoData, setLiberacaoData] = useState({
    payer_name: '',
    plan_name: '',
    plan_code: '',
    card_number: '',
    requires_auth: 'no',
    auth_number: '',
    auth_expiry: '',
    auth_status: 'approved',
    authorized: false,
  });

  // Dados de Faturamento
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
    estimated_value: '0.00',
    authorized_value: '0.00',
    discount: '0.00',
    plano_contas_id: '',
    diagnosis_code: '',
    subscriber_number: '',
    dependent_number: '',
    dependent_name: '',
    dependent_birthdate: '',
    dependent_gender: '',
    quantity: 1,
    notes: '',
  });

  // Dados de Pagamento (com estrutura completa)
  const [pagamentoData, setPagamentoData] = useState(defaultPaymentData);

  const requestedDiscountAmount = parseFloat(pagamentoData.discount || 0) || 0;
  const isDiscountApproved = requestedDiscountAmount > 0 && Boolean(pagamentoData.discount_authorized_by);
  const isDiscountPending =
    requestedDiscountAmount > 0 &&
    !pagamentoData.discount_authorized_by &&
    !pagamentoData.discount_rejected_at;
  const effectiveDiscountAmount = isDiscountApproved ? requestedDiscountAmount : 0;

  // ? Estado para habilitar/desabilitar m�ltiplos pagamentos
  const [enableMultiplePayments, setEnableMultiplePayments] = useState(false);

  // Estado para splits de pagamento (multiplas formas)
  const [pagamentoSplits, setPagamentoSplits] = useState([]);

  // Estado para formulario de novo split - com campos espec�ficos por m�todo
  const [splitFormData, setSplitFormData] = useState({
    payment_method: 'DINHEIRO',
    value: '',
    // Cart�o
    card_brand: '',
    card_number: '',
    card_expiry: '',
    card_last4: '',
    card_holder: '',
    installments: '1',
    card_installment_dates: '', // NOVO: datas das parcelas (pipe-separated)
    // PIX
    pix_key: '',
    pix_key_type: 'cpf',
    pix_transaction_id: '',
    // Cheque
    cheque_bank: '',
    cheque_agency: '',
    cheque_account: '',
    cheque_number: '',
    cheque_due_date: '',
    // Transfer�ncia/Dep�sito
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    transfer_type: 'DOC',
    // Boleto
    boleto_number: '',
    // Data de vencimento (gen�rico para todos)
    payment_due_date: '',
    // Observa��es
    observation: '',
  });

  // ?? Estado para processador de cart�o (taxa de processamento)
  const [cardProcessorData, setCardProcessorData] = useState({
    processor_id: '',
    card_brand: 'VISA',
    settlement_type: 'D+1',
    fee_percent: null,
    fee_amount: null,
    net_amount: null,
  });

  // ??? FUN��O HELPER PARA DETECTAR SE � PAYER "PARTICULAR"
  // Verifica se � particular pelo ID ('particular') OU pelo nome do payer ('Particular')
  const checkIsParticular = (payerId) => {
    if (!payerId) {
      return true;
    }
    if (payerId === 'particular') {
      return true;
    }
    const foundPayer = payers.find((p) => p.id === payerId);
    return foundPayer?.name === 'Particular';
  };

  const getPayerName = (payerId) => {
    if (!payerId) return null;
    const inFiltered = filteredPayers?.find((p) => p.id === payerId);
    if (inFiltered) return inFiltered.name;
    const inAll = payers?.find((p) => p.id === payerId);
    return inAll?.name || null;
  };

  const getDatePlusDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const buildInstallmentDates = (firstDueDate, installments) => {
    const count = Math.max(1, Number.parseInt(installments || '1', 10) || 1);
    const baseDate = new Date(firstDueDate || getDatePlusDays(30));
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + (index * 30));
      return date.toISOString().split('T')[0];
    });
  };

  const getPaymentMethodLabel = (method) => ({
    DINHEIRO: 'Dinheiro',
    CARTAO: 'Cartao',
    PIX: 'PIX',
    CHEQUE: 'Cheque',
    BOLETO: 'Boleto',
    DOC: 'DOC',
    TED: 'TED',
    DEPOSITO: 'Deposito',
  }[method] || method || '-');

  const getPaymentSplitDetails = (split) => {
    if (split.payment_method === 'CARTAO') {
      return [
        split.card_brand,
        split.card_last4 ? `final ${split.card_last4}` : null,
        split.installments ? `${split.installments}x` : null,
      ].filter(Boolean).join(' - ');
    }

    if (split.payment_method === 'PIX') {
      return split.pix_key ? `Chave: ${String(split.pix_key).slice(0, 24)}${String(split.pix_key).length > 24 ? '...' : ''}` : '';
    }

    if (split.payment_method === 'CHEQUE') {
      return [split.cheque_bank, split.cheque_number ? `Cheque ${split.cheque_number}` : null].filter(Boolean).join(' - ');
    }

    if (['DOC', 'TED', 'DEPOSITO'].includes(split.payment_method)) {
      return [split.bank_name, split.bank_account ? `Conta ${split.bank_account}` : null].filter(Boolean).join(' - ');
    }

    if (split.payment_method === 'BOLETO') {
      return split.boleto_number ? `Boleto ${String(split.boleto_number).slice(0, 24)}${String(split.boleto_number).length > 24 ? '...' : ''}` : '';
    }

    return '';
  };

  const getPersistedPaymentSplits = (source = finalAppointment || appointment) => {
    const rawSplits = source?.paymentSplits ?? source?.payment_splits;
    if (!rawSplits) {
      return [];
    }

    try {
      const parsed = typeof rawSplits === 'string' ? JSON.parse(rawSplits) : rawSplits;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Erro ao ler payment_splits persistido:', error);
      return [];
    }
  };

  const getPaymentSplitsForSave = () => {
    if (enableMultiplePayments) {
      return pagamentoSplits;
    }

    const persistedSplits = getPersistedPaymentSplits();
    if (mode === 'edit' && pagamentoSplits.length === 0 && persistedSplits.length > 0) {
      return persistedSplits;
    }

    return [];
  };

  const getPaymentSplitsPayload = () => {
    const splitsToSave = getPaymentSplitsForSave();
    return splitsToSave.length > 0 ? JSON.stringify(splitsToSave) : null;
  };

  // FUN��ES PARA M�LTIPLOS PAGAMENTOS
  const addPaymentSplit = () => {
    if (!splitFormData.value || parseFloat(splitFormData.value) <= 0) {
      alert('Por favor, insira um valor v�lido');
      return;
    }

    // Valida��es espec�ficas por m�todo de pagamento
    if (splitFormData.payment_method === 'CARTAO' && !splitFormData.card_number) {
      alert('Por favor, insira o n�mero do cart�o');
      return;
    }
    if (splitFormData.payment_method === 'PIX' && !splitFormData.pix_key) {
      alert('Por favor, insira a chave PIX');
      return;
    }
    if (splitFormData.payment_method === 'CHEQUE' && !splitFormData.cheque_number) {
      alert('Por favor, insira o n�mero do cheque');
      return;
    }

    const totalAtual = pagamentoSplits.reduce(
      (sum, split) => sum + parseFloat(split.value || 0),
      0,
    );
    const desconto = effectiveDiscountAmount;
    const valorTotal = effectiveAppointmentValue - desconto;
    if (totalAtual + parseFloat(splitFormData.value) > valorTotal) {
      alert(
        `Valor permitido para recebimento é ${formatCurrency(valorTotal)}. Valor total não pode exceder este valor.`,
      );
      return;
    }

    const cardFirstDueDate = splitFormData.payment_method === 'CARTAO'
      ? splitFormData.payment_due_date || getDatePlusDays(30)
      : splitFormData.payment_due_date;
    const cardInstallmentDates = splitFormData.payment_method === 'CARTAO'
      ? splitFormData.card_installment_dates || buildInstallmentDates(cardFirstDueDate, splitFormData.installments).join('|')
      : splitFormData.card_installment_dates;

    const newSplit = {
      ...splitFormData,
      payment_due_date: cardFirstDueDate,
      card_installment_dates: cardInstallmentDates,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };

    setPagamentoSplits([...pagamentoSplits, newSplit]);
    resetSplitFormData();
  };

  const removePaymentSplit = (id) => {
    setPagamentoSplits(pagamentoSplits.filter((split) => split.id !== id));
  };

  // Limpar formul�rio de split
  const resetSplitFormData = () => {
    setSplitFormData({
      payment_method: 'DINHEIRO',
      value: '',
      card_brand: '',
      card_number: '',
      card_expiry: '',
      card_last4: '',
      card_holder: '',
      installments: '1',
      card_installment_dates: '',
      pix_key: '',
      pix_key_type: 'cpf',
      pix_transaction_id: '',
      cheque_bank: '',
      cheque_agency: '',
      cheque_account: '',
      cheque_number: '',
      cheque_due_date: '',
      bank_name: '',
      bank_agency: '',
      bank_account: '',
      transfer_type: 'DOC',
      boleto_number: '',
      payment_due_date: '',
      observation: '',
    });
  };

  // Inicializar/resetar dados ao abrir
  useEffect(() => {
    console.log('?? [INITIALIZATION EFFECT] Disparado! Estado atual:');
    console.log('   isOpen:', isOpen);
    console.log('   mode:', mode);
    console.log('   hasAppointment:', !!finalAppointment);
    console.log('   hasAppointmentProp:', !!appointment);
    console.log('   hasLoadedFromId:', !!loadedAppointmentFromId);
    console.log('   appointmentId:', finalAppointment?.id);

    if (isOpen) {
      if (mode === 'new') {
        console.log('? MODO: NEW - Resetando form para novo agendamento');
        console.log('   finalAppointment:', finalAppointment);
        console.log('   finalAppointment?.id:', finalAppointment?.id);
        console.log('   finalAppointment?.id === undefined:', finalAppointment?.id === undefined);
        console.log('   !finalAppointment?.id:', !finalAppointment?.id);
        console.log(
          '   finalAppointment && !finalAppointment.id =',
          finalAppointment && !finalAppointment.id,
        );
        // ? Se h� appointment sem ID (vindo de slot), preencher com dados do slot
        if (finalAppointment && !finalAppointment.id) {
          console.log('??? ENTERING IF BRANCH - WILL SET PROFESSIONAL_ID FROM SLOT');
          console.log(
            '?? [AppointmentUnitedModal] ? ENTRANDO NO IF - Modo NEW com slot data:',
            finalAppointment,
          );
          console.log('   Setting professionalId:', finalAppointment.professionalId);
          console.log('   finalAppointment object keys:', Object.keys(finalAppointment));
          console.log(
            '   *** finalAppointment.professional_id (underscore):',
            finalAppointment.professional_id,
          );
          console.log(
            '   *** finalAppointment.professionalId (camelCase):',
            finalAppointment.professionalId,
          );
          setTabAtivo('dados');
          setSelectedPatient(null);
          console.log('? TIME FINAL:', finalAppointment.time, finalAppointment.scheduled_time);
          const newAgendamentoData = {
            date: finalAppointment.date || '',
            time: finalAppointment.time || finalAppointment.scheduled_time || '',
            endTime: '',
            duration: finalAppointment.duration || 30,
            patientName: '',
            patientId: null,
            phone: '',
            recordNumber: '',
            // ?? FIX: Adicionar fallback para snake_case (vem de slot)
            professionalId: finalAppointment.professionalId || finalAppointment.professional_id || '', // ? PR�-PREENCHER DO SLOT
            serviceId: finalAppointment.serviceId || finalAppointment.service_id || '',
            serviceCode: '',
            payerId: finalAppointment.payerId || finalAppointment.payer_id || '',
            planId: finalAppointment.planId || finalAppointment.plan_id || '',
            planCode: '',
            roomId: finalAppointment.roomId || finalAppointment.room_id || '', // ? PR�-PREENCHER DO SLOT
            value: '0.00',
            notes: '',
            status: 'scheduled',
          };
          console.log('?? [NEW MODE] ANTES de setAgendamentoData - finalAppointment:', {
            professional_id: finalAppointment.professional_id,
            professionalId: finalAppointment.professionalId,
            hasAny: finalAppointment.professional_id !== undefined || finalAppointment.professionalId !== undefined,
            finalAllKeys: Object.keys(finalAppointment),
          });
          console.log('?? [NEW MODE] agendamentoData sendo inicializado com:', {
            professionalId: newAgendamentoData.professionalId,
            date: newAgendamentoData.date,
            isEmpty: !newAgendamentoData.professionalId,
          });
          // ?? GUARDAR o profissional inicial do slot
          if (newAgendamentoData.professionalId) {
            initialSlotProfessionalIdRef.current = newAgendamentoData.professionalId;
            console.log('?? [REF] Guardando profissional inicial do slot:', newAgendamentoData.professionalId);
          }
          setAgendamentoData(newAgendamentoData);
          console.log('?? [NEW MODE] DEPOIS de setAgendamentoData - estado foi atualizado');
          setCadastralData({
            name: '',
            document_id: '',
            birthdate: '',
            gender: '',
            phone: '',
            cell_phone: '',
            email: '',
            street: '',
            number: '',
            neighborhood: '',
            city: '',
            state: '',
            zip_code: '',
          });
          setLiberacaoData({
            payer_name: '',
            plan_name: '',
            plan_code: '',
            card_number: '',
            requires_auth: 'no',
            auth_number: '',
            auth_expiry: '',
            auth_status: 'approved',
            authorized: false,
          });
          setFaturamentoData({
            service_name: '',
            guide_type: 'consulta',
            code_type: 'tuss',
            procedure_code: '',
            service_date: '',
            service_place: '',
            requesting_doctor: '',
            responsible_doctor: '',
            guide_number: '',
            estimated_value: '0.00',
            authorized_value: '0.00',
            discount: '0.00',
          });
          setPagamentoData(defaultPaymentData);
          console.log(
            '? [AppointmentUnitedModal] Dados do slot pr�-preenchidos com profissional:',
            finalAppointment.professionalId,
          );
          console.log('   ?? DEBUG PR�-PREENCHIMENTO:', {
            hasData: !!finalAppointment,
            professionalIdValue: finalAppointment.professionalId,
            professionalIdType: typeof finalAppointment.professionalId,
            professionalIdEmpty: !finalAppointment.professionalId,
            professionalIdIsString: typeof finalAppointment.professionalId === 'string',
            allKeys: Object.keys(finalAppointment),
          });
        } else {
          // ? RESETAR TUDO para modo novo (sem dados de slot)
          console.log(
            '??? ENTERING ELSE BRANCH - WILL RESET PROFESSIONAL_ID TO EMPTY',
          );
          console.log('   finalAppointment:', finalAppointment);
          console.log('   finalAppointment?.id:', finalAppointment?.id);
          console.log('   Reason: finalAppointment falsy OR has an id');
          console.log('?? [AppointmentUnitedModal] ? Entrando no ELSE - Resetando dados (sem slot data)',
          );
          setTabAtivo('dados');
          setSelectedPatient(null); // ? Limpar paciente selecionado
          setAgendamentoData({
            date: '',
            time: '',
            endTime: '',
            duration: 30,
            patientName: '',
            patientId: null,
            phone: '',
            recordNumber: '',
            professionalId: '',
            serviceId: '',
            serviceCode: '',
            payerId: '',
            planId: '',
            planCode: '',
            roomId: '',
            value: '0.00',
            notes: '',
            status: 'scheduled',
          });
          // ? FIX: N�O resetar appointmentServices aqui
          // AppointmentItemsManager j� gerencia os servi�os e isso causava perda de dados
          // setAppointmentServices([]); // ? REMOVIDO - causa reset quando muda de aba
          setCadastralData({
            name: '',
            document_id: '',
            birthdate: '',
            gender: '',
            phone: '',
            cell_phone: '',
            email: '',
            street: '',
            number: '',
            neighborhood: '',
            city: '',
            state: '',
            zip_code: '',
          });
          setLiberacaoData({
            payer_name: '',
            plan_name: '',
            plan_code: '',
            card_number: '',
            requires_auth: 'no',
            auth_number: '',
            auth_expiry: '',
            auth_status: 'approved',
            authorized: false,
          });
          setFaturamentoData({
            service_name: '',
            guide_type: 'consulta',
            code_type: 'tuss',
            procedure_code: '',
            service_date: '',
            service_place: '',
            requesting_doctor: '',
            responsible_doctor: '',
            guide_number: '',
            estimated_value: '0.00',
            authorized_value: '0.00',
            discount: '0.00',
            diagnosis_code: '',
            subscriber_number: '',
            dependent_number: '',
            dependent_name: '',
            dependent_birthdate: '',
            dependent_gender: '',
            quantity: 1,
            notes: '',
          });
          setPagamentoData(defaultPaymentData);
        }
      } else if (mode === 'edit' && finalAppointment) {
        console.log('? MODO: EDIT - Populando form com dados do agendamento');
        console.log(
          '?? [AppointmentUnitedModal] EDIT MODE - appointment recebido:',
          finalAppointment,
        );
        console.log('  date (camelCase):', finalAppointment.date);
        console.log('  startTime (camelCase):', finalAppointment.startTime);
        console.log('  patient:', finalAppointment.patientName || finalAppointment.patients?.name);
        console.log('  professionalId (camelCase):', finalAppointment.professionalId);
        console.log('  payerId (camelCase):', finalAppointment.payerId);
        console.log('  roomId (camelCase):', finalAppointment.roomId);
        console.log(
          '?? [CRITICAL] Conv�nio (payer) detectado?',
          finalAppointment.payerId ? '? SIM' : '? N�O',
        );
        setTabAtivo('dados');
        const newData = {
          id: finalAppointment.id || finalAppointment.appointment_id || null,
          date: finalAppointment.date || '',
          time: finalAppointment.startTime || finalAppointment.time || '',
          endTime: finalAppointment.endTime || finalAppointment.end_time || '',
          duration: finalAppointment.duration || 30,
          patientName: finalAppointment.patientName || finalAppointment.patients?.name || finalAppointment.patient_name || '',
          patientId: finalAppointment.patientId || finalAppointment.patient_id || null,
          phone: finalAppointment.patientPhone || finalAppointment.patients?.phone || finalAppointment.patient_phone || '',
          recordNumber:
            finalAppointment.patientProntuario || finalAppointment.patients?.record_number || finalAppointment.prontuario_numero || '',
          professionalId: finalAppointment.professionalId || finalAppointment.professional_id || '',
          serviceId: finalAppointment.serviceId || finalAppointment.service_id || '',
          serviceCode: finalAppointment.serviceName || finalAppointment.services?.code || finalAppointment.service_name || '',
          payerId: finalAppointment.payerId || finalAppointment.payer_id || '',
          planId: finalAppointment.planId || finalAppointment.plan_id || '',
          planCode: finalAppointment.planCode || finalAppointment.plans?.code || finalAppointment.plan_code || '',
          roomId: finalAppointment.roomId || finalAppointment.room_id || '',
          value: finalAppointment.value?.toString() || '0.00',
          notes: finalAppointment.notes || '',
          status: finalAppointment.status || 'scheduled',
        };
        console.log('?? [AppointmentUnitedModal] setAgendamentoData com:', newData);
        console.log(
          '?? [DEBUG] payerId no newData:',
          newData.payerId,
          '| tipo:',
          typeof newData.payerId,
        );
        console.log('?? [IMPORTANTE] STATUS DO AGENDAMENTO:', newData.status);
        console.log(
          '?? [BOT�O VIS�VEL?] status === "at_checkout"?',
          newData.status === 'at_checkout',
        );
        console.log('?? [DEBUG] Dados sendo setados - professionalId:', newData.professionalId, ' | serviceId:', newData.serviceId, ' | payerId:', newData.payerId, ' | appointmentId:', newData.id);
        setAgendamentoData(newData);
        console.log('?? [AFTER setAgendamentoData] agendamentoData ser�:', newData);

        // ?? TAMB�M CARREGAR DADOS CADASTRAIS DO PACIENTE
        console.log('?? [AppointmentUnitedModal] Carregando dados cadastrais do paciente');
        setCadastralData({
          name: finalAppointment.patients?.name || '',
          document_id: finalAppointment.patients?.document_id || '',
          birthdate: finalAppointment.patients?.birthdate || '',
          gender: finalAppointment.patients?.gender || '',
          phone: finalAppointment.patients?.phone || '',
          cell_phone: finalAppointment.patients?.cell_phone || '',
          email: finalAppointment.patients?.email || '',
          street: finalAppointment.patients?.street || '',
          number: finalAppointment.patients?.number || '',
          neighborhood: finalAppointment.patients?.neighborhood || '',
          city: finalAppointment.patients?.city || '',
          state: finalAppointment.patients?.state || '',
          zip_code: finalAppointment.patients?.zip_code || '',
          photo_url: finalAppointment.patients?.photo_url || null,
        });

        // ? TAMB�M CARREGAR SELECTEDPATIENT PARA MOSTRAR EM DESTAQUE
        if (finalAppointment.patients) {
          console.log('?? [EDIT MODE] Setando selectedPatient com dados do paciente:', {
            patientId: finalAppointment.patientId,
            patientName: finalAppointment.patientName || finalAppointment.patients?.name,
            phone: finalAppointment.patients?.phone,
          });
          setSelectedPatient({
            patientId: finalAppointment.patientId,
            patientName: finalAppointment.patientName || finalAppointment.patients?.name || '',
            name: finalAppointment.patientName || finalAppointment.patients?.name || '',
            document_id: finalAppointment.patients?.document_id || '',
            phone: finalAppointment.patients?.phone || '',
            birthdate: finalAppointment.patients?.birthdate || '',
            gender: finalAppointment.patients?.gender || '',
            cell_phone: finalAppointment.patients?.cell_phone || '',
            email: finalAppointment.patients?.email || '',
            street: finalAppointment.patients?.street || '',
            number: finalAppointment.patients?.number || '',
            neighborhood: finalAppointment.patients?.neighborhood || '',
            city: finalAppointment.patients?.city || '',
            state: finalAppointment.patients?.state || '',
            zip_code: finalAppointment.patients?.zip_code || '',
          });
        } else {
          console.log('?? [EDIT MODE] finalAppointment.patients � nulo:', finalAppointment.patients);
        }

        // ?? INICIALIZAR DADOS DE PAGAMENTO (para particular E conv�nio)
        console.log('?? [AppointmentUnitedModal] Carregando dados de pagamento');
        console.log('   discount:', finalAppointment.discount);
        console.log('   paymentMethod:', finalAppointment.paymentMethod);
        console.log('   discountReason:', finalAppointment.discountReason);

        setPagamentoData((prev) => ({
          ...defaultPaymentData,
          payment_method: finalAppointment.paymentMethod || 'DINHEIRO',
          discount: finalAppointment.discount
            ? parseFloat(finalAppointment.discount).toFixed(2)
            : '0.00',
          discount_reason: finalAppointment.discountReason || '',
          discount_requested_by: finalAppointment.discountRequestedBy || null,
          discount_requested_by_name: finalAppointment.discountRequestedByName || null,
          discount_requested_at: finalAppointment.discountRequestedAt || null,
          discount_authorized_by: finalAppointment.discountAuthorizedBy || null,
          discount_authorized_by_name: finalAppointment.discountAuthorizedByName || null,
          discount_authorized_at: finalAppointment.discountAuthorizedAt || null,
          discount_rejected_by: finalAppointment.discountRejectedBy || null,
          discount_rejected_by_name: finalAppointment.discountRejectedByName || null,
          discount_rejected_at: finalAppointment.discountRejectedAt || null,
          discount_rejected_amount: finalAppointment.discountRejectedAmount || 0,
          discount_observation: finalAppointment.discountObservation || '',
          plano_contas_id: finalAppointment.planoContasId || '',
          dinheiro: {
            ...defaultPaymentData.dinheiro,
            value_received: finalAppointment.value?.toString() || '0.00',
          },
        }));

        // ?? CARREGAR M�LTIPLOS PAGAMENTOS (payment_splits)
        console.log('?? [AppointmentUnitedModal] Carregando m�ltiplos pagamentos');
        console.log('   payment_splits:', finalAppointment.paymentSplits ?? finalAppointment.payment_splits);

        const persistedSplits = getPersistedPaymentSplits(finalAppointment);
        if (persistedSplits.length > 0) {
          console.log('? [AppointmentUnitedModal] Splits carregados:', persistedSplits);
          setPagamentoSplits(persistedSplits);
          setEnableMultiplePayments(true);
        } else {
          console.log('?? [AppointmentUnitedModal] payment_splits vazio ou ausente');
          setPagamentoSplits([]);
          setEnableMultiplePayments(false);
        }

        // ?? CARREGAR DADOS DE PROCESSADOR DE CART�O
        console.log('?? [AppointmentUnitedModal] Carregando dados de processador de cart�o');
        console.log('   processor_id:', finalAppointment.processor_id);
        console.log('   card_brand:', finalAppointment.card_brand);
        console.log('   settlement_type:', finalAppointment.settlement_type);
        console.log('   fee_percent:', finalAppointment.fee_percent);

        setCardProcessorData({
          processor_id: finalAppointment.processor_id || '',
          card_brand: finalAppointment.card_brand || 'VISA',
          settlement_type: finalAppointment.settlement_type || 'D+1',
          fee_percent: finalAppointment.fee_percent || null,
          fee_amount: finalAppointment.fee_amount || null,
          net_amount: finalAppointment.net_amount || null,
        });

        // ?? SE FOR PARTICULAR, ADICIONAR CAMPOS ESPEC�FICOS
        if (checkIsParticular(finalAppointment.payerId || finalAppointment.payer_id)) {
          console.log('?? [AppointmentUnitedModal] Pagador � particular');
        } else {
          console.log('?? [AppointmentUnitedModal] Pagador � conv�nio/empresa');
        }

        // ?? CARREGAR DADOS DE LIBERA��O (Libera��o tab)
        console.log('?? [AppointmentUnitedModal] Carregando dados de libera��o');
        console.log('   finalAppointment.card_number:', finalAppointment.card_number);
        console.log(
          '   finalAppointment.authorization_number:',
          finalAppointment.authorization_number,
        );
        console.log(
          '   finalAppointment.authorization_expiry:',
          finalAppointment.authorization_expiry,
        );
        console.log(
          '   finalAppointment.authorization_verified:',
          finalAppointment.authorization_verified,
        );

        // Tentar recuperar dados salvos anteriormente
        const savedLiberacao = sessionStorage.getItem(`liberacaoData_${finalAppointment.id}`);
        const liberacaoFromStorage = savedLiberacao ? JSON.parse(savedLiberacao) : null;

        const liberacaoValores = {
          payer_name: finalAppointment.payers?.name || '',
          plan_name: finalAppointment.plans?.name || '',
          plan_code: finalAppointment.plans?.code || '',
          card_number: finalAppointment.card_number || '',
          requires_auth: finalAppointment.authorization_number ? 'yes' : 'no',
          auth_number: finalAppointment.authorization_number || '',
          auth_expiry: finalAppointment.authorization_expiry || '',
          auth_status: finalAppointment.authorization_verified ? 'approved' : 'pending',
          authorized: finalAppointment.authorization_verified || false,
        };
        console.log('   liberacaoValores calculados:', liberacaoValores);

        setLiberacaoData(liberacaoFromStorage || liberacaoValores);

        // ?? CARREGAR DADOS DE FATURAMENTO (Faturamento tab)
        console.log('?? [AppointmentUnitedModal] Carregando dados de faturamento');
        console.log('   finalAppointment.billing_data:', finalAppointment.billing_data);
        console.log('   finalAppointment.guide_number:', finalAppointment.guide_number);
        console.log('   finalAppointment.value:', finalAppointment.value);

        // Tentar recuperar dados salvos anteriormente
        const savedFaturamento = sessionStorage.getItem(`faturamentoData_${finalAppointment.id}`);
        const faturamentoFromStorage = savedFaturamento ? JSON.parse(savedFaturamento) : null;

        // ?? DESSERIALIZAR billing_data JSON se existir
        let billingDataParsed = {};
        if (finalAppointment.billing_data) {
          try {
            console.log('   ?? billing_data exists, tipo:', typeof finalAppointment.billing_data);
            billingDataParsed =
              typeof finalAppointment.billing_data === 'string'
                ? JSON.parse(finalAppointment.billing_data)
                : finalAppointment.billing_data;
            console.log(
              '? [AppointmentUnitedModal] billing_data desserializado:',
              billingDataParsed,
            );
          } catch (err) {
            console.warn('?? Erro ao desserializar billing_data:', err);
            console.warn('   billing_data raw:', finalAppointment.billing_data);
          }
        } else {
          console.log('   ?? finalAppointment.billing_data � null/undefined');
        }

        console.log('?? [Debug] Valores que ser�o usados no faturamentoData:');
        console.log('   guide_type:', billingDataParsed.guide_type || 'consulta');
        console.log('   code_type:', billingDataParsed.code_type || 'tuss');
        console.log(
          '   procedure_code:',
          billingDataParsed.procedure_code || finalAppointment.services?.code || '',
        );
        console.log('   guide_number:', finalAppointment.guide_number || '');
        console.log(
          '   estimated_value:',
          billingDataParsed.estimated_value?.toString() ||
            finalAppointment.value?.toString() ||
            '0.00',
        );

        setFaturamentoData(
          faturamentoFromStorage || {
            service_name: finalAppointment.services?.name || '',
            guide_type: billingDataParsed.guide_type || 'consulta',
            code_type: billingDataParsed.code_type || 'tuss',
            procedure_code:
              billingDataParsed.procedure_code || finalAppointment.services?.code || '',
            service_date: billingDataParsed.service_date || finalAppointment.scheduled_date || '',
            service_place: billingDataParsed.service_place || finalAppointment.service_place || '',
            requesting_doctor:
              billingDataParsed.requesting_doctor ||
              finalAppointment.requesting_doctor ||
              finalAppointment.professionals?.name ||
              '',
            responsible_doctor:
              billingDataParsed.responsible_doctor ||
              finalAppointment.responsible_doctor ||
              finalAppointment.professionals?.name ||
              '',
            guide_number: finalAppointment.guide_number || '',
            estimated_value:
              billingDataParsed.estimated_value?.toString() ||
              finalAppointment.value?.toString() ||
              '0.00',
            authorized_value:
              billingDataParsed.authorized_value?.toString() ||
              finalAppointment.value?.toString() ||
              '0.00',
            discount: finalAppointment.discount
              ? parseFloat(finalAppointment.discount).toFixed(2)
              : '0.00',
            plano_contas_id: finalAppointment.plano_contas_id || '',
            convenio_id: finalAppointment.convenio_id || '',
            notes: billingDataParsed.notes || finalAppointment.notes || '',
            diagnosis_code:
              billingDataParsed.diagnosis_code || finalAppointment.diagnosis_code || '',
            subscriber_number: finalAppointment.subscriber_number || '',
            dependent_number: finalAppointment.dependent_number || '',
            dependent_name: finalAppointment.dependent_name || '',
            dependent_birthdate: finalAppointment.dependent_birthdate || '',
            dependent_gender: finalAppointment.dependent_gender || '',
            quantity: finalAppointment.quantity || 1,
          },
        );
      } else if (mode === 'reception' && finalAppointment) {
        setTabAtivo('cadastrais');
        setAgendamentoData({
          date: finalAppointment.scheduled_date || '',
          time: finalAppointment.scheduled_time || '',
          endTime: finalAppointment.end_time || '',
          duration: finalAppointment.duration || 30,
          patientName: finalAppointment.patients?.name || '',
          patientId: finalAppointment.patient_id || null,
          phone: finalAppointment.patients?.phone || '',
          recordNumber: finalAppointment.record_number || '',
          professionalId: finalAppointment.professional_id || '',
          serviceId: finalAppointment.service_id || '',
          payerId: finalAppointment.payerId || finalAppointment.payer_id || '',
          planId: finalAppointment.plan_id || '',
          planCode: finalAppointment.plans?.code || '',
          roomId: finalAppointment.roomId || finalAppointment.room_id || '',
          value: finalAppointment.value?.toString() || '0.00',
          notes: finalAppointment.notes || '',
          status: finalAppointment.status || 'scheduled',
        });
        setCadastralData({
          name: finalAppointment.patients?.name || '',
          document_id: finalAppointment.patients?.document_id || '',
          birthdate: finalAppointment.patients?.birthdate || '',
          gender: finalAppointment.patients?.gender || '',
          phone: finalAppointment.patients?.phone || '',
          cell_phone: finalAppointment.patients?.cell_phone || '',
          email: finalAppointment.patients?.email || '',
          street: finalAppointment.patients?.street || '',
          number: finalAppointment.patients?.number || '',
          neighborhood: finalAppointment.patients?.neighborhood || '',
          city: finalAppointment.patients?.city || '',
          state: finalAppointment.patients?.state || '',
          zip_code: finalAppointment.patients?.zip_code || '',
        });
      }
    }
  }, [isOpen, mode, appointment, loadedAppointmentFromId, finalAppointment]);

  // ? FIX: Garantir que o payerId seja restaurado quando o agendamento for carregado em modo EDIT
  useEffect(() => {
    if (isOpen && mode === 'edit' && finalAppointment && finalAppointment.id) {
      console.log('?? [FIX payerId + planId] Modal aberto em EDIT mode com agendamento carregado');
      console.log('   finalAppointment.payerId:', finalAppointment.payerId);
      console.log('   finalAppointment.payer_id:', finalAppointment.payer_id);
      console.log('   finalAppointment.planId:', finalAppointment.planId);
      console.log('   finalAppointment.plan_id:', finalAppointment.plan_id);

      const payerId = finalAppointment.payerId || finalAppointment.payer_id || '';
      console.log('   ? payerId final a ser setado:', payerId);

      const planId = finalAppointment.planId || finalAppointment.plan_id || '';
      console.log('   ? planId final a ser setado:', planId);
      setAgendamentoData((prev) => ({
        ...prev,
        payerId: payerId,
        planId: planId,
      }));
    }
  }, [isOpen, mode, finalAppointment]);

  // ??? Carregar planos de contas
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    const loadPlans = async () => {
      try {
        console.log('?? Carregando planos de contas para clinic:', clinicId);
        const plans = await listAccountPlans(clinicId);
        console.log('?? Planos carregados:', plans);

        // Apenas sub-planos (com parent_id)
        const filteredPlans = (plans || []).filter((p) => p.parent_id);
        console.log('?? Planos filtrados (com parent_id):', filteredPlans);
        setAccountPlans(filteredPlans);
      } catch (err) {
        console.warn('Erro ao carregar planos de contas:', err);
      }
    };
    loadPlans();
  }, [clinicId]);

  // ?? ETAPA 3b: Carregar appointment_services quando agendamento � carregado
  // Track if we've already loaded appointment services to avoid reloading
  const appointmentIdForServiceLoad = useMemo(
    () => (mode === 'edit' && (finalAppointment?.id || appointment?.id)) || null,
    [mode, finalAppointment?.id, appointment?.id],
  );

  const appointmentServiceLoadedRef = React.useRef(null);

  // ?? Reset ref quando modal fecha (para poder recarregar na pr�xima abertura)
  useEffect(() => {
    if (!isOpen) {
      appointmentServiceLoadedRef.current = null;
      console.log('?? [loadAppointmentServices] Modal fechada - resetando ref');
    }
  }, [isOpen]);

  useEffect(() => {
    const loadAppointmentServices = async () => {
      // ?? NOTA: AppointmentItemsManager cuida de carregar os servi�os via onItemsChange
      // Este m�todo N�O precisa mais carregar servi�os separadamente
      console.log('?? [loadAppointmentServices] AppointmentItemsManager gerencia os servi�os agora');
      return;
    };

    loadAppointmentServices();
  }, [isOpen, mode, appointmentIdForServiceLoad]);

  // ?? ETAPA 3.5: Recalcular total quando appointmentServices muda
  useEffect(() => {
    if (appointmentServices && appointmentServices.length > 0) {
      const totalValue = appointmentServices.reduce((sum, item) => {
        const value = parseFloat(item.value || 0);
        const discount = parseFloat(item.discount || 0);
        const qty = parseInt(item.quantity || 1);
        return sum + (value * qty - discount * qty);
      }, 0);
      console.log(
        '?? [useEffect appointmentServices] Recalculando total:',
        totalValue,
        'com',
        appointmentServices.length,
        'servi�os',
      );
      setAgendamentoData((prev) => ({
        ...prev,
        value: totalValue.toString(),
      }));
    }
  }, [appointmentServices]);

  // ?? ETAPA 3.6: AUTO-SINCRONIZAR SERVI�OS QUANDO MUDAM (fix para mudan�a de abas)
  // Este useEffect garante que os servi�os s�o salvos automaticamente quando alterados
  // Isso previne perda de dados ao mudar de aba
  useEffect(() => {
    if (!isOpen || !finalAppointment?.id || appointmentServices.length === 0) {
      console.log('?? [AUTO-SYNC SERVICES] Condi��es n�o atendidas:', {
        isOpen,
        hasAppointmentId: !!finalAppointment?.id,
        servicesCount: appointmentServices.length,
      });
      return;
    }

    console.log('?? [AUTO-SYNC SERVICES] Sincronizando servi�os ap�s mudan�a:', {
      appointmentId: finalAppointment.id,
      servicesCount: appointmentServices.length,
      services: appointmentServices.map(s => ({ id: s.id, name: s.service_name })),
    });

    const autoSyncServices = async () => {
      try {
        const formattedServices = appointmentServices.map(s => ({
          service_id: s.service_id || s.id,
          service_name: s.service_name || s.name,
          service_code: s.service_code || s.code || '',
          value: parseFloat(s.value || 0),
          discount: parseFloat(s.discount || 0),
          quantity: parseInt(s.quantity || 1),
          billing_type: s.billing_type || 'per_consultation',
          sessions_completed: s.sessions_completed || 0,
          status: s.status || 'pending',
        }));

        console.log('?? [AUTO-SYNC] Enviando servi�os para sincroniza��o:', {
          appointmentId: finalAppointment.id,
          services: formattedServices,
        });

        const result = await syncAppointmentServices(finalAppointment.id, formattedServices);

        console.log('? [AUTO-SYNC] Servi�os sincronizados com sucesso!', {
          result_length: result?.length,
        });
      } catch (err) {
        console.error('? [AUTO-SYNC] Erro ao sincronizar servi�os:', err);
        // N�o bloquear a experi�ncia do usu�rio, apenas logar o erro
      }
    };

    // Usar delay para evitar sincroniza��es muito frequentes
    const timer = setTimeout(() => {
      autoSyncServices();
    }, 500);

    return () => clearTimeout(timer);
  }, [appointmentServices, finalAppointment?.id, isOpen]);

  // ?? ETAPA 4: Sincronizar appointment com formData do hook
  useEffect(() => {
    console.log('-----------------------------------------------');
    console.log('?? [ETAPA 4] useEffect sincroniza��o disparado');
    console.log('   isOpen:', isOpen);
    console.log('   mode:', mode);
    console.log('   finalAppointment?.id:', finalAppointment?.id);
    console.log('-----------------------------------------------');

    if (!isOpen) {
      console.log('   ?? Modal fechado - ignorando');
      return;
    }

    if (mode === 'new' || mode === 'create') {
      console.log('   ?? Modo CREATE - resetando form');
      resetFormData();
      return;
    }

    if (mode === 'edit' && finalAppointment) {
      console.log('   ?? Modo EDIT - preenchendo form com appointment');
      console.log('   appointment:', {
        id: finalAppointment.id,
        patient_id: finalAppointment.patient_id,
        professional_id: finalAppointment.professional_id,
        service_id: finalAppointment.service_id,
        payer_id: finalAppointment.payer_id,
        room_id: finalAppointment.room_id,
        scheduled_date: finalAppointment.scheduled_date,
        scheduled_time: finalAppointment.scheduled_time,
        value: finalAppointment.value,
        status: finalAppointment.status,
        notes: finalAppointment.notes,
      });
      fillFromAppointment(finalAppointment);
      console.log('   ? formData preenchido com sucesso');
      console.log('   formData atual:', formData);
    }
  }, [isOpen, mode, finalAppointment?.id]);

  // ?? ETAPA 4.5: Sincronizar agendamentoData com finalAppointment (sem sobrescrever m�ltiplos servi�os)
  useEffect(() => {
    if (!isOpen || mode !== 'edit' || !finalAppointment) {
      return;
    }

    console.log('?? [ETAPA 4.5] Sincronizando agendamentoData com finalAppointment');

    setAgendamentoData((prev) => {
      const updated = {
        ...prev,
        id: finalAppointment.id || null, // ? NOVO: Propagar ID para AppointmentItemsManager
        date: finalAppointment.date || finalAppointment.scheduled_date || prev.date || '',
        time:
          finalAppointment.startTime ||
          finalAppointment.time ||
          finalAppointment.scheduled_time ||
          prev.time ||
          '',
        endTime: finalAppointment.endTime || finalAppointment.end_time || prev.endTime || '',
        patientId: finalAppointment.patientId || finalAppointment.patient_id || prev.patientId || null,
        patientName:
          finalAppointment.patientName ||
          finalAppointment.patient?.name ||
          finalAppointment.patients?.name ||
          finalAppointment.patient_name ||
          prev.patientName ||
          '',
        phone:
          finalAppointment.patientPhone ||
          finalAppointment.patient?.cell_phone ||
          finalAppointment.patient?.phone ||
          finalAppointment.patients?.cell_phone ||
          finalAppointment.patients?.phone ||
          finalAppointment.patient_phone ||
          prev.phone ||
          '',
        professionalId:
          finalAppointment.professionalId || finalAppointment.professional_id || prev.professionalId || '',
        serviceId: finalAppointment.serviceId || finalAppointment.service_id || prev.serviceId || '',
        serviceCode:
          finalAppointment.serviceCode ||
          finalAppointment.services?.code ||
          finalAppointment.service_code ||
          prev.serviceCode ||
          '',
        payerId: finalAppointment.payerId || finalAppointment.payer_id || prev.payerId || '',
        planId: finalAppointment.planId || finalAppointment.plan_id || prev.planId || '',
        planCode: finalAppointment.planCode || finalAppointment.plans?.code || prev.planCode || '',
        roomId: finalAppointment.roomId || finalAppointment.room_id || prev.roomId || '',
        status: finalAppointment.status || 'scheduled',
        notes: finalAppointment.notes || '',
        // N�O sobrescrever value se h� m�ltiplos servi�os
        value:
          appointmentServices.length > 0
            ? prev.value
            : finalAppointment.value?.toString() || prev.value || '0.00',
      };
      return updated;
    });
  }, [isOpen, mode, finalAppointment?.id, appointmentServices.length]);

  const savedServicesForManager = useMemo(() => {
    if (appointmentServices.length > 0) {
      return appointmentServices;
    }

    const serviceId =
      agendamentoData.serviceId || finalAppointment?.serviceId || finalAppointment?.service_id;
    if (!serviceId) {
      return [];
    }

    const serviceFromList = services.find((service) => service.id === serviceId);
    const serviceName =
      finalAppointment?.services?.name ||
      finalAppointment?.serviceName ||
      finalAppointment?.service_name ||
      serviceFromList?.name ||
      '';

    return [
      {
        id: `fallback-${serviceId}`,
        service_id: serviceId,
        service_name: serviceName,
        service_code:
          finalAppointment?.services?.code ||
          finalAppointment?.serviceCode ||
          finalAppointment?.service_code ||
          serviceFromList?.code ||
          '',
        value: agendamentoData.value || finalAppointment?.value || 0,
        discount: finalAppointment?.discount || 0,
        quantity: 1,
        billing_type: 'per_consultation',
        sessions_completed: 0,
        status: 'pending',
        is_fallback: true,
      },
    ];
  }, [appointmentServices, agendamentoData.serviceId, agendamentoData.value, finalAppointment, services]);

  // ?? ETAPA 4.6: AUTO-SELECT: Preencher selectedPatient em modo EDIT
  // Garante que o paciente � selecionado automaticamente quando o modal abre em modo EDIT
  useEffect(() => {
    // LOG INICIAL - SEMPRE disparar este log para diagnosticar
    console.log('?? [AUTO-SELECT PATIENT] useEffect DISPARADO!', {
      isOpen,
      mode,
      hasFinalAppointment: !!finalAppointment,
      'finalAppointment?.id': finalAppointment?.id,
      'finalAppointment?.patient_id': finalAppointment?.patient_id,
      'finalAppointment?.patients (objeto)': finalAppointment?.patients ? 'SIM' : 'N�O',
      'finalAppointment?.patients?.name': finalAppointment?.patients?.name || 'N/A',
      'finalAppointment?.patient': !!finalAppointment?.patient,
    });

    if (!isOpen || mode !== 'edit' || !finalAppointment) {
      console.log('? [AUTO-SELECT PATIENT] Condi��es n�o atendidas - retornando:', {
        isOpen,
        mode,
        hasFinalAppointment: !!finalAppointment,
        'finalAppointment?.id': finalAppointment?.id,
      });
      return;
    }

    const patientId = finalAppointment.patientId || finalAppointment.patient_id;

    if (!patientId) {
      console.log('?? [AUTO-SELECT PATIENT] Sem patientId, n�o preenchendo selectedPatient');
      setSelectedPatient(null);
      return;
    }

    console.log('?? [AUTO-SELECT PATIENT] Preenchendo selectedPatient em modo EDIT');
    console.log('   patientId:', patientId);
    console.log('   finalAppointment.patients:', finalAppointment.patients);
    console.log('   finalAppointment.patient:', finalAppointment.patient);

    // Construir objeto de paciente a partir de finalAppointment
    const patientData = {
      patientId,
      name:
        finalAppointment.patientName ||
        finalAppointment.patients?.name ||
        finalAppointment.patient?.name ||
        finalAppointment.patient_name ||
        '',
      patientName:
        finalAppointment.patientName ||
        finalAppointment.patients?.name ||
        finalAppointment.patient?.name ||
        finalAppointment.patient_name ||
        '',
      phone:
        finalAppointment.patientPhone ||
        finalAppointment.patients?.phone ||
        finalAppointment.patient?.phone ||
        finalAppointment.patient_phone ||
        '',
      cell_phone:
        finalAppointment.patientCellPhone ||
        finalAppointment.patients?.cell_phone ||
        finalAppointment.patient?.cell_phone ||
        finalAppointment.patient_cell_phone ||
        '',
      document_id:
        finalAppointment.patientCpf ||
        finalAppointment.patients?.document_id ||
        finalAppointment.patient?.document_id ||
        finalAppointment.patient_cpf ||
        '',
      birthdate:
        finalAppointment.patientBirthdate ||
        finalAppointment.patients?.birthdate ||
        finalAppointment.patient?.birthdate ||
        finalAppointment.patient_birthdate ||
        '',
      gender:
        finalAppointment.patientGender ||
        finalAppointment.patients?.gender ||
        finalAppointment.patient?.gender ||
        finalAppointment.patient_gender ||
        '',
      email:
        finalAppointment.patientEmail ||
        finalAppointment.patients?.email ||
        finalAppointment.patient?.email ||
        finalAppointment.patient_email ||
        '',
      street: finalAppointment.patients?.street || finalAppointment.patient?.street || '',
      number: finalAppointment.patients?.number || finalAppointment.patient?.number || '',
      neighborhood: finalAppointment.patients?.neighborhood || finalAppointment.patient?.neighborhood || '',
      city: finalAppointment.patients?.city || finalAppointment.patient?.city || '',
      state: finalAppointment.patients?.state || finalAppointment.patient?.state || '',
      zip_code: finalAppointment.patients?.zip_code || finalAppointment.patient?.zip_code || '',
    };

    console.log('? [AUTO-SELECT PATIENT] selectedPatient constru�do:', {
      patientId: patientData.patientId,
      name: patientData.name,
      phone: patientData.phone,
    });

    setSelectedPatient(patientData);
  }, [isOpen, mode, finalAppointment?.patientId, finalAppointment?.patient_id, finalAppointment?.patients, finalAppointment?.patient, finalAppointment]);

  // ??? AUTO-FETCH: Buscar valor quando profissional, servi�o ou conv�nio mudar
  // OU quando o valor est� vazio/zero (apenas quando h� service)
  useEffect(() => {
    console.log('?? [AppointmentUnitedModal] useEffect de pre�o disparado!', {
      serviceId: agendamentoData.serviceId,
      value: agendamentoData.value,
      isOpen,
      mode,
    });

    const fetchServicePrice = async () => {
      // S� buscar se temos pelo menos service
      if (!agendamentoData.serviceId) {
        console.log('  ? Sem serviceId, abortando busca');
        return;
      }

      // S� buscar automatically se o valor est� vazio ou zero
      const currentValue = parseFloat(agendamentoData.value || '0');
      const valueIsEmpty =
        currentValue === 0 || agendamentoData.value === '0.00' || !agendamentoData.value;

      console.log('  ?? Verificando valor:', {
        currentValue,
        valueIsEmpty,
        agendamentoData_value: agendamentoData.value,
      });

      if (!valueIsEmpty) {
        console.log(
          '  ? Valor j� preenchido:',
          agendamentoData.value,
          '- n�o buscando pre�o autom�tico',
        );
        return;
      }

      try {
        console.log('  ?? Iniciando busca de pre�o autom�tico...', {
          serviceId: agendamentoData.serviceId,
          professionalId: agendamentoData.professionalId,
          payerId: agendamentoData.payerId,
          clinicId,
        });

        const price = await getServicePrice({
          clinicId,
          serviceId: agendamentoData.serviceId,
          professionalId: agendamentoData.professionalId || undefined,
          payerId: agendamentoData.payerId || undefined,
        });

        console.log('  ?? Resultado da busca:', price);

        if (price !== null) {
          console.log('  ? Pre�o encontrado automaticamente:', price);
          setAgendamentoData((prev) => ({
            ...prev,
            value: price.toFixed(2).toString(),
          }));
        } else {
          console.log('  ?? Nenhum pre�o encontrado em nenhuma tabela');
        }
      } catch (error) {
        console.error('  ? Erro ao buscar pre�o:', error);
      }
    };

    // Chamar quando service, professional, payer mudam OU quando o modal abre com valor vazio
    if (agendamentoData.serviceId && clinicId) {
      console.log('  ?? Condi��es OK! Chamando fetchServicePrice()');
      fetchServicePrice();
    } else {
      console.log('  ?? Condi��es n�o atendidas:', {
        hasServiceId: !!agendamentoData.serviceId,
        hasClinicId: !!clinicId,
      });
    }
  }, [
    agendamentoData.serviceId,
    agendamentoData.professionalId,
    agendamentoData.payerId,
    clinicId,
  ]);

  // ? AUTO-UPDATE: Buscar pre�o quando o usu�rio MUDA profissional/servi�o/conv�nio (mesmo com valor)
  useEffect(() => {
    const isLoadingInitial = mode === 'edit' && !isOpen;
    if (isLoadingInitial) {
      return;
    } // N�o buscar durante o carregamento inicial

    const fetchUpdatedServicePrice = async () => {
      if (!agendamentoData.serviceId) {
        return;
      }

      try {
        console.log(
          '?? [AppointmentUnitedModal] Buscando pre�o atualizado (usu�rio mudou sele��o):',
          {
            serviceId: agendamentoData.serviceId,
            professionalId: agendamentoData.professionalId,
            payerId: agendamentoData.payerId,
          },
        );

        const price = await getServicePrice({
          clinicId,
          serviceId: agendamentoData.serviceId,
          professionalId: agendamentoData.professionalId || undefined,
          payerId: agendamentoData.payerId || undefined,
        });

        if (price !== null) {
          console.log('? [AppointmentUnitedModal] Pre�o atualizado encontrado:', price);
          setAgendamentoData((prev) => ({
            ...prev,
            value: price.toFixed(2).toString(),
          }));
        }
      } catch (error) {
        console.error('? [AppointmentUnitedModal] Erro ao buscar pre�o:', error);
      }
    };

    // Usar um pequeno delay para evitar buscas durante o carregamento
    const timer = setTimeout(() => {
      if (agendamentoData.serviceId && clinicId && isOpen) {
        fetchUpdatedServicePrice();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    agendamentoData.serviceId,
    agendamentoData.professionalId,
    agendamentoData.payerId,
    clinicId,
    isOpen,
  ]);
  useEffect(() => {
    console.log(
      '?? [AppointmentUnitedModal] agendamentoData.professionalId MUDOU:',
      agendamentoData.professionalId,
    );
    if (agendamentoData.professionalId) {
      const professionalInList = professionals.find((p) => p.id === agendamentoData.professionalId);
      console.log('   ? Profissional encontrado na lista:', professionalInList);
    } else {
      console.log('   ?? professionalId est� vazio!');
    }
  }, [agendamentoData.professionalId, professionals]);

  // ? AUTO-SELECT: Selecionar primeiro profissional automaticamente para novo agendamento
  // ?? IMPORTANTE: Rastrear se professional_id foi explicitamente passado para n�o sobrescrever
  const [professionalIdExplicitlySet, setProfessionalIdExplicitlySet] = useState(false);

  useEffect(() => {
    // Quando appointment muda (novo slot foi selecionado), marcar que professional_id foi explicitamente setado
    console.log('?? [FLAG-SETTER-EFFECT] DISPARADO! Appointment:', {
      hasAppointment: !!appointment,
      appointmentKeys: appointment ? Object.keys(appointment) : [],
      professional_id: appointment?.professional_id,
      professionalId: appointment?.professionalId,
      professional_id_isDefined: appointment?.professional_id !== undefined,
      professionalId_isDefined: appointment?.professionalId !== undefined,
      professional_id_type: typeof appointment?.professional_id,
      professionalId_type: typeof appointment?.professionalId,
      mode,
    });

    // ?? IMPORTANTE: Verificar se professional_id foi EXPLICITAMENTE passado (n�o undefined, mas pode ser null, '', ou um valor real)
    const hasProfessionalIdSet =
      appointment?.professional_id !== undefined ||
      appointment?.professionalId !== undefined;

    console.log('?? [FLAG-SETTER] hasProfessionalIdSet:', hasProfessionalIdSet);

    if (hasProfessionalIdSet) {
      console.log('?? [FLAG-SETTER] ? professional_id EXPLICITAMENTE SETADO:',
        appointment?.professional_id ?? appointment?.professionalId);
      setProfessionalIdExplicitlySet(true);
    } else if (mode === 'new' && !appointment) {
      // Se � novo modo sem appointment, permitir auto-select
      console.log('?? [FLAG-SETTER] ?? Novo modo SEM appointment, permitindo auto-select');
      setProfessionalIdExplicitlySet(false);
    } else {
      console.log('?? [FLAG-SETTER] ?? Situa��o amb�gua - mantendo flag como est�');
    }
  }, [appointment, mode]);

  useEffect(() => {
    console.log('? [AUTO-SELECT PROF] Verificando auto-select:', {
      isOpen,
      mode,
      profsCount: professionals.length,
      profselectionado: agendamentoData.professionalId,
      explicitlySet: professionalIdExplicitlySet,
      appointmentProfId: appointment?.professionalId,
      appointmentProf_id: appointment?.professional_id
    });

    if (isOpen && mode === 'new' && professionals.length > 0) {
      // ?? Se h� um profissional guardado do slot, NUNCA DEIXAR MUDAR
      if (initialSlotProfessionalIdRef.current) {
        console.log('? [AUTO-SELECT PROF] ?? Profissional do slot guardado, protegendo contra override:', {
          guarded: initialSlotProfessionalIdRef.current,
          atual: agendamentoData.professionalId,
        });
        // Se o profissional atual � diferente do guardado, corrigir
        if (agendamentoData.professionalId !== initialSlotProfessionalIdRef.current) {
          console.log('? [AUTO-SELECT PROF] ?? CORRIGINDO profissional para o valor do slot');
          setAgendamentoData((prev) => ({
            ...prev,
            professionalId: initialSlotProfessionalIdRef.current,
          }));
        }
        return;
      }

      // ?? IMPORTANTE: Check DIRETO do appointment prop, n�o da flag que pode estar atrasada!
      const hasProfessionalIdFromSlot = appointment?.professional_id !== undefined || appointment?.professionalId !== undefined;

      if (professionalIdExplicitlySet || hasProfessionalIdFromSlot) {
        console.log('? [AUTO-SELECT PROF] ? Respeitando professional_id explicitamente setado do slot');
        console.log('   professionalIdExplicitlySet:', professionalIdExplicitlySet);
        console.log('   hasProfessionalIdFromSlot:', hasProfessionalIdFromSlot);
        // Verificar se profissional ainda est� na lista de dispon�veis
        const profStillAvailable = professionals.find(p => p.id === agendamentoData.professionalId);
        if (!profStillAvailable && agendamentoData.professionalId && professionals.length > 0) {
          console.log('? [AUTO-SELECT PROF] ??  Profissional do slot n�o est� na lista filtrada, mantendo valor original');
          // Mesmo se n�o estiver dispon�vel, manter o valor do slot
        }
        return;
      }

      // Caso contr�rio, fazer auto-select do primeiro profissional
      if (!agendamentoData.professionalId) {
        console.log('? [AUTO-SELECT PROF] ?? Selecionando primeiro profissional:', professionals[0].name);
        setAgendamentoData((prev) => ({
          ...prev,
          professionalId: professionals[0].id,
        }));
      } else {
        // Se um foi selecionado, verificar se ainda est� na lista
        const profStillAvailable = professionals.find(p => p.id === agendamentoData.professionalId);
        if (!profStillAvailable && professionals.length > 0) {
          console.log('? [AUTO-SELECT PROF] Profissional selecionado n�o est� mais dispon�vel, re-selecionando:', professionals[0].name);
          setAgendamentoData((prev) => ({
            ...prev,
            professionalId: professionals[0].id,
          }));
        }
      }
    }
  }, [isOpen, mode, professionals, agendamentoData.professionalId, professionalIdExplicitlySet, appointment]);

  // ? AUTO-SELECT SERVI�O: Selecionar primeiro servi�o automaticamente
  // ? DESABILITADO: AppointmentItemsManager gerencia os servi�os
  // useEffect(() => {
  //   if (isOpen && mode === 'new' && services.length > 0 && appointmentServices.length === 0) {
  //     console.log('? [AUTO-SELECT SVC] Selecionando primeiro servi�o:', services[0].name);
  //     setAppointmentServices([services[0]]);
  //     setAgendamentoData((prev) => ({
  //       ...prev,
  //       serviceId: services[0].id,
  //       serviceCode: services[0].code || '',
  //     }));
  //   }
  // }, [isOpen, mode, services, appointmentServices.length]);

  // ?? DEBUG: Monitorar TODO o agendamentoData
  useEffect(() => {
    console.log('?? [AppointmentUnitedModal] ESTADO COMPLETO agendamentoData:', {
      date: agendamentoData.date,
      time: agendamentoData.time,
      professionalId: agendamentoData.professionalId,
      serviceId: agendamentoData.serviceId,
      payerId: agendamentoData.payerId,
      roomId: agendamentoData.roomId,
      duration: agendamentoData.duration,
    });
  }, [agendamentoData]);

  // ?? DEBUG: Monitorar listas de dados dispon�veis
  useEffect(() => {
    console.log('?? [AppointmentUnitedModal] LISTAS DISPON�VEIS:', {
      professionalsCount: professionals?.length || 0,
      servicesCount: services?.length || 0,
      payersCount: payers?.length || 0,
      roomsCount: rooms?.length || 0,
    });
    if (agendamentoData.serviceId) {
      const foundService = services.find((s) => s.id === agendamentoData.serviceId);
      console.log(
        `  ? Servi�o ${agendamentoData.serviceId}: ${foundService?.name || 'N�O ENCONTRADO'}`,
      );
    }
    if (agendamentoData.payerId) {
      const foundPayer = payers.find((p) => p.id === agendamentoData.payerId);
      console.log(
        `  ? Conv�nio ${agendamentoData.payerId}: ${foundPayer?.name || 'N�O ENCONTRADO'}`,
      );
    }
  }, [professionals, services, payers, rooms, agendamentoData.serviceId, agendamentoData.payerId]);

  // ?? SINCRONIZAR C�DIGO DO SERVI�O COM SERVI�O SELECIONADO
  useEffect(() => {
    if (agendamentoData.serviceId && services.length > 0) {
      const selectedService = services.find((s) => s.id === agendamentoData.serviceId);
      // ? Tenta diferentes propriedades poss�veis para o c�digo
      const serviceCode =
        selectedService?.code ||
        selectedService?.codigo ||
        selectedService?.service_code ||
        selectedService?.id ||
        '';
      console.log('?? [ServiceCode] Sincronizando c�digo do servi�o:', {
        serviceId: agendamentoData.serviceId,
        serviceName: selectedService?.name,
        serviceCode: serviceCode,
        availableKeys: selectedService ? Object.keys(selectedService) : [],
      });
      // ? Sempre sincroniza se temos um servi�o selecionado, mesmo com c�digo vazio
      if (serviceCode && agendamentoData.serviceCode !== serviceCode) {
        setAgendamentoData((prev) => ({ ...prev, serviceCode }));
      } else if (!serviceCode && agendamentoData.serviceCode) {
        // Se n�o encontrou c�digo mas tinha antes, pode estar em branco
        setAgendamentoData((prev) => ({ ...prev, serviceCode: '' }));
      }
    }
  }, [agendamentoData.serviceId, services]);

  // ? EM MODO EDIT: Se n�o temos o c�digo do servi�o, buscar diretamente do Supabase
  useEffect(() => {
    if (
      mode === 'edit' &&
      appointment &&
      agendamentoData.serviceId &&
      !agendamentoData.serviceCode
    ) {
      console.log(
        '? [ServiceCode] Buscando c�digo do servi�o diretamente do Supabase (modo edit)...',
      );

      supabase
        .from('services')
        .select('id, code, name')
        .eq('id', agendamentoData.serviceId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.warn('? [ServiceCode] Erro ao buscar servi�o:', error);
            return;
          }

          if (!data) {
            console.warn('? [ServiceCode] Servi�o n�o encontrado:', agendamentoData.serviceId);
            return;
          }

          console.log('? [ServiceCode] Servi�o encontrado no Supabase:', data);
          if (data?.code) {
            console.log('? [ServiceCode] Atualizando serviceCode com:', data.code);
            setAgendamentoData((prev) => ({ ...prev, serviceCode: data.code }));
          }
        });
    }
  }, [mode, appointment, agendamentoData.serviceId, agendamentoData.serviceCode]);

  // Auto-sync code from service to procedure
  useEffect(() => {
    if (agendamentoData.serviceCode) {
      updateFaturamentoField('procedure_code', agendamentoData.serviceCode);
    }
  }, [agendamentoData.serviceCode]);

  // ? SINCRONIZAR LIBERA��O COM FATURAMENTO ao avan�ar
  useEffect(() => {
    if (tabAtivo === 'pagamento') {
      console.log('?? [AppointmentUnitedModal] Sincronizando dados de Libera��o para Pagamento');
      setFaturamentoData((prev) => ({
        ...prev,
        guide_number: liberacaoData.auth_number || prev.guide_number || '',
        procedure_code:
          agendamentoData.serviceCode || appointment?.services?.code || prev.procedure_code || '',
      }));
    }
  }, [tabAtivo, liberacaoData.auth_number, appointment?.services?.code]);

  // ATUALIZAR LIBERACAO QUANDO MUDAR ABA
  useEffect(() => {
    if (tabAtivo === 'liberacao' && appointment && mode === 'edit') {
      console.log('?? [LIBERACAO TAB CARREGANDO]');
      console.log('   appointment.card_number (do banco):', appointment.card_number);
      console.log('   appointment.authorization_number:', appointment.authorization_number);
      console.log('   appointment.authorization_expiry:', appointment.authorization_expiry);
      console.log('   appointment.authorization_verified:', appointment.authorization_verified);

      setLiberacaoData((prev) => ({
        ...prev,
        payer_name: appointment.payers?.name || prev.payer_name || '',
        plan_name: appointment.plans?.name || prev.plan_name || '',
        plan_code: appointment.plans?.code || prev.plan_code || '',
        card_number: appointment.card_number || prev.card_number || '',
        requires_auth: appointment.authorization_number ? 'yes' : prev.requires_auth || 'no',
        auth_number: appointment.authorization_number || prev.auth_number || '',
        auth_expiry: appointment.authorization_expiry || prev.auth_expiry || '',
        auth_status: appointment.authorization_verified
          ? 'approved'
          : prev.auth_status || 'pending',
        authorized:
          appointment.authorization_verified !== undefined
            ? appointment.authorization_verified
            : prev.authorized || false,
      }));

      console.log('   ? liberacaoData ap�s setLiberacaoData ser�:', {
        card_number: appointment.card_number || '',
        auth_number: appointment.authorization_number || '',
      });
    }
  }, [tabAtivo, appointment, mode]);

  // PRESERVAR ALTERACOES EM LIBERACAO - GUARDAR EM SESSAO
  useEffect(() => {
    const apt = finalAppointment || appointment;
    if (mode === 'edit' && apt?.id && liberacaoData.auth_number) {
      sessionStorage.setItem(`liberacaoData_${apt.id}`, JSON.stringify(liberacaoData));
      console.log('?? Dados de Libera��o guardados em sess�o');
    }
  }, [liberacaoData, finalAppointment, appointment, mode]);

  // PRESERVAR ALTERACOES EM FATURAMENTO - GUARDAR EM SESSAO
  useEffect(() => {
    const apt = finalAppointment || appointment;
    if (mode === 'edit' && apt?.id && faturamentoData.guide_number) {
      sessionStorage.setItem(`faturamentoData_${apt.id}`, JSON.stringify(faturamentoData));
      console.log('?? Dados de Faturamento guardados em sess�o');
    }
  }, [faturamentoData, finalAppointment, appointment, mode]);

  // Sincronizar NF Autoriza��o (Libera��o) com N� Guia TISS (Faturamento) ao carregar
  useEffect(() => {
    const apt = finalAppointment || appointment;
    if (mode === 'edit' && apt && (liberacaoData.auth_number || faturamentoData.guide_number)) {
      // Se um tem valor e outro est� vazio, sincronizar
      if (liberacaoData.auth_number && !faturamentoData.guide_number) {
        console.log('?? Sincronizando na carga: auth_number ? guide_number');
        setFaturamentoData((prev) => ({ ...prev, guide_number: liberacaoData.auth_number }));
      } else if (faturamentoData.guide_number && !liberacaoData.auth_number) {
        console.log('?? Sincronizando na carga: guide_number ? auth_number');
        setLiberacaoData((prev) => ({ ...prev, auth_number: faturamentoData.guide_number }));
      }
    }
  }, [mode, finalAppointment, appointment]); // Executar apenas uma vez ao abrir o appointment

  // ??? SINCRONIZAR VALOR DE PAGAMENTO COM VALOR DO AGENDAMENTO
  useEffect(() => {
    const isParticular = checkIsParticular(agendamentoData.payerId);
    if (tabAtivo === 'pagamento' && isParticular) {
      const value = effectiveAppointmentValue;
      setPagamentoData((prev) => ({
        ...prev,
        amount: effectiveAppointmentValueString,
        dinheiro: {
          ...prev.dinheiro,
          value_received: effectiveAppointmentValueString,
          change: '0.00',
        },
      }));
      console.log(
        '?? [AppointmentUnitedModal] Sincronizado valor de pagamento:',
        effectiveAppointmentValueString,
      );
    }
  }, [tabAtivo, effectiveAppointmentValueString, agendamentoData.payerId]);

  // ?? SINCRONIZAR DESCONTO COM VALOR RECEBIDO (dinheiro)
  useEffect(() => {
    const isParticular = checkIsParticular(agendamentoData.payerId);
    const paymentMethod = pagamentoData.payment_method;

    if (isParticular && paymentMethod === 'DINHEIRO') {
      const totalValue = effectiveAppointmentValue;
      const discount = effectiveDiscountAmount;
      const finalValue = Math.max(0, totalValue - discount);

      setPagamentoData((prev) => ({
        ...prev,
        dinheiro: {
          ...prev.dinheiro,
          value_received: finalValue.toFixed(2),
          change: '0.00', // Resetar troco quando desconto muda
        },
      }));

      console.log(
        '?? [AppointmentUnitedModal] Desconto sincronizado - Valor recebido atualizado:',
        {
          total: totalValue,
          desconto: discount,
          valor_receber: finalValue.toFixed(2),
        },
      );
    }
  }, [
    pagamentoData.discount,
    pagamentoData.discount_authorized_by,
    pagamentoData.discount_rejected_at,
    effectiveDiscountAmount,
    effectiveAppointmentValue,
    agendamentoData.payerId,
    pagamentoData.payment_method,
  ]);

  const isParticular = checkIsParticular(agendamentoData.payerId);
  const isConvenioFaturado = !isParticular && !!agendamentoData.payerId;
  const patientRecordId = agendamentoData.patientId || finalAppointment?.patientId || finalAppointment?.patient_id;
  const appointmentStatus = agendamentoData.status || finalAppointment?.status || BOOKING_STATUSES.SCHEDULED;
  const isReleasedForDoctor = [
    BOOKING_STATUSES.AT_CHECKOUT,
    SERVICE_STATUSES.AWAITING_PROFESSIONAL,
    SERVICE_STATUSES.IN_SERVICE,
  ].includes(appointmentStatus);

  useEffect(() => {
    let isMounted = true;

    console.log('?? [loadProfessionalSchedules EFFECT] DISPARADO com depend�ncias:', {
      isOpen,
      professionalId: agendamentoData.professionalId,
      clinicId,
      isEmpty: !agendamentoData.professionalId,
    });

    async function loadProfessionalSchedules() {
      // ?? PROTE��O: Se estamos em modo NEW com profissional do slot, usar a ref
      const profIdToUse = initialSlotProfessionalIdRef.current || agendamentoData.professionalId;

      if (!isOpen || !profIdToUse) {
        console.log('??  [loadProfessionalSchedules] EARLY RETURN - isOpen:', isOpen, 'profIdToUse:', profIdToUse);
        if (isMounted) {
          setProfessionalSchedules([]);
          setLoadingProfessionalSchedules(false);
        }
        return;
      }

      console.log('?? [loadProfessionalSchedules] Carregando schedules com profIdToUse:', profIdToUse);

      try {
        setLoadingProfessionalSchedules(true);

        let query = supabase
          .from('professional_schedules')
          .select('*')
          .eq('professional_id', profIdToUse)
          .eq('active', true);

        if (clinicId) {
          query = query.eq('clinic_id', clinicId);
        }

        const { data, error } = await query.order('day_of_week').order('start_time');

        if (error) {
          throw error;
        }

        // ?? DEBUG: Log de agendamentos carregados
        console.log('?? [loadProfessionalSchedules] Agendamentos carregados:', {
          professionalId: agendamentoData.professionalId,
          clinicId,
          count: data?.length || 0,
          data: data?.map(d => ({ id: d.id, day_of_week: d.day_of_week, active: d.active, start_time: d.start_time, end_time: d.end_time }))
        });

        if (isMounted) {
          setProfessionalSchedules(data || []);
        }
      } catch (error) {
        console.error(
          '? [AppointmentUnitedModal] Erro ao carregar disponibilidade do profissional:',
          error,
        );
        if (isMounted) {
          setProfessionalSchedules([]);
        }
      } finally {
        if (isMounted) {
          setLoadingProfessionalSchedules(false);
        }
      }
    }

    loadProfessionalSchedules();

    return () => {
      isMounted = false;
    };
  }, [isOpen, agendamentoData.professionalId, clinicId, initialSlotProfessionalIdRef.current]);

  const selectedProfessional = useMemo(
    () => {
      const professionalFromList = professionals.find(
        (professional) => professional.id === agendamentoData.professionalId,
      );
      if (professionalFromList) {
        return professionalFromList;
      }

      const loadedProfessional = finalAppointment?.professionals;
      if (loadedProfessional?.id === agendamentoData.professionalId) {
        return loadedProfessional;
      }

      return null;
    },
    [professionals, agendamentoData.professionalId, finalAppointment?.professionals],
  );

  const selectedRoom = useMemo(() => {
    const roomFromList = rooms.find((room) => room.id === agendamentoData.roomId);
    if (roomFromList) {
      return roomFromList;
    }

    const loadedRoom = finalAppointment?.rooms;
    if (loadedRoom?.id === agendamentoData.roomId) {
      return loadedRoom;
    }

    return null;
  }, [rooms, agendamentoData.roomId, finalAppointment?.rooms]);

  const availableWeekdayLabels = useMemo(() => {
    const dayIndexes = Array.from(
      new Set((professionalSchedules || []).map((schedule) => Number(schedule.day_of_week))),
    );
    return dayIndexes
      .filter((dayIndex) => Number.isInteger(dayIndex) && dayIndex >= 0 && dayIndex <= 6)
      .sort((left, right) => left - right)
      .map((dayIndex) => WEEKDAY_LABELS[dayIndex]);
  }, [professionalSchedules]);

  const schedulesForSelectedDate = useMemo(
    () => getSchedulesForDate(agendamentoData.date, professionalSchedules),
    [agendamentoData.date, professionalSchedules],
  );

  const calendarSelectedDate = useMemo(
    () => parseLocalDate(agendamentoData.date) || new Date(),
    [agendamentoData.date],
  );

  const calendarYearOptions = useMemo(() => {
    const baseYear = calendarActiveStartDate.getFullYear();
    return Array.from({ length: 11 }, (_, index) => baseYear - 5 + index);
  }, [calendarActiveStartDate]);

  useEffect(() => {
    if (agendamentoData.date) {
      const parsedDate = parseLocalDate(agendamentoData.date);
      if (parsedDate) {
        setCalendarActiveStartDate(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
      }
    }
  }, [agendamentoData.date]);

  useEffect(() => {
    let isMounted = true;

    async function loadVisibleMonthHolidays() {
      if (!isOpen || !calendarActiveStartDate) {
        if (isMounted) {
          setHolidayMap({});
        }
        return;
      }

      try {
        const visibleDates = getMonthDateStrings(calendarActiveStartDate);
        const holidayResults = await checkMultipleDates(visibleDates, clinicId || null);

        if (isMounted) {
          setHolidayMap(holidayResults || {});
        }
      } catch (error) {
        console.error(
          '? [AppointmentUnitedModal] Erro ao carregar feriados do calendario:',
          error,
        );
        if (isMounted) {
          setHolidayMap({});
        }
      }
    }

    loadVisibleMonthHolidays();

    return () => {
      isMounted = false;
    };
  }, [isOpen, calendarActiveStartDate, clinicId]);

  const getHolidayForDate = (dateValue) => {
    const dateString = typeof dateValue === 'string' ? dateValue : formatDateToIso(dateValue);
    return holidayMap?.[dateString] || getFixedNationalHoliday(dateString);
  };

  const isBlockedHolidayDate = (dateValue) => {
    const holidayInfo = getHolidayForDate(dateValue);
    return holidayInfo?.is_blocked === true && holidayInfo?.is_mandatory !== false;
  };

  const selectedDateHoliday = useMemo(
    () => getHolidayForDate(agendamentoData.date),
    [agendamentoData.date, holidayMap],
  );

  const selectedDateBlockedByHoliday =
    selectedDateHoliday?.is_blocked === true && selectedDateHoliday?.is_mandatory !== false;

  const hasAvailabilityForDate = (dateValue) => {
    if (!agendamentoData.professionalId) {
      return true;
    }

    const dateString = formatDateToIso(dateValue);
    return getSchedulesForDate(dateString, professionalSchedules).length > 0;
  };

  const availableTimeSlots = useMemo(() => {
    if (selectedDateBlockedByHoliday) {
      return [];
    }

    return buildAvailableSlots(schedulesForSelectedDate, agendamentoData.duration);
  }, [schedulesForSelectedDate, agendamentoData.duration, selectedDateBlockedByHoliday]);

  const selectedDateHasAvailability =
    !agendamentoData.professionalId || !agendamentoData.date
      ? true
      : schedulesForSelectedDate.length > 0 && !selectedDateBlockedByHoliday;

  const handleCalendarPrevMonth = () => {
    setCalendarActiveStartDate(
      (currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleCalendarNextMonth = () => {
    setCalendarActiveStartDate(
      (currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const handleCalendarMonthChange = (event) => {
    const nextMonth = Number(event.target.value);
    setCalendarActiveStartDate((currentDate) => new Date(currentDate.getFullYear(), nextMonth, 1));
  };

  const handleCalendarYearChange = (event) => {
    const nextYear = Number(event.target.value);
    setCalendarActiveStartDate((currentDate) => new Date(nextYear, currentDate.getMonth(), 1));
  };

  const updateAgendamentoField = (field, value) => {
    console.log(`?? [updateAgendamentoField] Atualizando ${field}:`, value);
    setAgendamentoData((prev) => {
      const updated = { ...prev, [field]: value };
      console.log(`   ? agendamentoData.${field} agora �:`, updated[field]);
      return updated;
    });
  };

  const updateCadastralField = (field, value) => {
    setCadastralData((prev) => ({ ...prev, [field]: value }));
  };

  const updateLiberacaoField = (field, value) => {
    setLiberacaoData((prev) => ({ ...prev, [field]: value }));

    // Sincronizar com Faturamento
    if (field === 'auth_number' && value) {
      setFaturamentoData((prev) => ({ ...prev, guide_number: value }));
    }
  };

  const updateFaturamentoField = (field, value) => {
    setFaturamentoData((prev) => ({ ...prev, [field]: value }));

    // Sincronizar com Libera��o
    if (field === 'guide_number' && value) {
      setLiberacaoData((prev) => ({ ...prev, auth_number: value }));
    }
  };

  const updatePagamentoField = (field, value) => {
    setPagamentoData((prev) => ({ ...prev, [field]: value }));
  };

  const getCurrentUserDisplayName = () =>
    user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Usuario';

  const getCurrentAppointmentId = () => finalAppointment?.id || appointment?.id || agendamentoData.id;

  const requestDiscountAuthorization = async () => {
    const appointmentId = getCurrentAppointmentId();
    const discountAmount = parseFloat(pagamentoData.discount || 0);

    if (discountAmount <= 0) {
      alert('Informe um valor de desconto maior que zero antes de solicitar autorizacao.');
      return;
    }

    if (!appointmentId) {
      const shouldSave = window.confirm(
        'Para enviar a solicitacao de desconto, o agendamento precisa ser salvo primeiro. Salvar o agendamento agora e enviar para autorizacao?',
      );

      if (!shouldSave) {
        return;
      }

      await handleSaveChanges();
      return;
    }

    const requestedAt = new Date().toISOString();
    const requestedByName = getCurrentUserDisplayName();

    const requestData = {
      discount: discountAmount,
      discountReason: pagamentoData.discount_reason || null,
      discountObservation: pagamentoData.discount_observation || null,
      discountRequestedBy: user?.id || null,
      discountRequestedByName: requestedByName,
      discountRequestedAt: requestedAt,
      discountAuthorizedBy: null,
      discountAuthorizedByName: null,
      discountAuthorizedAt: null,
      discountRejectedBy: null,
      discountRejectedByName: null,
      discountRejectedAt: null,
      discountRejectedAmount: 0,
    };

    updatePagamentoField('discount_requested_at', requestedAt);
    updatePagamentoField('discount_requested_by', user?.id || null);
    updatePagamentoField('discount_requested_by_name', requestedByName);
    updatePagamentoField('discount_authorized_by', null);
    updatePagamentoField('discount_authorized_by_name', null);
    updatePagamentoField('discount_authorized_at', null);
    updatePagamentoField('discount_rejected_by', null);
    updatePagamentoField('discount_rejected_by_name', null);
    updatePagamentoField('discount_rejected_at', null);
    updatePagamentoField('discount_rejected_amount', 0);

    await updateAppointment(appointmentId, requestData);

    alert(
      'Desconto enviado para autorizacao!\n\nDestino: Financeiro > Autorizacao de Descontos.\nDepois que for aprovado, use Atualizar Retorno da Autorizacao ou reabra o agendamento para prosseguir com o recebimento com desconto.',
    );
  };

  const refreshDiscountAuthorizationStatus = async () => {
    const appointmentId = getCurrentAppointmentId();

    if (!appointmentId) {
      alert('Este agendamento ainda nao foi salvo.');
      return;
    }

    setLoading(true);
    try {
      const updatedAppointment = await getAppointmentById(appointmentId);

      if (!updatedAppointment) {
        throw new Error('Agendamento nao encontrado.');
      }

      setPagamentoData((prev) => ({
        ...prev,
        discount: updatedAppointment.discount
          ? parseFloat(updatedAppointment.discount).toFixed(2)
          : '0.00',
        discount_reason: updatedAppointment.discountReason || '',
        discount_requested_by: updatedAppointment.discountRequestedBy || null,
        discount_requested_by_name: updatedAppointment.discountRequestedByName || null,
        discount_requested_at: updatedAppointment.discountRequestedAt || null,
        discount_authorized_by: updatedAppointment.discountAuthorizedBy || null,
        discount_authorized_by_name: updatedAppointment.discountAuthorizedByName || null,
        discount_authorized_at: updatedAppointment.discountAuthorizedAt || null,
        discount_rejected_by: updatedAppointment.discountRejectedBy || null,
        discount_rejected_by_name: updatedAppointment.discountRejectedByName || null,
        discount_rejected_at: updatedAppointment.discountRejectedAt || null,
        discount_rejected_amount: updatedAppointment.discountRejectedAmount || 0,
        discount_observation: updatedAppointment.discountObservation || '',
      }));

      if (updatedAppointment.discountAuthorizedBy) {
        alert('Desconto autorizado. O recebimento ja pode prosseguir com o valor descontado.');
      } else if (updatedAppointment.discountRejectedAt) {
        alert('Desconto rejeitado. O desconto foi removido do recebimento.');
      } else {
        alert('A solicitacao ainda esta pendente de autorizacao.');
      }
    } catch (error) {
      alert(`Erro ao atualizar retorno da autorizacao: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPatientRecord = async ({ startAttendance = false } = {}) => {
    const apt = finalAppointment || appointment;
    if (!patientRecordId) {
      alert('Este agendamento ainda não possui paciente vinculado para abrir o prontuário.');
      return;
    }

    let nextStatus = appointmentStatus;
    if (startAttendance && apt?.id) {
      nextStatus = SERVICE_STATUSES.IN_SERVICE;
      try {
        setLoading(true);
        const startedAt = new Date().toISOString();
        const { error } = await supabase
          .from('appointments')
          .update({
            status: nextStatus,
            em_atendimento_em: startedAt,
            started_at: startedAt,
            updated_at: startedAt,
          })
          .eq('id', apt.id);

        if (error) {
          throw error;
        }

        updateAgendamentoField('status', nextStatus);
        onSuccess?.();
      } catch (error) {
        alert(`Erro ao iniciar atendimento: ${error.message}`);
        console.error('Erro ao iniciar atendimento:', error);
        return;
      } finally {
        setLoading(false);
      }
    }

    const professionalName =
      selectedProfessional?.name ||
      professionals.find((professional) => professional.id === agendamentoData.professionalId)
        ?.name ||
      apt?.professionals?.name ||
      '';

    localStorage.setItem(
      'fromAppointmentMode',
      JSON.stringify({
        appointmentId: apt?.id || null,
        patientId: patientRecordId,
        appointmentDate: agendamentoData.date,
        appointmentTime: agendamentoData.time,
        professionalName,
        status: nextStatus,
        timestamp: Date.now(),
      }),
    );

    navigate(`/clinica/pacientes/${patientRecordId}`, {
      state: {
        appointmentId: apt?.id,
        appointmentDate: agendamentoData.date,
        appointmentTime: agendamentoData.time,
        professionalName,
        fromAgendaClinicalFlow: true,
        openTab: 'historico',
        mode: startAttendance ? 'atendimento' : 'visualizacao',
        status: nextStatus,
      },
    });
    handleCloseModal();
  };

  // Handler para mudan�as em campos de pagamento
  const handlePaymentFieldChange = (field, value) => {
    const paymentMethod = pagamentoData.payment_method;
    const methodKey = paymentMethod.toLowerCase();

    setPagamentoData((prev) => ({
      ...prev,
      [methodKey]: {
        ...prev[methodKey],
        [field]: value,
      },
    }));
  };

  // Handler para c�lculo de troco (dinheiro)
  const handleCalculateChange = (sent, value) => {
    const amount = Math.max(0, effectiveAppointmentValue - effectiveDiscountAmount);
    const sentAmount = parseFloat(sent) || 0;
    const change = sentAmount - amount;

    setPagamentoData((prev) => ({
      ...prev,
      dinheiro: {
        ...prev.dinheiro,
        value_received: sent,
        change: change > 0 ? change.toFixed(2) : '0.00',
      },
    }));
  };

  const splitAmountByInstallments = (total, installments) => {
    const count = Math.max(1, Number.parseInt(installments || '1', 10) || 1);
    const regularAmount = Number((Number(total || 0) / count).toFixed(2));
    const firstAmount = Number((Number(total || 0) - (regularAmount * (count - 1))).toFixed(2));
    return Array.from({ length: count }, (_, index) => (index === 0 ? firstAmount : regularAmount));
  };

  const getCardLast4 = (payment) => {
    const digits = String(payment.card_last4 || payment.card_last_digits || payment.card_number || '').replace(/\D/g, '');
    return digits.length >= 4 ? digits.slice(-4) : null;
  };

  const getCardPaymentsForFinancialSync = () => {
    if (enableMultiplePayments) {
      return pagamentoSplits
        .filter((split) => split.payment_method === 'CARTAO' && Number(split.value || 0) > 0)
        .map((split) => ({
          ...split,
          amount: Number(split.value || 0),
          installments: split.installments || '1',
          card_brand: split.card_brand || cardProcessorData.card_brand || 'VISA',
          processor_id: split.processor_id || cardProcessorData.processor_id || null,
          settlement_type: split.settlement_type || cardProcessorData.settlement_type || null,
        }));
    }

    if (pagamentoData.payment_method !== 'CARTAO') {
      return [];
    }

    const cardData = pagamentoData.cartao || {};
    const discountAmount = Number(effectiveDiscountAmount || 0);
    const amount = Math.max(0, Number(effectiveAppointmentValue || 0) - discountAmount);
    if (amount <= 0) {
      return [];
    }

    return [{
      ...cardData,
      payment_method: 'CARTAO',
      amount,
      value: amount,
      installments: cardData.card_installments || '1',
      card_brand: cardData.card_brand || cardProcessorData.card_brand || 'VISA',
      card_last4: cardData.card_last_digits || null,
      card_holder: cardData.card_holder_name || null,
      processor_id: cardProcessorData.processor_id || null,
      settlement_type: cardProcessorData.settlement_type || null,
      payment_due_date: getDatePlusDays(30),
      card_installment_dates: '',
      observation: cardData.notes || '',
    }];
  };

  const cleanupCardReceivablesForAppointment = async (appointmentId) => {
    const { data: existingReceivables, error: selectError } = await supabase
      .from('ar_invoices')
      .select('id')
      .eq('appointment_id', appointmentId)
      .eq('payment_method', 'CARTAO');

    if (selectError) {
      throw new Error(selectError.message);
    }

    const receivableIds = (existingReceivables || []).map((item) => item.id).filter(Boolean);
    if (!receivableIds.length) {
      return;
    }

    await supabase
      .from('financial_transactions')
      .delete()
      .eq('origin_module', 'accounts_receivable')
      .in('origin_id', receivableIds);

    const { error: deleteError } = await supabase
      .from('ar_invoices')
      .delete()
      .in('id', receivableIds);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  };

  const syncCardInstallmentsToFinancial = async ({ appointmentId, patientId }) => {
    if (!appointmentId || !clinicId) {
      return;
    }

    const cardPayments = getCardPaymentsForFinancialSync();
    await cleanupCardReceivablesForAppointment(appointmentId);

    if (!cardPayments.length) {
      return;
    }

    const patientName = agendamentoData.patientName || selectedPatient?.patientName || selectedPatient?.name || cadastralData.name || 'Paciente nao informado';
    const serviceName = appointmentServices.map((service) => service.service_name || service.name).filter(Boolean).join(', ')
      || services.find((service) => service.id === agendamentoData.serviceId)?.name
      || 'Servico do agendamento';
    const feePercent = Number(cardProcessorData.fee_percent || 0);

    for (const [paymentIndex, payment] of cardPayments.entries()) {
      const installments = Math.max(1, Number.parseInt(payment.installments || '1', 10) || 1);
      const installmentAmounts = splitAmountByInstallments(payment.amount || payment.value || 0, installments);
      const installmentDates = String(payment.card_installment_dates || '')
        .split('|')
        .filter(Boolean);
      const firstDueDate = payment.payment_due_date || installmentDates[0] || getDatePlusDays(30);

      for (let index = 0; index < installments; index += 1) {
        const dueDate = installmentDates[index] || buildInstallmentDates(firstDueDate, installments)[index];
        const amount = installmentAmounts[index] || 0;
        const feeAmount = feePercent > 0 ? Number(((amount * feePercent) / 100).toFixed(2)) : 0;

        await createReceivable(clinicId, {
          appointment_id: appointmentId,
          patient_id: patientId || agendamentoData.patientId || null,
          patient_name: patientName,
          description: `Agendamento - Cartao ${index + 1}/${installments} - ${patientName}`,
          service_description: serviceName,
          amount,
          gross_amount: amount,
          net_value: Math.max(0, Number((amount - feeAmount).toFixed(2))),
          due_date: dueDate,
          invoice_date: new Date().toISOString().split('T')[0],
          competency_date: agendamentoData.date || dueDate,
          status: 'open',
          payment_method: 'CARTAO',
          origem: 'appointment_card_installments',
          professional_id: agendamentoData.professionalId || null,
          payer_type: 'particular',
          payer_id: agendamentoData.payerId || null,
          chart_account_id: faturamentoData?.plano_contas_id || pagamentoData?.plano_contas_id || null,
          plano_contas_id: faturamentoData?.plano_contas_id || pagamentoData?.plano_contas_id || null,
          processor_id: payment.processor_id || cardProcessorData.processor_id || null,
          card_brand: payment.card_brand || cardProcessorData.card_brand || null,
          card_last4: getCardLast4(payment),
          settlement_type: payment.settlement_type || cardProcessorData.settlement_type || null,
          fee_percent: feePercent || null,
          fee_amount: feeAmount,
          total_parcelas: 1,
          payment_split: [{
            method: 'CARTAO',
            amount,
            gross_amount: amount,
            installment_number: index + 1,
            installments,
            due_date: dueDate,
            card_brand: payment.card_brand || cardProcessorData.card_brand || null,
            card_last4: getCardLast4(payment),
            processor_id: payment.processor_id || cardProcessorData.processor_id || null,
            settlement_type: payment.settlement_type || cardProcessorData.settlement_type || null,
            fee_amount: feeAmount,
          }],
          metadata: {
            source: 'appointment_card_installments',
            appointment_id: appointmentId,
            payment_index: paymentIndex + 1,
            installment_number: index + 1,
            installments,
            card: {
              brand: payment.card_brand || cardProcessorData.card_brand || null,
              last4: getCardLast4(payment),
              holder: payment.card_holder || payment.card_holder_name || null,
              processor_id: payment.processor_id || cardProcessorData.processor_id || null,
              settlement_type: payment.settlement_type || cardProcessorData.settlement_type || null,
            },
          },
          notes: payment.observation || payment.notes || null,
        });
      }
    }
  };

  // ? Handler para fechar a modal
  const handleCloseModal = () => {
    console.log('?? Fechando modal...');
    setProfessionalIdExplicitlySet(false); // ? Resetar flag ao fechar
    initialSlotProfessionalIdRef.current = null; // ?? Resetar ref ao fechar
    setSelectedPatient(null); // Limpar paciente selecionado
    onClose();
  };

  // ?? SALVAR APENAS OS DADOS (sem criar atendimento)
  const handleSaveDataOnly = async () => {
    const apt = finalAppointment || appointment;

    console.log('?? [handleSaveDataOnly] Verificando agendamento:', {
      apt_id: apt?.id,
      finalAppointment_id: finalAppointment?.id,
      appointment_id: appointment?.id,
    });

    // ?? DEBUG: Mostrar estado dos servi�os ANTES de salvar
    console.log('?? [DEBUG SERVI�OS ANTES DE SALVAR]', {
      appointmentServices_length: appointmentServices.length,
      appointmentServices_data: appointmentServices.map((s) => ({
        id: s.id,
        service_id: s.service_id,
        service_name: s.service_name,
        value: s.value,
        quantity: s.quantity,
        status: s.status,
      })),
    });

    if (!apt?.id) {
      alert('? Nenhum agendamento carregado para salvar');
      console.error('? apt?.id vazio!', { apt, finalAppointment, appointment });
      return;
    }

    // ?? VALIDA��O: Profissional � obrigat�rio
    if (!agendamentoData.professionalId) {
      alert('? Selecione um profissional antes de salvar.');
      console.warn('? professionalId vazio');
      return;
    }

    // ? PHASE 3: VALIDA��O DE AGENDAMENTO
    if (agendamentoData.professionalId && agendamentoData.date && agendamentoData.time) {
      const validationResult = await validateAppointmentBeforeSave(
        clinicId,
        {
          professionalId: agendamentoData.professionalId,
          roomId: agendamentoData.roomId,
          scheduledDate: agendamentoData.date,
          scheduledTime: agendamentoData.time,
          endTime: agendamentoData.endTime,
        }
      );

      if (!validationResult.isValid) {
        const errorMsg = validationResult.errors.join('\n');
        alert(`? Erro de valida��o:\n\n${errorMsg}`);
        console.warn('? Validation errors:', validationResult.errors);
        return;
      }

      if (validationResult.warnings.length > 0) {
        console.warn('?? Validation warnings:', validationResult.warnings);
      }
    }

    console.log('? Profissional OK:', agendamentoData.professionalId);

    // ?? VALIDA��O: Verificar se profissional foi selecionado mas n�o tem conv�nios
    if (agendamentoData.professionalId && filteredPayers.length === 0 && !agendamentoData.payerId) {
      alert(
        '? Este profissional n�o possui conv�nios vinculados. Vincule pelo menos um conv�nio antes de atualizar.',
      );
      console.warn('? Profissional sem conv�nios');
      return;
    }

    // ?? VALIDA��O: Se profissional tem conv�nios, conv�nio deve ser obrigat�rio
    if (agendamentoData.professionalId && filteredPayers.length > 0 && !agendamentoData.payerId) {
      alert('? Conv�nio � obrigat�rio para este profissional.');
      console.warn('? Conv�nio obrigat�rio mas n�o selecionado', {
        filteredPayers_length: filteredPayers.length,
        payerId: agendamentoData.payerId,
      });
      return;
    }

    // ?? VALIDA��O: Se profissional foi selecionado, conv�nio DEVE estar selecionado
    if (agendamentoData.professionalId && !agendamentoData.payerId) {
      alert('? Por favor, selecione um conv�nio.');
      console.warn('? Conv�nio n�o selecionado');
      return;
    }

    console.log('? Todas as valida��es passaram! Iniciando salvamento...');

    try {
      setLoading(true);
      // ?? DEBUG ANTES DO SAVE
      console.log('?? DEBUG SAVE (handleSaveDataOnly)', {
        payerId: agendamentoData.payerId,
        roomId: agendamentoData.roomId,
        payerIdType: typeof agendamentoData.payerId,
        roomIdType: typeof agendamentoData.roomId,
        payerIdEmpty: !agendamentoData.payerId,
        roomIdEmpty: !agendamentoData.roomId,
      });

      console.log('?? [SAVE DATA ONLY] Iniciando salvamento...', { id: apt.id });
      console.log(
        '   ?? [LIBERA��O] liberacaoData COMPLETO:',
        JSON.stringify(liberacaoData, null, 2),
      );
      console.log('   ?? [LIBERA��O] card_number:', liberacaoData.card_number);
      console.log('   ?? [LIBERA��O] auth_number:', liberacaoData.auth_number);
      console.log('   ?? [LIBERA��O] authorized:', liberacaoData.authorized);
      console.log('   agendamentoData:', agendamentoData);
      console.log('   pagamentoData.payment_method:', pagamentoData.payment_method);
      console.log('   pagamentoData.plano_contas_id:', pagamentoData.plano_contas_id);
      console.log('   faturamentoData.plano_contas_id:', faturamentoData?.plano_contas_id);
      console.log('   faturamentoData.convenio_id:', faturamentoData?.convenio_id);
      console.log('   faturamentoData:', faturamentoData);

      // ?? DETERMINAR A ORIGEM CORRETA DO PLANO DE CONTAS
      // Se for particular, usar pagamentoData; sen�o, usar faturamentoData
      const isParticular = checkIsParticular(agendamentoData.payerId);
      const planoContasValue = isParticular
        ? pagamentoData?.plano_contas_id || null
        : faturamentoData?.plano_contas_id || null;

      // ?? Determinar se desconto foi solicitado ou removido
      const discountValue = pagamentoData.discount ? parseFloat(pagamentoData.discount) : 0;
      const originalDiscountValue = apt?.discount ? parseFloat(apt.discount) : 0;
      // ? CORRIGIDO: Usar valores de pagamentoData (estado atual) ao inv�s de appointment (banco de dados)
      const currentDiscountRequestedAt =
        pagamentoData.discount_requested_at || apt?.discount_requested_at;
      const currentDiscountRequestedBy =
        pagamentoData.discount_requested_by || apt?.discount_requested_by;

      // L�gica para salvar dados de solicita��o (mesma que em handleSaveChanges)
      let discountRequestData = {};

      if (discountValue > 0) {
        // ? Se houver desconto, sempre usar os valores do estado (que podem ter sido atualizados pelo bot�o)
        discountRequestData = {
          discount_requested_by: currentDiscountRequestedBy || null,
          discount_requested_at: currentDiscountRequestedAt || null,
          discount_requested_by_name:
            pagamentoData.discount_requested_by_name || user?.email || null, // ? NOVO: Armazena nome do usu�rio
        };
      } else {
        discountRequestData = {
          discount_requested_by: null,
          discount_requested_at: null,
          discount_requested_by_name: null,
        };
      }

      const updateData = {
        patient_id: agendamentoData.patientId || null,
        status: agendamentoData.status,
        scheduled_date: agendamentoData.date,
        scheduled_time: agendamentoData.time,
        duration: agendamentoData.duration,
        professional_id: agendamentoData.professionalId || null,
        service_id: agendamentoData.serviceId || null,
        payer_id: agendamentoData.payerId || payers?.[0]?.id || null,
        room_id: agendamentoData.roomId || null,
        value: effectiveAppointmentValue,
        discount: discountValue,
        discount_reason: pagamentoData.discount_reason || null,
        ...discountRequestData,
        discount_authorized_by: pagamentoData.discount_authorized_by || null,
        discount_authorized_by_name: pagamentoData.discount_authorized_by_name || null,
        discount_authorized_at: pagamentoData.discount_authorized_at || null,
        discount_rejected_by: pagamentoData.discount_rejected_by || null,
        discount_rejected_by_name: pagamentoData.discount_rejected_by_name || null,
        discount_rejected_at: pagamentoData.discount_rejected_at || null,
        discount_rejected_amount: pagamentoData.discount_rejected_amount || 0,
        discount_observation: pagamentoData.discount_observation || null,
        notes: agendamentoData.notes,
        payment_method: pagamentoData.payment_method || null,
        convenio_id: faturamentoData?.convenio_id || null,
        plano_contas_id: planoContasValue,
        // ? M�LTIPLOS PAGAMENTOS
        payment_splits: getPaymentSplitsPayload(),
        // ??? DADOS DE LIBERA��O
        card_number: liberacaoData.card_number || null,
        authorization_number: liberacaoData.auth_number || null,
        authorization_expiry: liberacaoData.auth_expiry || null,
        authorization_verified: liberacaoData.authorized === true,
      };

      console.log('   updateData a enviar:', JSON.stringify(updateData, null, 2));

      // ? Normalizar strings vazias em null para campos UUID

      // ??? DEBUG CARD_NUMBER
      console.log('?? [CARD_NUMBER DEBUG ANTES DE ENVIAR]');
      console.log('   liberacaoData.card_number:', liberacaoData.card_number);
      console.log('   updateData.card_number:', updateData.card_number);
      console.log('   updateData.authorization_number:', updateData.authorization_number);
      console.log('   updateData.authorization_verified:', updateData.authorization_verified);

      console.log('?? [PLANO_CONTAS DEBUG]', {
        isParticular,
        source: isParticular ? 'pagamentoData (Particular)' : 'faturamentoData (Insurance)',
        valor: planoContasValue,
        pagamentoData_plano_contas_id: pagamentoData?.plano_contas_id,
        faturamentoData_plano_contas_id: faturamentoData?.plano_contas_id,
      });

      if (agendamentoData.endTime?.trim()) {
        updateData.end_time = agendamentoData.endTime;
      }

      console.log('?? Enviando updateData para API:', JSON.stringify(updateData, null, 2));
      const result = await updateAppointment(apt.id, updateData);

      // VERIFICAR O QUE RETORNOU DO UPDATE
      console.log('? API retornou:', result);
      console.log('?? [CARD_NUMBER DEBUG AP�S UPDATE]');
      console.log('   result.card_number:', result?.card_number);
      console.log('   result.authorization_number:', result?.authorization_number);

      console.log('   Valores espec�ficos enviados:');
      console.log('   - payment_method:', updateData.payment_method);
      console.log('   - convenio_id:', updateData.convenio_id);
      console.log('   - plano_contas_id:', updateData.plano_contas_id);
      console.log('   - payer_id:', updateData.payer_id);
      console.log('   - room_id:', updateData.room_id);
      console.log('   - card_number:', updateData.card_number);
      console.log('   - authorization_number:', updateData.authorization_number);

      // ?? SALVAR DADOS DE FATURAMENTO (incluindo billing_data JSON)
      if (faturamentoData && (faturamentoData.guide_number || faturamentoData.authorized_value)) {
        try {
          console.log('?? Salvando dados de faturamento...', faturamentoData);

          // ?? Construir objeto billing_data com todos os campos
          const billingData = {
            guide_type: faturamentoData.guide_type || 'consulta',
            code_type: faturamentoData.code_type || 'tuss',
            procedure_code: faturamentoData.procedure_code || '',
            service_date: faturamentoData.service_date || '',
            service_place: faturamentoData.service_place || '',
            requesting_doctor: faturamentoData.requesting_doctor || '',
            responsible_doctor: faturamentoData.responsible_doctor || '',
            estimated_value: parseFloat(faturamentoData.estimated_value || '0').toFixed(2),
            authorized_value: parseFloat(faturamentoData.authorized_value || '0').toFixed(2),
            notes: faturamentoData.notes || '',
          };

          console.log('?? billing_data a ser salvo:', billingData);

          await supabase
            .from('appointments')
            .update({
              // ?? DADOS DE LIBERA��O
              card_number: liberacaoData.card_number || null,
              guide_number: faturamentoData.guide_number || null,
              authorization_number: faturamentoData.authorization_number || null,
              authorization_expiry: faturamentoData.auth_expiry || null,
              authorization_verified: faturamentoData.authorized === true,
              billing_data: billingData, // ? SALVAR JSON ESTRUTURADO
            })
            .eq('id', apt.id);
          console.log('? Dados de faturamento salvos (incluindo billing_data)');
        } catch (billingErr) {
          console.warn('?? Erro ao salvar dados de faturamento:', billingErr);
        }
      }

      // ?? RECARREGAR AGENDAMENTO DO BANCO PARA REFLETIR AS MUDAN�AS
      try {
        console.log('?? Recarregando agendamento do banco...');
        const { data: refreshedAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', apt.id)
          .maybeSingle();

        if (fetchError) {
          console.error('? Erro ao recarregar:', fetchError);
        } else if (!refreshedAppointment) {
          console.warn('?? Agendamento n�o encontrado ap�s atualiza��o');
        } else if (refreshedAppointment) {
          console.log('?? Agendamento recarregado:', {
            plano_contas_id: refreshedAppointment.plano_contas_id,
            convenio_id: refreshedAppointment.convenio_id,
            payment_method: refreshedAppointment.payment_method,
          });

          // Atualizar faturamentoData com os valores recarregados
          setFaturamentoData((prev) => ({
            ...prev,
            plano_contas_id: refreshedAppointment.plano_contas_id || '',
            convenio_id: refreshedAppointment.convenio_id || '',
          }));

          // Atualizar pagamentoData
          setPagamentoData((prev) => ({
            ...prev,
            payment_method: refreshedAppointment.payment_method || 'DINHEIRO',
            plano_contas_id: refreshedAppointment.plano_contas_id || '',
          }));
        }
      } catch (reloadErr) {
        console.warn('?? Erro ao recarregar agendamento:', reloadErr);
      }

      // ?? SINCRONIZAR M�LTIPLOS SERVI�OS (se houver)
      if (appointmentServices.length > 0) {
        try {
          console.log('?? [Sincronizando servi�os] Come�ando sincroniza��o', {
            appointmentServices_length: appointmentServices.length,
            apt_id: apt.id,
            appointmentServices: appointmentServices.map((s, idx) => ({
              idx,
              id: s.id,
              service_id: s.service_id,
              service_name: s.service_name,
              value: s.value,
              discount: s.discount,
              quantity: s.quantity,
              status: s.status,
            })),
          });

          const result = await syncAppointmentServices(apt.id, appointmentServices);

          console.log('? Servi�os sincronizados com sucesso!', {
            services_count: result?.length,
            result,
          });
        } catch (servicesErr) {
          console.error('? Erro ao sincronizar servi�os:', servicesErr);
          console.error('   Stack:', servicesErr.stack);
          // N�o bloquear o salvamento se os servi�os falharem
          alert(
            'Agendamento salvo, mas houve erro ao sincronizar os servicos: ' +
              servicesErr.message,
          );
        }
      } else {
        console.log('?? [Sincronizando servi�os] Nenhum servi�o para sincronizar', {
          appointmentServices_length: appointmentServices.length,
        });
      }

      console.log('? Dados salvos com sucesso!');
      alert('? Dados do agendamento salvos com sucesso!');
      setLoading(false);
    } catch (err) {
      console.error('? Erro ao salvar dados:', err);
      alert(`? Erro ao salvar: ${err.message}`);
      setLoading(false);
    }
  };

  // ?? Registrar desconto (se houver)
  const registerDiscountIfNeeded = async (appointmentId) => {
    const discount = parseFloat(pagamentoData.discount || 0);
    if (discount <= 0 || !pagamentoData.discount_reason) {
      return null;
    }

    try {
      console.log('?? Registrando desconto...', { appointment: appointmentId, amount: discount });

      const { data, error } = await supabase
        .from('discount_authorizations')
        .insert([
          {
            clinic_id: clinicId,
            appointment_id: appointmentId,
            patient_id: agendamentoData.patientId || null,
            accounts_receivable_id: null,
            discount_amount: discount,
            discount_reason: pagamentoData.discount_reason,
            discount_observation: pagamentoData.discount_observation || '',
            requested_by: user?.id,
            status: 'pending',
          },
        ])
        .select()
        .maybeSingle();

      if (error) {
        console.error('? Erro ao registrar desconto:', error);
        throw error;
      }

      console.log('? Desconto registrado com sucesso:', data.id);
      return data;
    } catch (err) {
      console.error('? Erro ao registrar desconto:', err);
      throw err;
    }
  };

  // Handle saving appointment changes
  const handleSaveChanges = async () => {
    if (saveChangesPromiseRef.current) {
      console.warn('⚠️ Salvamento de agendamento já em andamento. Reutilizando operação atual.');
      return saveChangesPromiseRef.current;
    }

    const savePromise = (async () => {
    try {
  setLoading(true);
      // ? DEBUG ETAPA 6: Verificar formData
      console.log('-----------------------------------------------');
      console.log('?? [ETAPA 6] handleSaveChanges DISPARADO');
      console.log('-----------------------------------------------');
      console.log('?? formData (hook state):', formData);
      console.log('?? agendamentoData (modal state):', {
        payer_id: agendamentoData.payerId,
        room_id: agendamentoData.roomId,
        professional_id: agendamentoData.professionalId,
        service_id: agendamentoData.serviceId,
        scheduled_date: agendamentoData.date,
        scheduled_time: agendamentoData.time,
        value: agendamentoData.value,
      });
      console.log('-----------------------------------------------');

      // ??? DEBUG ANTES DO SAVE
      console.log('?? DEBUG SAVE (handleSaveChanges)', {
        payerId: agendamentoData.payerId,
        roomId: agendamentoData.roomId,
        payerIdType: typeof agendamentoData.payerId,
        roomIdType: typeof agendamentoData.roomId,
        payerIdEmpty: !agendamentoData.payerId,
        roomIdEmpty: !agendamentoData.roomId,
      });

      // VALIDACAO: Profissional eh obrigatorio
      if (!agendamentoData.professionalId) {
        alert('Selecione um profissional antes de salvar.');
        return;
      }

      // VALIDACAO: Se profissional tem convenios E � modo de EDI��O, convenio deve ser obrigatorio
      // Para modo NEW (cria��o), permitir avan�ar sem conv�nio (pode preencher depois)
      if (mode === 'edit' && agendamentoData.professionalId && filteredPayers.length > 0 && !agendamentoData.payerId) {
        alert('Convenio eh obrigatorio para este profissional.');
        return;
      }

      // VALIDACAO: Data e hora sao obrigatorios
      if (!agendamentoData.date) {
        alert('Data eh obrigatoria. Por favor, selecione uma data no calendario.');
        return;
      }

      if (!agendamentoData.time) {
        alert('Horario eh obrigatorio. Por favor, selecione um horario.');
        return;
      }

      const apt = finalAppointment || appointment;
      console.log('?? [SAVE INITIATED]', {
        mode,
        appointmentId: apt?.id,
        currentStatus: agendamentoData.status,
      });

      let appointmentId = apt?.id;
      let patientId = apt?.patient_id;

      // ?? MODO NOVO: Criar novo agendamento
      if (mode === 'new') {
        console.log('?? Criando novo agendamento...', {
          data: agendamentoData.date,
          tempo: agendamentoData.time,
        });

        let finalPatientId = agendamentoData.patientId || null;

        // ?? SE NENHUM PACIENTE SELECIONADO, CRIAR NOVO PACIENTE COM DADOS B�SICOS
        // ? FIX: Garantir que N�O vai criar novo paciente se um paciente foi selecionado mas patientId ficou vazio
        // O patientId deve vir preenchido quando selectedPatient est� setado
        if (!finalPatientId && agendamentoData.patientName?.trim() && !selectedPatient) {
          console.log('?? Criando novo paciente automaticamente...', {
            name: agendamentoData.patientName,
            phone: agendamentoData.phone,
            birthdate: cadastralData.birthdate,
          });

          const newPatientData = {
            name: agendamentoData.patientName,
            phone: agendamentoData.phone,
            birthdate: cadastralData.birthdate || null,
            // Deixar os outros campos em branco para preenchimento posterior
          };

          const newPatient = await createPatient(clinicId, newPatientData);
          console.log('? Novo paciente criado!', newPatient);
          finalPatientId = newPatient.id;
        } else if (selectedPatient && !finalPatientId) {
          // ?? AVISO: Se um paciente foi selecionado mas patientId ficou vazio, isso � um erro
          console.warn('?? [AVISO] Paciente selecionado mas patientId est� vazio!', {
            selectedPatient,
            agendamentoData,
          });
          throw new Error(
            'Paciente selecionado mas ID n�o foi preenchido. Por favor, selecione o paciente novamente.',
          );
        }

        // ?? Determinar se desconto foi solicitado (novo desconto)
        const discountValue = pagamentoData.discount ? parseFloat(pagamentoData.discount) : 0;
        const discountRequested =
          discountValue > 0
            ? {
                discount_requested_by: user?.id || null,
                discount_requested_at: new Date().toISOString(),
                discount_requested_by_name: user?.user_metadata?.name || user?.email || null, // ? NOVO: Armazenar nome/email do usu�rio
              }
            : {
                discount_requested_by: null,
                discount_requested_at: null,
                discount_requested_by_name: null,
              };

        const newAppointmentData = {
          clinic_id: clinicId,
          patient_id: finalPatientId,
          patient_type: finalPatientId ? 'PATIENT' : 'LEAD',
          lead_name: !finalPatientId ? agendamentoData.patientName : null,
          lead_phone: !finalPatientId ? agendamentoData.phone : null,
          professional_id: agendamentoData.professionalId || null,
          service_id: appointmentServices[0]?.service_id || agendamentoData.serviceId || null,
          payer_id: agendamentoData.payerId || payers?.[0]?.id || null,
          room_id: agendamentoData.roomId || null,
          scheduled_date: agendamentoData.date,
          scheduled_time: agendamentoData.time,
          end_time: agendamentoData.endTime?.trim() ? agendamentoData.endTime : null,
          status: 'scheduled',
          notes: agendamentoData.notes,
          value: effectiveAppointmentValue,
          discount: discountValue,
          discount_reason: pagamentoData.discount_reason || null,
          ...discountRequested,
          discount_observation: pagamentoData.discount_observation || null,
          duration: agendamentoData.duration,
          payment_method: pagamentoData.payment_method || null,
          convenio_id: faturamentoData?.convenio_id || null,
          plano_contas_id:
            faturamentoData?.plano_contas_id || pagamentoData?.plano_contas_id || null,
          payment_splits: getPaymentSplitsPayload(),
          // ?? Dados de processador de cart�o (se aplic�vel)
          processor_id: cardProcessorData.processor_id || null,
          card_brand: cardProcessorData.card_brand || null,
          settlement_type: cardProcessorData.settlement_type || null,
          fee_percent: cardProcessorData.fee_percent || null,
          fee_amount: cardProcessorData.fee_amount || null,
          net_amount: cardProcessorData.net_amount || null,
        };

        const createdAppointment = await createAppointment(newAppointmentData);
        console.log('? Novo agendamento criado com sucesso!', createdAppointment);

        appointmentId = createdAppointment.id;
        patientId = createdAppointment.patient_id;
      }
      // ?? MODO EDITAR: Atualizar agendamento existente
      else if (mode === 'edit' && appointmentId) {
        console.log('?? Atualizando agendamento...', { id: appointmentId });

        const calcularEndTime = (startTime, durationMinutes = 30) => {
          if (!startTime) {
            return null;
          }
          const startMinutes = timeToMinutes(startTime);
          const endMinutes = startMinutes + (durationMinutes || 30);
          return minutesToTime(endMinutes);
        };

        // ?? Determinar se desconto foi solicitado ou removido
        const discountValue = pagamentoData.discount ? parseFloat(pagamentoData.discount) : 0;
        const originalDiscountValue = apt?.discount ? parseFloat(apt.discount) : 0;
        // ? CORRIGIDO: Usar valores de pagamentoData (estado atual) ao inv�s de appointment (banco de dados)
        const currentDiscountRequestedAt =
          pagamentoData.discount_requested_at || apt?.discount_requested_at;
        const currentDiscountRequestedBy =
          pagamentoData.discount_requested_by || apt?.discount_requested_by;
        const currentDiscountRequestedByName =
          pagamentoData.discount_requested_by_name || apt?.discount_requested_by_name;

        // L�gica para salvar dados de solicita��o (mesma que em handleSaveDataOnly)
        let discountRequestData = {};

        if (discountValue > 0) {
          // ? Se houver desconto, sempre usar os valores do estado (que podem ter sido atualizados pelo bot�o)
          discountRequestData = {
            discount_requested_by: currentDiscountRequestedBy || null,
            discount_requested_at: currentDiscountRequestedAt || null,
            discount_requested_by_name:
              currentDiscountRequestedByName || user?.user_metadata?.name || user?.email || null, // ? NOVO: Armazena nome do usu�rio
          };
          console.log('?? [DESCONTO ATIVO] Salvando dados de solicita��o:', discountRequestData);
        } else {
          // Desconto removido: limpar dados de solicita��o
          discountRequestData = {
            discount_requested_by: null,
            discount_requested_at: null,
            discount_requested_by_name: null,
          };
          console.log('?? [DESCONTO REMOVIDO] Limpando dados de solicita��o');
        }

        // ? Valida��o de timezone antes de salvar
        if (!isValidLocalDateTime(agendamentoData.date, agendamentoData.time)) {
          console.error('? [TIMEZONE] Data ou hora inv�lida!', {
            date: agendamentoData.date,
            time: agendamentoData.time,
          });
          alert('Data ou hora inv�lida. Por favor, verifique.');
          return;
        }

        const payload = {
          scheduled_date: agendamentoData.date,
          scheduled_time: agendamentoData.time,
          end_time: calcularEndTime(agendamentoData.time, agendamentoData.duration),
          duration: agendamentoData.duration || 30,

          patient_id: agendamentoData.patientId || null,
          professional_id: agendamentoData.professionalId || null,
          service_id: agendamentoData.serviceId || null,

          payer_id: agendamentoData.payerId || payers?.[0]?.id || null,
          room_id: agendamentoData.roomId || null,

          value: effectiveAppointmentValue,
          discount: discountValue,
          discount_reason: pagamentoData.discount_reason || null,
          ...discountRequestData,
          discount_authorized_by: pagamentoData.discount_authorized_by || null,
          discount_authorized_by_name: pagamentoData.discount_authorized_by_name || null,
          discount_authorized_at: pagamentoData.discount_authorized_at || null,
          discount_rejected_by: pagamentoData.discount_rejected_by || null,
          discount_rejected_by_name: pagamentoData.discount_rejected_by_name || null,
          discount_rejected_at: pagamentoData.discount_rejected_at || null,
          discount_rejected_amount: pagamentoData.discount_rejected_amount || 0,
          discount_observation: pagamentoData.discount_observation || null,

          payment_method: pagamentoData.payment_method || null,
          payment_splits: getPaymentSplitsPayload(),

          status: agendamentoData.status,
          notes: agendamentoData.notes || null,
          // ?? Dados de processador de cart�o (se aplic�vel)
          processor_id: cardProcessorData.processor_id || null,
          card_brand: cardProcessorData.card_brand || null,
          settlement_type: cardProcessorData.settlement_type || null,
          fee_percent: cardProcessorData.fee_percent || null,
          fee_amount: cardProcessorData.fee_amount || null,
          net_amount: cardProcessorData.net_amount || null,
        };

        console.log('?? [TIMEZONE] Valida��o OK - salvando agendamento');
        console.log('?? PAYLOAD COMPLETO PARA UPDATE:', payload);
        console.log('?? Campos do payload:', Object.keys(payload));
        console.log('   - date:', payload.scheduled_date);
        console.log('   - time:', payload.scheduled_time);
        console.log('   - payer_id:', payload.payer_id);
        console.log('   - room_id:', payload.room_id);
        console.log('   - value:', payload.value);
        console.log('   - duration:', payload.duration);

        const updateData = payload;

        const result = await updateAppointment(appointmentId, updateData);

        console.log('? Agendamento atualizado com sucesso!');
        console.log('?? [DEBUG] Resposta retornada:', JSON.stringify(result, null, 2));
        console.log('   Valores espec�ficos que foram atualizados:');
        console.log('   - payer_id:', updateData.payer_id);
        console.log('   - room_id:', updateData.room_id);
        console.log('   - professional_id:', updateData.professional_id);
        console.log('   - service_id:', updateData.service_id);

        // ? VALIDA��O P�S-UPDATE: Confirmar que dados foram salvos
        if (updateData.payer_id || updateData.room_id || updateData.scheduled_time) {
          try {
            console.log('?? [VALIDA��O] Verificando se dados foram salvos no banco...');
            const validation = await validateAppointmentSaved(appointmentId, {
              payer_id: updateData.payer_id,
              room_id: updateData.room_id,
              scheduled_time: updateData.scheduled_time,
            });

            console.log('? [VALIDA��O] Resultado:', JSON.stringify(validation, null, 2));

            if (validation.matches.payer_id === false) {
              console.error('? ALERTA: payer_id N�O foi salvo no banco!', {
                esperado: updateData.payer_id,
                noSistema: validation.dbValues.payer_id,
              });
            }
            if (validation.matches.room_id === false) {
              console.error('? ALERTA: room_id N�O foi salvo no banco!', {
                esperado: updateData.room_id,
                noSistema: validation.dbValues.room_id,
              });
            }
            if (validation.matches.scheduled_time === false) {
              console.error('? ALERTA: scheduled_time N�O foi salvo no banco!', {
                esperado: updateData.scheduled_time,
                noSistema: validation.dbValues.scheduled_time,
              });
            }
          } catch (validationError) {
            console.warn('?? [VALIDA��O] N�o foi poss�vel validar dados salvos:', validationError);
          }
        }

        // ??? SALVAR DADOS DE FATURAMENTO (se houver)
        if (faturamentoData && (faturamentoData.guide_number || faturamentoData.authorized_value)) {
          console.log('?? Salvando dados de faturamento...', faturamentoData);
          try {
            // ?? Construir objeto billing_data com todos os campos
            const billingData = {
              guide_type: faturamentoData.guide_type || 'consulta',
              code_type: faturamentoData.code_type || 'tuss',
              procedure_code: faturamentoData.procedure_code || '',
              service_date: faturamentoData.service_date || '',
              service_place: faturamentoData.service_place || '',
              requesting_doctor: faturamentoData.requesting_doctor || '',
              responsible_doctor: faturamentoData.responsible_doctor || '',
              estimated_value: parseFloat(faturamentoData.estimated_value || '0').toFixed(2),
              authorized_value: parseFloat(faturamentoData.authorized_value || '0').toFixed(2),
              notes: faturamentoData.notes || '',
            };

            await supabase
              .from('appointments')
              .update({
                // ?? DADOS DE LIBERA��O
                card_number: liberacaoData.card_number || null,
                guide_number: faturamentoData.guide_number || null,
                authorization_number: faturamentoData.authorization_number || null,
                authorization_expiry: faturamentoData.auth_expiry || null,
                authorization_verified: faturamentoData.authorized === true,
                billing_data: billingData, // ? SALVAR JSON ESTRUTURADO
                billing_notes: faturamentoData.service_name || null,
              })
              .eq('id', appointmentId);
            console.log('? Dados de faturamento salvos com sucesso!');
          } catch (billingErr) {
            console.error('?? Erro ao salvar dados de faturamento:', billingErr);
            // N�o bloqueia o salvamento do agendamento
          }
        }
      }

      // ? SE FOR RECEP��O, ATUALIZAR DADOS DO PACIENTE
      if (mode === 'reception' && patientId) {
        console.log('?? Atualizando dados do paciente em modo recep��o:', patientId);
        try {
          const patientUpdateData = {
            name: cadastralData.name,
            document_id: cadastralData.document_id,
            birthdate: cadastralData.birthdate || null,
            gender: cadastralData.gender || null,
            phone: cadastralData.phone,
            cell_phone: cadastralData.cell_phone,
            email: cadastralData.email,
            street: cadastralData.street,
            number: cadastralData.number,
            neighborhood: cadastralData.neighborhood,
            city: cadastralData.city,
            state: cadastralData.state,
            zip_code: cadastralData.zip_code,
          };

          await updatePatient(patientId, patientUpdateData);
          window.location.reload();
          console.log('? Dados do paciente atualizados com sucesso!');
        } catch (patientErr) {
          console.error('?? Erro ao atualizar paciente:', patientErr);
          // N�o bloqueia o salvamento
        }
      }

      // ??? SE FOR PARTICULAR E HOUVER DADOS DE PAGAMENTO, PROCESSAR
      if (
        (isParticular || !agendamentoData.payerId) &&
        appointmentId &&
        user?.id &&
        pagamentoData.payment_method
      ) {
        console.log('?? Processando pagamento para appointmentId:', appointmentId);

        // ?? Validar pagamento APENAS se h� dados preenchidos
        if (pagamentoData.payment_method !== 'DINHEIRO' || pagamentoData.dinheiro?.value_received) {
          const validation = validatePaymentData(pagamentoData.payment_method, pagamentoData);

          if (!validation.valid) {
            console.warn(
              '?? Dados de pagamento incompletos (ser� preenchido na recep��o):',
              validation.errors,
            );
            // N�o vai bloquear a cria��o do agendamento
          } else {
            // ?? Calcular valor com desconto
            const originalValue = effectiveAppointmentValue;
            const discountAmount = effectiveDiscountAmount;
            const finalValue = originalValue - discountAmount;

            console.log(
              `?? Valor original: ${originalValue}, Desconto: ${discountAmount}, Valor final: ${finalValue}`,
            );

            try {
              const paymentResult = await processPaymentComplete({
                clinicId,
                appointmentId: appointmentId,
                patientId: patientId,
                amount: finalValue > 0 ? finalValue : 0,
                paymentMethod: pagamentoData.payment_method,
                paymentData: pagamentoData,
                operatorId: user.id,
                appointmentDetails: {
                  patientName: agendamentoData.patientName,
                  serviceName: agendamentoData.serviceId
                    ? services.find((s) => s.id === agendamentoData.serviceId)?.name
                    : null,
                },
              });

              if (!paymentResult.success) {
                console.warn('?? Pagamento n�o processado:', paymentResult.error);
              } else {
                console.log('? Pagamento processado com sucesso!', paymentResult);

                // ?? Registrar desconto (se houver)
                if (discountAmount > 0) {
                  try {
                    await registerDiscountIfNeeded(appointmentId);
                  } catch (discountErr) {
                    console.error('?? Desconto n�o foi registrado:', discountErr);
                  }
                }
              }
            } catch (paymentErr) {
              console.warn('?? Erro ao processar pagamento (ser� feito na recep��o):', paymentErr);
            }
          }
        } else {
          console.log('?? Agendamento criado sem pagamento (ser� feito na recep��o)');
        }
      } else {
        console.log('?? Agendamento criado para conv�nio (pagamento ser� administrado depois)');
      }

      if (isParticular || !agendamentoData.payerId) {
        try {
          await syncCardInstallmentsToFinancial({ appointmentId, patientId });
          console.log('Recebiveis de cartao sincronizados com o financeiro.');
        } catch (financialErr) {
          console.error('Erro ao sincronizar parcelas de cartao com o financeiro:', financialErr);
          alert(
            'Agendamento salvo, mas houve erro ao gerar as parcelas no financeiro: ' +
              financialErr.message,
          );
        }
      }

      console.log('? Agendamento processado com sucesso! Chamando callbacks...');

      // ? NOVO: Sincronizar ID do agendamento ao estado antes de fechar
      if (appointmentId && agendamentoData.id !== appointmentId) {
        console.log('? [Sincroniza��o] Atualizando agendamentoData.id para:', appointmentId);
        setAgendamentoData((prev) => ({ ...prev, id: appointmentId }));
      }

      // ?? SINCRONIZAR M�LTIPLOS SERVI�OS (se houver)
      if (appointmentServices.length > 0 && appointmentId) {
        try {
          console.log('?? [Sincronizando servi�os em handleSaveChanges] Iniciando', {
            appointmentId,
            appointmentServices_length: appointmentServices.length,
            appointmentServices: appointmentServices.map((s, idx) => ({
              idx,
              id: s.id,
              service_id: s.service_id,
              service_name: s.service_name,
              value: s.value,
              discount: s.discount,
              quantity: s.quantity,
              status: s.status,
            })),
          });

          const result = await syncAppointmentServices(appointmentId, appointmentServices);

          console.log('? Servi�os sincronizados com sucesso em handleSaveChanges!', {
            services_count: result?.length,
            result,
          });
        } catch (servicesErr) {
          console.error('? Erro ao sincronizar servi�os em handleSaveChanges:', servicesErr);
          console.error('   Stack:', servicesErr.stack);
          // N�o bloquear o salvamento se os servi�os falharem
          alert(
            '?? Agendamento salvo, mas houve erro ao sincronizar os servi�os: ' +
              servicesErr.message,
          );
        }
      } else {
        console.log('?? [Sincronizando servi�os em handleSaveChanges] Nenhum servi�o para sincronizar', {
          appointmentServices_length: appointmentServices.length,
          appointmentId,
        });
      }

      // ?? SUCESSO: Chamar callbacks e fechar
      if (mode === 'edit' || mode === 'new') {
        console.log('?? Chamando onSuccess...');
        onSuccess?.();
        console.log('?? Fechando modal...');
        handleCloseModal();
      } else if (mode === 'reception') {
        console.log('?? Modo recep��o: Aguardando a��o do usu�rio...');
        onSuccess?.();
      }

      return true;
    } catch (err) {
      console.error('? Erro ao salvar agendamento:', err);
      throw err;
    } finally {
      setLoading(false);
      saveChangesPromiseRef.current = null;
    }
    })();

    saveChangesPromiseRef.current = savePromise;
    return savePromise;
  };

  const tabClass = (tab) => `
    min-h-11 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition-colors
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
    ${
      tabAtivo === tab
        ? 'border-blue-200 bg-white text-blue-700 shadow-sm'
        : 'border-transparent bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }
  `;

  // ?? RENDER LOG - COMPREHENSIVE STATE SNAPSHOT
  if (isOpen) {
    console.log('?? [AppointmentUnitedModal RENDER]');
    console.log('   Mode:', mode, '| Tab:', tabAtivo, '| IsOpen:', isOpen);
    console.log('   ?? Form State Summary:');
    console.log('     - Data:', agendamentoData.date, '|', 'Time:', agendamentoData.time);
    console.log('     - Patient:', agendamentoData.patientName);
    console.log('     - Professional:', agendamentoData.professionalId);
    console.log('     - Service:', agendamentoData.serviceId);
    console.log('     - ?? Payer:', agendamentoData.payerId, agendamentoData.payerId ? '?' : '?');
    console.log('     - Room:', agendamentoData.roomId);
    console.log('   ?? Loaded Data:');
    console.log('     - Professionals:', professionals?.length);
    console.log('     - Services:', services?.length);
    console.log('     - Payers:', payers?.length);
    console.log('     - Selected Patient:', !!selectedPatient);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent
          className="app-dialog-shell app-dialog-shell--content"
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6 text-left">
            <DialogTitle className="flex items-center gap-3">
              <span>
                {mode === 'new' && 'Novo Agendamento'}
                {mode === 'edit' && 'Editar Agendamento'}
                {mode === 'reception' && `Atendimento - ${agendamentoData.patientName}`}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* ABAS */}
              <div className="flex flex-wrap gap-1 border-b border-gray-200">
                {(mode === 'new' || mode === 'edit') && (
                  <button
                    type="button"
                    onClick={() => setTabAtivo('dados')}
                    className={tabClass('dados')}
                  >
                    Dados do Agendamento
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTabAtivo('cadastrais')}
                  className={tabClass('cadastrais')}
                >
                  Dados Cadastrais
                </button>

                {mode === 'reception' && (
                  <button
                    type="button"
                    onClick={() => setTabAtivo('status')}
                    className={tabClass('status')}
                  >
                    Status e Liberação
                  </button>
                )}

                {isConvenioFaturado && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTabAtivo('liberacao')}
                      className={tabClass('liberacao')}
                    >
                      Liberação
                    </button>

                    <button
                      type="button"
                      onClick={() => setTabAtivo('faturamento')}
                      className={tabClass('faturamento')}
                    >
                      Faturamento
                    </button>
                  </>
                )}

                {isParticular && (
                  <button
                    type="button"
                    onClick={() => setTabAtivo('pagamento')}
                    className={tabClass('pagamento')}
                  >
                    Pagamento
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTabAtivo('resumo')}
                  className={tabClass('resumo')}
                >
                    Resumo e NF
                </button>
              </div>

              {/* CONTE�DO */}
              <div className="space-y-4">
                {mode === 'edit' && isReleasedForDoctor && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-violet-900">Fluxo médico liberado</p>
                        <p className="mt-1 text-sm text-violet-700">
                          O médico pode abrir o prontuário para consulta ou iniciar o atendimento, alterando o status para Em Atendimento.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOpenPatientRecord({ startAttendance: false })}
                          className="border-violet-300 text-violet-700 hover:bg-violet-100"
                        >
                          <FileText size={16} className="mr-2" />
                          Ver prontuário
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleOpenPatientRecord({ startAttendance: true })}
                          disabled={loading || appointmentStatus === SERVICE_STATUSES.IN_SERVICE}
                          className="bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                        >
                          <PlayCircle size={16} className="mr-2" />
                          {appointmentStatus === SERVICE_STATUSES.IN_SERVICE ? 'Em atendimento' : 'Iniciar atendimento'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA: DADOS AGENDAMENTO */}
                {tabAtivo === 'dados' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-blue-900">
                        Preencha os dados do agendamento
                      </p>
                    </div>

                    <PatientSearchOrCreate
                      clinicId={clinicId}
                      initialPhone={agendamentoData.phone}
                      selectedPatient={selectedPatient}
                      onSelect={(pacientData) => {
                        console.log('? Paciente selecionado:', pacientData);
                        setSelectedPatient(pacientData);
                        setAgendamentoData((prev) => ({
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
                        console.log('? Modo: criar novo paciente');
                        setSelectedPatient(null);
                      }}
                      onClearSelection={() => {
                        console.log('?? Limpando sele��o de paciente');
                        setSelectedPatient(null);
                      }}
                    />

                    {/* ? MODO: NOVO PACIENTE (sem sele��o) - CAMPOS SIMPLES */}
                    {!selectedPatient && (
                      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-900 mb-3">
                          Novo Paciente - Preencha os dados básicos
                        </p>
                        <p className="text-xs text-blue-700 mb-4">
                          Dados completos serão preenchidos quando o paciente chegar na recepção
                        </p>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm">Nome do Paciente *</Label>
                            <Input
                              placeholder="Nome"
                              value={agendamentoData.patientName}
                              onChange={(e) =>
                                updateAgendamentoField('patientName', e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Data de Nascimento</Label>
                            <Input
                              type="date"
                              value={cadastralData.birthdate || ''}
                              onChange={(e) => updateCadastralField('birthdate', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Telefone *</Label>
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
                        <Label>Data *</Label>
                        <Input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          value={
                            agendamentoData.date
                              ? formatDateToIso(parseLocalDate(agendamentoData.date))
                                  .split('-')
                                  .reverse()
                                  .join('/')
                              : ''
                          }
                          onChange={(e) => {
                            const input = e.target.value;
                            // Converter DD/MM/YYYY para ISO YYYY-MM-DD
                            if (input.includes('/')) {
                              const [day, month, year] = input.split('/');
                              if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
                                const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                updateAgendamentoField('date', isoDate);
                              }
                            } else if (input.length === 0) {
                              updateAgendamentoField('date', '');
                            }
                          }}
                        />
                        {agendamentoData.date && selectedDateBlockedByHoliday && (
                          <p className="mt-2 text-xs text-red-700">
                            Data bloqueada por feriado: {selectedDateHoliday?.name || 'Feriado'}.
                          </p>
                        )}
                        {agendamentoData.professionalId &&
                          agendamentoData.date &&
                          !selectedDateHasAvailability && (
                            <p className="mt-2 text-xs text-amber-700">
                              O profissional selecionado nao atende nesta data. Use o calendario
                              abaixo para escolher um dia disponivel.
                            </p>
                          )}
                      </div>
                      <div>
                        <Label>Hora * (Atual: {agendamentoData.time})</Label>
                        <Input
                          type="text"
                          placeholder="HH:MM"
                          value={agendamentoData.time || ''}
                          onChange={(e) => {
                            const timeValue = e.target.value;

                            // ? PHASE 2: Validar business hours
                            if (timeValue && timeValue.includes(':')) {
                              const isValid = isBusinessHours(timeValue);
                              setBusinessHoursWarning(!isValid);
                            } else {
                              setBusinessHoursWarning(false);
                            }

                            updateAgendamentoField('time', timeValue);
                          }}
                        />
                        {businessHoursWarning && (
                          <p className="mt-2 text-xs text-amber-700 flex items-center gap-1">
                            <AlertCircle size={14} />
                            Horário fora do expediente (08:00 - 20:00)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duração (min)</Label>
                        <Input
                          type="number"
                          min="5"
                          value={agendamentoData.duration}
                          onChange={(e) =>
                            updateAgendamentoField('duration', parseInt(e.target.value) || 30)
                          }
                        />
                      </div>
                      <div>
                        <Label>Sala</Label>
                        <Select
                          value={agendamentoData.roomId || ''}
                          onValueChange={(value) => {
                            console.log('?? [SELECT SALA] Valor selecionado:', value);
                            console.log(
                              '   Room encontrada:',
                              rooms?.find((r) => r.id === value),
                            );
                            updateAgendamentoField('roomId', value);
                            setFormData((prev) => ({ ...prev, room_id: value }));
                          }}
                        >
                          <SelectTrigger>
                            {agendamentoData.roomId && selectedRoom ? (
                              <span>{selectedRoom.name}</span>
                            ) : (
                              <SelectValue placeholder="Selecione sala" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {selectedRoom && !rooms.some((room) => room.id === selectedRoom.id) && (
                              <SelectItem value={selectedRoom.id}>{selectedRoom.name}</SelectItem>
                            )}
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
                        <Label>Paciente *</Label>
                        <Input
                          placeholder="Nome do paciente"
                          value={agendamentoData.patientName}
                          onChange={(e) => updateAgendamentoField('patientName', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input
                          placeholder="(11) 99999-9999"
                          value={agendamentoData.phone}
                          onChange={(e) => updateAgendamentoField('phone', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Profissional *</Label>
                      <Select
                        value={agendamentoData.professionalId || ''}
                        onValueChange={(value) => {
                          console.log('?? [Select] Profissional selecionado:', value);
                          updateAgendamentoField('professionalId', value);
                        }}
                      >
                        <SelectTrigger>
                          {agendamentoData.professionalId && selectedProfessional ? (
                            <span>{selectedProfessional.name}</span>
                          ) : (
                            <SelectValue placeholder="Selecione profissional" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProfessional &&
                            !professionals.some((prof) => prof.id === selectedProfessional.id) && (
                              <SelectItem value={selectedProfessional.id}>
                                {selectedProfessional.name}
                              </SelectItem>
                            )}
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

                        {selectedProfessional &&
                          !loadingProfessionalSchedules &&
                          professionalSchedules.length > 0 && (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                              {availableWeekdayLabels.length} dia(s) ativo(s)
                            </span>
                          )}
                      </div>

                      {!selectedProfessional && (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                          Escolha o profissional primeiro. O calendario passa a destacar apenas os
                          dias em que ele atende.
                        </div>
                      )}

                      {selectedProfessional && loadingProfessionalSchedules && (
                        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                          Carregando disponibilidade do profissional...
                        </div>
                      )}

                      {selectedProfessional &&
                        !loadingProfessionalSchedules &&
                        professionalSchedules.length === 0 && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            Este profissional ainda nao possui dias de atendimento cadastrados em
                            Disponibilidades.
                          </div>
                        )}

                      {selectedProfessional &&
                        !loadingProfessionalSchedules &&
                        professionalSchedules.length > 0 && (
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
                                  const selectedDate = Array.isArray(nextValue)
                                    ? nextValue[0]
                                    : nextValue;
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
                                tileDisabled={({ date, view }) =>
                                  view === 'month' &&
                                  (!hasAvailabilityForDate(date) || isBlockedHolidayDate(date))
                                }
                                tileClassName={({ date, view }) => {
                                  if (view !== 'month') {
                                    return '';
                                  }

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
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Dia selecionado
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                  {agendamentoData.date
                                    ? parseLocalDate(agendamentoData.date)?.toLocaleDateString(
                                        'pt-BR',
                                        {
                                          weekday: 'long',
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                        },
                                      )
                                    : 'Selecione uma data no calendario'}
                                </p>

                                {selectedDateHoliday && (
                                  <div
                                    className={`mt-3 rounded-lg border px-3 py-2 text-sm ${selectedDateBlockedByHoliday ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
                                  >
                                    {selectedDateBlockedByHoliday ? 'Feriado bloqueado' : 'Feriado'}
                                    : {selectedDateHoliday.name}
                                  </div>
                                )}

                                {agendamentoData.date && selectedDateHasAvailability && (
                                  <div className="mt-3 space-y-2">
                                    <p className="text-xs font-medium text-slate-600">
                                      Janelas de atendimento
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {schedulesForSelectedDate.map((schedule) => (
                                        <span
                                          key={
                                            schedule.id ||
                                            `${schedule.day_of_week}-${schedule.start_time}-${schedule.end_time}`
                                          }
                                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                                        >
                                          {formatScheduleWindow(schedule)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {agendamentoData.date &&
                                  !selectedDateHasAvailability &&
                                  !selectedDateBlockedByHoliday && (
                                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                      <span>
                                        Sem expediente cadastrado para este profissional neste dia.
                                      </span>
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
                                    {availableTimeSlots.map((slot) => {
                                      const appointmentTime = agendamentoData.time?.slice(0, 5);
                                      return (
                                        <button
                                          key={slot}
                                          type="button"
                                          onClick={() => {
                                            updateAgendamentoField('time', slot);
                                            updateAgendamentoField(
                                              'endTime',
                                              minutesToTime(
                                                timeToMinutes(slot) +
                                                  (Number(agendamentoData.duration) || 30),
                                              ),
                                            );
                                          }}
                                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${appointmentTime === slot ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:text-blue-700'}`}
                                        >
                                          {slot}
                                        </button>
                                      );
                                    })}
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
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                                  Dia com atendimento
                                </span>
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">
                                  Dia selecionado
                                </span>
                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">
                                  Feriado bloqueado
                                </span>
                                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-600">
                                  Dia bloqueado
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>

                    <div>
                      <Label>Status *</Label>
                      <Select
                        value={agendamentoData.status || 'scheduled'}
                        onValueChange={(value) => {
                          console.log('?? [Status] Alterando status para:', value);
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
                                {statusConfig?.label || statusValue}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        placeholder="Observações importantes..."
                        value={agendamentoData.notes}
                        onChange={(e) => updateAgendamentoField('notes', e.target.value)}
                      />
                    </div>

                    {/* ?? M�LTIPLOS SERVI�OS - Adicionado na aba DADOS */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                        <p className="text-sm font-semibold text-blue-900">Serviços do Agendamento</p>
                        {(() => {
                          const appointmentIdToPass = mode === 'edit' && finalAppointment?.id ? finalAppointment.id : agendamentoData.id || null;
                          console.log('?? [AppointmentUnitedModal] Passando para AppointmentItemsManager:', {
                            appointmentIdToPass,
                            mode,
                            finalAppointmentId: finalAppointment?.id,
                            agendamentoDentaId: agendamentoData.id,
                            finalAppointmentKeys: finalAppointment ? Object.keys(finalAppointment).slice(0, 5) : 'SEM finalAppointment',
                          });
                          return null;
                        })()}
                      </div>
                      <AppointmentItemsManager
                        appointmentId={mode === 'edit' && finalAppointment?.id ? finalAppointment.id : agendamentoData.id || null}
                        services={services}
                        payers={(() => {
                          const servicePayers = agendamentoData.professionalId ? filteredPayers || [] : [];
                          const currentPayer =
                            servicePayers.find((p) => p.id === agendamentoData.payerId) ||
                            payers?.find((p) => p.id === agendamentoData.payerId);

                          return currentPayer
                            ? [currentPayer, ...servicePayers.filter((p) => p.id !== currentPayer.id)]
                            : servicePayers;
                        })()}
                        clinicId={clinicId}
                        professionalId={agendamentoData.professionalId}
                        payerId={agendamentoData.payerId}
                        payerName={
                          filteredPayers?.find((p) => p.id === agendamentoData.payerId)?.name ||
                          payers?.find((p) => p.id === agendamentoData.payerId)?.name
                        }
                        onPayerChange={(payerId) => updateAgendamentoField('payerId', payerId)}
                        savedServices={savedServicesForManager}
                        onItemsChange={(updatedServices) => {
                          console.log('? [AppointmentUnitedModal.onItemsChange] CHAMADO! Recebido:', {
                            updatedServices_length: updatedServices?.length || 0,
                            updatedServices: updatedServices?.map(s => ({ id: s.id, service_name: s.service_name })),
                          });

                          const servicesTotal = calculateAppointmentServicesTotal(updatedServices || []);

                          // ?? CRITICAL: Show state change
                          setAppointmentServices((prev) => {
                            console.log('?? [setAppointmentServices] STATE UPDATED:', {
                              prev_length: prev?.length || 0,
                              new_length: updatedServices?.length || 0,
                              servicesTotal,
                            });
                            return updatedServices;
                          });

                          updateAgendamentoField('value', servicesTotal.toString());
                        }}
                        onTotalsUpdate={(totals) => {
                          console.log('?? [AppointmentUnitedModal] Totais atualizados:', totals);
                          if (totals?.grand_total !== undefined) {
                            updateAgendamentoField('value', totals.grand_total.toString());
                          }
                        }}
                      />
                      {/* DEBUG: Log appointmentId value */}
                      {(() => {
                        const computedId = mode === 'edit' && finalAppointment?.id ? finalAppointment.id : agendamentoData.id || null;
                        console.log('?? [AppointmentItemsManager appointmentId]:', {
                          mode,
                          finalAppointment_id: finalAppointment?.id,
                          agendamentoData_id: agendamentoData.id,
                          computedId,
                          condition_mode_edit: mode === 'edit',
                          condition_finalAppointment_id: !!finalAppointment?.id,
                        });
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                {/* ABA: CADASTRAIS */}
                {tabAtivo === 'cadastrais' && (
                  <div className="space-y-4">
                    {selectedPatient && (
                      <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4">
                        <p className="text-sm font-semibold text-green-900">
                          Dados do paciente "{selectedPatient.patientName}" carregados
                        </p>
                        <p className="text-xs text-green-800 mt-1">
                          Voce pode editar os dados abaixo se necessario
                        </p>
                      </div>
                    )}

                    {/* Grid de Dados + Foto */}
                    <div className="grid gap-4 lg:grid-cols-3">
                      {/* COLUNA ESQUERDA: Dados Cadastrais */}
                      <div className="space-y-4 lg:col-span-2">
                        <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                          <p className="text-sm font-semibold text-blue-900">
                            Dados Cadastrais (Padrao TISS)
                          </p>
                        </div>

                        <div>
                          <Label>Nome Completo *</Label>
                          <Input
                            placeholder="Nome completo"
                            value={cadastralData.name}
                            onChange={(e) => updateCadastralField('name', e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>CPF/RG *</Label>
                            <Input
                              placeholder="CPF ou RG"
                              value={cadastralData.document_id}
                              onChange={(e) => updateCadastralField('document_id', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Data de Nascimento</Label>
                            <Input
                              type="date"
                              value={cadastralData.birthdate}
                              onChange={(e) => updateCadastralField('birthdate', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Telefone *</Label>
                            <Input
                              placeholder="(11) 9999-9999"
                              value={cadastralData.phone}
                              onChange={(e) => updateCadastralField('phone', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Celular</Label>
                            <Input
                              placeholder="(11) 99999-9999"
                              value={cadastralData.cell_phone}
                              onChange={(e) => updateCadastralField('cell_phone', e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            value={cadastralData.email}
                            onChange={(e) => updateCadastralField('email', e.target.value)}
                          />
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-gray-700">Endereco</p>
                          <div className="grid grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="Rua"
                              value={cadastralData.street}
                              onChange={(e) => updateCadastralField('street', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <input
                              type="text"
                              placeholder="Numero"
                              value={cadastralData.number}
                              onChange={(e) => updateCadastralField('number', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <input
                              type="text"
                              placeholder="Bairro"
                              value={cadastralData.neighborhood}
                              onChange={(e) => updateCadastralField('neighborhood', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <input
                              type="text"
                              placeholder="Cidade"
                              value={cadastralData.city}
                              onChange={(e) => updateCadastralField('city', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <input
                              type="text"
                              placeholder="UF"
                              maxLength="2"
                              value={cadastralData.state}
                              onChange={(e) => updateCadastralField('state', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <input
                              type="text"
                              placeholder="CEP"
                              value={cadastralData.zip_code}
                              onChange={(e) => updateCadastralField('zip_code', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>

                      {/* COLUNA DIREITA: Secao de Foto do Paciente */}
                      <div className="bg-green-50 border border-green-300 rounded-lg p-4 h-fit">
                        <p className="text-sm font-semibold text-gray-700 mb-3">
                          Foto do Paciente
                        </p>

                        {/* Exibir foto atual */}
                        {cadastralData.photo_url && (
                          <div className="mb-4">
                            <img
                              src={cadastralData.photo_url}
                              alt="Foto do paciente"
                              className="w-32 h-32 rounded-lg object-cover border border-gray-300"
                            />
                            <button
                              onClick={() => {
                                // Apenas remove do state local - ser� salvo quando clicar em "Salvar Dados Cadastrais"
                                setCadastralData((prev) => ({ ...prev, photo_url: null }));
                                alert(
                                  'Foto removida! Clique em "Salvar Dados Cadastrais" para confirmar.',
                                );
                              }}
                              className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                            >
                              Remover Foto
                            </button>
                          </div>
                        )}

                        {/* Captura de foto */}
                        {mode === 'edit' && appointment?.patient_id && (
                          <PhotoCapture
                            onCapture={(photoDataUrl) => {
                              setCadastralData((prev) => ({
                                ...prev,
                                photo_url: photoDataUrl,
                              }));
                              console.log('?? Foto capturada e salva no state');
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Bot�o de salvar dados cadastrais - Full width abaixo do grid */}
                    {mode === 'edit' && appointment?.patient_id && (
                      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={async () => {
                            try {
                              setSubmitting(true);
                              console.log('?? Salvando dados cadastrais do paciente...');

                              const patientUpdateData = {
                                name: cadastralData.name,
                                document_id: cadastralData.document_id,
                                birthdate: cadastralData.birthdate || null,
                                gender: cadastralData.gender || null,
                                phone: cadastralData.phone,
                                cell_phone: cadastralData.cell_phone,
                                email: cadastralData.email,
                                street: cadastralData.street,
                                number: cadastralData.number,
                                neighborhood: cadastralData.neighborhood,
                                city: cadastralData.city,
                                state: cadastralData.state,
                                zip_code: cadastralData.zip_code,
                                photo_url: cadastralData.photo_url || null,
                              };

                              await updatePatient(appointment.patient_id, patientUpdateData);
                              window.location.reload();
                              console.log('? Dados cadastrais salvos com sucesso!');
                              alert('? Dados cadastrais salvos com sucesso!');
                              setSubmitting(false);
                            } catch (err) {
                              console.error('? Erro ao salvar dados cadastrais:', err);
                              alert('? Erro ao salvar dados cadastrais: ' + err.message);
                              setSubmitting(false);
                            }
                          }}
                          className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                        >
                          {submitting ? 'Salvando...' : 'Salvar Dados Cadastrais'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA: STATUS & LIBERA��O (RECEP��O) */}
                {tabAtivo === 'status' && mode === 'reception' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-blue-900">
                        Status do Agendamento
                      </p>
                    </div>

                    {/* Status Atual */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Status Atual:</p>
                      <div className="text-lg font-bold text-gray-900">
                        {getFormattedStatus(agendamentoData.status)}
                      </div>
                    </div>

                    {/* Seletor de Status */}
                    <div>
                      <Label>Atualizar Status *</Label>
                      <Select
                        value={agendamentoData.status || 'scheduled'}
                        onValueChange={(newStatus) => {
                          console.log('?? Tentando transicionar:', {
                            from: agendamentoData.status,
                            to: newStatus,
                          });

                          // Validar transi��o
                          const validation = isStatusTransitionAllowed(
                            agendamentoData.status,
                            newStatus,
                          );
                          if (!validation.allowed) {
                            alert(validation.reason);
                            return;
                          }

                          // Validar dados obrigat�rios
                          const missingFields = validatePatientDataForStatus(
                            newStatus,
                            cadastralData,
                          );
                          if (missingFields.length > 0) {
                            alert(
                              `Dados obrigatorios nao preenchidos:\n\n${missingFields.join('\n')}`,
                            );
                            return;
                          }

                          updateAgendamentoField('status', newStatus);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione novo status" />
                        </SelectTrigger>
                        <SelectContent>
                          {MODAL_VISIBLE_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {getFormattedStatus(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Aviso de Valida��o */}
                    {(agendamentoData.status === BOOKING_STATUSES.AT_CHECKOUT ||
                      agendamentoData.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL) && (
                      <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
                        <p className="text-sm text-orange-900 font-semibold">
                          Dados Obrigatorios Validados
                        </p>
                        <p className="text-xs text-orange-800 mt-1">Nome Completo ? e CPF/RG ?</p>
                      </div>
                    )}

                    {/* Info sobre Transi��es */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                      <p>
                        <strong>Agendado:</strong> Criado na agenda
                      </p>
                      <p>
                        <strong>Confirmado via Telefone:</strong> Paciente confirmou por telefone
                      </p>
                      <p>
                        <strong>Confirmado via WhatsApp:</strong> Paciente confirmou por WhatsApp
                      </p>
                      <p>
                        <strong>Na Recepcao:</strong> Paciente chegou e iniciou check-in
                      </p>
                      <p>
                        <strong>No Guiche:</strong> Validando dados obrigatorios
                      </p>
                      <p>
                        <strong>Aguardando Profissional:</strong> Pronto para ser atendido
                      </p>
                      <p>
                        <strong>Em Atendimento:</strong> Profissional atendendo o paciente
                      </p>
                      <p>
                        <strong>Atendido:</strong> Atendimento finalizado
                      </p>
                    </div>
                  </div>
                )}

                {/* ABA: LIBERA��O */}
                {tabAtivo === 'liberacao' && isConvenioFaturado && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-green-900">
                        Validacao do Convenio
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Numero Carteira/Matricula *</Label>
                        <Input
                          placeholder="Numero da carteira"
                          value={liberacaoData.card_number}
                          onChange={(e) => updateLiberacaoField('card_number', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Numero Autorizacao</Label>
                        <Input
                          placeholder="Numero da autorizacao"
                          value={liberacaoData.auth_number}
                          onChange={(e) => updateLiberacaoField('auth_number', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Validade da Autorizacao</Label>
                      <Input
                        type="date"
                        value={liberacaoData.auth_expiry || ''}
                        onChange={(e) => updateLiberacaoField('auth_expiry', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Autorizado?</Label>
                      <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={liberacaoData.authorized}
                          onChange={(e) => updateLiberacaoField('authorized', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Paciente esta autorizado para atendimento
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* ABA: FATURAMENTO */}
                {tabAtivo === 'faturamento' && isConvenioFaturado && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-purple-900">
                        Faturamento do convênio e dados TISS
                      </p>
                      <p className="mt-1 text-xs text-purple-800">
                        Dados salvos no agendamento para contas a receber, fluxo de caixa, faturamento, envio TISS/XML e execução manual posterior.
                      </p>
                    </div>

                    <div>
                      <Label>Número da Guia TISS *</Label>
                      <Input
                        placeholder="Número da guia"
                        value={faturamentoData.guide_number}
                        onChange={(e) => updateFaturamentoField('guide_number', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Forma de Pagamento</Label>
                      <Select
                        value={pagamentoData.payment_method || 'DINHEIRO'}
                        onValueChange={(value) => updatePagamentoField('payment_method', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                          <SelectItem value="CARTAO">Cartão</SelectItem>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="BOLETO">Boleto</SelectItem>
                          <SelectItem value="DOC">DOC</SelectItem>
                          <SelectItem value="TED">TED</SelectItem>
                          <SelectItem value="DEPOSITO">Depósito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Código</Label>
                        <Select
                          value={faturamentoData.code_type || 'tuss'}
                          onValueChange={(value) => updateFaturamentoField('code_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo de código" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tuss">TUSS</SelectItem>
                            <SelectItem value="cpt">CPT</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Código do Procedimento</Label>
                        <Input
                          placeholder="Código TUSS/CPT"
                          value={
                            agendamentoData.serviceCode || faturamentoData.procedure_code || ''
                          }
                          onChange={(e) => updateFaturamentoField('procedure_code', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor Estimado (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={faturamentoData.estimated_value}
                          onChange={(e) =>
                            updateFaturamentoField('estimated_value', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label>Valor Autorizado (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={faturamentoData.authorized_value}
                          onChange={(e) =>
                            updateFaturamentoField('authorized_value', e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Plano de Contas *</Label>
                      <Select
                        value={faturamentoData.plano_contas_id || ''}
                        onValueChange={(value) => updateFaturamentoField('plano_contas_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o plano de contas" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* SE��O DE DADOS TISS ADICIONAIS */}
                    <div className="border-t border-purple-200 pt-4 mt-4">
                      <p className="text-sm font-semibold text-purple-900 mb-4">
                        Dados Adicionais TISS
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Código CID (Diagnóstico)</Label>
                          <Input
                            placeholder="Ex: E11 (Diabetes)"
                            value={faturamentoData.diagnosis_code || ''}
                            onChange={(e) =>
                              updateFaturamentoField('diagnosis_code', e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label>Quantidade de Procedimentos</Label>
                          <Input
                            type="number"
                            min="1"
                            value={faturamentoData.quantity || 1}
                            onChange={(e) =>
                              updateFaturamentoField('quantity', parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="mt-3">Número do Beneficiário (Segurado)</Label>
                        <Input
                          placeholder="Número do beneficiário principal"
                          value={faturamentoData.subscriber_number || ''}
                          onChange={(e) =>
                            updateFaturamentoField('subscriber_number', e.target.value)
                          }
                        />
                      </div>

                      {/* DADOS DE DEPENDENTE */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <p className="text-sm font-semibold text-blue-900 mb-3">
                          Dados do Dependente (se aplicável)
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Número do Beneficiário Dependente</Label>
                            <Input
                              placeholder="Matrícula do dependente"
                              value={faturamentoData.dependent_number || ''}
                              onChange={(e) =>
                                updateFaturamentoField('dependent_number', e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label>Nome Dependente</Label>
                            <Input
                              placeholder="Nome completo"
                              value={faturamentoData.dependent_name || ''}
                              onChange={(e) =>
                                updateFaturamentoField('dependent_name', e.target.value)
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <Label>Data de Nascimento Dependente</Label>
                            <Input
                              type="date"
                              value={faturamentoData.dependent_birthdate || ''}
                              onChange={(e) =>
                                updateFaturamentoField('dependent_birthdate', e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label>Gênero Dependente</Label>
                            <Select
                              value={faturamentoData.dependent_gender || ''}
                              onValueChange={(value) =>
                                updateFaturamentoField('dependent_gender', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="M">Masculino</SelectItem>
                                <SelectItem value="F">Feminino</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label>Observações/Notas</Label>
                        <Textarea
                          placeholder="Observações adicionais para faturamento"
                          value={faturamentoData.notes || ''}
                          onChange={(e) => updateFaturamentoField('notes', e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* BOT�O ENVIAR TISS */}
                      {finalAppointment?.id && (
                        <div className="mt-6 pt-4 border-t border-purple-200">
                          <Button
                            onClick={() => {
                              setSelectedGuideForTiss(finalAppointment);
                              setTissDialogOpen(true);
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Enviar para TISS
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">
                            Enviar dados desta guia para processamento TISS da operadora
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ABA: PAGAMENTO */}
                {tabAtivo === 'pagamento' && isParticular && (
                  <div className="space-y-4">
                    <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-orange-900">Dados de Pagamento</p>
                    </div>

                    {/* ? CHECKBOX: Habilitar M�ltiplos Pagamentos */}
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableMultiplePayments}
                          onChange={(e) => setEnableMultiplePayments(e.target.checked)}
                          className="w-5 h-5 text-blue-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {enableMultiplePayments
                              ? 'Multiplos Pagamentos Habilitados'
                              : 'Pagamento Unico'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {enableMultiplePayments
                              ? 'Voce pode dividir o pagamento em varias formas (Cartao, PIX, Dinheiro, etc)'
                              : 'Clique para habilitar e dividir o pagamento em multiplas formas'}
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* INTERFACE PARA M�LTIPLOS PAGAMENTOS */}
                    {enableMultiplePayments && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg p-4 space-y-4">
                        <div>
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            Adicionar Forma de Pagamento
                          </h3>
                          {/* Informa��o sobre saldo com desconto */}
                          {(() => {
                            const desconto = effectiveDiscountAmount;
                            const valorOriginal = effectiveAppointmentValue;
                            const valorComDesconto = valorOriginal - desconto;
                            const totalPago = pagamentoSplits.reduce(
                              (s, p) => s + parseFloat(p.value || 0),
                              0,
                            );
                            const saldoRestante = valorComDesconto - totalPago;

                            return (
                              <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                <p className="text-xs text-gray-600">
                                  Saldo a receber:{' '}
                                  <span className="font-bold text-blue-900">
                                    {formatCurrency(saldoRestante)}
                                  </span>
                                  {desconto > 0 && (
                                    <span className="text-yellow-700 ml-2">
                                      (Original {formatCurrency(valorOriginal)} - Desconto{' '}
                                      {formatCurrency(desconto)})
                                    </span>
                                  )}
                                </p>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs font-semibold">Metodo de Pagamento</Label>
                            <Select
                              value={splitFormData.payment_method}
                              onValueChange={(value) =>
                                setSplitFormData({ ...splitFormData, payment_method: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                                <SelectItem value="CARTAO">Cartao</SelectItem>
                                <SelectItem value="PIX">PIX</SelectItem>
                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                                <SelectItem value="BOLETO">Boleto</SelectItem>
                                <SelectItem value="DOC">DOC</SelectItem>
                                <SelectItem value="TED">TED</SelectItem>
                                <SelectItem value="DEPOSITO">Deposito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold">Valor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={splitFormData.value}
                              onChange={(e) =>
                                setSplitFormData({ ...splitFormData, value: e.target.value })
                              }
                              className="h-9"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={addPaymentSplit}
                              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                            >
                              <PlusCircle className="h-4 w-4 flex-shrink-0" />
                              <span>Adicionar</span>
                            </button>
                          </div>
                        </div>

                        {/* Campos espec�ficos do m�todo de pagamento */}
                        {splitFormData.payment_method !== 'DINHEIRO' && (
                          <PaymentSplitFields
                            method={splitFormData.payment_method}
                            formData={splitFormData}
                            onFieldChange={(field, value) =>
                              setSplitFormData({ ...splitFormData, [field]: value })
                            }
                          />
                        )}

                        {/* RESUMO DE PAGAMENTOS */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-2">
                          <p className="font-semibold text-sm text-gray-900">
                            Pagamentos Adicionados
                          </p>

                          {pagamentoSplits.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">
                              Nenhum pagamento adicionado ainda
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {pagamentoSplits.map((split) => {
                                const metodosMap = {
                                  DINHEIRO: 'Dinheiro',
                                  CARTAO: 'Cartao',
                                  PIX: 'PIX',
                                  CHEQUE: 'Cheque',
                                  BOLETO: 'Boleto',
                                  DOC: 'DOC',
                                  TED: 'TED',
                                  DEPOSITO: 'Deposito',
                                };

                                // Renderizar detalhes espec�ficos do pagamento
                                const renderSplitDetails = () => {
                                  const details = [];

                                  if (split.payment_method === 'CARTAO') {
                                    if (split.card_brand) {
                                      details.push(
                                        `${split.card_brand} ${split.card_last4 ? '***' + split.card_last4 : ''}`,
                                      );
                                    }
                                    if (split.installments && split.installments !== '1') {
                                      details.push(`${split.installments}x`);
                                    }
                                  } else if (split.payment_method === 'PIX') {
                                    if (split.pix_key) {
                                      details.push(`Chave: ${split.pix_key.substring(0, 20)}...`);
                                    }
                                  } else if (split.payment_method === 'CHEQUE') {
                                    if (split.cheque_number) {
                                      details.push(`Cheque: ${split.cheque_number}`);
                                    }
                                    if (split.cheque_bank) {
                                      details.push(split.cheque_bank);
                                    }
                                  } else if (split.payment_method === 'BOLETO') {
                                    if (split.boleto_number) {
                                      details.push(
                                        `Boleto: ${split.boleto_number.substring(0, 20)}...`,
                                      );
                                    }
                                  } else if (
                                    ['DOC', 'TED', 'DEPOSITO'].includes(split.payment_method)
                                  ) {
                                    if (split.bank_name) {
                                      details.push(split.bank_name);
                                    }
                                    if (split.bank_account) {
                                      details.push(`Conta: ${split.bank_account}`);
                                    }
                                  }

                                  return details;
                                };

                                const details = renderSplitDetails();

                                return (
                                  <div
                                    key={split.id}
                                    className="bg-gray-50 p-3 rounded border border-gray-200 hover:bg-gray-100 transition"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-sm text-gray-900">
                                        {metodosMap[split.payment_method] || split.payment_method}
                                      </span>
                                      <span className="text-sm font-bold text-green-600">
                                        {formatCurrency(split.value)}
                                      </span>
                                    </div>

                                    {details.length > 0 && (
                                      <p className="text-xs text-gray-600 mb-2">
                                        {details.join(' - ')}
                                      </p>
                                    )}

                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => removePaymentSplit(split.id)}
                                        className="text-red-600 hover:text-red-800 text-xs font-bold hover:underline transition"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* GRID DE C�LCULO COM DESCONTO */}
                          {(() => {
                            const desconto = effectiveDiscountAmount;
                            const valorOriginal = effectiveAppointmentValue;
                            const valorComDesconto = valorOriginal - desconto;
                            const totalPago = pagamentoSplits.reduce(
                              (s, p) => s + parseFloat(p.value || 0),
                              0,
                            );
                            const saldo = valorComDesconto - totalPago;

                            return (
                              <div className="mt-3 pt-2 border-t border-gray-200 space-y-2">
                                {/* Linha 1: Valores */}
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                  <div className="bg-blue-50 p-2 rounded text-center">
                                    <p className="text-gray-600 font-semibold text-xs">
                                      Valor Original
                                    </p>
                                    <p className="text-blue-900 font-bold text-sm">
                                      {formatCurrency(valorOriginal)}
                                    </p>
                                  </div>
                                  {desconto > 0 && (
                                    <div className="bg-yellow-50 p-2 rounded text-center">
                                      <p className="text-gray-600 font-semibold text-xs">
                                        Desconto
                                      </p>
                                      <p className="text-yellow-900 font-bold text-sm">
                                        -{formatCurrency(desconto)}
                                      </p>
                                    </div>
                                  )}
                                  <div
                                    className={`p-2 rounded text-center ${desconto > 0 ? 'col-span-1' : 'col-span-2'} bg-purple-50`}
                                  >
                                    <p className="text-gray-600 font-semibold text-xs">
                                      Total a Pagar
                                    </p>
                                    <p className="text-purple-900 font-bold text-sm">
                                      {formatCurrency(valorComDesconto)}
                                    </p>
                                  </div>
                                  <div className="bg-green-50 p-2 rounded text-center">
                                    <p className="text-gray-600 font-semibold text-xs">Ja Pago</p>
                                    <p className="text-green-900 font-bold text-sm">
                                      {formatCurrency(totalPago)}
                                    </p>
                                  </div>
                                </div>
                                {/* Linha 2: Saldo e Status */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-orange-50 p-2 rounded text-center">
                                    <p className="text-gray-600 font-semibold">Saldo Restante</p>
                                    <p
                                      className={`font-bold text-sm ${saldo <= 0 ? 'text-green-900' : 'text-orange-900'}`}
                                    >
                                      {formatCurrency(saldo)}
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded text-center">
                                    <p className="text-gray-600 font-semibold">Status</p>
                                    <p
                                      className={`font-bold text-sm ${Math.abs(saldo) < 0.01 ? 'text-green-600' : 'text-orange-600'}`}
                                    >
                                      {Math.abs(saldo) < 0.01 ? 'Completo' : 'Incompleto'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Forma de Pagamento *</Label>
                      <Select
                        value={pagamentoData.payment_method || 'DINHEIRO'}
                        onValueChange={(value) => updatePagamentoField('payment_method', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                          <SelectItem value="CARTAO">Cartao de Credito/Debito</SelectItem>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="BOLETO">Boleto</SelectItem>
                          <SelectItem value="DOC">DOC</SelectItem>
                          <SelectItem value="TED">TED</SelectItem>
                          <SelectItem value="DEPOSITO">Deposito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Plano de Contas *</Label>
                      <Select
                        value={pagamentoData.plano_contas_id || ''}
                        onValueChange={(value) => updatePagamentoField('plano_contas_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o plano de contas" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor Total (R$) *</Label>
                        <Input
                          type="text"
                          value={formatCurrency(effectiveAppointmentValue)}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/\D/g, '');
                            const decimalValue = numericValue
                              ? (parseFloat(numericValue) / 100).toFixed(2)
                              : '0.00';
                            updateAgendamentoField('value', decimalValue);
                          }}
                          placeholder="R$ 0,00"
                          className="font-bold text-gray-900"
                        />
                      </div>
                    </div>

                    {/* SE��O DE DESCONTO - COM AUTORIZA��O - SEMPRE VIS�VEL */}
                    <div
                      className={`rounded-lg p-4 space-y-3 ${
                        requestedDiscountAmount > 0
                          ? 'bg-yellow-50 border-l-4 border-yellow-500'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="font-bold">
                        {requestedDiscountAmount > 0 ? (
                          <span className="text-yellow-900">
                            {isDiscountApproved ? 'Desconto Aplicado' : 'Desconto Solicitado'}
                          </span>
                        ) : (
                          <span className="text-gray-900">Desconto e Observacoes</span>
                        )}
                      </div>

                      {/* AVISO: Desconto Autorizado - Campos Protegidos */}
                      {pagamentoData.discount_authorized_by &&
                        requestedDiscountAmount > 0 && (
                          <div className="bg-blue-50 border border-blue-300 rounded p-3">
                            <p className="text-sm text-blue-900 font-semibold mb-2">
                              Campos Protegidos - Desconto Ja Autorizado
                            </p>
                            <div className="text-xs text-blue-700 mb-3 space-y-1">
                              <p>
                                <strong>Autorizado por:</strong>{' '}
                                {pagamentoData.discount_authorized_by_name ||
                                  (() => {
                                    const authorized = professionals.find(
                                      (p) => p.id === pagamentoData.discount_authorized_by,
                                    );
                                    return authorized ? authorized.name : 'Administrador do Sistema';
                                  })()}
                              </p>
                              {pagamentoData.discount_authorized_at && (
                                <p>
                                  <strong>Data e Hora:</strong>{' '}
                                  {new Date(
                                    pagamentoData.discount_authorized_at,
                                  ).toLocaleDateString('pt-BR')}{' '}
                                  as{' '}
                                  {new Date(
                                    pagamentoData.discount_authorized_at,
                                  ).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              )}
                              <p className="mt-2">
                                Para alterar os valores, voce deve primeiro remover a autorizacao.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                console.log('?? [RemoveAuthorization] Bot�o clicado');

                                const confirmRemove = window.confirm(
                                  'Tem certeza que deseja remover a autorizacao deste desconto?\n\nIsso permitira editar os valores, mas a autorizacao sera cancelada no sistema.',
                                );

                                console.log('?? [RemoveAuthorization] Confirma��o:', confirmRemove);
                                if (!confirmRemove) {
                                  console.log('??  [RemoveAuthorization] Usu�rio cancelou');
                                  return;
                                }

                                try {
                                  console.log('?? [RemoveAuthorization] Iniciando remo��o...');
                                  setLoading(true);

                                  const appointmentId = finalAppointment?.id || appointment?.id;
                                  console.log(
                                    '?? [RemoveAuthorization] Appointment ID:',
                                    appointmentId,
                                  );

                                  if (!appointmentId) {
                                    throw new Error('ID do agendamento nao encontrado');
                                  }

                                  // Atualizar campos locais primeiro
                                  console.log(
                                    '??  [RemoveAuthorization] Atualizando campos locais',
                                  );
                                  updatePagamentoField('discount_authorized_by', null);
                                  updatePagamentoField('discount_authorized_by_name', null);
                                  updatePagamentoField('discount_authorized_at', null);

                                  // Atualizar no banco de dados
                                  console.log(
                                    '?? [RemoveAuthorization] Atualizando banco de dados',
                                  );
                                  const result = await updateAppointment(appointmentId, {
                                    discountAuthorizedBy: null,
                                    discountAuthorizedByName: null,
                                    discountAuthorizedAt: null,
                                  });
                                  console.log('? [RemoveAuthorization] Resultado:', result);

                                  setLoading(false);
                                  alert(
                                    'Autorizacao removida com sucesso!\n\nOs campos estao desbloqueados para edicao.',
                                  );
                                } catch (error) {
                                  setLoading(false);
                                  console.error('? [RemoveAuthorization] Erro:', error);
                                  console.error('Stack:', error.stack);
                                  alert(`Erro ao remover autorizacao:\n\n${error.message}`);
                                }
                              }}
                              disabled={loading}
                              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded transition font-semibold"
                            >
                              {loading ? 'Removendo...' : 'Remover Autorizacao para Alterar'}
                            </button>
                          </div>
                        )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Valor do Desconto (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={pagamentoData.discount || 0}
                            onChange={(e) => updatePagamentoField('discount', e.target.value)}
                            placeholder="0.00"
                            disabled={
                              pagamentoData.discount_authorized_by &&
                              parseFloat(pagamentoData.discount || 0) > 0
                            }
                            className={
                              pagamentoData.discount_authorized_by &&
                              parseFloat(pagamentoData.discount || 0) > 0
                                ? 'bg-gray-100 cursor-not-allowed'
                                : ''
                            }
                          />
                        </div>
                        <div>
                          <Label>Motivo do Desconto</Label>
                          <Select
                            value={pagamentoData.discount_reason || ''}
                            onValueChange={(value) =>
                              updatePagamentoField('discount_reason', value)
                            }
                            disabled={
                              pagamentoData.discount_authorized_by &&
                              parseFloat(pagamentoData.discount || 0) > 0
                            }
                          >
                            <SelectTrigger
                              className={
                                pagamentoData.discount_authorized_by &&
                                parseFloat(pagamentoData.discount || 0) > 0
                                  ? 'bg-gray-100 cursor-not-allowed'
                                  : ''
                              }
                            >
                              <SelectValue placeholder="Selecione motivo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel className="text-blue-600 font-bold">
                                  Motivos comerciais
                                </SelectLabel>
                                <SelectItem value="promocao">Promocao</SelectItem>
                                <SelectItem value="primeira_consulta">
                                  Primeira Consulta
                                </SelectItem>
                                <SelectItem value="indicacao">Indicacao/Referencia</SelectItem>
                                <SelectItem value="fidelidade">
                                  Fidelidade/Cliente Recorrente
                                </SelectItem>
                                <SelectItem value="desconto_grupo">
                                  Desconto Grupo/Pacote
                                </SelectItem>
                              </SelectGroup>

                              <SelectGroup>
                                <SelectLabel className="text-green-600 font-bold">
                                  Motivos do paciente
                                </SelectLabel>
                                <SelectItem value="dificuldade_financeira">
                                  Dificuldade Financeira
                                </SelectItem>
                                <SelectItem value="cortesia_medica">
                                  Cortesia Medica/Profissional
                                </SelectItem>
                                <SelectItem value="cortesia_administrativo">
                                  Cortesia Administrativa
                                </SelectItem>
                              </SelectGroup>

                              <SelectGroup>
                                <SelectLabel className="text-orange-600 font-bold">
                                  Motivos operacionais
                                </SelectLabel>
                                <SelectItem value="erro_cobranca">
                                  Erro de Cobranca/Faturamento
                                </SelectItem>
                                <SelectItem value="correcao_sistema">
                                  Correcao de Sistema
                                </SelectItem>
                                <SelectItem value="ajuste_convenio">Ajuste Convenio</SelectItem>
                              </SelectGroup>

                              <SelectGroup>
                                <SelectLabel className="text-purple-600 font-bold">
                                  Motivos cronologicos
                                </SelectLabel>
                                <SelectItem value="feriado">Feriado/Data Especial</SelectItem>
                                <SelectItem value="agendamento_bloqueado">
                                  Liberacao de Agendamento Bloqueado
                                </SelectItem>
                              </SelectGroup>

                              <SelectGroup>
                                <SelectLabel className="text-gray-600 font-bold">
                                  Outros
                                </SelectLabel>
                                <SelectItem value="cancelamento_anterior">
                                  Compensacao Cancelamento Anterior
                                </SelectItem>
                                <SelectItem value="cortesia_outros">
                                  Cortesia Especial
                                </SelectItem>
                                <SelectItem value="outros">Outros Motivos</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Observacoes sobre Desconto</Label>
                        <Textarea
                          placeholder="Justificativa ou detalhes adicionais..."
                          value={pagamentoData.discount_observation || ''}
                          onChange={(e) =>
                            updatePagamentoField('discount_observation', e.target.value)
                          }
                          rows={2}
                          disabled={
                            pagamentoData.discount_authorized_by &&
                            parseFloat(pagamentoData.discount || 0) > 0
                          }
                          className={
                            pagamentoData.discount_authorized_by &&
                            parseFloat(pagamentoData.discount || 0) > 0
                              ? 'bg-gray-100 cursor-not-allowed'
                              : ''
                          }
                        />
                      </div>

                      {/* Mostrar status de autoriza��o apenas se h� desconto */}
                      {parseFloat(pagamentoData.discount || 0) > 0 && (
                        <>
                          {pagamentoData.discount_authorized_by ? (
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <p className="text-sm text-green-900 font-semibold">
                                Desconto Autorizado
                              </p>
                              {pagamentoData.discount_authorized_by_name && (
                                <p className="text-xs text-green-700 mt-1">
                                  Autorizado por: {pagamentoData.discount_authorized_by_name}
                                </p>
                              )}
                              {pagamentoData.discount_authorized_at && (
                                <p className="text-xs text-green-700 mt-1">
                                  Autorizado em:{' '}
                                  {new Date(
                                    pagamentoData.discount_authorized_at,
                                  ).toLocaleDateString('pt-BR')}
                                </p>
                              )}
                            </div>
                          ) : pagamentoData.discount_rejected_at ? (
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                              <p className="text-sm text-red-900 font-semibold">
                                Desconto Rejeitado
                              </p>
                              {pagamentoData.discount_rejected_by_name && (
                                <p className="text-xs text-red-700 mt-1">
                                  Rejeitado por: {pagamentoData.discount_rejected_by_name}
                                </p>
                              )}
                              <p className="text-xs text-red-700 mt-1">
                                Rejeitado em:{' '}
                                {new Date(pagamentoData.discount_rejected_at).toLocaleDateString(
                                  'pt-BR',
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="bg-red-50 border border-red-200 rounded p-3">
                                <p className="text-sm text-red-900 font-semibold">
                                  Este desconto requer autorizacao de administrador
                                </p>
                                <p className="text-xs text-red-700 mt-1">
                                  O desconto sera registrado e enviado para aprovacao
                                </p>
                              </div>

                              {/* Bot�o para submeter desconto para autoriza��o */}
                              {pagamentoData.discount_requested_at ? (
                                <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-3">
                                  <p className="text-sm text-blue-900 font-semibold">
                                    Desconto ja foi solicitado
                                  </p>
                                  {pagamentoData.discount_requested_by_name && (
                                    <p className="text-xs text-blue-700">
                                      Solicitado por: {pagamentoData.discount_requested_by_name}
                                    </p>
                                  )}
                                  <p className="text-xs text-blue-700 mt-1">
                                    Solicitado em:{' '}
                                    {new Date(
                                      pagamentoData.discount_requested_at,
                                    ).toLocaleDateString('pt-BR')}
                                  </p>
                                  {!pagamentoData.discount_authorized_by &&
                                    !pagamentoData.discount_rejected_at && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={refreshDiscountAuthorizationStatus}
                                        disabled={loading}
                                        className="h-8 w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                                      >
                                        {loading
                                          ? 'Atualizando...'
                                          : 'Atualizar Retorno da Autorizacao'}
                                      </Button>
                                    )}
                                </div>
                              ) : (
                                <Button
                                  onClick={async () => {
                                    try {
                                      setLoading(true);
                                      await requestDiscountAuthorization();
                                      setLoading(false);
                                    } catch (error) {
                                      setLoading(false);
                                      alert(`? Erro ao enviar desconto: ${error.message}`);
                                      console.error('Erro:', error);
                                    }
                                  }}
                                  disabled={loading}
                                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white"
                                >
                                  {loading
                                    ? 'Enviando...'
                                    : 'Solicitar Autorizacao de Desconto'}
                                </Button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* NOTA: Campos de m�todo de pagamento espec�ficos foram removidos desta se��o.
                       Use a se��o de "M�ltiplos Pagamentos" para registrar pagamentos com detalhes espec�ficos. */}

                    {/* RESUMO FINANCEIRO */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4 space-y-2 mt-6">
                      <p className="font-semibold text-blue-900">Resumo Financeiro</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Valor Total:</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(effectiveAppointmentValue)}
                        </span>
                      </div>
                      {requestedDiscountAmount > 0 && (
                        <>
                          <div className={`flex justify-between text-sm ${isDiscountApproved ? 'text-yellow-800' : 'text-orange-700'}`}>
                            <span>{isDiscountApproved ? 'Desconto:' : 'Desconto solicitado:'}</span>
                            <span className="font-bold">
                              -{formatCurrency(pagamentoData.discount)}
                            </span>
                          </div>
                          {isDiscountPending && (
                            <div className="text-xs text-orange-700">
                              Aguardando autorizacao. O valor ainda nao foi abatido do recebimento.
                            </div>
                          )}
                          <div className="border-t border-blue-300 pt-2 flex justify-between font-bold">
                            <span className="text-blue-900">Valor a Receber:</span>
                            <span className="text-green-700">
                              {formatCurrency(
                                effectiveAppointmentValue - effectiveDiscountAmount,
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ?? BOT�O CRIAR ATENDIMENTO - Quando status � at_checkout */}
                    {agendamentoData.status === 'at_checkout' && (
                      <Button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            console.log(
                              '?? [CreateAttendance] Criando atendimento e atualizando status para awaiting_professional',
                            );

                            // Atualizar status para awaiting_professional
                            await updateAppointment(finalAppointment?.id || appointment?.id, {
                              status: 'awaiting_professional',
                            });

                            console.log('? [CreateAttendance] Atendimento criado com sucesso!');

                            // Atualizar estado local
                            updateAgendamentoField('status', 'awaiting_professional');

                            // ?? MARCAR COMO CRIADO - vai auto-navegar para resumo
                            setAttendanceCreated(true);
                            setLoading(false);
                          } catch (error) {
                            setLoading(false);
                            alert(`? Erro ao criar atendimento: ${error.message}`);
                            console.error('Erro ao criar atendimento:', error);
                          }
                        }}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white animate-pulse"
                      >
                        {loading ? 'Criando atendimento...' : 'Criar Atendimento'}
                      </Button>
                    )}
                  </div>
                )}

                {/* ABA: PAGAMENTO */}
                {tabAtivo === 'pagamento' && (
                  <div className="space-y-4 overflow-y-auto max-h-[600px]">
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-blue-900">Informacoes de Pagamento</p>
                    </div>

                    {/* Card Processor Selector para pagamentos em cart�o */}
                    <CardProcessorSelectorFields
                      clinicId={clinicId}
                      paymentMethod={pagamentoData.payment_method}
                      grossAmount={effectiveAppointmentValue}
                      processorId={cardProcessorData.processor_id}
                      cardBrand={cardProcessorData.card_brand}
                      settlementType={cardProcessorData.settlement_type}
                      onProcessorChange={(id) => setCardProcessorData((prev) => ({ ...prev, processor_id: id }))}
                      onCardBrandChange={(brand) => setCardProcessorData((prev) => ({ ...prev, card_brand: brand }))}
                      onSettlementTypeChange={(type) => setCardProcessorData((prev) => ({ ...prev, settlement_type: type }))}
                      onFeeCalculated={(fee) => {
                        if (fee) {
                          setCardProcessorData((prev) => ({
                            ...prev,
                            fee_percent: fee.feePercent,
                            fee_amount: fee.feeAmount,
                            net_amount: fee.netAmount,
                          }));
                        }
                      }}
                    />
                  </div>
                )}

                {/* ABA: RESUMO - Completa com todos os dados */}
                {tabAtivo === 'resumo' && (
                  <div className="space-y-4 overflow-y-auto max-h-[600px]">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-300 rounded-lg p-4 mb-4">
                      <p className="text-lg font-bold text-green-900">
                        Resumo Completo do Atendimento
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Todos os dados foram salvos com sucesso
                      </p>
                    </div>

                    {/* ?? PACIENTE */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>Paciente</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">Nome</span>
                          <p className="text-gray-900 font-bold">{cadastralData.name || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">CPF/RG</span>
                          <p className="text-gray-900 font-bold">
                            {cadastralData.document_id || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">
                            Telefone
                          </span>
                          <p className="text-gray-900 font-bold">
                            {cadastralData.cell_phone || cadastralData.phone || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">
                            Data Nasc.
                          </span>
                          <p className="text-gray-900 font-bold">
                            {cadastralData.birthdate || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ?? AGENDAMENTO */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>Agendamento</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">Data</span>
                          <p className="text-gray-900 font-bold">{agendamentoData.date || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">Horario</span>
                          <p className="text-gray-900 font-bold">{agendamentoData.time || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">Duracao</span>
                          <p className="text-gray-900 font-bold">
                            {agendamentoData.duration || 30} minutos
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">Sala</span>
                          <p className="text-gray-900 font-bold">
                            {rooms.find((r) => r.id === agendamentoData.roomId)?.name || '-'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 block text-xs font-semibold">
                            Profissional
                          </span>
                          <p className="text-gray-900 font-bold">
                            {professionals.find((p) => p.id === agendamentoData.professionalId)
                              ?.name || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ?? SERVI�OS */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>Servicos</span>
                      </p>
                      {appointmentServices.length > 0 ? (
                        <div className="space-y-2 text-sm">
                          {appointmentServices.map((service, index) => (
                            <div
                              key={service.id || `${service.service_id}-${index}`}
                              className="rounded border border-purple-100 bg-white p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="text-gray-600 block text-xs font-semibold">
                                    Servico {index + 1}
                                  </span>
                                  <p className="text-gray-900 font-bold">
                                    {service.service_name || service.name || '-'}
                                  </p>
                                  {(service.service_code || service.code) && (
                                    <p className="text-xs text-gray-600">
                                      Codigo: {service.service_code || service.code}
                                    </p>
                                  )}
                                </div>
                                <p className="text-gray-900 font-bold whitespace-nowrap">
                                  {formatCurrency(
                                    Math.max(
                                      0,
                                      parseFloat(
                                        service.value ?? service.unit_price ?? service.final_value ?? service.price ?? 0,
                                      ) * parseFloat(service.quantity || 1) -
                                        parseFloat(service.discount || 0),
                                    ),
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Nome do Servico
                            </span>
                            <p className="text-gray-900 font-bold">
                              {services.find((s) => s.id === agendamentoData.serviceId)?.name || '-'}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-gray-600 block text-xs font-semibold">
                                Codigo
                              </span>
                              <p className="text-gray-900 font-bold">
                                {agendamentoData.serviceCode || '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600 block text-xs font-semibold">Valor</span>
                              <p className="text-gray-900 font-bold">
                                {formatCurrency(effectiveAppointmentValue)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ?? PAGAMENTO / CONV�NIO */}
                    {!checkIsParticular(agendamentoData.payerId) && isConvenioFaturado && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span>Convenio/Faturamento</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="col-span-2">
                            <span className="text-gray-600 block text-xs font-semibold">Plano</span>
                            <p className="text-gray-900 font-bold">
                              {liberacaoData.plan_name || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Cartao
                            </span>
                            <p className="text-gray-900 font-bold">
                              {liberacaoData.card_number || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Autorizacao
                            </span>
                            <p className="text-gray-900 font-bold">
                              {liberacaoData.auth_number || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Codigo TISS
                            </span>
                            <p className="text-gray-900 font-bold">
                              {faturamentoData.procedure_code || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Valor Faturado
                            </span>
                            <p className="text-gray-900 font-bold">
                              {formatCurrency(faturamentoData.estimated_value || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {checkIsParticular(agendamentoData.payerId) && isParticular && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span>Pagamento Particular</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Valor Total
                            </span>
                            <p className="text-gray-900 font-bold">
                              {formatCurrency(effectiveAppointmentValue)}
                            </p>
                          </div>
                          {enableMultiplePayments && pagamentoSplits.length > 0 ? (
                            <div className="col-span-2">
                              <span className="text-gray-600 block text-xs font-semibold mb-2">
                                Formas de pagamento
                              </span>
                              <div className="space-y-2">
                                {pagamentoSplits.map((split) => {
                                  const details = getPaymentSplitDetails(split);
                                  return (
                                    <div
                                      key={split.id || `${split.payment_method}-${split.value}`}
                                      className="flex items-center justify-between gap-3 rounded border border-orange-200 bg-white px-3 py-2"
                                    >
                                      <div>
                                        <p className="text-gray-900 font-bold">
                                          {getPaymentMethodLabel(split.payment_method)}
                                        </p>
                                        {details && (
                                          <p className="text-xs text-gray-600">{details}</p>
                                        )}
                                      </div>
                                      <p className="text-green-700 font-bold whitespace-nowrap">
                                        {formatCurrency(split.value || 0)}
                                      </p>
                                    </div>
                                  );
                                })}
                                <div className="flex items-center justify-between border-t border-orange-200 pt-2 text-sm">
                                  <span className="font-semibold text-gray-700">Total informado</span>
                                  <span className="font-bold text-green-700">
                                    {formatCurrency(
                                      pagamentoSplits.reduce(
                                        (sum, split) => sum + parseFloat(split.value || 0),
                                        0,
                                      ),
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-gray-600 block text-xs font-semibold">
                                Metodo
                              </span>
                              <p className="text-gray-900 font-bold">
                                {getPaymentMethodLabel(pagamentoData.payment_method)}
                              </p>
                            </div>
                          )}
                          {requestedDiscountAmount > 0 && (
                            <>
                              <div>
                                <span className="text-gray-600 block text-xs font-semibold">
                                  {isDiscountApproved ? 'Desconto' : 'Desconto solicitado'}
                                </span>
                                <p className={`${isDiscountApproved ? 'text-yellow-700' : 'text-orange-700'} font-bold`}>
                                  -{formatCurrency(pagamentoData.discount)}
                                </p>
                                {isDiscountPending && (
                                  <p className="text-xs text-orange-700">
                                    Pendente de autorizacao
                                  </p>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-600 block text-xs font-semibold">
                                  Valor a Receber
                                </span>
                                <p className="text-green-700 font-bold">
                                  {formatCurrency(
                                    effectiveAppointmentValue - effectiveDiscountAmount,
                                  )}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ?? STATUS */}
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>Status</span>
                      </p>
                      <div className="text-sm">
                        <span className="text-gray-600 block text-xs font-semibold mb-1">
                          Status Atual
                        </span>
                        <div className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                          {agendamentoData.status === 'awaiting_professional'
                            ? 'Aguardando Profissional'
                            : getFormattedStatus(agendamentoData.status)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4 text-center">
                      <p className="text-blue-900 font-bold text-base">
                        Atendimento pronto para ser iniciado!
                      </p>
                      <p className="text-blue-800 text-sm mt-2">
                        O profissional pode clicar em "Iniciar Atendimento" para comecar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER COM BOTOES */}
            <div className="border-t border-gray-200 p-4 bg-white flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
              {tabAtivo === 'dados' && (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>

                  {/* ?? BOT�O SALVAR DADOS - Em modo EDIT, permite salvar sem avan�ar */}
                  {mode === 'edit' && (
                    <Button
                      onClick={async () => {
                        try {
                          await handleSaveDataOnly();
                        } catch (error) {
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      disabled={loading}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
                    >
                      {loading ? 'Salvando...' : 'Salvar Dados'}
                    </Button>
                  )}

                  <Button
                    onClick={() => setTabAtivo('cadastrais')}
                    disabled={
                      !agendamentoData.professionalId ||
                      !agendamentoData.date ||
                      !agendamentoData.time ||
                      !agendamentoData.patientId && !agendamentoData.patientName?.trim()
                    }
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                  >
                    Avançar
                  </Button>
                </>
              )}

              {tabAtivo === 'cadastrais' && (
                <>
                  {mode !== 'reception' && (
                    <Button variant="outline" onClick={() => setTabAtivo('dados')}>
                      Voltar
                    </Button>
                  )}
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>

                  {/* ?? BOT�O SALVAR DADOS - Em modo EDIT, permite salvar sem avan�ar */}
                  {mode === 'edit' && (
                    <Button
                      onClick={async () => {
                        try {
                          await handleSaveDataOnly();
                        } catch (error) {
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      disabled={
                        loading || !agendamentoData.professionalId || !agendamentoData.payerId
                      }
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
                      title={
                        !agendamentoData.professionalId
                          ? 'Selecione um profissional'
                          : !agendamentoData.payerId
                            ? 'Selecione um convênio'
                            : ''
                      }
                    >
                      {loading ? 'Salvando...' : 'Salvar Dados'}
                    </Button>
                  )}

                  <Button
                    onClick={async () => {
                      try {
                        // ?? SE FOR RECEP��O, VALIDAR DADOS CADASTRAIS OBRIGAT�RIOS
                        if (mode === 'reception') {
                          const validateReceptionFields = () => {
                            const errors = [];
                            if (!cadastralData.name?.trim()) {
                              errors.push('Nome completo');
                            }
                            if (!cadastralData.document_id?.trim()) {
                              errors.push('CPF/RG');
                            }
                            return errors;
                          };

                          const missingFields = validateReceptionFields();
                          if (missingFields.length > 0) {
                            alert(
                              `Dados obrigatórios não preenchidos:\n\n${missingFields.join('\n')}`,
                            );
                            return;
                          }
                        }

                        if (isConvenioFaturado) {
                          setTabAtivo('liberacao');
                        } else if (isParticular) {
                          setTabAtivo('pagamento');
                        } else {
                          setLoading(true);
                          await handleSaveChanges();
                          setLoading(false);
                          onSuccess?.();
                          onClose();
                        }
                      } catch (error) {
                        setLoading(false);
                        alert(`? Erro ao salvar: ${error.message}`);
                        console.error('Erro ao salvar:', error);
                      }
                    }}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                  >
                    {loading ? 'Salvando...' : 'Avançar'}
                  </Button>
                </>
              )}

              {tabAtivo === 'status' && mode === 'reception' && (
                <>
                  <Button variant="outline" onClick={() => setTabAtivo('cadastrais')}>
                    Voltar
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await handleSaveChanges();
                        setLoading(false);
                        onSuccess?.();
                      } catch (error) {
                        setLoading(false);
                        alert(`? Erro ao salvar: ${error.message}`);
                        console.error('Erro ao salvar:', error);
                      }
                    }}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white"
                  >
                    {loading ? 'Salvando...' : 'Atualizar Status'}
                  </Button>
                </>
              )}

              {tabAtivo === 'liberacao' && (
                <>
                  <Button variant="outline" onClick={() => setTabAtivo('cadastrais')}>
                    Voltar
                  </Button>

                  {/* ?? BOT�O SALVAR DADOS - Em modo EDIT, permite salvar sem avan�ar */}
                  {mode === 'edit' && (
                    <Button
                      onClick={async () => {
                        try {
                          await handleSaveDataOnly();
                        } catch (error) {
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      disabled={
                        loading || !agendamentoData.professionalId || !agendamentoData.payerId
                      }
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
                      title={
                        !agendamentoData.professionalId
                          ? 'Selecione um profissional'
                          : !agendamentoData.payerId
                            ? 'Selecione um convênio'
                            : ''
                      }
                    >
                      {loading ? 'Salvando...' : 'Salvar Dados'}
                    </Button>
                  )}

                  <Button
                    onClick={() =>
                      setTabAtivo(
                        checkIsParticular(agendamentoData.payerId) ? 'pagamento' : 'faturamento',
                      )
                    }
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                  >
                    Avançar
                  </Button>
                </>
              )}

              {tabAtivo === 'pagamento' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setTabAtivo(isConvenioFaturado ? 'liberacao' : 'cadastrais')}
                  >
                    Voltar
                  </Button>

                  {/* ?? BOT�O SALVAR DADOS - Em modo EDIT, permite salvar sem criar atendimento */}
                  {mode === 'edit' && (
                    <Button
                      onClick={async () => {
                        try {
                          await handleSaveDataOnly();
                        } catch (error) {
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      disabled={
                        loading || !agendamentoData.professionalId || !agendamentoData.payerId
                      }
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
                      title={
                        !agendamentoData.professionalId
                          ? 'Selecione um profissional'
                          : !agendamentoData.payerId
                            ? 'Selecione um convênio'
                            : ''
                      }
                    >
                      {loading ? 'Salvando...' : 'Salvar Dados'}
                    </Button>
                  )}

                  {/* ?? BOT�O CRIAR ATENDIMENTO - S� em modo NEW quando status � at_checkout */}
                  {mode === 'new' && agendamentoData.status === 'at_checkout' && (
                    <Button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          console.log('?? [CreateAttendance] PASSO 1: Salvando TODOS os dados...');

                          // 1?? SALVAR TODOS OS DADOS (agendamento, cadastrais, libera��o, pagamento)
                          await handleSaveChanges();

                          console.log(
                            '?? [CreateAttendance] PASSO 2: Atualizando status para awaiting_professional...',
                          );

                          // 2?? ATUALIZAR STATUS
                          await updateAppointment(finalAppointment?.id || appointment?.id, {
                            status: 'awaiting_professional',
                          });

                          // 3?? ATUALIZAR ESTADO LOCAL
                          updateAgendamentoField('status', 'awaiting_professional');

                          console.log('? [CreateAttendance] Sucesso! Dados de Pagamento salvos.');

                          // ?? MARCAR COMO CRIADO - vai auto-navegar para resumo
                          setAttendanceCreated(true);
                          setLoading(false);
                        } catch (error) {
                          setLoading(false);
                          alert(`? Erro ao criar atendimento: ${error.message}`);
                          console.error('Erro ao criar atendimento:', error);
                        }
                      }}
                      disabled={loading}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white animate-pulse"
                    >
                      {loading ? 'Salvando e criando...' : 'Criar Atendimento'}
                    </Button>
                  )}

                  {mode !== 'edit' && agendamentoData.status !== 'at_checkout' && (
                    <Button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          await handleSaveChanges();
                          setLoading(false);
                          onSuccess?.() || onClose();
                        } catch (error) {
                          setLoading(false);
                          alert(`? Erro ao salvar: ${error.message}`);
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                    >
                      {loading ? 'Salvando...' : 'Criar Agendamento'}
                    </Button>
                  )}
                </>
              )}

              {tabAtivo === 'faturamento' && isConvenioFaturado && (
                <>
                  <Button variant="outline" onClick={() => setTabAtivo('liberacao')}>
                    Voltar
                  </Button>

                  {/* ?? BOT�O SALVAR DADOS - Em modo EDIT, permite salvar sem criar atendimento */}
                  {mode === 'edit' && (
                    <Button
                      onClick={async () => {
                        try {
                          await handleSaveDataOnly();
                        } catch (error) {
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      disabled={
                        loading || !agendamentoData.professionalId || !agendamentoData.payerId
                      }
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
                      title={
                        !agendamentoData.professionalId
                          ? 'Selecione um profissional'
                          : !agendamentoData.payerId
                            ? 'Selecione um convênio'
                            : ''
                      }
                    >
                      {loading ? 'Salvando...' : 'Salvar Dados'}
                    </Button>
                  )}

                  {/* ?? BOT�O CRIAR ATENDIMENTO - S� em modo NEW quando status � at_checkout */}
                  {mode === 'new' && agendamentoData.status === 'at_checkout' && (
                    <Button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          console.log('?? [CreateAttendance] PASSO 1: Salvando TODOS os dados...');

                          // 1?? SALVAR TODOS OS DADOS (agendamento, cadastrais, libera��o, faturamento)
                          await handleSaveChanges();

                          console.log(
                            '?? [CreateAttendance] PASSO 2: Atualizando status para awaiting_professional...',
                          );

                          // 2?? ATUALIZAR STATUS
                          await updateAppointment(finalAppointment?.id || appointment?.id, {
                            status: 'awaiting_professional',
                          });

                          // 3?? ATUALIZAR ESTADO LOCAL
                          updateAgendamentoField('status', 'awaiting_professional');

                          console.log(
                            '? [CreateAttendance] Sucesso! Dados de Faturamento TISS salvos.',
                          );

                          // ?? MARCAR COMO CRIADO - vai auto-navegar para resumo
                          setAttendanceCreated(true);
                          setLoading(false);
                        } catch (error) {
                          setLoading(false);
                          alert(`? Erro ao criar atendimento: ${error.message}`);
                          console.error('Erro ao criar atendimento:', error);
                        }
                      }}
                      disabled={loading}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white animate-pulse"
                    >
                      {loading ? 'Salvando e criando...' : 'Criar Atendimento'}
                    </Button>
                  )}

                  {mode !== 'edit' && agendamentoData.status !== 'at_checkout' && (
                    <Button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          await handleSaveChanges();
                          setLoading(false);
                          onSuccess?.() || onClose();
                        } catch (error) {
                          setLoading(false);
                          alert(`? Erro ao salvar: ${error.message}`);
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                    >
                      {loading ? 'Salvando...' : 'Criar Agendamento'}
                    </Button>
                  )}
                </>
              )}

              {tabAtivo === 'resumo' && (
                <>
                  <Button variant="outline" onClick={() => setTabAtivo('cadastrais')}>
                    Voltar
                  </Button>
                  <Button
                    onClick={() => {
                      // Abrir modal de emiss�o de NF
                      setInvoiceModalOpen(true);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2"
                  >
                    Emitir NF
                  </Button>
                  <Button
                    onClick={() => {
                      onSuccess?.();
                      onClose();
                    }}
                    className="h-10 min-w-[190px] bg-green-600 hover:bg-green-700 text-white font-semibold gap-2 whitespace-nowrap"
                  >
                    <PlayCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Liberar para Atendimento</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* INVOICE EMISSION MODAL */}
      <InvoiceEmissionModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        onSuccess={(invoiceData) => {
          console.log('? NF emitida com sucesso:', invoiceData);
          // Fechar o modal de NF automaticamente
          // O callback j� fecha ap�s 2 segundos
        }}
        appointmentData={finalAppointment || appointment}
        patientData={selectedPatient || cadastralData}
      />

      {/* TISS SUBMISSION DIALOG */}
      {selectedGuideForTiss && (
        <TISSSubmissionDialog
          isOpen={tissDialogOpen}
          onClose={() => {
            setTissDialogOpen(false);
            setSelectedGuideForTiss(null);
          }}
          guideId={selectedGuideForTiss.id}
          clinicId={clinicId}
          guideData={{
            service_name: selectedGuideForTiss.services?.name,
            guide_number: faturamentoData.guide_number,
            patient_name: selectedGuideForTiss.patients?.name,
            professional_name: selectedGuideForTiss.professionals?.name,
            estimated_value: faturamentoData.estimated_value,
            diagnosis_code: faturamentoData.diagnosis_code,
            subscriber_number: faturamentoData.subscriber_number,
          }}
          onSubmitSuccess={() => {
            setTissDialogOpen(false);
            setSelectedGuideForTiss(null);
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}
