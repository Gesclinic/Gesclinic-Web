import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useRoomsHeatmap(clinicId, date) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId || !date) {
      return;
    }
    setLoading(true);

    async function load() {
      const { data: rows, error } = await supabase
        .from('view_rooms_heatmap')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('day', date);

      if (!error) {
        setData(rows);
      }
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel('rooms-heatmap')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => load())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [clinicId, date]);

  return { data, loading };
}
