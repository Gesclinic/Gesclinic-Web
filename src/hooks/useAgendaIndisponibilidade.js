import { useEffect, useState } from "react";
import { useClinicContext } from "@/contexts/useClinicContext";

// Hook para buscar períodos de indisponibilidade da agenda
export default function useAgendaIndisponibilidade({ professionalId, roomId }) {
  const clinicContext = useClinicContext() || {};
  const { clinic } = clinicContext;
  const [indisponibilidades, setIndisponibilidades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinic?.id) return;
    setLoading(true);
    // TODO: Buscar indisponibilidades reais do backend
    setTimeout(() => {
      setIndisponibilidades([
        // Exemplo
        // { motivo: "Férias", inicio: "2025-12-20T00:00", fim: "2025-12-30T23:59", profissionalId: 1, roomId: null }
      ]);
      setLoading(false);
    }, 500);
  }, [clinic, professionalId, roomId]);

  return { indisponibilidades, loading };
}
