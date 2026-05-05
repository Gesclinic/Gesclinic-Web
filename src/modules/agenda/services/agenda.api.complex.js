import { supabase } from '@/lib/customSupabaseClient';

/**
 * Serviço ÚNICO de agenda
 * Nunca faz join frágil
 * Retorna dados crus e estáveis
 */
export async function listarAgenda({ clinicId, date, startDate = null, endDate = null }) {
  console.log('[DEBUG listarAgenda] Input:', { clinicId, date, startDate, endDate });

  if (!clinicId) {
    console.warn('[DEBUG listarAgenda] Missing clinicId');
    return [];
  }

  // Formatar data primeiro (fazer isso fora do if para evitar ReferenceError)
  let formattedDate = date;
  if (date instanceof Date) {
    formattedDate = date.toISOString().split('T')[0];
  } else if (typeof date === 'string' && date.includes('/')) {
    const parts = date.split('/');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Determinar range de datas
  const queryStartDate = startDate || formattedDate;
  let queryEndDate = endDate;

  if (!queryEndDate) {
    // Carregar 30 dias a partir da data
    const endDateObj = new Date(formattedDate);
    endDateObj.setDate(endDateObj.getDate() + 30);
    queryEndDate = endDateObj.toISOString().split('T')[0];
  }

  console.log('[DEBUG listarAgenda] Query range:', { queryStartDate, queryEndDate });

  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      clinic_id,
      scheduled_date,
      scheduled_time,
      end_time,
      status,
      patient_id,
      professional_id,
      service_id,
      room_id,
      payer_id,
      patient:patients(id, name, record_number),
      professional:professionals(id, name),
      service:services(id, name),
      room:rooms(id, name),
      payer:payers(id, name)
    `,
    )
    .eq('clinic_id', clinicId)
    .gte('scheduled_date', queryStartDate)
    .lte('scheduled_date', queryEndDate)
    .order('scheduled_date')
    .order('scheduled_time');

  if (error) {
    console.error('❌ Erro ao listar agenda:', error);
    return [];
  }

  console.log(
    `✅ Agendamentos carregados: ${data?.length || 0} para clínica ${clinicId} no período ${queryStartDate} a ${queryEndDate}`,
  );
  if (data && data.length > 0) {
    console.log(
      '   Profissionais com agendamentos:',
      [...new Set(data.map((a) => a.professional?.name || a.professional_id))].join(', '),
    );
    console.log(
      '   Datas com agendamentos:',
      [...new Set(data.map((a) => a.scheduled_date))].join(', '),
    );
  }
  return data || [];
}
