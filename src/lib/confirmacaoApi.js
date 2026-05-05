import { supabase } from '@/lib/customSupabaseClient';

export async function getAgendaParaConfirmacao(clinicId, date) {
  const { data, error } = await supabase
    .from('agenda_confirmacao_view')
    .select('*')
    .eq('clinic_id', clinicId)
    .gte('start_time', date + ' 00:00:00')
    .lte('start_time', date + ' 23:59:59');

  if (error) {
    throw error;
  }
  return data || [];
}

export async function enviarConfirmacaoWhatsApp(appointmentId) {
  const res = await fetch('/functions/v1/notify-confirm', {
    method: 'POST',
    body: JSON.stringify({ appointment_id: appointmentId }),
  });

  return await res.json();
}

export async function registrarResposta(appointmentId, resposta) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ confirm_method: 'whatsapp', status: resposta })
    .eq('id', appointmentId);

  if (error) {
    throw error;
  }
  return data;
}
