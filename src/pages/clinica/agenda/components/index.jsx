import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { format, addDays, subDays, addMonths, subMonths, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Eye } from 'lucide-react';

// ? IMPORTAR API
import { listAppointments } from '@/lib/appointmentsApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listServices } from '@/lib/servicesApi';
import { listPayers } from '@/lib/payersApi';
import { listRooms } from '@/lib/roomsApi';
import { sendBatchConfirmations } from '@/lib/whatsappConfirmationApi';
import { supabase } from '@/lib/customSupabaseClient';
import { getAvailableProfessionalsForDay, getClinicTimeSlots } from '@/lib/agendaUtils';

// ?? Configura��o de abas por perfil
import { getAccessibleAgendaTabs, DEFAULT_AGENDA_TAB_BY_ROLE } from '@/config/agendaTabs.config';

// Componentes novos
import AgendaHeaderNew from './AgendaHeaderNew';
import AgendaToolbarNew from './AgendaToolbarNew';
import AgendaFiltersNew from './AgendaFiltersNew';
import ModalCriarAgendamento from './ModalCriarAgendamento';
import AtendimentoUnificado from './AtendimentoUnificado';

// Views
import AgendaDayView from '../views/AgendaDayView';
import AgendaWeekView from '../views/AgendaWeekView';
import AgendaMonthView from '../views/AgendaMonthView';
import AgendaPorProfissional from '../views/AgendaPorProfissional';

// Hooks e contextos
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { seedNationalHolidaysMultipleYears, checkMultipleDates } from '@/lib/holidaysApi';
import {
  migrateStatus,
  getStatusLabelOnly,
  getStatusConfig,
  SERVICE_STATUSES,
} from '@/lib/appointmentStatusConstants';

/**
 * EXEMPLO DE INTEGRA��O COMPLETA
 *
 * Este arquivo demonstra como usar todos os novos componentes juntos.
 * Substitua as importa��es com APIs reais do seu projeto.
 *
 * Estrutura:
 * 1. Estado central (data, viewMode, filters, agendaMode)
 * 2. Efeitos para carregar dados
 * 3. L�gica de filtragem com useMemo
 * 4. Handlers para navega��o, filtragem, a��es
 * 5. Render com todos os componentes
 */

export default function AgendaIndex() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  //  Capturar appointmentDate do state OU query params (vindo de Contas a Receber)
  const appointmentDateFromQuery = searchParams.get('appointmentDate');
  const appointmentIdFromQuery = searchParams.get('appointmentId');
  const appointmentDateFromState = location.state?.appointmentDate;
  const appointmentIdFromState = location.state?.appointmentId;
  const modeParam = searchParams.get('mode'); // ?? Ler o modo (edit, new, etc.)
  const appointmentTabParam = searchParams.get('appointmentTab');

  //  Tentar recuperar do localStorage (backup se state/params foram perdidos)
  const appointmentDateFromLocalStorage =
    typeof window !== 'undefined' ? localStorage.getItem('agendaFromFinancialDate') : null;
  const appointmentIdFromLocalStorage =
    typeof window !== 'undefined' ? localStorage.getItem('agendaFromFinancialAppointmentId') : null;

  // Prioridade: query param > state > localStorage
  const appointmentDateFinal =
    appointmentDateFromQuery || appointmentDateFromState || appointmentDateFromLocalStorage;
  const appointmentIdFinal = appointmentIdFromQuery || appointmentIdFromState || appointmentIdFromLocalStorage;

  console.log('+---------------------------------------------------------------+');
  console.log('�            [AgendaIndex] STARTUP DIAGNOSTICS              �');
  console.log('+---------------------------------------------------------------+');
  console.log(' appointmentDateFromQuery:', appointmentDateFromQuery);
  console.log(' appointmentDateFromState:', appointmentDateFromState);
  console.log(' appointmentDateFromLocalStorage:', appointmentDateFromLocalStorage);
  console.log(' appointmentDateFinal (usar essa):', appointmentDateFinal);
  console.log(' appointmentIdFromState:', appointmentIdFromState);
  console.log(' appointmentIdFromLocalStorage:', appointmentIdFromLocalStorage);
  console.log(' appointmentIdFinal (usar esse):', appointmentIdFinal);
  console.log(' location.pathname:', location.pathname);
  console.log(' location.search (query string):', location.search);
  console.log(' location.state:', location.state);
  console.log('---------------------------------------------------------------');

  // ============ CONTEXTOS & AUTH ============
  const auth = useAuth();
  const clinicCtx = useClinicContext();
  const clinicId = clinicCtx?.clinicId;
  const clinic = clinicCtx?.clinic;
  const loadingClinic = clinicCtx?.loadingClinic;

  const currentRole = auth?.currentRole?.toLowerCase() || 'recepcao';
  const accessibleTabs = getAccessibleAgendaTabs(currentRole);
  const defaultViewMode = DEFAULT_AGENDA_TAB_BY_ROLE[currentRole] || 'dia';
  const canAccessProfessionalMode = ['admin', 'administrador', 'gestor', 'profissional'].includes(currentRole);

  // ============ ESTADO CENTRAL ============

  const [date, setDate] = useState(() => {
    //  Se vem appointmentDate do query param ou state, usar essa data
    if (appointmentDateFinal) {
      console.log(' [DATE INIT] ? appointmentDateFinal encontrado:', appointmentDateFinal);
      if (/^\d{4}-\d{2}-\d{2}$/.test(appointmentDateFinal)) {
        console.log(' [DATE INIT] ? Formato v�lido! Retornando:', appointmentDateFinal);
        return appointmentDateFinal;
      }
      console.log(' [DATE INIT] ? Formato inv�lido! Usando data de hoje');
    }

    // Fallback: data de hoje
    const today = new Date();
    const todayDate = format(today, 'yyyy-MM-dd');
    console.log(' [DATE INIT] Usando data de hoje:', todayDate);
    return todayDate;
  });

  // Inicializar com a aba padr�o do perfil, se tiver acesso
  const [viewMode, setViewMode] = useState(() => {
    if (accessibleTabs.includes(defaultViewMode)) {
      return defaultViewMode;
    }
    // Fallback: usar primeira aba acess�vel
    return accessibleTabs[0] || 'dia';
  });

  const [agendaMode, setAgendaMode] = useState('geral');
  const [userProfessionalId, setUserProfessionalId] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    patient_id: '',
    professional_id: '',
    room_id: '',
    status: '',
    payer_id: '',
    service_id: '',
  });

  const user = auth?.user || { role: 'gestor' };

  //  DEBUG
  console.log(' [AgendaIndex] RENDER:');
  console.log('  - currentRole:', currentRole);
  console.log('  - accessibleTabs:', accessibleTabs);
  console.log('  - viewMode:', viewMode);
  console.log('  - clinicId:', clinicId);
  console.log('  ? date (estado atual usado para agenda):', date);
  console.log('  - appointmentDateFinal:', appointmentDateFinal);
  console.log('  - location.search:', location.search);

  //  DEBUG: Verificar se �ndice est� montando
  if (!clinicId && !loadingClinic) {
    console.warn('?? CLINIC ID undefined e loading conclu�do');
  }

  // ? EFEITO: Limpar localStorage ap�s usar
  useEffect(() => {
    if (appointmentDateFinal || appointmentIdFinal) {
      // Already used, so clear after a moment to avoid reuse
      return () => {
        setTimeout(() => {
          localStorage.removeItem('agendaFromFinancialDate');
          localStorage.removeItem('agendaFromFinancialAppointmentId');
          console.log(' Limpeza: localStorage removido');
        }, 2000);
      };
    }
  }, [appointmentDateFinal, appointmentIdFinal]);

  // ? CR�TICO: useLayoutEffect roda ANTES do render, for�ando date correto SINCRONAMENTE
  useLayoutEffect(() => {
    if (!appointmentDateFinal) {
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDateFinal)) {
      return;
    }

    if (date !== appointmentDateFinal) {
      console.log('? [useLayoutEffect] FOR�ANDO UPDATE de date:', date, '?', appointmentDateFinal);
      setDate(appointmentDateFinal);
    }
  }, [appointmentDateFinal]);

  // ? EFEITO: Monitorar mudan�as de appointmentDateFinal e SEMPRE atualizar date
  useEffect(() => {
    console.log('-------------------------------------------------------');
    console.log(' [useEffect MONITOR] DISPARADO - Monitorar appointmentDateFinal');
    console.log('   appointmentDateFinal:', appointmentDateFinal);
    console.log('   date atual:', date);
    console.log('   searchParams:', location.search);
    console.log('   location.state:', location.state);
    console.log('-------------------------------------------------------');

    if (!appointmentDateFinal) {
      console.log('??  appointmentDateFinal est� vazio, ignorando');
      return;
    }

    // Validar formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDateFinal)) {
      console.warn('? appointmentDateFinal com formato inv�lido:', appointmentDateFinal);
      return;
    }

    // Se � diferente do state atual, atualizar
    if (date !== appointmentDateFinal) {
      console.log('? Atualizando date de', date, 'para', appointmentDateFinal);
      setDate(appointmentDateFinal);
    } else {
      console.log('??  Date j� est� correto, n�o precisa atualizar');
    }
  }, [appointmentDateFinal, date, location.search, location.state]);

  // ? SEED de feriados - ATIVA AUTOMATICAMENTE
  // Garante que feriados nacionais existem no banco para m�ltiplos anos
  useEffect(() => {
    console.log('? [useEffect] Hook disparado - iniciando seed de feriados');

    const ensureHolidaysExist = async () => {
      console.log(' [Agenda] Iniciando seed de feriados para 2024-2028');
      console.log(
        ' [Agenda] Fun��o seedNationalHolidaysMultipleYears:',
        typeof seedNationalHolidaysMultipleYears,
      );

      try {
        // Semeia feriados de m�ltiplos anos (2024, 2025, 2026, 2027, 2028)
        console.log(' [Agenda] Chamando seedNationalHolidaysMultipleYears...');
        const seedResult = await seedNationalHolidaysMultipleYears();
        console.log(' [Seed] Resultado:', seedResult);
        if (seedResult) {
          console.log('? [Seed] SUCESSO - Feriados de m�ltiplos anos inseridos');
        } else {
          console.error('?? [Seed] FALHOU - Erro ao inserir feriados');
        }
      } catch (error) {
        console.error('? [Seed] Exce��o:', error.message, error);
      }
    };

    try {
      ensureHolidaysExist();
    } catch (err) {
      console.error('? [Seed] Erro ao chamar fun��o:', err);
    }
  }, []); // ? Depend�ncia vazia - roda APENAS UMA VEZ ao montar

  //  RBAC: Carregar ID do profissional logado (se for profissional)
  useEffect(() => {
    const loadUserProfessionalId = async () => {
      if (!clinicId || !auth?.user?.email) {
        return;
      }

      const currentRole = auth?.currentRole;

      //  L�GICA RBAC:
      // - Profissional: V� apenas sua agenda (userProfessionalId = seu ID)
      // - Recep��o/Admin/Gestor: V� agenda de todos (userProfessionalId = null)
      if (currentRole?.toLowerCase?.() !== 'profissional') {
        console.log(`? [RBAC] Usu�rio � ${currentRole} ? ver� TODOS os profissionais`);
        setUserProfessionalId(null);
        return;
      }

      try {
        const { data: allProfs, error } = await supabase
          .from('professionals')
          .select('id, email')
          .eq('email', auth.user.email)
          .eq('clinic_id', clinicId);

        if (error) {
          throw error;
        }

        if (allProfs?.length === 1) {
          setUserProfessionalId(allProfs[0].id);
          console.log(`? [RBAC] Profissional logado ? ver� apenas sua agenda: ${allProfs[0].id}`);
        } else if (allProfs?.length > 1) {
          console.warn(`?? [RBAC] M�ltiplos profissionais para email ${auth.user.email}`);
          // Usar o primeiro
          setUserProfessionalId(allProfs[0].id);
          console.log(`? [RBAC] Usando primeiro profissional: ${allProfs[0].id}`);
        } else {
          console.error(`? [RBAC] Nenhum profissional encontrado para ${auth.user.email}`);
          setUserProfessionalId(null);
        }
      } catch (err) {
        console.error('? [RBAC] Erro ao carregar profissional:', err);
        setUserProfessionalId(null);
      }
    };

    loadUserProfessionalId();
  }, [clinicId, auth?.user?.email, auth?.currentRole]);

  // ?? Garantir que viewMode seja sempre acess�vel para o perfil
  useEffect(() => {
    if (!accessibleTabs.includes(viewMode)) {
      console.log(
        `?? [ViewMode] viewMode atual "${viewMode}" n�o � acess�vel para "${currentRole}"`,
      );
      console.log(`   Alternando para: "${accessibleTabs[0] || 'dia'}"`);
      // Resetar para a primeira aba acess�vel
      setViewMode(accessibleTabs[0] || 'dia');
    }
  }, [accessibleTabs, viewMode, currentRole]);

  const [appointments, setAppointments] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [availableProfessionalsForDay, setAvailableProfessionalsForDay] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(false);

  //  WhatsApp Confirmations
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState(null);
  const [whatsappError, setWhatsappError] = useState(null);

  // Modal de novo/edi��o de agendamento
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [novoAgendamentoInfo, setNovoAgendamentoInfo] = useState(null);
  const [appointmentIdToEdit, setAppointmentIdToEdit] = useState(null);

  // ?? UNIFIED MODE MODAL
  const [atendimentoUnificadoOpen, setAtendimentoUnificadoOpen] = useState(false);
  const [selectedAppointmentForUnified, setSelectedAppointmentForUnified] = useState(null);

  // ?? Flag para rastrear se o modal foi fechado intencionalmente pelo usu�rio
  // Evita que o useEffect reabra a modal ap�s o usu�rio clicar no X
  const hasModalBeenClosedRef = React.useRef(false);

  // Drawer de detalhes do agendamento
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState(null);

  //  Context Menu para Week/Month views
  const [contextMenu, setContextMenu] = useState(null);

  // ?? AUTO-OPEN MODAL: Quando vindo de Contas a Receber com mode=edit
  useEffect(() => {
    console.log('?? [AutoOpen Modal] useEffect executando');
    console.log('   modeParam:', modeParam);
    console.log('   appointmentIdFinal:', appointmentIdFinal);
    console.log('   appointmentDateFinal:', appointmentDateFinal);
    console.log('   date (atual):', date);
    console.log('   appointments.length:', appointments?.length);
    console.log('   modalNovoOpen:', modalNovoOpen);
    console.log('   hasModalBeenClosed:', hasModalBeenClosedRef.current);

    // Se o usu�rio fechou intencionalmente a modal, n�o reabrir
    if (hasModalBeenClosedRef.current) {
      console.log('?? Modal foi fechada intencionalmente pelo usu�rio, n�o reabrindo');
      return;
    }

    // Se o modal j� est� aberto, n�o tentar abrir novamente
    if (modalNovoOpen) {
      console.log('?? Modal j� est� aberto, saindo');
      return;
    }

    // Verificar se temos os par�metros para auto-open
    if (modeParam === 'edit' && appointmentIdFinal) {
      console.log('? Par�metros encontrados: mode=edit + appointmentId');

      // CR�TICO: Verificar se a data foi navegada corretamente
      if (appointmentDateFinal && date !== appointmentDateFinal) {
        console.log('? Aguardando navega��o para data correta...');
        console.log('   Esperada:', appointmentDateFinal);
        console.log('   Atual:', date);
        return; // Aguardar pr�xima execu��o quando date mudar
      }

      // Verificar se os appointments foram carregados
      if (!appointments || appointments.length === 0) {
        console.log('? Aguardando carregamento dos appointments...');
        return; // Aguardar pr�xima execu��o quando appointments mudarem
      }

      // Procurar pelo appointment na lista
      console.log('?? Procurando appointment com ID:', appointmentIdFinal);
      const foundAppointment = appointments.find((apt) => apt.id === appointmentIdFinal);

      if (foundAppointment) {
        console.log('? Appointment encontrado! Abrindo modal...');
        console.log('   Dados:', foundAppointment);
        setAppointmentIdToEdit(appointmentIdFinal);
        setNovoAgendamentoInfo(foundAppointment);
        setModalNovoOpen(true);
        console.log('? Modal aberto com appointmentIdToEdit:', appointmentIdFinal);
      } else {
        console.warn('?? Appointment N�O encontrado');
        console.log('   IDs dispon�veis:', appointments.map((a) => a.id).join(', '));
      }
    }
  }, [modeParam, appointmentIdFinal, appointmentDateFinal, date, appointments, modalNovoOpen]);

  // ============ FUN��O PARA RECARREGAR APPOINTMENTS ============
  // ? Extra�da em fun��o separada para poder ser reutilizada no onCreated
  const loadAppointments = useCallback(async () => {
    console.log(
      '%c ?? [AgendaIndex] loadAppointments INICIANDO!',
      'background: #ff0000; color: white; font-size: 14px; font-weight: bold;'
    );
    console.log(' [loadAppointments] INICIANDO', { viewMode, clinicId });

    if (!clinicId) {
      console.error(' [loadAppointments] CR�TICO: clinicId �', clinicId, '- n�o posso continuar!');
      console.error(' [loadAppointments] loadingClinic:', loadingClinic);
      console.error(' [loadAppointments] clinic:', clinic);
      setLoading(false);  // ?? FIX: Ensure loading is always false when returning early
      return;
    }

    setLoading(true);
    try {
      // ? CORRIGIDO: Calcular range baseado no viewMode
      const [year, month, day] = date.split('-').map(Number);
      let startUTC, endUTC;

      if (viewMode === 'mes') {
        // Carregar TODO o m�s
        console.log(' [loadAppointments] Modo M�S - carregando m�s inteiro');
        startUTC = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)); // Primeiro dia do m�s
        endUTC = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // �ltimo dia do m�s
      } else if (viewMode === 'semana') {
        // Carregar TODA a semana (seg-dom)
        console.log(' [loadAppointments] Modo SEMANA - carregando semana inteira');
        const dateObj = new Date(Date.UTC(year, month - 1, day));
        const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday
        const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Calcular dias at� segunda
        const monday = new Date(dateObj);
        monday.setUTCDate(dateObj.getUTCDate() + mondayDiff);
        startUTC = new Date(
          Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0),
        );
        endUTC = new Date(
          Date.UTC(
            monday.getUTCFullYear(),
            monday.getUTCMonth(),
            monday.getUTCDate() + 6,
            23,
            59,
            59,
          ),
        );
      } else {
        // Carregar apenas o um DIA
        console.log(' [loadAppointments] Modo DIA - carregando um dia');
        startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        endUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
      }

      console.log(' [loadAppointments] Buscando appointments para data:', {
        date: date,
        viewMode: viewMode,
        startUTC: startUTC.toISOString(),
        endUTC: endUTC.toISOString(),
        clinicId,
      });

      //  Se for profissional, buscar o professional_id do usu�rio
      let userProfessionalId = null;
      const currentRole = auth?.currentRole;
      if (currentRole?.toLowerCase?.() === 'profissional' && auth?.user?.email) {
        const { data: profData } = await supabase
          .from('professionals')
          .select('id')
          .eq('email', auth.user.email)
          .eq('clinic_id', clinicId)
          .maybeSingle();

        if (profData?.id) {
          userProfessionalId = profData.id;
          console.log(`? [RBAC] Profissional encontrado: ${userProfessionalId}`);
        }
      }

      // ? CHAMAR API REAL
      console.log(' [loadAppointments] Chamando APIs com clinicId:', clinicId);

      // ?? FIX: Add timeout to prevent Promise.all from hanging indefinitely
      const apiTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API timeout - taking too long to load')), 60000)
      );

      const [appts, profs, svcs, pays, rms] = await Promise.race([
        Promise.all([
          listAppointments({
            clinicId,
            start: startUTC.toISOString(),
            end: endUTC.toISOString(),
            userRole: currentRole,
            userProfessionalId: userProfessionalId,
          }).catch((err) => {
            console.error('? Erro em listAppointments:', err);
            return [];
          }),
          listProfessionals(clinicId).catch((err) => {
            console.error('? Erro em listProfessionals:', err);
            return [];
          }),
          listServices(clinicId).catch((err) => {
            console.error('? Erro em listServices:', err);
            return [];
          }),
          listPayers(clinicId).catch((err) => {
            console.error('? Erro em listPayers:', err);
            return [];
          }),
          listRooms(clinicId).catch((err) => {
            console.error('? Erro em listRooms:', err);
            return [];
          }),
        ]),
        apiTimeout,
      ]);

      console.log('? [loadAppointments] Dados recebidos da API:', {
        apptsCount: appts?.length,
        profsCount: profs?.length,
        svcsCount: svcs?.length,
        paysCount: pays?.length,
        roomsCount: rms?.length,
        clinicId: clinicId,
      });

      // DEBUG: Mostrar TODOS os agendamentos brutos da API
      if (appts && appts.length > 0) {
        console.log(' [loadAppointments] Agendamentos brutos da API:');
        appts.forEach((apt, idx) => {
          console.log(
            `  [${idx}] ${apt.patient_name || apt.patient?.name || 'N/A'} - ${apt.scheduled_date} ${apt.scheduled_time} - Prof: ${apt.professional_id}`,
          );
          if (apt.patient_name?.includes('Marcia') || apt.patient?.name?.includes('Marcia')) {
            console.log(
              `     ? MARCIA ENCONTRADA! Data: ${apt.scheduled_date}, Hora: ${apt.scheduled_time}`,
            );
          }
        });
      }

      // ? NORMALIZAR STATUS: converter status antigos para novos
      const normalizedAppts = (appts || []).map((apt) => ({
        ...apt,
        status: migrateStatus(apt.status), // scheduled, confirmed, in_service, attended, no_show, canceled
      }));

      console.log(
        ' [loadAppointments] Appointments normalizados:',
        normalizedAppts.map((a) => ({
          id: a.id,
          patient: a.patient_name,
          status: a.status,
          time: a.scheduled_time,
        })),
      );

      //  Log detalhado do primeiro agendamento
      if (normalizedAppts.length > 0) {
        console.log(' [loadAppointments] DETALHES DO PRIMEIRO AGENDAMENTO:', {
          id: normalizedAppts[0].id,
          paciente: normalizedAppts[0].patient_name,
          horario: normalizedAppts[0].scheduled_time,
          statusAtual: normalizedAppts[0].status,
          dataAgendamento: normalizedAppts[0].scheduled_date,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        });
      }

      setAppointments(normalizedAppts);
      setProfessionals(profs || []);
      setServices(svcs || []);
      setPayers(pays || []);
      setRooms(rms || []);
      console.log(
        '? [loadAppointments] Estado React atualizado com',
        (normalizedAppts || []).length,
        'agendamentos',
      );
    } catch (error) {
      console.error('? [loadAppointments] Erro ao carregar dados:', error);
      setAppointments([]);
      setProfessionals([]);
      setServices([]);
      setPayers([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId, date, viewMode]);

  // ============ EFEITOS (DATA LOADING) ============

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    let active = true;

    async function loadAvailabilityForIndicators() {
      if (!clinicId || !date || viewMode !== 'dia') {
        setAvailableProfessionalsForDay([]);
        return;
      }

      const availableProfessionals = await getAvailableProfessionalsForDay(
        date,
        clinicId,
        userProfessionalId,
      );

      if (active) {
        setAvailableProfessionalsForDay(availableProfessionals || []);
      }
    }

    loadAvailabilityForIndicators();

    return () => {
      active = false;
    };
  }, [clinicId, date, userProfessionalId, viewMode]);

  const agendaSummary = useMemo(() => {
    const summary = {};
    const dailyCapacity = getClinicTimeSlots(clinic).length || 1;

    appointments.forEach((appointment) => {
      const dateKey = appointment.scheduled_date || appointment.date;
      if (!dateKey) {
        return;
      }
      summary[dateKey] = summary[dateKey] || { count: 0 };
      summary[dateKey].count += 1;
    });

    Object.entries(summary).forEach(([dateKey, item]) => {
      const occupancy = item.count / dailyCapacity;
      summary[dateKey] = {
        status: occupancy >= 1 ? 'full' : occupancy > 0 ? 'partial' : 'free',
        label: `${item.count} atendimento${item.count === 1 ? '' : 's'}`,
      };
    });

    return summary;
  }, [appointments, clinic]);

  // ============ FILTRAGEM ============

  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Filtro por busca (paciente, telefone ou serviço)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((apt) => {
        const patientName = apt.patient_name || apt.patient?.name || '';
        const phone = apt.patient_phone || apt.phone || apt.patient?.phone || apt.patient?.cell_phone || '';
        const serviceName = apt.service_name || apt.service?.name || apt.services?.name || '';
        return [patientName, phone, serviceName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchLower));
      });
      console.log(` [Filtro] Busca por "${filters.search}": ${filtered.length} resultados`);
    }

    // Filtro por paciente
    if (filters.patient_id && filters.patient_id !== '') {
      filtered = filtered.filter((apt) => {
        const patientId = apt.patient_id || apt.patientId || apt.patient?.id;
        return patientId === filters.patient_id;
      });
      console.log(` [Filtro] Paciente: ${filtered.length} resultados`);
    }

    // Filtro por profissional
    if (filters.professional_id && filters.professional_id !== '') {
      filtered = filtered.filter((apt) => apt.professional_id === filters.professional_id);
      console.log(`\u200d?? [Filtro] Profissional: ${filtered.length} resultados`);
    }

    // Filtro por sala
    if (filters.room_id && filters.room_id !== '') {
      filtered = filtered.filter((apt) => apt.room_id === filters.room_id);
      console.log(` [Filtro] Sala: ${filtered.length} resultados`);
    }

    // Filtro por status
    if (filters.status && filters.status !== '') {
      filtered = filtered.filter((apt) => apt.status === filters.status);
      console.log(`? [Filtro] Status "${filters.status}": ${filtered.length} resultados`);
    }

    // Filtro por conv�nio
    if (filters.payer_id && filters.payer_id !== '') {
      filtered = filtered.filter((apt) => apt.payer_id === filters.payer_id);
      console.log(` [Filtro] Conv�nio: ${filtered.length} resultados`);
    }

    // Filtro por servi�o
    if (filters.service_id && filters.service_id !== '') {
      filtered = filtered.filter((apt) => apt.service_id === filters.service_id);
      console.log(` [Filtro] Servi�o: ${filtered.length} resultados`);
    }

    console.log(`? [Filtros Aplicados] Total: ${appointments.length} ? ${filtered.length}`, {
      filters,
    });
    return filtered;
  }, [appointments, filters]);
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => v && v !== '').length;
  }, [filters]);

  const patientsForFilter = useMemo(() => {
    const patientMap = new Map();
    appointments.forEach((appointment) => {
      const patientId = appointment.patient_id || appointment.patientId || appointment.patient?.id;
      const patientName = appointment.patient_name || appointment.patient?.name;
      if (patientId && patientName && !patientMap.has(patientId)) {
        patientMap.set(patientId, { id: patientId, name: patientName });
      }
    });
    return Array.from(patientMap.values()).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }, [appointments]);

  const metadata = useMemo(
    () => ({
      professionals,
      patients: patientsForFilter,
      rooms,
      services,
      payers,
    }),
    [patientsForFilter, professionals, rooms, services, payers],
  );

  // ============ HANDLERS ============

  const handlePreviousDay = useCallback(() => {
    setDate((prev) => {
      const parsedDate = parseISO(prev);
      // Se estiver em dia, voltar 1 dia; se em semana, voltar 7 dias; se em m�s, voltar 1 m�s
      let newDate;
      if (viewMode === 'dia') {
        newDate = subDays(parsedDate, 1);
      } else if (viewMode === 'semana') {
        newDate = subDays(parsedDate, 7);
      } else {
        newDate = subMonths(parsedDate, 1);
      }
      return format(newDate, 'yyyy-MM-dd');
    });
  }, [viewMode]);

  const handleNextDay = useCallback(() => {
    setDate((prev) => {
      const parsedDate = parseISO(prev);
      // Se estiver em dia, avan�ar 1 dia; se em semana, avan�ar 7 dias; se em m�s, avan�ar 1 m�s
      let newDate;
      if (viewMode === 'dia') {
        newDate = addDays(parsedDate, 1);
      } else if (viewMode === 'semana') {
        newDate = addDays(parsedDate, 7);
      } else {
        newDate = addMonths(parsedDate, 1);
      }
      return format(newDate, 'yyyy-MM-dd');
    });
  }, [viewMode]);

  const handleDateChange = useCallback((newDate) => {
    setDate(newDate);
  }, []);

  const handleViewModeChange = useCallback(
    (mode) => {
      //  Validar se o perfil tem acesso a essa aba
      if (!accessibleTabs.includes(mode)) {
        console.warn(`?? Acesso negado: perfil "${currentRole}" n�o pode acessar a aba "${mode}"`);
        console.log('   Abas dispon�veis:', accessibleTabs);
        return; // Bloquear mudan�a
      }
      setViewMode(mode);
    },
    [accessibleTabs, currentRole],
  );

  const handleAgendaModeChange = useCallback(
    (mode) => {
      if (mode === 'profissional' && !canAccessProfessionalMode) {
        return;
      }
      setAgendaMode(['profissional', 'sala'].includes(mode) ? mode : 'geral');
    },
    [canAccessProfessionalMode],
  );

  useEffect(() => {
    if (!canAccessProfessionalMode && agendaMode === 'profissional') {
      setAgendaMode('geral');
    }
  }, [agendaMode, canAccessProfessionalMode]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      patient_id: '',
      professional_id: '',
      room_id: '',
      status: '',
      payer_id: '',
      service_id: '',
    });
  }, []);

  const clinicTimeSlots = useMemo(() => getClinicTimeSlots(clinic), [clinic]);

  const agendaCapacity = useMemo(() => {
    const daySlots = clinicTimeSlots.length || 20;

    if (viewMode === 'dia' && agendaMode !== 'sala') {
      const visibleAvailability = filters.professional_id
        ? availableProfessionalsForDay.filter((professional) => professional.id === filters.professional_id)
        : availableProfessionalsForDay;
      const availableSlotsCount = visibleAvailability.reduce(
        (total, professional) => total + (professional.available_slots?.length || 0),
        0,
      );

      if (availableSlotsCount > 0) {
        return availableSlotsCount;
      }
    }

    const resourceCount =
      agendaMode === 'sala'
        ? Math.max(filters.room_id ? 1 : rooms.length, 1)
        : Math.max(filters.professional_id ? 1 : professionals.length, 1);

    if (viewMode === 'semana') {
      return daySlots * 7 * resourceCount;
    }
    if (viewMode === 'mes') {
      const [year, month] = date.split('-').map(Number);
      return daySlots * new Date(year, month, 0).getDate() * resourceCount;
    }
    return daySlots * resourceCount;
  }, [agendaMode, availableProfessionalsForDay, clinicTimeSlots.length, date, filters.professional_id, filters.room_id, professionals.length, rooms.length, viewMode]);

  const roomModeRooms = useMemo(() => {
    const registeredRooms = rooms.map((room) => ({
      id: room.id,
      name: room.name || room.nome || room.label || `Sala ${room.id?.slice?.(0, 8) || ''}`,
    }));

    const appointmentRooms = filteredAppointments.reduce((acc, appointment) => {
      const roomId = appointment.room_id || appointment.roomId || appointment.room?.id;
      if (!roomId || acc.some((room) => room.id === roomId)) {
        return acc;
      }
      acc.push({
        id: roomId,
        name:
          appointment.room_name ||
          appointment.room?.name ||
          appointment.room ||
          `Sala ${String(roomId).slice(0, 8)}`,
      });
      return acc;
    }, []);

    const sourceRooms = registeredRooms.length > 0 ? registeredRooms : appointmentRooms;
    return filters.room_id ? sourceRooms.filter((room) => room.id === filters.room_id) : sourceRooms;
  }, [filteredAppointments, filters.room_id, rooms]);

  const roomModeAppointmentsByRoomAndTime = useMemo(() => {
    return filteredAppointments.reduce((acc, appointment) => {
      const roomId = appointment.room_id || appointment.roomId || appointment.room?.id || 'sem-sala';
      const time = (appointment.scheduled_time || appointment.start_time || appointment.time || '').slice(0, 5);
      acc[roomId] = acc[roomId] || {};
      acc[roomId][time] = acc[roomId][time] || [];
      acc[roomId][time].push(appointment);
      return acc;
    }, {});
  }, [filteredAppointments]);

  const occupiedSlots = filteredAppointments.length;
  const freeSlots = Math.max(0, agendaCapacity - occupiedSlots);
  const occupancyPct = agendaCapacity > 0 ? Math.round((occupiedSlots / agendaCapacity) * 100) : 0;

  const handleNewAppointment = useCallback(async () => {
    console.log('?? [TRACE] handleNewAppointment called - date:', date);
    console.log('?? [TRACE] date state:', date);
    console.log('?? [TRACE] viewMode state:', viewMode);
    console.log('?? [TRACE] clinic state:', clinic);

    try {
      // Verificar se a data � um feriado bloqueado
      const clinicId = clinic?.id || null;
      console.log('?? [TRACE] clinicId extracted:', clinicId);

      // ?? FIX: Add timeout to prevent infinite hanging
      let result;
      try {
        console.log('?? [TRACE] About to call checkMultipleDates...');
        result = await Promise.race([
          checkMultipleDates([date], clinicId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout checking holidays')), 3000))
        ]);
        console.log('?? [TRACE] checkMultipleDates result:', result);
      } catch (timeoutError) {
        console.warn('?? Timeout ao verificar feriados, abrindo modal mesmo assim');
        result = {};
      }

      const holiday = result[date];
      console.log('?? [TRACE] holiday for date:', holiday);

      if (holiday && holiday.is_blocked && !holiday.has_override) {
        // Feriado bloqueado - n�o permitir agendamento
        console.warn(`? Data ${date} � feriado bloqueado: ${holiday.name}`);
        alert(
          `? N�o � poss�vel agendar em ${date}\n\n ${holiday.name} - FERIADO NACIONAL\n\n? A agenda est� bloqueada neste dia.\n\nPara desbloquear, utilize a op��o de override manual.`,
        );
        return;
      }

      if (holiday && holiday.has_override) {
        console.log(`?? Data ${date} � feriado COM override: ${holiday.name}`);
      }

      // Permitir agendamento
      console.log('?? [TRACE] About to set modal state to true');
      setNovoAgendamentoInfo({
        date: date,
        viewMode: viewMode,
      });
      // ?? FIX: Zerar appointmentIdToEdit para garantir que abre em modo 'new'
      setAppointmentIdToEdit(null);
      console.log('?? [TRACE] Calling setModalNovoOpen(true)...');
      setModalNovoOpen(true);
      console.log('? Abrindo modal de novo agendamento para:', date);
    } catch (error) {
      console.error('? Erro ao verificar feriado:', error);
      // Em caso de erro, permitir agendamento mesmo assim
      setNovoAgendamentoInfo({
        date: date,
        viewMode: viewMode,
      });
      setModalNovoOpen(true);
    }
  }, [date, viewMode, clinic?.id]);

  const handleSlotClick = useCallback(
    (slot) => {
      // ? Passar dados completos do slot: data, hora, profissional, sala
      console.log(' [handleSlotClick] Slot recebido:');
      console.log('   slot completo:', slot);
      console.log('   Keys em slot:', Object.keys(slot));
      console.log('   slot.professional_id (underscore):', slot.professional_id);
      console.log('   slot.professionalId (camelCase):', slot.professionalId);

      const newInfo = {
        date: slot.date || date,
        time: slot.time,
        professionalId: slot.professional_id || slot.professionalId || slot.professional?.id,
        roomId: slot.room_id || slot.roomId || slot.room?.id,
        duration: slot.duration || 30,
      };
      console.log('? [handleSlotClick] newInfo preparado:', newInfo);
      console.log('   >> professionalId no newInfo:', newInfo.professionalId);
      setNovoAgendamentoInfo(newInfo);
      setModalNovoOpen(true);
    },
    [date],
  );

  const handleEditAppointment = useCallback(
    (appointmentId) => {
      console.log('?? [AgendaIndex] Editando agendamento:', appointmentId);
      console.log('   typeof appointmentId:', typeof appointmentId);

      // ?? ENCONTRAR O AGENDAMENTO COMPLETO NA LISTA
      const foundAppointment = appointments.find((apt) => apt.id === appointmentId);

      if (!foundAppointment) {
        console.error('? [AgendaIndex] Agendamento n�o encontrado:', appointmentId);
        console.log('   Dispon�veis:', appointments.map((a) => a.id).join(', '));
        return;
      }

      console.log('? [AgendaIndex] Agendamento encontrado:', {
        id: foundAppointment.id,
        mode: 'edit',
        patient: foundAppointment.patient_id,
        payer: foundAppointment.payer_id,
        professional: foundAppointment.professional_id,
      });

      // ? PASSAR O AGENDAMENTO COMPLETO PARA ABRIR EM MODO EDIT
      setAppointmentIdToEdit(appointmentId);
      setNovoAgendamentoInfo(foundAppointment);
      setModalNovoOpen(true);
    },
    [appointments],
  );

  const handleCancelAppointment = useCallback((appointment) => {
    console.log('Cancelar agendamento:', appointment.id);
    // Abrir di�logo de confirma��o
  }, []);

  const handleViewDetails = useCallback(
    (appointmentId) => {
      console.log('? Ver detalhes:', appointmentId);
      // Encontrar o agendamento nos dados carregados
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (appointment) {
        setSelectedAppointmentDetails(appointment);
        setDetailsDrawerOpen(true);
      }
    },
    [appointments],
  );

  //  Context Menu Handler - para Week/Month views
  const handleContextMenu = useCallback((e, apt) => {
    console.log('? [AgendaIndex] handleContextMenu CHAMADO!');
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      appointment: apt,
    });
  }, []);

  //  Handler para abrir Prontu�rio do paciente
  const handleOpenPatientRecord = useCallback(
    (patientId, appointment) => {
      if (!patientId) {
        console.error('? [AgendaIndex] Sem patientId para abrir prontu�rio');
        return;
      }

      console.log(' [AgendaIndex] Abrindo prontu�rio do paciente:', patientId);
      navigate(`/clinica/pacientes/${patientId}`, {
        state: {
          appointmentId: appointment?.id,
          appointmentTime: appointment?.scheduled_time,
          appointmentDate: appointment?.scheduled_date,
        },
      });
      setContextMenu(null);
    },
    [navigate],
  );

  // Fechar menu de contexto ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  //  WhatsApp Confirmations Handler
  const handleSendWhatsAppConfirmations = useCallback(async () => {
    if (
      !window.confirm('Enviar confirma��es de WhatsApp para pacientes com agendamentos de amanh�?')
    ) {
      return;
    }

    try {
      setWhatsappLoading(true);
      setWhatsappError(null);
      setWhatsappResult(null);

      const result = await sendBatchConfirmations(clinicId);
      setWhatsappResult(result);

      // Auto-hide success message after 5 seconds
      setTimeout(() => setWhatsappResult(null), 5000);
    } catch (error) {
      console.error('? Erro ao enviar confirma��es:', error);
      setWhatsappError(error.message || 'Erro ao enviar confirma��es');
    } finally {
      setWhatsappLoading(false);
    }
  }, [clinicId]);

  // ?? UNIFIED MODE HANDLERS
  const handleOpenAtendimentoUnificado = useCallback((appointment) => {
    console.log('?? Abrindo AtendimentoUnificado com appointment:', appointment.id);
    setSelectedAppointmentForUnified(appointment);
    setAtendimentoUnificadoOpen(true);
  }, []);

  const handleCloseAtendimentoUnificado = useCallback(() => {
    console.log('?? Fechando AtendimentoUnificado');
    setAtendimentoUnificadoOpen(false);
    setSelectedAppointmentForUnified(null);
    // Recarregar appointments ap�s fechar
    loadAppointments();
  }, [loadAppointments]);

  // ============ RENDER ============

  console.log('+---------------------------------------------------------------+');
  console.log('�                [AgendaIndex] RENDER - FINAL STATE          �');
  console.log('�---------------------------------------------------------------�');
  console.log('� ? DATA QUE SER� USADO PARA AGENDA:', date);
  console.log('� Veio de appointmentDateFinal?:', appointmentDateFinal === date);
  console.log('� viewMode:', viewMode);
  console.log('� clinicId:', clinicId);
  console.log('+---------------------------------------------------------------+');

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* ? WhatsApp Notifications Section - Overlay Fixed */}
      {whatsappResult && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 99998,
            backgroundColor: '#D1FAE5',
            border: '2px solid #10B981',
            color: '#065F46',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '300px',
            fontSize: '14px',
            fontWeight: '500',
            animation: 'slideIn 0.3s ease',
          }}
        >
          <style>{`
            @keyframes slideIn {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>?</span>
            <div>
              <strong style={{ display: 'block', marginBottom: '4px' }}>Sucesso!</strong>
              <div style={{ fontSize: '13px' }}>
                Enviadas:{' '}
                <span style={{ fontWeight: '700' }}>
                  {whatsappResult.sent}/{whatsappResult.total}
                </span>
                {whatsappResult.failed > 0 && (
                  <div style={{ marginTop: '4px', color: '#D97706' }}>
                    ?? {whatsappResult.failed} falharam
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ? WhatsApp Error - Overlay Fixed */}
      {whatsappError && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 99998,
            backgroundColor: '#FEE2E2',
            border: '2px solid #EF4444',
            color: '#7F1D1D',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '300px',
            fontSize: '14px',
            fontWeight: '500',
            animation: 'slideIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>?</span>
            <div>
              <strong style={{ display: 'block', marginBottom: '4px' }}>Erro!</strong>
              <div style={{ fontSize: '13px' }}>{whatsappError}</div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <AgendaHeaderNew
        date={date}
        onPreviousDay={handlePreviousDay}
        onNextDay={handleNextDay}
        onDateSelect={handleDateChange}
        onNewAppointment={handleNewAppointment}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        loading={loading}
        agendaSummary={agendaSummary}
      />

      {/* Toolbar */}
      <AgendaToolbarNew
        viewMode={agendaMode}
        onViewModeChange={handleAgendaModeChange}
        agendaMode={agendaMode}
        canAccessProfessionalMode={canAccessProfessionalMode}
        canAccessRoomMode={true}
      />

      {/* Filters */}
      <AgendaFiltersNew
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        activeFiltersCount={activeFiltersCount}
        metadata={metadata}
      />

      {/*  WhatsApp + Stats Section - All in One Line */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between gap-6">
        {/* LEFT: Stats */}
        <div className="flex items-center gap-8">
          <style>{`
            @keyframes whatsapp-pulse {
              0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(37, 211, 102, 0); }
              100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
            }
            .whatsapp-pulse-btn {
              animation: whatsapp-pulse 2s infinite;
            }
          `}</style>

          {/* Stat: Atendimentos */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-blue-600 tabular-nums">{occupiedSlots}</span>
            <span className="text-xs text-gray-600 mt-0.5">Atendimentos</span>
          </div>

          {/* Separator */}
          <div className="w-px h-7 bg-gray-200" />

          {/* Stat: Livres */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-green-600 tabular-nums">{freeSlots}</span>
            <span className="text-xs text-gray-600 mt-0.5">Livres</span>
          </div>

          {/* Separator */}
          <div className="w-px h-7 bg-gray-200" />

          {/* Stat: Ocupação */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-purple-600 tabular-nums">{occupancyPct}%</span>
            <span className="text-xs text-gray-600 mt-0.5">Ocupação</span>
          </div>
        </div>

        {/* RIGHT: WhatsApp Buttons */}
        <div className="flex items-center gap-2">
          {/* WhatsApp Button */}
          <button
            onClick={handleSendWhatsAppConfirmations}
            disabled={whatsappLoading}
            title={
              whatsappLoading
                ? 'Enviando confirma��es...'
                : 'Enviar confirma��es de agendamentos para amanh� via WhatsApp'
            }
            className={`px-2.5 py-1 text-xs font-medium text-white rounded transition-all flex items-center gap-1 ${
              whatsappLoading
                ? 'bg-green-500 cursor-not-allowed opacity-75'
                : 'hover:scale-105 active:scale-95'
            } ${whatsappLoading ? 'whatsapp-pulse-btn' : ''}`}
            style={{
              backgroundImage: whatsappLoading
                ? 'none'
                : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              backgroundColor: whatsappLoading ? '#22C55E' : undefined,
              boxShadow: !whatsappLoading ? '0 2px 8px rgba(37, 211, 102, 0.2)' : undefined,
              minHeight: '32px',
            }}
          >
            <span style={{ fontSize: '14px' }}>{whatsappLoading ? '?' : ''}</span>
            <span className="hidden sm:inline">
              {whatsappLoading ? 'Enviando...' : 'Confirmar'}
            </span>
          </button>
        </div>
      </div>

      {/* Grid/Content - Renderizar baseado em agendaMode e viewMode */}

      {agendaMode === 'profissional' ? (
        // MODO PROFISSIONAL - Hor�rios dispon�veis por profissional (Dia/Semana/M�s)
        <div className="flex-1 mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          {(() => {
            console.log('\n [index.jsx] Passando dados para AgendaPorProfissional:');
            console.log(`   Appointments: ${filteredAppointments.length} itens`);
            console.log(`   Data selecionada (state): ${date}`);
            console.log(`   ViewMode: ${viewMode}`);

            return null;
          })()}
          <AgendaPorProfissional
            initialDate={date}
            viewMode={viewMode}
            appointments={filteredAppointments}
            professionals={professionals}
            services={services}
            payers={payers}
            rooms={rooms}
            clinicId={clinicId}
            onRefreshAppointments={loadAppointments}
          />
        </div>
      ) : agendaMode === 'sala' && viewMode === 'dia' ? (
        <div className="flex-1 mt-4 bg-white border border-gray-200 rounded-lg overflow-auto">
          {roomModeRooms.length === 0 ? (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center px-6">
              <div className="text-sm font-semibold text-gray-700">Nenhuma sala cadastrada</div>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                Cadastre salas para visualizar a agenda por sala. Os filtros e agendamentos existentes continuam preservados.
              </p>
            </div>
          ) : (
            <div className="min-w-full overflow-x-auto">
              <div
                className="grid border-b border-gray-200 bg-gray-50"
                style={{ gridTemplateColumns: `96px repeat(${roomModeRooms.length}, minmax(220px, 1fr))` }}
              >
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200">
                  Hora
                </div>
                {roomModeRooms.map((room) => (
                  <div key={room.id} className="px-3 py-2 border-r border-gray-200 last:border-r-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{room.name}</div>
                    <div className="text-xs text-gray-500">
                      {(filteredAppointments || []).filter((appointment) => (appointment.room_id || appointment.roomId || appointment.room?.id) === room.id).length} atendimento(s)
                    </div>
                  </div>
                ))}
              </div>
              <div className="divide-y divide-gray-100">
                {(clinicTimeSlots.length > 0 ? clinicTimeSlots : ['08:00']).map((time) => (
                  <div
                    key={time}
                    className="grid min-h-[76px]"
                    style={{ gridTemplateColumns: `96px repeat(${roomModeRooms.length}, minmax(220px, 1fr))` }}
                  >
                    <div className="px-3 py-3 text-xs font-medium text-gray-500 bg-gray-50 border-r border-gray-200">
                      {time}
                    </div>
                    {roomModeRooms.map((room) => {
                      const appointmentsInSlot = roomModeAppointmentsByRoomAndTime[room.id]?.[time] || [];
                      return (
                        <div key={`${room.id}-${time}`} className="p-2 border-r border-gray-100 last:border-r-0">
                          {appointmentsInSlot.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => handleSlotClick({ date, time, room_id: room.id })}
                              className="w-full h-full min-h-[52px] rounded border border-dashed border-gray-200 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              Livre
                            </button>
                          ) : (
                            <div className="space-y-2">
                              {appointmentsInSlot.map((appointment) => {
                                const statusConfig = getStatusConfig(appointment.status);
                                return (
                                  <button
                                    key={appointment.id}
                                    type="button"
                                    onClick={() => handleViewDetails(appointment.id)}
                                    onDoubleClick={() => handleEditAppointment(appointment.id)}
                                    className="w-full text-left rounded border border-gray-200 bg-white px-2 py-2 shadow-sm hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-semibold text-gray-800 truncate">
                                        {appointment.patient_name || appointment.patient?.name || 'Paciente'}
                                      </span>
                                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${statusConfig?.badgeColor || 'bg-gray-100'} ${statusConfig?.badgeTextColor || 'text-gray-700'}`}>
                                        {getStatusLabelOnly(appointment.status)}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500 truncate">
                                      {appointment.professional_name || appointment.professional?.name || 'Profissional não informado'}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'semana' ? (
        // WEEK VIEW
        <div className="flex-1 mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <AgendaWeekView
            date={date}
            appointments={filteredAppointments}
            onDayClick={handleDateChange}
            onBookSlot={handleSlotClick}
            onEditAppointment={handleEditAppointment}
            onViewDetails={handleViewDetails}
            onContextMenu={handleContextMenu}
            showWeekends={true}
            clinicId={clinicId}
            filteredProfessionalId={filters.professional_id}
            userRole={auth?.currentRole}
            userProfessionalId={userProfessionalId}
          />
        </div>
      ) : viewMode === 'mes' ? (
        // MONTH VIEW
        <div className="flex-1 mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <AgendaMonthView
            date={date}
            appointments={filteredAppointments}
            onDayClick={handleDateChange}
            onBookSlot={handleSlotClick}
            onEditAppointment={handleEditAppointment}
            onViewDetails={handleViewDetails}
            onContextMenu={handleContextMenu}
            clinicId={clinicId}
            filteredProfessionalId={filters.professional_id}
            userRole={auth?.currentRole}
            userProfessionalId={userProfessionalId}
          />
        </div>
      ) : (
        // DAY VIEW (padr�o)
        <div className="flex-1 mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          {console.log(
            ' [RENDER AgendaIndex] Renderizando AgendaDayView com onEditAppointment:',
            typeof handleEditAppointment === 'function' ? '? FUNCTION' : '? N�O � FUN��O',
          )}
          <AgendaDayView
            appointments={filteredAppointments}
            onBookSlot={handleSlotClick}
            onEditAppointment={handleEditAppointment}
            onViewDetails={handleViewDetails}
            date={date}
            clinicId={clinicId}
            filteredProfessionalId={filters.professional_id}
            userRole={auth?.currentRole}
            userProfessionalId={userProfessionalId}
            professionals={professionals}
            services={services}
            payers={payers}
          />
        </div>
      )}

      {/*  CONTEXT MENU - Week/Month views */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-max"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            onClick={(e) => {
              const appointmentId = contextMenu.appointment?.id;
              if (appointmentId && typeof handleEditAppointment === 'function') {
                handleEditAppointment(appointmentId);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Editar (ou duplo clique)
          </button>

          {/*  Abrir Prontu�rio - Para profissionais */}
          {auth?.currentRole === 'profissional' && (
            <button
              onClick={() => {
                const patientId = contextMenu.appointment?.patient_id;
                if (patientId) {
                  handleOpenPatientRecord(patientId, contextMenu.appointment);
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors flex items-center gap-2 border-t border-gray-100"
            >
              Abrir Prontu�rio
            </button>
          )}

          <button
            onClick={() => {
              const appointmentId = contextMenu.appointment?.id;
              if (appointmentId && typeof handleViewDetails === 'function') {
                handleViewDetails(appointmentId);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 border-t border-gray-100"
          >
            <Eye className="w-4 h-4" />
            Detalhes
          </button>
        </div>
      )}

      {/* MODAL NOVO/EDI��O DE AGENDAMENTO */}
      <ModalCriarAgendamento
        open={modalNovoOpen}
        onOpenChange={(newOpen) => {
          console.log(' [AgendaIndex] onOpenChange chamado com newOpen:', newOpen);
          console.log('   appointmentIdToEdit (antes de atualizar):', appointmentIdToEdit);
          console.log('   novoAgendamentoInfo neste momento:', novoAgendamentoInfo);

          setModalNovoOpen(newOpen);

          // Limpar estado ao fechar
          if (!newOpen) {
            console.log('   ?? Fechando modal');
            console.log(
              '   ? N�O limpando appointmentIdToEdit - ser� zerado apenas ao abrir novo',
            );
            // ?? FIX: N�o zerar appointmentIdToEdit aqui para evitar race condition
            // Ser� zerado apenas quando abrir um novo agendamento
            setNovoAgendamentoInfo(null);

            // ?? CR�TICO: Marcar que o modal foi fechado intencionalmente
            // Isso previne que o useEffect reabra a modal
            hasModalBeenClosedRef.current = true;
            console.log('   ? hasModalBeenClosedRef.current = true - n�o vai reabrir');

            // Limpar a URL de par�metros de auto-open
            if (modeParam === 'edit' && appointmentIdFinal) {
              console.log('   ?? Limpando par�metros de URL (mode=edit, appointmentId)');
              navigate('/clinica/agenda', { replace: true });
            }
          } else {
            console.log('   ?? Abrindo modal');
            // ?? FIX: Se abrindo SEM appointmentIdToEdit, isso � novo agendamento
            if (!appointmentIdToEdit) {
              console.log(
                '   ? Novo agendamento detectado, modalNovoOpen=true, appointmentIdToEdit � null',
              );
            } else {
              console.log(
                '   ? Abrindo em modo EDIT com appointmentIdToEdit:',
                appointmentIdToEdit,
              );
            }
            // Resetar a flag ao abrir (se o usu�rio abrir um novo agendamento)
            hasModalBeenClosedRef.current = false;
          }
        }}
        clinicId={clinicId}
        data={novoAgendamentoInfo}
        appointmentIdToEdit={appointmentIdToEdit}
        initialTab={appointmentTabParam === 'resumo' ? 'resumo' : undefined}
        professionals={professionals}
        services={services}
        payers={payers}
        onCreated={async (appointmentData) => {
          console.log(' [ModalCriarAgendamento] onCreated CHAMADO');
          console.log(' Dados recebidos:', appointmentData);
          console.log(' Current date state:', date);

          if (!appointmentData) {
            console.log('?? appointmentData � null/undefined');
            setModalNovoOpen(false);
            setAppointmentIdToEdit(null);
            setNovoAgendamentoInfo(null);
            await loadAppointments();
            return;
          }

          // Detectar mudan�a de data (comparar data nova com original)
          const originalDate = appointmentData.originalDate;
          const newDate = appointmentData.date;

          if (newDate) {
            console.log(' Compara��o de datas:');
            console.log(`   Data original (originalDate): "${originalDate}"`);
            console.log(`   Data nova (appointmentData.date): "${newDate}"`);
            console.log(`   Data atual view (date): "${date}"`);

            // Se originalDate est� definida, usar para compara��o (em modo edi��o)
            // Sen�o, comparar com a data atual (em modo cria��o)
            const compareDate = originalDate || date;
            console.log(`   Comparando contra: "${compareDate}"`);
            console.log(`   Mudou? ${newDate !== compareDate}`);

            if (newDate !== compareDate) {
              console.log(` ? DATA MUDOU! Navegando para ${newDate}`);
              setDate(newDate);
            } else {
              console.log(' ?? Mesma data');
            }
          } else {
            console.log('?? appointmentData.date n�o definido');
          }

          setModalNovoOpen(false);
          setAppointmentIdToEdit(null);
          setNovoAgendamentoInfo(null);
          // ? RECARREGAR AGENDAMENTOS DO SERVIDOR ap�s salvar/editar
          await loadAppointments();
        }}
      />

      {/* ?? UNIFIED MODE MODAL */}
      {selectedAppointmentForUnified && atendimentoUnificadoOpen && (
        <React.Suspense fallback={<div>Carregando...</div>}>
          <AtendimentoUnificado
            isOpen={atendimentoUnificadoOpen}
            onClose={handleCloseAtendimentoUnificado}
            appointment={selectedAppointmentForUnified}
            onSaved={handleCloseAtendimentoUnificado}
          />
        </React.Suspense>
      )}

      {/* DRAWER DE DETALHES DO AGENDAMENTO */}
      {detailsDrawerOpen && selectedAppointmentDetails && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setDetailsDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="relative ml-auto w-full max-w-md bg-white shadow-2xl flex flex-col max-h-screen overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between border-b">
              <h2 className="text-xl font-bold">Detalhes do Agendamento</h2>
              <button
                onClick={() => setDetailsDrawerOpen(false)}
                className="text-white hover:bg-white/20 p-2 rounded transition-colors"
              >
                ?
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-6">
              {/* Paciente */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Paciente
                </h3>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {selectedAppointmentDetails.patients?.name ||
                    selectedAppointmentDetails.lead_name ||
                    '�'}
                </p>
                {selectedAppointmentDetails.patients?.document_id && (
                  <p className="text-sm text-gray-600 mt-1">
                    CPF: {selectedAppointmentDetails.patients.document_id}
                  </p>
                )}
                {selectedAppointmentDetails.patients?.prontuario_numero && (
                  <p className="text-sm text-gray-600">
                    Prontu�rio: {selectedAppointmentDetails.patients.prontuario_numero}
                  </p>
                )}
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Data
                  </h3>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {selectedAppointmentDetails.scheduled_date
                      ? new Date(selectedAppointmentDetails.scheduled_date).toLocaleDateString(
                          'pt-BR',
                        )
                      : '�'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Hor�rio
                  </h3>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {selectedAppointmentDetails.scheduled_time || '�'}
                  </p>
                </div>
              </div>

              {/* Servi�o */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Servi�o
                </h3>
                <p className="text-base text-gray-900 mt-1">
                  {selectedAppointmentDetails.services?.name || '�'}
                </p>
              </div>

              {/* Profissional */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Profissional
                </h3>
                <p className="text-base text-gray-900 mt-1">
                  {selectedAppointmentDetails.professionals?.name || '�'}
                </p>
              </div>

              {/* Sala */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Sala
                </h3>
                <p className="text-base text-gray-900 mt-1">
                  {selectedAppointmentDetails.rooms?.name || '�'}
                </p>
              </div>

              {/* Conv�nio */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Conv�nio
                </h3>
                <p className="text-base text-gray-900 mt-1">
                  {selectedAppointmentDetails.payers?.active === false
                    ? '�'
                    : selectedAppointmentDetails.payers?.name || 'Particular'}
                </p>
              </div>

              {/* Plano */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Plano
                </h3>
                <p className="text-base text-gray-900 mt-1">
                  {selectedAppointmentDetails.plans?.name || '�'}
                </p>
                {selectedAppointmentDetails.plans?.code && (
                  <p className="text-sm text-gray-600 mt-1">
                    C�digo: {selectedAppointmentDetails.plans.code}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </h3>
                <p className="text-base font-semibold mt-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      getStatusConfig(selectedAppointmentDetails.status)?.color ||
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {getStatusLabelOnly(selectedAppointmentDetails.status) ||
                      selectedAppointmentDetails.status ||
                      'desconhecido'}
                  </span>
                </p>
              </div>

              {/* Valor */}
              {selectedAppointmentDetails.value && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Valor
                  </h3>
                  <p className="text-lg font-bold text-gray-900 mt-1 text-green-600">
                    R$ {parseFloat(selectedAppointmentDetails.value).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Contato */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Contato
                </h3>
                {selectedAppointmentDetails.patients?.cell_phone && (
                  <p className="text-sm text-gray-900 mt-1">
                    {' '}
                    {selectedAppointmentDetails.patients.cell_phone}
                  </p>
                )}
                {selectedAppointmentDetails.patients?.phone && (
                  <p className="text-sm text-gray-900">
                    ?? {selectedAppointmentDetails.patients.phone}
                  </p>
                )}
              </div>

              {/* Observa��es */}
              {selectedAppointmentDetails.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Observa��es
                  </h3>
                  <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded border border-gray-200">
                    {selectedAppointmentDetails.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
