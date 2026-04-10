import React, { useState, useMemo, useEffect } from 'react';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { checkMultipleDates, getHolidayDetails, openHolidayManual } from '@/lib/holidaysApi';
import { getClinicTimeSlots, getProfessionalAvailableSlots } from '@/lib/agendaUtils';
import { getStatusStyle } from '@/utils/getStatusStyle';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';

/**
 * AgendaWeekView - Visualização semanal da agenda
 * 
 * Layout horizontal com:
 * - Colunas: Dias da semana (Seg-Dom)
 * - Linhas: Horários (08:00-18:00, 30min intervalo)
 * - Células com status visual (cores) e contadores
 * - NOVO: Bloqueio de feriados com override manual
 * - NOVO: Bloqueio de dias indisponíveis do profissional filtrado
 * 
 * Props:
 * - date: string (YYYY-MM-DD) - data base para semana
 * - appointments: array - agendamentos
 * - onDayClick: (dateStr) => void - navegar para o dia
 * - onBookSlot: ({date, time}) => void - criar novo agendamento
 * - onEditAppointment: (appointmentId) => void - editar agendamento
 * - onViewDetails: (appointmentId) => void - ver detalhes (painel lateral)
 * - showWeekends: boolean - mostrar sábado/domingo
 * - filteredProfessionalId: string - ID do profissional filtrado (opcional)
 */
export default function AgendaWeekView({
  date,
  appointments = [],
  onDayClick = () => {},
  onBookSlot = () => {},
  onEditAppointment = () => {},
  onViewDetails = () => {},
  onContextMenu = () => {},
  showWeekends = false,
  clinicId = null,  // Pode vir do pai ou usar clinic?.id
  filteredProfessionalId = null,  // NOVO: ID do profissional filtrado
  userRole = null,  // Role do usuário logado
  userProfessionalId = null,  // ID do profissional logado (se for profissional)
}) {
  // ✅ FUNÇÃO HELPER PARA EXTRAIR PRIMEIRO E ÚLTIMO NOME
  const getFirstAndLastName = (fullName) => {
    if (!fullName) return 'Paciente';
    const names = fullName.trim().split(' ').filter(n => n.length > 0);
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
  };

  // Debug: Log de props ao montar
  console.log('🔍 AgendaWeekView props:', { date, clinicId, hasAppointments: appointments.length, filteredProfessionalId });
  const [hoveredTime, setHoveredTime] = useState(null);
  const [holidaysMap, setHolidaysMap] = useState({});
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [openingHoliday, setOpeningHoliday] = useState(null);
  const [professionalAvailabilityByDay, setProfessionalAvailabilityByDay] = useState({}); // NOVO: Disponibilidade por dia
  
  const { user } = useAuth();
  const clinic = useClinicContext();

  // Log de disponibilidade
  useEffect(() => {
    console.log('📊 [AgendaWeekView] professionalAvailabilityByDay:', professionalAvailabilityByDay);
  }, [professionalAvailabilityByDay]);

  // Gerar horários de acordo com as configurações da clínica
  const timeSlots = useMemo(() => {
    return getClinicTimeSlots(clinic);
  }, [clinic]);

  // Calcular semana a partir da data
  const weekStart = startOfWeek(parseISO(date), { weekStartsOn: 1 }); // Monday
  const daysOfWeek = useMemo(() => {
    return showWeekends
      ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      : Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [date, showWeekends, weekStart]);

  console.log('📅 [AgendaWeekView] Semana:', daysOfWeek.map(d => format(d, 'yyyy-MM-dd')));

  // Agrupar agendamentos por dia e horário
  const appointmentsByDayTime = useMemo(() => {
    const grouped = {};
    daysOfWeek.forEach((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      grouped[dayStr] = {};
      timeSlots.forEach((time) => {
        grouped[dayStr][time] = [];
      });
    });

    console.log('📊 [AgendaWeekView] Agendamentos recebidos:', appointments.length);
    if (appointments.length > 0) {
      console.log('🔍 [AgendaWeekView] Estrutura do primeiro agendamento:', appointments[0]);
      console.log('🔑 [AgendaWeekView] Todas as chaves disponíveis:', Object.keys(appointments[0]));
      console.log('📅 Campos de data/hora:', {
        scheduled_date: appointments[0].scheduled_date,
        start_time: appointments[0].start_time,
        scheduled_time: appointments[0].scheduled_time,
        date: appointments[0].date,
        time: appointments[0].time,
        horário: appointments[0].horário,
      });
      console.log('👤 Nome do paciente:', appointments[0].patient_name);
    }

    appointments.forEach((apt) => {
      // Extrair a data corretamente - tentar múltiplas possibilidades
      let aptDate = null;
      
      // Tentar campos possíveis
      if (apt.scheduled_date) {
        aptDate = apt.scheduled_date;
      } else if (apt.date) {
        aptDate = apt.date;
      } else if (apt.start_time) {
        try {
          const parsedDate = parseISO(apt.start_time);
          aptDate = format(parsedDate, 'yyyy-MM-dd');
        } catch (e) {
          console.warn('❌ Erro ao parsear start_time:', apt.start_time);
        }
      }
      
      // Extrair tempo - remover segundos se tiver
      let aptTime = apt.scheduled_time || apt.horário || apt.time || '08:00';
      if (aptTime && aptTime.length > 5) {
        aptTime = aptTime.substring(0, 5); // '08:00:00' -> '08:00'
      }
      
      if (aptDate && grouped[aptDate]?.[aptTime]) {
        grouped[aptDate][aptTime].push(apt);
        console.log('✅ Agendamento adicionado:', { aptDate, aptTime, patient: apt.patient_name });
      } else {
        console.warn('❌ Agendamento NÃO adicionado:',  { aptDate, aptTime, patient: apt.patient_name, grouped: grouped[aptDate] ? Object.keys(grouped[aptDate]).slice(0,3) : 'sem data' });
      }
    });

    return grouped;
  }, [appointments, daysOfWeek, timeSlots, date]);

  // Carregar status de feriados da semana (com retry)
  useEffect(() => {
    const loadHolidays = async () => {
      // Usar clinicId da prop ou do clinic context
      const activeClinicId = clinicId || clinic?.id;
      
      // ✅ IMPORTANTE: Carregar feriados NACIONAIS mesmo sem clinicId!
      // A função checkMultipleDates() busca: clinic_id IS NULL OR clinic_id = activeClinicId
      // Quando activeClinicId é null, busca apenas feriados nacionais (clinic_id = NULL)
      
      setLoadingHolidays(true);
      try {
        const dates = daysOfWeek.map(d => format(d, 'yyyy-MM-dd'));
        const datesKey = dates.join(','); // String única para cada semana
        
        console.log('📅 [AgendaWeekView] Carregando feriados:', { 
          datesCount: dates.length, 
          firstDate: dates[0],
          lastDate: dates[dates.length - 1],
          clinic: activeClinicId || '(nacionais)',
          datesArray: dates
        });
        
        // ✅ Passa activeClinicId (pode ser null para apenas feriados nacionais)
        const result = await checkMultipleDates(dates, activeClinicId);
        console.log('✅ [AgendaWeekView] Feriados carregados:', Object.keys(result).length, 'encontrados');
        console.log('📊 [AgendaWeekView] Resultado completo:', result);
        setHolidaysMap(result);
      } catch (error) {
        console.warn('⚠️ [AgendaWeekView] Erro ao carregar feriados:', error);
        // Silenciosamente ignorar - feriados opcionais
        setHolidaysMap({});
      } finally {
        setLoadingHolidays(false);
      }
    };

    loadHolidays();
    
    // Depende de: date (muda semana) e showWeekends (muda dias incluídos)
  }, [date, showWeekends]);

  // 🆕 NOVO: Carregar disponibilidade do profissional para cada dia da semana (OTIMIZADO COM PARALELO)
  useEffect(() => {
    const loadProfessionalAvailability = async () => {
      const isProfesionalLogged = userRole === 'profissional';
      const profIdToLoad = filteredProfessionalId || (isProfesionalLogged ? userProfessionalId : null);

      if (!profIdToLoad) {
        console.log('🔍 [AgendaWeekView] Nenhum profissional para carregar, limpando disponibilidade');
        setProfessionalAvailabilityByDay({});
        return;
      }

      try {
        const startTime = Date.now();
        console.log('🔍 [AgendaWeekView] Carregando disponibilidade para profissional:', profIdToLoad, `(${daysOfWeek.length} dias)`);
        
        // ⚡ Carregar TODAS as disponibilidades em paralelo ao invés de sequencial
        const promises = daysOfWeek.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          return getProfessionalAvailableSlots(profIdToLoad, dayStr)
            .then(slots => {
              console.log(`🔍 [AgendaWeekView] ${dayStr}: slots retornados:`, slots);
              return {
                dayStr,
                hasAvailability: slots && slots.length > 0,
                slots: slots || [],
              };
            })
            .catch(err => {
              console.error(`❌ [AgendaWeekView] Erro ao carregar ${dayStr}:`, err);
              return {
                dayStr,
                hasAvailability: false,
                slots: [],
              };
            });
        });

        const results = await Promise.all(promises);
        const availability = {};
        results.forEach(({ dayStr, hasAvailability, slots }) => {
          availability[dayStr] = { hasAvailability, slots };
          console.log(`✅ [AgendaWeekView] ${dayStr}: hasAvailability=${hasAvailability}, slots=${slots?.length || 0}`);
        });

        console.log('📊 [AgendaWeekView] Disponibilidade final:', availability);
        setProfessionalAvailabilityByDay(availability);
        const elapsed = Date.now() - startTime;
        console.log(`✅ [AgendaWeekView] Disponibilidades carregadas em ${elapsed}ms`);
      } catch (error) {
        console.error('❌ [AgendaWeekView] Erro ao carregar disponibilidade do profissional:', error);
        setProfessionalAvailabilityByDay({});
      }
    };

    const isProfesionalLogged = userRole === 'profissional';
    const profIdToLoad = filteredProfessionalId || (isProfesionalLogged ? userProfessionalId : null);
    
    if (profIdToLoad) {
      loadProfessionalAvailability();
    }
  }, [filteredProfessionalId, userRole, userProfessionalId, date]);

  // Handler para abrir agenda de feriado manualmente
  const handleOpenHoliday = async (dateStr, reason = '') => {
    if (!user?.id || !clinicId && !clinic?.id) return;
    
    setOpeningHoliday(dateStr);
    try {
      const success = await openHolidayManual(
        dateStr,
        clinicId || clinic.id,
        user.id,
        reason || 'Abertura manual da agenda'
      );
      
      if (success) {
        // Recarregar feriados após override
        const updatedHolidays = await checkMultipleDates(
          daysOfWeek.map(d => format(d, 'yyyy-MM-dd')),
          clinicId || clinic.id
        );
        setHolidaysMap(updatedHolidays);
      }
    } catch (error) {
      console.error('Erro ao abrir agenda:', error);
    } finally {
      setOpeningHoliday(null);
    }
  };

  // Determinar status de uma célula
  const getCellStatus = (appts) => {
    if (appts.length === 0) return 'livre';
    
    const statuses = appts.map(a => a.status || 'confirmado');
    
    if (statuses.includes('falta') || statuses.includes('ausente')) return 'critico';
    if (appts.length >= 3) return 'lotado';
    if (statuses.includes('aguardando')) return 'parcial';
    return 'normal';
  };

  // Status dots - Minimalista
  const statusDots = {
    livre: 'bg-green-500',
    normal: 'bg-blue-500',
    parcial: 'bg-amber-400',
    lotado: 'bg-orange-500',
    critico: 'bg-red-500',
  };

  // Tooltip ao hover
  const getTooltipText = (appts, day, time) => {
    if (appts.length === 0) return 'Disponível';
    
    const dayName = format(day, 'EEEE', { locale: ptBR });
    const count = appts.length;
    const status = getCellStatus(appts);
    const statusLabel = {
      livre: 'Disponível',
      normal: `${count} agendamento(s)`,
      parcial: `${count} agendamento(s) - Aguardando`,
      lotado: `${count} agendamentos - Lotado`,
      critico: `${count} - Com atrasos/faltas`,
    };
    
    return `${dayName.toUpperCase()} ${time}\n${statusLabel[status]}`;
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header - Dias da Semana */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
        <div style={{ padding: 12, borderRight: '1px solid #dee2e6', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>Horário</div>
        {daysOfWeek.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const isToday = dayStr === new Date().toISOString().split('T')[0];
          return (
            <div key={dayStr} style={{ 
              padding: 12, 
              borderRight: '1px solid #dee2e6', 
              textAlign: 'center', 
              background: isToday ? '#e7f3ff' : '#e7f3ff', 
              fontWeight: 700, 
              fontSize: 13, 
              color: '#0052cc',
              borderBottom: isToday ? '2px solid #0052cc' : 'none'
            }}>
              <div>{format(day, 'EEE', { locale: ptBR })}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>{format(day, 'dd/MM')}</div>
            </div>
          );
        })}
      </div>

      {/* Grid - Horários e Cells */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {timeSlots.map(horario => (
          <div key={horario} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '1px solid #dee2e6' }}>
            <div style={{ padding: 12, borderRight: '1px solid #dee2e6', textAlign: 'center', fontWeight: 600, background: '#f8f9fa', color: '#0052cc', fontSize: 12 }}>
              {horario}
            </div>
            {daysOfWeek.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const appts = appointmentsByDayTime[dayStr]?.[horario] || [];
              const apt = appts[0] || null;
              
              // Verificar disponibilidade
              const profAvailability = professionalAvailabilityByDay[dayStr];
              const isProfessionalUnavailable = filteredProfessionalId && profAvailability && !profAvailability.hasAvailability;
              
              let cellBg = '#ffffff'; // Disponível
              let displayText = 'Clique para agendar';
              let clickable = true;
              let textColor = '#10b981'; // Verde
              let fontWeight = 900;
              
              if (isProfessionalUnavailable) {
                cellBg = '#f3f3f3'; // Cinza
                displayText = '🔒 Indisponível';
                clickable = false;
                textColor = '#9ca3af';
                fontWeight = 900;
              } else if (apt) {
                // Usar cor baseada no status real do agendamento
                const { background, color } = getStatusStyle(apt.status);
                cellBg = background;
                displayText = getFirstAndLastName(apt.patient_name || 'Paciente');
                clickable = true;
                textColor = color;
              }
              
              return (
                <div
                  key={`${dayStr}-${horario}`}
                  onClick={() => {
                    if (clickable) {
                      if (apt) {
                        onEditAppointment(apt.id);
                      } else {
                        onBookSlot({ date: dayStr, time: horario });
                      }
                    }
                  }}
                  style={{
                    padding: 8,
                    borderRight: clickable ? '1px solid #dee2e6' : '1px solid #e8e8e8',
                    background: cellBg,
                    minHeight: 70,
                    cursor: (clickable && apt) ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    textAlign: 'center',
                    color: textColor,
                    fontWeight: fontWeight,
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
}

