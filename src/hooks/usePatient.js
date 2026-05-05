import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient.js';

export function usePatient(patientId) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPatient = useCallback(async () => {
    if (!patientId) {
      setPatient(null);
      return;
    }

    setLoading(true);
    let cancelled = false;

    try {
      const { data, error } = await supabase
        .from('patients')
        .select(
          'id, full_name, name, record_number, cpf, birth_date, email, phone, payer_id, plan_id, insurance_id_number, responsible_name, responsible_relationship, sexo',
        )
        .eq('id', patientId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        throw error;
      }

      if (!cancelled) {
        // Usa full_name como fallback para name, caso o campo `name` ainda esteja em uso em algum lugar
        if (data && !data.name && data.full_name) {
          data.name = data.full_name;
        }
        setPatient(data || null);
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
      if (!cancelled) {
        setPatient(null);
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  return { patient, loading, refresh: fetchPatient };
}
