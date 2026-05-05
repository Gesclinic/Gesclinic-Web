// src/pages/clinica/agenda/AgendaPage.jsx
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useDataCache, CacheManager } from '@/hooks/useDataCache';
import { useAgendaStore } from './hooks/useAgendaStore';
import { useAgendaFinanceMetrics } from './hooks/useAgendaFinanceMetrics';
import { supabase } from '@/lib/customSupabaseClient';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import AgendaHeader from './components/AgendaHeader';
import AgendaIndicators from './components/AgendaIndicators';
import AgendaTabs from './components/AgendaTabs';
import AgendaFilters from './components/AgendaFilters';
import AgendaHeatmap from './components/AgendaHeatmap';
import AgendaTimeline from './components/AgendaTimeline';
import AppointmentModal from './components/AppointmentUnitedModal';
import EncaixeSuggestions from './components/EncaixeSuggestions';
import AgendaFinanceDashboard from './components/AgendaFinanceDashboard';
import AgendaProfessionalView from './components/AgendaProfessionalView';
import AgendaProfessionalFilters from './components/AgendaProfessionalFilters';
import CheckinDrawer from './components/CheckinDrawer';
import AtendimentoModal from './components/AtendimentoModal';
import { suggestEncaixes } from '@/modules/agenda/utils/suggestEncaixe';
import { migrateStatus, SERVICE_STATUSES } from '@/lib/appointmentStatusConstants';

// APIs
import {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  syncAppointmentServices,
} from '@/lib/appointmentsApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listServices } from '@/lib/servicesApi';
import { listPayers } from '@/lib/payersApi';
import { listPatients } from '@/lib/patientsApi';
import { listRooms } from '@/lib/roomsApi';
import {
  validateAppointmentScheduling,
  calculateAppointmentData,
  listProfessionalsForService,
} from '@/lib/agendaIntegrationApi';
import { seedNationalHolidays } from '@/lib/holidaysApi';

import { sendBatchConfirmations } from '@/lib/whatsappConfirmationApi';

/**
 * AgendaPage - Página principal da Agenda Única
 *
 * Características:
 * - Visualização única com múltiplos modos (Geral, Profissional, Sala)
 * - Sem múltiplas rotas
 * - Estado centralizado com useAgendaStore
 * - Integração com Supabase
 * - RBAC (controle de permissões por perfil)
 */
export default function AgendaPage() {
  console.log('🚀 [AgendaPage] COMPONENTE INICIOU!');

  const navigate = useNavigate();
  const location = useLocation();
  const { user, currentRole, loading: authLoading } = useAuth();
  const { clinic, loadingClinic, clinicId } = useClinicContext();
  const [searchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const modeParam = searchParams.get('mode');
  const appointmentIdFromUrl = searchParams.get('appointmentId') || location.state?.appointmentId;
  const appointmentDateFromUrl = searchParams.get('appointmentDate'); // 📅 Query param
  const appointmentDateFromState = location.state?.appointmentDate; // 📅 State
  const appointmentDateFromStateOrUrl = appointmentDateFromUrl || appointmentDateFromState; // Prioridade: URL > state
  const agenda = useAgendaStore();

  // 🔍 DEBUG: Verificar clinicId
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         🎯 [AgendaPage] STARTUP DIAGNOSTICS                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('📍 clinicId:', clinicId);
  console.log('📍 loadingClinic:', loadingClinic);
  console.log('📅 appointmentDateFromUrl (query):', appointmentDateFromUrl);
  console.log('📅 appointmentDateFromState:', appointmentDateFromState);
  console.log('📅 appointmentDateFromStateOrUrl (final):', appointmentDateFromStateOrUrl);
  console.log('🆔 appointmentIdFromUrl:', appointmentIdFromUrl);
  console.log('🔧 modeParam:', modeParam);
  console.log('📋 location.search:', location.search);
  console.log('📦 location.state:', location.state);
  console.log('═══════════════════════════════════════════════════════════════');

  // 🚩 Flag para rastrear se o modal foi fechado intencionalmente
  const hasModalBeenClosed = useRef(false); // 🔍 Rastrear o patientId anterior para detectar mudanças
  const prevPatientIdRef = useRef(null);
  // 🔐 Controle de acesso aos diferentes modos
  // Recepção: modo simplificado operacional
  // Profissional: modo focado apenas seus atendimentos
  // Gestor: modo completo com análises financeiras
  const isProfissional = currentRole?.toLowerCase?.() === 'profissional';
  const isGestor =
    currentRole && ['gestor', 'admin', 'administrador'].includes(currentRole?.toLowerCase?.());
  // 📊 Indicadores: apenas Admin e Gestor
  const canViewIndicators =
    currentRole && ['gestor', 'admin', 'administrador'].includes(currentRole?.toLowerCase?.());
  // Permite profissional, gestor, ou role desconhecido (null = pode ser admin)
  const canAccessProfessionalMode = isProfissional || isGestor || !currentRole;
  const canAccessGestorMode =
    !currentRole || (currentRole?.toLowerCase?.() !== 'recepcao' && !isProfissional);

  const [agendaMode, setAgendaMode] = useState('recepcao');
  const [userProfessionalId, setUserProfessionalId] = useState(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState(null);
  const [whatsappError, setWhatsappError] = useState(null);

  // ⚡ SEED de feriados - ATIVA AUTOMATICAMENTE
  // Garante que feriados nacionais existem no banco antes de carregar agenda
  // SEED SEMPRE executa - feriados nacionais são compartilhados entre clínicas (clinic_id = null)
  useEffect(() => {
    const ensureHolidaysExist = async () => {
      const currentYear = new Date().getFullYear();

      console.log(
        `🌱 [AgendaPage] Garantindo feriados para ${currentYear}. clinicId=${clinicId}, loading=${loadingClinic}`,
      );

      try {
        // Passa null para clinic_id - feriados nacionais são compartilhados
        const seedResult = await seedNationalHolidays(currentYear, null);
        console.log(`📌 [Seed] Resultado: ${seedResult ? '✅ OK' : '⚠️ FALHOU'}`);
      } catch (error) {
        console.error('❌ [Seed] Erro:', error);
      }
    };

    // IMPORTANTE: Não depender de clinicId estar carregado
    // Feriados nacionais (clinic_id = null) existem para todo o sistema
    ensureHolidaysExist();
  }, []);

  // 🔧 Auto-set Modo Profissional quando profissional logado
  useEffect(() => {
    if (isProfissional) {
      console.log('👨‍⚕️ Profissional logado - ativando Modo Profissional');
      setAgendaMode('profissional');
    }
  }, [isProfissional]);

  // Estado para sugestões de encaixe
  const [encaixeSuggestions, setEncaixeSuggestions] = useState([]);

  // 📋 Estado para Check-in Drawer
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinAppointment, setCheckinAppointment] = useState(null);

  // � Estado para AtendimentoModal (TISS)
  const [atendimentoModalOpen, setAtendimentoModalOpen] = useState(false);
  const [atendimentoModalAppointment, setAtendimentoModalAppointment] = useState(null);

  // �👤 Estado para paciente pré-selecionado
  const [preSelectedPatient, setPreSelectedPatient] = useState(null);

  // ============================================================
  // CACHE: Dados de Agenda (Metadata) - Com TTL de 10 minutos
  // ============================================================
  // TEMPORARIAMENTE DESABILITADO - carregando direto sem cache
  const [metadataFromCache, setMetadataFromCache] = useState(null);
  const metadataLoading = false;
  const refreshMetadata = () => {}; // dummy

  // Carregar metadata diretamente
  useEffect(() => {
    console.log('📊 [Metadata Effect] Disparado. Condiçoes:', {
      clinicId,
      authLoading,
      loadingClinic,
    });

    if (authLoading) {
      console.log('📊 [Metadata Effect] Auth ainda carregando, aguardando...');
      return;
    }

    if (!clinicId) {
      console.log('📊 [Metadata Effect] clinicId ainda não disponível:', clinicId);
      return;
    }

    (async () => {
      try {
        console.log('📊 [Metadata Effect] Carregando dados para clinicId:', clinicId);

        const [professionals, rooms, services, payers, patients] = await Promise.all([
          listProfessionals(clinicId).catch((err) => {
            console.error('❌ Erro em listProfessionals:', err);
            return [];
          }),
          listRooms(clinicId).catch((err) => {
            console.error('❌ Erro em listRooms:', err);
            return [];
          }),
          listServices(clinicId).catch((err) => {
            console.error('❌ Erro em listServices:', err);
            return [];
          }),
          listPayers(clinicId).catch((err) => {
            console.error('❌ Erro em listPayers:', err);
            return [];
          }),
          listPatients(clinicId).catch((err) => {
            console.error('❌ Erro em listPatients:', err);
            return [];
          }),
        ]);

        console.log('📊 [Metadata Effect] Dados carregados:', {
          professionals: professionals?.length || 0,
          rooms: rooms?.length || 0,
          services: services?.length || 0,
          payers: payers?.length || 0,
          patients: patients?.length || 0,
        });

        setMetadataFromCache({
          professionals: professionals || [],
          rooms: rooms || [],
          services: services || [],
          payers: payers || [],
          patients: patients || [],
        });
        console.log('✅ Metadata carregada, setada no estado local');
      } catch (err) {
        console.error('❌ Erro ao carregar metadata:', err);
      }
    })();
  }, [clinicId, authLoading]);

  /**
   * 🔐 Bloqueio Defensivo: Impede acesso indevido aos modos
   * - Recepção não pode acessar Gestor ou Profissional
   * - Profissional não pode acessar Gestor
   */
  useEffect(() => {
    if (!canAccessGestorMode && agendaMode === 'gestor') {
      console.warn('🚫 Acesso negado ao Modo Gestor para perfil:', currentRole);
      setAgendaMode(canAccessProfessionalMode ? 'profissional' : 'recepcao');
    }

    if (!canAccessProfessionalMode && agendaMode === 'profissional') {
      console.warn('🚫 Acesso negado ao Modo Profissional para perfil:', currentRole);
      setAgendaMode('recepcao');
    }
  }, [canAccessGestorMode, canAccessProfessionalMode, agendaMode, currentRole]);

  // 🔗 Abrir modal automaticamente com patientId do URL
  useEffect(() => {
    // Detectar se o patientId MUDOU (não se existe)
    const patientIdChanged = prevPatientIdRef.current !== patientIdFromUrl;
    if (patientIdChanged) {
      console.log('🔄 PatientId mudou de', prevPatientIdRef.current, 'para', patientIdFromUrl);
      prevPatientIdRef.current = patientIdFromUrl;
      // Resetar flag apenas quando patientId muda para um novo valor
      hasModalBeenClosed.current = false;
    }

    // Só abre a modal se há patientId no URL, não há slot selecionado, e o modal não foi fechado intencionalmente
    if (patientIdFromUrl && !agenda.selectedSlot && !hasModalBeenClosed.current) {
      console.log('📋 Abrindo modal com patientId:', patientIdFromUrl);
      // Criar um slot para novo agendamento
      const today = new Date().toISOString().split('T')[0];
      agenda.selectSlot({
        type: 'new',
        date: today,
        time: '09:00',
      });

      // Carregar dados do paciente para pré-seleção
      const loadPatient = async () => {
        try {
          const { getPatientById } = await import('@/lib/patientsApi');
          const patient = await getPatientById(patientIdFromUrl);
          if (patient) {
            setPreSelectedPatient(patient);
            console.log('✅ Paciente carregado:', patient.name);
          }
        } catch (err) {
          console.error('❌ Erro ao carregar paciente:', err);
        }
      };

      loadPatient();
    }
  }, [patientIdFromUrl, agenda]);

  // Calcular métricas Agenda × Financeiro
  const metrics = useMemo(() => {
    return useAgendaFinanceMetrics(
      agenda.filteredAppointments || [],
      agenda.metadata?.professionals || [],
      agenda.metadata?.services || [],
      agenda.date,
    );
  }, [agenda.filteredAppointments, agenda.metadata, agenda.date]);

  // 👨‍⚕️ Filtrar agendamentos para profissional
  const professionalAppointments = useMemo(() => {
    console.log('🔍 [ProfessionalView] Filtering with:', {
      agendaMode,
      userProfessionalId,
      appointmentCount: agenda.filteredAppointments?.length,
    });

    if (agendaMode !== 'profissional' || !agenda.filteredAppointments) {
      console.log('🔍 [ProfessionalView] Not in professional mode or no appointments');
      return agenda.filteredAppointments;
    }

    // 🔒 Se userProfessionalId foi setado, usar para filtrar
    if (userProfessionalId) {
      console.log('👨‍⚕️ [ProfessionalView] Filtering by professional_id:', userProfessionalId);
      const filtered = agenda.filteredAppointments.filter(
        (a) => a.professional_id === userProfessionalId,
      );
      console.log(
        `👨‍⚕️ [ProfessionalView] Filtered from ${agenda.filteredAppointments.length} to ${filtered.length} appointments`,
      );
      return filtered;
    }

    // Fallback: se não houver userProfessionalId mas estiver em modo profissional, retornar vazio
    console.error(
      '🔴 [ProfessionalView] Em modo profissional mas sem userProfessionalId! Retornando vazio.',
    );
    return [];
  }, [agendaMode, agenda.filteredAppointments, userProfessionalId]);

  /**
   * Carrega os agendamentos para a data selecionada
   */
  const loadAgendaData = async () => {
    if (!clinicId) {
      console.log('⏸️ Aguardando clinicId... atual:', clinicId);
      return;
    }

    try {
      agenda.setLoading(true);
      agenda.setError(null);

      // Converter data em formato YYYY-MM-DD para Date local (não UTC!)
      const [year, month, day] = agenda.date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const startISO = startDate.toISOString();

      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      const endISO = endDate.toISOString();

      console.log('📅 Buscando agendamentos:', {
        date: agenda.date,
        startISO,
        endISO,
        clinicId,
        currentRole: currentRole,
        user_id: user?.id,
      });

      // 🔒 Se for profissional, buscar o professional_id do usuário
      let userProfId = null;
      const isProf = currentRole?.toLowerCase?.() === 'profissional';
      console.log(
        '🔍 [RBAC Debug] isProf:',
        isProf,
        'currentRole:',
        currentRole,
        'user.email:',
        user?.email,
      );

      if (isProf && user?.email) {
        console.log(
          '🔍 [RBAC Debug] Querying professionals table for email:',
          user.email,
          'clinic_id:',
          clinicId,
        );
        const { data: allProfs, error: profError } = await supabase
          .from('professionals')
          .select('id, email, clinic_id, name')
          .eq('email', user.email)
          .eq('clinic_id', clinicId);

        console.log('🔍 [RBAC Debug] Query result (all records):', {
          allProfs,
          profError,
          count: allProfs?.length,
        });

        if (allProfs?.length > 1) {
          console.error(
            `⚠️ [DUPLICATA] ${allProfs.length} registros encontrados para ${user.email}`,
          );
          allProfs.forEach((p, idx) =>
            console.log(`  [${idx}] id=${p.id}, name=${p.name}, clinic_id=${p.clinic_id}`),
          );
        }

        if (allProfs?.length === 1) {
          const profData = allProfs[0];
          userProfId = profData.id;
          setUserProfessionalId(userProfId);
          console.log(`✅ [RBAC] Profissional encontrado: ${userProfId} (${profData.name})`);
        } else if (allProfs?.length === 0) {
          console.error(
            `❌ [RBAC CRÍTICO] Nenhum profissional encontrado para email=${user.email} e clinic_id=${clinicId}`,
          );
        }
      }

      console.log('🔍 [RBAC Debug] Calling listAppointments with:', {
        userRole: currentRole,
        userProfessionalId: userProfId,
      });

      if (isProf && !userProfId) {
        console.error(
          '🔴 [RBAC] ERRO: Modo profissional mas sem professional_id! Nenhum filtro será aplicado!',
        );
      }

      // Buscar agendamentos
      const appointments = await listAppointments({
        clinicId,
        start: startISO,
        end: endISO,
        userRole: currentRole,
        userProfessionalId: userProfId,
      });

      console.log('📦 Resultado da busca:', appointments);
      agenda.setAppointments(appointments || []);
      console.log('✅ Estado atualizado. Verificar renderização...');
    } catch (err) {
      console.error('❌ Erro ao carregar agenda:', err);
      agenda.setError('Erro ao carregar agendamentos. Tente novamente.');
    } finally {
      agenda.setLoading(false);
    }
  };

  /**
   * Carrega dados auxiliares (profissionais, salas, serviços, etc)
   * Quando metadataFromCache é atualizado, aplica ao store SEMPRE (se não for null)
   */
  useEffect(() => {
    if (!metadataFromCache) {
      return;
    } // Ignorar se still null

    console.log('📦 [Metadata Effect 2] Aplicando dados. Contagem:', {
      professionals: metadataFromCache?.professionals?.length || 0,
      rooms: metadataFromCache?.rooms?.length || 0,
      services: metadataFromCache?.services?.length || 0,
      payers: metadataFromCache?.payers?.length || 0,
    });

    agenda.setMetadata(metadataFromCache);
    console.log('✅ [Metadata Effect 2] Metadata setada no store');
  }, [metadataFromCache, agenda]);

  // Carregamento de dados na montagem e quando clinicId muda
  useEffect(() => {
    console.log('🔄 useEffect disparado. clinicId ou agenda.date:', clinicId, agenda.date);
    if (clinicId && agenda.date) {
      console.log('✨ Iniciando carregamento de agendamentos para data:', agenda.date);
      loadAgendaData();
    }
  }, [clinicId, agenda.date]);

  /**
   * Gera sugestões de encaixe inteligentes
   * Chamado quando usuário abre modal de novo agendamento ou procura vaga
   */
  const generateEncaixeSuggestions = (serviceDuration = 30) => {
    if (!agenda.metadata?.professionals?.length || !agenda.metadata?.rooms?.length) {
      return [];
    }

    // Gerar array de horários para o dia
    const horarios = Array.from({ length: 20 }, (_, i) => {
      const hour = Math.floor(8 + i / 2);
      const minute = (i % 2) * 30;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    });

    // Chamar função de sugestão
    const sugestoes = suggestEncaixes({
      horarios,
      agendamentos: agenda.filteredAppointments || [],
      profissionais: agenda.metadata.professionals,
      salas: agenda.metadata.rooms,
      servico: { duracao: serviceDuration },
      maxSugestoes: 3,
    });

    setEncaixeSuggestions(sugestoes);
    return sugestoes;
  };

  /**
   * Handlers para ações do agendamento
   */
  const handleNewAppointment = (slot) => {
    // Gerar sugestões inteligentes quando abrir modal de novo agendamento
    generateEncaixeSuggestions(30);

    // ✅ Formatar data e hora para exibição em português
    const displayDate = slot.date || agenda.date;
    const displayTime = slot.time || '09:00';
    const profesionalName = 'Profissional a definir';

    // Converter data YYYY-MM-DD para DD/MM/YYYY
    const dateParts = displayDate ? displayDate.split('-') : ['2026', '01', '01'];
    const [year, month, day] = dateParts;
    const formattedDate = `${day}/${month}/${year}`;

    // ✅ Pedir confirmação antes de abrir o modal
    const confirmed = window.confirm(
      'Deseja criar novo agendamento?\n\n' +
        `📅 Data: ${formattedDate}\n` +
        `🕐 Horário: ${displayTime}\n` +
        `👨‍⚕️ Profissional: ${profesionalName}\n\n` +
        'Clique em OK para continuar...',
    );

    if (!confirmed) {
      return;
    }

    // ✅ Ser explícito: usar apenas os dados necessários para novo agendamento
    agenda.selectSlot({
      type: 'new',
      date: slot.date || agenda.date,
      time: slot.time || '09:00',
      professional_id: slot.professional_id || undefined,
      room_id: slot.room_id || undefined,
    });
  };

  /**
   * 🎉 Callback quando agendamento é salvo com sucesso
   */
  const handleAppointmentSuccess = async () => {
    console.log('✅ [handleAppointmentSuccess] Agendamento salvo com sucesso!');
    await loadAgendaData();
    agenda.deselectSlot();
  };

  /**
   * 📋 Abrir drawer de Check-in para um agendamento
   */
  const handleOpenCheckin = (appointment) => {
    setCheckinAppointment(appointment);
    setCheckinOpen(true);
  };

  /**
   * 📋 Abrir AtendimentoModal (TISS) para um agendamento
   */
  const handleOpenAtendimento = (appointment) => {
    const normalizedStatus = migrateStatus(appointment?.status);
    const isClinicalFlow = [
      SERVICE_STATUSES.AWAITING_PROFESSIONAL,
      SERVICE_STATUSES.IN_SERVICE,
      SERVICE_STATUSES.ATTENDED,
    ].includes(normalizedStatus);

    if (appointment?.patient_id && isClinicalFlow) {
      // ✅ Passar info completa para rastrear a origem
      navigate(`/clinica/pacientes/${appointment.patient_id}`, {
        state: {
          previousPage: 'agenda', // ✅ Indicar que veio da Agenda
          appointmentId: appointment.id,
          appointmentDate: appointment.scheduled_date || null,
          openTab: 'historico',
          fromAgendaClinicalFlow: true,
          canStartAppointment: normalizedStatus === SERVICE_STATUSES.AWAITING_PROFESSIONAL,
        },
      });
      return;
    }

    setAtendimentoModalAppointment(appointment);
    setAtendimentoModalOpen(true);
  };

  /**
   * 📋 Fechar drawer de Check-in e recarregar agenda
   */
  const handleCloseCheckin = () => {
    setCheckinOpen(false);
    setCheckinAppointment(null);
    // Recarregar agendamentos após mudança de status
    loadAgendaData();
  };

  /**
   * 📋 Fechar AtendimentoModal e recarregar agenda
   */
  const handleCloseAtendimento = () => {
    setAtendimentoModalOpen(false);
    setAtendimentoModalAppointment(null);
    // Recarregar agendamentos após mudança de status
    loadAgendaData();
  };

  // 🔗 PRIMEIRO: Navegar para a DATA CORRETA do appointment
  useEffect(() => {
    // Se temos appointmentDate direto do state ou URL (vindo de Contas a Receber), usar direto
    if (appointmentDateFromStateOrUrl) {
      console.log(
        '📅 [Navigate To Appointment Date] appointmentDate vindo do state/URL:',
        appointmentDateFromStateOrUrl,
      );
      console.log('   clinicId:', clinicId, 'loadingClinic:', loadingClinic);

      // Validar formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(appointmentDateFromStateOrUrl)) {
        // Não é necessário esperar clinicId estar pronto - pode setar a data direto
        agenda.setDate(appointmentDateFromStateOrUrl);
        console.log(
          '✅ [Navigate To Appointment Date] Agenda navegada para data:',
          appointmentDateFromStateOrUrl,
        );
      } else {
        console.warn(
          '⚠️ [Navigate To Appointment Date] Data do estado/URL com formato inválido:',
          appointmentDateFromStateOrUrl,
        );
      }
      return; // Não processar appointmentId depois
    }

    // Se temos appointmentId, buscar no banco para descobrir a data
    if (!appointmentIdFromUrl || !clinicId) {
      console.log('❌ [Navigate To Appointment Date] Sem appointmentId ou clinicId', {
        appointmentIdFromUrl,
        clinicId,
      });
      return;
    }

    console.log('🔍 [Navigate To Appointment Date] Buscando appointment no banco...', {
      appointmentIdFromUrl,
    });

    // Buscar o appointment no Supabase para descobrir a data correta
    supabase
      .from('appointments')
      .select('*') // Buscar TODOS os campos para debugar
      .eq('id', appointmentIdFromUrl)
      .eq('clinic_id', clinicId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.warn(
            '⚠️ [Navigate To Appointment Date] Erro ao buscar appointment:',
            error.message,
          );
          return;
        }

        if (!data) {
          console.warn(
            '⚠️ [Navigate To Appointment Date] Appointment não encontrado:',
            appointmentIdFromUrl,
          );
          return;
        }

        if (data) {
          console.log('📊 [Navigate To Appointment Date] Dados completos do appointment:', data);

          // Tentar diferentes nomes de campo para data
          let appointmentDate =
            data.appointment_date || data.scheduled_date || data.date || data.data_agendamento;

          if (!appointmentDate) {
            console.warn('⚠️ [Navigate To Appointment Date] Nenhum campo de data encontrado!');
            console.log('   Campos disponíveis:', Object.keys(data));
            return;
          }

          // Se a data tem timestamp/hora (T no meio), extrair apenas parte da data
          if (appointmentDate.includes('T')) {
            appointmentDate = appointmentDate.split('T')[0];
          }

          console.log('✅ [Navigate To Appointment Date] Appointment encontrado!', {
            id: data.id,
            date: appointmentDate,
            originalfield: data.appointment_date || data.scheduled_date,
          });

          // Navegar a agenda para a data correta
          agenda.setDate(appointmentDate);
          console.log('✅ [Navigate To Appointment Date] Agenda navegada para:', appointmentDate);
        } else {
          console.warn('⚠️ [Navigate To Appointment Date] Appointment não encontrado no banco');
        }
      })
      .catch((err) => {
        console.error('❌ [Navigate To Appointment Date] Erro:', err.message);
      });
  }, [appointmentIdFromUrl, appointmentDateFromStateOrUrl, clinicId]); // Dependências

  // 🔗 SEGUNDO: Abrir drawer de Check-in automaticamente com appointmentId (do state ou URL)
  useEffect(() => {
    console.log('🔔 [AutoOpen Checkin] useEffect DISPAROU!', { appointmentIdFromUrl });

    // Esperar agenda carregar e ter appointmentId
    if (!appointmentIdFromUrl) {
      console.log('❌ [AutoOpen Checkin] Sem appointmentId disponível - RETORNANDO');
      return;
    }

    console.log('🔍 [AutoOpen Checkin] Iniciando busca...', {
      appointmentIdFromUrl,
      agendaLoading: agenda.loading,
      appointmentsCount: agenda.appointments?.length || 0,
      filteredCount: agenda.filteredAppointments?.length || 0,
    });

    // Se ainda está carregando, aguardar
    if (agenda.loading) {
      console.log('⏳ [AutoOpen Checkin] Agenda ainda carregando... RETORNANDO');
      return;
    }

    // Procurar em appointments primeiro, depois em filteredAppointments
    const allAppointments = agenda.appointments || [];
    const filteredAppointments = agenda.filteredAppointments || [];

    console.log(
      '🔎 [AutoOpen Checkin] Procurando em',
      allAppointments.length,
      '+ ',
      filteredAppointments.length,
      'appointments',
    );

    let foundAppointment = allAppointments.find((apt) => apt.id === appointmentIdFromUrl);
    if (!foundAppointment) {
      foundAppointment = filteredAppointments.find((apt) => apt.id === appointmentIdFromUrl);
    }

    if (foundAppointment) {
      console.log('✅ [AutoOpen Checkin] Appointment encontrado!', {
        id: foundAppointment.id,
        patient: foundAppointment.patient_name,
        time: foundAppointment.scheduled_time,
      });

      // Pequeno delay para garantir que o componente está renderizado
      setTimeout(() => {
        handleOpenCheckin(foundAppointment);
        console.log('✅ [AutoOpen Checkin] Drawer aberto!');
      }, 200);
    } else {
      console.warn('⚠️ [AutoOpen Checkin] Appointment NÃO encontrado!', {
        appointmentIdFromUrl,
        sampleIds: allAppointments.map((a) => a.id).slice(0, 5),
        filteredSample: filteredAppointments.map((a) => a.id).slice(0, 5),
      });
    }
  }, [appointmentIdFromUrl, agenda.appointments, agenda.filteredAppointments, agenda.loading]);

  // 🔗 TERCEIRO: Abrir modal de edição quando vindo de Contas a Receber (mode=edit)
  useEffect(() => {
    console.log('🎬 [AutoOpen Edit Modal] useEffect EXECUTANDO');
    console.log('   modeParam:', modeParam);
    console.log('   appointmentIdFromUrl:', appointmentIdFromUrl);
    console.log('   appointmentDateFromStateOrUrl:', appointmentDateFromStateOrUrl);
    console.log('   agenda.date:', agenda.date);
    console.log('   agenda.loading:', agenda.loading);
    console.log('   agenda.appointments count:', agenda.appointments?.length);
    console.log('   agenda.selectedSlot:', agenda.selectedSlot ? 'JÁ SETADO' : 'null');

    // Se já tem algo selecionado, não tenta abrir novamente
    if (agenda.selectedSlot) {
      console.log('⏭️ [AutoOpen Edit Modal] Já há um slot selecionado, saindo');
      return;
    }

    if (modeParam === 'edit' && appointmentIdFromUrl) {
      console.log('✅ [AutoOpen Edit Modal] CONDIÇÕES ATENDIDAS: mode=edit + appointmentId');

      // CRÍTICO: Verificar se a data foi navegada corretamente
      if (appointmentDateFromStateOrUrl && agenda.date !== appointmentDateFromStateOrUrl) {
        console.log('⏳ [AutoOpen Edit Modal] Aguardando navegação para data correta...');
        console.log('   Esperada:', appointmentDateFromStateOrUrl);
        console.log('   Atual:', agenda.date);
        return; // Aguardar próxima execução
      }

      if (agenda.loading) {
        console.log('⏳ [AutoOpen Edit Modal] Aguardando carregamento dos dados...');
        return;
      }

      // Encontrar o appointment
      const allAppointments = agenda.appointments || [];
      console.log('🔍 Procurando appointment com ID:', appointmentIdFromUrl);
      console.log('   Total de appointments disponíveis:', allAppointments.length);

      if (allAppointments.length === 0) {
        console.log('⚠️ Nenhum appointment carregado ainda. Tentando novamente em 500ms...');
        const timer = setTimeout(() => {
          console.log('🔄 [Retry] Tentativa #2 - executando useEffect novamente via dependencies');
          // O useEffect será chamado novamente via dependências
        }, 500);
        return () => clearTimeout(timer);
      }

      const foundAppointment = allAppointments.find((apt) => apt.id === appointmentIdFromUrl);

      if (foundAppointment) {
        console.log('✅ [AutoOpen Edit Modal] Appointment ENCONTRADO:', foundAppointment.id);
        console.log('   paciente:', foundAppointment.patient_id);
        console.log('   payer:', foundAppointment.payer_id);

        agenda.selectSlot({
          type: 'existing',
          appointmentId: appointmentIdFromUrl,
          appointment: foundAppointment,
          mode: 'edit',
        });

        console.log('✅ selectSlot chamado. Modal deve abrir agora.');
      } else {
        console.warn(
          '⚠️ [AutoOpen Edit Modal] Appointment NÃO encontrado com ID:',
          appointmentIdFromUrl,
        );
        console.log('   IDs disponíveis:', allAppointments.map((a) => a.id).join(', '));
      }
    } else {
      if (modeParam !== 'edit') {
        console.log('⏭️ [AutoOpen Edit Modal] modeParam não é "edit":', modeParam);
      }
      if (!appointmentIdFromUrl) {
        console.log('⏭️ [AutoOpen Edit Modal] Sem appointmentIdFromUrl');
      }
    }
  }, [
    modeParam,
    appointmentIdFromUrl,
    appointmentDateFromStateOrUrl,
    agenda.date,
    agenda.loading,
    agenda.appointments,
    agenda.selectSlot,
  ]);

  const handleSlotClick = (slot) => {
    if (slot.type === 'new') {
      handleNewAppointment(slot);
    } else if (slot.type === 'bloquear') {
      handleBlockAppointment(slot);
    } else if (slot.type === 'encaixe') {
      handleNewAppointment(slot);
    } else if (slot.type === 'delete') {
      handleDeleteAppointment(slot.id);
    } else if (slot.type === 'start-attendance') {
      handleStartAttendance(slot.id);
    } else if (slot.type === 'edit') {
      agenda.selectSlot(slot);
    } else {
      agenda.selectSlot(slot);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    try {
      agenda.setLoading(true);

      // Validar permissões
      if (currentRole !== 'admin') {
        throw new Error('Apenas administradores podem deletar agendamentos');
      }

      console.log('🗑️ Deletando agendamento:', appointmentId);

      const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);

      if (error) {
        console.error('❌ Erro do Supabase:', error);
        throw new Error(`Erro ao deletar: ${error.message}`);
      }

      console.log('✅ Agendamento deletado com sucesso');

      // Recarregar agenda
      await loadAgendaData();
    } catch (err) {
      console.error('❌ Erro ao deletar agendamento:', err);
      agenda.setError(err.message || 'Erro ao deletar agendamento. Tente novamente.');
    } finally {
      agenda.setLoading(false);
    }
  };

  const handleStartAttendance = async (appointmentId) => {
    try {
      agenda.setLoading(true);
      console.log('👨‍⚕️ Iniciando atendimento:', appointmentId);

      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'em_atendimento',
          em_atendimento_em: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (error) {
        console.error('❌ Erro ao iniciar atendimento:', error);
        throw new Error(`Erro ao iniciar: ${error.message}`);
      }

      console.log('✅ Atendimento iniciado com sucesso');

      // Recarregar agenda
      await loadAgendaData();
    } catch (err) {
      console.error('❌ Erro ao iniciar atendimento:', err);
      agenda.setError(err.message || 'Erro ao iniciar atendimento. Tente novamente.');
    } finally {
      agenda.setLoading(false);
    }
  };

  const handleSaveAppointment = async (formData) => {
    try {
      agenda.setLoading(true);
      agenda.setError(null);

      console.log('📝 Salvando agendamento com status:', formData.status);

      // Validar permissões
      if (currentRole === 'recepcao' && formData.value !== undefined && formData.value !== null) {
        throw new Error('Recepção não tem permissão para editar valor do agendamento');
      }

      if (currentRole === 'profissional' && !agenda.selectedSlot?.id) {
        throw new Error('Profissional não pode criar novo agendamento');
      }

      // Validações obrigatórias SEMPRE
      if (!formData.date) {
        throw new Error('Data é obrigatória');
      }
      if (!formData.time) {
        throw new Error('Horário é obrigatório');
      }
      if (!formData.professional_id) {
        throw new Error('Profissional é obrigatório');
      }
      if (!formData.room_id) {
        throw new Error('Sala é obrigatória');
      }
      if (!formData.service_id) {
        throw new Error('Serviço é obrigatório');
      }
      // payer_id é opcional - pode ser particular

      // Validações específicas por tipo de agendamento
      const isQuickBooking = formData.patient_type === 'PRE_PATIENT';

      if (isQuickBooking) {
        // Agendamento rápido: nome e celular obrigatórios
        if (!formData.lead_name) {
          throw new Error('Nome é obrigatório');
        }
        if (!formData.lead_mobile) {
          throw new Error('Celular é obrigatório');
        }
      } else {
        // Agendamento normal: paciente obrigatório
        if (!formData.patient_id) {
          throw new Error('Paciente é obrigatório');
        }
      }

      // ETAPA 5.1: Validar agendamento usando API de integração
      const validation = await validateAppointmentScheduling({
        clinicId,
        serviceId: formData.service_id,
        professionalId: formData.professional_id,
        roomId: formData.room_id,
        startTime: formData.time,
        date: formData.date,
        patientId: formData.patient_id,
      });

      // Se houver erros críticos, bloquear agendamento
      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'));
      }

      // Se houver avisos, exibir mas permitir continuar
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Avisos de agendamento:', validation.warnings);
        // Opcionalmente pode mostrar toast de aviso aqui
      }

      // ETAPA 5.1: Calcular dados automáticos (end_time, duration)
      const appointmentCalculations = await calculateAppointmentData({
        clinicId,
        serviceId: formData.service_id,
        professionalId: formData.professional_id,
        startTime: formData.time,
        date: formData.date,
      });

      // Preparar dados para API (com valores calculados)
      let endTimeFormatted = null;
      if (appointmentCalculations.endTime) {
        // Se for Date, extrair apenas HH:MM:SS
        if (appointmentCalculations.endTime instanceof Date) {
          const hours = String(appointmentCalculations.endTime.getHours()).padStart(2, '0');
          const minutes = String(appointmentCalculations.endTime.getMinutes()).padStart(2, '0');
          const seconds = String(appointmentCalculations.endTime.getSeconds()).padStart(2, '0');
          endTimeFormatted = `${hours}:${minutes}:${seconds}`;
        }
        // Se for string com ISO (contém T), extrair apenas a parte de tempo
        else if (
          typeof appointmentCalculations.endTime === 'string' &&
          appointmentCalculations.endTime.includes('T')
        ) {
          endTimeFormatted =
            appointmentCalculations.endTime.split('T')[1]?.substring(0, 8) ||
            appointmentCalculations.endTime;
        }
        // Se for HH:MM ou HH:MM:SS, usar como está
        else {
          endTimeFormatted = appointmentCalculations.endTime;
        }
      }

      const appointmentData = {
        clinic_id: clinicId,
        patient_id: formData.patient_id || null,
        patient_type: formData.patient_type || 'PATIENT',
        lead_name: formData.lead_name || null,
        lead_phone: formData.lead_phone || null,
        lead_mobile: formData.lead_mobile || null,
        professional_id: formData.professional_id || null,
        room_id: formData.room_id || null,
        service_id: formData.service_id || null,
        payer_id: formData.payer_id || null,
        scheduled_date: formData.date,
        scheduled_time: formData.time,
        end_time: endTimeFormatted || formData.time,
        duration: appointmentCalculations.duration || 60,
        status: formData.status || 'a_confirmar',
        notes: formData.notes || null,
        value: formData.value || null,
        agenda_rule_id: validation.rule?.id || null,
      };

      console.log('✅ appointmentData preparado com status:', appointmentData.status);

      let result;

      if (agenda.selectedSlot?.id && agenda.selectedSlot?.id.toString().startsWith('temp-')) {
        // CRIAR novo
        result = await createAppointment(appointmentData);
        agenda.addAppointmentLocal(result);
      } else if (agenda.selectedSlot?.id) {
        // EDITAR existente
        result = await updateAppointment(agenda.selectedSlot.id, appointmentData);
        agenda.updateAppointmentLocal(result.id, result);
      } else {
        // CRIAR novo
        result = await createAppointment(appointmentData);
        agenda.addAppointmentLocal(result);
      }

      // 📋 SINCRONIZAR MÚLTIPLOS SERVIÇOS (se houver)
      if (result?.id && formData.appointmentServices && formData.appointmentServices.length > 0) {
        try {
          console.log(
            '📋 [Sincronizando serviços]',
            formData.appointmentServices.length,
            'serviço(s)',
          );
          await syncAppointmentServices(result.id, formData.appointmentServices);
          console.log('✅ Serviços sincronizados com sucesso!');
        } catch (servicesErr) {
          console.error('❌ Erro ao sincronizar serviços:', servicesErr);
          // Não bloquear o salvamento se os serviços falharem
          console.warn('⚠️ Agendamento salvo, mas houve erro ao sincronizar os serviços');
        }
      }

      // Recarregar data para sincronizar com banco
      console.log('🔄 Recarregando agenda após salvar...', result);

      // Se a data foi alterada, navegar para a nova data
      const oldDate = agenda.selectedSlot?.scheduled_date || agenda.selectedSlot?.date;
      const newDate = formData.date;

      console.log('🔍 DEBUG - Comparação de datas:');
      console.log('   oldDate (agenda.selectedSlot):', oldDate, typeof oldDate);
      console.log('   newDate (formData):', newDate, typeof newDate);
      console.log('   Comparação oldDate !== newDate:', oldDate !== newDate);

      if (oldDate && newDate) {
        // Normalizar datas para comparação (remover espaços e timezone)
        const oldDateNorm = String(oldDate).split(' ')[0].trim();
        const newDateNorm = String(newDate).split(' ')[0].trim();

        console.log('   oldDateNorm:', oldDateNorm);
        console.log('   newDateNorm:', newDateNorm);
        console.log('   oldDateNorm !== newDateNorm:', oldDateNorm !== newDateNorm);

        if (oldDateNorm !== newDateNorm) {
          console.log(`📅 ✅ Data MUDOU: ${oldDateNorm} → ${newDateNorm}`);
          agenda.setDate(newDateNorm);
        } else {
          console.log(`📅 ℹ️ Mesma data: ${oldDateNorm}`);
        }
      }

      await loadAgendaData();

      console.log('✅ Agendamento salvo e agenda recarregada');
      agenda.deselectSlot();
    } catch (err) {
      console.error('❌ Erro ao salvar agendamento:', err);
      console.error('❌ Stack:', err.stack);
      agenda.setError(err.message || 'Erro ao salvar agendamento. Tente novamente.');
    } finally {
      agenda.setLoading(false);
    }
  };

  const handleCancelAppointment = async (id) => {
    try {
      // Validar permissões
      if (!currentRole || currentRole === 'recepcao') {
        throw new Error('Você não tem permissão para cancelar agendamentos');
      }

      agenda.setLoading(true);
      agenda.setError(null);

      // Atualizar status para cancelado
      const updated = await updateAppointment(id, {
        status: 'cancelado',
      });

      agenda.updateAppointmentLocal(id, updated);
      agenda.deselectSlot();

      // Recarregar para sincronizar
      await loadAgendaData();
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      agenda.setError(err.message || 'Erro ao cancelar agendamento. Tente novamente.');
    } finally {
      agenda.setLoading(false);
    }
  };

  const handleConfirmAppointment = async (id) => {
    try {
      // Qualquer um pode confirmar seus agendamentos
      agenda.setLoading(true);
      agenda.setError(null);

      // Atualizar status para confirmado
      const updated = await updateAppointment(id, {
        status: 'confirmado',
      });

      agenda.updateAppointmentLocal(id, updated);
      agenda.deselectSlot();

      // Recarregar para sincronizar
      await loadAgendaData();
    } catch (err) {
      console.error('Erro ao confirmar agendamento:', err);
      agenda.setError(err.message || 'Erro ao confirmar agendamento. Tente novamente.');
    } finally {
      agenda.setLoading(false);
    }
  };

  const handleFittingAppointment = async (formData) => {
    try {
      agenda.setLoading(true);
      agenda.setError(null);

      // Preparar dados para encaixe
      const appointmentData = {
        clinic_id: clinicId,
        patient_id: formData.patient_id,
        professional_id: formData.professional_id || null,
        room_id: formData.room_id || null,
        service_id: formData.service_id || null,
        payer_id: formData.payer_id || null,
        start_time: `${formData.date}T${formData.time}:00`,
        status: 'encaixe',
        notes: formData.notes || 'Encaixe criado',
        value: formData.value || null,
      };

      // Criar encaixe
      const result = await createAppointment(appointmentData);
      agenda.addAppointmentLocal(result);

      // Invalidar cache e recarregar
      // Recarregar para sincronizar
      await loadAgendaData();

      agenda.deselectSlot();
    } catch (err) {
      console.error('Erro ao criar encaixe:', err);
      agenda.setError(err.message || 'Erro ao criar encaixe. Tente novamente.');
    } finally {
      agenda.setLoading(false);
    }
  };

  /**
   * 🔒 Bloquear horário
   */
  const handleBlockAppointment = async (slot) => {
    // Confirmar bloqueio
    const confirm = window.confirm(`Tem certeza que deseja bloquear o horário ${slot.time}?`);
    if (!confirm) {
      return;
    }

    try {
      agenda.setLoading(true);
      agenda.setError(null);

      // Procurar paciente "BLOQUEIO" ou usar o primeiro paciente disponível
      let blockPatientId = null;

      // Tentar encontrar paciente especial "BLOQUEIO"
      if (agenda.metadata?.patients?.length > 0) {
        const blockPatient = agenda.metadata.patients.find(
          (p) => p.name?.toUpperCase?.() === 'BLOQUEIO' || p.id === 'bloqueio',
        );
        blockPatientId = blockPatient?.id || agenda.metadata.patients[0].id;
      }

      if (!blockPatientId) {
        throw new Error(
          'Nenhum paciente disponível para criar bloqueio. Crie um paciente "BLOQUEIO" no sistema.',
        );
      }

      // Preparar dados para bloqueio
      const appointmentData = {
        clinic_id: clinicId,
        patient_id: blockPatientId,
        professional_id: slot.groupId || null,
        room_id: slot.columnType === 'room' ? slot.groupId : null,
        service_id: null,
        payer_id: null,
        start_time: `${slot.date}T${slot.time}:00`,
        status: 'bloqueado',
        notes: 'Horário bloqueado',
        value: null,
      };

      // Criar bloqueio
      const result = await createAppointment(appointmentData);
      agenda.addAppointmentLocal(result);

      // Recarregar para sincronizar
      await loadAgendaData();
    } catch (err) {
      console.error('Erro ao bloquear horário:', err);
      agenda.setError(err.message || 'Erro ao bloquear horário. Tente novamente.');
    } finally {
      agenda.setLoading(false);
    }
  };

  // 📱 Função para disparar confirmações via WhatsApp
  const handleSendWhatsAppConfirmations = async () => {
    console.log('🔥 [AgendaPage] handleSendWhatsAppConfirmations foi chamada!');

    if (
      !window.confirm('Enviar confirmações de WhatsApp para pacientes com agendamentos de amanhã?')
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
      console.error('❌ Erro ao enviar confirmações:', error);
      setWhatsappError(error.message || 'Erro ao enviar confirmações');
    } finally {
      setWhatsappLoading(false);
    }
  };

  // 🏁 Effect para alerta de renderização (apenas uma vez)
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.testeAlertShown) {
      window.testeAlertShown = true;
      // alert('✅ AgendaPage renderizou com sucesso! Mode: ' + agendaMode);
    }
  }, [agendaMode]);

  // ✅ Permite renderizar mesmo carregando (dados virão via hooks)
  // não precisamos de guard aqui

  console.log('✅ [AgendaPage] CARREGADO COM SUCESSO');

  // 🔍 LOG FINAL ANTES DE RENDER
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║             🎯 [AgendaPage] RENDER - FINAL STATE             ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║ appointmentDateFromStateOrUrl:', appointmentDateFromStateOrUrl);
  console.log('║ agenda.date:', agenda?.date);
  console.log('║ agendaMode:', agendaMode);
  console.log('║ clinicId:', clinicId);
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // 🔒 Guard: Se ainda não tem clinicId E não está carregando, mostrar erro
  if (!clinicId && !loadingClinic && !authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">❌ Clínica não encontrada</p>
          <p className="text-sm text-gray-500">Contate o administrador</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 🔴 DEBUG BANNER - Mostrar role e mode */}
      <div className="w-full bg-red-200 border-b-4 border-red-600 px-4 py-3">
        <div className="flex gap-4 text-sm font-mono">
          <div>
            <strong>🔍 Debug:</strong> Role={currentRole} | Mode={agendaMode} | Prof=
            {isProfessional ? userProfessionalId || 'loading' : 'N/A'}
          </div>
          <div>
            | Auth Loading={authLoading} | Clinic Loading={loadingClinic}
          </div>
        </div>
      </div>
      {/* 🔥 TESTE: Botão em posição FIXA - TOP LEVEL */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          backgroundColor: '#dc2626',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <button
          onClick={handleSendWhatsAppConfirmations}
          disabled={whatsappLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            border: '2px solid white',
            borderRadius: '8px',
            cursor: whatsappLoading ? 'not-allowed' : 'pointer',
          }}
        >
          🔥 TESTE: {whatsappLoading ? 'Enviando...' : 'CLIQUE AQUI'}
        </button>
      </div>

      {/* 🎯 MODO PROFISSIONAL - LAYOUT COMPLETAMENTE DIFERENTE */}
      {agendaMode === 'profissional' ? (
        <div className="w-full py-6">
          {/* Header com nome do profissional */}
          <div className="w-full mx-auto px-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  👨‍⚕️ Meus Atendimentos
                </h1>
                {user && (
                  <p className="text-sm text-gray-600 mt-1">
                    👤 {user.user_metadata?.name || 'Profissional'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setAgendaMode('recepcao')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Voltar
              </button>
            </div>
          </div>

          {/* 🔍 Filtros do Modo Profissional (apenas Admin/Gestor) */}
          <div className="w-full mx-auto px-4">
            <AgendaProfessionalFilters
              agenda={agenda}
              isGestor={isGestor}
              canAccessGestorMode={canAccessGestorMode}
              isProfissional={isProfissional}
            />
          </div>

          {/* Renderizar APENAS a view do profissional - ZERO poluição */}
          <div className="w-full mx-auto">
            {!userProfessionalId && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900">Sem Profissional Associado</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Seu usuário não está associado a um profissional no sistema.
                    {canAccessGestorMode &&
                      ' Você pode voltar à visualização Geral para gerenciar todos os agendamentos.'}
                  </p>
                </div>
              </div>
            )}
            <AgendaProfessionalView
              appointments={professionalAppointments}
              metadata={agenda.metadata}
              onConfirmAppointment={handleConfirmAppointment}
              onCancelAppointment={handleCancelAppointment}
              onSlotClick={handleSlotClick}
              date={agenda.date}
              loading={agenda.loading}
              userRole={currentRole}
            />
          </div>
        </div>
      ) : (
        /* MODO RECEPÇÃO / GESTOR - LAYOUT COMPLETO */
        <div className="w-full mx-auto px-4 py-6">
          {/* 🟢 Banner da Agenda Única */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div className="flex-1">
              <h2 className="font-semibold text-blue-900">Agenda Única da Clínica</h2>
              <p className="text-sm text-blue-700">
                Escolha a visualização abaixo: Geral, Por Profissional ou Por Sala
              </p>
            </div>
            <div className="group relative inline-block">
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium cursor-help">
                ℹ️ URL: /clinica/agenda
              </span>
              <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 bg-gray-800 text-white text-xs px-3 py-2 rounded whitespace-nowrap z-50">
                A URL permanece /clinica/agenda ao trocar abas
                <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>

          {/* 🟢 Tabs de modo de visualização (sem mudar URL) */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Modo de Visualização:</h3>
            <AgendaTabs viewMode={agenda.viewMode} onViewModeChange={agenda.setViewMode} />
          </div>

          {/* 🔐 Toggle de Modo (Recepção / Profissional / Gestor) */}
          {currentRole !== 'recepcao' && (
            <div className="mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">Modo da Agenda:</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {agendaMode === 'recepcao'
                      ? '📞 Recepção - Visualização operacional simplificada'
                      : agendaMode === 'profissional'
                        ? '👨‍⚕️ Profissional - Apenas meus atendimentos'
                        : '📊 Gestor - Análises financeiras e ocupação'}
                  </p>
                </div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  {/* Botão Recepção */}
                  <button
                    onClick={() => setAgendaMode('recepcao')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      agendaMode === 'recepcao'
                        ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📞 Recepção
                  </button>

                  {/* Botão Profissional (qualquer um que não seja recepção) */}
                  {canAccessProfessionalMode && (
                    <button
                      onClick={() => setAgendaMode('profissional')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        agendaMode === 'profissional'
                          ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      👨‍⚕️ Profissional
                    </button>
                  )}

                  {/* Botão Gestor (apenas se tiver acesso) */}
                  {canAccessGestorMode && (
                    <button
                      onClick={() => setAgendaMode('gestor')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        agendaMode === 'gestor'
                          ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      📊 Gestor
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 📱 Botão para enviar confirmações via WhatsApp */}

          {/* Filtros inteligentes */}
          <AgendaFilters
            viewMode={agenda.viewMode}
            filters={agenda.filters}
            onFilterChange={agenda.updateFilter}
            onMultipleFilterChange={agenda.setMultipleFilters}
            onClearFilters={agenda.clearFilters}
            metadata={agenda.metadata}
            currentRole={currentRole}
          />

          {/* Mensagens de erro */}
          {agenda.error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              {agenda.error}
            </div>
          )}

          {/* 📊 Dashboard Agenda × Financeiro (apenas Modo Gestor) */}
          {agendaMode === 'gestor' && !agenda.loading && metrics && (
            <CollapsibleSection
              title="Gestão Financeira da Agenda"
              icon="💰"
              summary={`R$ ${metrics.totalReceita.toFixed(0)} · ${metrics.ocupacaoPercentual}% ocupação · ${metrics.statusAgenda.label}`}
              storageKey="agenda-financeiro-open"
              defaultOpen={false}
              className="mb-8"
            >
              <AgendaFinanceDashboard metrics={metrics} loading={agenda.loading} />
            </CollapsibleSection>
          )}

          {/* 💡 Sugestões de Encaixe Inteligente (apenas Modo Gestor) */}
          {agendaMode === 'gestor' && !agenda.loading && encaixeSuggestions.length > 0 && (
            <div className="mb-6">
              <EncaixeSuggestions
                suggestions={encaixeSuggestions}
                onSelect={(sugestao) => {
                  // Ao selecionar sugestão, atualizar filtros e abrir modal
                  agenda.setMultipleFilters({
                    professional: sugestao.profissional.id,
                    room: sugestao.sala.id,
                    searchText: sugestao.horario,
                  });

                  // Selecionar o slot sugerido
                  handleNewAppointment({
                    time: sugestao.horario,
                    professional_id: sugestao.profissional.id,
                    room_id: sugestao.sala.id,
                  });
                }}
              />
            </div>
          )}

          {/* 🔥 Heatmap de Ocupação (apenas Modo Gestor) */}
          {agendaMode === 'gestor' && !agenda.loading && (
            <CollapsibleSection
              title="Heatmap de Ocupação"
              icon="🔥"
              summary={`Ocupação média ${Math.round(((agenda.filteredAppointments?.length || 0) / Math.max(1, (agenda.metadata.professionals?.length || 1) * 10)) * 100)}%`}
              storageKey="agenda-heatmap-open"
              defaultOpen={false}
              className="mb-8"
            >
              <AgendaHeatmap
                timeSlots={Array.from({ length: 20 }, (_, i) => {
                  const hour = Math.floor(8 + i / 2);
                  const minute = (i % 2) * 30;
                  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                })}
                appointments={agenda.filteredAppointments}
                viewMode={agenda.viewMode}
                columnCount={
                  agenda.viewMode === 'profissional'
                    ? agenda.metadata.professionals?.length || 1
                    : agenda.viewMode === 'sala'
                      ? agenda.metadata.rooms?.length || 1
                      : 1
                }
                onTimeSlotClick={(time) => {
                  // Filtro automático por horário
                  agenda.updateFilter('searchText', `${time}`);

                  // Scroll para o horário na timeline
                  setTimeout(() => {
                    const timelineElement = document.querySelector(
                      '[data-timeline-time="' + time + '"]',
                    );
                    if (timelineElement) {
                      timelineElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }, 100);
                }}
                professionals={agenda.metadata.professionals || []}
                rooms={agenda.metadata.rooms || []}
              />
            </CollapsibleSection>
          )}

          {/* Indicadores da Agenda - Abaixo do Heatmap (apenas Modo Gestor) */}
          {clinicId && agendaMode === 'gestor' && !agenda.loading && (
            <CollapsibleSection
              title="Indicadores da Agenda"
              icon="📊"
              summary="Status geral, ocupação e métricas financeiras"
              storageKey="agenda-indicators-open"
              defaultOpen={true}
              className="mb-8"
            >
              <AgendaIndicators
                clinicId={clinicId}
                date={agenda.date}
                professionalId={isProfissional ? user?.id : undefined}
                currentRole={currentRole}
                onAlertsChange={(alerts) => {
                  if (alerts.length > 0) {
                    console.log('🚨 Alertas gerados:', alerts);
                  }
                }}
              />
            </CollapsibleSection>
          )}

          {/* Timeline / Grade de horários (Recepção e Gestor) */}
          {agenda.loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <AgendaTimeline
              viewMode={agenda.viewMode}
              date={agenda.date}
              appointments={agenda.filteredAppointments}
              onSlotClick={handleSlotClick}
              onCheckin={handleOpenAtendimento}
              metadata={agenda.metadata}
              userRole={currentRole}
              slotDuration={30}
              filteredProfessionalId={agenda.filters.professional}
            />
          )}
        </div>
      )}

      {/* Modal de agendamento */}
      <AppointmentModal
        isOpen={!!agenda.selectedSlot}
        onClose={() => {
          console.log('🔒 Modal fechado intencionalmente - marcando hasModalBeenClosed como true');
          hasModalBeenClosed.current = true;
          agenda.deselectSlot();
        }}
        mode={agenda.selectedSlot?.id ? 'edit' : 'new'}
        appointment={agenda.selectedSlot?.id ? agenda.selectedSlot : null}
        appointmentIdToEdit={agenda.selectedSlot?.id}
        professionals={agenda.metadata.professionals || []}
        services={agenda.metadata.services || []}
        payers={agenda.metadata.payers || []}
        rooms={agenda.metadata.rooms || []}
        onSuccess={handleAppointmentSuccess}
      />

      {/* 📋 Drawer de Check-in */}
      <CheckinDrawer
        isOpen={checkinOpen}
        appointment={checkinAppointment}
        onClose={handleCloseCheckin}
        onStatusChange={handleCloseCheckin}
      />

      {/* 📋 AtendimentoModal - TISS Compliant Check-in (from Agenda) */}
      <AtendimentoModal
        isOpen={atendimentoModalOpen}
        onClose={handleCloseAtendimento}
        appointment={atendimentoModalAppointment}
        arrivals={[]}
        onArrivalsUpdate={handleCloseAtendimento}
      />
    </div>
  );
}
