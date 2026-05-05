import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useAgendaDashboard(clinicId, range) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!clinicId) {
      return;
    }

    async function load() {
      const { data } = await supabase
        .from('view_agenda_kpis')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('day', range.start)
        .lte('day', range.end);

      setRows(data || []);
    }

    load();

    // realtime
    const channel = supabase
      .channel('dashboard-agenda')
      .on('postgres_changes', { event: '*', table: 'appointments' }, load)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [clinicId, range.start, range.end]);

  return rows;
}
