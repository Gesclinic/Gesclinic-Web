import { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export default function useScheduleLive({ onChange }) {
  useEffect(() => {
    const ch = supabase
      .channel('appointments_live')
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

    return () => supabase.removeChannel(ch);
  }, []);

  return null;
}
