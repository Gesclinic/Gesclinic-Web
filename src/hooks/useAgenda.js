import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useClinicContext } from '@/contexts/ClinicContext';

export function useAgenda() {
  const { clinicId } = useClinicContext();
  const [view, setView] = useState('unificada');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);

  const [date, setDate] = useState(new Date());

  const loadProfessionals = useCallback(async () => {
    if (!clinicId) {
      setProfessionals([]);
      return;
    }

    const { data } = await supabase
      .from('professionals')
      .select('*')
      .eq('clinic_id', clinicId);
    setProfessionals(data || []);
  }, [clinicId]);

  const load = useCallback(async () => {
    if (!clinicId) {
      setList([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase.rpc('list_agenda_v1', {
      p_clinic_id: clinicId,
      p_start: start.toISOString(),
      p_end: end.toISOString(),
      p_professional_id: view === 'profissional' ? selectedProfessional || null : null,
    });

    if (!error) {
      setList(data || []);
    }
    setLoading(false);
  }, [clinicId, date, view, selectedProfessional]);

  useEffect(() => {
    loadProfessionals();
    load();
  }, [load, loadProfessionals]);

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
