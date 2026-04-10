import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/hooks/useToast";

export function useDropHandler() {
  const toast = useToast();
  async function moveAppointment(appointmentId, payload) {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          start_time: payload.start,
          end_time: payload.end,
          day: payload.day,
          professional_id: payload.professionalId,
          room_id: payload.roomId,
        })
        .eq("id", appointmentId);
      if (error) throw error;
      return data;
    } catch (err) {
      toast({
        title: "Conflito de horário",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  }
  return { moveAppointment };
}
