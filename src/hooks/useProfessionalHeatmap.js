import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";

export function useProfessionalHeatmap(professionalId, day) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!professionalId || !day) return;

    async function load() {
      const { data } = await supabase
        .from("view_professional_heatmap")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("day", day);

      setRows(data || []);
    }

    load();

    const channel = supabase
      .channel("professional-heatmap")
      .on("postgres_changes", { event: "*", table: "appointments" }, load)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [professionalId, day]);

  return rows;
}
