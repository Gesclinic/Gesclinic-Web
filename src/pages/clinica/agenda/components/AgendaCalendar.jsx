import React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function AgendaCalendar({
  appointments = [],
  professionals = [],
  calendarView = 'day',
  filters,
  loading,
  onSelectEvent,
  onCreateAtSlot,
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
      height="100%"
      nowIndicator
      locale="pt-br"
    />
  );
}
