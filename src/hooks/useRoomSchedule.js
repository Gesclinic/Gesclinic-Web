import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";

export default function useRoomSchedule(clinicId, date) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!clinicId || !date) return;

    async function load() {
      const { data } = await supabase.rpc("get_room_schedule", {
        p_clinic_id: clinicId,
        p_date: date
      });

      setItems(data || []);
    }

    load();
  }, [clinicId, date]);

  return items;
}
