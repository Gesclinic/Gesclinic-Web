import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { labelForStatus, colorForStatus } from '@/lib/statusLabels';

export default function AgendaGridView({ slots, onSlotClick }) {
  const groupedByProfessional = useMemo(() => {
    if (!slots) {
      return {};
    }
    const groups = {};
    slots.forEach((slot) => {
      const key = slot.professional_name || 'Sem profissional';
      if (!groups[key]) {
        groups[key] = {
          id: slot.professional_id,
          color: slot.professional_color || '#3b82f6',
          items: [],
        };
      }
      groups[key].items.push(slot);
    });
    return Object.fromEntries(Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])));
  }, [slots]);

  return (
    <ScrollArea className="h-[75vh] w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4">
        {Object.entries(groupedByProfessional).map(([professionalName, group]) => (
          <div key={group.id || professionalName} className="flex flex-col gap-2">
            <h3
              className="text-md font-semibold text-white px-3 py-1.5 rounded-t-lg"
              style={{ backgroundColor: group.color }}
            >
              {professionalName}
            </h3>
            <div className="flex flex-col gap-2">
              {group.items
                .sort((a, b) => {
                  const aZoned = toZonedTime(a.start_time, 'America/Sao_Paulo');
                  const bZoned = toZonedTime(b.start_time, 'America/Sao_Paulo');
                  return +aZoned - +bZoned;
                })
                .map((slot) => {
                  const isFree = slot.status === 'livre' || slot.is_free;
                  const { bgColor, textColor, borderColor } = colorForStatus(slot.status);

                  return (
                    <div
                      key={slot.id || `${slot.start_time}-${slot.professional_id}`}
                      className={`p-3 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border-l-4 ${borderColor}`}
                      style={{ backgroundColor: bgColor }}
                      onClick={() => onSlotClick(slot)}
                    >
                      <div className="flex justify-between items-start">
                        <p className={`font-semibold text-sm ${textColor}`}>
                          {slot.patient_name && slot.patient_name !== 'Paciente não informado'
                            ? slot.patient_name
                            : slot.patient?.full_name ||
                              slot.patient?.name ||
                              'Paciente não informado'}
                        </p>
                      </div>
                      <p className={`text-xs mt-1 ${textColor} opacity-80`}>
                        {slot.service_name || 'Disponível para agendamento'}
                      </p>
                      <p className={`text-xs font-mono mt-2 ${textColor} opacity-70`}>
                        {slot.start_time
                          ? formatTz(toZonedTime(slot.start_time, 'America/Sao_Paulo'), 'HH:mm', {
                              timeZone: 'America/Sao_Paulo',
                            })
                          : ''}{' '}
                        -{' '}
                        {slot.end_time
                          ? formatTz(toZonedTime(slot.end_time, 'America/Sao_Paulo'), 'HH:mm', {
                              timeZone: 'America/Sao_Paulo',
                            })
                          : ''}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div className="flex items-center">
                          <span
                            className={`w-3 h-3 rounded-full mr-2 ${isFree ? 'bg-green-500' : 'bg-red-500'}`}
                          ></span>
                          {isFree ? 'Livre' : 'Ocupado'}
                        </div>
                        <div className="flex items-center justify-end">
                          <p className={`font-mono ${textColor}`}>
                            {slot.patient_name || 'Paciente não informado'}
                          </p>
                          <p className={`font-mono ${textColor} ml-2`}>{slot.phone || '-'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
