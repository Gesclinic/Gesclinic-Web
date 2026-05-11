import React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { toLocalTime, fromLocalTime } from '@/utils/timezoneHelpers';

export default function AgendaCalendar({
  appointments = [],
  professionals = [],
  calendarView = 'day',
  filters,
  loading,
  onSelectEvent,
  onCreateAtSlot,
  onAppointmentMoved,
}) {
  const events = appointments.map((a) => ({
    id: a.id,
    title: a.patient_name || 'Sem nome',
    start: a.start_time,
    end: a.end_time,
    backgroundColor: professionals.find((p) => p.id === a.professional_id)?.color || '#145B8A',
    borderColor: '#333',
    extendedProps: a,
  }));

  const handleDateClick = (info) => {
    console.log('🗓️ [FullCalendar dateClick] Info recebido:', {
      dateStr: info.dateStr,
      date: info.date,
      allDay: info.allDay,
      keys: Object.keys(info),
    });
    onCreateAtSlot(info);
  };

  // ✅ Handle drag & drop with timezone awareness
  const handleEventDrop = (info) => {
    try {
      console.log('🕐 [FullCalendar eventDrop] Evento movido:', {
        eventId: info.event.id,
        oldStart: info.event.start,
        newStart: info.event.start,
        oldEnd: info.event.end,
        newEnd: info.event.end,
      });

      // Convert new dates to local time using timezone helpers
      const newStart = info.event.start;
      const newEnd = info.event.end;

      if (!newStart) {
        console.warn('❌ New start time is null, reverting');
        info.revert();
        return;
      }

      // Extract local date and time from new start
      const localStart = toLocalTime(newStart.toISOString());
      const newLocalDateTime = {
        date: localStart.date,
        time: localStart.time,
      };

      console.log('🕐 [TIMEZONE] Novo horário local:', newLocalDateTime);

      // Notify parent component of the move
      if (onAppointmentMoved) {
        onAppointmentMoved({
          appointmentId: info.event.id,
          newDate: newLocalDateTime.date,
          newTime: newLocalDateTime.time,
        });
      }
    } catch (error) {
      console.error('❌ Error handling event drop:', error);
      info.revert();
    }
  };

  return (
    <FullCalendar
      plugins={[timeGridPlugin, interactionPlugin]}
      initialView={calendarView === 'day' ? 'timeGridDay' : 'timeGridWeek'}
      allDaySlot={false}
      slotMinTime="07:00:00"
      slotMaxTime="22:00:00"
      events={events}
      eventClick={(info) => onSelectEvent(info.event.extendedProps)}
      dateClick={handleDateClick}
      eventDrop={handleEventDrop}
      editable={true}
      height="100%"
      nowIndicator
      locale="pt-br"
    />
  );
}
