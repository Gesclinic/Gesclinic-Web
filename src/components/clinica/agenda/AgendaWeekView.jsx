import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAgendaConfig } from "@/hooks/useAgendaConfig";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import StatusSelector from "./StatusSelector";

export default function AgendaWeekView({
  appointments = [],
  selectedDate,
  onEditClick,
  onDeleteClick,
  onNewAppointment,
  onStatusChange,
}) {
  const navigate = useNavigate();
  const agendaConfig = useAgendaConfig();

  // Dias da semana (segunda → domingo)
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Geração dos horários do dia
  const timeSlots = useMemo(() => {
    const slots = [];

    const [startHour, startMinute] =
      (agendaConfig.horario_abertura || "08:00").split(":").map(Number);
    const [endHour, endMinute] =
      (agendaConfig.horario_fechamento || "18:00").split(":").map(Number);

    const slotSize =
      agendaConfig.slot_agenda ||
      agendaConfig.tempo_medio_atendimento ||
      15;

    // Almoço
    let almocoStart = null,
      almocoEnd = null;

    if (
      agendaConfig.horario_almoco_inicio &&
      agendaConfig.horario_almoco_fim
    ) {
      const [h1, m1] = agendaConfig.horario_almoco_inicio.split(":").map(Number);
      const [h2, m2] = agendaConfig.horario_almoco_fim.split(":").map(Number);

      almocoStart = h1 * 60 + m1;
      almocoEnd = h2 * 60 + m2;
    }

    let current = new Date(selectedDate);
    current.setHours(startHour, startMinute, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(endHour, endMinute, 0, 0);

    while (current <= end) {
      const t = current.getHours().toString().padStart(2, "0") +
        ":" +
        current.getMinutes().toString().padStart(2, "0");

      const min = current.getHours() * 60 + current.getMinutes();

      slots.push({
        time: t,
        isAlmoco:
          almocoStart !== null &&
          almocoEnd !== null &&
          min >= almocoStart &&
          min < almocoEnd,
      });

      current.setMinutes(current.getMinutes() + slotSize);
    }

    return slots;
  }, [agendaConfig, selectedDate]);

  // Agrupar appointments por dia
  const appointmentsByDay = useMemo(() => {
    const map = {};

    weekDays.forEach((day) => {
      map[format(day, "yyyy-MM-dd")] = [];
    });

    appointments.forEach((apt) => {
      try {
        const zoned = utcToZonedTime(apt.start_time, "America/Sao_Paulo");
        const key = format(zoned, "yyyy-MM-dd");
        if (!map[key]) return;
        map[key].push(apt);
      } catch {}
    });

    return map;
  }, [appointments, weekDays]);

  // Novo agendamento via clique
  const handleTimeSlotClick = (time, day) => {
    const [h, m] = time.split(":").map(Number);

    const start = new Date(day);
    start.setHours(h, m, 0, 0);

    onNewAppointment?.({
      start_time: start.toISOString(),
      is_free: true,
    });
  };

  return (
    <div className="h-full bg-white flex flex-col">

      {/* Cabeçalho */}
      <div className="sticky top-0 z-20 bg-white border-b-2 border-gray-300 shadow-sm">
        <div className="grid grid-cols-8">
          <div className="p-3 border-r border-gray-300 bg-gray-100 text-center font-semibold">
            Horário
          </div>

          {weekDays.map((day) => (
            <div
              key={day}
              className="p-3 border-r border-gray-300 bg-gray-100 text-center"
            >
              <div className="text-sm">{format(day, "EEE", { locale: ptBR })}</div>
              <div className="text-lg font-semibold">{format(day, "dd/MM")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto">
        {timeSlots.map((slot) => (
          <div
            key={slot.time}
            className={`grid grid-cols-8 border-b border-gray-200 min-h-[80px] ${
              slot.isAlmoco ? "bg-yellow-50" : ""
            }`}
          >
            {/* Hora */}
            <div className="p-3 border-r border-gray-300 bg-gray-50 text-center font-mono text-sm flex items-center justify-center">
              {slot.time}
              {slot.isAlmoco && (
                <span className="ml-2 text-yellow-700 font-semibold">
                  Almoço
                </span>
              )}
            </div>

            {/* Colunas dos dias */}
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayAppointments = appointmentsByDay[key] || [];

              // Encontrar agendamento no horário
              const [h, m] = slot.time.split(":").map(Number);

              const appointment = dayAppointments.find((apt) => {
                try {
                  const zoned = utcToZonedTime(
                    apt.start_time,
                    "America/Sao_Paulo"
                  );
                  return (
                    zoned.getHours() === h &&
                    zoned.getMinutes() === m &&
                    isSameDay(zoned, day)
                  );
                } catch {
                  return false;
                }
              });

              const isBlocked = appointment?.is_blocked;

              return (
                <div
                  key={day}
                  onClick={() => {
                    if (appointment) {
                      onEditClick?.(appointment);
                    } else {
                      handleTimeSlotClick(slot.time, day);
                    }
                  }}
                  className={`p-2 border-r-2 flex items-center relative cursor-pointer transition-all duration-200 rounded-sm ${
                    slot.isAlmoco 
                      ? "bg-yellow-50 border-yellow-200" 
                      : appointment
                      ? "border-gray-200 hover:bg-gray-50"
                      : "bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200"
                  }`}
                >
                  {/* Almoço */}
                  {slot.isAlmoco ? (
                    <div className="text-yellow-700 text-xs italic">
                      Horário de Almoço
                    </div>
                  ) : appointment ? (
                    <div className="w-full group">
                      {/* BLOQUEADO */}
                      {isBlocked ? (
                        <div className="bg-red-500 text-white text-xs p-2 rounded relative">
                          <div className="font-semibold">Horário Bloqueado</div>
                          <div className="opacity-80 text-xs">
                            {appointment.notes ||
                              appointment.block_reason ||
                              "Motivo não informado"}
                          </div>

                          {/* Ações */}
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditClick?.(appointment);
                              }}
                            >
                              <Edit className="h-2 w-2" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClick?.(appointment);
                              }}
                            >
                              <Trash2 className="h-2 w-2" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-600 text-white text-xs p-2 rounded relative">
                          <div className="font-semibold truncate">
                            {appointment.patient_name || "Paciente"}
                          </div>

                          <div className="text-xs opacity-90">
                            {appointment.service_name || "Serviço"}
                          </div>

                          <div className="text-xs opacity-80">
                            {appointment.professional_name || "Profissional"}
                          </div>

                          <StatusSelector
                            appointment={appointment}
                            onStatusChange={onStatusChange}
                            compact
                          />

                          {/* Ações */}
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity100 flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditClick?.(appointment);
                              }}
                            >
                              <Edit className="h-2 w-2" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClick?.(appointment);
                              }}
                            >
                              <Trash2 className="h-2 w-2" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-green-600 text-xs font-medium">
                      ➕ Clique para agendar
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
