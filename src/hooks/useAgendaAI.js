import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { predictSlotDemand, predictNoShow } from '@/lib/ai/slotPrediction';

export function useAgendaAI(clinicId, professionalId) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      return;
    }

    async function load() {
      const { data } = await supabase
        .from('view_ai_agenda_history')
        .select('*')
        .eq('clinic_id', clinicId);

      setHistory(data || []);
      setLoading(false);
    }

    load();
  }, [clinicId]);

  function getSlotPrediction(weekday, hour) {
    return predictSlotDemand(history, weekday, hour, professionalId);
  }

  function getNoShowPrediction(weekday, hour) {
    return predictNoShow(history, weekday, hour, professionalId);
  }

  return {
    loading,
    getSlotPrediction,
    getNoShowPrediction,
  };
}
