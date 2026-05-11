import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgendaConfig } from '@/hooks/useAgendaConfig';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  toLocalTime,
  formatLocalDate,
  formatLocalTime,
} from '@/utils/timezoneHelpers';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import StatusSelector from './StatusSelector';

export default function AgendaMonthView({
  appointments = [],
  selectedDate,
  onEditClick,
  onDeleteClick,
  onNewAppointment,
  onStatusChange,
}) {
  const navigate = useNavigate();
  const agendaConfig = useAgendaConfig();

  // 🔵 Dias do mês
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // ✅ Organizar appointments por dia usando timezone helpers
  const appointmentsByDay = useMemo(() => {
    const byDay = {};

    monthDays.forEach((day) => {
      const key = format(day, 'yyyy-MM-dd');
      byDay[key] = [];
    });

    appointments.forEach((apt) => {
      try {
        const local = toLocalTime(apt.start_time);
        const key = local.date; // Retorna 'YYYY-MM-DD'

        if (byDay[key]) {
          byDay[key].push(apt);
        }
      } catch (e) {
        console.warn('[MonthView] Error processing appointment timezone:', e);
      }
    });

    return byDay;
  }, [appointments, monthDays]);

  // 🔵 Criar novo agendamento ao clicar no dia
  const handleDayClick = (date) => {
    const [h, m] = (agendaConfig.horario_abertura || '08:00').split(':').map(Number);

    const start = new Date(date);
    start.setHours(h, m, 0, 0);

    onNewAppointment?.({
      start_time: start.toISOString(),
      is_free: true,
    });
  };

  // 🔵 Dividir por semanas
  const weeks = useMemo(() => {
    const group = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      group.push(monthDays.slice(i, i + 7));
    }
    return group;
  }, [monthDays]);

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Cabeçalho */}
      <div className="sticky top-0 z-20 bg-white border-b-2 border-gray-300 shadow-sm">
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold" style={{ color: '#0052cc' }}>
            {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>

        <div className="grid grid-cols-7 bg-gray-100">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="p-3 border-r border-gray-300 font-semibold text-center text-sm">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Calendário */}
      <div className="flex-1 overflow-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-200">
            {week.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const list = appointmentsByDay[key] || [];

              const isCurrentMonth = isSameMonth(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day}
                  className={`
                    min-h-[130px] p-2 border-r border-gray-200 cursor-pointer transition-colors
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-100 text-gray-400'}
                    ${isToday ? 'bg-blue-50 border-blue-300' : ''}
                    hover:bg-gray-50
                  `}
                  onClick={(e) => {
                    if (e.target.closest('.appointment-card')) {
                      return;
                    }
                    handleDayClick(day);
                  }}
                >
                  {/* Numero do dia */}
                  <div
                    className={`
                      text-sm font-semibold mb-1
                      ${isToday ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </div>

                  {/* Agendamentos */}
                  <div className="space-y-1">
                    {list.slice(0, 3).map((apt) => {
                      // ✅ Use timezone helpers instead of utcToZonedTime + formatTz
                      const local = toLocalTime(apt.start_time);
                      const startTime = formatLocalTime(local.time);

                      const isBlocked = apt.is_blocked;

                      return (
                        <div
                          key={apt.id}
                          className={`
                            appointment-card text-xs p-2 rounded relative group
                            text-white
                            ${
                              isBlocked
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick?.(apt);
                          }}
                        >
                          {/* Ações */}
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 text-white hover:bg-white/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditClick?.(apt);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 text-white hover:bg-white/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClick?.(apt);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Conteúdo */}
                          {isBlocked ? (
                            <>
                              <div className="font-semibold truncate">{startTime} - Bloqueado</div>
                              <div className="text-xs opacity-80 truncate">
                                {apt.notes || apt.block_reason || 'Motivo não informado'}
                              </div>
                              <Badge variant="outline" className="mt-1 bg-red-100 text-red-800">
                                Bloqueado
                              </Badge>
                            </>
                          ) : (
                            <>
                              <div
                                className="font-semibold truncate cursor-pointer hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/clinica/atendimento/${apt.id}`);
                                }}
                              >
                                {startTime} • {(apt.patient_name || '').split(' ')[0]}
                              </div>

                              <div className="text-xs opacity-80 truncate">
                                {apt.service_name || 'Serviço'}
                              </div>

                              <div className="text-xs opacity-70 truncate">
                                {apt.professional_name || 'Profissional'}
                              </div>

                              <div className="mt-1">
                                <StatusSelector
                                  appointment={apt}
                                  compact
                                  onStatusChange={onStatusChange}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* + mais */}
                    {list.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{list.length - 3} agendamentos
                      </div>
                    )}

                    {/* Clique para agendar */}
                    {list.length === 0 && isCurrentMonth && (
                      <div className="text-xs text-green-600 font-medium text-center py-2 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded">
                        ➕ Clique para agendar
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
