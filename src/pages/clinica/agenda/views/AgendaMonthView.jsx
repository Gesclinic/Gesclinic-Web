import React, { useMemo, useEffect, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { getProfessionalAvailableSlots } from '@/lib/agendaUtils';
import { checkMultipleDates } from '@/lib/holidaysApi';
import { getStatusStyle } from '@/utils/helpers/getStatusStyle';
import { deleteAppointment } from '@/lib/appointmentsApi';
import { useClinicContext } from '@/contexts/ClinicContext';

/**
 * AgendaMonthView - Visualização em calendário mensal
 *
 * Props:
 * - date: string (YYYY-MM-DD) - Data selecionada
 * - appointments: array - Lista de agendamentos do mês
 * - onDayClick: (date: string) => void - Callback ao clicar em um dia
 * - onBookSlot: ({date, time}) => void - criar novo agendamento
 * - onEditAppointment: (appointmentId) => void - editar agendamento
 * - onViewDetails: (appointmentId) => void - ver detalhes (painel lateral)
 * - filteredProfessionalId: string - ID do profissional filtrado (opcional)
 */
// ✅ Helper: Validar se um valor é uma data válida
const isValidDate = (date) => {
  if (!date) {
    return false;
  }
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  if (typeof date === 'string') {
    try {
      const parsed = parseISO(date);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }
  return false;
};

const getAppointmentTimeLabel = (appointment) => {
  const directTime =
    appointment?.scheduled_time ||
    appointment?.time ||
    appointment?.horário ||
    appointment?.hora ||
    appointment?.start_time;

  if (typeof directTime === 'string') {
    const timeMatch = directTime.match(/(?:T)?(\d{2}:\d{2})(?::\d{2})?/);
    if (timeMatch) {
      return timeMatch[1];
    }
  }

  const dateTimeValue = appointment?.startTime || appointment?.start || appointment?.scheduled_at;
  if (isValidDate(dateTimeValue)) {
    try {
      return format(new Date(dateTimeValue), 'HH:mm');
    } catch {
      return '';
    }
  }

  return '';
};

export default function AgendaMonthView({
  date,
  appointments = [],
  onDayClick,
  onBookSlot = () => {},
  onEditAppointment = () => {},
  onViewDetails = () => {},
  onContextMenu = () => {},
  onRefreshAppointments = () => {},
  filteredProfessionalId = null, // NOVO: ID do profissional filtrado
  userRole = null, // Role do usuário logado
  userProfessionalId = null, // ID do profissional logado (se for profissional)
  clinicId = null,
}) {
  const { clinicId: contextClinicId } = useClinicContext();
  const activeClinicId = clinicId || contextClinicId || null;
  const [professionalAvailabilityByDay, setProfessionalAvailabilityByDay] = useState({}); // NOVO: Disponibilidade por dia
  const [hoveredDay, setHoveredDay] = useState(null); // Rastrear qual dia está com hover
  const [holidaysMap, setHolidaysMap] = useState({}); // Mapa de feriados
  const [loadingHolidays, setLoadingHolidays] = useState(false); // Estado de carregamento de feriados
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const showAppointmentMenu = (x, y, appointment) => {
    setTimeout(() => {
      setContextMenu({ x, y, appointment });
    }, 0);
  };

  const openAppointmentMenu = (event, appointment) => {
    event.preventDefault();
    event.stopPropagation();
    showAppointmentMenu(event.clientX, event.clientY, appointment);
    onContextMenu(event, appointment);
  };

  const handleDeleteAppointment = async () => {
    const appointmentId = contextMenu?.appointment?.id;
    if (!appointmentId) {
      return;
    }

    if (!confirm('Tem certeza que deseja EXCLUIR este agendamento? Esta ação remove o registro da agenda.')) {
      return;
    }

    try {
      await deleteAppointment(appointmentId);
      setContextMenu(null);
      onRefreshAppointments();
    } catch (error) {
      alert(`Erro ao deletar agendamento: ${error.message || 'verifique permissões e vínculos do registro'}`);
    }
  };

  // Log de disponibilidade
  useEffect(() => {
    console.log(
      '📊 [AgendaMonthView] professionalAvailabilityByDay:',
      Object.keys(professionalAvailabilityByDay).length,
      'dias carregados',
    );
    console.log('🔍 [AgendaMonthView] filteredProfessionalId:', filteredProfessionalId);
    if (filteredProfessionalId) {
      const unavailableDays = Object.entries(professionalAvailabilityByDay).filter(
        ([_, v]) => !v.hasAvailability,
      );
      console.log('❌ [AgendaMonthView] Dias INDISPONÍVEIS:', unavailableDays.length);
      if (unavailableDays.length > 0) {
        console.log(
          '  Exemplos:',
          unavailableDays.slice(0, 3).map(([d, v]) => d),
        );
      }
    }
  }, [professionalAvailabilityByDay, filteredProfessionalId]);

  // Parse da data
  const [year, month, day] = date
    ? date.split('-').map(Number)
    : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];

  // ✅ Memoizar dateObj para evitar recriação a cada render (causa blinking)
  const dateObj = useMemo(() => new Date(year, month - 1, day), [year, month, day]);

  // Gerar dias do mês (include dias anteriores e posteriores para preenchimento)
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(dateObj), { weekStartsOn: 1 }); // Segunda = início
    const end = endOfWeek(endOfMonth(dateObj), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [dateObj]);

  // 🆕 NOVO: Carregar disponibilidade do profissional para cada dia do mês (OTIMIZADO COM PARALELO)
  useEffect(() => {
    const loadProfessionalAvailability = async () => {
      const isProfesionalLogged = userRole === 'profissional';
      const profIdToLoad =
        filteredProfessionalId || (isProfesionalLogged ? userProfessionalId : null);

      if (!profIdToLoad) {
        console.log(
          '🔍 [AgendaMonthView] Nenhum profissional para carregar, limpando disponibilidade',
        );
        setProfessionalAvailabilityByDay({});
        return;
      }

      try {
        const startTime = Date.now();
        console.log(
          `🔍 [AgendaMonthView] Carregando disponibilidade para prof ${profIdToLoad} (${monthDays.length} dias de ${format(dateObj, 'MMMM')})`,
        );

        // ⚡ Carregar TODAS as disponibilidades em paralelo ao invés de sequencial
        const promises = monthDays.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          return getProfessionalAvailableSlots(profIdToLoad, dayStr, activeClinicId)
            .then((slots) => ({
              dayStr,
              hasAvailability: slots && slots.length > 0,
              slots: slots || [],
            }))
            .catch((err) => {
              console.error(`❌ [AgendaMonthView] Erro ao carregar ${dayStr}:`, err);
              return {
                dayStr,
                hasAvailability: false,
                slots: [],
              };
            });
        });

        const results = await Promise.all(promises);
        const availability = {};
        let availableCount = 0;
        let unavailableCount = 0;

        results.forEach(({ dayStr, hasAvailability, slots }) => {
          availability[dayStr] = { hasAvailability, slots };
          if (hasAvailability) {
            availableCount++;
          } else {
            unavailableCount++;
          }
        });

        console.log(
          `✅ [AgendaMonthView] Disponibilidade carregada: ${availableCount} dias LIVRES + ${unavailableCount} dias FECHADOS`,
        );
        setProfessionalAvailabilityByDay(availability);
        const elapsed = Date.now() - startTime;
        console.log(`⏱️ [AgendaMonthView] Tempo total: ${elapsed}ms`);
      } catch (error) {
        console.error(
          '❌ [AgendaMonthView] Erro ao carregar disponibilidade do profissional:',
          error,
        );
        setProfessionalAvailabilityByDay({});
      }
    };

    const isProfesionalLogged = userRole === 'profissional';
    const profIdToLoad =
      filteredProfessionalId || (isProfesionalLogged ? userProfessionalId : null);

    if (profIdToLoad) {
      loadProfessionalAvailability();
    }
  }, [filteredProfessionalId, userRole, userProfessionalId, dateObj, activeClinicId]);

  // 🎉 Carregar feriados do mês
  useEffect(() => {
    const loadHolidays = async () => {
      setLoadingHolidays(true);
      try {
        // Calcular datas do mês aqui (sem depender de monthDays que muda a cada render)
        const start = startOfWeek(startOfMonth(dateObj), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(dateObj), { weekStartsOn: 1 });
        const allDays = eachDayOfInterval({ start, end });
        const dates = allDays.map((d) => format(d, 'yyyy-MM-dd'));

        console.log('📅 [AgendaMonthView] Carregando feriados do mês:', {
          datesCount: dates.length,
          firstDate: dates[0],
          lastDate: dates[dates.length - 1],
        });

        const result = await checkMultipleDates(dates, null);
        console.log(
          '✅ [AgendaMonthView] Feriados carregados:',
          Object.keys(result).length,
          'encontrados',
        );
        setHolidaysMap(result);
      } catch (error) {
        console.warn('⚠️ [AgendaMonthView] Erro ao carregar feriados:', error);
        setHolidaysMap({});
      } finally {
        setLoadingHolidays(false);
      }
    };

    loadHolidays();
  }, [dateObj]);

  // Agrupar agendamentos por dia
  const appointmentsByDay = useMemo(() => {
    const byDay = {};

    monthDays.forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      byDay[key] = [];
    });

    console.log('📊 [AgendaMonthView] Mês:', format(dateObj, 'MMMM'));
    console.log('📊 [AgendaMonthView] Agendamentos recebidos:', appointments.length);
    console.log('📊 [AgendaMonthView] Dias do mês:', monthDays.length);

    if (appointments.length > 0) {
      console.log('🔍 [AgendaMonthView] PRIMEIROS 3 AGENDAMENTOS:');
      appointments.slice(0, 3).forEach((apt) => {
        console.log(`  - ${apt.patient_name} @ ${apt.scheduled_date} ${apt.scheduled_time}`);
      });
    }

    appointments.forEach((apt) => {
      // Extrair data do agendamento - tentar múltiplas possibilidades
      try {
        let dateKey = null;

        // Tentar campos possíveis - scheduled_date é o principal
        if (apt.scheduled_date) {
          dateKey = apt.scheduled_date;
        } else if (apt.date) {
          dateKey = apt.date;
        } else if (apt.start_time) {
          const aptDate = parseISO(apt.start_time);
          dateKey = format(aptDate, 'yyyy-MM-dd');
        }

        if (dateKey && byDay[dateKey]) {
          byDay[dateKey].push(apt);
        }
      } catch (e) {
        console.warn('❌ [AgendaMonthView] Erro ao processar data do agendamento:', apt);
      }
    });

    console.log(
      '✅ [AgendaMonthView] appointmentsByDay calculado:',
      Object.keys(byDay).filter((key) => byDay[key].length > 0).length,
      'dias com agendamentos',
    );
    return byDay;
  }, [appointments, monthDays]);

  // Dividir em semanas (7 dias cada)
  const weeks = useMemo(() => {
    const group = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      group.push(monthDays.slice(i, i + 7));
    }
    return group;
  }, [monthDays]);

  // Obter status de um dia baseado nos agendamentos
  const getDayStatus = (appts) => {
    const total = appts.length;
    if (total === 0) {
      return 'livre';
    } // Verde
    if (total === 1 || total === 2) {
      return 'normal';
    } // Azul
    if (total >= 3) {
      return 'lotado';
    } // Laranja
  };

  const statusColors = {
    livre: 'border-gray-200 bg-white',
    normal: 'border-gray-200 bg-white',
    lotado: 'border-gray-200 bg-white',
  };

  const today = new Date();

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">
      {/* Cabeçalho - Mês/Ano */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-4 py-2">
        <h3 className="text-base font-bold text-center" style={{ color: '#0052cc' }}>
          {format(dateObj, "MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
      </div>

      {/* Grid de dias da semana */}
      <div
        className="grid grid-cols-7 border-b border-gray-200 px-4 py-1"
        style={{ background: '#e7f3ff' }}
      >
        {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((d) => (
          <div
            key={d}
            className="text-center font-semibold py-1.5"
            style={{ color: '#0052cc', fontSize: '13px', fontWeight: 700 }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid de semanas */}
      <div className="flex-1 overflow-auto">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-gray-200">
            {week.map((dayObj) => {
              const dayKey = format(dayObj, 'yyyy-MM-dd');
              const dayAppts = appointmentsByDay[dayKey] || [];
              const isCurrentMonth = isSameMonth(dayObj, dateObj);
              const isToday = isSameDay(dayObj, today);
              const status = getDayStatus(dayAppts);

              // 🆕 NOVO: Verificar disponibilidade do profissional
              const profAvailability = professionalAvailabilityByDay[dayKey];
              const isProfessionalUnavailable =
                filteredProfessionalId && profAvailability && !profAvailability.hasAvailability;

              console.log(
                `📅 [Day ${dayKey}] filteredProf: ${filteredProfessionalId ? 'YES' : 'NO'} | availability: ${profAvailability ? (profAvailability.hasAvailability ? 'AVAILABLE' : 'UNAVAILABLE') : 'N/A'} | isProfUnavail: ${isProfessionalUnavailable}`,
              );

              // 🎉 Verificar se é feriado bloqueado
              const dayHoliday = holidaysMap[dayKey];
              const isMandatoryHoliday = dayHoliday && dayHoliday.is_mandatory !== false;
              const isHolidayBlocked =
                isMandatoryHoliday && dayHoliday.is_blocked && !dayHoliday.has_override;

              return (
                <div
                  key={dayKey}
                  onClick={() => {
                    // ❌ Se é feriado bloqueado, não permitir clique
                    if (isHolidayBlocked) {
                      console.log('🎉 [AgendaMonthView] Feriado bloqueado - desabilitado');
                      return;
                    }

                    const isProfesionalLogged = userRole === 'profissional';

                    console.log('🖱️ [AgendaMonthView] Click no dia:', {
                      dayKey,
                      userRole,
                      isProfesionalLogged,
                      dayApptsLength: dayAppts.length,
                    });

                    // Se é profissional logado → OPÇÃO A: sempre abre modal direto
                    if (isProfesionalLogged) {
                      console.log(
                        '👨‍⚕️ [AgendaMonthView] Profissional logado - Verificando disponibilidade',
                      );

                      // Verificar se tem disponibilidade neste dia
                      if (!profAvailability || !profAvailability.hasAvailability) {
                        console.log(
                          '⛔ [AgendaMonthView] Profissional sem disponibilidade neste dia',
                        );
                        return; // Não abre modal se não tem disponibilidade
                      }

                      if (dayAppts.length > 0) {
                        // Se tem agendamentos, edita primeiro
                        console.log('📝 [AgendaMonthView] Editando agendamento');
                        onEditAppointment(dayAppts[0].id);
                      } else {
                        // Se vazio, abre novo agendamento
                        const firstSlot = '09:00';
                        console.log('✨ [AgendaMonthView] Abrindo modal direto para agendamento');
                        onBookSlot && onBookSlot({ date: dayKey, time: firstSlot });
                      }
                      return;
                    }

                    // Se não é profissional → OPÇÃO B: navegação normal ou filtro profissional
                    if (!filteredProfessionalId) {
                      console.log(
                        'ℹ️ [AgendaMonthView] Sem filtro de profissional, navegando para dia',
                      );
                      onDayClick && onDayClick(dayKey);
                      return;
                    }

                    // Se está filtrando profissional
                    if (isProfessionalUnavailable) {
                      console.log('⛔ [AgendaMonthView] Profissional indisponível');
                      return;
                    }

                    // Se tem agendamento
                    if (dayAppts.length > 0) {
                      console.log('📅 [AgendaMonthView] Tem agendamento, navegando');
                      onDayClick && onDayClick(dayKey);
                      return;
                    }

                    // Se está livre e profissional atende, abrir modal de agendamento
                    if (profAvailability && profAvailability.hasAvailability) {
                      const firstSlot =
                        profAvailability.slots && profAvailability.slots.length > 0
                          ? profAvailability.slots[0]
                          : '09:00';
                      console.log(
                        '✨ [AgendaMonthView] Abrindo modal de agendamento com filtro profissional',
                      );
                      onBookSlot && onBookSlot({ date: dayKey, time: firstSlot });
                    }
                  }}
                  onMouseEnter={() => setHoveredDay(dayKey)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`
                    min-h-[108px] p-2 transition-all border overflow-visible flex flex-col relative
                    ${!isCurrentMonth ? 'text-gray-400' : ''}
                    ${isCurrentMonth && isHolidayBlocked ? 'cursor-not-allowed' : ''}
                    ${isCurrentMonth && !isHolidayBlocked && isProfessionalUnavailable ? 'text-gray-600 cursor-not-allowed' : ''}
                    ${isCurrentMonth && !isHolidayBlocked && !isProfessionalUnavailable && !isToday ? 'cursor-pointer' : ''}
                  `}
                  style={{
                    background: (() => {
                      if (!isCurrentMonth) {
                        return '#f3f3f3';
                      }
                      if (isHolidayBlocked) {
                        return '#f3f3f3';
                      }
                      if (isProfessionalUnavailable) {
                        return '#f3f3f3';
                      }
                      if (isToday) {
                        return '#fafaf9';
                      }
                      if (dayAppts.length > 0) {
                        // Usar a cor do primeiro agendamento
                        const { background } = getStatusStyle(dayAppts[0]?.status);
                        return background;
                      }
                      return '#fafaf9';
                    })(),
                    borderColor: !isCurrentMonth
                      ? '#e5e7eb'
                      : isHolidayBlocked
                        ? '#e5e7eb'
                        : isProfessionalUnavailable
                          ? '#e5e7eb'
                          : isToday
                            ? '#e5e7eb'
                            : '#e5e7eb',
                  }}
                  title={
                    isHolidayBlocked
                      ? 'Feriado - agenda bloqueada'
                      : isProfessionalUnavailable
                        ? 'Agenda fechada'
                        : ''
                  }
                >
                  {/* Overlay de Feriado Bloqueado */}
                  {(() => {
                    const dayHoliday = holidaysMap[dayKey];
                    const isBlocked =
                      dayHoliday &&
                      dayHoliday.is_blocked &&
                      dayHoliday.is_mandatory !== false &&
                      !dayHoliday.has_override;
                    return isBlocked ? (
                      <div className="absolute inset-0 bg-gray-300/60 flex flex-col items-center justify-center rounded pointer-events-none">
                        <span className="text-2xl">🔒</span>
                        <span className="text-xs font-semibold text-gray-700 mt-1 text-center px-1 max-w-[90%] whitespace-normal line-clamp-2">
                          {dayHoliday.name}
                        </span>
                      </div>
                    ) : null;
                  })()}

                  {/* Overlay de Feriado Facultativo */}
                  {(() => {
                    const dayHoliday = holidaysMap[dayKey];
                    const isOptional =
                      dayHoliday && dayHoliday.is_mandatory === false && !dayHoliday.has_override;
                    return isOptional ? (
                      <div className="absolute inset-0 bg-yellow-200/30 border-2 border-yellow-400/50 rounded pointer-events-none"></div>
                    ) : null;
                  })()}

                  {/* Indicador de Override */}
                  {(() => {
                    const dayHoliday = holidaysMap[dayKey];
                    return dayHoliday && dayHoliday.has_override ? (
                      <div className="absolute inset-0 bg-green-200/20 border border-green-400/50 rounded pointer-events-none" />
                    ) : null;
                  })()}

                  {/* Número do dia */}
                  <div className="text-sm font-bold mb-1 text-gray-900">{format(dayObj, 'd')}</div>

                  {/* Conteúdo do dia */}
                  <div className={`flex-1 overflow-hidden ${dayAppts.length > 0 ? 'flex items-start' : 'flex items-center justify-center'}`}>
                    {dayAppts.length > 0 && isCurrentMonth && !isHolidayBlocked ? (
                      // Quando tem agendamentos (até 2 exibidos)
                      <div className="w-full space-y-1">
                        {dayAppts.slice(0, 2).map((apt) => {
                          const aptTime = getAppointmentTimeLabel(apt);
                          const { color } = getStatusStyle(apt.status);

                          const fullName = apt.patient_name || 'Paciente';
                          const nameParts = fullName.split(' ').filter((p) => p.length > 0);
                          const displayName =
                            nameParts.length > 1
                              ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
                              : nameParts[0] || 'Paciente';

                          return (
                            <div
                              key={apt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                showAppointmentMenu(e.clientX, e.clientY, apt);
                              }}
                              onContextMenu={(e) => {
                                openAppointmentMenu(e, apt);
                              }}
                              className="rounded-md border bg-white/85 px-2 py-1 text-[11px] font-black leading-tight shadow-sm whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:opacity-90"
                              style={{ color: color || '#d97706', borderColor: color || '#f59e0b' }}
                              title={fullName}
                            >
                              {aptTime ? `${aptTime} - ${displayName}` : displayName}
                            </div>
                          );
                        })}
                        {dayAppts.length > 2 && (
                          <div className="text-xs text-gray-600 mt-1">
                            +{dayAppts.length - 2} mais
                          </div>
                        )}
                      </div>
                    ) : isCurrentMonth && !isHolidayBlocked ? (
                      // Quando não tem agendamentos e está no mês atual e não é feriado
                      <>
                        {isProfessionalUnavailable ? (
                          // ❌ Profissional indisponível neste dia
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-lg">🔒</span>
                            <span className="text-[11px] font-semibold text-gray-600">
                              Indisponível
                            </span>
                          </div>
                        ) : (
                          // ✅ Disponível
                          <div
                            className="text-[11px] font-black text-center leading-tight"
                            style={{ color: '#10b981' }}
                          >
                            <div>Clique para</div>
                            <div>agendar</div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>

                  {/* Tooltip no Hover - Mostra todos os agendamentos do dia */}
                  {hoveredDay === dayKey && dayAppts.length > 0 && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1.5 pointer-events-none z-50 max-w-xs">
                      {dayAppts.map((apt, idx) => (
                        <div key={idx} className="whitespace-nowrap truncate">
                          {(() => {
                            const aptTime = getAppointmentTimeLabel(apt);
                            return aptTime ? (
                              <>
                                <span className="font-semibold">{aptTime}</span> •{' '}
                                {apt.patient_name || 'Paciente'}
                              </>
                            ) : (
                              apt.patient_name || 'Paciente'
                            );
                          })()}
                        </div>
                      ))}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-gray-900" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: '#fafaf9', border: '1px solid #e5e7eb' }}
            ></span>
            <span>Disponível</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: '#DBEAFE', border: '1px solid #e5e7eb' }}
            ></span>
            <span>Agendado</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: '#CFFAFE', border: '1px solid #e5e7eb' }}
            ></span>
            <span>Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: '#FEF3C7', border: '1px solid #e5e7eb' }}
            ></span>
            <span>Atendimento</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: '#f3f3f3', border: '1px solid #e5e7eb' }}
            ></span>
            <span>Indisponível</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <span>Feriado bloqueado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-300 border border-yellow-400"></span>
            <span>Feriado facultativo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-200 border border-green-400"></span>
            <span>Feriado com override</span>
          </div>
          {filteredProfessionalId && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-orange-100 border border-orange-300">❌</span>
              <span>Profissional indisponível</span>
            </div>
          )}
        </div>
      </div>
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[190px]"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              onEditAppointment(contextMenu.appointment.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={() => {
              onViewDetails(contextMenu.appointment.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 border-t border-gray-100"
          >
            <Eye className="w-4 h-4" />
            Detalhes
          </button>
          <button
            onClick={handleDeleteAppointment}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-gray-100"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
