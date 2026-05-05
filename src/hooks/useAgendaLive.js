import { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useAgendaLive(onChange) {
  useEffect(() => {
    const channel = supabase
      .channel('agenda-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          onChange(payload);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);
}
