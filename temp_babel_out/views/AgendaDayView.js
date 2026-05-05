import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Eye, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import ModalCriarAgendamento from '../components/ModalCriarAgendamento';
import AtendimentoModal from '../components/AtendimentoModal';
import StatusBadge from '../components/StatusBadge';
import { getStatusStyle } from '@/utils/helpers/getStatusStyle';
import { checkMultipleDates } from '@/lib/holidaysApi';
import { getStatusConfig, STATUS_CONFIG, BOOKING_STATUSES, SERVICE_STATUSES, FINANCIAL_STATUSES, migrateStatus, canTransitionTo } from '@/lib/appointmentStatusConstants';
import { getClinicTimeSlots, getProfessionalAvailableSlots, getAvailableProfessionalsForDay } from '@/lib/agendaUtils';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * AgendaDayView - Visualização diária da agenda
 * 
 * Layout: Lista vertical por horário
 * Colunas (ordem fixa): HORÁRIO | PACIENTE | SERVIÇO | PROFISSIONAL | SALA | STATUS
 * 
 * Props:
 * - appointments: array - agendamentos do dia
 * - onBookSlot: (slot) => void - agendar novo
 * - onEditAppointment: (id) => void - editar agendamento
 * - onViewDetails: (id) => void - ver detalhes
 * - date: string - data atual (YYYY-MM-DD)
 */

// ✅ CONFIGURAÇÃO CENTRALIZADA DE COLUNAS
const GRID_COLUMNS = {
  horario: 1,
  paciente: 2,
  // ✅ Reduzido de 3 para melhor uso de espaço
  contato: 2,
  // ✅ Telefone completo
  servico: 1,
  convenio: 2,
  // ✅ Convênio completo
  profissional: 2,
  // ✅ Aumentado de 1 para melhor visibilidade
  status: 2 // ✅ Status legível
  // Total = 12 para grid-cols-12 (SALA removida)
};
const GRID_TOTAL = Object.values(GRID_COLUMNS).reduce((a, b) => a + b, 0);

// ✅ FUNÇÃO HELPER PARA EXTRAIR PRIMEIRO E ÚLTIMO NOME
const getFirstAndLastName = fullName => {
  if (!fullName) return 'Paciente';
  const names = fullName.trim().split(' ').filter(n => n.length > 0);
  if (names.length === 1) return names[0];
  return `${names[0]} ${names[names.length - 1]}`;
};

// ✅ FUNÇÃO HELPER PARA GERAR CLASSES DO GRID
const getColSpanClass = colName => `col-span-${GRID_COLUMNS[colName] || 1}`;
const getAppointmentActionConfig = (apt, currentRole) => {
  if (!apt?.id) return null;
  const normalizedStatus = migrateStatus(apt?.status);
  const isClinicalFlow = [SERVICE_STATUSES.AWAITING_PROFESSIONAL, SERVICE_STATUSES.IN_SERVICE, SERVICE_STATUSES.ATTENDED].includes(normalizedStatus);
  if (isClinicalFlow) {
    if (normalizedStatus === SERVICE_STATUSES.AWAITING_PROFESSIONAL) {
      return {
        label: 'Prontuario',
        title: 'Abrir prontuario do paciente'
      };
    }
    return {
      label: 'Atender',
      title: 'Abrir atendimento do paciente'
    };
  }
  if (currentRole === 'recepcao') {
    return {
      label: 'Check-in',
      title: 'Abrir fluxo de atendimento e financeiro'
    };
  }
  if (apt?.patient_id) {
    return {
      label: 'Atender',
      title: 'Abrir dados do paciente e atendimento'
    };
  }
  return null;
};

// ✅ RENDERIZADOR DE HEADERS (reutilizável)
const renderGridHeader = () => /*#__PURE__*/React.createElement("div", {
  className: "border-b border-gray-200 bg-white flex-shrink-0 sticky top-0 z-10 w-full",
  style: {
    background: '#e7f3ff'
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "grid grid-cols-12 gap-0 h-12 w-full"
}, /*#__PURE__*/React.createElement("div", {
  className: `${getColSpanClass('horario')} px-3 py-3 text-sm text-gray-700 uppercase select-none font-bold flex items-center justify-center border-r border-gray-200 w-full`,
  style: {
    color: '#0052cc',
    fontSize: '13px',
    fontWeight: 700
  }
}, "Hor\xE1rio"), /*#__PURE__*/React.createElement("div", {
  className: `${getColSpanClass('paciente')} px-3 py-3 text-sm text-gray-700 uppercase select-none font-bold flex items-center justify-center border-r border-gray-200 w-full`,
  style: {
    color: '#0052cc',
    fontSize: '13px',
    fontWeight: 700
  }
}, "Paciente"), /*#__PURE__*/React.createElement("div", {
  className: `${getColSpanClass('contato')} px-3 py-3 text-sm text-gray-700 uppercase select-none font-bold flex items-center justify-center border-r border-gray-200 w-full`,
  style: {
    color: '#0052cc',
    fontSize: '13px',
    fontWeight: 700
  }
}, "Contato"), /*#__PURE__*/React.createElement("div", {
  className: `${getColSpanClass('servico')} px-3 py-3 text-sm text-gray-700 uppercase select-none font-bold flex items-center justify-center border-r border-gray-200 w-full`,
  style: {
    color: '#0052cc',
    fontSize: '13px',
    fontWeight: 700
  }
}, "Servi\xE7o"), /*#__PURE__*/React.createElement("div", {
  className: `${getColSpanClass('convenio')} px-3 py-3 text-sm text-gray-700 uppercase select-none font-bold flex items-center justify-center border-r border-gray-200 w-full`,
  style: {
    color: '#0052cc',
    fontSize: '13px',
    fontWeight: 700
  }
}, "Conv\xEAnio"), /*#__PURE__*/React.createElement("div", {
  className: `${getColSpanClass('profissional')} px-3 py-3 text-sm text-gray-700 uppercase select-none font-bold flex items-center justify-center border-r border-gray-200 w-full`,
  style: {
    color: '#0052cc',
    fontSize: '13px',
    fontWeight: 700
  }
}, "Profissional"), /*#__PURE__*/React.createElement("div", {
  className: `${getColSpanClass('status')} px-3 py-3 text-sm text-gray-700 uppercase select-none font-bold flex items-center justify-center border-r border-gray-200 w-full`,
  style: {
    color: '#0052cc',
    fontSize: '13px',
    fontWeight: 700
  }
}, "Status")));

// ✅ RENDERIZADOR DE SLOT VAZIO (disponível)
const renderEmptySlot = (time, isCurrentTime, isHolidayBlocked, isOptionalHoliday, onBookSlot, apt) => /*#__PURE__*/React.createElement("div", {
  className: "grid grid-cols-12 gap-0 h-14 items-center w-full border-b border-gray-100",
  style: {
    background: '#f8f9fa'
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "col-span-1 px-3 text-sm font-semibold border-r border-gray-200 flex items-center justify-center",
  style: {
    color: '#0052cc',
    fontSize: '12px',
    fontWeight: 600,
    background: '#f8f9fa'
  }
}, time, isCurrentTime && /*#__PURE__*/React.createElement("span", {
  className: "inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse ml-1"
})), /*#__PURE__*/React.createElement("div", {
  className: "col-span-2 px-3 border-r border-gray-200 flex flex-col items-center justify-center w-full gap-1"
}, /*#__PURE__*/React.createElement("span", {
  className: `h-3 w-3 rounded-full shadow-sm ${isHolidayBlocked ? 'bg-gray-400' : isOptionalHoliday ? 'bg-blue-500' : 'bg-green-500'}`
}), /*#__PURE__*/React.createElement("button", {
  onClick: e => {
    if (!isHolidayBlocked) {
      e.stopPropagation();
      onBookSlot(apt);
    }
  },
  className: `opacity-0 group-hover:opacity-100 transition-opacity text-lg ${isHolidayBlocked ? 'text-gray-400 cursor-not-allowed' : isOptionalHoliday ? 'text-blue-600 hover:text-blue-700 hover:scale-110' : 'text-green-600 hover:text-green-700 hover:scale-110'}`,
  title: isHolidayBlocked ? 'Agenda bloqueada - Feriado' : isOptionalHoliday ? 'Agendar em feriado facultativo' : 'Novo agendamento',
  disabled: isHolidayBlocked
}, isHolidayBlocked ? '🔒' : '➕')), /*#__PURE__*/React.createElement("div", {
  className: "col-span-2 px-3 border-r border-gray-200 flex items-center justify-center w-full"
}), /*#__PURE__*/React.createElement("div", {
  className: "col-span-1 px-3 border-r border-gray-200 flex items-center justify-center w-full"
}), /*#__PURE__*/React.createElement("div", {
  className: "col-span-2 px-3 border-r border-gray-200 flex items-center justify-center w-full"
}), /*#__PURE__*/React.createElement("div", {
  className: "col-span-2 px-3 border-r border-gray-200 flex items-center justify-center w-full"
}), /*#__PURE__*/React.createElement("div", {
  className: "col-span-2 px-3 border-r border-gray-200 flex items-center justify-center w-full"
}, /*#__PURE__*/React.createElement("span", {
  className: "w-3 h-3 rounded-full",
  style: {
    background: '#10b981'
  }
})));

// ✅ RENDERIZADOR DE SLOT OCUPADO (com dados)
const renderOccupiedSlot = (apt, time, isCurrentTime, late, statusLabel, getStatusBgColor, isHovered, onEditAppointment, handleContextMenu, handleOpenAtendimento, currentRole) => {
  const statusStyle = getStatusStyle(statusLabel) || {
    background: '#fef3c7',
    color: '#854D0E'
  };
  const statusBgColor = statusStyle.background || '#fef3c7';
  const actionConfig = getAppointmentActionConfig(apt, currentRole);
  console.log('🎨 [renderOccupiedSlot] Status:', statusLabel, '| Background:', statusBgColor, '| Full:', statusStyle);
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-12 gap-0 h-14 items-center w-full border-b border-gray-100",
    style: {
      background: statusBgColor
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-1 px-3 text-sm font-semibold border-r border-gray-200 flex items-center justify-center",
    style: {
      color: '#0052cc',
      fontSize: '12px',
      fontWeight: 600,
      background: statusBgColor
    }
  }, time, isCurrentTime && /*#__PURE__*/React.createElement("span", {
    className: "inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse ml-1"
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 px-3 border-r border-gray-200 flex items-center justify-center min-w-0 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold group-hover:font-black transition-all truncate text-center cursor-pointer hover:underline",
    style: {
      color: statusStyle.color
    },
    title: apt.patient_name || apt.paciente || apt.patient || '—'
  }, getFirstAndLastName(apt.patient_name || apt.paciente || apt.patient || '—'))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 px-3 border-r border-gray-200 flex items-center justify-center min-w-0 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-600 group-hover:text-gray-700 transition-colors truncate",
    style: {
      fontSize: '11px'
    }
  }, apt.patient_phone || apt.telefone || apt.phone || apt.patient_mobile || apt.celular || apt.mobile || '—')), /*#__PURE__*/React.createElement("div", {
    className: "col-span-1 px-3 border-r border-gray-200 flex items-center justify-center min-w-0 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-600 group-hover:text-gray-700 transition-colors truncate",
    style: {
      fontSize: '11px'
    }
  }, apt.service_name || apt.serviço || apt.service || '—')), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 px-3 border-r border-gray-200 flex items-center justify-center min-w-0 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-600 group-hover:text-gray-700 transition-colors truncate",
    style: {
      fontSize: '11px'
    }
  }, apt.payer_name || apt.convênio || apt.healthplan || apt.plano || 'Particular')), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 px-3 border-r border-gray-200 flex items-center justify-center min-w-0 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-600 group-hover:text-gray-700 transition-colors truncate text-center",
    style: {
      fontSize: '11px'
    }
  }, apt.professional_name || apt.profissional || apt.professional || '—')), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 px-3 border-r border-gray-200 flex items-center justify-center gap-2 w-full"
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: statusLabel,
    size: "md"
  }), actionConfig && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      handleOpenAtendimento(apt);
    },
    className: "inline-flex items-center rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700",
    title: actionConfig.title
  }, actionConfig.label)));
};
export default function AgendaDayView({
  appointments = [],
  onBookSlot = () => {},
  onEditAppointment = () => {},
  onViewDetails = () => {},
  date = new Date().toISOString().split('T')[0],
  filteredProfessionalId = null,
  // 🆕 ID do profissional filtrado (se houver)
  userRole = null,
  // 🆕 Role do usuário logado
  userProfessionalId = null,
  // 🆕 ID do profissional atual (para RBAC)
  professionals = [],
  // 🆕 Lista de profissionais
  services = [],
  // 🆕 Lista de serviços
  payers = [] // 🆕 Lista de convênios
}) {
  console.log('🎬 [AgendaDayView] RENDERIZANDO com appointments:', {
    count: appointments.length,
    data: appointments
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredRow, setHoveredRow] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [holiday, setHoliday] = useState(null);
  const [overrideHoliday, setOverrideHoliday] = useState(false);

  // 📋 Estado para AtendimentoModal (TISS)
  const [atendimentoModalOpen, setAtendimentoModalOpen] = useState(false);
  const [atendimentoModalAppointment, setAtendimentoModalAppointment] = useState(null);

  // 🆕 Estado LOCAL para appointments - isso vai ser atualizado via Realtime
  const [localAppointments, setLocalAppointments] = useState([]);

  // 🆕 Quando appointments prop muda, atualizar state local
  useEffect(() => {
    console.log('📥 [AgendaDayView] Appointments prop recebidas:', appointments?.length);
    setLocalAppointments(appointments || []);
  }, [appointments]);

  // 🆕 Estado para disponibilidade de profissionais
  const [professionalAvailability, setProfessionalAvailability] = useState({}); // { professionalId: [horários] }
  const [professionalsMap, setProfessionalsMap] = useState({}); // 🆕 { profId: { id, name } }
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();
  const clinic = useClinicContext();
  const {
    currentRole
  } = useAuth();

  // Calcular estados de feriado
  const isHolidayDay = holiday && holiday.id;
  const isBlockedHoliday = holiday?.is_blocked === true && holiday?.is_mandatory !== false;
  const isOptionalHoliday = holiday?.is_mandatory === false;
  const isHolidayBlocked = isBlockedHoliday && !overrideHoliday;
  const isAdmin = currentRole === 'admin' || currentRole === 'gestor' || currentRole === 'administrator';

  // Atualizar hora atual a cada minuto
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fechar menu de contexto ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Scroll automático para horário atual
  useEffect(() => {
    const scrollToCurrentTime = () => {
      const currentHour = new Date().getHours();
      const currentTimeElement = document.getElementById(`hour-${currentHour}`);
      if (currentTimeElement && scrollContainerRef.current) {
        currentTimeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    };
    const timer = setTimeout(scrollToCurrentTime, 100);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Carregar informações de feriado para o dia
  useEffect(() => {
    const loadHolidayInfo = async () => {
      if (!date) return;
      try {
        const clinicId = clinic?.id || null;
        const result = await checkMultipleDates([date], clinicId);
        if (result[date]) {
          setHoliday(result[date]);
          console.log(`🎉 [AgendaDayView] Feriado encontrado em ${date}:`, result[date]);
        } else {
          setHoliday(null);
        }
      } catch (error) {
        console.error('❌ [AgendaDayView] Erro ao carregar feriado:', error);
        setHoliday(null);
      }
    };
    loadHolidayInfo();
  }, [date, clinic?.id]);
  const getAvailableProfessionalsForTime = time => {
    const availableProfs = [];

    // Procurar por profissionais que têm este horário disponível
    Object.entries(professionalAvailability).forEach(([profId, slots]) => {
      if (Array.isArray(slots) && slots.includes(time)) {
        // Usar o mapa para obter o nome
        const profName = professionalsMap[profId]?.name || profId;
        availableProfs.push({
          id: profId,
          name: profName
        });
      }
    });
    return availableProfs;
  };

  // 🆕 Carregar disponibilidade dos profissionais para o dia
  useEffect(() => {
    const loadProfessionalAvailability = async () => {
      if (!date) {
        setProfessionalAvailability({});
        return;
      }
      try {
        let availability = {};
        if (filteredProfessionalId) {
          // Se há profissional filtrado, carregar apenas aquele
          console.log('🔍 [AgendaDayView] Carregando disponibilidade do profissional filtrado:', filteredProfessionalId);
          const slots = await getProfessionalAvailableSlots(filteredProfessionalId, date);
          availability[filteredProfessionalId] = slots;
        } else {
          // ✅ NOVO: Buscar TODOS os profissionais disponíveis para o dia
          // 🔒 Se é profissional logado, usar apenas ele
          const profIdToUse = userRole?.toLowerCase?.() === 'profissional' ? userProfessionalId : null;
          console.log('🔍 [AgendaDayView] Buscando profissionais disponíveis para:', date, 'userProf:', profIdToUse);
          const availableProfessionals = await getAvailableProfessionalsForDay(date, null, profIdToUse);

          // Converter para formato { profId: slots }
          availableProfessionals.forEach(prof => {
            availability[prof.id] = prof.available_slots;
          });
          console.log('✅ [AgendaDayView] Profissionais disponíveis carregados:', availableProfessionals);
        }
        setProfessionalAvailability(availability);
        console.log('✅ [AgendaDayView] Disponibilidade carregada:', availability);
      } catch (error) {
        console.error('❌ [AgendaDayView] Erro ao carregar disponibilidade:', error);
        setProfessionalAvailability({});
      }
    };
    loadProfessionalAvailability();
  }, [date, filteredProfessionalId, userRole, userProfessionalId]);

  // 🆕 Carregar dados dos profissionais (nomes) do banco
  useEffect(() => {
    const loadProfessionalsData = async () => {
      try {
        // Obter todos os IDs de profissionais que tem disponibilidade neste dia
        const profIds = Object.keys(professionalAvailability);
        if (profIds.length === 0) return;

        // Buscar dados dos profissionais do banco
        const {
          data: profs,
          error
        } = await supabase.from('professionals').select('id, name').in('id', profIds);
        if (error) {
          console.error('❌ Erro ao carregar profissionais:', error);
          return;
        }

        // Montar mapa { profId: { id, name } }
        const map = {};
        profs.forEach(prof => {
          map[prof.id] = {
            id: prof.id,
            name: prof.name
          };
        });
        setProfessionalsMap(map);
        console.log('✅ Profissionais carregados:', map);
      } catch (error) {
        console.error('❌ Erro ao carregar dados dos profissionais:', error);
      }
    };
    loadProfessionalsData();
  }, [professionalAvailability]);

  // ✅ Gerar slots de horário baseado nas configurações da clínica
  const timeSlots = useMemo(() => {
    return getClinicTimeSlots(clinic);
  }, [clinic]);

  // Agrupar por horário e ordenar
  const groupedByTime = useMemo(() => {
    const groups = {};
    localAppointments.forEach(apt => {
      // CORRIGIDO: Adicionar 'scheduled_time' ao fallback
      const time = apt.horário || apt.time || apt.start_time || apt.scheduled_time || timeSlots[0] || '08:00';
      // Normalizar para HH:MM (remover :SS se houver)
      const normalizedTime = typeof time === 'string' ? time.substring(0, 5) : '08:00';
      if (!groups[normalizedTime]) groups[normalizedTime] = [];
      groups[normalizedTime].push(apt);
    });
    return groups;
  }, [localAppointments, timeSlots]);
  const sortedTimes = useMemo(() => {
    // ✅ Usar timeSlots configurados da clínica, preenchendo com dados existentes
    return timeSlots.map(slot => slot);
  }, [timeSlots]);

  /**
   * 🆕 Gera as linhas a renderizar
   * - Se há filtro de profissional: uma linha por hora
   * - Se não há filtro: uma linha por (hora + profissional)
   */
  const renderLinesToShow = useMemo(() => {
    if (filteredProfessionalId) {
      // Com filtro: usar a abordagem usual - uma linha por hora
      return sortedTimes.map(time => ({
        key: time,
        time,
        professionalId: filteredProfessionalId,
        type: 'single-prof'
      }));
    } else {
      // SEM filtro: uma linha por (hora + profissional disponível)
      const lines = [];
      sortedTimes.forEach(time => {
        // Encontrar profissionais disponíveis neste horário (inline)
        const availableProfs = [];
        Object.entries(professionalAvailability).forEach(([profId, slots]) => {
          if (Array.isArray(slots) && slots.includes(time)) {
            const profName = professionalsMap[profId]?.name || profId;
            availableProfs.push({
              id: profId,
              name: profName
            });
          }
        });

        // Se há profissionais disponíveis, renderizar uma linha por profissional
        if (availableProfs.length > 0) {
          availableProfs.forEach(prof => {
            lines.push({
              key: `${time}__${prof.id}`,
              time,
              professionalId: prof.id,
              professionalName: prof.name,
              type: 'multi-prof'
            });
          });
        } else {
          // Se não há profissionais disponíveis, renderizar uma linha genérica
          lines.push({
            key: `${time}__none`,
            time,
            professionalId: null,
            type: 'multi-prof'
          });
        }
      });
      return lines;
    }
  }, [sortedTimes, filteredProfessionalId, professionalAvailability, professionalsMap]);
  const currentTimeStr = format(currentTime, 'HH:mm');

  // Verificar se agendamento está atrasado
  const isLate = apt => {
    const aptTime = apt.horário || apt.time || apt.start_time || apt.scheduled_time || '00:00';
    return apt.status === 'falta' || apt.status === 'confirmado' && aptTime < currentTimeStr && (apt.paciente || apt.patient_name);
  };

  // ✅ Usar STATUS_CONFIG do sistema centralizado
  const getStatusBgColor = status => {
    const config = STATUS_CONFIG[status];
    return config?.badgeColor || 'bg-gray-500';
  };
  const getStatusLabelText = status => {
    const config = STATUS_CONFIG[status];
    return config?.label || 'Desconhecido';
  };

  /**
   * Normaliza dados do appointment para garantir que todos os campos estão preenchidos
   */
  const normalizeAppointment = apt => {
    if (!apt) return null;
    // Extrair horário, removendo :SS se necessário
    let horarioExtraido = apt.horário || apt.time || apt.start_time || apt.scheduled_time || '—';
    if (typeof horarioExtraido === 'string' && horarioExtraido.length > 5) {
      horarioExtraido = horarioExtraido.substring(0, 5); // HH:MM
    }

    // Mapear status antigos para novos (backward compatibility)
    let status = apt.status || BOOKING_STATUSES.SCHEDULED;
    status = migrateStatus(status); // Usa STATUS_MIGRATION_MAP

    return {
      ...apt,
      paciente: apt.paciente || apt.patient_name || apt.patient || '—',
      serviço: apt.serviço || apt.service_name || apt.service || '—',
      profissional: apt.profissional || apt.professional_name || apt.professional || '—',
      sala: apt.sala || apt.room_name || apt.room || '—',
      convênio: apt.convênio || apt.payer_name || apt.health_plan || apt.plano || 'Particular',
      plan_code: apt.plan_code || apt.code || apt.plan_number || '—',
      telefone: apt.telefone || apt.phone || apt.patient_phone || '',
      celular: apt.celular || apt.mobile || apt.patient_mobile || '',
      horário: horarioExtraido,
      status: status
    };
  };
  const handleContextMenu = (e, apt) => {
    console.log('🖱️ [AgendaDayView] handleContextMenu CHAMADO!');
    console.log('   e.type:', e.type);
    console.log('   apt.id:', apt?.id);
    console.log('   e.preventDefault() será chamado');
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      appointment: apt
    });
    console.log('✅ [AgendaDayView] ContextMenu STATE ATUALIZADO');
  };

  /**
   * 📋 Abrir AtendimentoModal (TISS) para um agendamento
   */
  const handleOpenAtendimento = apt => {
    const normalizedStatus = migrateStatus(apt?.status);
    const isClinicalFlow = [SERVICE_STATUSES.AWAITING_PROFESSIONAL, SERVICE_STATUSES.IN_SERVICE, SERVICE_STATUSES.ATTENDED].includes(normalizedStatus);
    if (apt?.patient_id && isClinicalFlow) {
      navigate(`/clinica/pacientes/${apt.patient_id}`, {
        state: {
          appointmentId: apt.id,
          appointmentDate: apt.scheduled_date || null,
          openTab: 'historico',
          fromAgendaClinicalFlow: true,
          canStartAppointment: normalizedStatus === SERVICE_STATUSES.AWAITING_PROFESSIONAL
        }
      });
      return;
    }
    setAtendimentoModalAppointment(apt);
    setAtendimentoModalOpen(true);
  };

  /**
   * 📋 Fechar AtendimentoModal e recarregar agenda
   */
  const handleCloseAtendimento = () => {
    setAtendimentoModalOpen(false);
    setAtendimentoModalAppointment(null);
    // Recarregar agendamentos após mudança
    if (appointments && appointments.length > 0) {
      setLocalAppointments([...appointments]);
    }
  };
  const handleCheckIn = (aptId, financialData = {}) => {
    console.log('✅ [CHECK-IN] Iniciando...', aptId, {
      financialData
    });
    if (!aptId) {
      alert('❌ Erro: ID não encontrado');
      return;
    }
    (async () => {
      try {
        // Buscar status atual do appointment
        const {
          data: currentApt,
          error
        } = await supabase.from('appointments').select('status').eq('id', aptId).maybeSingle();
        if (error) {
          console.error('❌ Erro ao buscar appointment:', error);
          throw error;
        }
        if (!currentApt) {
          console.warn('⚠️ Appointment não encontrado:', aptId);
          throw new Error("Agendamento não encontrado ou sem permissão de acesso");
        }
        const isEditing = currentApt?.status === 'at_reception';

        // 1️⃣ Atualizar status apenas se for novo check-in
        if (!isEditing) {
          console.log('📍 [CHECK-IN] Atualizando status para Na Recepção...');
          const {
            error: statusError
          } = await supabase.from('appointments').update({
            status: 'at_reception'
          }).eq('id', aptId);
          if (statusError) {
            console.error('❌ Erro ao atualizar status:', statusError.message);
            alert(`❌ ${statusError.message}`);
            return;
          }
          console.log('✅ Status atualizado para Na Recepção');
        } else {
          console.log('📝 [CHECK-IN] Modo edição - atualizando apenas dados financeiros');
        }

        // 2️⃣ Salvar dados financeiros se houver
        if (Object.keys(financialData).length > 0) {
          console.log('💰 [CHECK-IN] Processando dados financeiros...');
          const {
            saveCheckInFinancialData
          } = await import('@/lib/financialCheckInApi');
          const financialResult = await saveCheckInFinancialData(aptId, financialData);
          if (financialResult.error) {
            console.error('⚠️ Aviso: Erro ao processar dados financeiros:', financialResult.message);
          } else {
            console.log('✅ Dados financeiros processados:', financialResult);
            if (isEditing) {
              alert('✅ Check-in atualizado com sucesso!');
            } else {
              if (financialResult.type === 'receivable') {
                alert(`✅ Check-in realizado!\n\n💳 Conta a Receber criada com sucesso!\n\nID: ${financialResult.data.receivable_id}`);
              } else if (financialResult.type === 'billing_guide') {
                alert(`✅ Check-in realizado!\n\n🏥 Guia de Faturamento criada!\n\nAguardando processamento para envio ao convênio.\nID: ${financialResult.data.invoice_id}`);
              } else if (financialResult.type === 'courtesy') {
                alert('✅ Check-in realizado!\n\n🎁 Atendimento marcado como cortesia.');
              }
            }
          }
        } else {
          if (isEditing) {
            alert('✅ Check-in atualizado!');
          } else {
            alert('✅ Paciente marcado na recepção!');
          }
        }

        // Fechar drawer
        setDrawerOpen(false);
        console.log('📭 Drawer fechado');

        // Aguardar para Supabase propagar
        console.log('⏳ Aguardando para Supabase propagar...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Recarregar agenda
        console.log('🔄 Recarregando agenda...');
        if (typeof onEditAppointment === 'function') {
          await onEditAppointment();
          console.log('✅ Agenda recarregada com sucesso!');
        } else {
          console.error('❌ onEditAppointment não é uma função');
        }
      } catch (err) {
        console.error('❌ Erro:', err.message);
        alert(`❌ ${err.message}`);
      }
    })();
  };
  const handleConfirm = aptId => {
    console.log('Confirmar:', aptId);
    // Implementar chamada à API
  };
  const handleStartAppointment = aptId => {
    console.log('Iniciar:', aptId);
    // Implementar chamada à API
  };
  const handleReschedule = aptId => {
    console.log('🔄 Remarcar:', aptId);
    onEditAppointment(aptId);
  };
  const handleCancel = aptId => {
    console.log('❌ Cancelar/Deletar:', aptId);
    if (confirm('Tem certeza que deseja CANCELAR este agendamento?')) {
      (async () => {
        try {
          const {
            error
          } = await supabase.from('appointments').delete().eq('id', aptId);
          if (error) {
            console.error('❌ Erro ao deletar:', error);
            alert('Erro ao deletar agendamento');
            return;
          }
          console.log('✅ Agendamento deletado com sucesso');
          setDrawerOpen(false);
          onEditAppointment?.();
        } catch (err) {
          console.error('💥 Erro:', err);
          alert('Erro ao deletar agendamento');
        }
      })();
    }
  };
  const handleBill = aptId => {
    console.log('Faturar:', aptId);
    // Implementar chamada à API
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "h-full w-full flex flex-col bg-white relative"
  }, isHolidayDay && (isBlockedHoliday || overrideHoliday) && /*#__PURE__*/React.createElement("div", {
    className: `mb-3 rounded-md border p-3 text-sm ${isHolidayBlocked ? 'border-red-200 bg-red-50 text-red-700' : isOptionalHoliday ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-yellow-200 bg-yellow-50 text-yellow-700'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, isHolidayBlocked ? '🎉' : isOptionalHoliday ? 'ℹ️' : '⚠️'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Feriado:"), " ", holiday.name, isOptionalHoliday && /*#__PURE__*/React.createElement("span", {
    className: "ml-2 text-xs bg-blue-100 px-2 py-0.5 rounded"
  }, "FACULTATIVO"), /*#__PURE__*/React.createElement("br", null), isHolidayBlocked ? /*#__PURE__*/React.createElement("span", {
    className: "text-xs"
  }, "Agenda bloqueada automaticamente (obrigat\xF3rio)") : isOptionalHoliday ? /*#__PURE__*/React.createElement("span", {
    className: "text-xs"
  }, "Feriado facultativo - agenda dispon\xEDvel") : /*#__PURE__*/React.createElement("span", {
    className: "text-xs"
  }, "Agenda liberada manualmente para este feriado"))), isAdmin && isBlockedHoliday && !overrideHoliday && /*#__PURE__*/React.createElement("button", {
    onClick: () => setOverrideHoliday(true),
    className: "flex items-center gap-1 px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 whitespace-nowrap transition-colors",
    title: "Liberar agenda neste feriado"
  }, /*#__PURE__*/React.createElement(Unlock, {
    className: "h-3 w-3"
  }), "Liberar agenda"), isAdmin && overrideHoliday && /*#__PURE__*/React.createElement("button", {
    onClick: () => setOverrideHoliday(false),
    className: "flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 whitespace-nowrap transition-colors",
    title: "Bloquear agenda neste feriado"
  }, /*#__PURE__*/React.createElement(Lock, {
    className: "h-3 w-3"
  }), "Bloquear novamente"))), renderGridHeader(), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
  }, renderLinesToShow && renderLinesToShow.length > 0 && renderLinesToShow.map(lineInfo => {
    const {
      time,
      professionalId,
      type
    } = lineInfo;

    // Filtrar agendamentos para este tempo E profissional
    let appointmentsForLine = [];
    if (type === 'single-prof') {
      // Com filtro: todos os agendamentos do horário
      appointmentsForLine = groupedByTime[time] || [];
    } else {
      // Sem filtro: apenas agendamentos do profissional específico neste horário
      const allApptsForTime = groupedByTime[time] || [];
      appointmentsForLine = allApptsForTime.filter(apt => apt.professional_id === professionalId || apt.professionalId === professionalId);
    }
    const appointmentsForTime = appointmentsForLine;

    // Se não tem agendamento, mostrar hora livre (ou bloqueado se feriado)
    if (appointmentsForTime.length === 0) {
      // 🆕 Verificar disponibilidade DO PROFISSIONAL DESTA LINHA para este horário
      let isAvailable = true;
      if (type === 'single-prof' && filteredProfessionalId) {
        // Com filtro: APENAS esse profissional pode agendar
        const availableSlots = professionalAvailability[filteredProfessionalId] || [];
        isAvailable = availableSlots.length > 0 && availableSlots.includes(time);
        console.log(`📅 [AgendaDayView] Prof ${filteredProfessionalId} em ${time}: slots=${availableSlots.join(',')} → ${isAvailable ? '✅ livre' : '❌ bloqueado'}`);
      } else if (type === 'multi-prof' && professionalId) {
        // SEM filtro, com profissional nesta linha: verificar disponibilidade DESTE profissional
        const availableSlots = professionalAvailability[professionalId] || [];
        isAvailable = availableSlots.length > 0 && availableSlots.includes(time);
        console.log(`📅 [AgendaDayView] Multi-prof ${professionalId} em ${time}: slots=${availableSlots.join(',')} → ${isAvailable ? '✅ livre' : '❌ bloqueado'}`);
      } else {
        // SEM filtro, sem profissional nesta linha: mostrar verde de qualquer forma
        isAvailable = true;
      }

      // Se está bloqueado por feriado, renderizar bloqueado
      if (isHolidayBlocked) {
        return /*#__PURE__*/React.createElement("div", {
          key: lineInfo.key,
          id: `hour-${time.split(':')[0]}`,
          className: "grid grid-cols-12 gap-0 border-b border-gray-100 h-14 cursor-not-allowed",
          style: {
            background: '#f3f3f3'
          },
          title: "Agenda bloqueada - Feriado"
        }, /*#__PURE__*/React.createElement("div", {
          className: "col-span-1 px-3 py-3 flex items-center justify-center text-sm font-semibold border-r border-gray-200",
          style: {
            color: '#0052cc',
            fontSize: '12px',
            fontWeight: 600,
            background: '#f8f9fa'
          }
        }, time), /*#__PURE__*/React.createElement("div", {
          className: "col-span-11 px-4 py-3 flex items-center text-sm font-black border-r border-gray-200",
          style: {
            color: '#9ca3af'
          }
        }, "\uD83D\uDD12 Feriado \u2013 agenda bloqueada"));
      }

      // 🆕 Se profissional não está disponível neste horário, bloquear
      if (!isAvailable) {
        return /*#__PURE__*/React.createElement("div", {
          key: lineInfo.key,
          id: `hour-${time.split(':')[0]}`,
          className: "grid grid-cols-12 gap-0 border-b border-gray-100 h-14 cursor-not-allowed",
          style: {
            background: '#f3f3f3'
          },
          title: "Profissional indispon\xEDvel neste hor\xE1rio"
        }, /*#__PURE__*/React.createElement("div", {
          className: "col-span-1 px-3 py-3 flex items-center justify-center text-sm font-semibold border-r border-gray-200",
          style: {
            color: '#0052cc',
            fontSize: '12px',
            fontWeight: 600,
            background: '#f8f9fa'
          }
        }, time), /*#__PURE__*/React.createElement("div", {
          className: "col-span-11 px-4 py-3 flex items-center text-sm font-black border-r border-gray-200",
          style: {
            color: '#9ca3af'
          }
        }, "\uD83D\uDD12 Hor\xE1rio n\xE3o dispon\xEDvel para este profissional"));
      }

      // Caso contrário, renderizar normalmente (disponível)
      const availableProfs = getAvailableProfessionalsForTime(time);
      const profNamesDisplay = type === 'multi-prof' && professionalId ? professionalsMap[professionalId]?.name || professionalId : availableProfs.map(p => p.name).join(', ');
      return /*#__PURE__*/React.createElement("div", {
        key: lineInfo.key,
        id: `hour-${time.split(':')[0]}`,
        className: "grid grid-cols-12 gap-0 border-b border-gray-100 h-14 cursor-pointer transition-all",
        onClick: () => {
          const slotData = {
            time,
            date
          };
          if (type === 'single-prof' && filteredProfessionalId) {
            slotData.professionalId = filteredProfessionalId;
          } else if (type === 'multi-prof' && professionalId) {
            slotData.professionalId = professionalId;
          }
          onBookSlot(slotData);
        },
        style: {
          background: '#fafaf9'
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "col-span-1 px-3 py-3 flex items-center justify-center text-sm font-bold border-r border-gray-200",
        style: {
          color: '#0052cc',
          fontSize: '12px',
          fontWeight: 600,
          background: '#f8f9fa'
        }
      }, time), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2 px-3 py-3 flex items-center justify-center text-sm font-black border-r border-gray-200 text-center",
        style: {
          color: '#10b981',
          fontSize: '12px'
        }
      }, "\u2795 Clique para agendar"), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2 px-3 py-3 border-r border-gray-200"
      }), /*#__PURE__*/React.createElement("div", {
        className: "col-span-1 px-3 py-3 border-r border-gray-200"
      }), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2 px-3 py-3 border-r border-gray-200"
      }), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2 px-3 py-3 flex items-center justify-center text-sm font-medium border-r border-gray-200 truncate",
        style: {
          color: '#10b981',
          fontSize: '12px'
        }
      }, profNamesDisplay || "Disponível"), /*#__PURE__*/React.createElement("div", {
        className: "col-span-2 px-3 py-3 border-r border-gray-200"
      }));
    }
    return appointmentsForTime.map((apt, idx) => {
      // CORRIGIDO: Verificar se tem paciente usando todos os possíveis nomes de campo
      const isOccupied = apt.paciente || apt.patient || apt.patient_name;
      const status = apt.status || 'disponivel';
      const statusLabel = apt.status || 'confirmado';
      const isCurrentTime = time === currentTimeStr;
      const late = isLate(apt);
      const statusColor = getStatusBgColor(statusLabel);
      const rowId = `${lineInfo.key}-${idx}`;
      const isHovered = hoveredRow === rowId;

      // 🔍 DEBUG: Verificar que apt tem um ID válido
      console.log(`🔍 [AgendaDayView] apt objeto no loop:`, {
        temId: !!apt.id,
        aptId: apt.id,
        appointmentId: apt.appointment_id,
        aptStatus: apt.status,
        statusLabel: statusLabel,
        temPaciente: !!isOccupied,
        pacienteName: apt.paciente || apt.patient_name || 'SEM NOME'
      });

      // 🆕 Verificar disponibilidade do profissional para este horário
      // Se há filtro de profissional ativo, usar APENAS aquele profissional
      const profId = filteredProfessionalId || apt.professional_id || apt.professionalId;
      const availableSlots = professionalAvailability[profId] || [];

      // Se há profissional filtrado E não há slots cadastrados, bloquear
      // Se há profissional E há slots, verificar se o horário está na lista
      const isProfessionalAvailable = !profId || availableSlots.length > 0 && availableSlots.includes(time);
      if (!isOccupied) {
        // SLOT LIVRE
        return /*#__PURE__*/React.createElement("div", {
          key: rowId,
          onMouseEnter: () => setHoveredRow(rowId),
          onMouseLeave: () => setHoveredRow(null),
          className: `group border-b border-gray-100 transition-all ${isHolidayBlocked || !isProfessionalAvailable ? 'bg-gray-100 cursor-not-allowed' : `hover:bg-green-50/60 cursor-pointer ${isCurrentTime ? 'bg-blue-100/40' : isOptionalHoliday ? 'bg-blue-50/40' : 'bg-white'}`}`,
          onClick: () => {
            const slotData = {
              time,
              date,
              professional_id: filteredProfessionalId || apt.professional_id || apt.professionalId,
              room_id: apt.room_id || apt.roomId
            };
            onBookSlot(slotData);
          },
          onContextMenu: e => !isHolidayBlocked && isProfessionalAvailable && handleContextMenu(e, apt),
          title: !isProfessionalAvailable ? 'Profissional indisponível neste horário' : ''
        }, renderEmptySlot(time, isCurrentTime, isHolidayBlocked || !isProfessionalAvailable, isOptionalHoliday, onBookSlot, apt));
      } else {
        // SLOT OCUPADO
        return /*#__PURE__*/React.createElement("div", {
          key: rowId,
          onMouseEnter: () => setHoveredRow(rowId),
          onMouseLeave: () => setHoveredRow(null),
          className: `group border-b border-gray-100 hover:bg-blue-50/80 hover:shadow-md transition-all cursor-pointer ${late ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''} ${isCurrentTime ? 'bg-blue-100/50' : 'bg-white'}`,
          onClick: e => {
            console.log('🖱️ [AgendaDayView] CLIQUE SIMPLES na célula!');
            console.log('   apt.id:', apt?.id);
            handleContextMenu(e, apt);
          },
          onDoubleClick: () => {
            console.log('🖱️ [AgendaDayView] DUPLO CLIQUE na célula!');
            console.log('   apt.id:', apt?.id);
            console.log('   onEditAppointment type:', typeof onEditAppointment);
            console.log('   CHAMANDO onEditAppointment(apt.id...)');
            if (typeof onEditAppointment === 'function') {
              onEditAppointment(apt.id);
            } else {
              console.error('❌ onEditAppointment NÃO É UMA FUNÇÃO!', typeof onEditAppointment);
            }
          },
          onContextMenu: e => {
            console.log('🖱️ [AgendaDayView] CLIQUE DIREITO na célula!');
            console.log('   apt.id:', apt?.id);
            handleContextMenu(e, apt);
          }
        }, renderOccupiedSlot(apt, time, isCurrentTime, late, statusLabel, getStatusBgColor, isHovered, onEditAppointment, handleContextMenu, handleOpenAtendimento, currentRole));
      }
    });
  })), contextMenu && /*#__PURE__*/React.createElement(React.Fragment, null, console.log('📍 [AgendaDayView] Menu de contexto ESTÁ VISÍVEL:', {
    x: contextMenu.x,
    y: contextMenu.y,
    appointmentId: contextMenu.appointment?.id,
    hasAppointment: !!contextMenu.appointment
  }), /*#__PURE__*/React.createElement("div", {
    className: "fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-max",
    style: {
      left: `${contextMenu.x}px`,
      top: `${contextMenu.y}px`
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      console.log('🖱️ [AgendaDayView] Botão Editar do MENU CLICADO!');
      console.log('   contextMenu.appointment COMPLETO:', contextMenu.appointment);
      console.log('   contextMenu.appointment.id:', contextMenu.appointment?.id);
      console.log('   contextMenu.appointment[\'id\']:', contextMenu.appointment?.['id']);
      console.log('   Todos os campos do appointment:', Object.keys(contextMenu.appointment || {}));
      const appointmentId = contextMenu.appointment?.id;
      console.log('   appointmentId extraído:', appointmentId);
      console.log('   typeof appointmentId:', typeof appointmentId);
      console.log('   onEditAppointment type:', typeof onEditAppointment);
      if (appointmentId && typeof onEditAppointment === 'function') {
        console.log('✅ [AgendaDayView] CHAMANDO onEditAppointment COM ID:', appointmentId);
        onEditAppointment(appointmentId);
      } else {
        console.error('❌ [AgendaDayView] NÃO PODE CHAMAR onEditAppointment!', {
          hasId: !!appointmentId,
          appointmentId: appointmentId,
          isFunction: typeof onEditAppointment === 'function',
          onEditAppointmentType: typeof onEditAppointment
        });
      }
      setContextMenu(null);
    },
    className: "w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Edit, {
    className: "w-4 h-4"
  }), "Editar (ou duplo clique)"), currentRole === 'recepcao' && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      handleOpenAtendimento(contextMenu.appointment);
      setContextMenu(null);
    },
    className: "w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2 border-t border-gray-100"
  }, "\uD83D\uDCCB Atendimento (TISS)"), currentRole === 'profissional' && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      navigate(`/clinica/pacientes/${contextMenu.appointment.patient_id}`, {
        state: {
          appointmentId: contextMenu.appointment.id,
          appointmentTime: contextMenu.appointment.scheduled_time,
          appointmentDate: contextMenu.appointment.scheduled_date || null,
          openTab: 'historico',
          fromAgendaClinicalFlow: true,
          canStartAppointment: migrateStatus(contextMenu.appointment.status) === SERVICE_STATUSES.AWAITING_PROFESSIONAL
        }
      });
      setContextMenu(null);
    },
    className: "w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors flex items-center gap-2 border-t border-gray-100"
  }, "\uD83D\uDCDD Abrir Prontu\xE1rio"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onViewDetails(contextMenu.appointment.id);
      setContextMenu(null);
    },
    className: "w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 border-t border-gray-100"
  }, /*#__PURE__*/React.createElement(Eye, {
    className: "w-4 h-4"
  }), "Detalhes"), contextMenu.appointment.paciente && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      console.log('Marcar como falta:', contextMenu.appointment.id);
      setContextMenu(null);
    },
    className: "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
  }, "\u274C Marcar como Falta"))), /*#__PURE__*/React.createElement(AtendimentoModal, {
    isOpen: atendimentoModalOpen,
    onClose: handleCloseAtendimento,
    appointment: atendimentoModalAppointment,
    arrivals: [],
    onArrivalsUpdate: handleCloseAtendimento
  }));
}