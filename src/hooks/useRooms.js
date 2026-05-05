import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export default function useRooms(clinicId) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      return;
    }

    async function load() {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name', { ascending: true });

      setRooms(data || []);
      setLoading(false);
    }

    load();
  }, [clinicId]);

  return { rooms, loading };
}
