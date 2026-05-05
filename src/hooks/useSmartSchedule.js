import { useState, useEffect } from 'react';

export function useSmartSchedule({ professionalId, clinicId, patientId, date, cep = null }) {
  const [bestSlots, setBestSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!professionalId || !clinicId || !patientId) {
      return;
    }

    const load = async () => {
      setLoading(true);
      const url =
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-schedule?` +
        `professional_id=${professionalId}&clinic_id=${clinicId}` +
        `&patient_id=${patientId}&date=${date}&cep=${cep ?? ''}`;

      const res = await fetch(url);
      const json = await res.json();

      setBestSlots(json.data ?? []);
      setLoading(false);
    };

    load();
  }, [professionalId, clinicId, patientId, date, cep]);

  return { bestSlots, loading };
}
