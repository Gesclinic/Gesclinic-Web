import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext.jsx";
import { supabase } from "@/lib/customSupabaseClient";

export function useAgendaConfig() {
  const { clinicId } = useAuth();
  const [agendaConfig, setAgendaConfig] = useState({
    horario_abertura: "08:00",
    horario_fechamento: "18:00",
    tempo_medio_atendimento: 15,
    slot_agenda: null,
    horario_almoco_inicio: null,
    horario_almoco_fim: null,
    clinicId: clinicId,
    _loaded: false,
  });

  useEffect(() => {
    async function fetchConfig() {
      if (!clinicId) return;
      const { data } = await supabase
        .from("clinics")
        .select("horario_abertura, horario_fechamento, tempo_medio_atendimento, slot_agenda, horario_almoco_inicio, horario_almoco_fim")
        .eq("id", clinicId)
        .single();
      if (data) {
        setAgendaConfig({
          horario_abertura: data.horario_abertura || "08:00",
          horario_fechamento: data.horario_fechamento || "18:00",
          tempo_medio_atendimento: data.tempo_medio_atendimento || 15,
          slot_agenda: data.slot_agenda || null,
          horario_almoco_inicio: data.horario_almoco_inicio || null,
          horario_almoco_fim: data.horario_almoco_fim || null,
          clinicId: clinicId,
          _loaded: true,
        });
      }
    }
    fetchConfig();
  }, [clinicId]);

  return agendaConfig;
}
