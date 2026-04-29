// src/pages/clinica/agenda/views/AgendaPorProfissional.jsx
// VERSÃO COMPLETA com Dia/Semana/Mês e diferenciacão por perfil

import { useEffect, useState, useMemo, useCallback } from "react";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isSameMonth, isSameDay, getDate, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { listarAgenda } from "@/modules/agenda/services/agenda.api.complex";
import { mapAgendaItem } from "@/modules/agenda/services/agendaMapper";
import { listProfessionals } from '@/lib/professionalsApi';
import { listServices } from '@/lib/servicesApi';
import { listPayers } from '@/lib/payersApi';
import { listRooms } from '@/lib/roomsApi';
import { getClinicSchedules } from '@/lib/professionalScheduleApi';
import { useClinicContext } from "@/contexts/ClinicContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { getAccessibleAgendaTabs, DEFAULT_AGENDA_TAB_BY_ROLE } from '@/config/agendaTabs.config';
import { AGENDA_TABS_COLORS } from '../config/agendaTabsColors.config';
import { getStatusStyle } from '@/utils/helpers/getStatusStyle';
import AgendaViewModeTabs from '../components/AgendaViewModeTabs';
import AgendaSlotCard from '@/components/agenda/AgendaSlotCard';
import AppointmentUnitedModal from '@/pages/clinica/agenda/components/AppointmentUnitedModal';
import ModalCriarAgendamento from '../components/ModalCriarAgendamento';
import AgendaFilters from '@/components/agenda/AgendaFilters';

// Utilitário para extrair primeiro e último nome
const getFirstAndLastName = (fullName) => {
  if (!fullName) return 'Paciente';
  const names = fullName.trim().split(' ').filter(n => n.length > 0);
  if (names.length === 1) return names[0];
  return `${names[0]} ${names[names.length - 1]}`;
};

// Utilitário para verificar se um horário está disponível para um profissional
const isTimeSlotAvailable = (professionalId, dayOfWeek, timeString, schedules) => {
  if (!schedules || schedules.length === 0) {
    // Sem schedules = usar fallback (tudo disponível)
    return true;
  }
  
  const profSchedules = schedules.filter(s => 
    String(s.professional_id) === String(professionalId) && 
    s.day_of_week === dayOfWeek && 
    s.active !== false && 
    !s.blocked
  );
  
  if (profSchedules.length === 0) {
    // Nenhum schedule para este profissional/dia = não disponível
    return false;
  }
  
  const schedule = profSchedules[0];
  const [timeH, timeM] = timeString.split(':').map(Number);
  const [startH, startM] = (schedule.start_time || '').split(':').map(Number);
  const [endH, endM] = (schedule.end_time || '').split(':').map(Number);
  const breakStart = schedule.break_start ? schedule.break_start.split(':').map(Number) : null;
  const breakEnd = schedule.break_end ? schedule.break_end.split(':').map(Number) : null;
  
  // Verificar se está dentro do horário
  const timeMinutes = timeH * 60 + timeM;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  if (!(timeMinutes >= startMinutes && timeMinutes < endMinutes)) {
    return false; // Fora do horário
  }
  
  // Verificar se está no intervalo (break)
  if (breakStart && breakEnd) {
    const breakStartMinutes = breakStart[0] * 60 + breakStart[1];
    const breakEndMinutes = breakEnd[0] * 60 + breakEnd[1];
    
    if (timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes) {
      return false; // Dentro do intervalo
    }
  }
  
  return true; // Disponível!
};

export default function AgendaPorProfissional({ 
  initialDate = null, 
  appointments = [],
  clinicId = null,
  onRefreshAppointments = null
}) {
  // 🔍 DEBUG: Log incoming props immediately
  console.log(`\n🔍 [AgendaPorProfissional] PROPS RECEBIDOS:`, {
    appointmentsLength: appointments?.length || 0,
    firstAppointment: appointments?.[0] ? {
      id: appointments[0].id,
      patient_name: appointments[0].patient_name,
      scheduled_date: appointments[0].scheduled_date,
      scheduled_time: appointments[0].scheduled_time,
      professional_id: appointments[0].professional_id
    } : 'NONE',
    initialDate,
    clinicId
  });

  const { clinic: ctxClinic, loadingClinic } = useClinicContext();
  const { user } = useAuth();
  const clinic = ctxClinic || { id: clinicId };
  
  // 🎭 PERFIL-DRIVEN LAYOUTS
  const userRole = user?.role || 'recepcao';
  const isProfissional = userRole.toLowerCase() === 'profissional';
  const accessibleTabs = useMemo(() => getAccessibleAgendaTabs(userRole), [userRole]);
  const defaultTab = DEFAULT_AGENDA_TAB_BY_ROLE[userRole.toLowerCase()] || 'dia';
  const initialTab = accessibleTabs.includes(defaultTab) ? defaultTab : accessibleTabs[0] || 'dia';
  
  console.log(`🎭 [AgendaPorProfissional] Perfil: ${userRole} | isProfissional: ${isProfissional} | Abas: ${accessibleTabs.join(', ')}`);
  
  // Estados
  const [date, setDate] = useState(() => {
    if (initialDate) return initialDate;
    return new Date().toISOString().slice(0, 10);
  });
  
  const [agendamentos, setAgendamentos] = useState(() => {
    return appointments && appointments.length > 0 ? appointments : [];
  });
  
  const [currentViewMode, setCurrentViewMode] = useState(initialTab);
  const [profissionais, setProfessionais] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);
  const [rooms, setRooms] = useState([]);
  // 🎭 Para Profissionais, auto-settar seu próprio ID. Para outros, iniciar sem filtro
  const [professionalId, setProfessionalId] = useState(() => {
    if (isProfissional && user?.professional_id) {
      return user.professional_id;
    }
    return undefined;
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSlotData, setSelectedSlotData] = useState(null);
  const [novoAgendamento, setNovoAgendamento] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  const startHour = '08:00';
  const endHour = '18:00';
  const slotMinutes = 30;

  // ✅ Callback para salvar agendamento
  const handleSaveAppointment = useCallback(async (formData) => {
    // Limpar seleção
    setSelectedSlot(null);
    setSelectedSlotData(null);
    
    // 🔄 Recarregar agendamentos após salvar
    if (onRefreshAppointments) {
      console.log('🔄 [AgendaPorProfissional] Recarregando agendamentos após save...');
      await onRefreshAppointments();
    }
  }, [onRefreshAppointments]);

  // ✅ Carregar dados completos do agendamento quando selectedSlot muda
  useEffect(() => {
    if (!selectedSlot) {
      setSelectedSlotData(null);
      return;
    }

    // Se for novo agendamento (sem ID), não carrega dados
    if (!selectedSlot.id) {
      setSelectedSlotData(selectedSlot);
      return;
    }

    // Se já tem os dados no selectedSlot, usa direto (para botar IDs do relacionamento)
    // Procura o agendamento completo na lista de agendamentos
    const fullData = agendamentos.find(a => a.id === selectedSlot.id);
    if (fullData) {
      setSelectedSlotData(fullData);
    } else {
      // Se não encontrar, usa o que foi passado
      setSelectedSlotData(selectedSlot);
    }
  }, [selectedSlot, agendamentos]);

  // ============= EFEITOS =============
  
  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  // ✅ Use appointments prop passed from index.jsx
  useEffect(() => {
    console.log(`\n✅ [AgendaPorProfissional useEffect] appointments prop mudou:`, {
      length: appointments?.length || 0,
      hasData: appointments && appointments.length > 0
    });
    if (appointments && appointments.length > 0) {
      console.log(`✅ [useEffect] Setando agendamentos com ${appointments.length} itens:`, appointments.map(a => ({
        patient: a.patient_name,
        date: a.scheduled_date,
        time: a.scheduled_time
      })));
      setAgendamentos(appointments);
    } else {
      console.log(`⚠️ [useEffect] Appointments vazio, não atualizando agendamentos`);
    }
  }, [appointments]);

  // ✅ Load support data (professionals, services, payers, schedules, rooms)
  useEffect(() => {
    if (!clinic?.id) return;
    setLoading(true);
    Promise.all([
      listProfessionals(clinic.id),
      listServices(clinic.id),
      listPayers(clinic.id),
      getClinicSchedules(clinic.id),
      listRooms(clinic.id)
    ])
      .then(([profs, svcs, payers_, scheds, rms]) => {
        setProfessionais(profs || []);
        setServices(svcs || []);
        setPayers(payers_ || []);
        setSchedules(scheds || []);
        setRooms(rms || []);
        console.log(`✅ [Agenda] Carregada: ${profs?.length} prof, ${scheds?.length} schedules, ${rms?.length} rooms`);
      })
      .catch(err => console.error('Erro ao carregar dados de suporte:', err))
      .finally(() => setLoading(false));
  }, [clinic?.id]);

  // ============= DADOS DERIVADOS =============
  const profissionaisFiltrados = useMemo(() => {
    // 🎭 Para Profissionais, SEMPRE mostrar apenas sua própria agenda
    if (isProfissional && user?.professional_id) {
      console.log(`🎭 [profissionaisFiltrados] Profissional detectado: ${user.professional_id}`);
      return profissionais.filter(p => p.id === user.professional_id);
    }
    
    // Para Admin/Gestor: aplicar filtro selecionado
    if (professionalId && professionalId !== 'all') {
      console.log(`🎭 [profissionaisFiltrados] Filtro por profissional: ${professionalId}`);
      return profissionais.filter(p => p.id === professionalId);
    }
    
    // 📍 Se nada selecionado, retornar TODOS os profissionais (em vez de array vazio)
    console.log(`📍 [profissionaisFiltrados] Nenhum filtro - retornando todos os ${profissionais.length} profissionais`);
    return profissionais;
  }, [profissionais, isProfissional, user?.professional_id, professionalId]);

  // 🎭 Agendamentos filtrados por profissional (se aplicável)
  const agendamentosFiltrados = useMemo(() => {
    console.log(`\n🎭 [agendamentosFiltrados] Calculando. agendamentos.length: ${agendamentos.length}, isProfissional: ${isProfissional}`);
    if (isProfissional && user?.professional_id) {
      const filtered = agendamentos.filter(a => {
        const aProfId = a.professional_id || a.professionalId;
        return String(aProfId) === String(user.professional_id);
      });
      console.log(`🎭 [agendamentosFiltrados] Profissional: ${user.professional_id} | Filtrado: ${filtered.length}/${agendamentos.length}`);
      if (filtered.length > 0) {
        console.log(`   Detalhes:`, filtered.map(a => ({ patient: a.patient_name, date: a.scheduled_date, time: a.scheduled_time })));
      }
      return filtered;
    }
    console.log(`🎭 [agendamentosFiltrados] Admin/Gestor - retornando todos os ${agendamentos.length}`);
    return agendamentos; // Admin/Gestor vê tudo
  }, [agendamentos, isProfissional, user?.professional_id]);

  const horariosPorProfissional = useMemo(() => {
    const map = {};
    // 📍 Use date-fns getDay para consistência (0=Sunday, 1=Monday, etc)
    const currentDate = parseISO(date);
    const dayOfWeek = getDay(currentDate);
    
    console.log(`📍 [horariosPorProfissional] Data: ${date} | dayOfWeek: ${dayOfWeek} | Total schedules: ${schedules.length}`);
    
    // 📍 Horários padrão como fallback (09:00-18:00 em 30min)
    const defaultHorarios = [];
    for (let h = 9; h < 18; h++) {
      defaultHorarios.push(`${String(h).padStart(2, '0')}:00`);
      defaultHorarios.push(`${String(h).padStart(2, '0')}:30`);
    }
    
    profissionaisFiltrados.forEach(prof => {
      const profSchedules = schedules.filter(s => 
        String(s.professional_id) === String(prof.id) && 
        s.day_of_week === dayOfWeek && 
        s.active !== false && 
        !s.blocked
      );
      console.log(`   Prof ${prof.name} (${prof.id}): ${profSchedules.length} horários`);
      
      if (profSchedules.length === 0) {
        // 📍 Se não houver schedules, usar horários padrão como fallback
        map[prof.id] = defaultHorarios;
        return;
      }
      
      const slots = [];
      const { start_time, end_time, interval_minutes } = profSchedules[0];
      if (!start_time || !end_time) {
        map[prof.id] = defaultHorarios;
        return;
      }
      
      const [startH, startM] = start_time.split(':').map(Number);
      const [endH, endM] = end_time.split(':').map(Number);
      
      let current = new Date(0, 0, 0, startH, startM);
      const end = new Date(0, 0, 0, endH, endM);
      
      while (current < end) {
        slots.push(format(current, 'HH:mm'));
        current = new Date(current.getTime() + (interval_minutes || 30) * 60000);
      }
      
      map[prof.id] = slots.length > 0 ? slots : defaultHorarios;
    });
    
    console.log(`📍 [horariosPorProfissional] Resultado:`, map);
    return map;
  }, [profissionaisFiltrados, schedules, date]);

  // ============= RENDER FUNCTIONS =============
  
  // Vista DIA: Se è profissional, mostra a SEMANA. Senão, mostra PROFISSIONAIS
  const renderDiaView = () => {
    console.log(`\n📅 [renderDiaView] START. agendamentosFiltrados: ${agendamentosFiltrados.length} itens`);
    console.log(`   Comparando com date state: "${date}" (tipo: ${typeof date})`);
    if (agendamentosFiltrados.length > 0) {
      console.log(`   Detalhes:`, agendamentosFiltrados.map(a => ({ 
        patient: a.patient_name, 
        scheduled_date: a.scheduled_date,
        scheduled_time: a.scheduled_time,
        prof: a.professional_id 
      })));
    }
    
    console.log(`🔍 [renderDiaView] DEBUG: isProfissional=${isProfissional} | userRole='${userRole}' | user.professional_id=${user?.professional_id}`);
    
    if (isProfissional) {
      console.log(`✅ [renderDiaView] Retornando renderSemanaCompacta() para profissional`);
      return renderSemanaCompacta();
    }
    
    console.log(`❌ [renderDiaView] Retornando tabela de admin`);
    return (
      <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 8, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ minWidth: 900, width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <tr>
              <th style={{ padding: 12, border: '1px solid #dee2e6', position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 2, textAlign: 'center', minWidth: 90, fontWeight: 700, color: '#495057' }}>Horário</th>
              {profissionaisFiltrados.map(prof => (
                <th key={prof.id} style={{ padding: 12, border: '1px  solid #dee2e6', minWidth: 280, textAlign: 'center', background: '#e7f3ff', fontWeight: 700, fontSize: 14, color: '#0052cc' }}>
                  {prof.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              let allHorarios = new Set();
              profissionaisFiltrados.forEach(prof => {
                const disp = horariosPorProfissional[prof.id];
                if (disp) disp.forEach(h => allHorarios.add(h));
              });
              const horariosOrdenados = Array.from(allHorarios).sort();
              
              if (horariosOrdenados.length === 0) {
                return (
                  <tr>
                    <td colSpan={1 + profissionaisFiltrados.length} style={{ textAlign: 'center', padding: 48, color: '#6c757d', fontSize: 15 }}>
                      📅 Nenhum horário disponível
                    </td>
                  </tr>
                );
              }
              
              return horariosOrdenados.map((horario) => (
                <tr key={horario} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: 10, border: '1px solid #dee2e6', fontWeight: 600, background: '#f8f9fa', position: 'sticky', left: 0, zIndex: 2, textAlign: 'center', color: '#0052cc', fontSize: 13 }}>
                    {horario}
                  </td>
                  {profissionaisFiltrados.map(prof => {
                    const apt = agendamentosFiltrados.find(a => {
                      // 🚨 FIX: Use scheduled_date directly without fallback to startTime (startTime is string "HH:MM:SS", not Date)
                      const aptDate = a.scheduled_date || null;
                      // ✅ FIX: Strip seconds from scheduled_time (09:00:00 → 09:00)
                      const aptTime = (a.scheduled_time || '').substring(0, 5) || null;
                      const aptProfId = a.professional_id || a.professionalId;
                      
                      const matches = aptDate === date && aptTime === horario && String(aptProfId) === String(prof.id);
                      
                      if (!matches && a.patient_name?.includes('Marcia')) {
                        console.log(`🔍 [renderDiaView FIND] Comparando Marcia:`, {
                          aptDate,
                          date,
                          dateMatch: aptDate === date,
                          aptTime,
                          horario,
                          timeMatch: aptTime === horario,
                          aptProfId: String(aptProfId),
                          profId: String(prof.id),
                          profMatch: String(aptProfId) === String(prof.id),
                          overallMatch: matches
                        });
                      }
                      
                      return matches;
                    });
                    
                    // ✅ Verificar disponibilidade do profissional
                    const currentDate = parseISO(date);
                    const dayOfWeek = getDay(currentDate);
                    const isAvailable = isTimeSlotAvailable(prof.id, dayOfWeek, horario, schedules);
                    
                    let cellBg = '#fafaf9'; // Cinza/branco muito suave para disponível
                    let displayText = 'Clique para agendar';
                    let clickable = true;
                    let textColor = '#10b981'; // Verde emerald
                    let fontWeight = 600;
                    
                    if (!isAvailable) {
                      // Não disponível - cinza muito suave
                      cellBg = '#f3f3f3';
                      displayText = '🔒 Indisponível';
                      clickable = false;
                      textColor = '#9ca3af';
                      fontWeight = 600;
                    } else if (apt) {
                      // Tem agendamento - usar cor baseada no status real
                      console.log('🎨 [DEBUG COLOR] apt object keys:', Object.keys(apt));
                      console.log('🎨 [DEBUG COLOR] apt.status:', apt.status, 'type:', typeof apt.status);
                      const { background, color } = getStatusStyle(apt.status);
                      cellBg = background;
                      displayText = getFirstAndLastName(apt.patient_name);
                      clickable = true;
                      textColor = color;
                    }
                    
                    return (
                      <td
                        key={`${prof.id}-${horario}`}
                        onClick={() => {
                          if (!clickable) return;
                          if (apt) {
                            console.log('🎯 [CLICK APT] Objeto do agendamento:', apt);
                            console.log('🎯 [CLICK APT] Chaves:', Object.keys(apt));
                            console.log('🎯 [CLICK APT] apt.id:', apt.id, 'apt.appointment_id:', apt.appointment_id);
                            setSelectedSlot(apt);
                          } else {
                            setNovoAgendamento({ horario, date, professional: prof.name, professionalId: String(prof.id) });
                          }
                        }}
                        style={{
                          padding: 8,
                          border: clickable ? '1px solid #dee2e6' : '1px solid #e8e8e8',
                          background: cellBg,
                          minHeight: 70,
                          cursor: clickable ? 'pointer' : 'not-allowed',
                          textAlign: 'center',
                          fontSize: 11,
                          fontWeight: 900,
                          color: textColor,
                          transition: 'all 0.2s ease'
                        }}
                        title={apt ? apt.patient_name || displayText : displayText}
                      >
                        {displayText}
                      </td>
                    );
                  })}
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    );
  };

  // Semana compacta para profissionais (na visualização DIA)
  const renderSemanaCompacta = () => {
    const currentDate = parseISO(date);
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });

    // 📍 Sempre usar horários disponíveis do profissional OU padrão
    let allHorarios = new Set();
    if (isProfissional && user?.professional_id && horariosPorProfissional[user.professional_id]) {
      const profHorarios = horariosPorProfissional[user.professional_id];
      if (Array.isArray(profHorarios)) {
        profHorarios.forEach(h => allHorarios.add(h));
      }
    }
    // Se vazio, usar agendamentos como fallback
    if (allHorarios.size === 0) {
      agendamentosFiltrados.forEach(apt => {
        if (apt.scheduled_time) allHorarios.add(apt.scheduled_time);
      });
    }
    // Se AINDA vazio, gerar horário padrão
    if (allHorarios.size === 0) {
      for (let h = 9; h < 18; h++) {
        allHorarios.add(`${String(h).padStart(2, '0')}:00`);
        allHorarios.add(`${String(h).padStart(2, '0')}:30`);
      }
    }
    const horariosOrdenados = Array.from(allHorarios).sort();

    return (
      <div style={{ border: '1px solid #ddd', borderRadius: 8, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {/* ✅ BARRA DE FERIADOS */}
        <div style={{ background: '#ffebee', borderBottom: '2px solid #d32f2f', padding: 12, color: '#d32f2f', fontWeight: 'bold', fontSize: 14 }}>
          🔒 Agenda bloqueada em feriados
        </div>
        
        {/* Cabeçalho com dias */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '2px solid #dee2e6', background: '#f8f9fa', position: 'sticky', top: 0, zIndex: 3 }}>
          <div style={{ padding: 12, borderRight: '1px solid #dee2e6', textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#495057' }}>Horário</div>
          {daysOfWeek.map(day => (
            <div key={day.toISOString()} style={{ padding: 12, borderRight: '1px solid #dee2e6', textAlign: 'center', background: '#e7f3ff', fontWeight: 700, fontSize: 13, color: '#0052cc' }}>
              <div>{format(day, 'EEE', { locale: ptBR })}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>{format(day, 'dd/MM')}</div>
            </div>
          ))}
        </div>

        {/* Grid de horários */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
          {horariosOrdenados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>
              📅 Nenhum agendamento
            </div>
          ) : (
            horariosOrdenados.map(horario => (
              <div key={horario} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '1px solid #dee2e6' }}>
                <div style={{ padding: 12, borderRight: '1px solid #dee2e6', textAlign: 'center', fontWeight: 600, background: '#f8f9fa', color: '#0052cc', fontSize: 12 }}>
                  {horario}
                </div>
                {daysOfWeek.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const apt = agendamentosFiltrados.find(a => a.scheduled_date === dayStr && a.scheduled_time === horario);
                  const isLivre = !apt;
                  let cellBg = '#fafaf9';
                  let textColor = '#10b981';
                  if (apt) {
                    const { background, color } = getStatusStyle(apt.status);
                    cellBg = background;
                    textColor = color;
                  }
                  
                  return (
                    <div
                      key={`${dayStr}-${horario}`}
                      onClick={() => {
                        if (apt) {
                          setSelectedSlot(apt);
                        }
                      }}
                      style={{
                        padding: 8,
                        borderRight: '1px solid #dee2e6',
                        background: cellBg,
                        minHeight: 70,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        textAlign: 'center',
                        color: textColor,
                        fontWeight: 900
                      }}
                    >
                      {apt ? getFirstAndLastName(apt.patient_name) : 'Clique para agendar'}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Semana
  const renderSemanaView = () => {
    const currentDate = parseISO(date);
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });

    // 📍 LOG DE DEBUG
    console.log(`\n📅 [renderSemanaView] START`);
    console.log(`  isProfissional: ${isProfissional}, user.professional_id: ${user?.professional_id}`);
    console.log(`  agendamentosFiltrados.length: ${agendamentosFiltrados.length}`);
    console.log(`  schedules.length: ${schedules?.length || 0}`);
    console.log(`  horariosPorProfissional keys:`, Object.keys(horariosPorProfissional || {}).slice(0, 3));
    if (agendamentosFiltrados.length > 0) {
      console.log(`  Exemplos:`, agendamentosFiltrados.slice(0, 3).map(a => ({
        patient: a.patient_name,
        date: a.scheduled_date,
        time: a.scheduled_time,
        profId: a.professional_id || a.professionalId
      })));
      console.log(`  TODOS da semana (05/03 a 11/03):`, agendamentosFiltrados.filter(a => a.scheduled_date >= '2026-03-02' && a.scheduled_date <= '2026-03-08').map(a => ({
        patient: a.patient_name,
        date: a.scheduled_date,
        time: a.scheduled_time
      })));
    }
    console.log(`  Semana: ${format(weekStart, 'dd/MM')} a ${format(addDays(weekStart, 6), 'dd/MM')}`);
    console.log(`  weekStart: ${weekStart}, daysOfWeek[0]: ${format(daysOfWeek[0], 'yyyy-MM-dd')}, daysOfWeek[4]: ${format(daysOfWeek[4], 'yyyy-MM-dd')}`);

    // 📍 Sempre ter horários para exibir
    let allHorarios = new Set();
    if (isProfissional && user?.professional_id && horariosPorProfissional[user.professional_id]) {
      const profHorarios = horariosPorProfissional[user.professional_id];
      if (Array.isArray(profHorarios)) {
        profHorarios.forEach(h => allHorarios.add(h));
      }
    } else {
      // Para Admin: agregar todos os horários de todos os profissionais
      profissionaisFiltrados.forEach(prof => {
        const profHorarios = horariosPorProfissional[prof.id];
        if (profHorarios && Array.isArray(profHorarios)) {
          profHorarios.forEach(h => allHorarios.add(h));
        }
      });
    }
    // Se vazio, usar agendamentos como fallback
    if (allHorarios.size === 0) {
      agendamentosFiltrados.forEach(apt => {
        if (apt.scheduled_time) allHorarios.add(apt.scheduled_time);
      });
    }
    // Se AINDA vazio, gerar horário padrão
    if (allHorarios.size === 0) {
      for (let h = 9; h < 18; h++) {
        allHorarios.add(`${String(h).padStart(2, '0')}:00`);
        allHorarios.add(`${String(h).padStart(2, '0')}:30`);
      }
    }
    const horariosOrdenados = Array.from(allHorarios).sort();

    return (
      <div style={{ border: '1px solid #ddd', borderRadius: 8, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
          <div style={{ padding: 12, borderRight: '1px solid #dee2e6', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>Horário</div>
          {daysOfWeek.map(day => (
            <div key={day.toISOString()} style={{ padding: 12, borderRight: '1px solid #dee2e6', textAlign: 'center', background: '#e7f3ff', fontWeight: 700, fontSize: 13, color: '#0052cc' }}>
              <div>{format(day, 'EEE', { locale: ptBR })}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>{format(day, 'dd/MM')}</div>
            </div>
          ))}
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
          {horariosOrdenados.map(horario => (
            <div key={horario} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '1px solid #dee2e6' }}>
              <div style={{ padding: 12, borderRight: '1px solid #dee2e6', textAlign: 'center', fontWeight: 600, background: '#f8f9fa', color: '#0052cc', fontSize: 12 }}>
                {horario}
              </div>
              {daysOfWeek.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayOfWeek = getDay(day);
                
                // 🔑 Determinar qual profissional usar baseado em profissionaisFiltrados
                // Se há 1 profissional filtrado, usar esse; senão (múltiplos ou geral) usar undefined
                const targetProfId = profissionaisFiltrados.length === 1 ? profissionaisFiltrados[0]?.id : undefined;
                
                const apt = agendamentosFiltrados.find(a => {
                  // 🚨 FIX: Use scheduled_date directly without fallback to startTime (startTime is string "HH:MM:SS", not Date)
                  const aptDate = a.scheduled_date || null;
                  const aptTime = (a.scheduled_time || '').substring(0, 5) || null;
                  const aptProfId = a.professional_id || a.professionalId;
                  
                  // Se for admin sem profissional selecionado, mostrar TODOS os agendamentos
                  const matches = aptDate === dayStr && aptTime === horario && (isProfissional || !targetProfId || String(aptProfId) === String(targetProfId));
                  
                  // DEBUG detalhado - mostrar todos os agendamentos da quinta (05/03)
                  if (dayStr === '2026-03-05') {
                    if (horario === '09:00' || horario === '09:30') {
                      console.log(`  🔍 [${dayStr} ${horario}] ${a.patient_name?.substring(0, 10)}: aptDate=${aptDate}, aptTime=${aptTime}, dayMatch=${aptDate===dayStr}, timeMatch=${aptTime===horario}, isProfissional=${isProfissional}, profMatch=${String(aptProfId)===String(targetProfId)}, MATCHES=${matches}`);
                    }
                  }
                  
                  // DEBUG para horários com agendamentos
                  if (matches) {
                    console.log(`✅ [renderSemanaView] FOUND: ${dayStr} ${horario} → ${a.patient_name}`);
                  }
                  
                  return matches;
                });
                
                // ✅ Verificar disponibilidade (para o primeiro profissional se profissional, ou admin)
                // IMPORTANTE: Para profissional logado, não checar schedules (mostra sempre disponível)
                // Para admin, checar schedules
                let isAvailable = true;
                if (!isProfissional && schedules && schedules.length > 0) {
                  // Só para admin: verificar schedules
                  isAvailable = isTimeSlotAvailable(targetProfId, dayOfWeek, horario, schedules);
                }
                
                // DEBUG quando isAvailable é false
                if (!isAvailable && horario === '08:00') {
                  console.log(`  ❌ NOT AVAILABLE: targetProfId=${targetProfId}, dayOfWeek=${dayOfWeek}, horario=${horario}, schedules?.length=${schedules?.length || 0}`);
                }
                
                let cellBg = '#fafaf9'; // Cinza/branco suave para disponível
                let displayText = 'Clique para agendar';
                let clickable = true;
                let textColor = '#10b981'; // Verde
                let fontWeight = 900;
                
                // ✅ PRIORIDADE: Agendamentos SEMPRE aparecem primeiro
                if (apt) {
                  // Se há agendamento, SEMPRE mostrar (máxima prioridade) - usar cor baseada no status
                  const { background, color } = getStatusStyle(apt.status);
                  cellBg = background;
                  displayText = getFirstAndLastName(apt.patient_name);
                  clickable = true;
                  textColor = color;
                  fontWeight = 900;
                  
                  console.log(`✅✅✅ [AGENDAMENTO ENCONTRADO] ${dayStr} ${horario} → ${apt.patient_name}, status=${apt.status}, color=${color}`);
                } else if (!isAvailable && !isProfissional) {
                  // Só mostrar indisponível se não for profissional e realmente estiver indisponível
                  cellBg = '#f3f3f3';
                  displayText = '🔒 Indisponível';
                  clickable = false;
                  textColor = '#9ca3af';
                  fontWeight = 900;
                } else {
                  // Se for profissional ou está disponível, mostrar "Clique para agendar"
                  cellBg = '#fafaf9';
                  displayText = 'Clique para agendar';
                  clickable = true;
                  textColor = '#10b981';
                  fontWeight = 900;
                }
                
                return (
                  <div
                    key={`${dayStr}-${horario}`}
                    onClick={() => {
                      console.log('🎯 [AgendaPorProfissional] CLIQUE no slot:', { dayStr, horario, apt: !!apt, isAvailable, isProfissional });
                      if (apt) {
                        // Se há agendamento, abrir detalhes
                        console.log('   → Abrindo detalhes do agendamento');
                        setSelectedSlot(apt);
                      } else if (isAvailable || isProfissional) {
                        // Se está disponível (ou é profissional), abrir novo agendamento
                        console.log('   → Abrindo novo agendamento com:', { horario, date: dayStr });
                        setNovoAgendamento({ horario, date: dayStr });
                      } else {
                        console.log('   → Slot não disponível');
                      }
                    }}
                    style={{
                      padding: 8,
                      borderRight: clickable ? '1px solid #dee2e6' : '1px solid #e8e8e8',
                      background: cellBg,
                      minHeight: 70,
                      cursor: (apt || isAvailable || isProfissional) ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      textAlign: 'center',
                      color: textColor,
                      fontWeight: 900,
                      transition: 'all 0.2s ease'
                    }}
                    title={apt ? apt.patient_name : displayText}
                  >
                    {displayText}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Mês
  const renderMesView = () => {
    const currentDate = parseISO(date);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const today = new Date();

    // Função para definir status baseado na quantidade de agendamentos
    const getDayStatus = (appts) => {
      const total = appts.length;
      if (total === 0) return 'livre';
      if (total === 1 || total === 2) return 'normal';
      if (total >= 3) return 'lotado';
    };

    return (
      <div className="h-full bg-white flex flex-col overflow-hidden">
        {/* Cabeçalho - Mês/Ano */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <h3 className="text-lg font-bold text-center" style={{ color: '#0052cc' }}>
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
        </div>

        {/* Grid de dias da semana */}
        <div className="grid grid-cols-7 border-b border-gray-200 px-6 py-2" style={{ background: '#e7f3ff' }}>
          {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((d) => (
            <div key={d} className="text-center font-semibold py-2" style={{ color: '#0052cc', fontSize: '13px', fontWeight: 700 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map(day => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, today);
              const dayNum = getDate(day);
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayOfWeek = getDay(day);
              // JavaScript getDay: 0=domingo, 1=segunda... Supabase: 0=segunda, 1=terça...
              // Convertemos para o padrão Supabase (0=segunda)
              const supabaseDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              
              const dayAppointments = agendamentosFiltrados.filter(apt => apt.scheduled_date === dayStr);
              const status = getDayStatus(dayAppointments);
              
              // Verificar disponibilidade dos profissionais neste dia da semana
              // Se há filtro por profissional específico, validar só esse; senão, validar todos
              let isDayAvailable = false;
              
              if (profissionaisFiltrados && profissionaisFiltrados.length > 0) {
                // Verificar se ANY profissional filtrado tem schedule para este dia
                isDayAvailable = profissionaisFiltrados.some(prof => {
                  return schedules.some(s =>
                    String(s.professional_id) === String(prof.id) &&
                    s.day_of_week === supabaseDayOfWeek &&
                    s.active !== false &&
                    !s.blocked
                  );
                });
              } else {
                // Se não há filtro específico, mostrar como disponível se houver algum schedule
                isDayAvailable = schedules.some(s =>
                  s.day_of_week === supabaseDayOfWeek &&
                  s.active !== false &&
                  !s.blocked
                );
              }

              return (
                <div
                  key={dayStr}
                  onClick={() => {
                    if (!isCurrentMonth || dayAppointments.length > 0) return;
                    if (isDayAvailable) {
                      setNovoAgendamento({ horario: null, date: dayStr });
                    }
                  }}
                  className={`
                    min-h-[160px] p-3 border flex flex-col relative
                    ${!isCurrentMonth ? 'text-gray-400 bg-gray-50' : dayAppointments.length > 0 ? 'cursor-default' : isDayAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}
                  `}
                  style={{
                    background: !isCurrentMonth ? '#f3f3f3' : isToday ? '#fafaf9' : dayAppointments.length > 0 ? '#fef3c7' : isDayAvailable ? '#fafaf9' : '#f3f3f3',
                    borderColor: '#e5e7eb',
                    borderWidth: '1px',
                  }}
                >
                  {/* Número do dia */}
                  <div className="text-sm font-bold mb-2 text-gray-900">
                    {format(day, 'd')}
                  </div>

                  {/* Conteúdo do dia */}
                  <div className="flex-1 flex items-center justify-center overflow-hidden">
                    {dayAppointments.length > 0 ? (
                      <div className="w-full text-center">
                        {dayAppointments.slice(0, 2).map(apt => {
                          // 🚨 FIX: Use scheduled_time directly without fallback to startTime (startTime is string "HH:MM:SS", not Date)
                          const aptTime = (apt.scheduled_time || '').substring(0, 5) || '?';
                          return (
                            <div 
                              key={apt.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSlot(apt);
                              }}
                              className="text-xs font-semibold px-1 py-1 whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:opacity-80" 
                              style={{ color: '#d97706' }} 
                              title={apt.patient_name || 'Paciente'}
                            >
                              {aptTime} • {getFirstAndLastName(apt.patient_name)}
                            </div>
                          );
                        })}
                        {dayAppointments.length > 2 && (
                          <div className="text-xs text-gray-600 mt-1">+{dayAppointments.length - 2} mais</div>
                        )}
                      </div>
                    ) : isCurrentMonth ? (
                      <>
                        {isDayAvailable ? (
                          <div className="text-xs font-black text-center" style={{ color: '#10b981' }}>
                            <div>Clique para</div>
                            <div>agendar</div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-2xl">🔒</span>
                            <span className="text-xs font-semibold text-gray-600">Indisponível</span>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-xs text-gray-600">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ background: '#fafaf9', border: '1px solid #e5e7eb' }}></span>
              <span>Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ background: '#DBEAFE', border: '1px solid #e5e7eb' }}></span>
              <span>Agendado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ background: '#CFFAFE', border: '1px solid #e5e7eb' }}></span>
              <span>Confirmado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ background: '#FEF3C7', border: '1px solid #e5e7eb' }}></span>
              <span>Atendimento</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ background: '#f3f3f3', border: '1px solid #e5e7eb' }}></span>
              <span>Indisponível</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============= RENDER FINAL =============
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Agenda por Profissional</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Botões de abas */}
          <AgendaViewModeTabs
            currentViewMode={currentViewMode}
            onViewModeChange={setCurrentViewMode}
            accessibleTabs={accessibleTabs}
          />
          
          <button
            style={{ padding: '6px 14px', background: '#1976d2', color: '#fff', border: 0, borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => {
              // 🎭 Para Profissional, sempre usar seu próprio ID. Para outros, usar o selecionado
              let profId = professionalId;
              let profName = '';
              
              if (isProfissional && user?.professional_id) {
                profId = user.professional_id;
                const prof = profissionais.find(p => p.id === user.professional_id);
                profName = prof?.name || 'Profissional';
              } else {
                const prof = profissionais.find(p => String(p.id) === String(professionalId));
                profName = prof?.name || '';
              }
              
              if (profId) {
                setNovoAgendamento({ horario: null, date, professional: profName, professionalId: String(profId) });
              }
            }}
            disabled={isProfissional ? !user?.professional_id : (!professionalId || professionalId === 'all')}
          >
            Novo Agendamento
          </button>
          
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ border: '1px solid #ccc', borderRadius: 4, padding: '4px 8px' }}
          />
          
          {!isProfissional && (
            <AgendaFilters
              professionalId={professionalId}
              setProfessionalId={setProfessionalId}
              professionals={profissionais}
              showRoom={false}
              showStatus={false}
              showPatient={false}
            />
          )}
        </div>
      </div>

      {/* Renderizar view baseado no modo */}
      {currentViewMode === 'semana' ? renderSemanaView() : currentViewMode === 'mes' ? renderMesView() : renderDiaView()}

      {/* Modais */}
      <AppointmentUnitedModal
        isOpen={!!selectedSlot}
        onClose={() => {
          setSelectedSlot(null);
          setSelectedSlotData(null);
        }}
        mode={selectedSlot?.id ? 'edit' : 'new'}
        appointment={selectedSlotData}
        professionals={profissionais}
        services={services}
        payers={payers}
        rooms={rooms}
        onSuccess={handleSaveAppointment}
      />
      
      {/* MODAL PARA NOVO AGENDAMENTO */}
      {novoAgendamento && (
        <ModalCriarAgendamento
          open={!!novoAgendamento}
          onOpenChange={open => !open && setNovoAgendamento(null)}
          clinicId={clinic?.id || clinicId}
          data={{
            date: novoAgendamento.date,
            time: novoAgendamento.horario,
            professional: novoAgendamento.professional,
            professionalId: novoAgendamento.professionalId
          }}
          professionals={profissionais.filter(p => p.id && String(p.id).trim() !== "")}
          services={services}
          payers={payers}
          onCreated={() => {
            setNovoAgendamento(null);
            setLoading(true);
            listarAgenda({ clinicId: clinic?.id || clinicId, date }).then(({ data }) => {
              setAgendamentos((data || []).map(mapAgendaItem));
              setLoading(false);
            });
          }}
        />
      )}
      
      {/* MODAL PARA EDITAR AGENDAMENTO EXISTENTE */}
      {selectedSlot && selectedSlotData && (
        <ModalCriarAgendamento
          open={!!selectedSlot}
          onOpenChange={open => !open && (setSelectedSlot(null), setSelectedSlotData(null))}
          clinicId={clinic?.id || clinicId}
          appointmentIdToEdit={selectedSlot.id}
          professionals={profissionais.filter(p => p.id && String(p.id).trim() !== "")}
          services={services}
          payers={payers}
          onEditCompleted={() => {
            setSelectedSlot(null);
            setSelectedSlotData(null);
            setLoading(true);
            listarAgenda({ clinicId: clinic?.id || clinicId, date }).then(({ data }) => {
              setAgendamentos((data || []).map(mapAgendaItem));
              setLoading(false);
            });
          }}
        />
      )}
    </div>
  );
}
