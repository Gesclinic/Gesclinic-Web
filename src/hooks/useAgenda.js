import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useAgenda() {
  const [view, setView] = useState('unificada');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);

  const [date, setDate] = useState(new Date());

  const loadProfessionals = async () => {
    const { data } = await supabase.from('professionals').select('*');
    setProfessionals(data || []);
  };

  const load = useCallback(async () => {
    setLoading(true);

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase.rpc('list_agenda_v1', {
      p_clinic_id: window.clinicId,
      p_start: start.toISOString(),
      p_end: end.toISOString(),
      p_professional_id: view === 'profissional' ? selectedProfessional || null : null,
    });

    if (!error) {
      setList(data || []);
    }
    setLoading(false);
  }, [date, view, selectedProfessional]);

  useEffect(() => {
    loadProfessionals();
    load();
  }, [load]);

  return {
    view,
    setView,
    list,
    loading,
    professionals,
    selectedProfessional,
    setSelectedProfessional,
    date,
    setDate,
  };
}
