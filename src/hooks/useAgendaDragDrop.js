import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { addMinutes } from 'date-fns';

export function useAgendaDragDrop() {
  const [draggingEvent, setDraggingEvent] = useState(null);

  // Quando começa arrastar
  function onDragStart(event, evData) {
    event.dataTransfer.effectAllowed = 'move';
    setDraggingEvent(evData);
  }

  // Permitir soltar
  function onDragOver(e) {
    e.preventDefault();
  }

  /**
   * Quando o usuário solta um evento em um slot
   */
  async function onDrop(e, slot, professionalId) {
    e.preventDefault();

    if (!draggingEvent) {
      return;
    }

    const original = draggingEvent;

    const newStart = new Date(slot.date);
    const newEnd = addMinutes(newStart, draggingEvent.duration);

    const { error } = await supabase
      .from('appointments')
      .update({
        professional_id: professionalId,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      })
      .eq('id', original.id);

    setDraggingEvent(null);

    if (error) {
      console.error('Erro ao mover agenda:', error);
    }
  }

  return {
    draggingEvent,
    onDragStart,
    onDragOver,
    onDrop,
  };
}
