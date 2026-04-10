import { supabase } from "@/lib/customSupabaseClient";

export async function getNotificationLogs(appointmentId) {
  const { data, error } = await supabase
    .from("appointment_notification_logs")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function resendNotification(appointmentId, channel) {
  const res = await fetch("/functions/v1/notify-resend", {
    method: "POST",
    body: JSON.stringify({ appointment_id: appointmentId, channel }),
  });

  return await res.json();
}