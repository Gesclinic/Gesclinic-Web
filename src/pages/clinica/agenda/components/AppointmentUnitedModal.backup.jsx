import React, { useState, useEffect, useMemo } from 'react';
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
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock3, Send } from 'lucide-react';
import { createAppointment, updateAppointment, mapFromDatabase } from '@/lib/appointmentsApi';
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
import PatientSearchOrCreate from './PatientSearchOrCreate';
import PhotoCapture from '@/components/PhotoCapture';
import { TISSSubmissionDialog } from '@/components/TISSSubmissionDialog';
import { processPaymentComplete } from '@/lib/paymentRegistrationApi';
import { getServicePrice } from '@/lib/getServicePrice';
import { checkMultipleDates } from '@/lib/holidaysApi';
import { supabase } from '@/lib/customSupabaseClient';
import { useAppointmentForm } from '@/modules/agenda/hooks/useAppointmentForm';
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

function parseLocalDate(dateString) {
  if (!dateString) {
    return null;
  }
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function formatDateToIso(dateValue) {
  if (!dateValue) {
    return '';
  }
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTimeValue(timeValue) {
  if (!timeValue) {
    return '';
  }
  return String(timeValue).split(':').slice(0, 2).join(':');
}

function timeToMinutes(timeValue) {
  const normalized = normalizeTimeValue(timeValue);
  if (!normalized) {
    return 0;
  }
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function isDateInsideScheduleRange(dateString, schedule) {
  if (!dateString) {
    return false;
  }
  const startsOk = !schedule?.start_date || dateString >= schedule.start_date;
  const endsOk = !schedule?.end_date || dateString <= schedule.end_date;
  return startsOk && endsOk;
}

function getSchedulesForDate(dateString, schedules) {
  const parsedDate = parseLocalDate(dateString);
  if (!parsedDate) {
    return [];
  }

  const weekday = parsedDate.getDay();

  return (schedules || [])
    .filter(
      (schedule) =>
        schedule &&
        schedule.active !== false &&
        Number(schedule.day_of_week) === weekday &&
        isDateInsideScheduleRange(dateString, schedule),
    )
    .sort((left, right) => timeToMinutes(left.start_time) - timeToMinutes(right.start_time));
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
 * 🎯 AppointmentUnitedModal - Componente Unificado
 *
 * Modos de operação:
 * - 'new': Criar novo agendamento
 * - 'edit': Editar agendamento existente
 * - 'reception': Atender paciente na recepção
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
  const { clinicId } = useClinicContext();
  const { user } = useAuth();
  const [tabAtivo, setTabAtivo] = useState('dados');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null); // ✅ Paciente selecionado
  const [attendanceCreated, setAttendanceCreated] = useState(false); // 🎬 Flag: Atendimento foi criado com sucesso
  const [professionalSchedules, setProfessionalSchedules] = useState([]);
  const [loadingProfessionalSchedules, setLoadingProfessionalSchedules] = useState(false);
  const [holidayMap, setHolidayMap] = useState({});
  const [calendarActiveStartDate, setCalendarActiveStartDate] = useState(new Date());
  const [accountPlans, setAccountPlans] = useState([]);
  const [loadedAppointmentFromId, setLoadedAppointmentFromId] = useState(null);
  const [tissDialogOpen, setTissDialogOpen] = useState(false); // 🎯 TISS Dialog state
  const [selectedGuideForTiss, setSelectedGuideForTiss] = useState(null); // 📋 Guide selecionado para envio TISS

  // 📥 Load appointment from appointmentIdToEdit if appointment prop is not provided
  useEffect(() => {
    console.log(
      '🔍 [AppointmentUnitedModal] useEffect DISPARO 1: appointmentIdToEdit?',
      appointmentIdToEdit,
      '!appointment?',
      !appointment,
      'isOpen?',
      isOpen,
    );
    if (appointmentIdToEdit && !appointment && isOpen) {
      console.log(
        '📥 [AppointmentUnitedModal] Carregando agendamento via appointmentIdToEdit:',
        appointmentIdToEdit,
      );

      (async () => {
        try {
          const { data: apt, error } = await supabase
            .from('appointments')
            .select(
              `
              id, clinic_id, patient_id, professional_id, service_id, room_id,
              payer_id, plan_id, scheduled_date, scheduled_time, end_time, status,
              notes, value, duration, payment_method, convenio_id, plano_contas_id,
              billing_notes, billing_data, guide_number, authorization_number,
              authorization_expiry, authorization_verified, card_number, discount,
              discount_reason, discount_authorized_by, discount_authorized_at,
              discount_observation,
              patients (id, name, phone, cell_phone, email, document_id, birthdate, gender, street, number, neighborhood, city, state, zip_code, record_number, photo_url),
              professionals (id, name),
              services (id, name, code),
              payers (id, name),
              plans (id, name, code),
              rooms (id, name)
            `,
            )
            .eq('id', appointmentIdToEdit)
            .eq('clinic_id', clinicId)
            .maybeSingle();

          if (error) {
            console.error('❌ Erro ao carregar agendamento:', error);
            setLoadedAppointmentFromId(null);
          } else if (!apt) {
            console.warn('⚠️ Agendamento não encontrado:', appointmentIdToEdit);
            setLoadedAppointmentFromId(null);
          } else {
            console.log('✅ Agendamento carregado via appointmentIdToEdit:', apt);
            // 🚨 DEBUG: Verificar se payer_id e room_id estão sendo trazidos
            console.log('🚨 [DEBUG] Dados críticos do banco:', {
              payer_id: apt.payer_id,
              room_id: apt.room_id,
              payers: apt.payers,
              rooms: apt.rooms,
            });
            // ✅ Aplicar mapFromDatabase para normalizar campos em camelCase
            const mappedApt = mapFromDatabase(apt);
            console.log('📊 [DEBUG] Agendamento após mapFromDatabase:', mappedApt);
            console.log('🚨 [DEBUG] payerId e roomId após mapFromDatabase:', {
              payerId: mappedApt.payerId,
              roomId: mappedApt.roomId,
            });
            setLoadedAppointmentFromId(mappedApt);
          }
        } catch (err) {
          console.error('❌ Exceção ao carregar agendamento:', err);
          setLoadedAppointmentFromId(null);
        }
      })();
    } else {
      setLoadedAppointmentFromId(null);
    }
  }, [appointmentIdToEdit, appointment, isOpen]);

  // 🔍 DEBUG - COMPREHENSIVE LOGGING
  console.log('='.repeat(70));
  console.log('📋 [AppointmentUnitedModal] RENDER STATE SNAPSHOT');
  console.log('='.repeat(70));
  console.log('🔹 MODO E ABERTURA:');
  console.log('   isOpen:', isOpen, '| mode:', mode, '| appointmentIdToEdit:', appointmentIdToEdit);
  console.log('🔹 DADOS RECEBIDOS:');
  console.log('   appointment prop:', !!appointment, appointment?.id);
  console.log(
    '   loadedAppointmentFromId:',
    !!loadedAppointmentFromId,
    loadedAppointmentFromId?.id,
  );
  console.log('🔹 DADOS CRÍTICOS DO APPOINTMENT:');
  if (appointment || loadedAppointmentFromId) {
    const apt = appointment || loadedAppointmentFromId;
    console.log('   payerId/payer_id:', apt.payerId || apt.payer_id);
    console.log('   roomId/room_id:', apt.roomId || apt.room_id);
    console.log('   professionalId/professional_id:', apt.professionalId || apt.professional_id);
    console.log('   date:', apt.date || apt.scheduled_date);
    console.log('   time:', apt.time || apt.startTime || apt.scheduled_time);
  }
  console.log('='.repeat(70));

  // 🔗 Consolidate appointment from both sources (prop or loaded via ID)
  const finalAppointment = useMemo(
    () => appointment || loadedAppointmentFromId,
    [appointment, loadedAppointmentFromId],
  );

  // 🎯 AVISO VISUAL SE MODE FOR 'new'
  if (isOpen && mode === 'new') {
    console.warn('⚠️ [MODE NOVO] Modal aberto em modo NEW - não vai salvar!');
  }

  // 🔄 AUTO-NAV: Se atendimento foi criado, vai para aba RESUMO
  useEffect(() => {
    if (attendanceCreated && tabAtivo !== 'resumo') {
      console.log('🎬 [AUTO-NAV] Atendimento criado! Navegando para aba RESUMO...');
      setTabAtivo('resumo');
    }
  }, [attendanceCreated, tabAtivo]);

  // 🔧 HOOK: Gerenciar estado do formulário de agendamento
  const { formData, setFormData, fillFromAppointment, reset: resetFormData } = useAppointmentForm();

  // Dados de Agendamento
  const [agendamentoData, setAgendamentoData] = useState({
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

  // Dados de Liberação
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

  // 🔍 FUNÇÃO HELPER PARA DETECTAR SE É PAYER "PARTICULAR"
  // Verifica se é particular pelo ID ('particular') OU pelo nome do payer ('Particular')
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

  // Inicializar/resetar dados ao abrir
  useEffect(() => {
    console.log('🎯 [INITIALIZATION EFFECT] Disparado! Estado atual:');
    console.log('   isOpen:', isOpen);
    console.log('   mode:', mode);
    console.log('   hasAppointment:', !!finalAppointment);
    console.log('   hasAppointmentProp:', !!appointment);
    console.log('   hasLoadedFromId:', !!loadedAppointmentFromId);
    console.log('   appointmentId:', finalAppointment?.id);

    if (isOpen) {
      if (mode === 'new') {
        console.log('✅ MODO: NEW - Resetando form para novo agendamento');
        console.log(
          '   finalAppointment && !finalAppointment.id =',
          finalAppointment && !finalAppointment.id,
        );
        // ✅ Se há appointment sem ID (vindo de slot), preencher com dados do slot
        if (finalAppointment && !finalAppointment.id) {
          console.log(
            '📅 [AppointmentUnitedModal] ✅ ENTRANDO NO IF - Modo NEW com slot data:',
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
          console.log('⏰ TIME FINAL:', finalAppointment.time, finalAppointment.scheduled_time);
          setAgendamentoData({
            date: finalAppointment.date || '',
            time: finalAppointment.time || finalAppointment.scheduled_time || '',
            endTime: '',
            duration: finalAppointment.duration || 30,
            patientName: '',
            patientId: null,
            phone: '',
            recordNumber: '',
            professionalId: finalAppointment.professionalId || '', // ✅ PRÉ-PREENCHER DO SLOT
            serviceId: '',
            serviceCode: '',
            payerId: '',
            planId: '',
            planCode: '',
            roomId: finalAppointment.roomId || '', // ✅ PRÉ-PREENCHER DO SLOT
            value: '0.00',
            notes: '',
            status: 'scheduled',
          });
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
            '✅ [AppointmentUnitedModal] Dados do slot pré-preenchidos com profissional:',
            finalAppointment.professionalId,
          );
        } else {
          // ✅ RESETAR TUDO para modo novo (sem dados de slot)
          console.log(
            '📅 [AppointmentUnitedModal] ❌ Entrando no ELSE - Resetando dados (sem slot data)',
          );
          console.log('   finalAppointment:', finalAppointment);
          console.log('   finalAppointment?.id:', finalAppointment?.id);
          setTabAtivo('dados');
          setSelectedPatient(null); // ✅ Limpar paciente selecionado
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
        console.log('✅ MODO: EDIT - Populando form com dados do agendamento');
        console.log(
          '📋 [AppointmentUnitedModal] EDIT MODE - appointment recebido:',
          finalAppointment,
        );
        console.log('  date (camelCase):', finalAppointment.date);
        console.log('  startTime (camelCase):', finalAppointment.startTime);
        console.log('  patient:', finalAppointment.patientName || finalAppointment.patients?.name);
        console.log('  professionalId (camelCase):', finalAppointment.professionalId);
        console.log('  payerId (camelCase):', finalAppointment.payerId);
        console.log('  roomId (camelCase):', finalAppointment.roomId);
        console.log(
          '🚨 [CRITICAL] Convênio (payer) detectado?',
          finalAppointment.payerId ? '✅ SIM' : '❌ NÃO',
        );
        setTabAtivo('dados');
        const newData = {
          date: finalAppointment.date || '',
          time: finalAppointment.startTime || '',
          endTime: finalAppointment.endTime || '',
          duration: finalAppointment.duration || 30,
          patientName: finalAppointment.patientName || finalAppointment.patients?.name || '',
          patientId: finalAppointment.patientId || null,
          phone: finalAppointment.patientPhone || finalAppointment.patients?.phone || '',
          recordNumber:
            finalAppointment.patientProntuario || finalAppointment.patients?.record_number || '',
          professionalId: finalAppointment.professionalId || '',
          serviceId: finalAppointment.serviceId || '',
          serviceCode: finalAppointment.serviceName || finalAppointment.services?.code || '',
          payerId: finalAppointment.payerId || '',
          planId: finalAppointment.planId || '',
          planCode: finalAppointment.planCode || finalAppointment.plans?.code || '',
          roomId: finalAppointment.roomId || '',
          value: finalAppointment.value?.toString() || '0.00',
          notes: finalAppointment.notes || '',
          status: finalAppointment.status || 'scheduled',
        };
        console.log('📝 [AppointmentUnitedModal] setAgendamentoData com:', newData);
        console.log(
          '💳 [DEBUG] payerId no newData:',
          newData.payerId,
          '| tipo:',
          typeof newData.payerId,
        );
        console.log('🎬 [IMPORTANTE] STATUS DO AGENDAMENTO:', newData.status);
        console.log(
          '🎬 [BOTÃO VISÍVEL?] status === "at_checkout"?',
          newData.status === 'at_checkout',
        );
        setAgendamentoData(newData);
        console.log('💳 [AFTER setAgendamentoData] agendamentoData será:', newData);

        // 👤 TAMBÉM CARREGAR DADOS CADASTRAIS DO PACIENTE
        console.log('👤 [AppointmentUnitedModal] Carregando dados cadastrais do paciente');
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

        // ✅ TAMBÉM CARREGAR SELECTEDPATIENT PARA MOSTRAR EM DESTAQUE
        if (finalAppointment.patients) {
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
        }

        // 💳 INICIALIZAR DADOS DE PAGAMENTO (para particular E convênio)
        console.log('💳 [AppointmentUnitedModal] Carregando dados de pagamento');
        console.log('   discount:', finalAppointment.discount);
        console.log('   payment_method:', finalAppointment.payment_method);
        console.log('   discount_reason:', finalAppointment.discount_reason);

        setPagamentoData((prev) => ({
          ...defaultPaymentData,
          payment_method: finalAppointment.payment_method || 'DINHEIRO',
          discount: finalAppointment.discount
            ? parseFloat(finalAppointment.discount).toFixed(2)
            : '0.00',
          discount_reason: finalAppointment.discount_reason || '',
          discount_authorized_by: finalAppointment.discount_authorized_by || null,
          discount_authorized_at: finalAppointment.discount_authorized_at || null,
          discount_observation: finalAppointment.discount_observation || '',
          plano_contas_id: finalAppointment.plano_contas_id || '',
          dinheiro: {
            ...defaultPaymentData.dinheiro,
            value_received: finalAppointment.value?.toString() || '0.00',
          },
        }));

        // 💳 SE FOR PARTICULAR, ADICIONAR CAMPOS ESPECÍFICOS
        if (checkIsParticular(finalAppointment.payerId || finalAppointment.payer_id)) {
          console.log('💳 [AppointmentUnitedModal] Pagador é particular');
        } else {
          console.log('💳 [AppointmentUnitedModal] Pagador é convênio/empresa');
        }

        // 📋 CARREGAR DADOS DE LIBERAÇÃO (Liberação tab)
        console.log('📋 [AppointmentUnitedModal] Carregando dados de liberação');
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

        // 📝 CARREGAR DADOS DE FATURAMENTO (Faturamento tab)
        console.log('📝 [AppointmentUnitedModal] Carregando dados de faturamento');
        console.log('   finalAppointment.billing_data:', finalAppointment.billing_data);
        console.log('   finalAppointment.guide_number:', finalAppointment.guide_number);
        console.log('   finalAppointment.value:', finalAppointment.value);

        // Tentar recuperar dados salvos anteriormente
        const savedFaturamento = sessionStorage.getItem(`faturamentoData_${finalAppointment.id}`);
        const faturamentoFromStorage = savedFaturamento ? JSON.parse(savedFaturamento) : null;

        // 🔍 DESSERIALIZAR billing_data JSON se existir
        let billingDataParsed = {};
        if (finalAppointment.billing_data) {
          try {
            console.log('   📦 billing_data exists, tipo:', typeof finalAppointment.billing_data);
            billingDataParsed =
              typeof finalAppointment.billing_data === 'string'
                ? JSON.parse(finalAppointment.billing_data)
                : finalAppointment.billing_data;
            console.log(
              '✅ [AppointmentUnitedModal] billing_data desserializado:',
              billingDataParsed,
            );
          } catch (err) {
            console.warn('⚠️ Erro ao desserializar billing_data:', err);
            console.warn('   billing_data raw:', finalAppointment.billing_data);
          }
        } else {
          console.log('   ⚠️ finalAppointment.billing_data é null/undefined');
        }

        console.log('📝 [Debug] Valores que serão usados no faturamentoData:');
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

  // � FIX: Garantir que o payerId seja restaurado quando o agendamento for carregado em modo EDIT
  useEffect(() => {
    if (isOpen && mode === 'edit' && finalAppointment && finalAppointment.id) {
      console.log('🔧 [FIX payerId + planId] Modal aberto em EDIT mode com agendamento carregado');
      console.log('   finalAppointment.payerId:', finalAppointment.payerId);
      console.log('   finalAppointment.payer_id:', finalAppointment.payer_id);
      console.log('   finalAppointment.planId:', finalAppointment.planId);
      console.log('   finalAppointment.plan_id:', finalAppointment.plan_id);

      const payerId = finalAppointment.payerId || finalAppointment.payer_id || '';
      console.log('   → payerId final a ser setado:', payerId);

      const planId = finalAppointment.planId || finalAppointment.plan_id || '';
      console.log('   → planId final a ser setado:', planId);
      setAgendamentoData((prev) => ({
        ...prev,
        payerId: payerId,
        planId: planId,
      }));
    }
  }, [isOpen, mode, finalAppointment]);

  // �💰 Carregar planos de contas
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    const loadPlans = async () => {
      try {
        console.log('📊 Carregando planos de contas para clinic:', clinicId);
        const { data: plans, error } = await supabase
          .from('account_plans')
          .select('id, name, parent_id')
          .eq('clinic_id', clinicId);

        if (error) {
          throw error;
        }
        console.log('📊 Planos carregados:', plans);

        // Apenas sub-planos (com parent_id)
        const filteredPlans = (plans || []).filter((p) => p.parent_id);
        console.log('📊 Planos filtrados (com parent_id):', filteredPlans);
        setAccountPlans(filteredPlans);
      } catch (err) {
        console.warn('Erro ao carregar planos de contas:', err);
      }
    };
    loadPlans();
  }, [clinicId]);

  // � ETAPA 4: Sincronizar appointment com formData do hook
  useEffect(() => {
    console.log('═══════════════════════════════════════════════');
    console.log('🔧 [ETAPA 4] useEffect sincronização disparado');
    console.log('   isOpen:', isOpen);
    console.log('   mode:', mode);
    console.log('   finalAppointment?.id:', finalAppointment?.id);
    console.log('═══════════════════════════════════════════════');

    if (!isOpen) {
      console.log('   ℹ️ Modal fechado - ignorando');
      return;
    }

    if (mode === 'new' || mode === 'create') {
      console.log('   📝 Modo CREATE - resetando form');
      resetFormData();
      return;
    }

    if (mode === 'edit' && finalAppointment) {
      console.log('   ✏️ Modo EDIT - preenchendo form com appointment');
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
      console.log('   ✅ formData preenchido com sucesso');
      console.log('   formData atual:', formData);
    }
  }, [isOpen, mode, finalAppointment?.id]);

  // �💰 AUTO-FETCH: Buscar valor quando profissional, serviço ou convênio mudar
  // OU quando o valor está vazio/zero (apenas quando há service)
  useEffect(() => {
    console.log('📊 [AppointmentUnitedModal] useEffect de preço disparado!', {
      serviceId: agendamentoData.serviceId,
      value: agendamentoData.value,
      isOpen,
      mode,
    });

    const fetchServicePrice = async () => {
      // Só buscar se temos pelo menos service
      if (!agendamentoData.serviceId) {
        console.log('  ❌ Sem serviceId, abortando busca');
        return;
      }

      // Só buscar automatically se o valor está vazio ou zero
      const currentValue = parseFloat(agendamentoData.value || '0');
      const valueIsEmpty =
        currentValue === 0 || agendamentoData.value === '0.00' || !agendamentoData.value;

      console.log('  📋 Verificando valor:', {
        currentValue,
        valueIsEmpty,
        agendamentoData_value: agendamentoData.value,
      });

      if (!valueIsEmpty) {
        console.log(
          '  ✅ Valor já preenchido:',
          agendamentoData.value,
          '- não buscando preço automático',
        );
        return;
      }

      try {
        console.log('  💰 Iniciando busca de preço automático...', {
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

        console.log('  🔍 Resultado da busca:', price);

        if (price !== null) {
          console.log('  ✅ Preço encontrado automaticamente:', price);
          setAgendamentoData((prev) => ({
            ...prev,
            value: price.toFixed(2).toString(),
          }));
        } else {
          console.log('  ⚠️ Nenhum preço encontrado em nenhuma tabela');
        }
      } catch (error) {
        console.error('  ❌ Erro ao buscar preço:', error);
      }
    };

    // Chamar quando service, professional, payer mudam OU quando o modal abre com valor vazio
    if (agendamentoData.serviceId && clinicId) {
      console.log('  📌 Condições OK! Chamando fetchServicePrice()');
      fetchServicePrice();
    } else {
      console.log('  ⚠️ Condições não atendidas:', {
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

  // � AUTO-UPDATE: Buscar preço quando o usuário MUDA profissional/serviço/convênio (mesmo com valor)
  useEffect(() => {
    const isLoadingInitial = mode === 'edit' && !isOpen;
    if (isLoadingInitial) {
      return;
    } // Não buscar durante o carregamento inicial

    const fetchUpdatedServicePrice = async () => {
      if (!agendamentoData.serviceId) {
        return;
      }

      try {
        console.log(
          '💰 [AppointmentUnitedModal] Buscando preço atualizado (usuário mudou seleção):',
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
          console.log('✅ [AppointmentUnitedModal] Preço atualizado encontrado:', price);
          setAgendamentoData((prev) => ({
            ...prev,
            value: price.toFixed(2).toString(),
          }));
        }
      } catch (error) {
        console.error('❌ [AppointmentUnitedModal] Erro ao buscar preço:', error);
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
      '🎯 [AppointmentUnitedModal] agendamentoData.professionalId MUDOU:',
      agendamentoData.professionalId,
    );
    if (agendamentoData.professionalId) {
      const profEstáNaLista = professionals.find((p) => p.id === agendamentoData.professionalId);
      console.log('   ✅ Profissional encontrado na lista:', profEstáNaLista);
    } else {
      console.log('   ⚠️ professionalId está vazio!');
    }
  }, [agendamentoData.professionalId, professionals]);

  // 🔍 DEBUG: Monitorar TODO o agendamentoData
  useEffect(() => {
    console.log('📊 [AppointmentUnitedModal] ESTADO COMPLETO agendamentoData:', {
      date: agendamentoData.date,
      time: agendamentoData.time,
      professionalId: agendamentoData.professionalId,
      serviceId: agendamentoData.serviceId,
      payerId: agendamentoData.payerId,
      roomId: agendamentoData.roomId,
      duration: agendamentoData.duration,
    });
  }, [agendamentoData]);

  // 🔍 DEBUG: Monitorar listas de dados disponíveis
  useEffect(() => {
    console.log('📋 [AppointmentUnitedModal] LISTAS DISPONÍVEIS:', {
      professionalsCount: professionals?.length || 0,
      servicesCount: services?.length || 0,
      payersCount: payers?.length || 0,
      roomsCount: rooms?.length || 0,
    });
    if (agendamentoData.serviceId) {
      const foundService = services.find((s) => s.id === agendamentoData.serviceId);
      console.log(
        `  ✅ Serviço ${agendamentoData.serviceId}: ${foundService?.name || 'NÃO ENCONTRADO'}`,
      );
    }
    if (agendamentoData.payerId) {
      const foundPayer = payers.find((p) => p.id === agendamentoData.payerId);
      console.log(
        `  ✅ Convênio ${agendamentoData.payerId}: ${foundPayer?.name || 'NÃO ENCONTRADO'}`,
      );
    }
  }, [professionals, services, payers, rooms, agendamentoData.serviceId, agendamentoData.payerId]);

  // 🔄 SINCRONIZAR CÓDIGO DO SERVIÇO COM SERVIÇO SELECIONADO
  useEffect(() => {
    if (agendamentoData.serviceId && services.length > 0) {
      const selectedService = services.find((s) => s.id === agendamentoData.serviceId);
      // ✅ Tenta diferentes propriedades possíveis para o código
      const serviceCode =
        selectedService?.code ||
        selectedService?.codigo ||
        selectedService?.service_code ||
        selectedService?.id ||
        '';
      console.log('🔄 [ServiceCode] Sincronizando código do serviço:', {
        serviceId: agendamentoData.serviceId,
        serviceName: selectedService?.name,
        serviceCode: serviceCode,
        availableKeys: selectedService ? Object.keys(selectedService) : [],
      });
      // ✅ Sempre sincroniza se temos um serviço selecionado, mesmo com código vazio
      if (serviceCode && agendamentoData.serviceCode !== serviceCode) {
        setAgendamentoData((prev) => ({ ...prev, serviceCode }));
      } else if (!serviceCode && agendamentoData.serviceCode) {
        // Se não encontrou código mas tinha antes, pode estar em branco
        setAgendamentoData((prev) => ({ ...prev, serviceCode: '' }));
      }
    }
  }, [agendamentoData.serviceId, services]);

  // ⚡ EM MODO EDIT: Se não temos o código do serviço, buscar diretamente do Supabase
  useEffect(() => {
    if (
      mode === 'edit' &&
      appointment &&
      agendamentoData.serviceId &&
      !agendamentoData.serviceCode
    ) {
      console.log(
        '⚡ [ServiceCode] Buscando código do serviço diretamente do Supabase (modo edit)...',
      );

      supabase
        .from('services')
        .select('id, code, name')
        .eq('id', agendamentoData.serviceId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.warn('⚡ [ServiceCode] Erro ao buscar serviço:', error);
            return;
          }

          if (!data) {
            console.warn('⚡ [ServiceCode] Serviço não encontrado:', agendamentoData.serviceId);
            return;
          }

          console.log('⚡ [ServiceCode] Serviço encontrado no Supabase:', data);
          if (data?.code) {
            console.log('⚡ [ServiceCode] Atualizando serviceCode com:', data.code);
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

  // � SINCRONIZAR LIBERAÇÃO COM FATURAMENTO ao avançar
  useEffect(() => {
    if (tabAtivo === 'pagamento') {
      console.log('📋 [AppointmentUnitedModal] Sincronizando dados de Liberação para Pagamento');
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
      console.log('🔴 [LIBERACAO TAB CARREGANDO]');
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

      console.log('   ✅ liberacaoData após setLiberacaoData será:', {
        card_number: appointment.card_number || '',
        auth_number: appointment.authorization_number || '',
      });
    }
  }, [tabAtivo, appointment, mode]);

  // PRESERVAR ALTERACOES EM LIBERACAO - GUARDAR EM SESSAO
  useEffect(() => {
    if (mode === 'edit' && appointment?.id && liberacaoData.auth_number) {
      sessionStorage.setItem(`liberacaoData_${appointment.id}`, JSON.stringify(liberacaoData));
      console.log('💾 Dados de Liberação guardados em sessão');
    }
  }, [liberacaoData, appointment?.id, mode]);

  // PRESERVAR ALTERACOES EM FATURAMENTO - GUARDAR EM SESSAO
  useEffect(() => {
    if (mode === 'edit' && appointment?.id && faturamentoData.guide_number) {
      sessionStorage.setItem(`faturamentoData_${appointment.id}`, JSON.stringify(faturamentoData));
      console.log('💾 Dados de Faturamento guardados em sessão');
    }
  }, [faturamentoData, appointment?.id, mode]);

  // Sincronizar NF Autorização (Liberação) com N° Guia TISS (Faturamento) ao carregar
  useEffect(() => {
    if (
      mode === 'edit' &&
      appointment &&
      (liberacaoData.auth_number || faturamentoData.guide_number)
    ) {
      // Se um tem valor e outro está vazio, sincronizar
      if (liberacaoData.auth_number && !faturamentoData.guide_number) {
        console.log('🔗 Sincronizando na carga: auth_number → guide_number');
        setFaturamentoData((prev) => ({ ...prev, guide_number: liberacaoData.auth_number }));
      } else if (faturamentoData.guide_number && !liberacaoData.auth_number) {
        console.log('🔗 Sincronizando na carga: guide_number → auth_number');
        setLiberacaoData((prev) => ({ ...prev, auth_number: faturamentoData.guide_number }));
      }
    }
  }, [mode, appointment?.id]); // Executar apenas uma vez ao abrir o appointment

  // �💳 SINCRONIZAR VALOR DE PAGAMENTO COM VALOR DO AGENDAMENTO
  useEffect(() => {
    const isParticular = checkIsParticular(agendamentoData.payerId);
    if (tabAtivo === 'pagamento' && isParticular) {
      const value = parseFloat(agendamentoData.value) || 0;
      setPagamentoData((prev) => ({
        ...prev,
        amount: agendamentoData.value,
        dinheiro: {
          ...prev.dinheiro,
          value_received: agendamentoData.value,
          change: '0.00',
        },
      }));
      console.log(
        '💳 [AppointmentUnitedModal] Sincronizado valor de pagamento:',
        agendamentoData.value,
      );
    }
  }, [tabAtivo, agendamentoData.value, agendamentoData.payerId]);

  // 🎁 SINCRONIZAR DESCONTO COM VALOR RECEBIDO (dinheiro)
  useEffect(() => {
    const isParticular = checkIsParticular(agendamentoData.payerId);
    const paymentMethod = pagamentoData.payment_method;

    if (isParticular && paymentMethod === 'DINHEIRO') {
      const totalValue = parseFloat(agendamentoData.value) || 0;
      const discount = parseFloat(pagamentoData.discount || 0);
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
        '🎁 [AppointmentUnitedModal] Desconto sincronizado - Valor recebido atualizado:',
        {
          total: totalValue,
          desconto: discount,
          valor_receber: finalValue.toFixed(2),
        },
      );
    }
  }, [
    pagamentoData.discount,
    agendamentoData.value,
    agendamentoData.payerId,
    pagamentoData.payment_method,
  ]);

  const isParticular = checkIsParticular(agendamentoData.payerId);
  const isConvenioFaturado = !isParticular && !!agendamentoData.payerId;

  useEffect(() => {
    let isMounted = true;

    async function loadProfessionalSchedules() {
      if (!isOpen || !agendamentoData.professionalId) {
        if (isMounted) {
          setProfessionalSchedules([]);
          setLoadingProfessionalSchedules(false);
        }
        return;
      }

      try {
        setLoadingProfessionalSchedules(true);

        let query = supabase
          .from('professional_schedules')
          .select('*')
          .eq('professional_id', agendamentoData.professionalId)
          .eq('active', true);

        if (clinicId) {
          query = query.eq('clinic_id', clinicId);
        }

        const { data, error } = await query.order('day_of_week').order('start_time');

        if (error) {
          throw error;
        }

        if (isMounted) {
          setProfessionalSchedules(data || []);
        }
      } catch (error) {
        console.error(
          '❌ [AppointmentUnitedModal] Erro ao carregar disponibilidade do profissional:',
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
  }, [isOpen, agendamentoData.professionalId, clinicId]);

  const selectedProfessional = useMemo(
    () =>
      professionals.find((professional) => professional.id === agendamentoData.professionalId) ||
      null,
    [professionals, agendamentoData.professionalId],
  );

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
          '❌ [AppointmentUnitedModal] Erro ao carregar feriados do calendario:',
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
    console.log(`📝 [updateAgendamentoField] Atualizando ${field}:`, value);
    setAgendamentoData((prev) => {
      const updated = { ...prev, [field]: value };
      console.log(`   ✅ agendamentoData.${field} agora é:`, updated[field]);
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

    // Sincronizar com Liberação
    if (field === 'guide_number' && value) {
      setLiberacaoData((prev) => ({ ...prev, auth_number: value }));
    }
  };

  const updatePagamentoField = (field, value) => {
    setPagamentoData((prev) => ({ ...prev, [field]: value }));
  };

  // Handler para mudanças em campos de pagamento
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

  // Handler para cálculo de troco (dinheiro)
  const handleCalculateChange = (sent, value) => {
    const amount = parseFloat(agendamentoData.value) || 0;
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

  // ✅ Handler para fechar a modal
  const handleCloseModal = () => {
    console.log('🔴 Fechando modal...');
    setSelectedPatient(null); // Limpar paciente selecionado
    onClose();
  };

  // 💾 SALVAR APENAS OS DADOS (sem criar atendimento)
  const handleSaveDataOnly = async () => {
    if (!appointment?.id) {
      alert('❌ Nenhum agendamento carregado para salvar');
      return;
    }

    try {
      setLoading(true);
      // 🚨 DEBUG ANTES DO SAVE
      console.log('🚨 DEBUG SAVE (handleSaveDataOnly)', {
        payerId: agendamentoData.payerId,
        roomId: agendamentoData.roomId,
        payerIdType: typeof agendamentoData.payerId,
        roomIdType: typeof agendamentoData.roomId,
        payerIdEmpty: !agendamentoData.payerId,
        roomIdEmpty: !agendamentoData.roomId,
      });

      console.log('💾 [SAVE DATA ONLY] Iniciando salvamento...', { id: appointment.id });
      console.log(
        '   ⚠️ [LIBERAÇÃO] liberacaoData COMPLETO:',
        JSON.stringify(liberacaoData, null, 2),
      );
      console.log('   ⚠️ [LIBERAÇÃO] card_number:', liberacaoData.card_number);
      console.log('   ⚠️ [LIBERAÇÃO] auth_number:', liberacaoData.auth_number);
      console.log('   ⚠️ [LIBERAÇÃO] authorized:', liberacaoData.authorized);
      console.log('   agendamentoData:', agendamentoData);
      console.log('   pagamentoData.payment_method:', pagamentoData.payment_method);
      console.log('   pagamentoData.plano_contas_id:', pagamentoData.plano_contas_id);
      console.log('   faturamentoData.plano_contas_id:', faturamentoData?.plano_contas_id);
      console.log('   faturamentoData.convenio_id:', faturamentoData?.convenio_id);
      console.log('   faturamentoData:', faturamentoData);

      // 🔍 DETERMINAR A ORIGEM CORRETA DO PLANO DE CONTAS
      // Se for particular, usar pagamentoData; senão, usar faturamentoData
      const isParticular = checkIsParticular(agendamentoData.payerId);
      const planoContasValue = isParticular
        ? pagamentoData?.plano_contas_id || null
        : faturamentoData?.plano_contas_id || null;

      const updateData = {
        patient_id: agendamentoData.patientId || null,
        status: agendamentoData.status,
        scheduled_date: agendamentoData.date,
        scheduled_time: agendamentoData.time,
        duration: agendamentoData.duration,
        professional_id: agendamentoData.professionalId || null,
        service_id: agendamentoData.serviceId || null,
        payer_id: agendamentoData.payerId || null,
        room_id: agendamentoData.roomId || null,
        value: agendamentoData.value ? parseFloat(agendamentoData.value) : null,
        discount: pagamentoData.discount ? parseFloat(pagamentoData.discount) : 0,
        discount_reason: pagamentoData.discount_reason || null,
        discount_authorized_by: pagamentoData.discount_authorized_by || null,
        discount_authorized_at: pagamentoData.discount_authorized_at || null,
        discount_observation: pagamentoData.discount_observation || null,
        notes: agendamentoData.notes,
        payment_method: pagamentoData.payment_method || null,
        convenio_id: faturamentoData?.convenio_id || null,
        plano_contas_id: planoContasValue,
        // 📋 DADOS DE LIBERAÇÃO
        card_number: liberacaoData.card_number || null,
        authorization_number: liberacaoData.auth_number || null,
        authorization_expiry: liberacaoData.auth_expiry || null,
        authorization_verified: liberacaoData.authorized === true,
      };

      console.log('   updateData a enviar:', JSON.stringify(updateData, null, 2));

      // � Normalizar strings vazias em null para campos UUID

      // �🔴 DEBUG CARD_NUMBER
      console.log('🔴 [CARD_NUMBER DEBUG ANTES DE ENVIAR]');
      console.log('   liberacaoData.card_number:', liberacaoData.card_number);
      console.log('   updateData.card_number:', updateData.card_number);
      console.log('   updateData.authorization_number:', updateData.authorization_number);
      console.log('   updateData.authorization_verified:', updateData.authorization_verified);

      console.log('🔍 [PLANO_CONTAS DEBUG]', {
        isParticular,
        source: isParticular ? 'pagamentoData (Particular)' : 'faturamentoData (Insurance)',
        valor: planoContasValue,
        pagamentoData_plano_contas_id: pagamentoData?.plano_contas_id,
        faturamentoData_plano_contas_id: faturamentoData?.plano_contas_id,
      });

      if (agendamentoData.endTime?.trim()) {
        updateData.end_time = agendamentoData.endTime;
      }

      console.log('📤 Enviando updateData para API:', JSON.stringify(updateData, null, 2));
      const result = await updateAppointment(appointment.id, updateData);

      // VERIFICAR O QUE RETORNOU DO UPDATE
      console.log('✅ API retornou:', result);
      console.log('🔴 [CARD_NUMBER DEBUG APÓS UPDATE]');
      console.log('   result.card_number:', result?.card_number);
      console.log('   result.authorization_number:', result?.authorization_number);

      console.log('   Valores específicos enviados:');
      console.log('   - payment_method:', updateData.payment_method);
      console.log('   - convenio_id:', updateData.convenio_id);
      console.log('   - plano_contas_id:', updateData.plano_contas_id);
      console.log('   - payer_id:', updateData.payer_id);
      console.log('   - room_id:', updateData.room_id);
      console.log('   - card_number:', updateData.card_number);
      console.log('   - authorization_number:', updateData.authorization_number);

      // 💳 SALVAR DADOS DE FATURAMENTO (incluindo billing_data JSON)
      if (faturamentoData && (faturamentoData.guide_number || faturamentoData.authorized_value)) {
        try {
          console.log('📝 Salvando dados de faturamento...', faturamentoData);

          // 🔍 Construir objeto billing_data com todos os campos
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

          console.log('💾 billing_data a ser salvo:', billingData);

          await supabase
            .from('appointments')
            .update({
              // 📋 DADOS DE LIBERAÇÃO
              card_number: liberacaoData.card_number || null,
              guide_number: faturamentoData.guide_number || null,
              authorization_number: faturamentoData.authorization_number || null,
              authorization_expiry: faturamentoData.auth_expiry || null,
              authorization_verified: faturamentoData.authorized === true,
              billing_data: billingData, // ✅ SALVAR JSON ESTRUTURADO
            })
            .eq('id', appointment.id);
          console.log('✅ Dados de faturamento salvos (incluindo billing_data)');
        } catch (billingErr) {
          console.warn('⚠️ Erro ao salvar dados de faturamento:', billingErr);
        }
      }

      // 🔄 RECARREGAR AGENDAMENTO DO BANCO PARA REFLETIR AS MUDANÇAS
      try {
        console.log('🔄 Recarregando agendamento do banco...');
        const { data: refreshedAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointment.id)
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Erro ao recarregar:', fetchError);
        } else if (!refreshedAppointment) {
          console.warn('⚠️ Agendamento não encontrado após atualização');
        } else if (refreshedAppointment) {
          console.log('🔄 Agendamento recarregado:', {
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
        console.warn('⚠️ Erro ao recarregar agendamento:', reloadErr);
      }

      console.log('✅ Dados salvos com sucesso!');
      alert('✅ Dados do agendamento salvos com sucesso!');
      setLoading(false);
    } catch (err) {
      console.error('❌ Erro ao salvar dados:', err);
      alert(`❌ Erro ao salvar: ${err.message}`);
      setLoading(false);
    }
  };

  // 🎁 Registrar desconto (se houver)
  const registerDiscountIfNeeded = async (appointmentId) => {
    const discount = parseFloat(pagamentoData.discount || 0);
    if (discount <= 0 || !pagamentoData.discount_reason) {
      return null;
    }

    try {
      console.log('🎁 Registrando desconto...', { appointment: appointmentId, amount: discount });

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
        console.error('❌ Erro ao registrar desconto:', error);
        throw error;
      }

      console.log('✅ Desconto registrado com sucesso:', data.id);
      return data;
    } catch (err) {
      console.error('❌ Erro ao registrar desconto:', err);
      throw err;
    }
  };

  // Handle saving appointment changes
  const handleSaveChanges = async () => {
    try {
      // � DEBUG ETAPA 6: Verificar formData
      console.log('═══════════════════════════════════════════════');
      console.log('🔧 [ETAPA 6] handleSaveChanges DISPARADO');
      console.log('═══════════════════════════════════════════════');
      console.log('📝 formData (hook state):', formData);
      console.log('📋 agendamentoData (modal state):', {
        payer_id: agendamentoData.payerId,
        room_id: agendamentoData.roomId,
        professional_id: agendamentoData.professionalId,
        service_id: agendamentoData.serviceId,
        scheduled_date: agendamentoData.date,
        scheduled_time: agendamentoData.time,
        value: agendamentoData.value,
      });
      console.log('═══════════════════════════════════════════════');

      // �🚨 DEBUG ANTES DO SAVE
      console.log('🚨 DEBUG SAVE (handleSaveChanges)', {
        payerId: agendamentoData.payerId,
        roomId: agendamentoData.roomId,
        payerIdType: typeof agendamentoData.payerId,
        roomIdType: typeof agendamentoData.roomId,
        payerIdEmpty: !agendamentoData.payerId,
        roomIdEmpty: !agendamentoData.roomId,
      });

      console.log('💾 [SAVE INITIATED]', {
        mode,
        appointmentId: appointment?.id,
        currentStatus: agendamentoData.status,
      });

      let appointmentId = appointment?.id;
      let patientId = appointment?.patient_id;

      // 📝 MODO NOVO: Criar novo agendamento
      if (mode === 'new') {
        console.log('📝 Criando novo agendamento...', {
          data: agendamentoData.date,
          tempo: agendamentoData.time,
        });

        let finalPatientId = agendamentoData.patientId || null;

        // 👤 SE NENHUM PACIENTE SELECIONADO, CRIAR NOVO PACIENTE COM DADOS BÁSICOS
        if (!agendamentoData.patientId && agendamentoData.patientName?.trim()) {
          console.log('👤 Criando novo paciente automaticamente...', {
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
          console.log('✅ Novo paciente criado!', newPatient);
          finalPatientId = newPatient.id;
        }

        const newAppointmentData = {
          clinic_id: clinicId,
          patient_id: finalPatientId,
          patient_type: finalPatientId ? 'PATIENT' : 'LEAD',
          lead_name: !finalPatientId ? agendamentoData.patientName : null,
          lead_phone: !finalPatientId ? agendamentoData.phone : null,
          professional_id: agendamentoData.professionalId || null,
          service_id: agendamentoData.serviceId || null,
          payer_id: agendamentoData.payerId || null,
          room_id: agendamentoData.roomId || null,
          scheduled_date: agendamentoData.date,
          scheduled_time: agendamentoData.time,
          end_time: agendamentoData.endTime?.trim() ? agendamentoData.endTime : null,
          status: 'scheduled',
          notes: agendamentoData.notes,
          value: agendamentoData.value ? parseFloat(agendamentoData.value) : null,
          discount: pagamentoData.discount ? parseFloat(pagamentoData.discount) : 0,
          duration: agendamentoData.duration,
          payment_method: pagamentoData.payment_method || null,
          convenio_id: faturamentoData?.convenio_id || null,
          plano_contas_id:
            faturamentoData?.plano_contas_id || pagamentoData?.plano_contas_id || null,
        };

        const createdAppointment = await createAppointment(newAppointmentData);
        console.log('✅ Novo agendamento criado com sucesso!', createdAppointment);

        appointmentId = createdAppointment.id;
        patientId = createdAppointment.patient_id;
      }
      // ✏️ MODO EDITAR: Atualizar agendamento existente
      else if (mode === 'edit' && appointmentId) {
        console.log('💾 Atualizando agendamento...', { id: appointmentId });

        // 🔧 FUNÇÃO AUXILIAR: Calcular end_time baseado na hora inicial e duração
        const calcularEndTime = (startTime, durationMinutes = 30) => {
          if (!startTime) {
            return null;
          }
          const startMinutes = timeToMinutes(startTime);
          const endMinutes = startMinutes + (durationMinutes || 30);
          return minutesToTime(endMinutes);
        };

        const payload = {
          scheduled_date: agendamentoData.date,
          scheduled_time: agendamentoData.time,
          end_time: calcularEndTime(agendamentoData.time, agendamentoData.duration),
          duration: agendamentoData.duration || 30,

          patient_id: agendamentoData.patientId || null,
          professional_id: agendamentoData.professionalId || null,
          service_id: agendamentoData.serviceId || null,

          payer_id: agendamentoData.payerId || null,
          room_id: agendamentoData.roomId || null,

          value: agendamentoData.value ? parseFloat(agendamentoData.value) : null,
          discount: pagamentoData.discount ? parseFloat(pagamentoData.discount) : 0,
          discount_reason: agendamentoData.discount_reason || null,
          discount_authorized_by: agendamentoData.discount_authorized_by || null,
          discount_authorized_at: agendamentoData.discount_authorized_at || null,
          discount_observation: agendamentoData.discount_observation || null,

          payment_method: pagamentoData.payment_method || null,

          status: agendamentoData.status,
          notes: agendamentoData.notes || null,
        };

        console.log('🚀 PAYLOAD COMPLETO PARA UPDATE:', payload);
        console.log('💾 Campos do payload:', Object.keys(payload));
        console.log('   - date:', payload.scheduled_date);
        console.log('   - time:', payload.scheduled_time);
        console.log('   - payer_id:', payload.payer_id);
        console.log('   - room_id:', payload.room_id);
        console.log('   - value:', payload.value);
        console.log('   - duration:', payload.duration);

        const updateData = payload;

        const result = await updateAppointment(appointmentId, updateData);

        console.log('✅ Agendamento atualizado com sucesso!');
        console.log('🔍 [DEBUG] Resposta retornada:', JSON.stringify(result, null, 2));
        console.log('   Valores específicos que foram atualizados:');
        console.log('   - payer_id:', updateData.payer_id);
        console.log('   - room_id:', updateData.room_id);
        console.log('   - professional_id:', updateData.professional_id);
        console.log('   - service_id:', updateData.service_id);

        // 💳 SALVAR DADOS DE FATURAMENTO (se houver)
        if (faturamentoData && (faturamentoData.guide_number || faturamentoData.authorized_value)) {
          console.log('📝 Salvando dados de faturamento...', faturamentoData);
          try {
            // 🔍 Construir objeto billing_data com todos os campos
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
                // 📋 DADOS DE LIBERAÇÃO
                card_number: liberacaoData.card_number || null,
                guide_number: faturamentoData.guide_number || null,
                authorization_number: faturamentoData.authorization_number || null,
                authorization_expiry: faturamentoData.auth_expiry || null,
                authorization_verified: faturamentoData.authorized === true,
                billing_data: billingData, // ✅ SALVAR JSON ESTRUTURADO
                billing_notes: faturamentoData.service_name || null,
              })
              .eq('id', appointmentId);
            console.log('✅ Dados de faturamento salvos com sucesso!');
          } catch (billingErr) {
            console.error('⚠️ Erro ao salvar dados de faturamento:', billingErr);
            // Não bloqueia o salvamento do agendamento
          }
        }
      }

      // � SE FOR RECEPÇÃO, ATUALIZAR DADOS DO PACIENTE
      if (mode === 'reception' && patientId) {
        console.log('👤 Atualizando dados do paciente em modo recepção:', patientId);
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
          console.log('✅ Dados do paciente atualizados com sucesso!');
        } catch (patientErr) {
          console.error('⚠️ Erro ao atualizar paciente:', patientErr);
          // Não bloqueia o salvamento
        }
      }

      // �💳 SE FOR PARTICULAR E HOUVER DADOS DE PAGAMENTO, PROCESSAR
      if (
        (isParticular || !agendamentoData.payerId) &&
        appointmentId &&
        user?.id &&
        pagamentoData.payment_method
      ) {
        console.log('💳 Processando pagamento para appointmentId:', appointmentId);

        // ⚠️ Validar pagamento APENAS se há dados preenchidos
        if (pagamentoData.payment_method !== 'DINHEIRO' || pagamentoData.dinheiro?.value_received) {
          const validation = validatePaymentData(pagamentoData.payment_method, pagamentoData);

          if (!validation.valid) {
            console.warn(
              '⚠️ Dados de pagamento incompletos (será preenchido na recepção):',
              validation.errors,
            );
            // Não vai bloquear a criação do agendamento
          } else {
            // 💰 Calcular valor com desconto
            const originalValue = parseFloat(agendamentoData.value) || 0;
            const discountAmount = parseFloat(pagamentoData.discount || 0);
            const finalValue = originalValue - discountAmount;

            console.log(
              `💰 Valor original: ${originalValue}, Desconto: ${discountAmount}, Valor final: ${finalValue}`,
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
                console.warn('⚠️ Pagamento não processado:', paymentResult.error);
              } else {
                console.log('✅ Pagamento processado com sucesso!', paymentResult);

                // 🎁 Registrar desconto (se houver)
                if (discountAmount > 0) {
                  try {
                    await registerDiscountIfNeeded(appointmentId);
                  } catch (discountErr) {
                    console.error('⚠️ Desconto não foi registrado:', discountErr);
                  }
                }
              }
            } catch (paymentErr) {
              console.warn('⚠️ Erro ao processar pagamento (será feito na recepção):', paymentErr);
            }
          }
        } else {
          console.log('ℹ️ Agendamento criado sem pagamento (será feito na recepção)');
        }
      } else {
        console.log('ℹ️ Agendamento criado para convênio (pagamento será administrado depois)');
      }

      console.log('✅ Agendamento processado com sucesso! Chamando callbacks...');

      // 🎉 SUCESSO: Chamar callbacks e fechar
      if (mode === 'edit' || mode === 'new') {
        console.log('📌 Chamando onSuccess...');
        onSuccess?.();
        console.log('📌 Fechando modal...');
        handleCloseModal();
      } else if (mode === 'reception') {
        console.log('📌 Modo recepção: Aguardando ação do usuário...');
        onSuccess?.();
      }

      return true;
    } catch (err) {
      console.error('❌ Erro ao salvar agendamento:', err);
      throw err;
    }
  };

  const tabClass = (tab) => `
    px-4 py-3 font-medium text-base border-b-2 transition-colors cursor-pointer
    ${
      tabAtivo === tab
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-600 hover:text-gray-900'
    }
  `;

  // 🎯 RENDER LOG - COMPREHENSIVE STATE SNAPSHOT
  if (isOpen) {
    console.log('🎨 [AppointmentUnitedModal RENDER]');
    console.log('   Mode:', mode, '| Tab:', tabAtivo, '| IsOpen:', isOpen);
    console.log('   📋 Form State Summary:');
    console.log('     - Data:', agendamentoData.date, '|', 'Time:', agendamentoData.time);
    console.log('     - Patient:', agendamentoData.patientName);
    console.log('     - Professional:', agendamentoData.professionalId);
    console.log('     - Service:', agendamentoData.serviceId);
    console.log('     - 💳 Payer:', agendamentoData.payerId, agendamentoData.payerId ? '✅' : '❌');
    console.log('     - Room:', agendamentoData.roomId);
    console.log('   📚 Loaded Data:');
    console.log('     - Professionals:', professionals?.length);
    console.log('     - Services:', services?.length);
    console.log('     - Payers:', payers?.length);
    console.log('     - Selected Patient:', !!selectedPatient);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content">
          <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6 text-left">
            <DialogTitle className="flex items-center gap-3">
              <span>
                {mode === 'new' && '📅 Novo Agendamento'}
                {mode === 'edit' && '✏️ Editar Agendamento'}
                {mode === 'reception' && `📋 Atendimento - ${agendamentoData.patientName}`}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* ABAS */}
              <div className="border-b border-gray-200 flex gap-2 flex-wrap overflow-x-auto">
                {(mode === 'new' || mode === 'edit') && (
                  <button
                    type="button"
                    onClick={() => setTabAtivo('dados')}
                    className={tabClass('dados')}
                  >
                    📅 Dados do Agendamento
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTabAtivo('cadastrais')}
                  className={tabClass('cadastrais')}
                >
                  👤 Dados Cadastrais
                </button>

                {mode === 'reception' && (
                  <button
                    type="button"
                    onClick={() => setTabAtivo('status')}
                    className={tabClass('status')}
                  >
                    📊 Status & Liberação
                  </button>
                )}

                {isConvenioFaturado && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTabAtivo('liberacao')}
                      className={tabClass('liberacao')}
                    >
                      ✓ Liberação
                    </button>

                    <button
                      type="button"
                      onClick={() => setTabAtivo('faturamento')}
                      className={tabClass('faturamento')}
                    >
                      💰 Faturamento
                    </button>
                  </>
                )}

                {isParticular && (
                  <button
                    type="button"
                    onClick={() => setTabAtivo('pagamento')}
                    className={tabClass('pagamento')}
                  >
                    💳 Pagamento
                  </button>
                )}

                {mode === 'reception' && (
                  <button
                    type="button"
                    onClick={() => setTabAtivo('resumo')}
                    className={tabClass('resumo')}
                  >
                    ✅ Resumo Final
                  </button>
                )}
              </div>

              {/* CONTEÚDO */}
              <div className="space-y-4">
                {/* ABA: DADOS AGENDAMENTO */}
                {tabAtivo === 'dados' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-blue-900">
                        📅 Preencha os dados do agendamento
                      </p>
                    </div>

                    <PatientSearchOrCreate
                      clinicId={clinicId}
                      initialPhone={agendamentoData.phone}
                      selectedPatient={selectedPatient}
                      onSelect={(pacientData) => {
                        console.log('✅ Paciente selecionado:', pacientData);
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
                        <p className="text-sm font-semibold text-blue-900 mb-3">
                          ➕ Novo Paciente - Preencha dados básicos
                        </p>
                        <p className="text-xs text-blue-700 mb-4">
                          Dados completos serão preenchidos quando o paciente chegar na recepção
                        </p>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm">👤 Nome do Paciente *</Label>
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
                        <Label>🕐 Hora * (Atual: {agendamentoData.time})</Label>
                        <Input
                          type="time"
                          value={agendamentoData.time || ''}
                          onChange={(e) => {
                            console.log('🔴 [TIME INPUT] onChange disparado!');
                            console.log('   e.target.value:', e.target.value);
                            console.log('   typeof:', typeof e.target.value);
                            updateAgendamentoField('time', e.target.value);
                          }}
                          onBlur={(e) =>
                            console.log('🔵 [TIME INPUT] onBlur - Valor final:', e.target.value)
                          }
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
                          onChange={(e) =>
                            updateAgendamentoField('duration', parseInt(e.target.value) || 30)
                          }
                        />
                      </div>
                      <div>
                        <Label>🚪 Sala</Label>
                        <Select
                          value={agendamentoData.roomId || ''}
                          onValueChange={(value) => {
                            console.log('🚪 [SELECT SALA] Valor selecionado:', value);
                            console.log(
                              '   Room encontrada:',
                              rooms?.find((r) => r.id === value),
                            );
                            updateAgendamentoField('roomId', value);
                            setFormData((prev) => ({ ...prev, room_id: value }));
                          }}
                        >
                          <SelectTrigger>
                            {agendamentoData.roomId &&
                            rooms.find((r) => r.id === agendamentoData.roomId) ? (
                              <span>
                                {rooms.find((r) => r.id === agendamentoData.roomId)?.name}
                              </span>
                            ) : (
                              <SelectValue placeholder="Selecione sala" />
                            )}
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
                          {agendamentoData.professionalId &&
                          professionals.find((p) => p.id === agendamentoData.professionalId) ? (
                            <span>
                              {
                                professionals.find((p) => p.id === agendamentoData.professionalId)
                                  ?.name
                              }
                            </span>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>💊 Serviço *</Label>
                        <Select
                          value={agendamentoData.serviceId || ''}
                          onValueChange={(value) => {
                            console.log('💊 [Select] Serviço selecionado:', value);
                            const selectedService = services.find((s) => s.id === value);
                            console.log('💊 [DEBUG] Service found:', selectedService);
                            console.log(
                              '💊 [DEBUG] Service keys:',
                              selectedService ? Object.keys(selectedService) : 'null',
                            );
                            console.log('💊 [DEBUG] Service code value:', selectedService?.code);
                            updateAgendamentoField('serviceId', value);
                            setFormData((prev) => ({ ...prev, service_id: value }));
                            // ✅ Tenta: code, codigo, service_code, ou id como fallback
                            const serviceCode =
                              selectedService?.code ||
                              selectedService?.codigo ||
                              selectedService?.service_code ||
                              selectedService?.id ||
                              '';
                            console.log('💊 [DEBUG] Final serviceCode:', serviceCode);
                            updateAgendamentoField('serviceCode', serviceCode);
                          }}
                        >
                          <SelectTrigger>
                            {agendamentoData.serviceId &&
                            services.find((s) => s.id === agendamentoData.serviceId) ? (
                              <span>
                                {services.find((s) => s.id === agendamentoData.serviceId)?.name}
                              </span>
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
                        {(() => {
                          console.log('🏥 [RENDER Select Convênio]', {
                            payerId: agendamentoData.payerId,
                            type: typeof agendamentoData.payerId,
                            isEmpty: !agendamentoData.payerId,
                            payersCount: payers?.length,
                            selectedPayer: payers?.find((p) => p.id === agendamentoData.payerId),
                            allPayers: payers?.map((p) => ({ id: p.id, name: p.name })),
                          });
                          return null;
                        })()}
                        <Select
                          value={agendamentoData.payerId || ''}
                          onValueChange={(value) => {
                            console.log('🏥 [Select] Convênio selecionado:', value);
                            console.log(
                              '   Payer encontrado:',
                              payers?.find((p) => p.id === value),
                            );
                            updateAgendamentoField('payerId', value);
                            setFormData((prev) => ({ ...prev, payer_id: value }));
                          }}
                        >
                          <SelectTrigger>
                            {agendamentoData.payerId &&
                            payers.find((p) => p.id === agendamentoData.payerId) ? (
                              <span>
                                {payers.find((p) => p.id === agendamentoData.payerId)?.name}
                              </span>
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
                      <Label>�📝 Observações</Label>
                      <Textarea
                        placeholder="Observações importantes..."
                        value={agendamentoData.notes}
                        onChange={(e) => updateAgendamentoField('notes', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* ABA: CADASTRAIS */}
                {tabAtivo === 'cadastrais' && (
                  <div className="space-y-4">
                    {selectedPatient && (
                      <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4">
                        <p className="text-sm font-semibold text-green-900">
                          ✅ Dados do paciente "{selectedPatient.patientName}" carregados
                        </p>
                        <p className="text-xs text-green-800 mt-1">
                          Você pode editar os dados abaixo se necessário
                        </p>
                      </div>
                    )}

                    {/* Grid de Dados + Foto */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* COLUNA ESQUERDA: Dados Cadastrais */}
                      <div className="col-span-2 space-y-4">
                        <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                          <p className="text-sm font-semibold text-blue-900">
                            📋 Dados Cadastrais (Padrão TISS)
                          </p>
                        </div>

                        <div>
                          <Label>📝 Nome Completo *</Label>
                          <Input
                            placeholder="Nome completo"
                            value={cadastralData.name}
                            onChange={(e) => updateCadastralField('name', e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>🆔 CPF/RG *</Label>
                            <Input
                              placeholder="CPF ou RG"
                              value={cadastralData.document_id}
                              onChange={(e) => updateCadastralField('document_id', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>🎂 Data de Nascimento</Label>
                            <Input
                              type="date"
                              value={cadastralData.birthdate}
                              onChange={(e) => updateCadastralField('birthdate', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>📞 Telefone *</Label>
                            <Input
                              placeholder="(11) 9999-9999"
                              value={cadastralData.phone}
                              onChange={(e) => updateCadastralField('phone', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>📱 Celular</Label>
                            <Input
                              placeholder="(11) 99999-9999"
                              value={cadastralData.cell_phone}
                              onChange={(e) => updateCadastralField('cell_phone', e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>✉️ Email</Label>
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            value={cadastralData.email}
                            onChange={(e) => updateCadastralField('email', e.target.value)}
                          />
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-gray-700">📍 Endereço</p>
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
                              placeholder="Número"
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

                      {/* COLUNA DIREITA: Seção de Foto do Paciente */}
                      <div className="bg-green-50 border border-green-300 rounded-lg p-4 h-fit">
                        <p className="text-sm font-semibold text-gray-700 mb-3">
                          📸 Foto do Paciente
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
                                // Apenas remove do state local - será salvo quando clicar em "Salvar Dados Cadastrais"
                                setCadastralData((prev) => ({ ...prev, photo_url: null }));
                                alert(
                                  '✅ Foto removida! Clique em "Salvar Dados Cadastrais" para confirmar.',
                                );
                              }}
                              className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                            >
                              🗑️ Remover Foto
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
                              console.log('📸 Foto capturada e salva no state');
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Botão de salvar dados cadastrais - Full width abaixo do grid */}
                    {mode === 'edit' && appointment?.patient_id && (
                      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={async () => {
                            try {
                              setSubmitting(true);
                              console.log('💾 Salvando dados cadastrais do paciente...');

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
                              console.log('✅ Dados cadastrais salvos com sucesso!');
                              alert('✅ Dados cadastrais salvos com sucesso!');
                              setSubmitting(false);
                            } catch (err) {
                              console.error('❌ Erro ao salvar dados cadastrais:', err);
                              alert('❌ Erro ao salvar dados cadastrais: ' + err.message);
                              setSubmitting(false);
                            }
                          }}
                          className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                        >
                          {submitting ? '⏳ Salvando...' : '💾 Salvar Dados Cadastrais'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA: STATUS & LIBERAÇÃO (RECEPÇÃO) */}
                {tabAtivo === 'status' && mode === 'reception' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-blue-900">
                        📊 Status do Agendamento
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
                      <Label>🔄 Atualizar Status *</Label>
                      <Select
                        value={agendamentoData.status || 'scheduled'}
                        onValueChange={(newStatus) => {
                          console.log('🔄 Tentando transicionar:', {
                            from: agendamentoData.status,
                            to: newStatus,
                          });

                          // Validar transição
                          const validation = isStatusTransitionAllowed(
                            agendamentoData.status,
                            newStatus,
                          );
                          if (!validation.allowed) {
                            alert(`⚠️ ${validation.reason}`);
                            return;
                          }

                          // Validar dados obrigatórios
                          const missingFields = validatePatientDataForStatus(
                            newStatus,
                            cadastralData,
                          );
                          if (missingFields.length > 0) {
                            alert(
                              `⚠️ Dados obrigatórios não preenchidos:\n\n${missingFields.join('\n')}`,
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

                    {/* Aviso de Validação */}
                    {(agendamentoData.status === BOOKING_STATUSES.AT_CHECKOUT ||
                      agendamentoData.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL) && (
                      <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
                        <p className="text-sm text-orange-900 font-semibold">
                          ⚠️ Dados Obrigatórios Validados
                        </p>
                        <p className="text-xs text-orange-800 mt-1">Nome Completo ✓ e CPF/RG ✓</p>
                      </div>
                    )}

                    {/* Info sobre Transições */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                      <p>
                        <strong>🗓️ Agendado:</strong> Criado na agenda
                      </p>
                      <p>
                        <strong>☎️ Confirmado via Telefone:</strong> Paciente confirmou por telefone
                      </p>
                      <p>
                        <strong>💬 Confirmado via WhatsApp:</strong> Paciente confirmou por WhatsApp
                      </p>
                      <p>
                        <strong>📍 Na Recepção:</strong> Paciente chegou e iniciou check-in
                      </p>
                      <p>
                        <strong>🪟 No Guichê:</strong> Validando dados obrigatórios
                      </p>
                      <p>
                        <strong>👨‍⚕️ Aguardando Profissional:</strong> Pronto para ser atendido
                      </p>
                      <p>
                        <strong>⏳ Em Atendimento:</strong> Profissional atendendo o paciente
                      </p>
                      <p>
                        <strong>✔️ Atendido:</strong> Atendimento finalizado
                      </p>
                    </div>
                  </div>
                )}

                {/* ABA: LIBERAÇÃO */}
                {tabAtivo === 'liberacao' && isConvenioFaturado && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-green-900">
                        ✓ Validação do Convênio
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>🎫 Nº Carteira/Matrícula *</Label>
                        <Input
                          placeholder="Número da carteira"
                          value={liberacaoData.card_number}
                          onChange={(e) => updateLiberacaoField('card_number', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>📋 Nº Autorização</Label>
                        <Input
                          placeholder="Número da autorização"
                          value={liberacaoData.auth_number}
                          onChange={(e) => updateLiberacaoField('auth_number', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>📅 Validade da Autorização</Label>
                      <Input
                        type="date"
                        value={liberacaoData.auth_expiry || ''}
                        onChange={(e) => updateLiberacaoField('auth_expiry', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>✓ Autorizado?</Label>
                      <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={liberacaoData.authorized}
                          onChange={(e) => updateLiberacaoField('authorized', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          ✅ Paciente está autorizado para atendimento
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
                        💰 Dados de Faturamento TISS
                      </p>
                    </div>

                    <div>
                      <Label>📋 Nº Guia TISS *</Label>
                      <Input
                        placeholder="Número da guia"
                        value={faturamentoData.guide_number}
                        onChange={(e) => updateFaturamentoField('guide_number', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>💳 Forma de Pagamento</Label>
                      <Select
                        value={pagamentoData.payment_method || 'DINHEIRO'}
                        onValueChange={(value) => updatePagamentoField('payment_method', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DINHEIRO">💵 Dinheiro</SelectItem>
                          <SelectItem value="CARTAO">💳 Cartão</SelectItem>
                          <SelectItem value="PIX">📱 PIX</SelectItem>
                          <SelectItem value="CHEQUE">📋 Cheque</SelectItem>
                          <SelectItem value="BOLETO">📄 Boleto</SelectItem>
                          <SelectItem value="DOC">🏦 DOC</SelectItem>
                          <SelectItem value="TED">⚡ TED</SelectItem>
                          <SelectItem value="DEPOSITO">💰 Depósito</SelectItem>
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
                        <Label>📌 Código Procedimento</Label>
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
                        <Label>💵 Valor Estimado (R$)</Label>
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
                        <Label>✓ Valor Autorizado (R$)</Label>
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
                      <Label>📊 Plano de Contas *</Label>
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

                    {/* SEÇÃO DE DADOS TISS ADICIONAIS */}
                    <div className="border-t border-purple-200 pt-4 mt-4">
                      <p className="text-sm font-semibold text-purple-900 mb-4">
                        📋 Dados Adicionais TISS
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>🔍 Código CID (Diagnóstico)</Label>
                          <Input
                            placeholder="Ex: E11 (Diabetes)"
                            value={faturamentoData.diagnosis_code || ''}
                            onChange={(e) =>
                              updateFaturamentoField('diagnosis_code', e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label>🔢 Quantidade de Procedimentos</Label>
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
                        <Label className="mt-3">👤 Nº Beneficiário (Segurado)</Label>
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
                          👨‍👩‍👧 Dados do Dependente (se aplicável)
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Nº Beneficiário Dependente</Label>
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
                        <Label>📝 Observações/Notas</Label>
                        <Textarea
                          placeholder="Observações adicionais para faturamento"
                          value={faturamentoData.notes || ''}
                          onChange={(e) => updateFaturamentoField('notes', e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* BOTÃO ENVIAR TISS */}
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
                            📤 Enviar para TISS
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
                      <p className="text-sm font-semibold text-orange-900">💳 Dados de Pagamento</p>
                    </div>

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
                          <SelectItem value="DINHEIRO">💵 Dinheiro</SelectItem>
                          <SelectItem value="CARTAO">💳 Cartão de Crédito/Débito</SelectItem>
                          <SelectItem value="PIX">📱 PIX</SelectItem>
                          <SelectItem value="CHEQUE">📝 Cheque</SelectItem>
                          <SelectItem value="BOLETO">🏦 Boleto</SelectItem>
                          <SelectItem value="DOC">🏦 DOC</SelectItem>
                          <SelectItem value="TED">⚡ TED</SelectItem>
                          <SelectItem value="DEPOSITO">💰 Depósito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>📊 Plano de Contas *</Label>
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
                        <Label>💰 Valor Total (R$) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={agendamentoData.value}
                          onChange={(e) => updateAgendamentoField('value', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* SEÇÃO DE DESCONTO - COM AUTORIZAÇÃO */}
                    {parseFloat(pagamentoData.discount || 0) > 0 && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 space-y-3">
                        <div className="font-bold text-yellow-900">⚠️ Desconto Aplicado</div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Valor do Desconto (R$) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pagamentoData.discount}
                              onChange={(e) => updatePagamentoField('discount', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Motivo do Desconto *</Label>
                            <Select
                              value={pagamentoData.discount_reason || ''}
                              onValueChange={(value) =>
                                updatePagamentoField('discount_reason', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione motivo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel className="text-blue-600 font-bold">
                                    📊 MOTIVOS COMERCIAIS
                                  </SelectLabel>
                                  <SelectItem value="promocao">🎁 Promoção</SelectItem>
                                  <SelectItem value="primeira_consulta">
                                    ✨ Primeira Consulta
                                  </SelectItem>
                                  <SelectItem value="indicacao">👥 Indicação/Referência</SelectItem>
                                  <SelectItem value="fidelidade">
                                    ⭐ Fidelidade/Cliente Recorrente
                                  </SelectItem>
                                  <SelectItem value="desconto_grupo">
                                    👨‍👩‍👧‍👦 Desconto Grupo/Pacote
                                  </SelectItem>
                                </SelectGroup>

                                <SelectGroup>
                                  <SelectLabel className="text-green-600 font-bold">
                                    🏥 MOTIVOS DO PACIENTE
                                  </SelectLabel>
                                  <SelectItem value="dificuldade_financeira">
                                    💰 Dificuldade Financeira
                                  </SelectItem>
                                  <SelectItem value="cortesia_medica">
                                    🏥 Cortesia Médica/Profissional
                                  </SelectItem>
                                  <SelectItem value="cortesia_administrativo">
                                    📋 Cortesia Administrativa
                                  </SelectItem>
                                </SelectGroup>

                                <SelectGroup>
                                  <SelectLabel className="text-orange-600 font-bold">
                                    ⚙️ MOTIVOS OPERACIONAIS
                                  </SelectLabel>
                                  <SelectItem value="erro_cobranca">
                                    ❌ Erro de Cobrança/Faturamento
                                  </SelectItem>
                                  <SelectItem value="correcao_sistema">
                                    🔧 Correção de Sistema
                                  </SelectItem>
                                  <SelectItem value="ajuste_convenio">
                                    🏪 Ajuste Convênio
                                  </SelectItem>
                                </SelectGroup>

                                <SelectGroup>
                                  <SelectLabel className="text-purple-600 font-bold">
                                    📅 MOTIVOS CRONOLÓGICOS
                                  </SelectLabel>
                                  <SelectItem value="feriado">🎉 Feriado/Data Especial</SelectItem>
                                  <SelectItem value="agendamento_bloqueado">
                                    🚫 Liberação de Agendamento Bloqueado
                                  </SelectItem>
                                </SelectGroup>

                                <SelectGroup>
                                  <SelectLabel className="text-gray-600 font-bold">
                                    📝 OUTROS
                                  </SelectLabel>
                                  <SelectItem value="cancelamento_anterior">
                                    ↩️ Compensação Cancelamento Anterior
                                  </SelectItem>
                                  <SelectItem value="cortesia_outros">
                                    💝 Cortesia Especial
                                  </SelectItem>
                                  <SelectItem value="outros">📝 Outros Motivos</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label>Observações sobre Desconto</Label>
                          <Textarea
                            placeholder="Justificativa ou detalhes adicionais..."
                            value={pagamentoData.discount_observation || ''}
                            onChange={(e) =>
                              updatePagamentoField('discount_observation', e.target.value)
                            }
                            rows={2}
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-sm text-red-900 font-semibold">
                              🔒 Este desconto requer autorização de administrador
                            </p>
                            <p className="text-xs text-red-700 mt-1">
                              O desconto será registrado e enviado para aprovação
                            </p>
                          </div>

                          {/* Botão para submeter desconto para autorização */}
                          {pagamentoData.discount_requested_at ? (
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <p className="text-sm text-blue-900 font-semibold">
                                📋 Desconto já foi solicitado
                              </p>
                              <p className="text-xs text-blue-700 mt-1">
                                Solicitado em:{' '}
                                {new Date(pagamentoData.discount_requested_at).toLocaleDateString(
                                  'pt-BR',
                                )}
                              </p>
                            </div>
                          ) : (
                            <Button
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  console.log('📤 Enviando desconto para autorização...');

                                  // Atualizar os campos de solicitação
                                  updatePagamentoField(
                                    'discount_requested_at',
                                    new Date().toISOString(),
                                  );
                                  updatePagamentoField('discount_requested_by', user?.id);

                                  alert(
                                    '✅ Desconto enviado para autorização!\n\nVocê pode acompanhar em Financeiro > Autorização de Descontos',
                                  );
                                  setLoading(false);
                                } catch (error) {
                                  setLoading(false);
                                  alert(`❌ Erro ao enviar desconto: ${error.message}`);
                                  console.error('Erro:', error);
                                }
                              }}
                              disabled={loading}
                              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white"
                            >
                              {loading ? '⏳ Enviando...' : '📤 Solicitar Autorização de Desconto'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* BOTÃO PARA APLICAR DESCONTO */}
                    {(!pagamentoData.discount || parseFloat(pagamentoData.discount) === 0) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updatePagamentoField('discount', '0.01')}
                        className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                      >
                        ➕ Aplicar Desconto
                      </Button>
                    )}

                    {/* Componente dinâmico de campos de pagamento */}
                    <PaymentMethodFields
                      paymentMethod={pagamentoData.payment_method}
                      paymentData={pagamentoData}
                      bankAccounts={[]} // TODO: fetch from API
                      onFieldChange={handlePaymentFieldChange}
                      onCalculateChange={handleCalculateChange}
                    />

                    {/* RESUMO FINANCEIRO */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4 space-y-2 mt-6">
                      <p className="font-semibold text-blue-900">📊 Resumo Financeiro</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Valor Total:</span>
                        <span className="font-bold text-gray-900">
                          R$ {parseFloat(agendamentoData.value || 0).toFixed(2)}
                        </span>
                      </div>
                      {parseFloat(pagamentoData.discount || 0) > 0 && (
                        <>
                          <div className="flex justify-between text-sm text-yellow-800">
                            <span>Desconto:</span>
                            <span className="font-bold">
                              -R$ {parseFloat(pagamentoData.discount).toFixed(2)}
                            </span>
                          </div>
                          <div className="border-t border-blue-300 pt-2 flex justify-between font-bold">
                            <span className="text-blue-900">Valor a Receber:</span>
                            <span className="text-green-700">
                              R${' '}
                              {(
                                parseFloat(agendamentoData.value || 0) -
                                parseFloat(pagamentoData.discount || 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 🎬 BOTÃO CRIAR ATENDIMENTO - Quando status é at_checkout */}
                    {agendamentoData.status === 'at_checkout' && (
                      <Button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            console.log(
                              '🎬 [CreateAttendance] Criando atendimento e atualizando status para awaiting_professional',
                            );

                            // Atualizar status para awaiting_professional
                            await updateAppointment(appointment?.id, {
                              status: 'awaiting_professional',
                            });

                            console.log('✅ [CreateAttendance] Atendimento criado com sucesso!');

                            // Atualizar estado local
                            updateAgendamentoField('status', 'awaiting_professional');

                            // 🎬 MARCAR COMO CRIADO - vai auto-navegar para resumo
                            setAttendanceCreated(true);
                            setLoading(false);
                          } catch (error) {
                            setLoading(false);
                            alert(`❌ Erro ao criar atendimento: ${error.message}`);
                            console.error('Erro ao criar atendimento:', error);
                          }
                        }}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white animate-pulse"
                      >
                        {loading ? '⏳ Criando atendimento...' : '🎬 Criar Atendimento'}
                      </Button>
                    )}
                  </div>
                )}

                {/* ABA: RESUMO - Completa com todos os dados */}
                {tabAtivo === 'resumo' && (
                  <div className="space-y-4 overflow-y-auto max-h-[600px]">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-300 rounded-lg p-4 mb-4">
                      <p className="text-lg font-bold text-green-900">
                        ✅ Resumo Completo do Atendimento
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Todos os dados foram salvos com sucesso
                      </p>
                    </div>

                    {/* 👤 PACIENTE */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>👤 Paciente</span>
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

                    {/* 🏥 AGENDAMENTO */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>🏥 Agendamento</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">Data</span>
                          <p className="text-gray-900 font-bold">{agendamentoData.date || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">Horário</span>
                          <p className="text-gray-900 font-bold">{agendamentoData.time || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">Duração</span>
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

                    {/* 📋 SERVIÇO */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>📋 Serviço</span>
                      </p>
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 block text-xs font-semibold">
                            Nome do Serviço
                          </span>
                          <p className="text-gray-900 font-bold">
                            {services.find((s) => s.id === agendamentoData.serviceId)?.name || '-'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Código
                            </span>
                            <p className="text-gray-900 font-bold">
                              {agendamentoData.serviceCode || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">Valor</span>
                            <p className="text-gray-900 font-bold">
                              R$ {parseFloat(agendamentoData.value || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 💳 PAGAMENTO / CONVÊNIO */}
                    {!checkIsParticular(agendamentoData.payerId) && isConvenioFaturado && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span>💳 Convênio/Faturamento</span>
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
                              Cartão
                            </span>
                            <p className="text-gray-900 font-bold">
                              {liberacaoData.card_number || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Autorização
                            </span>
                            <p className="text-gray-900 font-bold">
                              {liberacaoData.auth_number || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Código TISS
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
                              R$ {parseFloat(faturamentoData.estimated_value || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {checkIsParticular(agendamentoData.payerId) && isParticular && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span>💰 Pagamento Particular</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Valor Total
                            </span>
                            <p className="text-gray-900 font-bold">
                              R$ {parseFloat(agendamentoData.value || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-xs font-semibold">
                              Método
                            </span>
                            <p className="text-gray-900 font-bold">
                              {pagamentoData.payment_method || '-'}
                            </p>
                          </div>
                          {parseFloat(pagamentoData.discount || 0) > 0 && (
                            <>
                              <div>
                                <span className="text-gray-600 block text-xs font-semibold">
                                  Desconto
                                </span>
                                <p className="text-yellow-700 font-bold">
                                  -R$ {parseFloat(pagamentoData.discount).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600 block text-xs font-semibold">
                                  Valor a Receber
                                </span>
                                <p className="text-green-700 font-bold">
                                  R${' '}
                                  {(
                                    parseFloat(agendamentoData.value || 0) -
                                    parseFloat(pagamentoData.discount || 0)
                                  ).toFixed(2)}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 📊 STATUS */}
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>📊 Status</span>
                      </p>
                      <div className="text-sm">
                        <span className="text-gray-600 block text-xs font-semibold mb-1">
                          Status Atual
                        </span>
                        <div className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                          {agendamentoData.status === 'awaiting_professional'
                            ? '⏳ Aguardando Profissional'
                            : getFormattedStatus(agendamentoData.status)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4 text-center">
                      <p className="text-blue-900 font-bold text-base">
                        ✨ Atendimento pronto para ser iniciado!
                      </p>
                      <p className="text-blue-800 text-sm mt-2">
                        O profissional pode clicar em "Iniciar Atendimento" para começar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER COM BOTÕES */}
            <div className="border-t border-gray-200 p-4 bg-white flex gap-2 justify-end flex-shrink-0">
              {tabAtivo === 'dados' && (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>

                  {/* 💾 BOTÃO SALVAR DADOS - Em modo EDIT, permite salvar sem avançar */}
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
                      {loading ? '⏳ Salvando...' : '💾 Salvar Dados'}
                    </Button>
                  )}

                  <Button
                    onClick={() => setTabAtivo('cadastrais')}
                    disabled={!agendamentoData.serviceId || !agendamentoData.payerId}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                  >
                    ✓ Avançar →
                  </Button>
                </>
              )}

              {tabAtivo === 'cadastrais' && (
                <>
                  {mode !== 'reception' && (
                    <Button variant="outline" onClick={() => setTabAtivo('dados')}>
                      ← Voltar
                    </Button>
                  )}
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>

                  {/* 💾 BOTÃO SALVAR DADOS - Em modo EDIT, permite salvar sem avançar */}
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
                      {loading ? '⏳ Salvando...' : '💾 Salvar Dados'}
                    </Button>
                  )}

                  <Button
                    onClick={async () => {
                      try {
                        // 🔒 SE FOR RECEPÇÃO, VALIDAR DADOS CADASTRAIS OBRIGATÓRIOS
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
                              `⚠️ Dados obrigatórios não preenchidos:\n\n${missingFields.join('\n')}`,
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
                        alert(`❌ Erro ao salvar: ${error.message}`);
                        console.error('Erro ao salvar:', error);
                      }
                    }}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                  >
                    {loading ? '⏳ Salvando...' : '✓ Avançar →'}
                  </Button>
                </>
              )}

              {tabAtivo === 'status' && mode === 'reception' && (
                <>
                  <Button variant="outline" onClick={() => setTabAtivo('cadastrais')}>
                    ← Voltar
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
                        alert(`❌ Erro ao salvar: ${error.message}`);
                        console.error('Erro ao salvar:', error);
                      }
                    }}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white"
                  >
                    {loading ? '⏳ Salvando...' : '✅ Atualizar Status'}
                  </Button>
                </>
              )}

              {tabAtivo === 'liberacao' && (
                <>
                  <Button variant="outline" onClick={() => setTabAtivo('cadastrais')}>
                    ← Voltar
                  </Button>

                  {/* 💾 BOTÃO SALVAR DADOS - Em modo EDIT, permite salvar sem avançar */}
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
                      {loading ? '⏳ Salvando...' : '💾 Salvar Dados'}
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
                    ✓ Avançar →
                  </Button>
                </>
              )}

              {tabAtivo === 'pagamento' && (
                <>
                  <Button variant="outline" onClick={() => setTabAtivo('liberacao')}>
                    ← Voltar
                  </Button>

                  {/* 💾 BOTÃO SALVAR DADOS - Em modo EDIT, permite salvar sem criar atendimento */}
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
                      {loading ? '⏳ Salvando...' : '💾 Salvar Dados'}
                    </Button>
                  )}

                  {/* 🎬 BOTÃO CRIAR ATENDIMENTO - Só em modo NEW quando status é at_checkout */}
                  {mode === 'new' && agendamentoData.status === 'at_checkout' && (
                    <Button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          console.log('🎬 [CreateAttendance] PASSO 1: Salvando TODOS os dados...');

                          // 1️⃣ SALVAR TODOS OS DADOS (agendamento, cadastrais, liberação, pagamento)
                          await handleSaveChanges();

                          console.log(
                            '🎬 [CreateAttendance] PASSO 2: Atualizando status para awaiting_professional...',
                          );

                          // 2️⃣ ATUALIZAR STATUS
                          await updateAppointment(appointment?.id, {
                            status: 'awaiting_professional',
                          });

                          // 3️⃣ ATUALIZAR ESTADO LOCAL
                          updateAgendamentoField('status', 'awaiting_professional');

                          console.log('✅ [CreateAttendance] Sucesso! Dados de Pagamento salvos.');

                          // 🎬 MARCAR COMO CRIADO - vai auto-navegar para resumo
                          setAttendanceCreated(true);
                          setLoading(false);
                        } catch (error) {
                          setLoading(false);
                          alert(`❌ Erro ao criar atendimento: ${error.message}`);
                          console.error('Erro ao criar atendimento:', error);
                        }
                      }}
                      disabled={loading}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white animate-pulse"
                    >
                      {loading ? '⏳ Salvando e criando...' : '🎬 Criar Atendimento'}
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
                          alert(`❌ Erro ao salvar: ${error.message}`);
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                    >
                      {loading ? '⏳ Salvando...' : '✓ Criar Agendamento'}
                    </Button>
                  )}
                </>
              )}

              {tabAtivo === 'faturamento' && isConvenioFaturado && (
                <>
                  <Button variant="outline" onClick={() => setTabAtivo('liberacao')}>
                    ← Voltar
                  </Button>

                  {/* 💾 BOTÃO SALVAR DADOS - Em modo EDIT, permite salvar sem criar atendimento */}
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
                      {loading ? '⏳ Salvando...' : '💾 Salvar Dados'}
                    </Button>
                  )}

                  {/* 🎬 BOTÃO CRIAR ATENDIMENTO - Só em modo NEW quando status é at_checkout */}
                  {mode === 'new' && agendamentoData.status === 'at_checkout' && (
                    <Button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          console.log('🎬 [CreateAttendance] PASSO 1: Salvando TODOS os dados...');

                          // 1️⃣ SALVAR TODOS OS DADOS (agendamento, cadastrais, liberação, faturamento)
                          await handleSaveChanges();

                          console.log(
                            '🎬 [CreateAttendance] PASSO 2: Atualizando status para awaiting_professional...',
                          );

                          // 2️⃣ ATUALIZAR STATUS
                          await updateAppointment(appointment?.id, {
                            status: 'awaiting_professional',
                          });

                          // 3️⃣ ATUALIZAR ESTADO LOCAL
                          updateAgendamentoField('status', 'awaiting_professional');

                          console.log(
                            '✅ [CreateAttendance] Sucesso! Dados de Faturamento TISS salvos.',
                          );

                          // 🎬 MARCAR COMO CRIADO - vai auto-navegar para resumo
                          setAttendanceCreated(true);
                          setLoading(false);
                        } catch (error) {
                          setLoading(false);
                          alert(`❌ Erro ao criar atendimento: ${error.message}`);
                          console.error('Erro ao criar atendimento:', error);
                        }
                      }}
                      disabled={loading}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white animate-pulse"
                    >
                      {loading ? '⏳ Salvando e criando...' : '🎬 Criar Atendimento'}
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
                          alert(`❌ Erro ao salvar: ${error.message}`);
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                    >
                      {loading ? '⏳ Salvando...' : '✓ Criar Agendamento'}
                    </Button>
                  )}
                </>
              )}

              {tabAtivo === 'resumo' && (
                <>
                  <Button variant="outline" onClick={() => setTabAtivo('cadastrais')}>
                    ← Voltar
                  </Button>
                  <Button
                    onClick={() => {
                      onSuccess?.();
                      onClose();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    ✅ Liberar para Atendimento
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
