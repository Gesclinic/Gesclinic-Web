import { useEffect, useState } from 'react';
import { useClinicContext } from '@/contexts/useClinicContext';

// Hook para buscar horários configurados por profissional
export default function useProfessionalScheduleConfig(professionalId) {
  const clinicContext = useClinicContext() || {};
  const { clinic } = clinicContext;
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinic?.id || !professionalId) {
      return;
    }
    setLoading(true);
    // TODO: Buscar configuração real do backend
    setTimeout(() => {
      setConfig({
        consulta: { start: 8, end: 18, slot: 30 },
        retorno: { start: 8, end: 12, slot: 15 },
        encaixe: { start: 12, end: 14, slot: 10 },
        particular: { start: 8, end: 18, slot: 30 },
        convenio: { start: 8, end: 18, slot: 30 },
        exame: { start: 8, end: 18, slot: 30 },
        cirurgia: { start: 8, end: 18, slot: 60 },
      });
      setLoading(false);
    }, 500);
  }, [clinic, professionalId]);

  return { config, loading };
}
