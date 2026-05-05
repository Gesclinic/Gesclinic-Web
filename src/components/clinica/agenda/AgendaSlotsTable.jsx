import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAgendaConfig } from '@/hooks/useAgendaConfig';
import { isSameDay } from 'date-fns';
import {
  Edit,
  Trash2,
  UserCheck,
  Clock,
  User,
  AlertTriangle,
  MapPin,
  PlusCircle,
} from 'lucide-react';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

export default function AgendaSlotsTable({
  slots = [],
  selectedDate,
  onEditClick,
  onDeleteClick,
  onRowClick,
  onCheckin,
  labelForStatus,
}) {
  const agendaConfig = useAgendaConfig();

  // Generate time slots dynamically
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

  if (!timeSlots?.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-6 border rounded-md">
        Nenhum horário configurado para o período selecionado.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {timeSlots.map((timeSlot) => {
        const [hour, minute] = timeSlot.time.split(':').map(Number);
        const slotDateTime = new Date(currentDate);
        slotDateTime.setHours(hour, minute, 0, 0);

        // Find appointment for this slot
        const apt = slots.find((a) => {
          try {
            const { utcToZonedTime } = require('date-fns-tz');
            const zoned = utcToZonedTime(a.start_time, 'America/Sao_Paulo');
            if (!isSameDay(zoned, currentDate)) {
              return false;
            }
            return zoned.getHours() === hour && zoned.getMinutes() === minute;
          } catch {
            return false;
          }
        });

        const isFree = !apt || apt.status === 'livre' || apt.is_free;
        const isBlocked = apt?.is_blocked;
        const isFit = apt && (apt.is_fit === true || apt.is_fit === 't' || apt.is_fit === 1);

        // Skip lunch slots if they are free (optional, but usually desired to hide lunch unless booked)
        // Actually, let's show them as blocked or lunch
        if (timeSlot.isAlmoco && isFree) {
          return (
            <Card key={timeSlot.time} className="bg-yellow-50 border-yellow-200 opacity-70">
              <CardContent className="p-3 flex items-center justify-center h-full min-h-[100px]">
                <div className="text-center text-yellow-700 text-sm font-medium">
                  <Clock className="h-4 w-4 mx-auto mb-1" />
                  {timeSlot.time} - Almoço
                </div>
              </CardContent>
            </Card>
          );
        }

        const clinicName = apt
          ? apt.clinic_name ||
            (apt.clinic_id === '1077d723-0af2-44f4-85c3-675ccfff55b4'
              ? 'Centro'
              : apt.clinic_id === 'a3a9d25d-7f2a-4022-9314-3a715cbf123f'
                ? 'Catuaí'
                : apt.clinic_id === 'b44a8d9c-8af4-4ef0-85c1-8325f2cba123'
                  ? 'Policlínica'
                  : 'Clínica')
          : '';

        const clinicColor =
          clinicName === 'Centro'
            ? 'bg-blue-500'
            : clinicName === 'Catuaí'
              ? 'bg-amber-500'
              : clinicName === 'Policlínica'
                ? 'bg-emerald-600'
                : 'bg-gray-500';

        const statusColorClass = isFree
          ? 'agenda-badge-free'
          : apt?.status?.includes('cancel')
            ? 'agenda-badge-cancelled'
            : isFit
              ? 'agenda-badge-fit'
              : 'agenda-badge-default';

        const cardBgClass = isFree
          ? 'agenda-card-free border-dashed'
          : apt?.status?.includes('cancel')
            ? 'agenda-card-cancelled'
            : isFit
              ? 'agenda-card-fit'
              : '';

        return (
          <Card
            key={timeSlot.time}
            className={`relative agenda-card-wrapper cursor-pointer ${cardBgClass} ${isBlocked ? 'bg-red-50 border-red-200' : ''}`}
            onClick={() => {
              if (isFree && !isBlocked) {
                onRowClick &&
                  onRowClick({
                    start_time: slotDateTime.toISOString(),
                    is_free: true,
                  });
              } else if (apt) {
                onEditClick && onEditClick(apt);
              }
            }}
          >
            <CardContent className="p-3 space-y-2">
              {/* Cabeçalho */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {timeSlot.time}
                </div>
                {apt && (
                  <Badge className={`${clinicColor} text-white text-xs font-medium`}>
                    {clinicName}
                  </Badge>
                )}
              </div>

              {isFit && (
                <Badge variant="outline" className="agenda-badge-fit mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Encaixe
                </Badge>
              )}

              {isBlocked ? (
                <div className="flex flex-col items-center justify-center py-2 text-red-600">
                  <AlertTriangle className="h-5 w-5 mb-1" />
                  <span className="text-xs font-bold">Bloqueado</span>
                  <span className="text-xs text-center">{apt?.notes || apt?.block_reason}</span>
                </div>
              ) : isFree ? (
                <div className="flex flex-col items-start text-sm text-muted-foreground">
                  <p className="text-xs">Horário livre</p>
                  <Button
                    size="sm"
                    className="mt-2 bg-green-600 hover:bg-green-700 text-white w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick &&
                        onRowClick({
                          start_time: slotDateTime.toISOString(),
                          is_free: true,
                        });
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Agendar
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <User className="h-4 w-4 text-gray-400" />
                    {apt.patient_name || 'Paciente não informado'}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {apt.service_name || 'Serviço não informado'}
                  </div>

                  <div className="flex justify-between items-center">
                    <Badge variant="default" className={`capitalize ${statusColorClass}`}>
                      {isFit ? 'Encaixe' : labelForStatus ? labelForStatus(apt.status) : apt.status}
                    </Badge>
                    <span className="text-xs text-right text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {apt.professional_name || '—'}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="icon"
                      variant="outline"
                      title="Editar"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick && onEditClick(apt);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      title="Check-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckin && onCheckin(apt);
                      }}
                    >
                      <UserCheck className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      title="Excluir"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClick && onDeleteClick(apt);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
