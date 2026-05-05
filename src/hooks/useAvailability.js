import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useAvailability(clinicId, professionalId) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!clinicId || !professionalId) {
      return;
    }

    async function load() {
      const { data } = await supabase
        .from('view_professional_availability')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('professional_id', professionalId);

      setData(data || []);
    }

    load();
  }, [clinicId, professionalId]);

  return data;
}
