import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAgendaConfig } from '@/hooks/useAgendaConfig';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, User, AlertTriangle, Loader2, PlusCircle } from 'lucide-react';
import StatusSelector from './StatusSelector';

export default function AgendaSlotsGrid({
  slots = [],
  onEditClick,
  onDeleteClick,
  onRowClick,
  onCheckin,
  loading,
  onStatusChange,
  onActionExecute,
  selectedDate,
  isProfessional,
}) {
  const navigate = useNavigate();
  const agendaConfig = useAgendaConfig();

  const timeSlots = useMemo(() => {
    const slotsArr = [];
    const [startHour, startMinute] = (agendaConfig.horario_abertura || '08:00')
      .split(':')
      .map(Number);
    const [endHour, endMinute] = (agendaConfig.horario_fechamento || '18:00')
      .split(':')
      .map(Number);
    const slotSize = agendaConfig.slot_agenda || agendaConfig.tempo_medio_atendimento || 15;

    const almocoInicio = agendaConfig.horario_almoco_inicio || null;
    const almocoFim = agendaConfig.horario_almoco_fim || null;
    let almocoStart = null,
      almocoEnd = null;

    if (almocoInicio && almocoFim) {
      const [h1, m1] = almocoInicio.split(':').map(Number);
      const [h2, m2] = almocoFim.split(':').map(Number);
      almocoStart = h1 * 60 + m1;
      almocoEnd = h2 * 60 + m2;
    }

    const current = new Date(selectedDate || new Date());
    current.setHours(startHour, startMinute, 0, 0);
    const end = new Date(selectedDate || new Date());
    end.setHours(endHour, endMinute, 0, 0);

    while (current <= end) {
      const time = `${current.getHours().toString().padStart(2, '0')}:${current
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;

      let isAlmoco = false;
      if (almocoStart !== null && almocoEnd !== null) {
        const totalMin = current.getHours() * 60 + current.getMinutes();
        if (totalMin >= almocoStart && totalMin < almocoEnd) {
          isAlmoco = true;
        }
      }

      slotsArr.push({ time, isAlmoco });
      current.setMinutes(current.getMinutes() + slotSize);
      if (current > end) {
        break;
      }
    }

    const extraSlots = [];

    slots.forEach((slot) => {
      try {
        const { utcToZonedTime } = require('date-fns-tz');
        const zoned = utcToZonedTime(slot.start_time, 'America/Sao_Paulo');

        if (isSameDay(zoned, selectedDate)) {
          const hour = zoned.getHours();
          const minute = zoned.getMinutes();
          const timeString = `${hour
            .toString()
            .padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

          if (
            !slotsArr.some((s) => s.time === timeString) &&
            !extraSlots.some((s) => s.time === timeString)
          ) {
            extraSlots.push({ time: timeString, isAlmoco: false });
          }
        }
      } catch (e) {}
    });

    return [...slotsArr, ...extraSlots].sort((a, b) => {
      const [ha, ma] = a.time.split(':').map(Number);
      const [hb, mb] = b.time.split(':').map(Number);
      return ha * 60 + ma - (hb * 60 + mb);
    });
  }, [slots, selectedDate, agendaConfig]);

  const currentDate = selectedDate || new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center text-muted-foreground p-8">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="sticky top-0 z-30 bg-white border-b-2 border-gray-300 shadow-sm">
        <div className="grid grid-cols-12 text-sm font-semibold text-gray-700 bg-gray-50">
          <div className="col-span-1 p-4 border-r border-gray-300 text-center bg-gray-100">
            Data
          </div>
          <div className="col-span-1 p-4 border-r border-gray-300 text-center bg-gray-100">
            Horário
          </div>
          <div className="col-span-1 p-4 border-r border-gray-300 text-center">Prontuário</div>
          <div className="col-span-2 p-4 border-r border-gray-300 text-center">Paciente</div>
          <div className="col-span-2 p-4 border-r border-gray-300 text-center">Serviço</div>
          <div className="col-span-1 p-4 border-r border-gray-300 text-center">Convênio</div>
          <div className="col-span-2 p-4 border-r border-gray-300 text-center">Status</div>
          {!isProfessional && (
            <div className="col-span-2 p-4 text-center">Profissional responsável</div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-300px)]">
        <div className="divide-y border-b">
          {Array.isArray(timeSlots) &&
            timeSlots.length > 0 &&
            timeSlots.map((timeSlot) => {
              const [hour, minute] = timeSlot.time.split(':').map(Number);
              const slotDateTime = new Date(currentDate);
              slotDateTime.setHours(hour, minute, 0, 0);

              const appointment = slots.find((apt) => {
                try {
                  const { utcToZonedTime } = require('date-fns-tz');
                  const zoned = utcToZonedTime(apt.start_time, 'America/Sao_Paulo');
                  if (!isSameDay(zoned, currentDate)) {
                    return false;
                  }
                  return zoned.getHours() === hour && zoned.getMinutes() === minute;
                } catch {
                  return false;
                }
              });

              const isBlocked = appointment?.is_blocked;
              const isFree =
                !appointment || appointment?.status === 'livre' || appointment?.is_free;

              return (
                <div
                  key={timeSlot.time}
                  className={`grid grid-cols-12 border-b border-gray-200 min-h-[64px] items-center
                    ${timeSlot.isAlmoco ? 'bg-yellow-100 border-yellow-300' : ''}
                    ${isBlocked ? 'bg-red-50 border-red-200 hover:bg-red-100' : ''}
                    ${
                isFree && !timeSlot.isAlmoco
                  ? 'bg-green-50/30 hover:bg-green-100/50 cursor-pointer'
                  : ''
                }
                    ${!isBlocked && !isFree && !timeSlot.isAlmoco ? 'hover:bg-blue-50' : ''}
                  `}
                  onClick={
                    isFree && !isBlocked
                      ? () =>
                        onRowClick?.({
                          start_time: slotDateTime.toISOString(),
                          is_free: true,
                        })
                      : undefined
                  }
                >
                  {/* Data */}
                  <div className="col-span-1 p-3 border-r border-gray-200 text-center text-sm bg-gray-50">
                    <span className="text-xs text-gray-600 font-medium">
                      {format(currentDate, 'dd/MM/yyyy')}
                    </span>
                  </div>

                  {/* Horário */}
                  <div
                    className={`col-span-1 p-3 border-r border-gray-200 text-center font-mono text-sm bg-gray-50 ${
                      timeSlot.isAlmoco ? 'bg-yellow-100' : ''
                    }`}
                  >
                    <span className="font-bold text-gray-800 text-base">{timeSlot.time}</span>
                  </div>

                  {/* Conteúdo */}
                  {(() => {
                    if (appointment && isBlocked) {
                      return (
                        <>
                          <div className="col-span-1 p-2 border-r text-center text-sm">
                            <span className="text-red-600 font-medium">-</span>
                          </div>

                          <div className="col-span-2 p-2 border-r flex items-center text-red-700 font-semibold">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Horário Bloqueado
                          </div>

                          <div className="col-span-2 p-2 border-r text-sm text-red-600">
                            {appointment.notes ||
                              appointment.block_reason ||
                              'Motivo não informado'}
                          </div>

                          <div className="col-span-1 p-2 border-r text-center text-sm">
                            <span className="text-red-600 font-medium">-</span>
                          </div>

                          <div className="col-span-2 p-2 border-r flex items-center justify-center">
                            <Badge variant="destructive" className="bg-red-500 text-white">
                              Bloqueado
                            </Badge>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditClick?.(appointment);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClick?.(appointment);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="col-span-2 p-2 text-center text-sm">
                            <span className="text-red-600 italic">Sistema</span>
                          </div>
                        </>
                      );
                    }

                    if (appointment && !isFree) {
                      return (
                        <>
                          <div className="col-span-1 p-2 border-r text-center text-sm">
                            <span className="font-mono text-xs">
                              {appointment.record_number || '-'}
                            </span>
                          </div>

                          <div className="col-span-2 p-2 border-r text-sm flex items-center">
                            <User className="h-4 w-4 text-blue-500 mr-2" />
                            <span
                              className="font-medium text-gray-800 underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clinica/atendimento/${appointment.id}`);
                              }}
                            >
                              {appointment.patient_name || 'Paciente'}
                            </span>
                          </div>

                          <div className="col-span-2 p-2 border-r text-sm">
                            <span className="font-medium">
                              {appointment.service_name || 'Consulta'}
                            </span>
                            {appointment.notes && (
                              <div className="text-xs text-gray-500">{appointment.notes}</div>
                            )}
                          </div>

                          <div className="col-span-1 p-2 border-r text-center text-sm">
                            {appointment.payer_name || 'Particular'}
                          </div>

                          <div className="col-span-2 p-2 border-r flex items-center justify-center">
                            <StatusSelector
                              appointment={appointment}
                              onStatusChange={onStatusChange}
                              compact
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditClick?.(appointment);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClick?.(appointment);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          {!isProfessional && (
                            <div className="col-span-2 p-2 text-center text-sm">
                              {appointment.professional_name || '-'}
                            </div>
                          )}
                        </>
                      );
                    }

                    return (
                      <>
                        <div className="col-span-1 p-2 border-r-2 border-green-200 text-center text-sm bg-gradient-to-br from-green-50 to-green-100 rounded-sm">
                          <span className="text-green-600 font-medium">-</span>
                        </div>

                        <div className="col-span-2 p-2 border-r-2 border-green-200 text-sm flex items-center justify-center text-green-600 bg-gradient-to-br from-green-50 to-green-100 rounded-sm font-medium">
                          <PlusCircle className="h-3 w-3 mr-1 text-green-500" />
                          Clique para agendar
                        </div>

                        <div className="col-span-2 p-2 border-r-2 border-green-200 text-center text-sm bg-gradient-to-br from-green-50 to-green-100 rounded-sm">
                          <span className="text-green-600 font-medium">-</span>
                        </div>

                        <div className="col-span-1 p-2 border-r-2 border-green-200 text-center text-sm bg-gradient-to-br from-green-50 to-green-100 rounded-sm">
                          <span className="text-green-600 font-medium">-</span>
                        </div>

                        <div className="col-span-2 p-2 border-r-2 border-green-200 text-center text-sm bg-gradient-to-br from-green-50 to-green-100 rounded-sm">
                          <span className="text-green-600 font-medium text-xs">Disponível</span>
                        </div>

                        <div className="col-span-2 p-2 text-center text-sm bg-gradient-to-br from-green-50 to-green-100 rounded-sm">
                          <span className="text-green-600 font-medium">-</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
