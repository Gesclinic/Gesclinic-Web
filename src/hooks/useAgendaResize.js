import { useState, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { addMinutes, differenceInMinutes } from 'date-fns';

export function useAgendaResize() {
  const [resizingEvent, setResizingEvent] = useState(null);
  const startHeight = useRef(0);
  const startY = useRef(0);

  const SLOT_HEIGHT = 50; // altura do slot visual
  const SLOT_MINUTES = 30; // duração real do slot

  function onResizeStart(e, event) {
    e.preventDefault();
    setResizingEvent(event);

    startY.current = e.clientY;
    startHeight.current = event.duration;
  }

  // Enquanto arrasta a borda inferior
  function onResizeMove(e) {
    if (!resizingEvent) {
      return;
    }

    const deltaPixels = e.clientY - startY.current;
    const snappedSlots = Math.round(deltaPixels / SLOT_HEIGHT);
    const newDuration = Math.max(5, startHeight.current + snappedSlots * SLOT_MINUTES);

    return newDuration;
  }

  async function onResizeEnd(e, updateDuration) {
    if (!resizingEvent) {
      return;
    }

    const ev = resizingEvent;
    const newEnd = addMinutes(new Date(ev.start_time), updateDuration);

    const { error } = await supabase
      .from('appointments')
      .update({
        end_time: newEnd.toISOString(),
      })
      .eq('id', ev.id);

    if (error) {
      console.error('Erro ao redimensionar evento:', error);
    }

    setResizingEvent(null);
  }

  return {
    resizingEvent,
    onResizeStart,
    onResizeMove,
    onResizeEnd,
  };
}
